import {
  getSearchInsights,
  purgeOldSearchQueryLogs,
} from '../ai-search/search-query-log.mjs';
import { query } from '../database/config.mjs';
import { resolveSearchLogImagePath } from '../ai-search/reverse-image.mjs';
import { access, stat } from 'fs/promises';
import { constants as fsConstants } from 'fs';
import { extname } from 'path';

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

export async function streamSearchLogImage(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ error: 'Некорректный id' });
    }

    const rows = await query(
      `SELECT image_path FROM search_query_log WHERE id = ? LIMIT 1`,
      [id]
    );
    const imagePath = rows?.[0]?.image_path;
    if (!imagePath) {
      return res.status(404).json({ error: 'Нет изображения' });
    }

    const abs = resolveSearchLogImagePath(imagePath);
    if (!abs) {
      return res.status(400).json({ error: 'Некорректный путь' });
    }

    await access(abs, fsConstants.R_OK);
    const st = await stat(abs);
    const ext = extname(abs).toLowerCase();
    const types = {
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
    };

    res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
    res.setHeader('Content-Length', st.size);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    return res.sendFile(abs);
  } catch (err) {
    console.error('[admin search-log-image]', err?.message || err);
    if (!res.headersSent) {
      return res.status(404).json({ error: 'Файл не найден' });
    }
  }
}
