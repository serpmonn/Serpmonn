#!/usr/bin/env node
/**
 * Record real-gameplay promo videos for Yandex Games store pages.
 * Uses system Chromium + CDP screencast + system ffmpeg (no Playwright browser download).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('/root/.nvm/versions/node/v22.22.0/lib/node_modules/playwright');

const YANDEX_ROOT = '/var/www/serpmonn.ru/frontend/games/yandex';
const STORE_ROOT = '/var/www/serpmonn.ru/frontend/downloads/yandex-games';
const TMP = '/tmp/yg-real-videos';
const W = 1920;
const H = 1080;
const DURATION_MS = 22000;
const FPS = 10;

const GAMES = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
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
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
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
    } catch (e) {
      console.warn('locale apply failed', e);
    }
  }, lang);
}

async function waitReady(page) {
  await page.waitForFunction(
    () => !!(document.querySelector('h1') || document.querySelector('#game') || document.querySelector('canvas') || document.title),
    { timeout: 20000 }
  );
  await sleep(500);
}

async function play2048(page) {
  await page.focus('#board');
  const end = Date.now() + DURATION_MS - 500;
  let i = 0;
  const keys = ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'];
  while (Date.now() < end) {
    const key = Math.random() < 0.55 ? (Math.random() < 0.5 ? 'ArrowLeft' : 'ArrowUp') : keys[i % 4];
    await page.keyboard.press(key);
    i++;
    await sleep(220 + Math.floor(Math.random() * 180));
  }
}

async function playFlappy(page) {
  await page.click('#btnStart');
  await sleep(200);
  const end = Date.now() + DURATION_MS - 800;
  while (Date.now() < end) {
    const st = await page.evaluate(() => (window.__rec ? window.__rec.getState() : null));
    if (!st || !st.alive || !st.gameActive) {
      await page.keyboard.press('Space');
      await sleep(250);
      continue;
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
  }
}

async function playBreakout(page) {
  await page.click('#btnStart');
  await sleep(150);
  const end = Date.now() + DURATION_MS - 500;
  while (Date.now() < end) {
    const st = await page.evaluate(() => (window.__rec ? window.__rec.getState() : null));
    if (!st) {
      await sleep(100);
      continue;
    }
    if (st.endState) {
      await page.keyboard.press('r');
      await sleep(200);
      await page.click('#btnStart');
      await sleep(150);
      continue;
    }
    if (!st.running) {
      await page.click('#btnStart');
      await sleep(100);
      continue;
    }
    const paddleCenter = st.paddle.x + st.paddle.w / 2;
    const target = st.ball.x + st.ball.vx * 4;
    if (paddleCenter < target - 4) await page.evaluate(() => window.__rec.setPaddle(4));
    else if (paddleCenter > target + 4) await page.evaluate(() => window.__rec.setPaddle(-4));
    else await page.evaluate(() => window.__rec.setPaddle(0));
    await sleep(30);
  }
  await page.evaluate(() => window.__rec && window.__rec.setPaddle(0));
}

async function playMinesweeper(page) {
  await page.waitForSelector('#board .cell');
  const end = Date.now() + DURATION_MS - 500;
  await page.click('#board .cell[data-x="4"][data-y="4"]');
  await sleep(300);
  let clicks = 0;
  while (Date.now() < end) {
    const overlay = await page.evaluate(() => !document.getElementById('end-overlay').classList.contains('hidden'));
    if (overlay) {
      await page.click('#btnReset');
      await sleep(400);
      await page.click('#board .cell[data-x="3"][data-y="3"]');
      await sleep(250);
      continue;
    }
    const cells = await page.$$('#board .cell:not(.open):not(.flag)');
    if (!cells.length) break;
    const cell = cells[Math.floor(Math.random() * Math.min(cells.length, 40))];
    if (clicks > 8 && clicks % 5 === 0) await cell.click({ button: 'right' });
    else await cell.click();
    clicks++;
    await sleep(280 + Math.floor(Math.random() * 220));
  }
}

async function playFifteen(page) {
  await page.waitForSelector('#game .tile');
  const end = Date.now() + DURATION_MS - 500;
  while (Date.now() < end) {
    const overlay = await page.evaluate(() => !document.getElementById('end-overlay').classList.contains('hidden'));
    if (overlay) {
      await page.click('#btnNewGame');
      await sleep(400);
      continue;
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
      const pick = candidates[Math.floor(Math.random() * candidates.length)];
      all[pick].click();
    });
    await sleep(240 + Math.floor(Math.random() * 120));
  }
}

async function playCoins(page) {
  await page.click('#btnStart');
  await sleep(200);
  const end = Date.now() + DURATION_MS - 500;
  while (Date.now() < end) {
    const st = await page.evaluate(() => (window.__rec ? window.__rec.getState() : null));
    if (!st || !st.alive) {
      await page.keyboard.press('r');
      await sleep(300);
      await page.click('#btnStart');
      await sleep(200);
      continue;
    }
    if (!st.started) {
      await page.click('#btnStart');
      await sleep(150);
      continue;
    }
    // Aim for nearest coin, dodge bads if adjacent
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
      await sleep(120);
      continue;
    }
    let vx = 0;
    let vy = 0;
    if (Math.abs(target.x - p.x) >= Math.abs(target.y - p.y)) vx = target.x > p.x ? 1 : target.x < p.x ? -1 : 0;
    else vy = target.y > p.y ? 1 : target.y < p.y ? -1 : 0;

    const nx = (p.x + vx + st.cells) % st.cells;
    const ny = (p.y + vy + st.cells) % st.cells;
    const hit = (st.bads || []).some((b) => b.x === nx && b.y === ny);
    if (hit) {
      // try perpendicular
      if (vx !== 0) {
        vx = 0;
        vy = Math.random() < 0.5 ? 1 : -1;
      } else {
        vy = 0;
        vx = Math.random() < 0.5 ? 1 : -1;
      }
    }
    await page.evaluate(({ vx, vy }) => window.__rec && window.__rec.setDir(vx, vy), { vx, vy });
    await sleep(180);
  }
}

async function playTyping(page) {
  await page.waitForFunction(() => window.__rec, { timeout: 10000 });
  await page.evaluate(() => {
    if (window.__rec.setMode) window.__rec.setMode('30');
    window.__rec.start();
  });
  await sleep(300);
  const end = Date.now() + DURATION_MS - 500;
  while (Date.now() < end) {
    const st = await page.evaluate(() => window.__rec.getState());
    if (!st || st.finished) {
      await page.evaluate(() => {
        if (window.__rec.reset) window.__rec.reset();
        window.__rec.start();
      });
      await sleep(250);
      continue;
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
    await sleep(80);
  }
}

async function playRat(page) {
  await page.waitForFunction(() => window.__rec, { timeout: 10000 });
  await page.evaluate(() => window.__rec.start());
  await sleep(300);
  const end = Date.now() + DURATION_MS - 500;
  while (Date.now() < end) {
    const st = await page.evaluate(() => window.__rec.getState());
    if (!st || !st.alive) {
      await page.evaluate(() => window.__rec.start());
      await sleep(400);
      continue;
    }
    const target = st.bonusFood || st.food;
    if (target) {
      await page.evaluate((t) => {
        if (window.__rec.setTarget) window.__rec.setTarget(t.x, t.y);
        else if (window.__rec.clickCell) window.__rec.clickCell(t.x, t.y);
      }, target);
    }
    await sleep(400);
  }
}

async function playRedsquare(page) {
  await page.waitForFunction(() => window.__rec, { timeout: 10000 });
  await page.evaluate(() => {
    const b = document.getElementById('understandBtn');
    if (b) b.click();
  });
  await sleep(200);
  await page.evaluate(() => window.__rec.start());
  await sleep(200);
  const end = Date.now() + DURATION_MS - 500;
  const keys = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
  let i = 0;
  while (Date.now() < end) {
    const st = await page.evaluate(() => window.__rec.getState());
    if (!st || !st.started || st.lives <= 0) {
      await page.keyboard.press('Enter');
      await page.evaluate(() => {
        if (window.__rec.reset) window.__rec.reset();
        window.__rec.start();
      });
      await sleep(300);
      continue;
    }
    await page.keyboard.down(keys[i % 4]);
    await sleep(180 + (i % 3) * 60);
    await page.keyboard.up(keys[i % 4]);
    i++;
    await sleep(80);
  }
}

async function playNeli(page) {
  await page.waitForFunction(() => window.__rec && window.__rec.talkBoss, { timeout: 20000 });
  await sleep(300);

  await page.evaluate(() => {
    const st = window.__rec.getState();
    if (st && st.screen === 'title') {
      const input = document.getElementById('name-input');
      if (input && !input.value) input.value = 'Neli';
      window.__rec.startDemo();
    }
  });
  for (let i = 0; i < 10; i++) {
    const clicked = await page.evaluate(() => window.__rec.dismissMsg && window.__rec.dismissMsg());
    if (!clicked) {
      const open = await page.evaluate(() => {
        const msg = document.getElementById('screen-msg');
        return !!(msg && !msg.hidden);
      });
      if (!open) break;
    }
    await sleep(550);
  }
  await page
    .waitForFunction(() => {
      const st = window.__rec.getState();
      return st && st.sceneId === 'station' && st.mode === 'play';
    }, { timeout: 20000 })
    .catch(() => {});

  const end = Date.now() + (page.__ygDurationMs || DURATION_MS) - 400;
  let phase = 'talk'; // talk → road → van → done
  let startedTalk = false;
  let sawBossDialogue = false;
  let startedVan = false;
  let sawVanDialogue = false;
  let roadFrames = 0;

  while (Date.now() < end) {
    const st = await page.evaluate(() => window.__rec.getState());
    if (!st || st.screen === 'title') {
      await page.evaluate(() => window.__rec.startDemo && window.__rec.startDemo());
      await sleep(400);
      continue;
    }
    if (st.msgOpen) {
      await page.evaluate(() => window.__rec.dismissMsg());
      await sleep(350);
      continue;
    }

    if (st.dialogueOpen || st.mode === 'dialogue') {
      if (phase === 'talk') sawBossDialogue = true;
      if (phase === 'van' || phase === 'road') sawVanDialogue = true;
      await page.evaluate(() => window.__rec.clearKeys && window.__rec.clearKeys());
      await page.evaluate(() => window.__rec.tickAutoDialogue(950));
      await sleep(200);
      continue;
    }

    if (phase === 'talk') {
      if (!startedTalk) {
        startedTalk = true;
        await page.evaluate(() => window.__rec.talkBoss());
        await sleep(500);
        continue;
      }
      if (!sawBossDialogue) {
        await page.evaluate(() => window.__rec.talkBoss());
        await sleep(400);
        continue;
      }
      await page.evaluate(() => window.__rec.goRoad());
      phase = 'road';
      roadFrames = 0;
      await sleep(400);
      continue;
    }

    if (phase === 'road') {
      roadFrames++;
      await page.evaluate(() => window.__rec.moveToward(340, 380));
      // after a short walk, fire van story beat
      if (roadFrames > 25 || Date.now() > end - 12000) {
        await page.evaluate(() => window.__rec.clearKeys());
        if (!startedVan) {
          startedVan = true;
          await page.evaluate(() => window.__rec.triggerVan());
          phase = 'van';
          await sleep(400);
        }
      } else {
        await sleep(70);
      }
      continue;
    }

    if (phase === 'van') {
      if (!sawVanDialogue && st.mode === 'play') {
        await page.evaluate(() => window.__rec.triggerVan());
        await sleep(350);
        continue;
      }
      if (st.mode === 'play') {
        await page.evaluate(() => window.__rec.moveToward(500, 250));
      }
      await sleep(100);
      continue;
    }

    await sleep(150);
  }

  await page.evaluate(() => window.__rec.clearKeys && window.__rec.clearKeys());
}

async function playRedsquare2(page) {
  await page.waitForFunction(() => window.__rec, { timeout: 10000 });
  await page.evaluate(() => {
    const b = document.getElementById('understandBtn');
    if (b) b.click();
  });
  await sleep(200);
  await page.evaluate(() => window.__rec.start());
  // click Start if present
  const startBtn = await page.$('#startBtn, .action-start, button.action-btn');
  if (startBtn) {
    try {
      await startBtn.click();
    } catch (_) {}
  }
  await sleep(300);
  const end = Date.now() + DURATION_MS - 500;
  let i = 0;
  while (Date.now() < end) {
    const st = await page.evaluate(() => window.__rec.getState());
    if (!st || !st.started || (st.misses != null && st.misses >= 10)) {
      await page.evaluate(() => {
        if (window.__rec.reset) window.__rec.reset();
        window.__rec.start();
      });
      await sleep(350);
      continue;
    }
    // paddle left/right
    const key = i % 2 === 0 ? 'ArrowLeft' : 'ArrowRight';
    await page.keyboard.down(key);
    await sleep(220 + (i % 4) * 40);
    await page.keyboard.up(key);
    i++;
    await sleep(60);
  }
}

const PLAYERS = {
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

function ffmpegFramesToMp4(framesDir, mp4) {
  return new Promise((resolve, reject) => {
    const args = [
      '-y',
      '-framerate',
      String(FPS),
      '-i',
      path.join(framesDir, 'f%05d.jpg'),
      '-an',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-crf',
      '20',
      '-movflags',
      '+faststart',
      mp4,
    ];
    const p = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => {
      err += d.toString();
    });
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(err.slice(-500)))));
  });
}

async function recordOne(browser, port, game, lang) {
  const framesDir = path.join(TMP, `${game}-${lang}-frames`);
  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: W, height: H },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.showFullScreenAd = function () {};
  });

  const url = `http://127.0.0.1:${port}/${game}/index.html?rec=1&lang=${lang}`;
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitReady(page);
  await applyLang(page, lang);
  await page.evaluate(() => {
    window.showFullScreenAd = function () {};
  });

  const durationMs = game === 'neli' ? 28000 : DURATION_MS;
  console.log(`  playing ${game}/${lang}...`);

  // Neli: get past title + controls overlay before recording frames
  if (game === 'neli') {
    await page.waitForFunction(() => window.__rec, { timeout: 25000 });
    await sleep(600);
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
      await sleep(600);
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
    await sleep(800);
    console.log('  neli: gameplay ready, capturing...');
  }

  let frameIdx = 0;
  let capturing = true;
  const captureLoop = (async () => {
    const start = Date.now();
    while (capturing && Date.now() - start < durationMs + 800) {
      const t0 = Date.now();
      const file = path.join(framesDir, `f${String(frameIdx).padStart(5, '0')}.jpg`);
      await page.screenshot({ path: file, type: 'jpeg', quality: 82 });
      frameIdx++;
      const spent = Date.now() - t0;
      await sleep(Math.max(0, Math.floor(1000 / FPS) - spent));
    }
  })();

  // pass duration to players that care via page
  page.__ygDurationMs = durationMs;
  await PLAYERS[game](page);
  await sleep(500);
  capturing = false;
  await captureLoop;
  await context.close();

  const jpgs = fs.readdirSync(framesDir).filter((f) => f.endsWith('.jpg')).sort();
  if (jpgs.length < 10) throw new Error(`too few frames (${jpgs.length}) for ${game}/${lang}`);

  const storeName = lang === 'ru' ? 'gameplay-horizontal.mp4' : 'gameplay-horizontal-en.mp4';
  const mp4 = path.join(STORE_ROOT, game, storeName);
  await ffmpegFramesToMp4(framesDir, mp4);
  console.log(`  OK ${mp4} (${Math.round(fs.statSync(mp4).size / 1024)} KB, ${jpgs.length} frames)`);
  fs.rmSync(framesDir, { recursive: true, force: true });
  return mp4;
}

async function main() {
  fs.mkdirSync(TMP, { recursive: true });
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
        await recordOne(browser, port, game, lang);
      }
    }
  } finally {
    await browser.close();
    server.close();
  }
  console.log('\nAll real gameplay videos written.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
