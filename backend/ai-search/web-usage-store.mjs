// Учёт лимитов режима «Выдача» (отдельно от ИИ).

import { query as dbQuery } from '../database/config.mjs';

export const WEB_GUEST_DAILY_LIMIT = 40;
export const WEB_USER_DAILY_LIMIT = 120;
export const WEB_PRO_MONTHLY_LIMIT = 2000 * 8; // 16000

const webUsageStore = new Map();

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function getMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

export function checkAndIncrementWebUsage(identity) {
  const today = getTodayKey();
  const key = `web:${identity.id}:${today}`;
  const entry = webUsageStore.get(key) || { requests: 0 };
  const limit =
    identity.type === 'guest' ? WEB_GUEST_DAILY_LIMIT : WEB_USER_DAILY_LIMIT;

  if (entry.requests >= limit) {
    return { ok: false, limit, used: entry.requests };
  }

  entry.requests += 1;
  webUsageStore.set(key, entry);
  return { ok: true, limit, used: entry.requests };
}

/** Текущий дневной расход Выдачи для userId (in-memory; для профиля). */
export function peekWebDailyUsedForUser(userId) {
  if (!userId) return 0;
  const key = `web:user:${userId}:${getTodayKey()}`;
  const entry = webUsageStore.get(key);
  return entry?.requests || 0;
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

  const selectSql =
    'SELECT requests FROM web_usage_monthly WHERE user_id = ? AND month_key = ? LIMIT 1';
  const rows = await dbQuery(selectSql, [userId, monthKey]);

  let used = 0;

  if (!rows || rows.length === 0) {
    const insertSql =
      'INSERT INTO web_usage_monthly (user_id, month_key, requests) VALUES (?, ?, 1)';
    await dbQuery(insertSql, [userId, monthKey]);
    used = 1;
  } else {
    used = rows[0].requests;

    if (used >= WEB_PRO_MONTHLY_LIMIT) {
      return { ok: false, used, limit: WEB_PRO_MONTHLY_LIMIT };
    }

    const updateSql =
      'UPDATE web_usage_monthly SET requests = requests + 1 WHERE user_id = ? AND month_key = ?';
    await dbQuery(updateSql, [userId, monthKey]);
    used += 1;
  }

  return { ok: true, used, limit: WEB_PRO_MONTHLY_LIMIT };
}
