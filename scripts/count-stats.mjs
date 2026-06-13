// count-stats.mjs
// Считает страницы, игровых партнёров (динамически из outRoutes.mjs) и
// промо-партнёров (напрямую из Perfluence API), пишет два JSON для страницы «О проекте»

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config({ path: path.join(__dirname, '../backend/.env') });

// Пути
const FRONTEND_PATH       = '/var/www/serpmonn.ru/frontend';
const OUT_ROUTES_FILE     = path.join(__dirname, '../backend/games/outRoutes.mjs');
const PAGE_COUNT_FILE     = '/var/www/serpmonn.ru/frontend/about-project/page-count.json';
const PARTNERS_COUNT_FILE = '/var/www/serpmonn.ru/frontend/about-project/partners-count.json';

const PERFLUENCE_URL = 'https://dash.perfluence.net/blogger/promocode-api/json';
const PERFLUENCE_KEY = process.env.PERFLUENCE_API_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6ODk4OTg3LCJhdXRoX2tleSI6Iml1Tl9fVk5WdTdOY0RqT1RKZW1EbUpUV1JjeUxqNFp4IiwiZGF0YSI6W119.k8vSFrvEtc75g7Gu-YdIcvhu6nB60V2CTOjti0IPfhQ';

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

// ─── 2. Игровые партнёры — динамически из outRoutes.mjs ──────────────────────
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

// ─── 3. Промо-партнёры — напрямую из Perfluence API ─────────────────────────
async function countPromoPartners() {
  try {
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

// ─── main ─────────────────────────────────────────────────────────────────────
(async () => {
  try {
    // 1) Страницы
    console.log(`🔍 Ищу HTML/HTM в: ${FRONTEND_PATH}`);
    if (!fs.existsSync(FRONTEND_PATH)) {
      console.error(`❌ Папка "${FRONTEND_PATH}" не найдена`);
      process.exit(1);
    }
    countHtml(FRONTEND_PATH);

    const pageResult = {
      count: pageCount,
      updated: new Date().toISOString(),
      updatedReadable: new Date().toLocaleString('ru-RU'),
    };
    fs.writeFileSync(PAGE_COUNT_FILE, JSON.stringify(pageResult, null, 2));
    console.log(`✅ HTML/HTM страниц: ${pageCount}`);
    console.log(`💾 page-count.json → ${PAGE_COUNT_FILE}`);

    // 2) Партнёры
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
    fs.writeFileSync(PARTNERS_COUNT_FILE, JSON.stringify(partnersResult, null, 2));
    console.log(
      `✅ Партнёров всего: ${total} (игры: ${gamePartners}, промокоды: ${promoPartners})`
    );
    console.log(`💾 partners-count.json → ${PARTNERS_COUNT_FILE}`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Ошибка:', err.message);
    process.exit(1);
  }
})();
