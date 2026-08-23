// Учёт лимитов режима «Выдача» (отдельно от ИИ). Дневные и Pro-месячные — в MySQL.

import { query as dbQuery } from '../database/config.mjs';

export const WEB_GUEST_DAILY_LIMIT = 40;
export const WEB_USER_DAILY_LIMIT = 120;
export const WEB_PRO_MONTHLY_LIMIT = 2000 * 8; // 16000

let tablesReady = false;

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

export async function ensureWebUsageTables() {
  if (tablesReady) return;

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS web_usage_daily (
      identity_key VARCHAR(191) NOT NULL,
      day_key CHAR(10) NOT NULL,
      requests INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (identity_key, day_key),
      INDEX idx_web_daily_day (day_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  tablesReady = true;
}

/**
 * Атомарный инкремент дневного лимита Выдачи (guest / free user).
 * identity.id вида user:… / guest:… / vk-user:…
 */
export async function checkAndIncrementWebUsage(identity) {
  await ensureWebUsageTables();

  const dayKey = getTodayKey();
  const identityKey = String(identity.id);
  const limit =
    identity.type === 'guest' ? WEB_GUEST_DAILY_LIMIT : WEB_USER_DAILY_LIMIT;

  await dbQuery(
    `INSERT INTO web_usage_daily (identity_key, day_key, requests)
     VALUES (?, ?, 1)
     ON DUPLICATE KEY UPDATE requests = requests + 1`,
    [identityKey, dayKey]
  );

  const rows = await dbQuery(
    'SELECT requests FROM web_usage_daily WHERE identity_key = ? AND day_key = ? LIMIT 1',
    [identityKey, dayKey]
  );
  const used = rows?.[0] ? Number(rows[0].requests) || 0 : 1;

  if (used > limit) {
    await dbQuery(
      `UPDATE web_usage_daily
       SET requests = GREATEST(requests - 1, 0)
       WHERE identity_key = ? AND day_key = ?`,
      [identityKey, dayKey]
    );
    return { ok: false, limit, used: limit };
  }

  return { ok: true, limit, used };
}

/** Текущий дневной расход Выдачи для userId (для профиля). */
export async function peekWebDailyUsedForUser(userId) {
  if (!userId) return 0;
  await ensureWebUsageTables();
  const dayKey = getTodayKey();
  const identityKey = `user:${userId}`;
  try {
    const rows = await dbQuery(
      'SELECT requests FROM web_usage_daily WHERE identity_key = ? AND day_key = ? LIMIT 1',
      [identityKey, dayKey]
    );
    return rows?.[0] ? Number(rows[0].requests) || 0 : 0;
  } catch (_) {
    return 0;
  }
}

export async function getWebMonthlyUsedForUser(userId) {
  if (!userId) return 0;
  const monthKey = getMonthKey();
  try {
    const rows = await dbQuery(
      'SELECT requests FROM web_usage_monthly WHERE user_id = ? AND month_key = ? LIMIT 1',
      [userId, monthKey]
    );
    return rows && rows.length > 0 ? Number(rows[0].requests) || 0 : 0;
  } catch (_) {
    return 0;
  }
}

export async function checkAndIncrementWebProMonthly(userId) {
  const monthKey = getMonthKey();
  const limit = WEB_PRO_MONTHLY_LIMIT;

  await dbQuery(
    `INSERT INTO web_usage_monthly (user_id, month_key, requests)
     VALUES (?, ?, 1)
     ON DUPLICATE KEY UPDATE requests = requests + 1`,
    [userId, monthKey]
  );

  const rows = await dbQuery(
    'SELECT requests FROM web_usage_monthly WHERE user_id = ? AND month_key = ? LIMIT 1',
    [userId, monthKey]
  );
  const used = rows?.[0] ? Number(rows[0].requests) || 0 : 1;

  if (used > limit) {
    await dbQuery(
      `UPDATE web_usage_monthly
       SET requests = GREATEST(requests - 1, 0)
       WHERE user_id = ? AND month_key = ?`,
      [userId, monthKey]
    );
    return { ok: false, used: limit, limit };
  }

  return { ok: true, used, limit };
}
