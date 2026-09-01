import { buildDmPushPayload, sendWebPushToUser } from './web-push-send.mjs';
import { sendFcmToUser } from './fcm-send.mjs';

export async function sendPushToUser(userId, payload) {
  if (!userId || !payload) return { sent: 0, web: 0, fcm: 0 };
  const [web, fcm] = await Promise.all([
    sendWebPushToUser(userId, payload),
    sendFcmToUser(userId, payload),
  ]);
  const webSent = Number(web?.sent || 0);
  const fcmSent = Number(fcm?.sent || 0);
  return { sent: webSent + fcmSent, web: webSent, fcm: fcmSent };
}

export async function notifyRecipientOfDm({
  recipientId,
  senderUsername,
  body,
  hasPhoto,
  hasAudio,
  hasFinding,
}) {
  if (!recipientId) return { sent: 0 };
  return sendPushToUser(
    recipientId,
    buildDmPushPayload({ senderUsername, body, hasPhoto, hasAudio, hasFinding })
  );
}
