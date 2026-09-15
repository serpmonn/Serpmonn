#!/usr/bin/env node
/**
 * Capture distinct Snake store screenshots via phone Chrome CDP.
 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('/root/.nvm/versions/node/v22.22.0/lib/node_modules/playwright');
const { spawnSync } = require('child_process');

const STORE = '/var/www/serpmonn.ru/frontend/downloads/yandex-games/snake';
const RAW = '/tmp/snake-cdp-raw';
fs.mkdirSync(RAW, { recursive: true });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function to916(src, dst) {
  const py = `
from PIL import Image
im = Image.open(r'${src}').convert('RGB')
w, h = im.size
# Already page-only (no Android chrome). Fit to 9:16.
target = 9 / 16
if abs(w / h - target) < 0.02:
    out = im.resize((1080, 1920), Image.Resampling.LANCZOS)
else:
    if w / h > target:
        nw = int(h * target)
        left = (w - nw) // 2
        crop = im.crop((left, 0, left + nw, h))
    else:
        nh = int(w / target)
        top = max(0, (h - nh) // 2)
        crop = im.crop((0, top, w, top + nh if top + nh <= h else h))
        if crop.size[1] < nh:
            canvas = Image.new('RGB', (crop.size[0], nh), (15, 15, 16))
            canvas.paste(crop, (0, 0))
            crop = canvas
    out = crop.resize((1080, 1920), Image.Resampling.LANCZOS)
out.save(r'${dst}')
print('saved', r'${dst}', out.size)
`;
  const r = spawnSync('python3', ['-c', py], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr || r.stdout || 'pil fail');
  process.stdout.write(r.stdout || '');
}

async function playAndCapture(browser, lang, url) {
  const context = browser.contexts()[0] || (await browser.newContext());
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await sleep(1500);

  if (lang === 'en') {
    await page.evaluate(() => {
      if (window.SERPMONN_LOCALES && window.applySerpmonnLocale) {
        window.applySerpmonnLocale(window.SERPMONN_LOCALES.en);
      }
      window.showFullScreenAd = function () {};
    });
  } else {
    await page.evaluate(() => {
      window.showFullScreenAd = function () {};
    });
  }

  await page.evaluate(() => {
    const b = document.getElementById('btnStart');
    if (b) b.click();
  });
  await sleep(400);

  const dirs = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  const shotAt = [1800, 4500, 7500];
  const start = Date.now();
  let di = 0;

  const mover = (async () => {
    while (Date.now() - start < 9000) {
      await page.keyboard.press(dirs[di++ % dirs.length]);
      await sleep(160);
    }
  })();

  for (let i = 0; i < 3; i++) {
    while (Date.now() - start < shotAt[i]) await sleep(40);
    const score = await page.evaluate(() => (document.getElementById('score') || {}).textContent || '0');
    const raw = path.join(RAW, `${lang}-${i + 1}.png`);
    // Full page viewport screenshot from Chrome (phone screen content)
    await page.screenshot({ path: raw, type: 'png', fullPage: false });
    console.log(lang, i + 1, 'score', score, 'bytes', fs.statSync(raw).size);
  }

  await Promise.race([mover, sleep(500)]);
  await page.close();
}

async function main() {
  const browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  console.log('CDP connected');

  await playAndCapture(
    browser,
    'ru',
    'https://serpmonn.ru/frontend/games/yandex/snake/index.html'
  );
  await playAndCapture(
    browser,
    'en',
    'https://serpmonn.ru/frontend/games/yandex/snake/index-en.html'
  );

  for (const lang of ['ru', 'en']) {
    for (let i = 1; i <= 3; i++) {
      to916(path.join(RAW, `${lang}-${i}.png`), path.join(STORE, `mobile-${lang}-0${i}.png`));
    }
  }
  fs.copyFileSync(path.join(STORE, 'mobile-ru-01.png'), path.join(STORE, 'mobile-01-play.png'));
  fs.copyFileSync(path.join(STORE, 'mobile-ru-02.png'), path.join(STORE, 'mobile-02-score.png'));
  fs.copyFileSync(path.join(STORE, 'mobile-ru-03.png'), path.join(STORE, 'mobile-03-ru.png'));

  const hashes = spawnSync(
    'md5sum',
    [
      path.join(STORE, 'mobile-ru-01.png'),
      path.join(STORE, 'mobile-ru-02.png'),
      path.join(STORE, 'mobile-ru-03.png'),
      path.join(STORE, 'mobile-en-01.png'),
      path.join(STORE, 'mobile-en-02.png'),
      path.join(STORE, 'mobile-en-03.png'),
    ],
    { encoding: 'utf8' }
  );
  console.log(hashes.stdout);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
