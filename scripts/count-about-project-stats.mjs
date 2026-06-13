// count-about-project-stats.mjs
// Считает количество страниц и партнёров для страницы "О проекте"

import fs from 'fs';
import path from 'path';
import http from 'http';

// Пути
const FRONTEND_PATH = '/var/www/serpmonn.ru/frontend';
const PAGE_COUNT_FILE = '/var/www/serpmonn.ru/assembly/site/src/about-project/page-count.json';
const PARTNERS_COUNT_FILE = '/var/www/serpmonn.ru/assembly/site/src/about-project/partners-count.json';

// --- Счётчик страниц (как в старом count-pages.mjs) ---
let pageCount = 0;

function countHtml(dir) {
  try {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      if (item.startsWith('.')) continue;

      const fullPath = path.join(dir, item);

      try {
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          if (item !== 'node_modules' && item !== '.git') {
            countHtml(fullPath);
          }
        } else if (item.endsWith('.html') || item.endsWith('.htm')) {
          pageCount++;
        }
      } catch {
        // пропускаем ошибки доступа
      }
    }
  } catch (err) {
    console.log(`Не могу прочитать папку ${dir}: ${err.message}`);
  }
}

// --- HTTP-утилита без fetch (надёжнее под cron/PM2) ---
function getJson(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, res => {
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy(new Error('Timeout'));
    });
  });
}

// --- Счётчик партнёров ---
// Статичное число игровых партнёров (Admitad)
const GAME_PARTNERS = 14;

async function countPartners() {
  try {
    const json = await getJson('http://localhost:3000/api/promocodes');

    const promoPartners = new Set(
      (json.data || [])
        .map(p => p.advertiser_info)
        .filter(Boolean)
    ).size;

    return { promoPartners, gamePartners: GAME_PARTNERS };
  } catch (err) {
    console.error(`⚠️ Не удалось получить партнёров по промокодам: ${err.message}`);
    return { promoPartners: 0, gamePartners: GAME_PARTNERS };
  }
}

(async () => {
  try {
    // 1) Страницы
    console.log(`🔍 Ищу HTML/HTM в папке: ${FRONTEND_PATH}`);

    if (!fs.existsSync(FRONTEND_PATH)) {
      console.log(`❌ Папка "${FRONTEND_PATH}" не найдена`);
      process.exit(1);
    }

    countHtml(FRONTEND_PATH);

    const pageResult = {
      count: pageCount,
      updated: new Date().toISOString(),
      updatedReadable: new Date().toLocaleString('ru-RU')
    };

    fs.writeFileSync(PAGE_COUNT_FILE, JSON.stringify(pageResult, null, 2));
    console.log(`✅ HTML/HTM страниц: ${pageCount}`);
    console.log(`💾 page-count.json сохранён в ${PAGE_COUNT_FILE}`);

    // 2) Партнёры
    const { promoPartners, gamePartners } = await countPartners();
    const totalPartners = promoPartners + gamePartners;

    const partnersResult = {
      promoPartners,
      gamePartners,
      total: totalPartners,
      updated: new Date().toISOString(),
      updatedReadable: new Date().toLocaleString('ru-RU')
    };

    fs.writeFileSync(PARTNERS_COUNT_FILE, JSON.stringify(partnersResult, null, 2));
    console.log(
      `✅ Партнёров всего: ${totalPartners} ` +
      `(промокоды: ${promoPartners}, игры: ${gamePartners})`
    );
    console.log(`💾 partners-count.json сохранён в ${PARTNERS_COUNT_FILE}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    process.exit(1);
  }
})();
