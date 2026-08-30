import express from 'express';
import verifyToken from '../auth/verifyToken.mjs';
import { getUserIdByEmail } from '../findings/findings.model.mjs';
import { upsertPushSubscription, deletePushSubscriptionByEndpoint } from './push.model.mjs';
import { getVapidPublicKey, isWebPushConfigured } from './web-push-send.mjs';

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

router.get('/push/vapid-public-key', (req, res) => {
  if (!isWebPushConfigured()) {
    return res.status(503).json({ error: 'push_not_configured' });
  }
  res.json({ publicKey: getVapidPublicKey() });
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
