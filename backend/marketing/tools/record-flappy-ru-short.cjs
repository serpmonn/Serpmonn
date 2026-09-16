#!/usr/bin/env node
/** Flappy RU Shorts capture: real near-miss with score, canvas+title crop. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('/root/.nvm/versions/node/v22.22.0/lib/node_modules/playwright');

const YANDEX_ROOT = '/var/www/serpmonn.ru/frontend/games/yandex';
const OUT_MP4 = '/var/www/serpmonn.ru/backend/marketing/out/shorts-preview/_src-flappy-ru-dyn.mp4';
const TMP = '/tmp/flappy-ru-rec2';
const W = 1920;
const H = 1080;
const FPS = 24;
const DURATION_MS = 32000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
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

async function playSmart(page) {
  await page.waitForFunction(() => window.__rec, { timeout: 15000 });
  await page.evaluate(() => {
    try {
      const loc = window.SERPMONN_LOCALES && window.SERPMONN_LOCALES.ru;
      if (loc && window.applySerpmonnLocale) window.applySerpmonnLocale(loc);
    } catch (_) {}
  });
  await page.evaluate(() => window.__rec.start());
  await sleep(200);

  const end = Date.now() + DURATION_MS - 500;
  let bestScore = 0;

  while (Date.now() < end) {
    const st = await page.evaluate(() => window.__rec.getState());
    if (!st || !st.alive || !st.gameActive) {
      if (st && st.score > bestScore) bestScore = st.score;
      await page.evaluate(() => window.__rec.restart());
      await sleep(90);
      continue;
    }
    if (st.score > bestScore) bestScore = st.score;

    let targetY = st.H / 2;
    const ahead = (st.pipes || [])
      .filter((p) => p.x + st.pipeWidth > st.bird.x - 6)
      .sort((a, b) => a.x - b.x);
    if (ahead[0]) targetY = ahead[0].gapY != null ? ahead[0].gapY : ahead[0].top + st.gap / 2;

    const pred = st.bird.y + st.bird.vy * 5;
    if (pred > targetY + 8) {
      await page.evaluate(() => window.__rec.flap());
    }
    await sleep(40);
  }
  console.log('bestScore', bestScore);
  return bestScore;
}

function ffmpegFramesToMp4(framesDir, mp4) {
  return new Promise((resolve, reject) => {
    const p = spawn(
      'ffmpeg',
      [
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
        '17',
        '-movflags',
        '+faststart',
        mp4,
      ],
      { stdio: ['ignore', 'ignore', 'pipe'] }
    );
    let err = '';
    p.stderr.on('data', (d) => {
      err += d.toString();
    });
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(err.slice(-500)))));
  });
}

async function main() {
  fs.mkdirSync(path.dirname(OUT_MP4), { recursive: true });
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(TMP, { recursive: true });
  const framesDir = path.join(TMP, 'frames');
  fs.mkdirSync(framesDir);

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
    await page.goto(`http://127.0.0.1:${port}/flappy/index.html?rec=1&lang=ru`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForSelector('#game', { timeout: 20000 });

    // Crop box: title + canvas only (no side Start panel)
    const crop = await page.evaluate(() => {
      const canvas = document.getElementById('game');
      const h1 = document.querySelector('h1');
      const ar = canvas.getBoundingClientRect();
      const tr = h1 ? h1.getBoundingClientRect() : ar;
      const left = Math.min(tr.left, ar.left) - 10;
      const right = Math.max(tr.right, ar.right) + 10;
      const top = Math.min(tr.top, ar.top) - 8;
      const bottom = ar.bottom + 8;
      return {
        x: Math.max(0, Math.round(left)),
        y: Math.max(0, Math.round(top)),
        w: Math.round(right - left),
        h: Math.round(bottom - top),
      };
    });
    console.log('crop', crop);
    fs.writeFileSync('/tmp/flappy-ru-crop.txt', `${crop.x}:${crop.y}:${crop.w}:${crop.h}`);

    let frameIdx = 0;
    let capturing = true;
    const captureLoop = (async () => {
      const start = Date.now();
      while (capturing && Date.now() - start < DURATION_MS + 1000) {
        const t0 = Date.now();
        // clip to title+canvas region
        await page.screenshot({
          path: path.join(framesDir, `f${String(frameIdx).padStart(5, '0')}.jpg`),
          type: 'jpeg',
          quality: 88,
          clip: { x: crop.x, y: crop.y, width: crop.w, height: crop.h },
        });
        frameIdx++;
        await sleep(Math.max(0, Math.floor(1000 / FPS) - (Date.now() - t0)));
      }
    })();

    console.log('recording flappy near-miss…');
    const best = await playSmart(page);
    await sleep(400);
    capturing = false;
    await captureLoop;

    const last = await page.evaluate(() => window.__rec.getState());
    console.log('final', { score: last.score, alive: last.alive, best });
    await context.close();

    if (frameIdx < 40) throw new Error('too few frames');
    await ffmpegFramesToMp4(framesDir, OUT_MP4);
    console.log('OK', OUT_MP4, Math.round(fs.statSync(OUT_MP4).size / 1024), 'KB', 'frames', frameIdx);
    if (best < 2) console.warn('WARN bestScore < 2 — clip may still be weak');
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
