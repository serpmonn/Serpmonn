/**
 * Private storage for GigaChat-generated images (not under /frontend).
 */
import { randomUUID } from 'crypto';
import { mkdir, writeFile, unlink, readdir, stat } from 'fs/promises';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STORE_DIR = join(__dirname, '../private/ai-generated');
const TTL_MS = Number(process.env.AI_IMAGE_TTL_MS) || 7 * 24 * 60 * 60 * 1000;

const EXT_BY_MIME = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

async function ensureDir() {
  await mkdir(STORE_DIR, { recursive: true });
}

export async function cleanupExpiredAiImages() {
  try {
    await ensureDir();
    const names = await readdir(STORE_DIR);
    const now = Date.now();
    await Promise.all(
      names.map(async (name) => {
        if (name.startsWith('.')) return;
        const abs = join(STORE_DIR, name);
        try {
          const st = await stat(abs);
          if (now - st.mtimeMs > TTL_MS) await unlink(abs);
        } catch {
          /* ignore */
        }
      })
    );
  } catch (err) {
    console.warn('[ai-generated] cleanup', err.message);
  }
}

/**
 * @returns {Promise<{ id: string, fileName: string, absPath: string, imagePath: string }>}
 */
export async function storeAiGeneratedImage(buffer, contentType) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    const err = new Error('empty image');
    err.status = 500;
    throw err;
  }

  await ensureDir();
  if (Math.random() < 0.1) cleanupExpiredAiImages().catch(() => {});

  const ext = EXT_BY_MIME[String(contentType || '').toLowerCase()] || '.jpg';
  const id = randomUUID();
  const fileName = `${id}${ext}`;
  const absPath = join(STORE_DIR, fileName);
  await writeFile(absPath, buffer);

  return {
    id,
    fileName,
    absPath,
    imagePath: `ai-generated/${fileName}`,
  };
}

export function resolveAiGeneratedPath(imagePathOrName) {
  const raw = String(imagePathOrName || '').trim().replace(/^\/+/, '');
  const name = raw.startsWith('ai-generated/') ? raw.slice('ai-generated/'.length) : raw;
  if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) return null;
  if (!/^[a-f0-9-]{36}\.(jpg|jpeg|png|webp)$/i.test(name)) return null;
  return join(STORE_DIR, name);
}
