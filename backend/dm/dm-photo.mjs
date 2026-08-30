import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const DM_PHOTOS_DIR = process.env.DM_PHOTOS_DIR || '/var/www/serpmonn.ru/uploads/dm';
const MAX_BYTES = 8 * 1024 * 1024;
const MAX_EDGE = 1600;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

let sharpModule = null;

async function getSharp() {
  if (!sharpModule) {
    const mod = await import('sharp');
    sharpModule = mod.default;
  }
  return sharpModule;
}

export function isAllowedDmPhotoMime(mime) {
  return ALLOWED_MIME.has(mime);
}

export function getMaxDmPhotoBytes() {
  return MAX_BYTES;
}

export function isSafeDmPhotoUrl(url) {
  return typeof url === 'string' && /^\/uploads\/dm\/[A-Za-z0-9._-]+\.webp$/.test(url);
}

export async function processAndSaveDmPhoto(userId, buffer) {
  const sharp = await getSharp();
  const processed = await sharp(buffer)
    .rotate()
    .resize(MAX_EDGE, MAX_EDGE, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();

  await fs.mkdir(DM_PHOTOS_DIR, { recursive: true });
  const safeUser = String(userId || 'anon').replace(/[^A-Za-z0-9-]/g, '').slice(0, 12) || 'anon';
  const name = `${safeUser}-${Date.now()}-${crypto.randomBytes(6).toString('hex')}.webp`;
  await fs.writeFile(path.join(DM_PHOTOS_DIR, name), processed);
  return `/uploads/dm/${name}`;
}
