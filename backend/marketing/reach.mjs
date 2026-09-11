/**
 * Охват (reach): сбор, ручной ввод, отчёт и еженедельный разбор.
 */

import { query } from '../database/config.mjs';
import { ensureMarketingTables, getQueueItem } from './queue.mjs';

const VK_API = 'https://api.vk.com/method';
const VK_V = '5.199';

function vkToken() {
  return String(process.env.MARKETING_VK_TOKEN || '').trim();
}

function vkGroupId() {
  return String(process.env.MARKETING_VK_GROUP_ID || '').trim();
}

async function ensureReachColumns() {
  await ensureMarketingTables();
  const cols = await query(
    `SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'marketing_channel_log'`
  );
  const names = new Set((cols || []).map((c) => c.name));
  if (!names.has('reach')) {
    await query(
      `ALTER TABLE marketing_channel_log
       ADD COLUMN reach INT UNSIGNED NULL AFTER error_message,
       ADD COLUMN reach_updated_at DATETIME(3) NULL AFTER reach`
    );
  }
}

async function vkCall(method, params = {}) {
  const body = new URLSearchParams({
    access_token: vkToken(),
    v: VK_V,
    ...Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, v == null ? '' : String(v)])
    )
  });
  const res = await fetch(`${VK_API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    signal: AbortSignal.timeout(20000)
  });
  const data = await res.json();
  if (data.error) {
    throw new Error(data.error.error_msg || `VK ${method}`);
  }
  return data.response;
}

/** wall-123_456 → { ownerId, postId } */
function parseVkWallUrl(url) {
  const m = String(url || '').match(/wall(-?\d+)_(\d+)/i);
  if (!m) return null;
  return { ownerId: m[1], postId: m[2] };
}

export async function fetchVkPostReach(externalUrl) {
  const parsed = parseVkWallUrl(externalUrl);
  if (!parsed) return null;
  if (!vkToken()) return null;
  const posts = `${parsed.ownerId}_${parsed.postId}`;
  const resp = await vkCall('wall.getById', { posts });
  const post = Array.isArray(resp) ? resp[0] : resp?.items?.[0];
  const views = post?.views?.count;
  if (views == null) return null;
  return Number(views) || 0;
}

export async function updateChannelLogReach(logId, reach) {
  await ensureReachColumns();
  const n = Math.max(0, Math.floor(Number(reach) || 0));
  await query(
    `UPDATE marketing_channel_log
     SET reach = ?, reach_updated_at = CURRENT_TIMESTAMP(3)
     WHERE id = ?`,
    [n, logId]
  );
  return n;
}

/**
 * Обновить охват по логам VK (views) и YouTube (viewCount).
 * Ручные каналы не трогаем.
 */
export async function refreshReachMetrics({ limit = 40 } = {}) {
  await ensureReachColumns();
  const lim = Math.min(100, Math.max(1, Number(limit) || 40));
  const logs = await query(
    `SELECT id, channel_id, external_url, reach
     FROM marketing_channel_log
     WHERE status = 'ok'
       AND external_url IS NOT NULL
       AND external_url <> ''
       AND (channel_id LIKE 'vk%' OR channel_id = 'youtube')
     ORDER BY id DESC
     LIMIT ${lim}`
  );

  const { fetchYoutubeViewCount } = await import('./channels/youtube.mjs');

  const results = [];
  let checkedVk = 0;
  let checkedYt = 0;
  for (const log of logs || []) {
    const isYt = String(log.channel_id) === 'youtube';
    if (isYt) checkedYt += 1;
    else checkedVk += 1;
    try {
      const reach = isYt
        ? await fetchYoutubeViewCount(log.external_url)
        : await fetchVkPostReach(log.external_url);
      if (reach == null) {
        results.push({ id: log.id, channel: log.channel_id, ok: false, error: 'no views' });
        continue;
      }
      await updateChannelLogReach(log.id, reach);
      results.push({ id: log.id, channel: log.channel_id, ok: true, reach });
    } catch (err) {
      results.push({
        id: log.id,
        channel: log.channel_id,
        ok: false,
        error: err.message || String(err)
      });
    }
  }
  return {
    checked: (logs || []).length,
    checkedVk,
    checkedYt,
    updated: results.filter((r) => r.ok).length,
    updatedVk: results.filter((r) => r.ok && r.channel !== 'youtube').length,
    updatedYt: results.filter((r) => r.ok && r.channel === 'youtube').length,
    results
  };
}

/** Ручной ввод охвата для лога (Дзен / manual / TG). */
export async function setChannelReach({ logId, queueId, channelId, reach }) {
  await ensureReachColumns();
  const n = Math.max(0, Math.floor(Number(reach) || 0));
  if (logId) {
    await updateChannelLogReach(logId, n);
    return { logId: Number(logId), reach: n };
  }
  if (!queueId || !channelId) {
    const err = new Error('Укажи logId или queueId+channelId');
    err.status = 400;
    throw err;
  }
  const rows = await query(
    `SELECT id FROM marketing_channel_log
     WHERE queue_id = ? AND channel_id = ?
     ORDER BY id DESC LIMIT 1`,
    [queueId, String(channelId)]
  );
  if (!rows?.[0]) {
    const err = new Error('Лог канала не найден');
    err.status = 404;
    throw err;
  }
  await updateChannelLogReach(rows[0].id, n);
  return { logId: rows[0].id, reach: n };
}

export async function reachReport(from, to) {
  await ensureReachColumns();
  const fromSql = from.toISOString().slice(0, 19).replace('T', ' ');
  const toSql = to.toISOString().slice(0, 19).replace('T', ' ');

  const byChannel = await query(
    `SELECT channel_id,
            COUNT(*) AS posts,
            SUM(IFNULL(reach,0)) AS reach_sum,
            AVG(NULLIF(reach, NULL)) AS reach_avg,
            SUM(reach IS NOT NULL) AS with_reach
     FROM marketing_channel_log
     WHERE status = 'ok'
       AND created_at >= ? AND created_at <= ?
     GROUP BY channel_id
     ORDER BY reach_sum DESC`,
    [fromSql, toSql]
  );

  const rows = (byChannel || []).map((r) => ({
    channel_id: r.channel_id,
    posts: Number(r.posts) || 0,
    reachSum: Number(r.reach_sum) || 0,
    reachAvg: r.reach_avg != null ? Math.round(Number(r.reach_avg)) : null,
    withReach: Number(r.with_reach) || 0,
    reachPerPost:
      Number(r.posts) > 0
        ? Math.round((Number(r.reach_sum) || 0) / Number(r.posts))
        : 0
  }));

  const totalReach = rows.reduce((s, r) => s + r.reachSum, 0);
  const totalPosts = rows.reduce((s, r) => s + r.posts, 0);

  return {
    totalReach,
    totalPosts,
    reachPerPost: totalPosts ? Math.round(totalReach / totalPosts) : 0,
    byChannel: rows,
    topChannels: [...rows].sort((a, b) => b.reachPerPost - a.reachPerPost).slice(0, 5)
  };
}

/**
 * Еженедельный разбор: что усиливать (каналы / слоты).
 */
export async function buildReachFeedback(from, to) {
  const reach = await reachReport(from, to);
  const tips = [];

  if (!reach.totalReach) {
    tips.push(
      'Охвата пока нет в данных: нажми «Обновить охват VK/YT» или введи reach вручную для Дзен/manual.'
    );
  } else {
    const top = reach.topChannels[0];
    if (top && top.reachPerPost > 0) {
      tips.push(
        `Лучший reach/пост: ${top.channel_id} (${top.reachPerPost}). Усиливай этот канал и похожие форматы.`
      );
    }
    const weak = [...reach.byChannel]
      .filter((c) => c.posts >= 2)
      .sort((a, b) => a.reachPerPost - b.reachPerPost)[0];
    if (weak && top && weak.channel_id !== top.channel_id) {
      tips.push(
        `Слабее остальных: ${weak.channel_id} (${weak.reachPerPost}/пост). Проверь хук, время и нативность текста.`
      );
    }
  }

  // слоты из meta опубликованных постов
  let slotTips = [];
  try {
    const fromSql = from.toISOString().slice(0, 19).replace('T', ' ');
    const toSql = to.toISOString().slice(0, 19).replace('T', ' ');
    const slots = await query(
      `SELECT
         JSON_UNQUOTE(JSON_EXTRACT(q.meta, '$.slot')) AS slot,
         COUNT(*) AS posts,
         SUM(IFNULL(l.reach,0)) AS reach_sum
       FROM marketing_queue q
       JOIN marketing_channel_log l ON l.queue_id = q.id AND l.status = 'ok'
       WHERE q.status = 'published'
         AND q.created_at >= ? AND q.created_at <= ?
         AND JSON_EXTRACT(q.meta, '$.slot') IS NOT NULL
       GROUP BY slot
       ORDER BY reach_sum DESC`,
      [fromSql, toSql]
    );
    slotTips = (slots || [])
      .filter((s) => s.slot)
      .map((s) => ({
        slot: String(s.slot),
        posts: Number(s.posts) || 0,
        reachSum: Number(s.reach_sum) || 0,
        reachPerPost:
          Number(s.posts) > 0
            ? Math.round((Number(s.reach_sum) || 0) / Number(s.posts))
            : 0
      }));
    if (slotTips[0]?.reachPerPost) {
      tips.push(
        `Лучшее время по охвату: ${slotTips[0].slot} (${slotTips[0].reachPerPost}/пост). Новые площадки подключай после стабильного охвата текущих.`
      );
    }
  } catch {
    /* meta/json may fail on old rows */
  }

  tips.push(
    'Сначала усиливай включённые площадки с лучшим reach; новые каналы — когда текущие стабильны 2+ недели.'
  );

  return {
    ...reach,
    bySlot: slotTips,
    tips,
    northStar: {
      label: 'Σ reach',
      value: reach.totalReach,
      reachPerPost: reach.reachPerPost
    }
  };
}

export async function getItemReach(queueId) {
  await ensureReachColumns();
  const item = await getQueueItem(queueId);
  if (!item) return null;
  const logs = await query(
    `SELECT id, channel_id, status, external_url, reach, reach_updated_at, detail
     FROM marketing_channel_log
     WHERE queue_id = ?
     ORDER BY id ASC`,
    [queueId]
  );
  return { item, logs: logs || [] };
}

export { ensureReachColumns };
