/**
 * Daily quotas for GigaChat image generation (separate from AI search).
 */
import { query as dbQuery } from '../database/config.mjs';

export const IMAGE_GUEST_DAILY_LIMIT = 2;
export const IMAGE_USER_DAILY_LIMIT = 5;
export const IMAGE_PRO_MONTHLY_LIMIT = 200;

let tablesReady = false;

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

export async function ensureImageUsageTables() {
  if (tablesReady) return;

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS ai_image_usage_daily (
      identity_key VARCHAR(191) NOT NULL,
      day_key CHAR(10) NOT NULL,
      requests INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (identity_key, day_key),
      INDEX idx_ai_img_daily_day (day_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS ai_image_usage_monthly (
      user_id VARCHAR(64) NOT NULL,
      month_key CHAR(7) NOT NULL,
      requests INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, month_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  tablesReady = true;
}

export async function checkAndIncrementImageUsage(identity, limit) {
  await ensureImageUsageTables();
  const dayKey = getTodayKey();
  const identityKey = `img:${identity.id}`;
  const max = Number(limit);

  await dbQuery(
    `INSERT INTO ai_image_usage_daily (identity_key, day_key, requests)
     VALUES (?, ?, 1)
     ON DUPLICATE KEY UPDATE requests = requests + 1`,
    [identityKey, dayKey]
  );

  const rows = await dbQuery(
    'SELECT requests FROM ai_image_usage_daily WHERE identity_key = ? AND day_key = ? LIMIT 1',
    [identityKey, dayKey]
  );
  const used = rows?.[0] ? Number(rows[0].requests) || 0 : 1;

  if (used > max) {
    await dbQuery(
      `UPDATE ai_image_usage_daily
       SET requests = GREATEST(requests - 1, 0)
       WHERE identity_key = ? AND day_key = ?`,
      [identityKey, dayKey]
    );
    return { ok: false, limit: max, used: max };
  }

  return { ok: true, limit: max, used, identityKey, dayKey };
}

export async function refundImageUsage(usage) {
  if (!usage?.identityKey || !usage?.dayKey) return;
  try {
    await dbQuery(
      `UPDATE ai_image_usage_daily
       SET requests = GREATEST(requests - 1, 0)
       WHERE identity_key = ? AND day_key = ?`,
      [usage.identityKey, usage.dayKey]
    );
  } catch (_) {
    /* ignore */
  }
}

export async function checkAndIncrementImageProMonthly(userId) {
  await ensureImageUsageTables();
  const monthKey = getMonthKey();
  const max = IMAGE_PRO_MONTHLY_LIMIT;
  const uid = String(userId);

  await dbQuery(
    `INSERT INTO ai_image_usage_monthly (user_id, month_key, requests)
     VALUES (?, ?, 1)
     ON DUPLICATE KEY UPDATE requests = requests + 1`,
    [uid, monthKey]
  );

  const rows = await dbQuery(
    'SELECT requests FROM ai_image_usage_monthly WHERE user_id = ? AND month_key = ? LIMIT 1',
    [uid, monthKey]
  );
  const used = rows?.[0] ? Number(rows[0].requests) || 0 : 1;

  if (used > max) {
    await dbQuery(
      `UPDATE ai_image_usage_monthly
       SET requests = GREATEST(requests - 1, 0)
       WHERE user_id = ? AND month_key = ?`,
      [uid, monthKey]
    );
    return { ok: false, limit: max, used: max };
  }

  return { ok: true, limit: max, used, userId: uid, monthKey };
}

export async function refundImageProMonthly(usage) {
  if (!usage?.userId || !usage?.monthKey) return;
  try {
    await dbQuery(
      `UPDATE ai_image_usage_monthly
       SET requests = GREATEST(requests - 1, 0)
       WHERE user_id = ? AND month_key = ?`,
      [usage.userId, usage.monthKey]
    );
  } catch (_) {
    /* ignore */
  }
}
