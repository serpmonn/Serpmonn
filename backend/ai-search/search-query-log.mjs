import { query } from '../database/config.mjs';
import crypto from 'crypto';

let tablesReady = false;

const QUERY_MAX = 300;
const RAW_TTL_DAYS = 30;

export async function ensureSearchQueryLogTable() {
  if (tablesReady) return;

  await query(`
    CREATE TABLE IF NOT EXISTS search_query_log (
      id              BIGINT AUTO_INCREMENT PRIMARY KEY,
      mode            ENUM('ai', 'web') NOT NULL,
      query_text      VARCHAR(300) NOT NULL,
      query_norm      VARCHAR(300) NOT NULL,
      category        VARCHAR(32) NULL,
      locale          VARCHAR(16) NOT NULL DEFAULT 'ru',
      identity_type   ENUM('user', 'guest', 'vk') NOT NULL DEFAULT 'guest',
      user_id         VARCHAR(64) NULL,
      guest_key       VARCHAR(128) NULL,
      anon_id         VARCHAR(64) NULL,
      client          ENUM('web', 'android', 'vk') NULL,
      device          ENUM('mobile', 'desktop') NULL,
      status          ENUM('ok', 'empty', 'error', 'limit') NOT NULL,
      result_count    INT NOT NULL DEFAULT 0,
      latency_ms      INT NULL,
      created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_sql_created (created_at),
      INDEX idx_sql_mode_created (mode, created_at),
      INDEX idx_sql_status_created (status, created_at),
      INDEX idx_sql_norm_created (query_norm, created_at),
      INDEX idx_sql_anon (anon_id, created_at),
      INDEX idx_sql_client (client, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Older installs: add columns/indexes only if missing (avoid noisy ER_DUP_* in query()).
  const colRows = await query(`
    SELECT COLUMN_NAME AS name
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'search_query_log'
      AND COLUMN_NAME IN ('anon_id', 'client', 'device')
  `);
  const cols = new Set(colRows.map((r) => r.name));
  if (!cols.has('anon_id')) {
    await query(`ALTER TABLE search_query_log ADD COLUMN anon_id VARCHAR(64) NULL AFTER guest_key`);
  }
  if (!cols.has('client')) {
    await query(`ALTER TABLE search_query_log ADD COLUMN client ENUM('web', 'android', 'vk') NULL AFTER anon_id`);
  }
  if (!cols.has('device')) {
    await query(`ALTER TABLE search_query_log ADD COLUMN device ENUM('mobile', 'desktop') NULL AFTER client`);
  }

  const idxRows = await query(`
    SELECT DISTINCT INDEX_NAME AS name
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'search_query_log'
      AND INDEX_NAME IN ('idx_sql_anon', 'idx_sql_client')
  `);
  const idxs = new Set(idxRows.map((r) => r.name));
  if (!idxs.has('idx_sql_anon')) {
    await query(`ALTER TABLE search_query_log ADD INDEX idx_sql_anon (anon_id, created_at)`);
  }
  if (!idxs.has('idx_sql_client')) {
    await query(`ALTER TABLE search_query_log ADD INDEX idx_sql_client (client, created_at)`);
  }

  tablesReady = true;
}

export function normalizeSearchQuery(text) {
  return String(text || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .slice(0, QUERY_MAX);
}

export function clipSearchQuery(text) {
  return String(text || '').trim().slice(0, QUERY_MAX);
}

export function hashGuestKey(raw) {
  if (!raw) return null;
  return crypto.createHash('sha256').update(String(raw)).digest('hex').slice(0, 32);
}

export function normalizeAnonId(raw) {
  const s = String(raw || '').trim();
  if (!s || s.length < 8 || s.length > 64) return null;
  if (!/^[a-zA-Z0-9_-]+$/.test(s)) return null;
  return s;
}

export function detectClientFromRequest(req) {
  const header = String(req.headers['x-spn-client'] || '').toLowerCase();
  if (header === 'android' || header === 'vk' || header === 'web') return header;
  if (req.headers['x-client'] === 'vk-agent') return 'vk';
  const ua = String(req.headers['user-agent'] || '');
  if (/SerpmonnAndroid|Capacitor/i.test(ua)) return 'android';
  return 'web';
}

export function detectDeviceFromRequest(req) {
  const header = String(req.headers['x-spn-device'] || '').toLowerCase();
  if (header === 'mobile' || header === 'desktop') return header;
  const ua = String(req.headers['user-agent'] || '');
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua)) return 'mobile';
  return 'desktop';
}

/**
 * Fire-and-forget insert. Never throws to callers.
 */
export function logSearchQuerySafe(data) {
  Promise.resolve()
    .then(() => logSearchQuery(data))
    .catch((err) => {
      console.warn('[search-query-log]', err?.message || err);
    });
}

export async function logSearchQuery(data) {
  await ensureSearchQueryLogTable();

  const queryText = clipSearchQuery(data.queryText);
  if (!queryText) return null;

  const mode = data.mode === 'web' ? 'web' : 'ai';
  const status = ['ok', 'empty', 'error', 'limit'].includes(data.status)
    ? data.status
    : 'ok';
  const client = ['web', 'android', 'vk'].includes(data.client) ? data.client : null;
  const device = ['mobile', 'desktop'].includes(data.device) ? data.device : null;
  const anonId = normalizeAnonId(data.anonId);

  const result = await query(
    `INSERT INTO search_query_log
      (mode, query_text, query_norm, category, locale, identity_type, user_id, guest_key, anon_id, client, device, status, result_count, latency_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      mode,
      queryText,
      normalizeSearchQuery(queryText),
      data.category ? String(data.category).slice(0, 32) : null,
      String(data.locale || 'ru').slice(0, 16),
      ['user', 'guest', 'vk'].includes(data.identityType) ? data.identityType : 'guest',
      data.userId != null ? String(data.userId).slice(0, 64) : null,
      data.guestKey ? String(data.guestKey).slice(0, 128) : null,
      anonId,
      client,
      device,
      status,
      Number.isFinite(Number(data.resultCount)) ? Math.max(0, Number(data.resultCount)) : 0,
      data.latencyMs != null && Number.isFinite(Number(data.latencyMs))
        ? Math.round(Number(data.latencyMs))
        : null,
    ]
  );

  return result.insertId;
}

function periodToHours(period) {
  if (period === '24h') return 24;
  if (period === '30d') return 24 * 30;
  return 24 * 7;
}

export async function getSearchInsights({
  period = '7d',
  mode = null,
  status = null,
  category = null,
  identityType = null,
  client = null,
  device = null,
} = {}) {
  await ensureSearchQueryLogTable();

  const hours = periodToHours(period);
  const where = ['created_at >= (NOW() - INTERVAL ? HOUR)'];
  const params = [hours];

  if (mode === 'ai' || mode === 'web') {
    where.push('mode = ?');
    params.push(mode);
  }
  if (status && ['ok', 'empty', 'error', 'limit'].includes(status)) {
    where.push('status = ?');
    params.push(status);
  }
  if (category) {
    where.push('category = ?');
    params.push(String(category).slice(0, 32));
  }
  if (identityType && ['user', 'guest', 'vk'].includes(identityType)) {
    where.push('identity_type = ?');
    params.push(identityType);
  }
  if (client && ['web', 'android', 'vk'].includes(client)) {
    where.push('client = ?');
    params.push(client);
  }
  if (device && ['mobile', 'desktop'].includes(device)) {
    where.push('device = ?');
    params.push(device);
  }

  const whereSql = where.join(' AND ');

  const [
    summaryRows,
    topRows,
    failureRows,
    recentRows,
    identityRows,
    categoryRows,
    topUserRows,
    clientRows,
    deviceRows,
    topAnonRows,
  ] = await Promise.all([
    query(
      `SELECT
         COUNT(*) AS total,
         SUM(mode = 'ai') AS ai_count,
         SUM(mode = 'web') AS web_count,
         SUM(status = 'empty') AS empty_count,
         SUM(status = 'error') AS error_count,
         SUM(status = 'limit') AS limit_count,
         SUM(status = 'ok') AS ok_count
       FROM search_query_log
       WHERE ${whereSql}`,
      params
    ),
    query(
      `SELECT query_norm,
              MAX(query_text) AS query_text,
              COUNT(*) AS hits,
              SUM(mode = 'ai') AS ai_hits,
              SUM(mode = 'web') AS web_hits,
              SUM(status = 'empty') AS empty_hits,
              SUM(status = 'limit') AS limit_hits
       FROM search_query_log
       WHERE ${whereSql}
       GROUP BY query_norm
       ORDER BY hits DESC
       LIMIT 40`,
      params
    ),
    query(
      `SELECT query_norm,
              MAX(query_text) AS query_text,
              mode,
              status,
              COUNT(*) AS hits
       FROM search_query_log
       WHERE ${whereSql} AND status IN ('empty', 'error', 'limit')
       GROUP BY query_norm, mode, status
       ORDER BY hits DESC
       LIMIT 40`,
      params
    ),
    query(
      `SELECT id, mode, query_text, category, locale, identity_type, user_id, anon_id, client, device,
              status, result_count, latency_ms, created_at
       FROM search_query_log
       WHERE ${whereSql}
       ORDER BY created_at DESC
       LIMIT 50`,
      params
    ),
    query(
      `SELECT identity_type, COUNT(*) AS hits
       FROM search_query_log
       WHERE ${whereSql}
       GROUP BY identity_type`,
      params
    ),
    query(
      `SELECT COALESCE(category, '—') AS category, COUNT(*) AS hits
       FROM search_query_log
       WHERE ${whereSql} AND mode = 'web'
       GROUP BY category
       ORDER BY hits DESC
       LIMIT 12`,
      params
    ),
    query(
      `SELECT user_id, COUNT(*) AS hits,
              SUM(mode = 'ai') AS ai_hits,
              SUM(mode = 'web') AS web_hits,
              SUM(status = 'limit') AS limit_hits
       FROM search_query_log
       WHERE ${whereSql} AND identity_type = 'user' AND user_id IS NOT NULL
       GROUP BY user_id
       ORDER BY hits DESC
       LIMIT 20`,
      params
    ),
    query(
      `SELECT COALESCE(client, '—') AS client, COUNT(*) AS hits
       FROM search_query_log
       WHERE ${whereSql}
       GROUP BY client
       ORDER BY hits DESC`,
      params
    ),
    query(
      `SELECT COALESCE(device, '—') AS device, COUNT(*) AS hits
       FROM search_query_log
       WHERE ${whereSql}
       GROUP BY device
       ORDER BY hits DESC`,
      params
    ),
    query(
      `SELECT anon_id, COUNT(*) AS hits,
              SUM(mode = 'ai') AS ai_hits,
              SUM(mode = 'web') AS web_hits,
              MAX(client) AS client,
              MAX(device) AS device
       FROM search_query_log
       WHERE ${whereSql}
         AND identity_type IN ('guest', 'vk')
         AND anon_id IS NOT NULL
       GROUP BY anon_id
       ORDER BY hits DESC
       LIMIT 20`,
      params
    ),
  ]);

  const s = summaryRows[0] || {};
  const total = Number(s.total) || 0;
  const emptyCount = Number(s.empty_count) || 0;

  const userIds = new Set();
  for (const row of recentRows || []) {
    if (row.user_id) userIds.add(String(row.user_id));
  }
  for (const row of topUserRows || []) {
    if (row.user_id) userIds.add(String(row.user_id));
  }
  const usernameById = await resolveUsernames([...userIds]);

  return {
    period,
    hours,
    summary: {
      total,
      ai: Number(s.ai_count) || 0,
      web: Number(s.web_count) || 0,
      empty: emptyCount,
      error: Number(s.error_count) || 0,
      limit: Number(s.limit_count) || 0,
      ok: Number(s.ok_count) || 0,
      emptyPct: total ? Math.round((emptyCount / total) * 1000) / 10 : 0,
      byIdentity: (identityRows || []).map((r) => ({
        type: r.identity_type,
        hits: Number(r.hits) || 0,
      })),
      byClient: (clientRows || []).map((r) => ({
        client: r.client,
        hits: Number(r.hits) || 0,
      })),
      byDevice: (deviceRows || []).map((r) => ({
        device: r.device,
        hits: Number(r.hits) || 0,
      })),
      webCategories: (categoryRows || []).map((r) => ({
        category: r.category,
        hits: Number(r.hits) || 0,
      })),
    },
    top: (topRows || []).map((r) => ({
      query: r.query_text,
      norm: r.query_norm,
      hits: Number(r.hits) || 0,
      ai: Number(r.ai_hits) || 0,
      web: Number(r.web_hits) || 0,
      empty: Number(r.empty_hits) || 0,
      limit: Number(r.limit_hits) || 0,
      emptyPct: Number(r.hits)
        ? Math.round((Number(r.empty_hits) / Number(r.hits)) * 1000) / 10
        : 0,
    })),
    failures: (failureRows || []).map((r) => ({
      query: r.query_text,
      norm: r.query_norm,
      mode: r.mode,
      status: r.status,
      hits: Number(r.hits) || 0,
    })),
    topUsers: (topUserRows || []).map((r) => ({
      userId: r.user_id,
      username: usernameById.get(String(r.user_id)) || null,
      hits: Number(r.hits) || 0,
      ai: Number(r.ai_hits) || 0,
      web: Number(r.web_hits) || 0,
      limit: Number(r.limit_hits) || 0,
    })),
    topAnons: (topAnonRows || []).map((r) => ({
      anonId: r.anon_id,
      anonShort: String(r.anon_id || '').slice(0, 8),
      hits: Number(r.hits) || 0,
      ai: Number(r.ai_hits) || 0,
      web: Number(r.web_hits) || 0,
      client: r.client || null,
      device: r.device || null,
    })),
    recent: (recentRows || []).map((r) => ({
      id: r.id,
      mode: r.mode,
      query: r.query_text,
      category: r.category,
      locale: r.locale,
      identityType: r.identity_type,
      userId: r.user_id || null,
      username: r.user_id ? usernameById.get(String(r.user_id)) || null : null,
      anonId: r.anon_id || null,
      anonShort: r.anon_id ? String(r.anon_id).slice(0, 8) : null,
      client: r.client || null,
      device: r.device || null,
      status: r.status,
      resultCount: r.result_count,
      latencyMs: r.latency_ms,
      createdAt: r.created_at,
    })),
  };
}

async function resolveUsernames(ids) {
  const map = new Map();
  if (!ids.length) return map;
  const unique = [...new Set(ids.map(String))].slice(0, 100);
  const placeholders = unique.map(() => '?').join(',');
  try {
    const rows = await query(
      `SELECT id, username FROM users WHERE id IN (${placeholders})`,
      unique
    );
    for (const row of rows || []) {
      map.set(String(row.id), row.username || null);
    }
  } catch (err) {
    console.warn('[search-query-log] username resolve:', err?.message || err);
  }
  return map;
}

/** Best-effort purge of old raw rows (call from insights or a cron later). */
export async function purgeOldSearchQueryLogs() {
  await ensureSearchQueryLogTable();
  await query(
    `DELETE FROM search_query_log WHERE created_at < (NOW() - INTERVAL ? DAY)`,
    [RAW_TTL_DAYS]
  );
}
