import {
  getSearchInsights,
  purgeOldSearchQueryLogs,
} from '../ai-search/search-query-log.mjs';

function parseFilters(req) {
  const period = ['24h', '7d', '30d'].includes(req.query?.period)
    ? req.query.period
    : '7d';
  const mode = ['ai', 'web'].includes(req.query?.mode) ? req.query.mode : null;
  const status = ['ok', 'empty', 'error', 'limit'].includes(req.query?.status)
    ? req.query.status
    : null;
  const category = req.query?.category ? String(req.query.category).slice(0, 32) : null;
  const identityType = ['user', 'guest', 'vk'].includes(req.query?.identity)
    ? req.query.identity
    : null;
  const client = ['web', 'android', 'vk'].includes(req.query?.client)
    ? req.query.client
    : null;
  const device = ['mobile', 'desktop'].includes(req.query?.device)
    ? req.query.device
    : null;
  return { period, mode, status, category, identityType, client, device };
}

export async function getSearchInsightsHandler(req, res) {
  try {
    const filters = parseFilters(req);
    // occasional cleanup, ignore errors
    if (Math.random() < 0.05) {
      purgeOldSearchQueryLogs().catch(() => {});
    }
    const data = await getSearchInsights(filters);
    return res.json(data);
  } catch (err) {
    console.error('[admin search-insights]', err);
    return res.status(500).json({ error: 'Не удалось загрузить статистику запросов' });
  }
}

export async function exportSearchInsightsCsv(req, res) {
  try {
    const filters = parseFilters(req);
    const data = await getSearchInsights(filters);

    const lines = [];
    lines.push('section,query,mode,status,hits,ai,web,empty_pct');
    for (const row of data.top) {
      lines.push(
        [
          'top',
          csvEscape(row.query),
          '',
          '',
          row.hits,
          row.ai,
          row.web,
          row.emptyPct,
        ].join(',')
      );
    }
    for (const row of data.failures) {
      lines.push(
        [
          'failure',
          csvEscape(row.query),
          row.mode,
          row.status,
          row.hits,
          '',
          '',
          '',
        ].join(',')
      );
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="search-insights-${filters.period}.csv"`
    );
    return res.send('\uFEFF' + lines.join('\n'));
  } catch (err) {
    console.error('[admin search-insights csv]', err);
    return res.status(500).json({ error: 'Не удалось выгрузить CSV' });
  }
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
