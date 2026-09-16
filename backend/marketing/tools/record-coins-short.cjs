#!/usr/bin/env node
/** High-motion Coins capture for YouTube Shorts. */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('/root/.nvm/versions/node/v22.22.0/lib/node_modules/playwright');

const YANDEX_ROOT = '/var/www/serpmonn.ru/frontend/games/yandex';
const OUT_MP4 = '/var/www/serpmonn.ru/backend/marketing/out/shorts-preview/_src-coins-dyn-en.mp4';
const TMP = '/tmp/coins-short-rec';
const W = 1920;
const H = 1080;
const FPS = 20;
const DURATION_MS = 22000;

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
  await page.waitForFunction(() => window.__rec && window.__rec.pressure, { timeout: 15000 });
  await page.evaluate(() => {
    window.__rec.reset();
    window.__rec.start();
    window.__rec.pressure({ badCount: 9, tick: 130, time: 40 });
  });
  await sleep(200);

  const end = Date.now() + DURATION_MS - 400;
  let lastPressure = Date.now();

  while (Date.now() < end) {
    if (Date.now() - lastPressure > 4000) {
      await page.evaluate(() => {
        const st = window.__rec.getState();
        if (!st.alive || !st.started) {
          window.__rec.reset();
          window.__rec.start();
        }
        window.__rec.pressure({ badCount: 10, tick: 120, time: Math.max(12, (st && st.timeLeft) || 30) });
      });
      lastPressure = Date.now();
    }

    const decision = await page.evaluate(() => {
      const st = window.__rec.getState();
      if (!st || !st.alive) return { action: 'restart' };
      if (!st.started) return { action: 'start' };
      const p = st.player;
      if (!p) return { action: 'wait' };

      // dodge adjacent bads first
      const danger = (st.bads || []).filter((b) => Math.abs(b.x - p.x) + Math.abs(b.y - p.y) <= 2);
      if (danger.length) {
        const dirs = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ];
        let best = null;
        for (const [vx, vy] of dirs) {
          const nx = (p.x + vx + st.cells) % st.cells;
          const ny = (p.y + vy + st.cells) % st.cells;
          if ((st.bads || []).some((b) => b.x === nx && b.y === ny)) continue;
          const minD = Math.min(...(st.bads || []).map((b) => Math.abs(b.x - nx) + Math.abs(b.y - ny)));
          if (!best || minD > best.minD) best = { vx, vy, minD };
        }
        if (best) return { action: 'dir', vx: best.vx, vy: best.vy, score: st.score, bads: st.bads.length };
      }

      let target = null;
      let bestD = 1e9;
      for (const c of st.coins || []) {
        const d = Math.abs(c.x - p.x) + Math.abs(c.y - p.y);
        if (d < bestD) {
          bestD = d;
          target = c;
        }
      }
      if (!target) return { action: 'wait', score: st.score };

      let vx = 0;
      let vy = 0;
      if (Math.abs(target.x - p.x) >= Math.abs(target.y - p.y)) vx = target.x > p.x ? 1 : target.x < p.x ? -1 : 0;
      else vy = target.y > p.y ? 1 : target.y < p.y ? -1 : 0;

      const nx = (p.x + vx + st.cells) % st.cells;
      const ny = (p.y + vy + st.cells) % st.cells;
      if ((st.bads || []).some((b) => b.x === nx && b.y === ny)) {
        if (vx !== 0) {
          vx = 0;
          vy = Math.random() < 0.5 ? 1 : -1;
        } else {
          vy = 0;
          vx = Math.random() < 0.5 ? 1 : -1;
        }
      }
      return { action: 'dir', vx, vy, score: st.score, bads: (st.bads || []).length, dist: bestD };
    });

    if (decision.action === 'restart' || decision.action === 'start') {
      await page.evaluate(() => {
        window.__rec.reset();
        window.__rec.start();
        window.__rec.pressure({ badCount: 9, tick: 125, time: 38 });
      });
      lastPressure = Date.now();
      await sleep(150);
      continue;
    }
    if (decision.action === 'dir') {
      await page.evaluate(({ vx, vy }) => window.__rec.setDir(vx, vy), decision);
      await sleep(decision.dist != null && decision.dist <= 2 ? 90 : 130);
      continue;
    }
    await sleep(80);
  }
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
        '18',
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
    await page.goto(`http://127.0.0.1:${port}/coins/index.html?rec=1&lang=en`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForSelector('#game', { timeout: 20000 });
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
        await page.screenshot({
          path: path.join(framesDir, `f${String(frameIdx).padStart(5, '0')}.jpg`),
          type: 'jpeg',
          quality: 86,
        });
        frameIdx++;
        await sleep(Math.max(0, Math.floor(1000 / FPS) - (Date.now() - t0)));
      }
    })();

    console.log('recording coins chase…');
    await playSmart(page);
    await sleep(300);
    capturing = false;
    await captureLoop;

    const info = await page.evaluate(() => {
      const st = window.__rec.getState();
      const canvas = document.getElementById('game');
      const h1 = document.querySelector('h1');
      const ar = canvas.getBoundingClientRect();
      const tr = h1 ? h1.getBoundingClientRect() : ar;
      const left = Math.min(tr.left, ar.left) - 20;
      const right = Math.max(tr.right, ar.right) + 20;
      const top = Math.min(tr.top, ar.top) - 12;
      const bottom = ar.bottom + 24;
      return {
        state: st,
        crop: {
          x: Math.max(0, Math.round(left)),
          y: Math.max(0, Math.round(top)),
          w: Math.round(right - left),
          h: Math.round(bottom - top),
        },
      };
    });
    console.log('final', info.state);
    console.log('crop', info.crop);
    const crop = info.crop;
    fs.writeFileSync('/tmp/coins-crop.txt', `${crop.x}:${crop.y}:${crop.w}:${crop.h}`);
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
