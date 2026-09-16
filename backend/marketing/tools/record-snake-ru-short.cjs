#!/usr/bin/env node
/**
 * Snake RU Shorts: same near-miss as EN, Russian UI/text.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('/root/.nvm/versions/node/v22.22.0/lib/node_modules/playwright');

const YANDEX_ROOT = '/var/www/serpmonn.ru/frontend/games/yandex';
const OUT_DIR = '/var/www/serpmonn.ru/backend/marketing/out/shorts-preview';
const OUT_FINAL = path.join(OUT_DIR, 'snake-preview-ru-serpmonn.mp4');
const AUDIO_DIR = '/var/www/serpmonn.ru/backend/marketing/assets/audio';
const FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
const TMP = '/tmp/snake-ru-short-frames';
const W = 1080;
const H = 1920;
const FPS = 12;
const DURATION_MS = 7200;

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
      if (rel.startsWith('/snake/')) rel = rel.slice('/snake/'.length);
      rel = rel.replace(/^\/+/, '');
      const filePath = path.join(YANDEX_ROOT, 'snake', rel);
      if (!filePath.startsWith(path.join(YANDEX_ROOT, 'snake')) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
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
      else reject(new Error(`${cmd} ${code}: ${err.slice(-600)}`));
    });
  });
}

function pickAudio() {
  const prefer = ['games-2.mp3', 'games-9.mp3', 'games-10.mp3', 'games-12.mp3'];
  for (const n of prefer) {
    const p = path.join(AUDIO_DIR, n);
    if (fs.existsSync(p)) return p;
  }
  return path.join(AUDIO_DIR, 'games-2.mp3');
}

async function playTowardFoodThenCrash(page) {
  await page.waitForFunction(() => window.__rec && window.__rec.getState, { timeout: 8000 });
  await sleep(80);
  const start = Date.now();
  while (Date.now() - start < DURATION_MS - 2000) {
    await page.evaluate(() => {
      const st = window.__rec.getState();
      if (!st || !st.alive || !st.food || !st.snake.length) return false;
      const head = st.snake[0];
      const body = new Set(st.snake.slice(1).map((s) => `${s.x},${s.y}`));
      const wrap = (from, to, size) => {
        let d = to - from;
        if (d > size / 2) d -= size;
        if (d < -size / 2) d += size;
        return d;
      };
      const dx = wrap(head.x, st.food.x, st.grid);
      const dy = wrap(head.y, st.food.y, st.grid);
      const opts = [];
      if (dx !== 0) opts.push({ x: dx > 0 ? 1 : -1, y: 0, pri: Math.abs(dx) });
      if (dy !== 0) opts.push({ x: 0, y: dy > 0 ? 1 : -1, pri: Math.abs(dy) });
      opts.sort((a, b) => b.pri - a.pri);
      opts.push({ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 });
      for (const o of opts) {
        if (o.x === -st.dir.x && o.y === -st.dir.y) continue;
        const nx = (head.x + o.x + st.grid) % st.grid;
        const ny = (head.y + o.y + st.grid) % st.grid;
        if (body.has(`${nx},${ny}`)) continue;
        window.__rec.setDir(o.x, o.y);
        return true;
      }
      return false;
    });
    await sleep(80);
  }
  await page.evaluate(() => {
    window.i18n = Object.assign({}, window.i18n || {}, {
      gameOver: 'Почти…',
      pressRToRestart: 'serpmonn',
    });
  });
  for (const [nx, ny] of [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
    [1, 0],
    [0, 1],
  ]) {
    await page.evaluate(({ nx, ny }) => window.__rec.setDir(nx, ny), { nx, ny });
    await sleep(140);
  }
  await sleep(900);
}

async function main() {
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(TMP, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const { server, port } = await startServer();
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: W, height: H },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.showFullScreenAd = function () {};
    });
    await page.goto(`http://127.0.0.1:${port}/snake/index.html?rec=1&lang=ru`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForSelector('#game');
    await page.evaluate(() => {
      window.showFullScreenAd = function () {};
      if (window.SERPMONN_LOCALES && window.applySerpmonnLocale) {
        window.applySerpmonnLocale(window.SERPMONN_LOCALES.ru);
      }
      window.i18n = Object.assign({}, window.i18n || {}, {
        gameOver: 'Почти…',
        pressRToRestart: 'serpmonn',
      });
      const style = document.createElement('style');
      style.textContent = `
        .ad-top-banner, #menuContainer, .mobile-anchor-ad, .hint,
        .controls, #btnStart, #btnPause, #btnReset { display: none !important; }
        html, body { background: #0c0c0e !important; margin: 0 !important; height: 100% !important; overflow: hidden !important; }
        .page {
          height: 100% !important;
          display: flex !important;
          flex-direction: column !important;
          justify-content: space-between !important;
          align-items: center !important;
          padding: 48px 24px 64px !important;
          box-sizing: border-box !important;
        }
        header {
          display: flex !important;
          justify-content: center;
          align-items: center;
          gap: 10px;
          width: 100%;
        }
        header h1 { font-size: 1.7rem !important; letter-spacing: 0.04em; }
        .wrap { width: 100%; align-items: center; flex: 1; display: flex; flex-direction: column; justify-content: center; gap: 18px; }
        .wrap > .panel:first-child { width: 100%; display: flex; justify-content: center; }
        canvas#game {
          width: min(92vw, 980px) !important;
          max-width: 92vw !important;
          margin: 0 auto !important;
        }
        .wrap > .panel:last-child { width: 100%; display: flex; justify-content: center; }
        .stats { justify-content: center; }
        [data-i18n-speed], [data-i18n-field] { display: none !important; }
      `;
      document.head.appendChild(style);
    });
    await sleep(400);

    let frameIdx = 0;
    let capturing = true;
    const captureLoop = (async () => {
      const t0 = Date.now();
      while (capturing && Date.now() - t0 < DURATION_MS + 800) {
        const shotT = Date.now();
        await page.screenshot({
          path: path.join(TMP, `f${String(frameIdx).padStart(5, '0')}.jpg`),
          type: 'jpeg',
          quality: 86,
        });
        frameIdx++;
        await sleep(Math.max(0, Math.floor(1000 / FPS) - (Date.now() - shotT)));
      }
    })();

    await playTowardFoodThenCrash(page);
    capturing = false;
    await sleep(100);
    await captureLoop;
    await context.close();

    let jpgs = fs.readdirSync(TMP).filter((f) => f.endsWith('.jpg')).sort();
    if (jpgs.length < 20) throw new Error(`too few frames: ${jpgs.length}`);

    // trim trailing dead frames: keep until ~crash + short hold, then loop seam
    const keep = Math.min(jpgs.length, Math.round(FPS * 6.2));
    for (const f of jpgs) {
      const n = parseInt(f.replace(/\D/g, ''), 10);
      if (n >= keep) fs.unlinkSync(path.join(TMP, f));
    }
    jpgs = fs.readdirSync(TMP).filter((f) => f.endsWith('.jpg')).sort();
    const loopN = Math.min(7, Math.max(5, Math.round(FPS * 0.4)));
    for (let i = 0; i < loopN; i++) {
      fs.copyFileSync(path.join(TMP, jpgs[Math.min(i, 3)]), path.join(TMP, `f${String(jpgs.length + i).padStart(5, '0')}.jpg`));
    }
    const total = jpgs.length + loopN;
    console.log('frames', jpgs.length, 'total', total);

    const silent = '/tmp/snake-ru-silent.mp4';
    const crashAt = ((jpgs.length - 8) / FPS).toFixed(2);
    await run('ffmpeg', [
      '-y',
      '-framerate',
      String(FPS),
      '-i',
      path.join(TMP, 'f%05d.jpg'),
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
        `drawtext=fontfile=${FONT}:text='Ещё один поворот…':fontsize=52:fontcolor=white:borderw=4:bordercolor=black@0.8:x=(w-text_w)/2:y=h*0.88:enable='lt(t,${crashAt})'`,
        `drawtext=fontfile=${FONT}:text='Почти…':fontsize=70:fontcolor=white:borderw=4:bordercolor=black@0.85:x=(w-text_w)/2:y=h*0.86:enable='gte(t,${crashAt})*lt(n\\,${jpgs.length})'`,
        `drawtext=fontfile=${FONT}:text='serpmonn':fontsize=32:fontcolor=white@0.9:borderw=3:bordercolor=black@0.7:x=(w-text_w)/2:y=h*0.92:enable='gte(t,${crashAt})*lt(n\\,${jpgs.length})'`,
      ].join(','),
      silent,
    ]);

    const audio = pickAudio();
    const durSec = (total / FPS).toFixed(2);
    const fadeOut = Math.max(0.3, Number(durSec) - 0.4);
    await run('ffmpeg', [
      '-y',
      '-i',
      silent,
      '-stream_loop',
      '-1',
      '-i',
      audio,
      '-filter_complex',
      `[1:a]atrim=0:${durSec},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.25,afade=t=out:st=${fadeOut}:d=0.35,volume=0.32[a]`,
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
      OUT_FINAL,
    ]);

    await run('ffmpeg', ['-y', '-ss', '0.4', '-i', OUT_FINAL, '-frames:v', '1', path.join(OUT_DIR, 'snake-ru-firstframe.jpg')]);
    await run('ffmpeg', ['-y', '-sseof', '-0.5', '-i', OUT_FINAL, '-frames:v', '1', path.join(OUT_DIR, 'snake-ru-lastframe.jpg')]);

    console.log('OK', OUT_FINAL);
    console.log('audio', audio);
    console.log('duration', durSec);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
