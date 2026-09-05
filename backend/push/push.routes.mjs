import express from 'express';
import verifyToken from '../auth/verifyToken.mjs';
import { getUserIdByEmail } from '../findings/findings.model.mjs';
import {
  upsertPushSubscription,
  deletePushSubscriptionByEndpoint,
  upsertFcmToken,
  deleteFcmTokenForUser,
  normalizePushApp,
} from './push.model.mjs';
import { getVapidPublicKey, isWebPushConfigured } from './web-push-send.mjs';
import { isFcmConfiguredForApp, getFcmStatus } from './fcm-send.mjs';

const router = express.Router();

function isHttpsEndpoint(value) {
  try {
    const u = new URL(String(value || ''));
    return u.protocol === 'https:' && u.hostname.length > 0 && String(value).length <= 2048;
  } catch {
    return false;
  }
}

function readKey(value, max) {
  const s = String(value || '').trim();
  if (!s || s.length > max) return '';
  return s;
}

async function resolveDbUserId(req) {
  if (!req.user?.email) return null;
  const row = await getUserIdByEmail(req.user.email);
  return row?.id || null;
}

function resolvePushApp(req) {
  const fromBody = String(req.body?.app || '').trim().toLowerCase();
  if (fromBody === 'prod' || fromBody === 'dev') return fromBody;

  const origin = String(req.get('origin') || '');
  const host = String(req.get('x-forwarded-host') || req.get('host') || '');
  const hay = `${origin} ${host}`.toLowerCase();
  if (/\bdev\.serpmonn\.ru\b/.test(hay)) return 'dev';
  return 'prod';
}

router.get('/push/status', (req, res) => {
  res.json({
    webPush: isWebPushConfigured(),
    ...getFcmStatus(),
  });
});

router.get('/push/vapid-public-key', (req, res) => {
  if (!isWebPushConfigured()) {
    return res.status(503).json({ error: 'push_not_configured' });
  }
  res.json({ publicKey: getVapidPublicKey() });
});

function isValidFcmToken(value) {
  const token = String(value || '').trim();
  return token.length >= 32 && token.length <= 512 && /^[\w\-:.]+$/i.test(token);
}

router.post('/push/fcm/register', verifyToken, async (req, res) => {
  try {
    const userId = await resolveDbUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });

    const token = String(req.body?.token || '').trim();
    const platform = String(req.body?.platform || 'android').trim().slice(0, 32) || 'android';
    const app = normalizePushApp(resolvePushApp(req));
    if (!isFcmConfiguredForApp(app)) {
      return res.status(503).json({ error: 'fcm_not_configured', app });
    }
    if (!isValidFcmToken(token)) {
      return res.status(400).json({ error: 'invalid_token' });
    }

    const userAgent = String(req.get('user-agent') || '').slice(0, 255);
    await upsertFcmToken({ userId, token, platform, userAgent, app });
    res.json({ ok: true, app });
  } catch (err) {
    console.error('[push] fcm register', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.delete('/push/fcm/register', verifyToken, async (req, res) => {
  try {
    const userId = await resolveDbUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const token = String(req.body?.token || '').trim();
    if (!isValidFcmToken(token)) return res.status(400).json({ error: 'invalid_token' });
    await deleteFcmTokenForUser(userId, token);
    res.json({ ok: true });
  } catch (err) {
    console.error('[push] fcm unregister', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.post('/push/subscribe', verifyToken, async (req, res) => {
  try {
    const userId = await resolveDbUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    if (!isWebPushConfigured()) return res.status(503).json({ error: 'push_not_configured' });

    const endpoint = String(req.body?.endpoint || '').trim();
    const p256dh = readKey(req.body?.keys?.p256dh, 255);
    const auth = readKey(req.body?.keys?.auth, 255);
    if (!isHttpsEndpoint(endpoint) || !p256dh || !auth) {
      return res.status(400).json({ error: 'invalid_subscription' });
    }

    const userAgent = String(req.get('user-agent') || '').slice(0, 255);
    await upsertPushSubscription({ userId, endpoint, p256dh, auth, userAgent });
    res.json({ ok: true });
  } catch (err) {
    console.error('[push] subscribe', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

router.delete('/push/subscribe', verifyToken, async (req, res) => {
  try {
    const userId = await resolveDbUserId(req);
    if (!userId) return res.status(401).json({ error: 'unauthorized' });
    const endpoint = String(req.body?.endpoint || '').trim();
    if (!isHttpsEndpoint(endpoint)) return res.status(400).json({ error: 'invalid_subscription' });
    await deletePushSubscriptionByEndpoint(userId, endpoint);
    res.json({ ok: true });
  } catch (err) {
    console.error('[push] unsubscribe', err);
    res.status(500).json({ error: 'internal_error' });
  }
});

export default router;
