// count-stats.mjs
// Считает страницы, игровых партнёров (динамически из outRoutes.mjs) и
// промо-партнёров (из API), пишет два JSON для страницы «О проекте»

import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Пути
const FRONTEND_PATH      = '/var/www/serpmonn.ru/frontend';
const OUT_ROUTES_FILE    = path.join(__dirname, '../backend/games/outRoutes.mjs');
const PAGE_COUNT_FILE    = '/var/www/serpmonn.ru/assembly/site/src/about-project/page-count.json';
const PARTNERS_COUNT_FILE = '/var/www/serpmonn.ru/assembly/site/src/about-project/partners-count.json';

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
    // Ищем блок GAME_LINKS = { ... } и считаем ключи вида 'slug':
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

// ─── 3. Промо-партнёры — из локального API ───────────────────────────────────
function getJson(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, res => {
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => req.destroy(new Error('Timeout')));
  });
}

async function countPromoPartners() {
  try {
    const json = await getJson('http://localhost:3000/api/promocodes');
    return new Set(
      (json.data || []).map(p => p.advertiser_info).filter(Boolean)
    ).size;
  } catch (err) {
    console.error(`⚠️  Не удалось получить промо-партнёров: ${err.message}`);
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
