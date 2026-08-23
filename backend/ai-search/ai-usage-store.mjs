// Учёт дневных лимитов ИИ-поиска и idempotency-кэш (MySQL).

import { query as dbQuery } from '../database/config.mjs';

export const AI_GUEST_DAILY_LIMIT = 5;
export const AI_USER_DAILY_LIMIT = 15;
export const AI_PRO_MONTHLY_LIMIT = 2000;
export const AI_IDEMPOTENCY_TTL_MS = 5 * 60 * 1000;

let tablesReady = false;

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

export async function ensureAiUsageTables() {
  if (tablesReady) return;

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS ai_usage_daily (
      identity_key VARCHAR(191) NOT NULL,
      day_key CHAR(10) NOT NULL,
      requests INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (identity_key, day_key),
      INDEX idx_ai_daily_day (day_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS ai_search_idempotency (
      identity_key VARCHAR(191) NOT NULL,
      idempotency_key VARCHAR(128) NOT NULL,
      response_json MEDIUMTEXT NOT NULL,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      PRIMARY KEY (identity_key, idempotency_key),
      INDEX idx_ai_idem_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  tablesReady = true;
}

/**
 * Атомарный инкремент дневного лимита ИИ (guest / free user).
 * identity.id вида user:… / guest:… / vk-user:…
 */
export async function checkAndIncrementAiUsage(identity, limit) {
  await ensureAiUsageTables();

  const dayKey = getTodayKey();
  const identityKey = String(identity.id);
  const max = Number(limit);

  await dbQuery(
    `INSERT INTO ai_usage_daily (identity_key, day_key, requests)
     VALUES (?, ?, 1)
     ON DUPLICATE KEY UPDATE requests = requests + 1`,
    [identityKey, dayKey]
  );

  const rows = await dbQuery(
    'SELECT requests FROM ai_usage_daily WHERE identity_key = ? AND day_key = ? LIMIT 1',
    [identityKey, dayKey]
  );
  const used = rows?.[0] ? Number(rows[0].requests) || 0 : 1;

  if (used > max) {
    await dbQuery(
      `UPDATE ai_usage_daily
       SET requests = GREATEST(requests - 1, 0)
       WHERE identity_key = ? AND day_key = ?`,
      [identityKey, dayKey]
    );
    return { ok: false, limit: max, used: max };
  }

  return { ok: true, limit: max, used };
}

export async function peekAiDailyUsedForUser(userId) {
  if (!userId) return 0;
  await ensureAiUsageTables();
  const dayKey = getTodayKey();
  const identityKey = `user:${userId}`;
  try {
    const rows = await dbQuery(
      'SELECT requests FROM ai_usage_daily WHERE identity_key = ? AND day_key = ? LIMIT 1',
      [identityKey, dayKey]
    );
    return rows?.[0] ? Number(rows[0].requests) || 0 : 0;
  } catch (_) {
    return 0;
  }
}

export async function checkAndIncrementAiProMonthly(userId) {
  const monthKey = getMonthKey();
  const limit = AI_PRO_MONTHLY_LIMIT;

  await dbQuery(
    `INSERT INTO ai_usage_monthly (user_id, month_key, requests)
     VALUES (?, ?, 1)
     ON DUPLICATE KEY UPDATE requests = requests + 1`,
    [userId, monthKey]
  );

  const rows = await dbQuery(
    'SELECT requests FROM ai_usage_monthly WHERE user_id = ? AND month_key = ? LIMIT 1',
    [userId, monthKey]
  );
  const used = rows?.[0] ? Number(rows[0].requests) || 0 : 1;

  if (used > limit) {
    await dbQuery(
      `UPDATE ai_usage_monthly
       SET requests = GREATEST(requests - 1, 0)
       WHERE user_id = ? AND month_key = ?`,
      [userId, monthKey]
    );
    return { ok: false, used: limit, limit };
  }

  return { ok: true, used, limit };
}

export async function getAiIdempotentResponse(identityKey, idempotencyKey) {
  if (!identityKey || !idempotencyKey) return null;
  await ensureAiUsageTables();

  const key = String(idempotencyKey).slice(0, 128);
  const rows = await dbQuery(
    `SELECT response_json, created_at
     FROM ai_search_idempotency
     WHERE identity_key = ? AND idempotency_key = ?
     LIMIT 1`,
    [String(identityKey), key]
  );

  if (!rows?.length) return null;

  const createdAt = new Date(rows[0].created_at).getTime();
  if (!Number.isFinite(createdAt) || Date.now() - createdAt >= AI_IDEMPOTENCY_TTL_MS) {
    dbQuery(
      'DELETE FROM ai_search_idempotency WHERE identity_key = ? AND idempotency_key = ?',
      [String(identityKey), key]
    ).catch(() => {});
    return null;
  }

  try {
    return JSON.parse(rows[0].response_json);
  } catch (_) {
    return null;
  }
}

export async function setAiIdempotentResponse(identityKey, idempotencyKey, response) {
  if (!identityKey || !idempotencyKey || response == null) return;
  await ensureAiUsageTables();

  const key = String(idempotencyKey).slice(0, 128);
  let json;
  try {
    json = JSON.stringify(response);
  } catch (_) {
    return;
  }

  await dbQuery(
    `INSERT INTO ai_search_idempotency (identity_key, idempotency_key, response_json, created_at)
     VALUES (?, ?, ?, CURRENT_TIMESTAMP(3))
     ON DUPLICATE KEY UPDATE
       response_json = VALUES(response_json),
       created_at = CURRENT_TIMESTAMP(3)`,
    [String(identityKey), key, json]
  );

  // Ленивая уборка просроченных записей (не блокируем ответ)
  dbQuery(
    `DELETE FROM ai_search_idempotency
     WHERE created_at < (CURRENT_TIMESTAMP(3) - INTERVAL ? SECOND)
     LIMIT 100`,
    [Math.ceil(AI_IDEMPOTENCY_TTL_MS / 1000) * 2]
  ).catch(() => {});
}
