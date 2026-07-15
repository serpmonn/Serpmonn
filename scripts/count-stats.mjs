// count-stats.mjs
// Считает страницы, инструменты, игры, игровых партнёров (из outRoutes.mjs) и
// промо-партнёров (из Perfluence API), пишет JSON для страницы «О проекте»

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

// Пути
const FRONTEND_PATH       = '/var/www/serpmonn.ru/frontend';
const DIST_PATH           = path.join(__dirname, '../assembly/dist/frontend');
const OUT_ROUTES_FILE     = path.join(__dirname, '../backend/games/outRoutes.mjs');
const GAMES_DATA_FILE     = path.join(__dirname, '../assembly/site/_data/localesGames.json');
const STATS_DIRS          = [
  '/var/www/serpmonn.ru/frontend/about-project',
  path.join(__dirname, '../assembly/site/src/about-project'),
];
const PAGE_COUNT_FILE     = 'page-count.json';
const TOOLS_COUNT_FILE    = 'tools-count.json';
const GAMES_COUNT_FILE    = 'games-count.json';
const PARTNERS_COUNT_FILE = 'partners-count.json';

const PERFLUENCE_URL = 'https://dash.perfluence.net/blogger/promocode-api/json';
const PERFLUENCE_KEY = process.env.PERFLUENCE_API_KEY;
if (!PERFLUENCE_KEY) {
  console.warn('[count-stats] PERFLUENCE_API_KEY is not set — promocode fetch skipped');
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

// ─── 2. Активные инструменты — HTML-страницы в /tools (кроме tools.html) ─────
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

// ─── 3. Игры — сумма по категориям из localesGames.json ──────────────────────
function countGames() {
  try {
    const data = JSON.parse(fs.readFileSync(GAMES_DATA_FILE, 'utf8'));
    const categories = data.ru?.games?.categories || [];
    return categories.reduce((sum, cat) => sum + (cat.games?.length || 0), 0);
  } catch (err) {
    console.error(`⚠️  Не удалось прочитать localesGames.json: ${err.message}`);
    return 0;
  }
}

// ─── 4. Игровые партнёры — динамически из outRoutes.mjs ──────────────────────
function countGamePartners() {
  try {
    const src = fs.readFileSync(OUT_ROUTES_FILE, 'utf8');
    const match = src.match(/const GAME_LINKS\s*=\s*\{([\s\S]*?)\};/);
    if (!match) {
      console.warn('⚠️  GAME_LINKS не найден в outRoutes.mjs, возвращаю 0');
      return 0;
    }
    const keys = match[1].match(/^\s*'[\w-]+'/gm);
    return keys ? keys.length : 0;
  } catch (err) {
    console.error(`⚠️  Не удалось прочитать outRoutes.mjs: ${err.message}`);
    return 0;
  }
}

// ─── 5. Промо-партнёры — напрямую из Perfluence API ───────────────────────────
async function countPromoPartners() {
  try {
    if (!PERFLUENCE_KEY) return 0;
    const res = await fetch(`${PERFLUENCE_URL}?key=${PERFLUENCE_KEY}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();
    const perfArray = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);

    const brands = new Set();
    for (const item of perfArray) {
      const name = item?.project?.name;
      if (name) brands.add(name.trim());
    }
    console.log(`✅ Perfluence: получено ${perfArray.length} записей, уникальных брендов: ${brands.size}`);
    return brands.size;
  } catch (err) {
    console.error(`⚠️  Не удалось получить данные из Perfluence: ${err.message}`);
    return 0;
  }
}

function makeStatResult(count) {
  return {
    count,
    updated: new Date().toISOString(),
    updatedReadable: new Date().toLocaleString('ru-RU'),
  };
}

// ─── main ─────────────────────────────────────────────────────────────────────
(async () => {
  try {
    const contentRoot = getContentRoot();
    console.log(`🔍 Источник контента: ${contentRoot}`);

    // 1) Страницы
    if (!fs.existsSync(contentRoot)) {
      console.error(`❌ Папка "${contentRoot}" не найдена`);
      process.exit(1);
    }
    countHtml(contentRoot);

    const pageResult = makeStatResult(pageCount);
    writeStatsFile(PAGE_COUNT_FILE, pageResult);
    console.log(`✅ HTML/HTM страниц: ${pageCount}`);
    console.log(`💾 ${PAGE_COUNT_FILE}`);

    // 2) Инструменты и игры
    const toolsCount = countActiveTools(contentRoot);
    const gamesCount = countGames();

    writeStatsFile(TOOLS_COUNT_FILE, makeStatResult(toolsCount));
    writeStatsFile(GAMES_COUNT_FILE, makeStatResult(gamesCount));
    console.log(`✅ Активных инструментов: ${toolsCount}`);
    console.log(`✅ Игр в каталоге: ${gamesCount}`);
    console.log(`💾 ${TOOLS_COUNT_FILE}, ${GAMES_COUNT_FILE}`);

    // 3) Партнёры
    const gamePartners  = countGamePartners();
    const promoPartners = await countPromoPartners();
    const total         = gamePartners + promoPartners;

    const partnersResult = {
      gamePartners,
      promoPartners,
      total,
      updated: new Date().toISOString(),
      updatedReadable: new Date().toLocaleString('ru-RU'),
    };
    writeStatsFile(PARTNERS_COUNT_FILE, partnersResult);
    console.log(
      `✅ Партнёров всего: ${total} (игры: ${gamePartners}, промокоды: ${promoPartners})`
    );
    console.log(`💾 ${PARTNERS_COUNT_FILE}`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
    process.exit(1);
  }
})();
