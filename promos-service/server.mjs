import 'dotenv/config';
import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());

const PORT = process.env.PORT || 3000;
const PERFLUENCE_KEY = process.env.PERFLUENCE_KEY || '';
const API_URL = process.env.PERFLUENCE_API_URL || `https://dash.perfluence.net/blogger/promocode-api/json?key=${PERFLUENCE_KEY}`;

let cache = { data: null, updatedAt: 0 };
const TTL_MS = Number(process.env.TTL_MS || 60 * 60 * 1000);

async function fetchPromosFromUpstream() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.FETCH_TIMEOUT_MS || 10000));
  try {
    const res = await fetch(API_URL, { signal: controller.signal });
    if (!res.ok) throw new Error(`Upstream responded with ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

app.get('/healthz', (req, res) => {
  res.json({ status: 'ok', cached: Boolean(cache.data), updatedAt: cache.updatedAt, ttlMs: TTL_MS });
});

app.get('/api/promos', async (req, res) => {
  try {
    const now = Date.now();
    const isStale = !cache.data || (now - cache.updatedAt) > TTL_MS;
    if (isStale) {
      const data = await fetchPromosFromUpstream();
      cache = { data, updatedAt: now };
    }
    res.set('Cache-Control', `public, max-age=${Math.floor(TTL_MS / 1000)}`);
    return res.json(cache.data);
  } catch (err) {
    console.error('Failed to serve /api/promos:', err.message);
    if (cache.data) {
      res.set('Cache-Control', 'no-store');
      return res.json(cache.data);
    }
    return res.status(502).json({ error: 'Failed to load promos' });
  }
});

app.post('/api/promos/refresh', async (req, res) => {
  try {
    const now = Date.now();
    const data = await fetchPromosFromUpstream();
    cache = { data, updatedAt: now };
    return res.json({ ok: true, updatedAt: now });
  } catch (err) {
    console.error('Manual refresh failed:', err.message);
    return res.status(502).json({ error: 'Refresh failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Promos API is running on http://localhost:${PORT}`);
});

