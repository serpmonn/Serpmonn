#!/usr/bin/env node
/**
 * High-motion Red Square capture for YouTube Shorts.
 * Smarter dodge bot + level pressure + 20fps.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('/root/.nvm/versions/node/v22.22.0/lib/node_modules/playwright');

const YANDEX_ROOT = '/var/www/serpmonn.ru/frontend/games/yandex';
const OUT_MP4 = '/var/www/serpmonn.ru/backend/marketing/out/shorts-preview/_src-redsquare-dyn-en.mp4';
const TMP = '/tmp/rs-short-rec';
const W = 1920;
const H = 1080;
const FPS = 20;
const DURATION_MS = 24000;
const PRESSURE_LEVEL = 4;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
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
      const filePath = path.join(YANDEX_ROOT, decodeURIComponent(url.pathname));
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

async function ensurePressure(page) {
  await page.evaluate((lvl) => {
    const modal = document.querySelector('.modal');
    if (modal) {
      const ok = document.getElementById('okButton');
      if (ok) ok.click();
      else modal.remove();
    }
    const st = window.__rec.getState();
    if (!st.started || st.lives <= 0 || st.level < 3 || st.enemies < 3) {
      if (window.__rec.reset) window.__rec.reset();
      window.__rec.pressure(lvl);
    } else {
      document.querySelectorAll('.enemy-fast, .enemy-slow').forEach((enemy) => {
        enemy.style.animationDuration = '0.65s';
      });
    }
  }, PRESSURE_LEVEL);
}

async function playSmart(page) {
  await page.waitForFunction(() => window.__rec && window.__rec.pressure, { timeout: 15000 });
  await page.evaluate(() => {
    const b = document.getElementById('understandBtn');
    if (b) b.click();
  });
  await sleep(120);
  await page.evaluate((lvl) => {
    window.__rec.start();
    window.__rec.pressure(lvl);
  }, PRESSURE_LEVEL);
  await sleep(200);

  const end = Date.now() + DURATION_MS - 400;
  let lastKey = null;
  let lastPressure = Date.now();
  let samples = [];

  while (Date.now() < end) {
    if (Date.now() - lastPressure > 2800) {
      await ensurePressure(page);
      lastPressure = Date.now();
    }

    const decision = await page.evaluate(() => {
      const st = window.__rec && window.__rec.getState();
      if (!st || !st.started || st.lives <= 0) return { action: 'restart', st };
      const area = document.getElementById('gameArea') || document.querySelector('.game-area');
      const player = document.getElementById('player');
      if (!area || !player) return { action: 'wait', st };
      const ar = area.getBoundingClientRect();
      const pr = player.getBoundingClientRect();
      const px = pr.left + pr.width / 2 - ar.left;
      const py = pr.top + pr.height / 2 - ar.top;
      const aw = ar.width;
      const ah = ar.height;

      const threats = [];
      document.querySelectorAll('.enemy-fast, .enemy-slow, .obstacle').forEach((el) => {
        const r = el.getBoundingClientRect();
        const dx = r.left + r.width / 2 - ar.left - px;
        const dy = r.top + r.height / 2 - ar.top - py;
        threats.push({ dx, dy, dist: Math.hypot(dx, dy) });
      });
      threats.sort((a, b) => a.dist - b.dist);
      const nearest = threats[0];

      let bonus = null;
      const bEl = document.querySelector('.bonus');
      if (bEl) {
        const r = bEl.getBoundingClientRect();
        const dx = r.left + r.width / 2 - ar.left - px;
        const dy = r.top + r.height / 2 - ar.top - py;
        bonus = { dx, dy, dist: Math.hypot(dx, dy) };
      }

      const dangerR = Math.max(aw, ah) * 0.3;
      const pickFlee = () => {
        const absx = Math.abs(nearest.dx);
        const absy = Math.abs(nearest.dy);
        let key = absx > absy ? (nearest.dx > 0 ? 'ArrowLeft' : 'ArrowRight') : nearest.dy > 0 ? 'ArrowUp' : 'ArrowDown';
        if (key === 'ArrowLeft' && px < aw * 0.12) key = absy > 1 ? (nearest.dy > 0 ? 'ArrowUp' : 'ArrowDown') : 'ArrowRight';
        if (key === 'ArrowRight' && px > aw * 0.88) key = absy > 1 ? (nearest.dy > 0 ? 'ArrowUp' : 'ArrowDown') : 'ArrowLeft';
        if (key === 'ArrowUp' && py < ah * 0.12) key = absx > 1 ? (nearest.dx > 0 ? 'ArrowLeft' : 'ArrowRight') : 'ArrowDown';
        if (key === 'ArrowDown' && py > ah * 0.88) key = absx > 1 ? (nearest.dx > 0 ? 'ArrowLeft' : 'ArrowRight') : 'ArrowUp';
        return key;
      };

      if (nearest && nearest.dist < dangerR) {
        return { action: 'key', key: pickFlee(), dist: nearest.dist, st };
      }
      if (bonus && bonus.dist > 8) {
        const key =
          Math.abs(bonus.dx) > Math.abs(bonus.dy)
            ? bonus.dx > 0
              ? 'ArrowRight'
              : 'ArrowLeft'
            : bonus.dy > 0
              ? 'ArrowDown'
              : 'ArrowUp';
        return { action: 'key', key, dist: nearest ? nearest.dist : 999, st };
      }
      const roam = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
      return {
        action: 'key',
        key: roam[Math.floor(Math.random() * 4)],
        dist: nearest ? nearest.dist : 999,
        st,
      };
    });

    if (decision.st && samples.length < 8) {
      samples.push({ t: Math.round((DURATION_MS - (end - Date.now())) / 1000), ...decision.st, dist: decision.dist });
    }

    if (decision.action === 'restart') {
      await ensurePressure(page);
      lastPressure = Date.now();
      lastKey = null;
      await sleep(180);
      continue;
    }
    if (decision.action === 'key') {
      await page.keyboard.down(decision.key);
      lastKey = decision.key;
      const hold = decision.dist < 70 ? 50 : decision.dist < 130 ? 85 : 120;
      await sleep(hold);
      await page.keyboard.up(decision.key);
      lastKey = null;
      await sleep(decision.dist < 90 ? 18 : 35);
      continue;
    }
    await sleep(50);
  }
  if (lastKey) await page.keyboard.up(lastKey);
  console.log('samples', JSON.stringify(samples));
}

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
      '18',
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

async function main() {
  fs.mkdirSync(TMP, { recursive: true });
  fs.mkdirSync(path.dirname(OUT_MP4), { recursive: true });
  const framesDir = path.join(TMP, 'frames');
  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });

  const { server, port } = await startServer();
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  try {
    const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.showFullScreenAd = function () {};
    });
    await page.goto(`http://127.0.0.1:${port}/redsquare/index.html?rec=1&lang=en`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForFunction(
      () => !!(document.querySelector('#gameArea') || document.querySelector('.game-area')),
      { timeout: 20000 }
    );
    await page.evaluate(() => {
      try {
        const loc = window.SERPMONN_LOCALES && window.SERPMONN_LOCALES.en;
        if (loc && window.applySerpmonnLocale) window.applySerpmonnLocale(loc);
      } catch (_) {}
      window.showFullScreenAd = function () {};
    });

    let frameIdx = 0;
    let capturing = true;
    const captureLoop = (async () => {
      const start = Date.now();
      while (capturing && Date.now() - start < DURATION_MS + 1000) {
        const t0 = Date.now();
        const file = path.join(framesDir, `f${String(frameIdx).padStart(5, '0')}.jpg`);
        await page.screenshot({ path: file, type: 'jpeg', quality: 86 });
        frameIdx++;
        await sleep(Math.max(0, Math.floor(1000 / FPS) - (Date.now() - t0)));
      }
    })();

    console.log('recording pressure dodge…');
    await playSmart(page);
    await sleep(300);
    capturing = false;
    await captureLoop;

    const last = await page.evaluate(() => window.__rec.getState());
    console.log('final state', last);
    await context.close();

    const jpgs = fs.readdirSync(framesDir).filter((f) => f.endsWith('.jpg')).sort();
    console.log('frames', jpgs.length);
    if (jpgs.length < 30) throw new Error('too few frames');
    await ffmpegFramesToMp4(framesDir, OUT_MP4);
    console.log('OK', OUT_MP4, Math.round(fs.statSync(OUT_MP4).size / 1024), 'KB');
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
