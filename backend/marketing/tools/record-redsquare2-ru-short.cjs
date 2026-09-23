#!/usr/bin/env node
/**
 * Falling Shapes RU Short — same pattern as EN:
 * Act1: late game (high misses) → choke → ПРОВАЛ…
 * Act2: quick restart → catch streak → Поймал…
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('/root/.nvm/versions/node/v22.22.0/lib/node_modules/playwright');

const YANDEX_ROOT = '/var/www/serpmonn.ru/frontend/games/yandex';
const OUT_DIR = '/var/www/serpmonn.ru/backend/marketing/out/shorts-preview';
const SHORTS_DIR = '/var/www/serpmonn.ru/backend/marketing/out/shorts';
const OUT_FINAL = path.join(OUT_DIR, 'redsquare2-preview-ru-serpmonn.mp4');
const OUT_UPLOAD = path.join(SHORTS_DIR, 'redsquare2-vk-ru.mp4');
const AUDIO = '/var/www/serpmonn.ru/backend/marketing/assets/audio/games-13.mp3';
const FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
const TMP = '/tmp/rs2-ru-short-rec';
const W = 1080;
const H = 1920;
const FPS = 12;
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
    const loc = window.SERPMONN_LOCALES && window.SERPMONN_LOCALES.ru;
    if (loc && window.applySerpmonnLocale) window.applySerpmonnLocale(loc);
    window.showFullScreenAd = function () {};
    const style = document.createElement('style');
    style.textContent = `
      html, body.rs2-page {
        margin:0!important; width:100%!important; height:100%!important;
        overflow:hidden!important; background:#05070b!important;
        padding:0!important; gap:0!important;
      }
      .game-dock, #soundBtn, .instruction-overlay { display:none!important; }
      .game-shell {
        width:100%!important; height:100%!important; max-width:none!important;
        padding:40px 18px 36px!important; box-sizing:border-box!important;
        display:flex!important; flex-direction:column!important; gap:12px!important;
        align-items:stretch!important; justify-content:flex-start!important;
      }
      .game-title { font-size:1.4rem!important; text-align:center!important; margin:0!important; }
      .game-hud {
        width:100%!important;
        grid-template-columns: repeat(2,1fr)!important;
        gap:8px!important; padding:12px 14px!important;
        font-size:1.15rem!important;
        flex:0 0 auto!important;
      }
      #missesValue { color:#ff5555!important; font-size:1.6rem!important; font-weight:900!important; }
      /* Fill the Short frame — no empty black bar under the stage */
      .game-stage {
        width:100%!important;
        flex:1 1 auto!important;
        min-height:0!important;
        height:auto!important;
        max-height:none!important;
        border-radius:16px!important;
        border:2px solid #334!important;
      }
    `;
    document.head.appendChild(style);
    window.dispatchEvent(new Event('resize'));
  });
}

/** Late-game board: several shapes already mid-fall (not empty start). */
async function bootRound(page, { score = 28, misses = 0 } = {}) {
  await page.evaluate(({ score, misses }) => {
    window.__rec.styleFailModal();
    window.__rec.reset();
    window.__rec.setScore(score);
    window.__rec.setMisses(misses);
    window.__rec.pressure();
    window.__rec.bumpSpeed(2.2);
    window.__rec.clearObjects();
    const st = window.__rec.getState();
    const canvas = document.querySelector('canvas');
    const w = (canvas && canvas.width) || st.canvasW || 400;
    const h = (canvas && canvas.height) || Math.round(w * 1.4);
    // Already in flight — mid/upper field, not spawning from the top like a fresh game
    const seeds = [
      { x: w * 0.12, y: h * 0.22, size: 34 },
      { x: w * 0.55, y: h * 0.35, size: 42 },
      { x: w * 0.28, y: h * 0.48, size: 30 },
      { x: w * 0.70, y: h * 0.18, size: 38 },
      { x: w * 0.45, y: h * 0.10, size: 32 },
      { x: w * 0.08, y: h * 0.40, size: 26 },
    ];
    for (const s of seeds) window.__rec.spawn(s.x, s.y, s.size);
    // Paddle roughly under the densest zone
    window.__rec.setPlayerX(w * 0.40);
  }, { score, misses });
  await sleep(80);
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
}

/**
 * Human-like paddle control against REAL falling objects.
 * mode: 'catch' | 'miss'
 */
async function playRealtime(page, { mode, maxMs, untilScore, untilMisses, stopWhenDead }) {
  const t0 = Date.now();
  let lastScore = -1;
  let lastMiss = -1;
  while (Date.now() - t0 < maxMs) {
    const st = await page.evaluate((playMode) => {
      const s = window.__rec.getState();
      if (!s.running && s.started === false && s.misses >= 10) {
        return { ...s, dead: true };
      }
      const objs = s.objects || [];
      if (objs.length) {
        // prioritize the lowest (closest to floor) shape
        let target = objs[0];
        for (const o of objs) {
          if (o.y > target.y) target = o;
        }
        const half = Math.max(17, Math.round((s.canvasW || 400) * 0.045));
        const aim = target.x + target.size / 2 - half;
        if (playMode === 'catch') {
          // lag + jitter like a person
          const cur = s.playerX;
          const next = cur + (aim - cur) * 0.42 + (Math.random() - 0.5) * 6;
          window.__rec.setPlayerX(next);
        } else {
          // miss: drift away from the falling shape
          const away = aim < (s.canvasW || 400) / 2 ? (s.canvasW || 400) - 50 : 8;
          const cur = s.playerX;
          window.__rec.setPlayerX(cur + (away - cur) * 0.35);
        }
      }
      return window.__rec.getState();
    }, mode);

    if (stopWhenDead && (st.misses >= 10 || st.dead || !st.running)) return st;
    if (untilScore != null && st.score >= untilScore && st.score !== lastScore) return st;
    if (untilMisses != null && st.misses >= untilMisses) return st;
    lastScore = st.score;
    lastMiss = st.misses;
    await sleep(55);
  }
  return page.evaluate(() => window.__rec.getState());
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
    await page.goto(`http://127.0.0.1:${port}/redsquare2/index.html?rec=1&lang=ru`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForFunction(() => window.__rec, { timeout: 15000 });
    await layout(page);
    await sleep(300);

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
          quality: 86,
        });
        frameIdx++;
        await sleep(Math.max(0, Math.floor(1000 / FPS) - (Date.now() - t0)));
      }
    })();

    // ========== ACT 1: already at the brink → lose ==========
    markers.act1 = frameIdx;
    markers.catch1 = frameIdx;
    // Start even closer to the end: one miss from Game over
    await bootRound(page, { score: 44, misses: 9 });
    await sleep(350); // beat: mid-air chaos already on screen, 9/10
    const afterCatch = await page.evaluate(() => window.__rec.getState());
    markers.choke = frameIdx;
    await playRealtime(page, {
      mode: 'miss',
      maxMs: 4500,
      untilMisses: 10,
      stopWhenDead: true,
    });
    await page.evaluate(() => {
      const st = window.__rec.getState();
      if (st.misses < 10 && st.running) {
        window.__rec.styleFailModal();
        window.__rec.forceEnd();
      }
    });
    markers.fail = frameIdx;
    await sleep(900);
    markers.failEnd = frameIdx;

    // ========== ACT 2: short redeem → win ==========
    await bootRound(page, { score: 38, misses: 0 });
    await sleep(80);
    markers.act2 = frameIdx;

    markers.catch2 = frameIdx;
    await playRealtime(page, {
      mode: 'catch',
      maxMs: 5500,
      untilScore: 46,
    });
    markers.win = frameIdx;
    await sleep(850);
    markers.winEnd = frameIdx;

    // ========== Loop ==========
    await bootRound(page, { score: 44, misses: 9 });
    await sleep(200);
    markers.loopBack = frameIdx;

    capturing = false;
    await sleep(80);
    await captureLoop;
    await context.close();

    const cutAt = Math.min(frameIdx, (markers.loopBack || frameIdx) + Math.round(FPS * 0.3));
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
      '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17',
      '-vf',
      [
        'scale=1080:1920:flags=lanczos',
        `drawtext=fontfile=${FONT}:text='Остался один…':fontsize=58:fontcolor=white:borderw=4:bordercolor=black@0.85:x=(w-text_w)/2:y=h*0.88:enable='gte(t,${t(markers.act1)})*lt(t,${t(markers.choke)})'`,
        `drawtext=fontfile=${FONT}:text='Нет…':fontsize=72:fontcolor=0xff5555:borderw=5:bordercolor=black@0.9:x=(w-text_w)/2:y=h*0.88:enable='gte(t,${t(markers.choke)})*lt(t,${t(markers.fail)})'`,
        `drawtext=fontfile=${FONT}:text='ПРОВАЛ…':fontsize=84:fontcolor=0xff5555:borderw=5:bordercolor=black@0.95:x=(w-text_w)/2:y=h*0.84:enable='gte(t,${t(markers.fail)})*lt(t,${t(markers.failEnd)})'`,
        `drawtext=fontfile=${FONT}:text='Почти…':fontsize=56:fontcolor=white:borderw=4:bordercolor=black@0.9:x=(w-text_w)/2:y=h*0.90:enable='gte(t,${t(markers.fail)})*lt(t,${t(markers.failEnd)})'`,
        `drawtext=fontfile=${FONT}:text='Ещё раз…':fontsize=64:fontcolor=white:borderw=4:bordercolor=black@0.85:x=(w-text_w)/2:y=h*0.88:enable='gte(t,${t(markers.act2)})*lt(t,${t(markers.win)})'`,
        `drawtext=fontfile=${FONT}:text='Поймал!':fontsize=76:fontcolor=white:borderw=5:bordercolor=black@0.9:x=(w-text_w)/2:y=h*0.86:enable='gte(t,${t(markers.win)})*lt(t,${t(markers.winEnd)})'`,
        `drawtext=fontfile=${FONT}:text='serpmonn':fontsize=32:fontcolor=white@0.95:borderw=3:bordercolor=black@0.8:x=(w-text_w)/2:y=h*0.92:enable='gte(t,${t(markers.win)})*lt(t,${t(markers.winEnd)})'`,
      ].join(','),
      silent,
    ]);

    const durSec = (total / FPS).toFixed(2);
    const fadeOut = Math.max(0.3, Number(durSec) - 0.4);
    fs.mkdirSync(SHORTS_DIR, { recursive: true });
    await run('ffmpeg', [
      '-y', '-i', silent, '-stream_loop', '-1', '-i', AUDIO,
      '-filter_complex',
      `[1:a]atrim=0:${durSec},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.2,afade=t=out:st=${fadeOut}:d=0.35,volume=0.34[a]`,
      '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k',
      '-shortest', '-movflags', '+faststart', OUT_FINAL,
    ]);

    fs.copyFileSync(OUT_FINAL, OUT_UPLOAD);
    await run('ffmpeg', ['-y', '-ss', '1.2', '-i', OUT_FINAL, '-update', '1', '-frames:v', '1', path.join(OUT_DIR, 'redsquare2-ru-firstframe.jpg')]);
    await run('ffmpeg', ['-y', '-ss', `${Math.max(1, Number(t(markers.fail)) + 0.25)}`, '-i', OUT_FINAL, '-update', '1', '-frames:v', '1', path.join(OUT_DIR, 'redsquare2-ru-fail.jpg')]);
    await run('ffmpeg', ['-y', '-ss', `${Math.max(1, Number(t(markers.win)) + 0.15)}`, '-i', OUT_FINAL, '-update', '1', '-frames:v', '1', path.join(OUT_DIR, 'redsquare2-ru-win.jpg')]);
    console.log('OK', OUT_FINAL, 'dur', durSec, 'frames', total, 'afterCatch', afterCatch, markers);
    console.log('UPLOAD', OUT_UPLOAD);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
