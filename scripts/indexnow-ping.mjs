#!/usr/bin/env node
import https from 'https';
import { URL } from 'url';

// Usage:
//   INDEXNOW_KEY=yourkey INDEXNOW_HOST=www.serpmonn.ru INDEXNOW_KEY_LOCATION=https://www.serpmonn.ru/yourkey.txt \
//   node scripts/indexnow-ping.mjs https://www.serpmonn.ru/ https://www.serpmonn.ru/frontend/en/index.html
//
// Notes:
// - Create a file at https://<host>/<key>.txt that contains the key as plain text
// - You can send up to 10,000 URLs in one POST

const KEY = process.env.INDEXNOW_KEY || '';
const HOST = process.env.INDEXNOW_HOST || '';
const KEY_LOCATION = process.env.INDEXNOW_KEY_LOCATION || (KEY && HOST ? `https://${HOST}/${KEY}.txt` : '');

const urls = process.argv.slice(2).filter(Boolean);

if (!KEY || !HOST || !KEY_LOCATION) {
  console.error('IndexNow: please set env vars INDEXNOW_KEY, INDEXNOW_HOST, INDEXNOW_KEY_LOCATION');
  process.exit(1);
}

if (urls.length === 0) {
  console.error('IndexNow: provide at least one URL to ping as CLI argument');
  process.exit(1);
}

// Validate URLs belong to HOST
for (const u of urls) {
  try {
    const parsed = new URL(u);
    if (parsed.host !== HOST) {
      console.error(`IndexNow: URL host mismatch for ${u} (expected ${HOST})`);
      process.exit(1);
    }
  } catch (e) {
    console.error(`IndexNow: invalid URL: ${u}`);
    process.exit(1);
  }
}

const body = JSON.stringify({
  host: HOST,
  key: KEY,
  keyLocation: KEY_LOCATION,
  urlList: urls,
});

const options = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body).toString(),
  },
};

const req = https.request('https://api.indexnow.org/indexnow', options, (res) => {
  let data = '';
  res.on('data', (chunk) => (data += chunk));
  res.on('end', () => {
    console.log('IndexNow response:', res.statusCode, res.statusMessage);
    if (data) console.log(data);
    process.exit(res.statusCode >= 200 && res.statusCode < 300 ? 0 : 1);
  });
});

req.on('error', (err) => {
  console.error('IndexNow error:', err.message);
  process.exit(1);
});

req.write(body);
req.end();

