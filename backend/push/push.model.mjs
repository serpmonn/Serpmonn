import { createHash } from 'crypto';
import { query } from '../database/config.mjs';

let pushTablesReady = false;

function endpointHash(endpoint) {
  return createHash('sha256').update(String(endpoint || ''), 'utf8').digest('hex');
}

function fcmTokenHash(token) {
  return createHash('sha256').update(String(token || ''), 'utf8').digest('hex');
}

export function normalizePushApp(value) {
  const app = String(value || '').trim().toLowerCase();
  return app === 'dev' ? 'dev' : 'prod';
}

async function ensureFcmAppColumn() {
  const rows = await query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'push_fcm_tokens'
       AND COLUMN_NAME = 'app'`
  );
  if (rows[0]?.cnt > 0) return;

  await query(
    `ALTER TABLE push_fcm_tokens
     ADD COLUMN app ENUM('prod','dev') NOT NULL DEFAULT 'prod' AFTER platform`
  );
  await query(
    `ALTER TABLE push_fcm_tokens
     ADD KEY idx_fcm_user_app (user_id, app)`
  ).catch(() => {});
}

export async function ensurePushTables() {
  if (pushTablesReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      user_id       CHAR(36) NOT NULL,
      endpoint_hash CHAR(64) NOT NULL,
      endpoint      VARCHAR(2048) NOT NULL,
      p256dh        VARCHAR(255) NOT NULL,
      auth          VARCHAR(255) NOT NULL,
      user_agent    VARCHAR(255) NULL,
      created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_push_endpoint_hash (endpoint_hash),
      KEY idx_push_user (user_id),
      CONSTRAINT fk_push_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS push_fcm_tokens (
      id            INT AUTO_INCREMENT PRIMARY KEY,
      user_id       CHAR(36) NOT NULL,
      token_hash    CHAR(64) NOT NULL,
      token         VARCHAR(512) NOT NULL,
      platform      VARCHAR(32) NOT NULL DEFAULT 'android',
      app           ENUM('prod','dev') NOT NULL DEFAULT 'prod',
      user_agent    VARCHAR(255) NULL,
      created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_fcm_token_hash (token_hash),
      KEY idx_fcm_user (user_id),
      KEY idx_fcm_user_app (user_id, app),
      CONSTRAINT fk_fcm_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);
  await ensureFcmAppColumn();
  pushTablesReady = true;
}

export async function upsertPushSubscription({ userId, endpoint, p256dh, auth, userAgent }) {
  await ensurePushTables();
  const hash = endpointHash(endpoint);
  await query(
    `INSERT INTO push_subscriptions
       (user_id, endpoint_hash, endpoint, p256dh, auth, user_agent)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       user_id = VALUES(user_id),
       endpoint = VALUES(endpoint),
       p256dh = VALUES(p256dh),
       auth = VALUES(auth),
       user_agent = VALUES(user_agent)`,
    [userId, hash, endpoint, p256dh, auth, userAgent || null]
  );
  return { endpointHash: hash };
}

export async function deletePushSubscriptionByEndpoint(userId, endpoint) {
  await ensurePushTables();
  const hash = endpointHash(endpoint);
  await query(
    'DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint_hash = ?',
    [userId, hash]
  );
}

export async function deletePushSubscriptionByHash(endpointSha) {
  await ensurePushTables();
  await query('DELETE FROM push_subscriptions WHERE endpoint_hash = ?', [endpointSha]);
}

export async function listPushSubscriptionsForUser(userId) {
  await ensurePushTables();
  return query(
    `SELECT endpoint_hash, endpoint, p256dh, auth
     FROM push_subscriptions
     WHERE user_id = ?
     ORDER BY updated_at DESC`,
    [userId]
  );
}

export async function upsertFcmToken({ userId, token, platform, userAgent, app }) {
  await ensurePushTables();
  const hash = fcmTokenHash(token);
  const pushApp = normalizePushApp(app);
  await query(
    `INSERT INTO push_fcm_tokens
       (user_id, token_hash, token, platform, app, user_agent)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       user_id = VALUES(user_id),
       token = VALUES(token),
       platform = VALUES(platform),
       app = VALUES(app),
       user_agent = VALUES(user_agent)`,
    [userId, hash, token, platform || 'android', pushApp, userAgent || null]
  );
  return { tokenHash: hash, app: pushApp };
}

export async function deleteFcmTokenForUser(userId, token) {
  await ensurePushTables();
  const hash = fcmTokenHash(token);
  await query(
    'DELETE FROM push_fcm_tokens WHERE user_id = ? AND token_hash = ?',
    [userId, hash]
  );
}

export async function deleteFcmTokenByHash(tokenSha) {
  await ensurePushTables();
  await query('DELETE FROM push_fcm_tokens WHERE token_hash = ?', [tokenSha]);
}

export async function listFcmTokensForUser(userId) {
  await ensurePushTables();
  return query(
    `SELECT token_hash, token, platform, app
     FROM push_fcm_tokens
     WHERE user_id = ?
     ORDER BY updated_at DESC`,
    [userId]
  );
}
