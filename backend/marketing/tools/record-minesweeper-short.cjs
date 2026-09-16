#!/usr/bin/env node
/**
 * Minesweeper Shorts: two quick human-like endgames.
 * 1) clicks → boom   2) similar board clicks → win
 * Full board visible, no aggressive zoom.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('/root/.nvm/versions/node/v22.22.0/lib/node_modules/playwright');

const YANDEX_ROOT = '/var/www/serpmonn.ru/frontend/games/yandex';
const OUT_DIR = '/var/www/serpmonn.ru/backend/marketing/out/shorts-preview';
const OUT_SRC = path.join(OUT_DIR, '_src-minesweeper-dyn-en.mp4');
const OUT_FINAL = path.join(OUT_DIR, 'minesweeper-preview-en-serpmonn.mp4');
const OUT_ALT = path.join(OUT_DIR, 'minesweeper-preview-en-alt-a.mp4');
const AUDIO_DIR = '/var/www/serpmonn.ru/backend/marketing/assets/audio';
const FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
const TMP = '/tmp/minesweeper-short-rec';
const W = 1080;
const H = 1920;
const FPS = 12;
const DURATION_MS = 22000; // hard cap only

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

function run(cmd, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    child.stderr.on('data', (d) => {
      err += d.toString();
    });
    child.on('close', (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${cmd} ${code}: ${err.slice(-700)}`));
    });
  });
}

function pickAudio() {
  // games-1 used on previous minesweeper pass — rotate
  const prefer = ['games-6.mp3', 'games-2.mp3', 'games-9.mp3', 'games-10.mp3'];
  for (const n of prefer) {
    const p = path.join(AUDIO_DIR, n);
    if (fs.existsSync(p)) return p;
  }
  return path.join(AUDIO_DIR, 'games-6.mp3');
}

async function humanClicks(page, clicks) {
  for (let i = 0; i < clicks.length; i++) {
    const [x, y] = clicks[i];
    await page.evaluate(([cx, cy]) => window.__rec.reveal(cx, cy), [x, y]);
    const base = i === clicks.length - 1 ? 380 : 240;
    await sleep(base + (i % 3) * 40 + (i % 2) * 30);
  }
}

async function playCascade(page, markers, getFrame) {
  // --- Act 1: endgame clicks → Boom ---
  const loss = await page.evaluate(() => window.__rec.setupEndgameLoss());
  await sleep(450);
  markers.act1Start = getFrame();
  await humanClicks(page, loss.clicks);
  await sleep(220);
  markers.boom = getFrame();
  await sleep(700);
  markers.boomEnd = getFrame();

  // --- Act 2: similar endgame → win ---
  const win = await page.evaluate(() => window.__rec.setupEndgameWin());
  await sleep(400);
  markers.act2Start = getFrame();
  await humanClicks(page, win.clicks);
  await sleep(200);
  markers.win = getFrame();
  await sleep(400); // short Cleared beat
  markers.winEnd = getFrame();

  // --- Loopback: snap to opening board, brief hold ---
  await page.evaluate(() => window.__rec.setupEndgameLoss());
  await sleep(350);
  markers.loopBack = getFrame();

  return { loss, win, markers };
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
    const context = await browser.newContext({
      viewport: { width: W, height: H },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.showFullScreenAd = function () {};
    });
    await page.goto(`http://127.0.0.1:${port}/minesweeper/index.html?rec=1&lang=en`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForFunction(() => window.__rec, { timeout: 15000 });

    // Layout fills 9:16 so full board is visible — no ffmpeg zoom later
    await page.evaluate(() => {
      try {
        const loc = window.SERPMONN_LOCALES && window.SERPMONN_LOCALES.en;
        if (loc && window.applySerpmonnLocale) window.applySerpmonnLocale(loc);
      } catch (_) {}
      window.showFullScreenAd = function () {};
      const style = document.createElement('style');
      style.textContent = `
        html, body {
          margin: 0 !important;
          width: 100% !important;
          height: 100% !important;
          background: #0e1014 !important;
          overflow: hidden !important;
        }
        .hint, .controls { display: none !important; }
        .page {
          max-width: none !important;
          width: 100% !important;
          height: 100% !important;
          margin: 0 !important;
          padding: 56px 40px 72px !important;
          box-sizing: border-box !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
        }
        header {
          margin: 0 !important;
          justify-content: center !important;
          flex: 0 0 auto !important;
        }
        h1 { font-size: 1.85rem !important; }
        .wrap {
          flex: 1 1 auto !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: center !important;
          gap: 22px !important;
          width: 100% !important;
          min-height: 0 !important;
        }
        .panel { width: 100% !important; box-sizing: border-box !important; }
        .board-wrap { flex: 0 0 auto !important; }
        .board {
          width: 100% !important;
          max-width: 1000px !important;
          margin: 0 auto !important;
          grid-template-columns: repeat(10, 1fr) !important;
          grid-template-rows: repeat(10, 1fr) !important;
          gap: 6px !important;
          aspect-ratio: 1 / 1 !important;
          padding: 0 !important;
        }
        .cell { font-size: 1.45rem !important; border-radius: 11px !important; }
        .stats {
          display: grid !important;
          grid-template-columns: repeat(3, 1fr) !important;
          gap: 10px !important;
          font-size: 1.15rem !important;
          text-align: center !important;
        }
        .end-message { font-size: 2.4rem !important; font-weight: 800 !important; }
      `;
      document.head.appendChild(style);
    });
    await sleep(300);

    let frameIdx = 0;
    let capturing = true;
    const markers = {};
    const getFrame = () => frameIdx;

    const captureLoop = (async () => {
      const start = Date.now();
      while (capturing && Date.now() - start < DURATION_MS) {
        const t0 = Date.now();
        await page.screenshot({
          path: path.join(framesDir, `f${String(frameIdx).padStart(5, '0')}.jpg`),
          type: 'jpeg',
          quality: 88,
          fullPage: false,
        });
        frameIdx++;
        await sleep(Math.max(0, Math.floor(1000 / FPS) - (Date.now() - t0)));
      }
    })();

    console.log('recording two human endgames…');
    const plan = await playCascade(page, markers, getFrame);
    // stop capture immediately — no trailing dead air
    capturing = false;
    await sleep(120);
    await captureLoop;

    console.log('plan clicks', {
      loss: plan.loss.clicks.length,
      boom: plan.loss.boomClick,
      win: plan.win.clicks.length,
    });
    console.log('markers', markers);
    await context.close();

    // Trim frames after loopBack (+ small pad for seam)
    const cutAt = Math.min(
      frameIdx,
      (markers.loopBack || frameIdx) + Math.round(FPS * 0.35)
    );
    const allJpgs = fs.readdirSync(framesDir).filter((f) => f.endsWith('.jpg')).sort();
    for (const f of allJpgs) {
      const n = parseInt(f.replace(/\D/g, ''), 10);
      if (n >= cutAt) fs.unlinkSync(path.join(framesDir, f));
    }

    const jpgs = fs.readdirSync(framesDir).filter((f) => f.endsWith('.jpg')).sort();
    console.log('frames', jpgs.length, 'cutAt', cutAt);
    if (jpgs.length < 60) throw new Error('too few frames: ' + jpgs.length);

    // Seam: a few act1-start frames at the end for YouTube loop
    const loopStart = Math.max(0, markers.act1Start || 0);
    const loopN = Math.min(8, Math.max(5, Math.round(FPS * 0.45)));
    for (let i = 0; i < loopN; i++) {
      const srcIdx = Math.min(loopStart + (i % 3), jpgs.length - 1);
      fs.copyFileSync(
        path.join(framesDir, jpgs[srcIdx]),
        path.join(framesDir, `f${String(jpgs.length + i).padStart(5, '0')}.jpg`)
      );
    }
    const total = jpgs.length + loopN;

    const t = (f) => (Math.max(0, f) / FPS).toFixed(2);
    const act1 = t(markers.act1Start || 0);
    const boom = t(markers.boom || 40);
    const boomEnd = t(markers.boomEnd || 55);
    const act2 = t(markers.act2Start || 60);
    const win = t(markers.win || 90);
    const winEnd = t(markers.winEnd || (markers.win || 90) + 5);

    const silent = path.join(TMP, 'silent.mp4');
    await run('ffmpeg', [
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
      '-vf',
      [
        'scale=1080:1920:flags=lanczos',
        `drawtext=fontfile=${FONT}:text='One more…':fontsize=64:fontcolor=white:borderw=4:bordercolor=black@0.8:x=(w-text_w)/2:y=h*0.88:enable='gte(t,${act1})*lt(t,${boom})'`,
        `drawtext=fontfile=${FONT}:text='Boom…':fontsize=72:fontcolor=white:borderw=4:bordercolor=black@0.85:x=(w-text_w)/2:y=h*0.86:enable='gte(t,${boom})*lt(t,${boomEnd})'`,
        `drawtext=fontfile=${FONT}:text='serpmonn':fontsize=32:fontcolor=white@0.9:borderw=3:bordercolor=black@0.7:x=(w-text_w)/2:y=h*0.92:enable='gte(t,${boom})*lt(t,${boomEnd})'`,
        `drawtext=fontfile=${FONT}:text='Again…':fontsize=64:fontcolor=white:borderw=4:bordercolor=black@0.8:x=(w-text_w)/2:y=h*0.88:enable='gte(t,${act2})*lt(t,${win})'`,
        // Cleared only briefly — hide before loopback so seam is clean
        `drawtext=fontfile=${FONT}:text='Cleared…':fontsize=72:fontcolor=white:borderw=4:bordercolor=black@0.85:x=(w-text_w)/2:y=h*0.86:enable='gte(t,${win})*lt(t,${winEnd})'`,
        `drawtext=fontfile=${FONT}:text='serpmonn':fontsize=32:fontcolor=white@0.9:borderw=3:bordercolor=black@0.7:x=(w-text_w)/2:y=h*0.92:enable='gte(t,${win})*lt(t,${winEnd})'`,
      ].join(','),
      silent,
    ]);
    fs.copyFileSync(silent, OUT_SRC);

    const audio = pickAudio();
    const durSec = (total / FPS).toFixed(2);
    const fadeOut = Math.max(0.3, Number(durSec) - 0.4);
    for (const dest of [OUT_FINAL, OUT_ALT]) {
      await run('ffmpeg', [
        '-y',
        '-i',
        silent,
        '-stream_loop',
        '-1',
        '-i',
        audio,
        '-filter_complex',
        `[1:a]atrim=0:${durSec},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.25,afade=t=out:st=${fadeOut}:d=0.35,volume=0.28[a]`,
        '-map',
        '0:v',
        '-map',
        '[a]',
        '-c:v',
        'copy',
        '-c:a',
        'aac',
        '-b:a',
        '128k',
        '-shortest',
        '-movflags',
        '+faststart',
        dest,
      ]);
    }

    await run('ffmpeg', ['-y', '-ss', '0.5', '-i', OUT_FINAL, '-frames:v', '1', path.join(OUT_DIR, 'minesweeper-firstframe.jpg')]);
    await run('ffmpeg', [
      '-y',
      '-ss',
      String((Number(boom) + 0.25).toFixed(2)),
      '-i',
      OUT_FINAL,
      '-frames:v',
      '1',
      path.join(OUT_DIR, 'minesweeper-boomframe.jpg'),
    ]);
    await run('ffmpeg', [
      '-y',
      '-ss',
      String((Number(win) + 0.35).toFixed(2)),
      '-i',
      OUT_FINAL,
      '-frames:v',
      '1',
      path.join(OUT_DIR, 'minesweeper-winframe.jpg'),
    ]);

    console.log('OK', OUT_FINAL);
    console.log('audio', audio);
    console.log('duration', durSec, { act1, boom, boomEnd, act2, win });
    console.log('size', Math.round(fs.statSync(OUT_FINAL).size / 1024), 'KB');
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
