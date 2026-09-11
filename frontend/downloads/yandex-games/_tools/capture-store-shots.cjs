#!/usr/bin/env node
/**
 * Capture real store screenshots (1920×1080 PNG) from live Yandex HTML5 builds.
 * Replaces PIL mockups with Chromium page.screenshot of actual gameplay.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('/root/.nvm/versions/node/v22.22.0/lib/node_modules/playwright');

const YANDEX_ROOT = '/var/www/serpmonn.ru/frontend/games/yandex';
const STORE_ROOT = '/var/www/serpmonn.ru/frontend/downloads/yandex-games';
const W = 1920;
const H = 1080;
const PLAY_MS = 8500;
const SHOT_AT = [1500, 4200, 7200];

const GAMES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      'snake',
      '2048',
      'flappy',
      'breakout',
      'minesweeper',
      'fifteen',
      'coins',
      'typing',
      'rat',
      'redsquare',
      'neli',
      'redsquare2',
    ];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'application/svg+xml',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      if (url.pathname === '/sdk.js') {
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.end('window.YaGames=undefined;');
        return;
      }
      let rel = decodeURIComponent(url.pathname);
      const filePath = path.join(YANDEX_ROOT, rel);
      if (!filePath.startsWith(YANDEX_ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404);
        res.end('not found');
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

async function applyLang(page, lang) {
  await page.evaluate((code) => {
    try {
      const loc = window.SERPMONN_LOCALES && window.SERPMONN_LOCALES[code];
      if (loc && window.applySerpmonnLocale) window.applySerpmonnLocale(loc);
    } catch (e) {}
  }, lang);
}

async function waitReady(page) {
  await page.waitForFunction(
    () => !!(document.querySelector('h1') || document.querySelector('#game') || document.querySelector('canvas') || document.title),
    { timeout: 20000 }
  );
  await sleep(400);
}

async function playUntil(page, tick, ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    await tick();
  }
}

async function playSnake(page) {
  await page.click('#btnStart').catch(() => {});
  await sleep(200);
  await playUntil(page, async () => {
    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
    await page.keyboard.press(keys[Math.floor(Date.now() / 900) % 4]);
    await sleep(180);
  }, PLAY_MS);
}

async function play2048(page) {
  await page.focus('#board').catch(() => {});
  let i = 0;
  const keys = ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'];
  await playUntil(page, async () => {
    const key = Math.random() < 0.55 ? (Math.random() < 0.5 ? 'ArrowLeft' : 'ArrowUp') : keys[i++ % 4];
    await page.keyboard.press(key);
    await sleep(240);
  }, PLAY_MS);
}

async function playFlappy(page) {
  await page.click('#btnStart').catch(() => {});
  await sleep(200);
  await playUntil(page, async () => {
    const st = await page.evaluate(() => (window.__rec ? window.__rec.getState() : null));
    if (!st || !st.alive || !st.gameActive) {
      await page.keyboard.press('Space');
      await sleep(200);
      return;
    }
    let targetY = st.H / 2;
    const ahead = (st.pipes || []).filter((p) => p.x + st.pipeWidth > st.bird.x - 10);
    if (ahead.length) {
      const p = ahead.sort((a, b) => a.x - b.x)[0];
      targetY = p.top + st.gap / 2;
    }
    const pred = st.bird.y + st.bird.vy * 4;
    if (pred > targetY + 4 || st.bird.vy > 2.2) await page.keyboard.press('Space');
    await sleep(40);
  }, PLAY_MS);
}

async function playBreakout(page) {
  await page.click('#btnStart').catch(() => {});
  await sleep(150);
  await playUntil(page, async () => {
    const st = await page.evaluate(() => (window.__rec ? window.__rec.getState() : null));
    if (!st) {
      await sleep(80);
      return;
    }
    if (st.endState) {
      await page.keyboard.press('r');
      await sleep(150);
      await page.click('#btnStart').catch(() => {});
      return;
    }
    if (!st.running) {
      await page.click('#btnStart').catch(() => {});
      await sleep(80);
      return;
    }
    const paddleCenter = st.paddle.x + st.paddle.w / 2;
    const target = st.ball.x + st.ball.vx * 4;
    if (paddleCenter < target - 4) await page.evaluate(() => window.__rec.setPaddle(4));
    else if (paddleCenter > target + 4) await page.evaluate(() => window.__rec.setPaddle(-4));
    else await page.evaluate(() => window.__rec.setPaddle(0));
    await sleep(30);
  }, PLAY_MS);
}

async function playMinesweeper(page) {
  await page.waitForSelector('#board .cell', { timeout: 10000 });
  await page.click('#board .cell[data-x="4"][data-y="4"]').catch(() => {});
  await sleep(250);
  let clicks = 0;
  await playUntil(page, async () => {
    const overlay = await page.evaluate(() => {
      const el = document.getElementById('end-overlay');
      return el && !el.classList.contains('hidden');
    });
    if (overlay) {
      await page.click('#btnReset').catch(() => {});
      await sleep(300);
      await page.click('#board .cell[data-x="3"][data-y="3"]').catch(() => {});
      return;
    }
    const cells = await page.$$('#board .cell:not(.open):not(.flag)');
    if (!cells.length) {
      await sleep(200);
      return;
    }
    const cell = cells[Math.floor(Math.random() * Math.min(cells.length, 40))];
    if (clicks > 6 && clicks % 5 === 0) await cell.click({ button: 'right' });
    else await cell.click();
    clicks++;
    await sleep(260);
  }, PLAY_MS);
}

async function playFifteen(page) {
  await page.waitForSelector('#game .tile', { timeout: 10000 });
  await playUntil(page, async () => {
    const overlay = await page.evaluate(() => {
      const el = document.getElementById('end-overlay');
      return el && !el.classList.contains('hidden');
    });
    if (overlay) {
      await page.click('#btnNewGame').catch(() => {});
      await sleep(300);
      return;
    }
    await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('#game .tile'));
      if (all.length !== 16) return;
      const emptyIdx = all.findIndex((t) => t.classList.contains('empty'));
      if (emptyIdx < 0) return;
      const size = 4;
      const er = Math.floor(emptyIdx / size);
      const ec = emptyIdx % size;
      const candidates = [];
      for (const [dr, dc] of [
        [0, 1],
        [0, -1],
        [1, 0],
        [-1, 0],
      ]) {
        const r = er + dr;
        const c = ec + dc;
        if (r >= 0 && r < size && c >= 0 && c < size) candidates.push(r * size + c);
      }
      if (!candidates.length) return;
      all[candidates[Math.floor(Math.random() * candidates.length)]].click();
    });
    await sleep(220);
  }, PLAY_MS);
}

async function playCoins(page) {
  await page.click('#btnStart').catch(() => {});
  await sleep(200);
  await playUntil(page, async () => {
    const st = await page.evaluate(() => (window.__rec ? window.__rec.getState() : null));
    if (!st || !st.alive) {
      await page.keyboard.press('r');
      await sleep(200);
      await page.click('#btnStart').catch(() => {});
      return;
    }
    if (!st.started) {
      await page.click('#btnStart').catch(() => {});
      await sleep(120);
      return;
    }
    const p = st.player;
    let target = null;
    let bestD = 1e9;
    for (const c of st.coins || []) {
      const d = Math.abs(c.x - p.x) + Math.abs(c.y - p.y);
      if (d < bestD) {
        bestD = d;
        target = c;
      }
    }
    if (!target) {
      await sleep(100);
      return;
    }
    let vx = 0;
    let vy = 0;
    if (Math.abs(target.x - p.x) >= Math.abs(target.y - p.y)) vx = target.x > p.x ? 1 : target.x < p.x ? -1 : 0;
    else vy = target.y > p.y ? 1 : target.y < p.y ? -1 : 0;
    await page.evaluate(({ vx, vy }) => window.__rec && window.__rec.setDir(vx, vy), { vx, vy });
    await sleep(160);
  }, PLAY_MS);
}

async function playTyping(page) {
  await page.waitForFunction(() => window.__rec, { timeout: 10000 });
  await page.evaluate(() => {
    if (window.__rec.setMode) window.__rec.setMode('30');
    window.__rec.start();
  });
  await sleep(250);
  await playUntil(page, async () => {
    const st = await page.evaluate(() => window.__rec.getState());
    if (!st || st.finished) {
      await page.evaluate(() => {
        if (window.__rec.reset) window.__rec.reset();
        window.__rec.start();
      });
      await sleep(200);
      return;
    }
    await page.evaluate(() => {
      if (typeof window.__rec.typeNext === 'function') {
        window.__rec.typeNext(4);
        return;
      }
      const cur = document.querySelector('#wordsDisplay .current, #wordsDisplay .char.current, .char.current');
      if (cur && cur.textContent) window.__rec.type(cur.textContent);
      else window.__rec.type('a');
    });
    await sleep(70);
  }, PLAY_MS);
}

async function playRat(page) {
  await page.waitForFunction(() => window.__rec, { timeout: 10000 });
  await page.evaluate(() => window.__rec.start());
  await sleep(200);
  await playUntil(page, async () => {
    const st = await page.evaluate(() => window.__rec.getState());
    if (!st || !st.alive) {
      await page.evaluate(() => window.__rec.start());
      await sleep(250);
      return;
    }
    if (st.food) {
      const t = st.food;
      await page.evaluate(({ x, y }) => {
        if (window.__rec.setTarget) window.__rec.setTarget(x, y);
        else if (window.__rec.clickCell) window.__rec.clickCell(x, y);
      }, t);
    }
    await sleep(120);
  }, PLAY_MS);
}

async function playRedsquare(page) {
  await page.waitForFunction(() => window.__rec, { timeout: 10000 });
  await page.evaluate(() => {
    const b = document.getElementById('understandBtn') || document.querySelector('.instruction-button');
    if (b) b.click();
  });
  await sleep(150);
  await page.evaluate(() => window.__rec.start());
  await sleep(200);
  await playUntil(page, async () => {
    const st = await page.evaluate(() => window.__rec.getState());
    if (!st || !st.started || st.dead) {
      await page.evaluate(() => {
        if (window.__rec.reset) window.__rec.reset();
        window.__rec.start();
      });
      await sleep(250);
      return;
    }
    const key = Date.now() % 2 === 0 ? 'ArrowLeft' : 'ArrowRight';
    await page.keyboard.down(key);
    await sleep(180);
    await page.keyboard.up(key);
    await sleep(60);
  }, PLAY_MS);
}

async function playNeli(page) {
  await page.waitForFunction(() => window.__rec, { timeout: 20000 });
  await sleep(200);
  const st0 = await page.evaluate(() => window.__rec.getState());
  if (!st0 || st0.screen === 'title') {
    await page.evaluate(() => {
      const input = document.getElementById('name-input');
      if (input && !input.value) input.value = 'Neli';
      if (window.__rec.startDemo) window.__rec.startDemo();
    });
    await sleep(600);
  }
  for (let i = 0; i < 6; i++) {
    const needClick = await page.evaluate(() => {
      const msg = document.getElementById('screen-msg');
      const ok = document.getElementById('msg-ok');
      if (msg && !msg.hidden && ok) {
        ok.click();
        return true;
      }
      return false;
    });
    if (!needClick) break;
    await sleep(500);
  }
  const dirs = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
  let i = 0;
  await playUntil(
    page,
    async () => {
      await page.evaluate(() => {
        const msg = document.getElementById('screen-msg');
        const ok = document.getElementById('msg-ok');
        if (msg && !msg.hidden && ok) ok.click();
      });
      await page.keyboard.down(dirs[i % 4]);
      await sleep(300);
      await page.keyboard.up(dirs[i % 4]);
      if (i % 4 === 0) await page.keyboard.press('KeyE');
      i++;
      await sleep(80);
    },
    PLAY_MS + 4000
  );
}

async function playRedsquare2(page) {
  await page.waitForFunction(() => window.__rec, { timeout: 10000 });
  await page.evaluate(() => {
    const b = document.getElementById('understandBtn');
    if (b) b.click();
  });
  await sleep(150);
  await page.evaluate(() => window.__rec.start());
  await sleep(200);
  let i = 0;
  await playUntil(page, async () => {
    const st = await page.evaluate(() => window.__rec.getState());
    if (!st || !st.started || (st.misses != null && st.misses >= 10)) {
      await page.evaluate(() => {
        if (window.__rec.reset) window.__rec.reset();
        window.__rec.start();
      });
      await sleep(250);
      return;
    }
    const key = i % 2 === 0 ? 'ArrowLeft' : 'ArrowRight';
    await page.keyboard.down(key);
    await sleep(200);
    await page.keyboard.up(key);
    i++;
    await sleep(50);
  }, PLAY_MS);
}

const PLAYERS = {
  snake: playSnake,
  '2048': play2048,
  flappy: playFlappy,
  breakout: playBreakout,
  minesweeper: playMinesweeper,
  fifteen: playFifteen,
  coins: playCoins,
  typing: playTyping,
  rat: playRat,
  redsquare: playRedsquare,
  neli: playNeli,
  redsquare2: playRedsquare2,
};

function writeShotSet(storeDir, lang, files) {
  for (let i = 0; i < 3; i++) {
    const n = String(i + 1).padStart(2, '0');
    const shot = path.join(storeDir, `shot-${lang}-${n}.png`);
    const mobile = path.join(storeDir, `mobile-${lang}-${n}.png`);
    fs.copyFileSync(files[i], shot);
    fs.copyFileSync(files[i], mobile);
  }
  // snake legacy names (CONSOLE may still reference them)
  if (path.basename(storeDir) === 'snake' && lang === 'ru') {
    fs.copyFileSync(files[0], path.join(storeDir, 'shot-01-play.png'));
    fs.copyFileSync(files[1], path.join(storeDir, 'shot-02-score.png'));
    fs.copyFileSync(files[2], path.join(storeDir, 'shot-03-en.png'));
    fs.copyFileSync(files[0], path.join(storeDir, 'mobile-01-play.png'));
    fs.copyFileSync(files[1], path.join(storeDir, 'mobile-02-score.png'));
    fs.copyFileSync(files[2], path.join(storeDir, 'mobile-03-ru.png'));
  }
  if (path.basename(storeDir) === 'snake' && lang === 'en') {
    fs.copyFileSync(files[0], path.join(storeDir, 'mobile-en-01.png'));
    fs.copyFileSync(files[1], path.join(storeDir, 'mobile-en-02.png'));
    fs.copyFileSync(files[2], path.join(storeDir, 'mobile-en-03.png'));
  }
}

async function captureOne(browser, port, game, lang) {
  const player = PLAYERS[game];
  if (!player) throw new Error(`no player for ${game}`);

  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.showFullScreenAd = function () {};
  });

  const url = `http://127.0.0.1:${port}/${game}/index.html?rec=1&lang=${lang}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await waitReady(page);
  await applyLang(page, lang);
  await page.evaluate(() => {
    window.showFullScreenAd = function () {};
  });

  // Neli: wait for assets + dismiss title/controls before timed shots
  let shotAt = SHOT_AT;
  if (game === 'neli') {
    await page.waitForFunction(() => window.__rec, { timeout: 25000 });
    await sleep(800);
    await page.evaluate(() => {
      const input = document.getElementById('name-input');
      if (input && !input.value) input.value = 'Neli';
      if (window.__rec.startDemo) window.__rec.startDemo();
    });
    await sleep(700);
    for (let i = 0; i < 12; i++) {
      const clicked = await page.evaluate(() => {
        const msg = document.getElementById('screen-msg');
        const ok = document.getElementById('msg-ok');
        if (msg && !msg.hidden && ok) {
          ok.click();
          return true;
        }
        return false;
      });
      if (!clicked) break;
      await sleep(700);
    }
    await page
      .waitForFunction(
        () => {
          const st = window.__rec && window.__rec.getState();
          const msg = document.getElementById('screen-msg');
          return st && st.screen !== 'title' && st.screen !== 'msg' && (!msg || msg.hidden);
        },
        { timeout: 25000 }
      )
      .catch(() => {});
    await sleep(1500);
    shotAt = [1000, 4000, 7000];
  }

  const tmpDir = path.join('/tmp/yg-real-shots', `${game}-${lang}`);
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.mkdirSync(tmpDir, { recursive: true });
  const tmpFiles = [0, 1, 2].map((i) => path.join(tmpDir, `s${i}.png`));

  let shotIdx = 0;
  const start = Date.now();
  let playing = true;

  const playP = (async () => {
    try {
      await player(page);
    } finally {
      playing = false;
    }
  })();

  while (shotIdx < 3) {
    const due = shotAt[shotIdx];
    while (Date.now() - start < due) await sleep(40);
    await sleep(80);
    await page.screenshot({ path: tmpFiles[shotIdx], type: 'png' });
    console.log(`    shot ${shotIdx + 1}/3 @ ${Date.now() - start}ms`);
    shotIdx++;
  }

  // let play finish or cut short
  const remain = PLAY_MS + 500 - (Date.now() - start);
  if (remain > 0 && playing) await sleep(Math.min(remain, 2000));
  await Promise.race([playP, sleep(3000)]);
  await context.close();

  const storeDir = path.join(STORE_ROOT, game);
  fs.mkdirSync(storeDir, { recursive: true });
  writeShotSet(storeDir, lang, tmpFiles);

  for (const f of tmpFiles) {
    const kb = Math.round(fs.statSync(f).size / 1024);
    console.log(`  OK shot-${lang} (${kb} KB each set)`);
    break;
  }
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

async function main() {
  const { server, port } = await startServer();
  console.log('server', port);

  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  try {
    for (const game of GAMES) {
      for (const lang of ['ru', 'en']) {
        console.log(`\n=== ${game} ${lang} ===`);
        await captureOne(browser, port, game, lang);
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
  console.log('\nAll real store screenshots written.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
