import { query } from '../database/config.mjs';

let tablesReady = false;

export async function ensurePlayTesterTables() {
  if (tablesReady) return;

  await query(`
    CREATE TABLE IF NOT EXISTS play_tester_applications (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      email       VARCHAR(255) NOT NULL,
      status      VARCHAR(32)  NOT NULL DEFAULT 'pending',
      source      VARCHAR(64)  NOT NULL DEFAULT 'serpmonn-app',
      ip          VARCHAR(64)  NULL,
      user_agent  VARCHAR(512) NULL,
      created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_play_tester_email (email),
      INDEX idx_play_tester_status (status),
      INDEX idx_play_tester_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  tablesReady = true;
}

export async function savePlayTesterApplication({ email, source = 'serpmonn-app', ip = null, userAgent = null }) {
  await ensurePlayTesterTables();

  const existing = await query(
    `SELECT id, status FROM play_tester_applications WHERE email = ? LIMIT 1`,
    [email]
  );

  if (existing[0]) {
    return { id: existing[0].id, created: false, status: existing[0].status };
  }

  const result = await query(
    `INSERT INTO play_tester_applications (email, status, source, ip, user_agent)
     VALUES (?, 'pending', ?, ?, ?)`,
    [email, source, ip, userAgent ? String(userAgent).slice(0, 512) : null]
  );

  return { id: result.insertId, created: true, status: 'pending' };
}
