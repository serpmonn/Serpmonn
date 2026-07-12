import crypto from 'node:crypto';
import { query } from '../database/config.mjs';

let tablesReady = false;

function clampLimit(limit, fallback = 50, max = 100) {
  const n = Number.parseInt(limit, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

export async function ensureFindingsTables() {
  if (tablesReady) return;

  await query(`
    CREATE TABLE IF NOT EXISTS findings (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      public_id     VARCHAR(24) NOT NULL,
      user_id       CHAR(36) NOT NULL,
      query_text    VARCHAR(500) NOT NULL,
      locale        VARCHAR(16) NOT NULL DEFAULT 'ru',
      visibility    ENUM('private', 'link', 'followers', 'public') NOT NULL DEFAULT 'private',
      snapshot      JSON NOT NULL,
      created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_findings_public_id (public_id),
      KEY idx_findings_user_created (user_id, created_at),
      KEY idx_findings_visibility_created (visibility, created_at),
      CONSTRAINT fk_findings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS finding_shares (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      finding_id    INT NOT NULL,
      from_user_id  CHAR(36) NOT NULL,
      to_user_id    CHAR(36) NOT NULL,
      message       VARCHAR(500) NULL,
      read_at       TIMESTAMP NULL DEFAULT NULL,
      created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_finding_shares_to_user (to_user_id, read_at, created_at),
      KEY idx_finding_shares_finding (finding_id),
      CONSTRAINT fk_finding_shares_finding FOREIGN KEY (finding_id) REFERENCES findings(id) ON DELETE CASCADE,
      CONSTRAINT fk_finding_shares_from FOREIGN KEY (from_user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_finding_shares_to FOREIGN KEY (to_user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  tablesReady = true;
}

export function generatePublicId() {
  return `fnd_${crypto.randomBytes(8).toString('base64url')}`;
}

export async function getUserIdByEmail(email) {
  const rows = await query('SELECT id, username FROM users WHERE email = ? LIMIT 1', [email]);
  return rows[0] || null;
}

export async function getUserIdByUsername(username) {
  const rows = await query(
    'SELECT id, username FROM users WHERE username = ? LIMIT 1',
    [username.trim()]
  );
  return rows[0] || null;
}

export async function searchUsersByUsername(prefix, limit = 8) {
  const like = `${prefix.trim()}%`;
  const lim = clampLimit(limit, 8, 20);
  return query(
    `SELECT id, username FROM users
     WHERE username LIKE ? AND username IS NOT NULL AND username != ''
     ORDER BY username ASC LIMIT ${lim}`,
    [like]
  );
}

export async function insertFinding(data) {
  await ensureFindingsTables();
  const publicId = generatePublicId();
  const result = await query(
    `INSERT INTO findings (public_id, user_id, query_text, locale, visibility, snapshot)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      publicId,
      data.userId,
      data.queryText.slice(0, 500),
      data.locale || 'ru',
      data.visibility || 'private',
      JSON.stringify(data.snapshot),
    ]
  );
  return { id: result.insertId, publicId };
}

export async function getFindingByPublicId(publicId) {
  await ensureFindingsTables();
  const rows = await query(
    `SELECT f.*, u.username AS author_username
     FROM findings f
     JOIN users u ON u.id = f.user_id
     WHERE f.public_id = ?
     LIMIT 1`,
    [publicId]
  );
  if (!rows.length) return null;
  const row = rows[0];
  row.snapshot = typeof row.snapshot === 'string' ? JSON.parse(row.snapshot) : row.snapshot;
  return row;
}

export async function userHasShareAccess(findingId, userId) {
  if (!userId) return false;
  const rows = await query(
    `SELECT id FROM finding_shares
     WHERE finding_id = ? AND to_user_id = ?
     LIMIT 1`,
    [findingId, userId]
  );
  return rows.length > 0;
}

export async function listFindingsByUser(userId, limit = 50) {
  await ensureFindingsTables();
  const lim = clampLimit(limit);
  return query(
    `SELECT public_id, query_text, locale, visibility, created_at
     FROM findings
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT ${lim}`,
    [userId]
  );
}

export async function insertFindingShare({ findingId, fromUserId, toUserId, message }) {
  await ensureFindingsTables();
  const result = await query(
    `INSERT INTO finding_shares (finding_id, from_user_id, to_user_id, message)
     VALUES (?, ?, ?, ?)`,
    [findingId, fromUserId, toUserId, message ? message.slice(0, 500) : null]
  );
  return result.insertId;
}

export async function listInboxForUser(userId, limit = 50) {
  await ensureFindingsTables();
  const lim = clampLimit(limit);
  return query(
    `SELECT s.id AS share_id, s.message, s.read_at, s.created_at,
            f.public_id, f.query_text, f.locale,
            u.username AS from_username
     FROM finding_shares s
     JOIN findings f ON f.id = s.finding_id
     JOIN users u ON u.id = s.from_user_id
     WHERE s.to_user_id = ?
     ORDER BY s.created_at DESC
     LIMIT ${lim}`,
    [userId]
  );
}

export async function countUnreadInbox(userId) {
  await ensureFindingsTables();
  const rows = await query(
    `SELECT COUNT(*) AS cnt FROM finding_shares
     WHERE to_user_id = ? AND read_at IS NULL`,
    [userId]
  );
  return rows[0]?.cnt || 0;
}

export async function deleteFindingByPublicId(userId, publicId) {
  await ensureFindingsTables();
  const finding = await getFindingByPublicId(publicId);
  if (!finding) return { ok: false, error: 'not_found' };
  if (finding.user_id !== userId) return { ok: false, error: 'forbidden' };
  await query('DELETE FROM findings WHERE public_id = ? AND user_id = ?', [publicId, userId]);
  return { ok: true };
}

export async function listPublicFindings(limit = 30, offset = 0) {
  await ensureFindingsTables();
  const lim = clampLimit(limit, 30, 50);
  const off = Math.max(0, Number.parseInt(offset, 10) || 0);
  return query(
    `SELECT f.public_id, f.query_text, f.locale, f.created_at, u.username AS author_username
     FROM findings f
     JOIN users u ON u.id = f.user_id
     WHERE f.visibility = 'public'
     ORDER BY f.created_at DESC
     LIMIT ${lim} OFFSET ${off}`,
    []
  );
}

export async function markShareRead(shareId, userId) {
  await ensureFindingsTables();
  await query(
    `UPDATE finding_shares SET read_at = CURRENT_TIMESTAMP
     WHERE id = ? AND to_user_id = ? AND read_at IS NULL`,
    [shareId, userId]
  );
}
