import { query } from '../database/config.mjs';

let tablesReady = false;

export async function ensureMarketingTables() {
  if (tablesReady) return;

  await query(`
    CREATE TABLE IF NOT EXISTS marketing_queue (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      product VARCHAR(64) NOT NULL DEFAULT '',
      format ENUM('text','video') NOT NULL DEFAULT 'text',
      title VARCHAR(512) NOT NULL DEFAULT '',
      body MEDIUMTEXT NULL,
      cta_url VARCHAR(1024) NULL,
      media_path VARCHAR(1024) NULL,
      channels_json JSON NULL,
      status ENUM(
        'draft','rendering','pending_review','publishing','published','rejected','failed'
      ) NOT NULL DEFAULT 'draft',
      publish_at DATETIME(3) NULL,
      created_by VARCHAR(128) NULL,
      reviewed_by VARCHAR(128) NULL,
      reject_reason VARCHAR(512) NULL,
      meta JSON NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      KEY idx_mq_status (status),
      KEY idx_mq_product (product),
      KEY idx_mq_created (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS marketing_channel_log (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      queue_id BIGINT UNSIGNED NOT NULL,
      channel_id VARCHAR(64) NOT NULL,
      status ENUM('pending','ok','error','skipped') NOT NULL DEFAULT 'pending',
      external_url VARCHAR(1024) NULL,
      detail TEXT NULL,
      error_message VARCHAR(1024) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      KEY idx_mcl_queue (queue_id),
      KEY idx_mcl_channel (channel_id),
      CONSTRAINT fk_mcl_queue FOREIGN KEY (queue_id)
        REFERENCES marketing_queue(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  await ensureQueueExtraColumns();

  tablesReady = true;
}

async function ensureQueueExtraColumns() {
  const cols = await query(
    `SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'marketing_queue'`
  );
  const names = new Set((cols || []).map((c) => c.name));
  if (!names.has('campaign_id')) {
    await query(
      `ALTER TABLE marketing_queue
       ADD COLUMN campaign_id BIGINT UNSIGNED NULL AFTER meta,
       ADD KEY idx_mq_campaign (campaign_id)`
    );
  }
  if (!names.has('digest_date')) {
    await query(
      `ALTER TABLE marketing_queue
       ADD COLUMN digest_date DATE NULL AFTER campaign_id,
       ADD KEY idx_mq_digest (digest_date, status)`
    );
  }
}

function parseJson(val, fallback) {
  if (val == null) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function mapRow(row) {
  if (!row) return null;
  return {
    ...row,
    channels: parseJson(row.channels_json, []),
    meta: parseJson(row.meta, null),
    channels_json: undefined
  };
}

export async function listQueue({ status, limit = 50 } = {}) {
  await ensureMarketingTables();
  const lim = Math.min(200, Math.max(1, Number(limit) || 50));
  let sql = `SELECT * FROM marketing_queue`;
  const params = [];
  if (status) {
    sql += ` WHERE status = ?`;
    params.push(String(status));
  }
  sql += ` ORDER BY updated_at DESC LIMIT ${lim}`;
  const rows = await query(sql, params);
  const items = (rows || []).map(mapRow);
  if (!items.length) return items;

  const ids = items.map((i) => i.id);
  const placeholders = ids.map(() => '?').join(',');
  const logs = await query(
    `SELECT * FROM marketing_channel_log WHERE queue_id IN (${placeholders}) ORDER BY id ASC`,
    ids
  );
  const byQ = new Map();
  for (const log of logs || []) {
    if (!byQ.has(log.queue_id)) byQ.set(log.queue_id, []);
    byQ.get(log.queue_id).push(log);
  }
  return items.map((item) => ({
    ...item,
    channel_results: byQ.get(item.id) || []
  }));
}

export async function getQueueItem(id) {
  await ensureMarketingTables();
  const rows = await query(`SELECT * FROM marketing_queue WHERE id = ? LIMIT 1`, [id]);
  const item = mapRow(rows?.[0]);
  if (!item) return null;
  const logs = await query(
    `SELECT * FROM marketing_channel_log WHERE queue_id = ? ORDER BY id ASC`,
    [id]
  );
  return { ...item, channel_results: logs || [] };
}

export async function createQueueItem(data) {
  await ensureMarketingTables();
  const channels = Array.isArray(data.channels) ? data.channels : ['manual'];
  const status = data.status || 'pending_review';
  const result = await query(
    `INSERT INTO marketing_queue
      (product, format, title, body, cta_url, media_path, channels_json, status, publish_at, created_by, meta, campaign_id, digest_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      String(data.product || '').slice(0, 64),
      data.format === 'video' ? 'video' : 'text',
      String(data.title || '').slice(0, 512),
      data.body != null ? String(data.body) : null,
      data.cta_url != null ? String(data.cta_url).slice(0, 1024) : null,
      data.media_path != null ? String(data.media_path).slice(0, 1024) : null,
      JSON.stringify(channels),
      status,
      data.publish_at || null,
      data.created_by != null ? String(data.created_by).slice(0, 128) : null,
      data.meta != null ? JSON.stringify(data.meta) : null,
      data.campaign_id != null ? Number(data.campaign_id) : null,
      data.digest_date || null
    ]
  );
  return getQueueItem(result.insertId);
}

export async function updateQueueItem(id, patch) {
  await ensureMarketingTables();
  const item = await getQueueItem(id);
  if (!item) return null;

  const fields = [];
  const vals = [];
  const set = (col, val) => {
    fields.push(`${col} = ?`);
    vals.push(val);
  };

  if (patch.title != null) set('title', String(patch.title).slice(0, 512));
  if (patch.body != null) set('body', String(patch.body));
  if (patch.cta_url != null) set('cta_url', String(patch.cta_url).slice(0, 1024));
  if (patch.product != null) set('product', String(patch.product).slice(0, 64));
  if (patch.format != null) set('format', patch.format === 'video' ? 'video' : 'text');
  if (patch.media_path != null) set('media_path', String(patch.media_path).slice(0, 1024));
  if (Array.isArray(patch.channels)) set('channels_json', JSON.stringify(patch.channels));
  if (patch.status != null) set('status', String(patch.status));
  if (patch.publish_at !== undefined) set('publish_at', patch.publish_at || null);
  if (patch.reviewed_by != null) set('reviewed_by', String(patch.reviewed_by).slice(0, 128));
  if (patch.reject_reason != null) set('reject_reason', String(patch.reject_reason).slice(0, 512));
  if (patch.meta != null) set('meta', JSON.stringify(patch.meta));
  if (patch.campaign_id !== undefined) {
    set('campaign_id', patch.campaign_id != null ? Number(patch.campaign_id) : null);
  }
  if (patch.digest_date !== undefined) set('digest_date', patch.digest_date || null);

  if (!fields.length) return item;
  vals.push(id);
  await query(`UPDATE marketing_queue SET ${fields.join(', ')} WHERE id = ?`, vals);
  return getQueueItem(id);
}

export async function clearChannelLogs(queueId) {
  await ensureMarketingTables();
  await query(`DELETE FROM marketing_channel_log WHERE queue_id = ?`, [queueId]);
}

/** Посты дайджеста на дату (Europe/Moscow date string YYYY-MM-DD). */
export async function listDigestItems(digestDate, { statuses } = {}) {
  await ensureMarketingTables();
  const date = String(digestDate || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];
  const want = Array.isArray(statuses) && statuses.length
    ? statuses.map(String)
    : ['pending_review', 'draft', 'publishing', 'published', 'failed', 'rejected'];
  const ph = want.map(() => '?').join(',');
  const rows = await query(
    `SELECT * FROM marketing_queue
     WHERE digest_date = ? AND status IN (${ph})
     ORDER BY publish_at IS NULL, publish_at ASC, id ASC`,
    [date, ...want]
  );
  const items = (rows || []).map(mapRow);
  if (!items.length) return items;
  const ids = items.map((i) => i.id);
  const placeholders = ids.map(() => '?').join(',');
  const logs = await query(
    `SELECT * FROM marketing_channel_log WHERE queue_id IN (${placeholders}) ORDER BY id ASC`,
    ids
  );
  const byQ = new Map();
  for (const log of logs || []) {
    if (!byQ.has(log.queue_id)) byQ.set(log.queue_id, []);
    byQ.get(log.queue_id).push(log);
  }
  return items.map((item) => ({
    ...item,
    channel_results: byQ.get(item.id) || []
  }));
}

export async function findDigestSlotItem(campaignId, digestDate, slot) {
  await ensureMarketingTables();
  const rows = await query(
    `SELECT id, status, meta FROM marketing_queue
     WHERE campaign_id = ? AND digest_date = ?
       AND status NOT IN ('rejected')
     ORDER BY id ASC`,
    [campaignId, digestDate]
  );
  for (const row of rows || []) {
    const meta = parseJson(row.meta, {});
    if (String(meta.slot || '') === String(slot)) return row;
  }
  return null;
}

export async function addChannelLog(queueId, entry) {
  await ensureMarketingTables();
  const result = await query(
    `INSERT INTO marketing_channel_log
      (queue_id, channel_id, status, external_url, detail, error_message)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      queueId,
      String(entry.channel_id).slice(0, 64),
      entry.status || 'pending',
      entry.external_url != null ? String(entry.external_url).slice(0, 1024) : null,
      entry.detail != null ? String(entry.detail) : null,
      entry.error_message != null ? String(entry.error_message).slice(0, 1024) : null
    ]
  );
  return result.insertId;
}

export async function deleteQueueItem(id) {
  await ensureMarketingTables();
  const item = await getQueueItem(id);
  if (!item) return null;
  await query(`DELETE FROM marketing_queue WHERE id = ?`, [id]);
  return item;
}
