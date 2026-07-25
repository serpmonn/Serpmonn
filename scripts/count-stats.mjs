// count-stats.mjs
// Считает страницы, инструменты, игры и партнёров (прямые vs через сети)
// для страницы «О проекте».

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

dotenv.config({ path: path.join(ROOT, 'backend/.env') });

const FRONTEND_PATH = path.join(ROOT, 'frontend');
const DIST_PATH = path.join(ROOT, 'assembly/dist/frontend');
const GAMES_DATA_FILE = path.join(ROOT, 'assembly/site/_data/localesGames.json');
const AD_INFO_FILE = path.join(ROOT, 'assembly/site/_data/adInfo.json');
const PROMO_CACHE_FILE = path.join(ROOT, 'assembly/site/_data/promocodesBuild.cache.json');
const STATS_DIRS = [
  path.join(ROOT, 'frontend/about-project'),
  path.join(ROOT, 'assembly/site/src/about-project'),
];
const PAGE_COUNT_FILE = 'page-count.json';
const TOOLS_COUNT_FILE = 'tools-count.json';
const GAMES_COUNT_FILE = 'games-count.json';
const PARTNERS_COUNT_FILE = 'partners-count.json';

/** Прямые партнёры (свои URL, без CPA-сетей) */
const DIRECT_PARTNER_DOMAINS = [
  'adventure36.ru',
  'vrnhoney.ru',
  'onehouseboat.ru',
];

const PERFLUENCE_URL = 'https://dash.perfluence.net/blogger/promocode-api/json';
const PERFLUENCE_KEY = process.env.PERFLUENCE_API_KEY;
if (!PERFLUENCE_KEY) {
  console.warn('[count-stats] PERFLUENCE_API_KEY is not set — will try promo cache fallback');
}

function writeStatsFile(filename, data) {
  const payload = JSON.stringify(data, null, 2);
  for (const dir of STATS_DIRS) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, filename), payload);
  }
}

function getContentRoot() {
  return fs.existsSync(DIST_PATH) ? DIST_PATH : FRONTEND_PATH;
}

function makeStatResult(count) {
  return {
    count,
    updated: new Date().toISOString(),
    updatedReadable: new Date().toLocaleString('ru-RU'),
  };
}

function normalizeHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function extractInn(text) {
  if (!text) return null;
  const m = String(text).match(/ИНН[:\s]*([0-9]{10,12})/i);
  return m ? m[1] : null;
}

function partnerKeyFromInnOrName(inn, name) {
  if (inn) return `inn:${inn}`;
  const n = String(name || '').trim().toLowerCase();
  if (n) return `name:${n}`;
  return null;
}

// ─── 1. Счётчик HTML-страниц ──────────────────────────────────────────────────
let pageCount = 0;

function countHtml(dir) {
  try {
    for (const item of fs.readdirSync(dir)) {
      if (item.startsWith('.')) continue;
      const full = path.join(dir, item);
      try {
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          if (item !== 'node_modules' && item !== '.git') countHtml(full);
        } else if (item.endsWith('.html') || item.endsWith('.htm')) {
          pageCount++;
        }
      } catch { /* пропускаем недоступные */ }
    }
  } catch (err) {
    console.log(`Не могу прочитать папку ${dir}: ${err.message}`);
  }
}

// ─── 2. Активные инструменты ──────────────────────────────────────────────────
function countActiveTools(root) {
  const toolsDir = path.join(root, 'tools');
  if (!fs.existsSync(toolsDir)) return 0;

  let count = 0;
  function walk(dir) {
    for (const item of fs.readdirSync(dir)) {
      const full = path.join(dir, item);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else if (item.endsWith('.html') && item !== 'tools.html') {
        count++;
      }
    }
  }
  walk(toolsDir);
  return count;
}

// ─── 3. Игры ──────────────────────────────────────────────────────────────────
function countGames() {
  try {
    const data = JSON.parse(fs.readFileSync(GAMES_DATA_FILE, 'utf8'));
    const games = data.ru?.games || {};
    const categories = games.categories || [];
    if (categories.length) {
      return categories.reduce((sum, cat) => sum + (cat.games?.length || 0), 0);
    }
    // Актуальная схема: groups → platforms → games
    let total = 0;
    for (const group of games.groups || []) {
      for (const platform of group.platforms || []) {
        total += (platform.games || []).length;
      }
    }
    if (total > 0) return total;
    if (typeof games.totalGames === 'number') return games.totalGames;
    return 0;
  } catch (err) {
    console.error(`⚠️  Не удалось прочитать localesGames.json: ${err.message}`);
    return 0;
  }
}

// ─── 4. Партнёры: прямые + через сети ─────────────────────────────────────────
function countDirectPartners() {
  return DIRECT_PARTNER_DOMAINS.length;
}

function addPartnerKeysFromPerfItems(items, keys) {
  for (const item of items) {
    const advertiserInfo = item?.advertiser_info || '';
    const inn = extractInn(advertiserInfo);
    const name =
      item?.project?.name ||
      item?.title ||
      advertiserInfo ||
      '';
    const key = partnerKeyFromInnOrName(inn, name);
    if (key) keys.add(key);
  }
}

async function fetchPerfluenceItems() {
  if (!PERFLUENCE_KEY) return null;
  const res = await fetch(`${PERFLUENCE_URL}?key=${PERFLUENCE_KEY}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const raw = await res.json();
  return Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
}

function loadPromoCacheItems() {
  if (!fs.existsSync(PROMO_CACHE_FILE)) {
    console.warn('[count-stats] promo cache not found:', PROMO_CACHE_FILE);
    return [];
  }
  const raw = JSON.parse(fs.readFileSync(PROMO_CACHE_FILE, 'utf8'));
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.cards)) return raw.cards;
  return [];
}

async function collectPerfluenceKeys() {
  const keys = new Set();
  if (!PERFLUENCE_KEY) {
    console.warn('⚠️  Perfluence API key отсутствует — fallback на кэш');
  } else {
    try {
      const items = await fetchPerfluenceItems();
      if (items && items.length) {
        addPartnerKeysFromPerfItems(items, keys);
        console.log(`✅ Perfluence API: ${items.length} записей, уникальных ключей: ${keys.size}`);
        return keys;
      }
      console.warn('⚠️  Perfluence API пуст — fallback на кэш');
    } catch (err) {
      console.warn(`⚠️  Perfluence API недоступен (${err.message}) — fallback на кэш`);
    }
  }

  const cached = loadPromoCacheItems();
  addPartnerKeysFromPerfItems(cached, keys);
  console.log(`✅ Perfluence cache: ${cached.length} записей, уникальных ключей: ${keys.size}`);
  return keys;
}

function collectAdInfoKeys() {
  const keys = new Set();
  try {
    const ad = JSON.parse(fs.readFileSync(AD_INFO_FILE, 'utf8'));
    const list = ad?.ru?.adInfo?.partnersList || {};
    for (const [id, partner] of Object.entries(list)) {
      const url = partner?.url || '';
      const host = normalizeHost(url);
      if (!host) continue;
      if (host === 'admitad.com' || host.endsWith('.admitad.com')) continue;
      if (DIRECT_PARTNER_DOMAINS.includes(host)) continue;

      const label = partner?.adLabel || '';
      const inn = extractInn(label);
      const name = partner?.name || id;
      const key = partnerKeyFromInnOrName(inn, name);
      if (key) keys.add(key);
    }
  } catch (err) {
    console.error(`⚠️  Не удалось прочитать adInfo.json: ${err.message}`);
  }
  console.log(`✅ adInfo.ru: уникальных ключей (без Admitad/прямых): ${keys.size}`);
  return keys;
}

async function countNetworkPartners() {
  const keys = new Set([
    ...(await collectPerfluenceKeys()),
    ...collectAdInfoKeys(),
  ]);
  return keys.size;
}

// ─── main ─────────────────────────────────────────────────────────────────────
(async () => {
  try {
    const contentRoot = getContentRoot();
    console.log(`🔍 Источник контента: ${contentRoot}`);
    console.log(`📁 Корень проекта: ${ROOT}`);

    if (!fs.existsSync(contentRoot)) {
      console.error(`❌ Папка "${contentRoot}" не найдена`);
      process.exit(1);
    }
    countHtml(contentRoot);

    writeStatsFile(PAGE_COUNT_FILE, makeStatResult(pageCount));
    console.log(`✅ HTML/HTM страниц: ${pageCount}`);

    const toolsCount = countActiveTools(contentRoot);
    const gamesCount = countGames();
    writeStatsFile(TOOLS_COUNT_FILE, makeStatResult(toolsCount));
    writeStatsFile(GAMES_COUNT_FILE, makeStatResult(gamesCount));
    console.log(`✅ Активных инструментов: ${toolsCount}`);
    console.log(`✅ Игр в каталоге: ${gamesCount}`);

    const directPartners = countDirectPartners();
    const networkPartners = await countNetworkPartners();
    const total = directPartners + networkPartners;

    const partnersResult = {
      directPartners,
      networkPartners,
      total,
      directDomains: DIRECT_PARTNER_DOMAINS,
      updated: new Date().toISOString(),
      updatedReadable: new Date().toLocaleString('ru-RU'),
    };
    writeStatsFile(PARTNERS_COUNT_FILE, partnersResult);
    console.log(
      `✅ Партнёры: прямых ${directPartners}, через сети ${networkPartners}, всего ${total}`
    );

    process.exit(0);
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
    process.exit(1);
  }
})();
