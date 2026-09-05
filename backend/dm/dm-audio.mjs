import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const DM_AUDIO_DIR = process.env.DM_AUDIO_DIR || '/var/www/serpmonn-dev/uploads/dm-audio';
const MAX_BYTES = 16 * 1024 * 1024;
const MAX_DURATION_SEC = 120;

const ALLOWED_MIME = new Set([
  'audio/webm',
  'audio/webm;codecs=opus',
  'audio/ogg',
  'audio/ogg;codecs=opus',
  'audio/mp4',
  'audio/mpeg',
  'audio/wav',
  'audio/x-wav',
]);

const EXT_BY_MIME = {
  'audio/webm': 'webm',
  'audio/webm;codecs=opus': 'webm',
  'audio/ogg': 'ogg',
  'audio/ogg;codecs=opus': 'ogg',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
};

export function isAllowedDmAudioMime(mime) {
  const base = String(mime || '').toLowerCase().split(';')[0].trim();
  return ALLOWED_MIME.has(String(mime || '').toLowerCase()) || ALLOWED_MIME.has(base);
}

export function getMaxDmAudioBytes() {
  return MAX_BYTES;
}

export function getMaxDmAudioDurationSec() {
  return MAX_DURATION_SEC;
}

export function isSafeDmAudioUrl(url) {
  return typeof url === 'string' && /^\/uploads\/dm-audio\/[A-Za-z0-9._-]+\.(webm|ogg|m4a|mp3|wav)$/.test(url);
}

function pickExt(mime) {
  const key = String(mime || '').toLowerCase();
  if (EXT_BY_MIME[key]) return EXT_BY_MIME[key];
  const base = key.split(';')[0].trim();
  return EXT_BY_MIME[base] || 'webm';
}

export async function processAndSaveDmAudio(userId, buffer, mimeType) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    throw new Error('empty_audio');
  }
  if (buffer.length > MAX_BYTES) {
    throw new Error('audio_too_large');
  }

  await fs.mkdir(DM_AUDIO_DIR, { recursive: true });
  const safeUser = String(userId || 'anon').replace(/[^A-Za-z0-9-]/g, '').slice(0, 12) || 'anon';
  const ext = pickExt(mimeType);
  const name = `${safeUser}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`;
  await fs.writeFile(path.join(DM_AUDIO_DIR, name), buffer);
  return `/uploads/dm-audio/${name}`;
}
