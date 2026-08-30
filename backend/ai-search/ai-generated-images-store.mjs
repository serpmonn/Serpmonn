/**
 * Persistent metadata for GigaChat-generated images.
 * Files live in backend/private/ai-generated/; this table keeps them discoverable.
 */
import { query as dbQuery } from '../database/config.mjs';
import { readdir, stat, unlink } from 'fs/promises';
import { join, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { resolveAiGeneratedPath } from './ai-image-store.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STORE_DIR = join(__dirname, '../private/ai-generated');

let tablesReady = false;
let backfillDone = false;

export async function ensureAiGeneratedImagesTable() {
  if (tablesReady) return;

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS ai_generated_images (
      id CHAR(36) NOT NULL,
      file_name VARCHAR(80) NOT NULL,
      content_type VARCHAR(64) NOT NULL DEFAULT 'image/jpeg',
      bytes INT UNSIGNED NOT NULL DEFAULT 0,
      prompt VARCHAR(1000) NOT NULL DEFAULT '',
      caption VARCHAR(1000) NOT NULL DEFAULT '',
      user_id VARCHAR(64) NULL,
      identity_key VARCHAR(191) NOT NULL DEFAULT '',
      locale VARCHAR(16) NOT NULL DEFAULT 'ru',
      visibility ENUM('admin','public') NOT NULL DEFAULT 'admin',
      search_log_id BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_ai_gen_file (file_name),
      INDEX idx_ai_gen_created (created_at),
      INDEX idx_ai_gen_visibility (visibility),
      INDEX idx_ai_gen_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  tablesReady = true;
}

/**
 * @param {object} row
 */
export async function insertAiGeneratedImage(row) {
  await ensureAiGeneratedImagesTable();
  const id = String(row.id || '').trim();
  const fileName = String(row.fileName || row.file_name || '').trim();
  if (!id || !fileName) {
    const err = new Error('ai_generated_images: id/fileName required');
    err.status = 500;
    throw err;
  }

  await dbQuery(
    `INSERT INTO ai_generated_images
      (id, file_name, content_type, bytes, prompt, caption, user_id, identity_key, locale, visibility, search_log_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       prompt = VALUES(prompt),
       caption = VALUES(caption),
       bytes = VALUES(bytes),
       content_type = VALUES(content_type)`,
    [
      id,
      fileName,
      String(row.contentType || row.content_type || 'image/jpeg').slice(0, 64),
      Number(row.bytes) || 0,
      String(row.prompt || '').slice(0, 1000),
      String(row.caption || '').slice(0, 1000),
      row.userId != null && row.userId !== '' ? String(row.userId).slice(0, 64) : null,
      String(row.identityKey || row.identity_key || '').slice(0, 191),
      String(row.locale || 'ru').slice(0, 16),
      row.visibility === 'public' ? 'public' : 'admin',
      row.searchLogId != null ? Number(row.searchLogId) : null,
    ]
  );

  return id;
}

export async function listAiGeneratedImages({ limit = 48, offset = 0 } = {}) {
  await ensureAiGeneratedImagesTable();
  const lim = Math.min(Math.max(Number(limit) || 48, 1), 200);
  const off = Math.max(Number(offset) || 0, 0);

  // mysql2 prepared statements often reject LIMIT/OFFSET placeholders
  const rows = await dbQuery(
    `SELECT id, file_name, content_type, bytes, prompt, caption, user_id, identity_key,
            locale, visibility, search_log_id, created_at
     FROM ai_generated_images
     ORDER BY created_at DESC
     LIMIT ${lim} OFFSET ${off}`
  );

  const countRows = await dbQuery('SELECT COUNT(*) AS total FROM ai_generated_images');
  const total = countRows?.[0] ? Number(countRows[0].total) || 0 : 0;

  return { items: rows || [], total, limit: lim, offset: off };
}

export async function getAiGeneratedImageById(id) {
  await ensureAiGeneratedImagesTable();
  const rows = await dbQuery(
    `SELECT id, file_name, content_type, bytes, prompt, caption, user_id, identity_key,
            locale, visibility, search_log_id, created_at
     FROM ai_generated_images WHERE id = ? LIMIT 1`,
    [String(id || '').trim()]
  );
  return rows?.[0] || null;
}

export async function deleteAiGeneratedImage(id) {
  const row = await getAiGeneratedImageById(id);
  if (!row) return false;

  const abs = resolveAiGeneratedPath(row.file_name);
  if (abs) {
    try {
      await unlink(abs);
    } catch {
      /* file may already be gone */
    }
  }

  await dbQuery('DELETE FROM ai_generated_images WHERE id = ?', [row.id]);
  return true;
}

/**
 * Insert DB rows for files already on disk (prompt from search_query_log when possible).
 */
export async function backfillAiGeneratedImagesFromDisk() {
  await ensureAiGeneratedImagesTable();
  if (backfillDone) return { inserted: 0, skipped: true };
  backfillDone = true;

  let names = [];
  try {
    names = await readdir(STORE_DIR);
  } catch {
    return { inserted: 0, missingDir: true };
  }

  let inserted = 0;
  for (const name of names) {
    if (!/^[a-f0-9-]{36}\.(jpg|jpeg|png|webp)$/i.test(name)) continue;
    const id = name.replace(/\.[^.]+$/, '');
    const existing = await getAiGeneratedImageById(id);
    if (existing) continue;

    const abs = join(STORE_DIR, name);
    let bytes = 0;
    let createdAt = new Date();
    try {
      const st = await stat(abs);
      bytes = st.size;
      createdAt = st.mtime;
    } catch {
      continue;
    }

    let prompt = '';
    let userId = null;
    let identityKey = '';
    let locale = 'ru';
    let searchLogId = null;
    try {
      const logs = await dbQuery(
        `SELECT id, query_text, user_id, guest_key, locale, created_at
         FROM search_query_log
         WHERE image_path = ? OR image_path = ?
         ORDER BY id DESC LIMIT 1`,
        [`ai-generated/${name}`, name]
      );
      const log = logs?.[0];
      if (log) {
        searchLogId = log.id;
        locale = log.locale || 'ru';
        userId = log.user_id || null;
        identityKey = log.user_id
          ? `user:${log.user_id}`
          : log.guest_key
            ? `guest:${log.guest_key}`
            : '';
        const q = String(log.query_text || '');
        prompt = q.replace(/^\[ai-image\]\s*/i, '').slice(0, 1000);
        if (log.created_at) createdAt = new Date(log.created_at);
      }
    } catch {
      /* search_query_log may lack columns on old schema */
    }

    const ext = extname(name).toLowerCase();
    const contentType =
      ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

    try {
      await dbQuery(
        `INSERT INTO ai_generated_images
          (id, file_name, content_type, bytes, prompt, caption, user_id, identity_key, locale, visibility, search_log_id, created_at)
         VALUES (?, ?, ?, ?, ?, '', ?, ?, ?, 'admin', ?, ?)
         ON DUPLICATE KEY UPDATE id = id`,
        [
          id,
          name,
          contentType,
          bytes,
          prompt,
          userId,
          identityKey,
          locale,
          searchLogId,
          createdAt,
        ]
      );
      inserted += 1;
    } catch (err) {
      console.warn('[ai-generated] backfill insert', name, err.message);
    }
  }

  if (inserted) console.log(`[ai-generated] backfill inserted ${inserted} rows`);
  return { inserted };
}
