import express from 'express';

// Простые продовые эндпоинты лайков. Пока in-memory для быстрых экспериментов.
// В дальнейшем перенесём в постоянное хранилище и привяжем к реальной аутентификации.

const router = express.Router();

// url -> { guest: number, auth: number, authUsers: Set<string> }
const likesByUrl = new Map();
const AUTH_WEIGHT = Number(process.env.AUTH_LIKE_WEIGHT || process.env.DEV_AUTH_LIKE_WEIGHT || 3);

function normalizeUrl(raw) {
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    const u = new URL(decoded);
    ['gclid','fbclid','yclid','msclkid'].forEach(p => u.searchParams.delete(p));
    return u.toString();
  } catch {
    return String(raw);
  }
}

function getRecord(url) {
  if (!likesByUrl.has(url)) {
    likesByUrl.set(url, { guest: 0, auth: 0, authUsers: new Set() });
  }
  return likesByUrl.get(url);
}

// GET /api/likes?url=...
router.get('/', (req, res) => {
  const norm = normalizeUrl(req.query.url);
  if (!norm) return res.status(400).json({ status: 'error', message: 'Missing url' });
  const rec = getRecord(norm);
  const total = rec.guest + rec.auth;
  res.json({ status: 'ok', counts: { guest: rec.guest, auth: rec.auth, total }, weight_auth: AUTH_WEIGHT });
});

// POST /api/likes  accepts url; optional user via header x-user-id, x-dev-user-id, body.user, or query.user
router.post('/', (req, res) => {
  const norm = normalizeUrl(req.body.url || req.query.url);
  if (!norm) return res.status(400).json({ status: 'error', message: 'Missing url' });

  // Временная идентификация пользователя: заголовок/тело/квери
  const userKey = String(
    req.headers['x-user-id'] || req.headers['x-dev-user-id'] || req.body.user || req.query.user || ''
  ).trim();

  const rec = getRecord(norm);

  if (userKey) {
    if (rec.authUsers.has(userKey)) {
      const total = rec.guest + rec.auth;
      return res.json({ status: 'ok', accepted: false, type: 'auth', counts: { guest: rec.guest, auth: rec.auth, total }, liked_by_you: true });
    }
    rec.authUsers.add(userKey);
    rec.auth += 1;
    const total = rec.guest + rec.auth;
    return res.json({ status: 'ok', accepted: true, type: 'auth', counts: { guest: rec.guest, auth: rec.auth, total }, liked_by_you: true });
  }

  // Гостевой лайк
  rec.guest += 1;
  const total = rec.guest + rec.auth;
  return res.json({ status: 'ok', accepted: true, type: 'guest', counts: { guest: rec.guest, auth: rec.auth, total }, liked_by_you: true });
});

export default router;

