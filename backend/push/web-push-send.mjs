import webpush from 'web-push';
import {
  deletePushSubscriptionByHash,
  listPushSubscriptionsForUser,
} from './push.model.mjs';

let vapidReady = false;

export function isWebPushConfigured() {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export function getVapidPublicKey() {
  return String(process.env.VAPID_PUBLIC_KEY || '');
}

function ensureVapid() {
  if (vapidReady) return;
  if (!isWebPushConfigured()) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:sergei@serpmonn.ru',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  vapidReady = true;
}

export function buildDmPushPayload({ senderUsername, body, hasPhoto, hasAudio, hasFinding }) {
  const from = String(senderUsername || '').trim().replace(/^@+/, '');
  const text = String(body || '').trim();
  let preview = text.slice(0, 140);
  if (!preview && hasAudio) preview = 'Голосовое сообщение';
  if (!preview && hasPhoto) preview = 'Фото';
  if (!preview && hasFinding) preview = 'Находка';
  if (!preview) preview = 'Новое сообщение';

  const path = `/frontend/app/index.html?app=1&tab=inbox${
    from ? `&dm=${encodeURIComponent(from)}` : ''
  }`;

  return {
    type: 'dm',
    title: from ? `@${from}` : 'Serpmonn',
    body: preview,
    url: path,
    tag: from ? `dm:${from}` : 'dm',
  };
}

export async function sendWebPushToUser(userId, payload) {
  if (!userId || !isWebPushConfigured()) return { sent: 0 };
  ensureVapid();

  const subs = await listPushSubscriptionsForUser(userId);
  if (!subs.length) return { sent: 0 };

  const body = JSON.stringify(payload);
  let sent = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
          { TTL: 60 * 60 }
        );
        sent += 1;
      } catch (err) {
        const status = Number(err?.statusCode || 0);
        if (status === 404 || status === 410) {
          await deletePushSubscriptionByHash(sub.endpoint_hash).catch(() => {});
          return;
        }
        console.error('[push] send failed', status || err?.message || err);
      }
    })
  );

  return { sent };
}

