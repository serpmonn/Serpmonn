/**
 * Реестр бесплатных площадок: auto/manual, enabled.
 * Каталог = код; состояние вкл/выкл — в БД marketing_platforms.
 */

import { query } from '../database/config.mjs';
import { CHANNELS, getChannel } from './channels/index.mjs';

/** Статический каталог. sort — порядок в списке (меньше = выше). */
export const PLATFORM_CATALOG = [
  {
    id: 'vk',
    label: 'VK Serpmonn | Официальное сообщество',
    sort: 10,
    defaultMode: 'auto',
    defaultEnabled: true,
    formats: ['text', 'video'],
    notes: 'https://vk.ru/serpmonn_site'
  },
  {
    id: 'vk_blog',
    label: 'VK Serpmonn | Блог',
    sort: 11,
    defaultMode: 'auto',
    defaultEnabled: true,
    formats: ['text', 'video'],
    notes: 'https://vk.ru/serpmonn_blog'
  },
  {
    id: 'vk_ads',
    label: 'VK Serpmonn | Реклама',
    sort: 12,
    defaultMode: 'auto',
    defaultEnabled: true,
    formats: ['text', 'video'],
    notes: 'https://vk.ru/serpmonn_ads'
  },
  {
    id: 'vk_vrnhoney',
    label: 'VK VRNHoney',
    sort: 13,
    defaultMode: 'auto',
    defaultEnabled: true,
    formats: ['text', 'video'],
    notes: 'https://vk.ru/vrnhoney_ru'
  },
  {
    id: 'telegram',
    label: 'Telegram Serpmonn',
    sort: 20,
    defaultMode: 'auto',
    defaultEnabled: true,
    formats: ['text'],
    notes: 'https://t.me/serpmonn_life'
  },
  {
    id: 'dzen',
    label: 'Дзен',
    sort: 30,
    defaultMode: 'manual',
    defaultEnabled: false,
    formats: ['text'],
    notes: 'Временно выключен (нет API; позже через TG-синхробот или вручную)'
  },
  {
    id: 'youtube',
    label: 'YouTube Shorts',
    sort: 40,
    defaultMode: 'auto',
    defaultEnabled: false,
    formats: ['video'],
    notes: 'https://www.youtube.com/channel/UCVDkeUaVT3OmTcmwvdXO55Q'
  },
  {
    id: 'ok',
    label: 'OK.ru',
    sort: 50,
    defaultMode: 'manual',
    defaultEnabled: false,
    formats: ['text'],
    notes: 'Пока вручную'
  },
  {
    id: 'rutube',
    label: 'Rutube',
    sort: 60,
    defaultMode: 'manual',
    defaultEnabled: false,
    formats: ['video'],
    notes: 'Пока вручную'
  },
  {
    id: 'manual',
    label: 'Прочие (Pinterest, X, VC.ru…)',
    sort: 90,
    defaultMode: 'manual',
    defaultEnabled: false,
    formats: ['text', 'video'],
    notes: 'Чеклист для площадок без API'
  }
];

const byId = new Map(PLATFORM_CATALOG.map((p) => [p.id, p]));

let platformsReady = false;

export async function ensurePlatformTables() {
  if (platformsReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS marketing_platforms (
      id VARCHAR(64) NOT NULL PRIMARY KEY,
      enabled TINYINT(1) NOT NULL DEFAULT 0,
      mode ENUM('auto','manual') NOT NULL DEFAULT 'manual',
      tier TINYINT NOT NULL DEFAULT 3,
      meta JSON NULL,
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);
  await seedPlatformRows();
  platformsReady = true;
}

async function seedPlatformRows() {
  for (const p of PLATFORM_CATALOG) {
    // tier column reused as sort order (legacy name in DB)
    const sort = Number(p.sort) || 99;
    await query(
      `INSERT INTO marketing_platforms (id, enabled, mode, tier)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE tier = VALUES(tier)`,
      [p.id, p.defaultEnabled ? 1 : 0, p.defaultMode, sort]
    );
  }
}

function mapPlatformRow(row, health = null) {
  const cat = byId.get(row.id) || {
    id: row.id,
    label: row.id,
    formats: [],
    notes: '',
    sort: 99
  };
  const ch = getChannel(row.id);
  const configured = ch ? Boolean(ch.isConfigured?.()) : row.mode === 'manual';
  return {
    id: row.id,
    label: cat.label,
    sort: Number(row.tier) || cat.sort || 99,
    mode: row.mode === 'auto' ? 'auto' : 'manual',
    enabled: Boolean(row.enabled),
    formats: cat.formats || ch?.formats || [],
    notes: cat.notes || '',
    configured,
    ok: health?.ok ?? null,
    detail: health?.detail || null,
    hasAdapter: Boolean(ch)
  };
}

/** Список площадок с health из channel adapters. */
export async function listPlatforms({ includeDisabled = true } = {}) {
  await ensurePlatformTables();
  const rows = await query(
    `SELECT id, enabled, mode, tier, meta, updated_at
     FROM marketing_platforms
     ORDER BY tier ASC, id ASC`
  );

  const healthById = new Map();
  for (const c of CHANNELS) {
    try {
      const h = await c.healthCheck();
      healthById.set(c.id, h);
    } catch (err) {
      healthById.set(c.id, { ok: false, detail: err.message || String(err) });
    }
  }

  let list = (rows || []).map((r) => mapPlatformRow(r, healthById.get(r.id)));
  if (!includeDisabled) list = list.filter((p) => p.enabled);
  return list;
}

export async function getEnabledPlatformIds({ autoOnly = false } = {}) {
  const all = await listPlatforms({ includeDisabled: false });
  return all
    .filter((p) => p.enabled)
    .filter((p) => (autoOnly ? p.mode === 'auto' : true))
    .filter((p) => p.hasAdapter)
    .map((p) => p.id);
}

export async function updatePlatform(id, patch = {}) {
  await ensurePlatformTables();
  const pid = String(id || '').slice(0, 64);
  if (!byId.has(pid) && !getChannel(pid)) {
    const err = new Error('Неизвестная площадка');
    err.status = 404;
    throw err;
  }
  const sets = [];
  const vals = [];
  if (patch.enabled != null) {
    sets.push('enabled = ?');
    vals.push(patch.enabled ? 1 : 0);
  }
  if (patch.mode != null) {
    sets.push('mode = ?');
    vals.push(patch.mode === 'auto' ? 'auto' : 'manual');
  }
  if (!sets.length) {
    const rows = await query(`SELECT * FROM marketing_platforms WHERE id = ?`, [pid]);
    return rows?.[0] ? mapPlatformRow(rows[0]) : null;
  }
  vals.push(pid);
  await query(
    `UPDATE marketing_platforms SET ${sets.join(', ')} WHERE id = ?`,
    vals
  );
  const rows = await query(`SELECT * FROM marketing_platforms WHERE id = ?`, [pid]);
  return rows?.[0] ? mapPlatformRow(rows[0]) : null;
}

/** Каналы для кампании: пересечение campaign.channels и enabled platforms. */
export async function resolvePublishChannels(campaignChannels) {
  const enabled = new Set(await getEnabledPlatformIds());
  const fromCampaign = Array.isArray(campaignChannels) && campaignChannels.length
    ? campaignChannels.map(String)
    : ['vk'];
  const resolved = fromCampaign.filter((id) => enabled.has(id));
  if (resolved.length) return resolved;
  return [...enabled];
}
