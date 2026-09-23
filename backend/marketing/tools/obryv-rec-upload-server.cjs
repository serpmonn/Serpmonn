#!/usr/bin/env node
/**
 * Obрыв playthrough upload — streams to disk (large Firefox uploads).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { randomBytes } = require('crypto');

const PORT = 3097;
const HOST = '127.0.0.1';
const OUT_DIR = '/var/www/serpmonn.ru/backend/marketing/in/obryv-rec';
const TOKEN_PATH = '/var/www/serpmonn.ru/backend/marketing/in/.obryv-rec-token';
const MAX_BYTES = 250 * 1024 * 1024;

fs.mkdirSync(OUT_DIR, { recursive: true });

function readToken() {
  try { return fs.readFileSync(TOKEN_PATH, 'utf8').trim(); }
  catch (_) { return ''; }
}

function cors(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': 'https://serpmonn.ru',
    'Access-Control-Allow-Headers': 'X-Rec-Token, Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  });
  res.end(body);
}

function parseMultipart(buf, boundary) {
  const parts = [];
  const sep = Buffer.from('--' + boundary);
  let start = buf.indexOf(sep);
  while (start !== -1) {
    const next = buf.indexOf(sep, start + sep.length);
    if (next === -1) break;
    let part = buf.subarray(start + sep.length, next);
    if (part[0] === 13 && part[1] === 10) part = part.subarray(2);
    if (part.length >= 2 && part[part.length - 2] === 13 && part[part.length - 1] === 10) {
      part = part.subarray(0, part.length - 2);
    }
    if (part.length >= 2 && part[0] === 45 && part[1] === 45) { start = next; continue; }
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd !== -1) {
      const header = part.subarray(0, headerEnd).toString('utf8');
      let body = part.subarray(headerEnd + 4);
      if (body.length >= 2 && body[body.length - 2] === 13 && body[body.length - 1] === 10) {
        body = body.subarray(0, body.length - 2);
      }
      const nameMatch = /name="([^"]+)"/i.exec(header);
      const fileMatch = /filename="([^"]*)"/i.exec(header);
      parts.push({
        name: nameMatch ? nameMatch[1] : '',
        filename: fileMatch ? fileMatch[1] : '',
        body,
      });
    }
    start = next;
  }
  return parts;
}

function finalizeName(hint) {
  const safe = String(hint || 'obryv.webm').replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 80) || 'obryv.webm';
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `obryv-${stamp}-${randomBytes(3).toString('hex')}-${safe}`;
}

const server = http.createServer((req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': 'https://serpmonn.ru',
      'Access-Control-Allow-Headers': 'X-Rec-Token, Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    });
    res.end();
    return;
  }

  if (req.method === 'GET' && (req.url === '/' || req.url.startsWith('/health'))) {
    cors(res, 200, { ok: true, service: 'obryv-rec-upload' });
    return;
  }

  if (req.method !== 'POST') {
    cors(res, 405, { error: 'method not allowed' });
    return;
  }

  const url = new URL(req.url, 'http://127.0.0.1');
  const expected = readToken();
  const got = req.headers['x-rec-token'] || url.searchParams.get('k') || '';
  if (!expected || got !== expected) {
    cors(res, 403, { error: 'bad token' });
    return;
  }

  const ctype = (req.headers['content-type'] || '').toLowerCase();
  const cl = parseInt(req.headers['content-length'] || '0', 10);
  if (cl > MAX_BYTES) {
    cors(res, 413, { error: 'too large' });
    req.resume();
    return;
  }

  // Multipart: buffer (FormData from browser) — stream to tmp then parse
  if (ctype.includes('multipart/')) {
    const chunks = [];
    let size = 0;
    let aborted = false;
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BYTES) { aborted = true; req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (aborted) { cors(res, 413, { error: 'too large' }); return; }
      try {
        const buf = Buffer.concat(chunks);
        if (!buf.length) { cors(res, 400, { error: 'empty body' }); return; }
        const m = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(req.headers['content-type'] || '');
        if (!m) { cors(res, 400, { error: 'missing boundary' }); return; }
        const parts = parseMultipart(buf, (m[1] || m[2] || '').trim());
        const video = parts.find((p) => p.name === 'video' && p.body && p.body.length)
          || parts.find((p) => p.filename && p.body && p.body.length);
        if (!video) {
          console.warn('[obryv-rec] parts', parts.map((p) => ({ n: p.name, f: p.filename, s: p.body.length })));
          cors(res, 400, { error: 'no video part' });
          return;
        }
        if (video.body.length < 1000) {
          cors(res, 400, { error: 'file too small', bytes: video.body.length });
          return;
        }
        const file = finalizeName(video.filename || 'obryv.webm');
        const dest = path.join(OUT_DIR, file);
        fs.writeFileSync(dest, video.body);
        const dur = parts.find((p) => p.name === 'durationMs');
        const meta = {
          file,
          bytes: video.body.length,
          at: new Date().toISOString(),
          durationMs: dur ? dur.body.toString() : '',
          ua: req.headers['user-agent'] || '',
        };
        fs.writeFileSync(dest + '.json', JSON.stringify(meta, null, 2));
        console.log('[obryv-rec] saved', dest, meta.bytes);
        cors(res, 200, { ok: true, file, bytes: meta.bytes });
      } catch (err) {
        console.error(err);
        cors(res, 500, { error: String(err.message || err) });
      }
    });
    req.on('error', () => cors(res, 400, { error: 'request error' }));
    return;
  }

  // Raw body: stream straight to disk
  const file = finalizeName('obryv.webm');
  const dest = path.join(OUT_DIR, file);
  const tmp = dest + '.part';
  const ws = fs.createWriteStream(tmp);
  let size = 0;
  let aborted = false;
  req.on('data', (c) => {
    size += c.length;
    if (size > MAX_BYTES) {
      aborted = true;
      req.destroy();
      ws.destroy();
      try { fs.unlinkSync(tmp); } catch (_) {}
      return;
    }
  });
  req.pipe(ws);
  ws.on('finish', () => {
    if (aborted) { cors(res, 413, { error: 'too large' }); return; }
    try {
      if (size < 1000) {
        try { fs.unlinkSync(tmp); } catch (_) {}
        cors(res, 400, { error: 'file too small', bytes: size });
        return;
      }
      fs.renameSync(tmp, dest);
      const meta = {
        file,
        bytes: size,
        at: new Date().toISOString(),
        durationMs: url.searchParams.get('durationMs') || '',
        ua: req.headers['user-agent'] || '',
      };
      fs.writeFileSync(dest + '.json', JSON.stringify(meta, null, 2));
      console.log('[obryv-rec] saved', dest, size);
      cors(res, 200, { ok: true, file, bytes: size });
    } catch (err) {
      console.error(err);
      cors(res, 500, { error: String(err.message || err) });
    }
  });
  ws.on('error', (err) => {
    console.error(err);
    cors(res, 500, { error: 'write failed' });
  });
});

server.listen(PORT, HOST, () => {
  console.log(`[obryv-rec] upload listening http://${HOST}:${PORT} → ${OUT_DIR}`);
});
