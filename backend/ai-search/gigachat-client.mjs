/**
 * GigaChat API (PERS): OAuth + text2image (Kandinsky via function_call auto).
 */
import https from 'https';
import { randomUUID } from 'crypto';

const OAUTH_HOST = 'ngw.devices.sberbank.ru';
const OAUTH_PORT = Number(process.env.GIGACHAT_OAUTH_PORT || 9443);
const OAUTH_PATH = '/api/v2/oauth';
const API_HOST = 'gigachat.devices.sberbank.ru';
const API_PORT = Number(process.env.GIGACHAT_API_PORT || 443);
const SCOPE = process.env.GIGACHAT_SCOPE || 'GIGACHAT_API_PERS';
const MODEL = process.env.GIGACHAT_IMAGE_MODEL || 'GigaChat';

const insecureAgent = new https.Agent({ rejectUnauthorized: false });

let cachedToken = null;
let cachedExpiresAt = 0;

function credentials() {
  const raw = String(process.env.GIGACHAT_CREDENTIALS || '').trim();
  if (!raw) {
    const err = new Error('GIGACHAT_CREDENTIALS not configured');
    err.status = 503;
    throw err;
  }
  return raw;
}

function httpsRequest(host, path, { method = 'GET', headers = {}, body = null, timeoutMs = 120_000, port = 443 } = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: host,
        port,
        path,
        method,
        headers,
        agent: insecureAgent,
        timeout: timeoutMs,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          resolve({
            status: res.statusCode || 0,
            headers: res.headers,
            buffer: Buffer.concat(chunks),
          });
        });
      }
    );
    req.on('timeout', () => {
      req.destroy(new Error(`GigaChat timeout after ${timeoutMs}ms`));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

export async function getGigaChatToken() {
  const now = Date.now();
  if (cachedToken && cachedExpiresAt > now + 60_000) {
    return cachedToken;
  }

  const form = new URLSearchParams({ scope: SCOPE }).toString();
  const res = await httpsRequest(OAUTH_HOST, OAUTH_PATH, {
    method: 'POST',
    port: OAUTH_PORT,
    headers: {
      Authorization: `Basic ${credentials()}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      RqUID: randomUUID(),
      'Content-Length': Buffer.byteLength(form),
    },
    body: form,
  });

  let data = {};
  try {
    data = JSON.parse(res.buffer.toString('utf8'));
  } catch {
    /* ignore */
  }

  if (res.status < 200 || res.status >= 300 || !data.access_token) {
    const err = new Error(data.message || data.error || `GigaChat OAuth ${res.status}`);
    err.status = res.status === 401 || res.status === 403 ? 503 : 502;
    throw err;
  }

  cachedToken = data.access_token;
  const exp = Number(data.expires_at);
  cachedExpiresAt = Number.isFinite(exp) && exp > now ? exp : now + 25 * 60_000;
  return cachedToken;
}

function ensureDrawPrompt(prompt) {
  const p = String(prompt || '').trim();
  if (!p) return p;
  if (/^(нарисуй|сгенерируй|draw|generate|создай\s+(картин|изображ)|create\s+(an?\s+)?image)/i.test(p)) {
    return p;
  }
  return `Нарисуй: ${p}`;
}

function extractFileId(content) {
  const s = String(content || '');
  const m =
    s.match(/<img[^>]+src=["']([a-f0-9-]{36})["']/i) ||
    s.match(/src=["']([a-f0-9-]{36})["']/i) ||
    s.match(/file[_-]?id["'\s:=]+([a-f0-9-]{36})/i);
  return m ? m[1] : null;
}

export async function downloadGigaChatFile(fileId, token) {
  const id = String(fileId || '').trim();
  if (!/^[a-f0-9-]{36}$/i.test(id)) {
    const err = new Error('Invalid GigaChat file id');
    err.status = 400;
    throw err;
  }

  const auth = token || (await getGigaChatToken());
  const res = await httpsRequest(API_HOST, `/api/v1/files/${id}/content`, {
    method: 'GET',
    port: API_PORT,
    timeoutMs: 60_000,
    headers: {
      Authorization: `Bearer ${auth}`,
      Accept: 'image/*,application/octet-stream',
    },
  });

  if (res.status < 200 || res.status >= 300) {
    const err = new Error(`GigaChat file download ${res.status}`);
    err.status = 502;
    throw err;
  }

  const ctype = String(res.headers['content-type'] || 'image/jpeg')
    .split(';')[0]
    .trim();
  return { buffer: res.buffer, contentType: ctype || 'image/jpeg' };
}

/**
 * @param {string} prompt
 * @returns {Promise<{ fileId: string, buffer: Buffer, contentType: string, caption: string, usage: object|null }>}
 */
export async function generateImageWithGigaChat(prompt, { timeoutMs = 120_000 } = {}) {
  const text = ensureDrawPrompt(prompt);
  if (!text) {
    const err = new Error('Empty prompt');
    err.status = 400;
    throw err;
  }
  if (text.length > 1000) {
    const err = new Error('Prompt too long');
    err.status = 400;
    throw err;
  }

  const token = await getGigaChatToken();
  const payload = JSON.stringify({
    model: MODEL,
    messages: [{ role: 'user', content: text }],
    function_call: 'auto',
  });

  const res = await httpsRequest(API_HOST, '/api/v1/chat/completions', {
    method: 'POST',
    port: API_PORT,
    timeoutMs,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
    body: payload,
  });

  let data = {};
  try {
    data = JSON.parse(res.buffer.toString('utf8'));
  } catch {
    /* ignore */
  }

  if (res.status < 200 || res.status >= 300) {
    const msg = data.message || data.error || `GigaChat completions ${res.status}`;
    const err = new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    err.status = res.status === 429 ? 429 : res.status === 402 ? 402 : 502;
    throw err;
  }

  const content = data?.choices?.[0]?.message?.content || '';
  const fileId = extractFileId(content);
  if (!fileId) {
    const err = new Error('GigaChat did not return an image');
    err.status = 502;
    throw err;
  }

  const file = await downloadGigaChatFile(fileId, token);
  return {
    fileId,
    buffer: file.buffer,
    contentType: file.contentType,
    caption: String(content).replace(/<img[^>]*>/gi, '').trim(),
    usage: data.usage || null,
  };
}

/**
 * Текстовый chat completions (для маркетинговых постов).
 * @returns {Promise<{ content: string, model: string, usage: object|null }>}
 */
export async function chatWithGigaChat(messages, { temperature = 0.7, timeoutMs = 60_000 } = {}) {
  const token = await getGigaChatToken();
  const payload = JSON.stringify({
    model: MODEL,
    messages,
    temperature,
    function_call: 'none'
  });

  const res = await httpsRequest(API_HOST, '/api/v1/chat/completions', {
    method: 'POST',
    port: API_PORT,
    timeoutMs,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Content-Length': Buffer.byteLength(payload)
    },
    body: payload
  });

  let data = {};
  try {
    data = JSON.parse(res.buffer.toString('utf8'));
  } catch {
    /* ignore */
  }

  if (res.status < 200 || res.status >= 300) {
    const msg = data.message || data.error || `GigaChat chat ${res.status}`;
    const err = new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
    err.status = res.status === 429 ? 429 : 502;
    throw err;
  }

  const content = data?.choices?.[0]?.message?.content || '';
  if (!String(content).trim()) {
    const err = new Error('GigaChat empty content');
    err.status = 502;
    throw err;
  }

  return {
    content: String(content),
    model: `gigachat:${MODEL}`,
    usage: data.usage || null
  };
}

export function isGigaChatConfigured() {
  return Boolean(String(process.env.GIGACHAT_CREDENTIALS || '').trim());
}
