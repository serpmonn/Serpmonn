import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Dev-only server. Binds to 127.0.0.1 and serves static frontend plus a simple
// in-memory likes API for local testing. Not intended for production use.

const app = express();
app.disable('x-powered-by');

app.use(express.json({ limit: '32kb' }));
app.use(express.urlencoded({ extended: true, limit: '32kb' }));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.join(__dirname, '..', 'frontend');

// Serve static frontend assets at /frontend
app.use('/frontend', express.static(frontendDir, { extensions: ['html', 'htm'] }));

// Simple in-memory likes storage: url -> { guest: number, auth: number, authUsers: Set<string> }
const likesByUrl = new Map();
const AUTH_WEIGHT = Number(process.env.DEV_AUTH_LIKE_WEIGHT || 3);

function normalizeUrl(raw) {
  if (!raw) return null;
  try {
    // Accept already-encoded value and decode once
    const decoded = decodeURIComponent(raw);
    // Build a URL object to normalize if possible
    const u = new URL(decoded);
    // Strip tracking params for stability (optional)
    u.searchParams.delete('gclid');
    u.searchParams.delete('fbclid');
    u.searchParams.delete('yclid');
    u.searchParams.delete('msclkid');
    return u.toString();
  } catch {
    // Fallback: return raw string
    return String(raw);
  }
}

function getRecord(url) {
  if (!likesByUrl.has(url)) {
    likesByUrl.set(url, { guest: 0, auth: 0, authUsers: new Set() });
  }
  return likesByUrl.get(url);
}

// GET /dev/likes?url=...
app.get('/dev/likes', (req, res) => {
  const norm = normalizeUrl(req.query.url);
  if (!norm) return res.status(400).json({ error: 'Missing url' });
  const rec = getRecord(norm);
  const total = rec.guest + rec.auth;
  return res.json({ counts: { guest: rec.guest, auth: rec.auth, total }, weight_auth: AUTH_WEIGHT });
});

// POST /dev/likes  body: url=...
app.post('/dev/likes', (req, res) => {
  const norm = normalizeUrl(req.body.url || req.query.url);
  if (!norm) return res.status(400).json({ error: 'Missing url' });
  const userKey = String(req.headers['x-dev-user-id'] || req.body.user || req.query.user || '').trim();
  const isAuth = Boolean(userKey);
  const rec = getRecord(norm);

  if (isAuth) {
    if (rec.authUsers.has(userKey)) {
      const total = rec.guest + rec.auth;
      return res.json({ accepted: false, type: 'auth', counts: { guest: rec.guest, auth: rec.auth, total }, liked_by_you: true });
    }
    rec.authUsers.add(userKey);
    rec.auth += 1;
    const total = rec.guest + rec.auth;
    return res.json({ accepted: true, type: 'auth', counts: { guest: rec.guest, auth: rec.auth, total }, liked_by_you: true });
  } else {
    // Guest like: no strong server dedup in dev; client prevents double-like via localStorage
    rec.guest += 1;
    const total = rec.guest + rec.auth;
    return res.json({ accepted: true, type: 'guest', counts: { guest: rec.guest, auth: rec.auth, total }, liked_by_you: true });
  }
});

// Dev-only migration endpoint: convert one guest like to auth for a given user
app.post('/dev/likes/migrate', (req, res) => {
  const norm = normalizeUrl(req.body.url || req.query.url);
  const userKey = String(req.body.user || req.query.user || '').trim();
  if (!norm || !userKey) return res.status(400).json({ error: 'Missing url or user' });
  const rec = getRecord(norm);
  if (rec.authUsers.has(userKey)) {
    const total = rec.guest + rec.auth;
    return res.json({ accepted: false, reason: 'already_auth', counts: { guest: rec.guest, auth: rec.auth, total } });
  }
  if (rec.guest <= 0) {
    const total = rec.guest + rec.auth;
    return res.json({ accepted: false, reason: 'no_guest_likes', counts: { guest: rec.guest, auth: rec.auth, total } });
  }
  rec.guest -= 1;
  rec.auth += 1;
  rec.authUsers.add(userKey);
  const total = rec.guest + rec.auth;
  return res.json({ accepted: true, counts: { guest: rec.guest, auth: rec.auth, total } });
});

// Convenience: redirect root to dev main page
app.get('/', (req, res) => {
  res.redirect('/frontend/dev/main.html');
});

const PORT = process.env.DEV_PORT ? Number(process.env.DEV_PORT) : 5100;
const HOST = '127.0.0.1';

app.listen(PORT, HOST, () => {
  console.log(`Dev server running at http://${HOST}:${PORT}`);
});

