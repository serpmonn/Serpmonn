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

// Simple in-memory likes storage: url -> count
const likesByUrl = new Map();

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

function getCount(url) {
  return likesByUrl.get(url) || 0;
}

// GET /dev/likes?url=...
app.get('/dev/likes', (req, res) => {
  const norm = normalizeUrl(req.query.url);
  if (!norm) return res.status(400).json({ error: 'Missing url' });
  return res.json({ count: getCount(norm) });
});

// POST /dev/likes  body: url=...
app.post('/dev/likes', (req, res) => {
  const norm = normalizeUrl(req.body.url || req.query.url);
  if (!norm) return res.status(400).json({ error: 'Missing url' });
  const next = getCount(norm) + 1;
  likesByUrl.set(norm, next);
  return res.json({ count: next });
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

