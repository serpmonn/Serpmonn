#!/usr/bin/env node
/**
 * Fifteen Short v3 — show NEW modes in one clip:
 * Easy 3×3 → Daily → Undo → Sound → Classic 4×4 → Almost → Solved → loop Easy
 * Light theme throughout (new look vs old dark-only short).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('/root/.nvm/versions/node/v22.22.0/lib/node_modules/playwright');

const YANDEX_ROOT = '/var/www/serpmonn-dev/frontend/games/yandex';
const OUT_DIR = '/var/www/serpmonn-dev/backend/marketing/out/shorts-preview';
const OUT_FINAL = path.join(OUT_DIR, 'fifteen-v3-modes-en-serpmonn.mp4');
const AUDIO = '/var/www/serpmonn-dev/backend/marketing/assets/audio/default-12.mp3';
const FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
const TMP = '/tmp/fifteen-v3-short-rec';
const W = 1080;
const H = 1920;
const FPS = 10;
const DURATION_MS = 28000;

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
      html, body { margin:0!important; width:100%!important; height:100%!important; overflow:hidden!important; }
      .hint { display:none!important; }
      #btnNewGame, #btnReset, #btnTheme { display:none!important; }
      .page { max-width:none!important; width:100%!important; height:100%!important; margin:0!important; padding:48px 28px 40px!important; box-sizing:border-box!important; display:flex!important; flex-direction:column!important; }
      header { justify-content:center!important; margin:0 0 16px!important; }
      h1 { font-size:1.85rem!important; }
      .wrap { display:flex!important; flex-direction:column!important; flex:1!important; justify-content:center!important; gap:18px!important; grid-template-columns:none!important; }
      .panel { width:100%!important; box-sizing:border-box!important; }
      .game-board { width:min(860px,100%)!important; max-width:860px!important; gap:10px!important; padding:14px!important; }
      .tile { font-size:2.35rem!important; border-radius:14px!important; }
      .stats { display:grid!important; grid-template-columns:repeat(3,1fr)!important; gap:12px!important; font-size:1.15rem!important; text-align:center!important; }
      .mode-label { font-size:1.35rem!important; font-weight:700!important; margin:10px 0 6px!important; text-align:center!important; }
      .controls { display:flex!important; flex-wrap:wrap!important; justify-content:center!important; gap:10px!important; margin-top:10px!important; }
      .controls .btn { font-size:1.05rem!important; padding:12px 16px!important; min-height:48px!important; }
      .end-overlay { background:rgba(0,0,0,.4)!important; }
      .end-message { font-size:2.6rem!important; font-weight:800!important; }
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

    // Light theme = visibly "new" vs old dark short
    await page.evaluate(() => window.__rec.setTheme('light'));
    await page.evaluate(() => window.__rec.setSound(false));

    // 1) Easy 3×3
    markers.act1 = frameIdx;
    await page.evaluate(() => window.__rec.setupEasyNear());
    await sleep(900);
    markers.easy = frameIdx;

    // 2) Daily
    await page.evaluate(() => window.__rec.setupEasyDailyNear());
    await sleep(900);
    markers.daily = frameIdx;

    // 3) Wrong move → Undo
    await page.evaluate(() => window.__rec.moveIndex(6));
    await sleep(450);
    markers.oops = frameIdx;
    await page.evaluate(() => window.__rec.undo());
    await sleep(700);
    markers.undo = frameIdx;

    // 4) Sound on (button text changes)
    await page.evaluate(() => window.__rec.setSound(true));
    await sleep(700);
    markers.sound = frameIdx;

    // 5) Classic 4×4
    await page.evaluate(() => window.__rec.setupNearSolved());
    await sleep(900);
    markers.classic = frameIdx;

    // 6) Fail → Again → Solved
    await page.evaluate(() => window.__rec.moveIndex(13));
    await sleep(400);
    await page.evaluate(() => window.__rec.failNearEnd());
    markers.boom = frameIdx;
    await sleep(1100);
    markers.boomEnd = frameIdx;

    await page.evaluate(() => {
      window.__rec.hideEnd();
      window.__rec.setupNearSolved();
    });
    await sleep(600);
    markers.again = frameIdx;
    await page.evaluate(() => window.__rec.moveIndex(15));
    await sleep(450);
    markers.win = frameIdx;
    await sleep(1200);
    markers.winEnd = frameIdx;

    // Loop back to Easy 3×3 light cliffhanger
    await page.evaluate(() => {
      window.__rec.hideEnd();
      window.__rec.setTheme('light');
      window.__rec.setupEasyNear();
    });
    await sleep(650);
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
        `drawtext=fontfile=${FONT}:text='Easy 3×3…':fontsize=60:fontcolor=#1c1a16:borderw=3:bordercolor=white@0.85:x=(w-text_w)/2:y=h*0.88:enable='gte(t,${t(markers.easy)})*lt(t,${t(markers.daily)})'`,
        `drawtext=fontfile=${FONT}:text='Daily…':fontsize=64:fontcolor=#1c1a16:borderw=3:bordercolor=white@0.85:x=(w-text_w)/2:y=h*0.88:enable='gte(t,${t(markers.daily)})*lt(t,${t(markers.oops)})'`,
        `drawtext=fontfile=${FONT}:text='Undo…':fontsize=64:fontcolor=#1c1a16:borderw=3:bordercolor=white@0.85:x=(w-text_w)/2:y=h*0.88:enable='gte(t,${t(markers.undo)})*lt(t,${t(markers.sound)})'`,
        `drawtext=fontfile=${FONT}:text='Sound…':fontsize=60:fontcolor=#1c1a16:borderw=3:bordercolor=white@0.85:x=(w-text_w)/2:y=h*0.88:enable='gte(t,${t(markers.sound)})*lt(t,${t(markers.classic)})'`,
        `drawtext=fontfile=${FONT}:text='Classic 4×4…':fontsize=56:fontcolor=#1c1a16:borderw=3:bordercolor=white@0.85:x=(w-text_w)/2:y=h*0.88:enable='gte(t,${t(markers.classic)})*lt(t,${t(markers.boom)})'`,
        `drawtext=fontfile=${FONT}:text='Almost…':fontsize=72:fontcolor=#1c1a16:borderw=4:bordercolor=white@0.9:x=(w-text_w)/2:y=h*0.86:enable='gte(t,${t(markers.boom)})*lt(t,${t(markers.boomEnd)})'`,
        `drawtext=fontfile=${FONT}:text='Solved…':fontsize=72:fontcolor=#1c1a16:borderw=4:bordercolor=white@0.9:x=(w-text_w)/2:y=h*0.86:enable='gte(t,${t(markers.win)})*lt(t,${t(markers.winEnd)})'`,
        `drawtext=fontfile=${FONT}:text='serpmonn':fontsize=32:fontcolor=#1c1a16@0.9:borderw=3:bordercolor=white@0.75:x=(w-text_w)/2:y=h*0.92:enable='gte(t,${t(markers.win)})*lt(t,${t(markers.winEnd)})'`,
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

    await run('ffmpeg', ['-y', '-ss', '0.8', '-i', OUT_FINAL, '-update', '1', '-frames:v', '1', path.join(OUT_DIR, 'fifteen-v3-easy.jpg')]);
    await run('ffmpeg', ['-y', '-ss', '3.5', '-i', OUT_FINAL, '-update', '1', '-frames:v', '1', path.join(OUT_DIR, 'fifteen-v3-undo.jpg')]);
    await run('ffmpeg', ['-y', '-ss', '7.5', '-i', OUT_FINAL, '-update', '1', '-frames:v', '1', path.join(OUT_DIR, 'fifteen-v3-classic.jpg')]);
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
