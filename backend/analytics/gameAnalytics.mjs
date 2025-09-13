import express from 'express';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Simple in-memory buffer (dev/proto). For prod, persist to DB or logs.
const events = [];

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.headers['x-forwarded-for'] || req.ip || (req.connection && req.connection.remoteAddress) || 'unknown'
});

function sanitizeString(s, max = 64) {
  return String(s || '').slice(0, max);
}

router.post('/event', writeLimiter, (req, res) => {
  const { gameId, type, score, mood, seed, extra } = req.body || {};
  const evt = {
    ts: Date.now(),
    gameId: sanitizeString(gameId || 'unknown', 32),
    type: sanitizeString(type || 'unknown', 32),
    score: Number.isFinite(Number(score)) ? Math.floor(Number(score)) : undefined,
    mood: sanitizeString(mood || '', 16) || undefined,
    seed: sanitizeString(seed || '', 16) || undefined,
    extra: extra && typeof extra === 'object' ? extra : undefined
  };
  events.push(evt);
  // trim buffer
  if (events.length > 5000) events.splice(0, events.length - 5000);
  res.json({ ok: true });
});

// Dev-only: fetch recent events (no auth here; restrict in prod)
router.get('/events', (req, res) => {
  const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 100));
  res.json(events.slice(-limit));
});

export default router;

