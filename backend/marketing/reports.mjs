/**
 * MVP маркетинг-отчёты: публикации (БД), UTM-хиты (nginx), бизнес (topups/партнёры).
 * Без Метрики API и YouTube Analytics.
 */

import { createReadStream, existsSync, readdirSync, statSync } from 'fs';
import { createInterface } from 'readline';
import { createGunzip } from 'zlib';
import { join } from 'path';
import { query } from '../database/config.mjs';
import { ensureMarketingTables } from './queue.mjs';
import { buildReachFeedback, ensureReachColumns } from './reach.mjs';

const MONTHS = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11
};

const NGINX_LOG_DIR = '/var/log/nginx';
const FILTERED_LOG = '/var/www/serpmonn.ru/analytics/access.filtered.log';
const MAX_UTM_ROWS = 40;
const MAX_RECENT_PUBS = 20;

function clampDays(raw) {
  const n = Number(raw);
  if (![7, 30, 90].includes(n)) return 30;
  return n;
}

function periodBounds(days) {
  const to = new Date();
  const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
  return { from, to, days };
}

function parseNginxDate(str) {
  // 23/Aug/2026:07:10:40 +0300
  const m = String(str || '').match(
    /^(\d{2})\/([A-Za-z]{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})\s*([+-]\d{4})?/
  );
  if (!m) return null;
  const mon = MONTHS[m[2]];
  if (mon == null) return null;
  const d = new Date(
    Number(m[3]),
    mon,
    Number(m[1]),
    Number(m[4]),
    Number(m[5]),
    Number(m[6])
  );
  return Number.isNaN(d.getTime()) ? null : d;
}

function extractUtmFromRequestPath(pathWithQuery) {
  const qIdx = String(pathWithQuery || '').indexOf('?');
  if (qIdx < 0) return null;
  const qs = pathWithQuery.slice(qIdx + 1);
  if (!/utm_(source|medium|campaign)=/i.test(qs)) return null;
  let params;
  try {
    params = new URLSearchParams(qs);
  } catch {
    return null;
  }
  const source = (params.get('utm_source') || '').trim().slice(0, 128);
  const medium = (params.get('utm_medium') || '').trim().slice(0, 128);
  const campaign = (params.get('utm_campaign') || '').trim().slice(0, 128);
  if (!source && !medium && !campaign) return null;
  return {
    source: source || '(none)',
    medium: medium || '(none)',
    campaign: campaign || '(none)'
  };
}

function listNginxLogFiles(from) {
  const fromMs = from.getTime() - 2 * 24 * 60 * 60 * 1000;
  const nginx = [];
  try {
    const names = readdirSync(NGINX_LOG_DIR);
    for (const name of names) {
      if (!/^access\.log(\.\d+)?(\.gz)?$/.test(name)) continue;
      nginx.push(join(NGINX_LOG_DIR, name));
    }
  } catch {
    /* нет прав / каталога */
  }

  const scored = nginx
    .map((p) => {
      try {
        return { path: p, mtime: statSync(p).mtimeMs };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .filter((x) => {
      // текущий и вчерашний лог всегда; ротированные — по mtime в окне периода
      const base = x.path.endsWith('access.log') || x.path.endsWith('access.log.1');
      return base || x.mtime >= fromMs;
    })
    .sort((a, b) => b.mtime - a.mtime)
    .map((x) => x.path);

  if (scored.length) return scored;
  // fallback: отфильтрованный лог GoAccess (обычно только текущие сутки)
  if (existsSync(FILTERED_LOG)) return [FILTERED_LOG];
  return [];
}

function openLogStream(filePath) {
  const raw = createReadStream(filePath, { encoding: undefined });
  if (filePath.endsWith('.gz')) {
    return raw.pipe(createGunzip());
  }
  return raw;
}

async function scanUtmFromLogs(from, to) {
  const byCampaign = new Map();
  const bySource = new Map();
  const filesTried = [];
  const filesOk = [];
  let hits = 0;
  let linesScanned = 0;
  let errors = [];

  const lineRe =
    /^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+)\s+([^"]*?)\s+HTTP\/[^"]*"\s+(\d+)/;

  const bump = (map, key, path) => {
    if (!map.has(key)) map.set(key, { key, hits: 0, paths: new Map() });
    const row = map.get(key);
    row.hits += 1;
    row.paths.set(path, (row.paths.get(path) || 0) + 1);
  };

  for (const file of listNginxLogFiles(from)) {
    filesTried.push(file);
    try {
      const stream = openLogStream(file);
      const rl = createInterface({ input: stream, crlfDelay: Infinity });
      for await (const line of rl) {
        linesScanned += 1;
        if (!line.includes('utm_')) continue;
        const m = line.match(lineRe);
        if (!m) continue;
        const method = m[3];
        if (method !== 'GET' && method !== 'HEAD') continue;
        const when = parseNginxDate(m[2]);
        if (!when || when < from || when > to) continue;
        const reqPath = m[4];
        const utm = extractUtmFromRequestPath(reqPath);
        if (!utm) continue;
        const status = Number(m[5]);
        if (status >= 400) continue;

        const pathOnly = reqPath.split('?')[0] || '/';
        hits += 1;
        bump(byCampaign, `${utm.source} / ${utm.medium} / ${utm.campaign}`, pathOnly);
        bump(bySource, utm.source, pathOnly);
      }
      filesOk.push(file);
    } catch (err) {
      errors.push(`${file}: ${err.message || String(err)}`);
    }
  }

  const toRows = (map) =>
    [...map.values()]
      .sort((a, b) => b.hits - a.hits)
      .slice(0, MAX_UTM_ROWS)
      .map((r) => ({
        key: r.key,
        hits: r.hits,
        topPath: [...r.paths.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null
      }));

  return {
    available: filesOk.length > 0,
    totalHits: hits,
    byCampaign: toRows(byCampaign),
    bySource: toRows(bySource),
    meta: {
      linesScanned,
      filesTried: filesTried.length,
      filesOk: filesOk.length,
      note:
        hits === 0
          ? 'В request URL за период нет utm_* (считаем только свои ссылки с UTM, не Referer).'
          : null,
      errors: errors.slice(0, 5)
    }
  };
}

async function publicationsReport(from, to) {
  await ensureMarketingTables();
  const fromSql = from.toISOString().slice(0, 19).replace('T', ' ');
  const toSql = to.toISOString().slice(0, 19).replace('T', ' ');

  const byStatus = await query(
    `SELECT status, COUNT(*) AS cnt
     FROM marketing_queue
     WHERE created_at >= ? AND created_at <= ?
     GROUP BY status`,
    [fromSql, toSql]
  );

  const byProduct = await query(
    `SELECT IFNULL(NULLIF(product,''),'(none)') AS product, COUNT(*) AS cnt
     FROM marketing_queue
     WHERE created_at >= ? AND created_at <= ?
     GROUP BY product
     ORDER BY cnt DESC
     LIMIT 20`,
    [fromSql, toSql]
  );

  const byChannel = await query(
    `SELECT channel_id, status, COUNT(*) AS cnt
     FROM marketing_channel_log
     WHERE created_at >= ? AND created_at <= ?
     GROUP BY channel_id, status
     ORDER BY channel_id, status`,
    [fromSql, toSql]
  );

  const totalsRow = await query(
    `SELECT
       COUNT(*) AS created,
       SUM(status = 'published') AS published,
       SUM(status = 'scheduled') AS scheduled,
       SUM(status = 'failed') AS failed,
       SUM(status = 'rejected') AS rejected,
       SUM(status = 'pending_review') AS pending_review
     FROM marketing_queue
     WHERE created_at >= ? AND created_at <= ?`,
    [fromSql, toSql]
  );

  const recent = await query(
    `SELECT id, product, format, title, status, cta_url, created_at, updated_at
     FROM marketing_queue
     WHERE created_at >= ? AND created_at <= ?
     ORDER BY updated_at DESC
     LIMIT ${MAX_RECENT_PUBS}`,
    [fromSql, toSql]
  );

  const recentIds = (recent || []).map((r) => r.id);
  let logsByQ = new Map();
  if (recentIds.length) {
    const ph = recentIds.map(() => '?').join(',');
    const logs = await query(
      `SELECT queue_id, channel_id, status, external_url
       FROM marketing_channel_log
       WHERE queue_id IN (${ph})
       ORDER BY id ASC`,
      recentIds
    );
    for (const log of logs || []) {
      if (!logsByQ.has(log.queue_id)) logsByQ.set(log.queue_id, []);
      logsByQ.get(log.queue_id).push({
        channel_id: log.channel_id,
        status: log.status,
        external_url: log.external_url || null
      });
    }
  }

  const t = totalsRow?.[0] || {};
  return {
    totals: {
      created: Number(t.created) || 0,
      published: Number(t.published) || 0,
      scheduled: Number(t.scheduled) || 0,
      failed: Number(t.failed) || 0,
      rejected: Number(t.rejected) || 0,
      pending_review: Number(t.pending_review) || 0
    },
    byStatus: (byStatus || []).map((r) => ({
      status: r.status,
      count: Number(r.cnt) || 0
    })),
    byProduct: (byProduct || []).map((r) => ({
      product: r.product,
      count: Number(r.cnt) || 0
    })),
    byChannel: (byChannel || []).map((r) => ({
      channel_id: r.channel_id,
      status: r.status,
      count: Number(r.cnt) || 0
    })),
    recent: (recent || []).map((r) => ({
      id: r.id,
      product: r.product,
      format: r.format,
      title: r.title,
      status: r.status,
      cta_url: r.cta_url,
      created_at: r.created_at,
      updated_at: r.updated_at,
      channel_results: logsByQ.get(r.id) || []
    }))
  };
}

async function businessReport(from, to) {
  const fromSql = from.toISOString().slice(0, 19).replace('T', ' ');
  const toSql = to.toISOString().slice(0, 19).replace('T', ' ');
  const out = {
    topupsPaid: { count: 0, amount: 0 },
    topupsPending: { count: 0, amount: 0 },
    newPartners: 0,
    newPartnersByRole: [],
    errors: []
  };

  try {
    const paid = await query(
      `SELECT COUNT(*) AS cnt, IFNULL(SUM(amount),0) AS amount
       FROM partner_topups
       WHERE status = 'paid'
         AND COALESCE(paid_at, created_at) >= ?
         AND COALESCE(paid_at, created_at) <= ?`,
      [fromSql, toSql]
    );
    out.topupsPaid = {
      count: Number(paid?.[0]?.cnt) || 0,
      amount: Number(paid?.[0]?.amount) || 0
    };
  } catch (err) {
    out.errors.push(`topupsPaid: ${err.message}`);
  }

  try {
    const pending = await query(
      `SELECT COUNT(*) AS cnt, IFNULL(SUM(amount),0) AS amount
       FROM partner_topups
       WHERE status = 'pending'
         AND created_at >= ? AND created_at <= ?`,
      [fromSql, toSql]
    );
    out.topupsPending = {
      count: Number(pending?.[0]?.cnt) || 0,
      amount: Number(pending?.[0]?.amount) || 0
    };
  } catch (err) {
    out.errors.push(`topupsPending: ${err.message}`);
  }

  try {
    const partners = await query(
      `SELECT role, COUNT(*) AS cnt
       FROM partner_users
       WHERE created_at >= ? AND created_at <= ?
       GROUP BY role`,
      [fromSql, toSql]
    );
    out.newPartnersByRole = (partners || []).map((r) => ({
      role: r.role,
      count: Number(r.cnt) || 0
    }));
    out.newPartners = out.newPartnersByRole.reduce((s, r) => s + r.count, 0);
  } catch (err) {
    out.errors.push(`newPartners: ${err.message}`);
  }

  return out;
}

/**
 * @param {{ days?: number }} opts
 */
export async function buildMarketingReport({ days } = {}) {
  const d = clampDays(days);
  const { from, to } = periodBounds(d);

  await ensureReachColumns();

  const [publications, utm, business, reach] = await Promise.all([
    publicationsReport(from, to),
    scanUtmFromLogs(from, to),
    businessReport(from, to),
    buildReachFeedback(from, to)
  ]);

  return {
    period: {
      days: d,
      from: from.toISOString(),
      to: to.toISOString()
    },
    publications,
    utm,
    business,
    reach,
    stubs: {
      metrika: 'Яндекс.Метрика API — позже (цели partner_topup / payment_success).',
      youtube: 'YouTube Analytics — позже (просмотры Shorts).'
    }
  };
}
