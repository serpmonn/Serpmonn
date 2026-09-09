/** Рекламные кампании: цели, ритм, пауза. */

import { query } from '../database/config.mjs';

let campaignsReady = false;

function parseJson(val, fallback) {
  if (val == null) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function mapCampaign(row) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    goal: row.goal || '',
    source: row.source,
    template_id: row.template_id || null,
    cta_url: row.cta_url || null,
    channels: parseJson(row.channels_json, ['vk']),
    slots: parseJson(row.slots_json, ['10:00']),
    mode: row.mode || 'digest',
    paused: Boolean(row.paused),
    posts_per_day: Number(row.posts_per_day) || 1,
    meta: parseJson(row.meta, null),
    last_generated_date: row.last_generated_date || null,
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export async function ensureCampaignTables() {
  if (campaignsReady) return;

  await query(`
    CREATE TABLE IF NOT EXISTS marketing_campaigns (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      slug VARCHAR(64) NOT NULL,
      name VARCHAR(256) NOT NULL,
      goal VARCHAR(512) NULL,
      source ENUM('promocodes','honey','template') NOT NULL DEFAULT 'template',
      template_id VARCHAR(64) NULL,
      cta_url VARCHAR(1024) NULL,
      channels_json JSON NOT NULL,
      slots_json JSON NOT NULL,
      mode ENUM('digest','full_auto') NOT NULL DEFAULT 'digest',
      paused TINYINT(1) NOT NULL DEFAULT 0,
      posts_per_day INT NOT NULL DEFAULT 1,
      meta JSON NULL,
      last_generated_date DATE NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
      UNIQUE KEY uq_mc_slug (slug),
      KEY idx_mc_paused (paused)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  try {
    await query('SET SESSION lock_wait_timeout = 5');
    const cols = await query(
      `SELECT COLUMN_TYPE AS ct FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'marketing_campaigns'
         AND COLUMN_NAME = 'source'`
    );
    const ct = String(cols?.[0]?.ct || '');
    if (ct && !ct.includes("'honey'")) {
      await query(
        `ALTER TABLE marketing_campaigns
         MODIFY COLUMN source ENUM('promocodes','honey','template') NOT NULL DEFAULT 'template'`
      );
    }
  } catch (err) {
    console.warn('[marketing] campaign source ENUM honey:', err.message || err);
  }

  campaignsReady = true;
}

/** Площадки по продукту: Мёд — только VK vrnhoney; остальные могут включать vrnhoney. */
export function normalizeCampaignChannels(source, channels) {
  const src = String(source || '');
  if (src === 'honey') return ['vk_vrnhoney'];
  const list = (Array.isArray(channels) ? channels : [])
    .map(String)
    .filter(Boolean);
  return list.length ? list : ['vk', 'vk_blog', 'vk_ads', 'vk_vrnhoney', 'telegram'];
}

function mapSource(source) {
  const s = String(source || '');
  if (s === 'promocodes' || s === 'honey') return s;
  return 'template';
}

export async function listCampaigns({ includePaused = true } = {}) {
  await ensureCampaignTables();
  let sql = `SELECT * FROM marketing_campaigns`;
  if (!includePaused) sql += ` WHERE paused = 0`;
  sql += ` ORDER BY id ASC`;
  const rows = await query(sql);
  return (rows || []).map(mapCampaign);
}

export async function getCampaign(idOrSlug) {
  await ensureCampaignTables();
  const key = String(idOrSlug || '').trim();
  if (!key) return null;
  const byId = /^\d+$/.test(key);
  const rows = await query(
    byId
      ? `SELECT * FROM marketing_campaigns WHERE id = ? LIMIT 1`
      : `SELECT * FROM marketing_campaigns WHERE slug = ? LIMIT 1`,
    [byId ? Number(key) : key]
  );
  return mapCampaign(rows?.[0]);
}

export async function createCampaign(data) {
  await ensureCampaignTables();
  const slug = String(data.slug || '').trim().slice(0, 64);
  if (!slug) throw Object.assign(new Error('slug обязателен'), { status: 400 });
  const channels = normalizeCampaignChannels(data.source, data.channels);
  const slots = Array.isArray(data.slots) && data.slots.length
    ? data.slots.map(String)
    : ['10:00'];
  const result = await query(
    `INSERT INTO marketing_campaigns
      (slug, name, goal, source, template_id, cta_url, channels_json, slots_json,
       mode, paused, posts_per_day, meta)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      slug,
      String(data.name || slug).slice(0, 256),
      data.goal != null ? String(data.goal).slice(0, 512) : null,
      mapSource(data.source),
      data.template_id != null ? String(data.template_id).slice(0, 64) : null,
      data.cta_url != null ? String(data.cta_url).slice(0, 1024) : null,
      JSON.stringify(channels),
      JSON.stringify(slots),
      data.mode === 'full_auto' ? 'full_auto' : 'digest',
      data.paused ? 1 : 0,
      Math.max(1, Math.min(12, Number(data.posts_per_day) || slots.length || 1)),
      data.meta != null ? JSON.stringify(data.meta) : null
    ]
  );
  return getCampaign(result.insertId);
}

export async function updateCampaign(id, patch) {
  await ensureCampaignTables();
  const existing = await getCampaign(id);
  if (!existing) return null;

  const fields = [];
  const vals = [];
  const set = (col, val) => {
    fields.push(`${col} = ?`);
    vals.push(val);
  };

  if (patch.name != null) set('name', String(patch.name).slice(0, 256));
  if (patch.goal != null) set('goal', String(patch.goal).slice(0, 512));
  if (patch.source != null) set('source', mapSource(patch.source));
  if (patch.template_id !== undefined) {
    set('template_id', patch.template_id != null ? String(patch.template_id).slice(0, 64) : null);
  }
  if (patch.cta_url !== undefined) {
    set('cta_url', patch.cta_url != null ? String(patch.cta_url).slice(0, 1024) : null);
  }
  if (Array.isArray(patch.channels) || patch.source != null) {
    const src = patch.source != null ? mapSource(patch.source) : existing.source;
    const ch = Array.isArray(patch.channels) ? patch.channels : existing.channels;
    set('channels_json', JSON.stringify(normalizeCampaignChannels(src, ch)));
  }
  if (Array.isArray(patch.slots)) set('slots_json', JSON.stringify(patch.slots.map(String)));
  if (patch.mode != null) set('mode', patch.mode === 'full_auto' ? 'full_auto' : 'digest');
  if (patch.paused !== undefined) set('paused', patch.paused ? 1 : 0);
  if (patch.posts_per_day != null) {
    set('posts_per_day', Math.max(1, Math.min(12, Number(patch.posts_per_day) || 1)));
  }
  if (patch.meta != null) set('meta', JSON.stringify(patch.meta));
  if (patch.last_generated_date !== undefined) {
    set('last_generated_date', patch.last_generated_date || null);
  }

  if (!fields.length) return existing;
  vals.push(existing.id);
  await query(`UPDATE marketing_campaigns SET ${fields.join(', ')} WHERE id = ?`, vals);
  return getCampaign(existing.id);
}

export async function setCampaignPaused(id, paused) {
  return updateCampaign(id, { paused: Boolean(paused) });
}

export async function deleteCampaign(idOrSlug) {
  await ensureCampaignTables();
  const existing = await getCampaign(idOrSlug);
  if (!existing) return null;
  await query(`DELETE FROM marketing_campaigns WHERE id = ?`, [existing.id]);
  return existing;
}

function slugify(name) {
  const map = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z',
    и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r',
    с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
    ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya'
  };
  return String(name || '')
    .toLowerCase()
    .split('')
    .map((ch) => map[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || `campaign-${Date.now()}`;
}

/** Сиды: Промокоды (Serpmonn) + Мёд (только VK vrnhoney). */
export async function seedDefaultCampaigns() {
  await ensureCampaignTables();

  const promo = {
    slug: 'promocodes-vk',
    name: 'Промокоды',
    goal: 'Бренд Serpmonn: привести в раздел промокодов (без рекламы чужих брендов/кодов)',
    source: 'promocodes',
    template_id: null,
    cta_url: 'https://serpmonn.ru/promo',
    channels: ['vk', 'vk_blog', 'vk_ads', 'vk_vrnhoney', 'telegram'],
    slots: ['10:00', '14:00', '19:00'],
    mode: 'digest',
    paused: 0,
    posts_per_day: 3
  };

  const existing = await getCampaign(promo.slug);
  let main;
  if (existing) {
    // Не перетираем posts_per_day / slots / channels — их задают в админке
    main = await updateCampaign(existing.id, {
      name: promo.name,
      goal: promo.goal,
      paused: false,
      source: 'promocodes',
      cta_url: promo.cta_url
    });
  } else {
    main = await createCampaign(promo);
  }

  const honey = {
    slug: 'honey-vk',
    name: 'Мёд',
    goal: 'Бренд VRNHoney: продвижение интернет-магазина vrnhoney.ru (только VK-сообщество vrnhoney_ru)',
    source: 'honey',
    template_id: null,
    cta_url: 'https://vrnhoney.ru',
    channels: ['vk_vrnhoney'],
    slots: ['11:00', '18:00'],
    mode: 'digest',
    paused: 0,
    posts_per_day: 1
  };

  const honeyExisting = await getCampaign(honey.slug);
  let honeyCamp;
  if (honeyExisting) {
    // channels для мёда всё равно нормализуются в vk_vrnhoney
    honeyCamp = await updateCampaign(honeyExisting.id, {
      name: honey.name,
      goal: honey.goal,
      paused: false,
      source: 'honey',
      cta_url: honey.cta_url
    });
  } else {
    honeyCamp = await createCampaign(honey);
  }

  // Старый сид Neli больше не генерируем — ставим на паузу, если остался
  const neli = await getCampaign('neli-vk');
  if (neli && !neli.paused) {
    await updateCampaign(neli.id, { paused: true, name: 'Neli' });
  }

  return [main, honeyCamp].filter(Boolean);
}

export { slugify };
