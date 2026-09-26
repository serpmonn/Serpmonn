#!/usr/bin/env node
/**
 * Fifteen Short v2 — one-left near-miss loop:
 * Act1: one away → wrong slide → Almost…
 * Act2: same setup → correct → Solved… → loopBack
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('/root/.nvm/versions/node/v22.22.0/lib/node_modules/playwright');

const YANDEX_ROOT = '/var/www/serpmonn-dev/frontend/games/yandex';
const OUT_DIR = '/var/www/serpmonn-dev/backend/marketing/out/shorts-preview';
const OUT_FINAL = path.join(OUT_DIR, 'fifteen-v2-preview-en-serpmonn.mp4');
const AUDIO = '/var/www/serpmonn-dev/backend/marketing/assets/audio/default-11.mp3';
const FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
const TMP = '/tmp/fifteen-v2-short-rec';
const W = 1080;
const H = 1920;
const FPS = 10;
const DURATION_MS = 22000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
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

function run(cmd, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    child.stderr.on('data', (d) => {
      err += d.toString();
    });
    child.on('close', (code) => (code === 0 ? resolvePromise() : reject(new Error(`${cmd} ${code}: ${err.slice(-700)}`))));
  });
}

async function layout(page) {
  await page.evaluate(() => {
    const loc = window.SERPMONN_LOCALES && window.SERPMONN_LOCALES.en;
    if (loc && window.applySerpmonnLocale) window.applySerpmonnLocale(loc);
    window.showFullScreenAd = function () {};
    const style = document.createElement('style');
    style.textContent = `
      html, body { margin:0!important; width:100%!important; height:100%!important; background:#0e0f12!important; overflow:hidden!important; }
      .hint, .controls, #btnNewGame, #btnReset { display:none!important; }
      .page { max-width:none!important; width:100%!important; height:100%!important; margin:0!important; padding:64px 36px 80px!important; box-sizing:border-box!important; display:flex!important; flex-direction:column!important; }
      header { justify-content:center!important; margin:0 0 24px!important; }
      h1 { font-size:1.9rem!important; }
      .wrap { display:flex!important; flex-direction:column!important; flex:1!important; justify-content:center!important; gap:28px!important; grid-template-columns:none!important; }
      .panel { width:100%!important; box-sizing:border-box!important; }
      .game-board { width:min(920px,100%)!important; max-width:920px!important; gap:10px!important; padding:14px!important; }
      .tile { font-size:2.4rem!important; border-radius:14px!important; }
      .stats { display:grid!important; grid-template-columns:repeat(3,1fr)!important; gap:12px!important; font-size:1.2rem!important; text-align:center!important; }
      .end-overlay { background:rgba(0,0,0,.45)!important; }
      .end-message { font-size:2.8rem!important; font-weight:800!important; letter-spacing:.02em; }
    `;
    document.head.appendChild(style);
  });
}

async function main() {
  fs.mkdirSync(TMP, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
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
    await page.goto(`http://127.0.0.1:${port}/fifteen/index.html?rec=1&lang=en`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForFunction(() => window.__rec, { timeout: 15000 });
    await layout(page);
    await sleep(200);

    let frameIdx = 0;
    let capturing = true;
    const markers = {};
    const captureLoop = (async () => {
      const start = Date.now();
      while (capturing && Date.now() - start < DURATION_MS) {
        const t0 = Date.now();
        await page.screenshot({
          path: path.join(framesDir, `f${String(frameIdx).padStart(5, '0')}.jpg`),
          type: 'jpeg',
          quality: 88,
        });
        frameIdx++;
        await sleep(Math.max(0, Math.floor(1000 / FPS) - (Date.now() - t0)));
      }
    })();

    // --- Act 1: one left → wrong move → fail ---
    markers.act1 = frameIdx;
    await page.evaluate(() => window.__rec.setupNearSolved());
    await sleep(1100);
    markers.oneMore1 = frameIdx;
    await page.evaluate(() => window.__rec.moveIndex(13)); // wrong tile (14)
    await sleep(500);
    await page.evaluate(() => window.__rec.failNearEnd());
    markers.boom = frameIdx;
    await sleep(1300);
    markers.boomEnd = frameIdx;

    // --- Act 2: again → correct solve ---
    await page.evaluate(() => {
      window.__rec.hideEnd();
      window.__rec.setupNearSolved();
    });
    await sleep(700);
    markers.act2 = frameIdx;
    markers.oneMore2 = frameIdx;
    await page.evaluate(() => window.__rec.moveIndex(15)); // correct
    await sleep(400);
    markers.win = frameIdx;
    await sleep(1400);
    markers.winEnd = frameIdx;

    // --- Loop ---
    await page.evaluate(() => {
      window.__rec.hideEnd();
      window.__rec.setupNearSolved();
    });
    await sleep(600);
    markers.loopBack = frameIdx;

    capturing = false;
    await sleep(80);
    await captureLoop;
    await context.close();

    const cutAt = Math.min(frameIdx, (markers.loopBack || frameIdx) + Math.round(FPS * 0.35));
    let jpgs = fs.readdirSync(framesDir).filter((f) => f.endsWith('.jpg')).sort();
    for (const f of jpgs) {
      const n = parseInt(f.replace(/\D/g, ''), 10);
      if (n >= cutAt) fs.unlinkSync(path.join(framesDir, f));
    }
    jpgs = fs.readdirSync(framesDir).filter((f) => f.endsWith('.jpg')).sort();
    const loopN = 6;
    for (let i = 0; i < loopN; i++) {
      fs.copyFileSync(
        path.join(framesDir, jpgs[Math.min((markers.act1 || 0) + (i % 2), jpgs.length - 1)]),
        path.join(framesDir, `f${String(jpgs.length + i).padStart(5, '0')}.jpg`)
      );
    }
    const total = jpgs.length + loopN;
    const t = (f) => (Math.max(0, f) / FPS).toFixed(2);

    const silent = path.join(TMP, 'silent.mp4');
    await run('ffmpeg', [
      '-y', '-framerate', String(FPS), '-i', path.join(framesDir, 'f%05d.jpg'),
      '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18',
      '-vf',
      [
        'scale=1080:1920:flags=lanczos',
        `drawtext=fontfile=${FONT}:text='One left…':fontsize=64:fontcolor=white:borderw=4:bordercolor=black@0.85:x=(w-text_w)/2:y=h*0.88:enable='gte(t,${t(markers.oneMore1)})*lt(t,${t(markers.boom)})'`,
        `drawtext=fontfile=${FONT}:text='Almost…':fontsize=72:fontcolor=white:borderw=4:bordercolor=black@0.9:x=(w-text_w)/2:y=h*0.86:enable='gte(t,${t(markers.boom)})*lt(t,${t(markers.boomEnd)})'`,
        `drawtext=fontfile=${FONT}:text='serpmonn':fontsize=32:fontcolor=white@0.9:borderw=3:bordercolor=black@0.75:x=(w-text_w)/2:y=h*0.92:enable='gte(t,${t(markers.boom)})*lt(t,${t(markers.boomEnd)})'`,
        `drawtext=fontfile=${FONT}:text='Again…':fontsize=64:fontcolor=white:borderw=4:bordercolor=black@0.85:x=(w-text_w)/2:y=h*0.88:enable='gte(t,${t(markers.act2)})*lt(t,${t(markers.win)})'`,
        `drawtext=fontfile=${FONT}:text='Solved…':fontsize=72:fontcolor=white:borderw=4:bordercolor=black@0.9:x=(w-text_w)/2:y=h*0.86:enable='gte(t,${t(markers.win)})*lt(t,${t(markers.winEnd)})'`,
        `drawtext=fontfile=${FONT}:text='serpmonn':fontsize=32:fontcolor=white@0.9:borderw=3:bordercolor=black@0.75:x=(w-text_w)/2:y=h*0.92:enable='gte(t,${t(markers.win)})*lt(t,${t(markers.winEnd)})'`,
      ].join(','),
      silent,
    ]);

    const durSec = (total / FPS).toFixed(2);
    const fadeOut = Math.max(0.3, Number(durSec) - 0.4);
    await run('ffmpeg', [
      '-y', '-i', silent, '-stream_loop', '-1', '-i', AUDIO,
      '-filter_complex',
      `[1:a]atrim=0:${durSec},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.2,afade=t=out:st=${fadeOut}:d=0.35,volume=0.32[a]`,
      '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k',
      '-shortest', '-movflags', '+faststart', OUT_FINAL,
    ]);

    await run('ffmpeg', ['-y', '-ss', '1.0', '-i', OUT_FINAL, '-update', '1', '-frames:v', '1', path.join(OUT_DIR, 'fifteen-v2-first.jpg')]);
    await run('ffmpeg', ['-y', '-ss', '3.0', '-i', OUT_FINAL, '-update', '1', '-frames:v', '1', path.join(OUT_DIR, 'fifteen-v2-fail.jpg')]);
    await run('ffmpeg', ['-y', '-ss', '5.5', '-i', OUT_FINAL, '-update', '1', '-frames:v', '1', path.join(OUT_DIR, 'fifteen-v2-win.jpg')]);
    console.log('OK', OUT_FINAL, 'frames', total, 'dur', durSec, 'markers', markers);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
