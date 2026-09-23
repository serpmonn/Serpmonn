#!/usr/bin/env node
/**
 * Typing RU Short — same pattern as EN:
 * Act1: choke near 0 → ПРОВАЛ…
 * Act2: clean finish at 0 → Очистил…
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('/root/.nvm/versions/node/v22.22.0/lib/node_modules/playwright');

const YANDEX_ROOT = '/var/www/serpmonn.ru/frontend/games/yandex';
const OUT_DIR = '/var/www/serpmonn.ru/backend/marketing/out/shorts-preview';
const SHORTS_DIR = '/var/www/serpmonn.ru/backend/marketing/out/shorts';
const OUT_FINAL = path.join(OUT_DIR, 'typing-preview-ru-serpmonn.mp4');
const OUT_UPLOAD = path.join(SHORTS_DIR, 'typing-vk-ru.mp4');
const AUDIO = '/var/www/serpmonn.ru/backend/marketing/assets/audio/games-14.mp3';
const FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
const TMP = '/tmp/typing-ru-short-rec';
const W = 1080;
const H = 1920;
const FPS = 12;
const DURATION_MS = 40000;

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
      html, body.typing-page {
        margin:0!important; width:100%!important; height:100%!important;
        overflow:hidden!important; background:#07080a!important;
      }
      .typing-game {
        max-width:none!important; width:100%!important; height:100%!important;
        padding:48px 22px 56px!important; box-sizing:border-box!important;
        gap:18px!important; justify-content:flex-start!important;
      }
      .header h1 { font-size:1.6rem!important; }
      .tabs { transform:scale(1.1); }
      .stats { width:100%!important; max-width:980px!important; }
      .stat { font-size:1.15rem!important; padding:12px!important; }
      .stat-value, #wpmLive, #accLive, #liveTimer {
        font-size:1.85rem!important; font-weight:800!important;
      }
      #liveTimer { color:#ffcc66!important; }
      #typingWrap, #wordsDisplay {
        width:100%!important; max-width:980px!important; flex:1!important;
        font-size:2.2rem!important; line-height:1.45!important;
        min-height:480px!important; padding:28px!important;
        border-radius:18px!important;
      }
      .char.wrong {
        color:#ff4444!important; background:rgba(255,40,40,.18)!important;
        text-decoration-thickness:3px!important;
      }
      #resultPanel.show {
        width:min(920px,96%)!important; padding:28px!important;
      }
      #resultPanel.show.fail-look {
        border:3px solid #ff4444!important; background:#1a0c0c!important;
      }
      #resultPanel.show.fail-look .result-title { color:#ff5555!important; font-size:2rem!important; }
      #resultPanel.show.win-look {
        border:3px solid #3ecf6a!important; background:#0c1a12!important;
      }
      #resultPanel.show.win-look .result-title { color:#4ade80!important; font-size:2rem!important; }
      #historyPanel { display:none!important; }
    `;
    document.head.appendChild(style);
  });
}

async function getNextChars(page, n) {
  return page.evaluate((count) => {
    const spans = [...document.querySelectorAll('#wordsDisplay .char')];
    const st = window.__rec.getState();
    const from = st.cursorPos || 0;
    return spans.slice(from, from + count).map((s) => (s.textContent === '\u00a0' ? ' ' : s.textContent || ''));
  }, n);
}

/** Type until timer ends (or maxMs). wrongRate 0..1 */
async function typeUntilTimeUp(page, { wrongRate = 0, maxMs = 12000, keyMs = 70 }) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const st = await page.evaluate(() => window.__rec.getState());
    if (st.finished || st.timeLeft <= 0) return st;
    const batch = await getNextChars(page, 1);
    if (!batch.length) {
      await sleep(80);
      continue;
    }
    let ch = batch[0];
    if (wrongRate > 0 && Math.random() < wrongRate) {
      ch = ch === 'x' ? 'z' : 'x';
    }
    await page.evaluate((c) => window.__rec.type(c), ch);
    const pause = keyMs + (Math.random() * 35) | 0;
    await sleep(pause);
  }
  return page.evaluate(() => window.__rec.getState());
}

async function waitFinished(page, maxMs = 3000) {
  const t0 = Date.now();
  while (Date.now() - t0 < maxMs) {
    const st = await page.evaluate(() => window.__rec.getState());
    if (st.finished) return st;
    await sleep(80);
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
    await page.goto(`http://127.0.0.1:${port}/typing/index.html?rec=1&lang=ru`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForFunction(() => window.__rec, { timeout: 15000 });
    await layout(page);
    await sleep(250);

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

    // ========== ACT 1: last seconds → choke → time up ==========
    markers.act1 = frameIdx;
    await page.evaluate(() => {
      window.__rec.setMode('15');
      window.__rec.reset(true);
    });
    await sleep(350);

    markers.typing1 = frameIdx;
    await page.evaluate(() => window.__rec.start());
    // warm-up typing so it looks like a real run
    await typeUntilTimeUp(page, { wrongRate: 0.04, maxMs: 2200, keyMs: 65 });
    // jump to last seconds — timer still runs to 0 in-engine
    await page.evaluate(() => window.__rec.setTimeLeft(5));
    markers.lowTime = frameIdx;

    // solid for a beat, then panic typos as clock dies
    await typeUntilTimeUp(page, { wrongRate: 0.08, maxMs: 1800, keyMs: 60 });
    markers.choke = frameIdx;
    await typeUntilTimeUp(page, { wrongRate: 0.55, maxMs: 4500, keyMs: 55 });
    await waitFinished(page, 2500);
    await page.evaluate(() => {
      const panel = document.getElementById('resultPanel');
      if (panel) {
        panel.classList.add('fail-look');
        panel.classList.remove('win-look');
      }
    });
    markers.fail = frameIdx;
    await sleep(1600);
    markers.failEnd = frameIdx;

    // ========== ACT 2: last seconds → clean → time up ==========
    await page.evaluate(() => {
      window.__rec.reset(true);
      const panel = document.getElementById('resultPanel');
      if (panel) panel.classList.remove('show', 'fail-look', 'win-look');
      const wrap = document.getElementById('typingWrap');
      if (wrap) wrap.style.display = '';
    });
    await sleep(400);
    markers.act2 = frameIdx;

    await page.evaluate(() => window.__rec.start());
    await typeUntilTimeUp(page, { wrongRate: 0, maxMs: 1800, keyMs: 62 });
    await page.evaluate(() => window.__rec.setTimeLeft(5));
    markers.typing2 = frameIdx;
    await typeUntilTimeUp(page, { wrongRate: 0.02, maxMs: 6500, keyMs: 58 });
    await waitFinished(page, 2500);
    await page.evaluate(() => {
      const panel = document.getElementById('resultPanel');
      if (panel) {
        panel.classList.add('win-look');
        panel.classList.remove('fail-look');
      }
    });
    markers.win = frameIdx;
    await sleep(1500);
    markers.winEnd = frameIdx;

    // ========== Loop ==========
    await page.evaluate(() => {
      window.__rec.reset(true);
      const panel = document.getElementById('resultPanel');
      if (panel) panel.classList.remove('show', 'fail-look', 'win-look');
      const wrap = document.getElementById('typingWrap');
      if (wrap) wrap.style.display = '';
    });
    await sleep(400);
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
        `drawtext=fontfile=${FONT}:text='Печать…':fontsize=64:fontcolor=white:borderw=4:bordercolor=black@0.85:x=(w-text_w)/2:y=h*0.88:enable='gte(t,${t(markers.typing1)})*lt(t,${t(markers.lowTime)})'`,
        `drawtext=fontfile=${FONT}:text='Время…':fontsize=68:fontcolor=white:borderw=4:bordercolor=black@0.9:x=(w-text_w)/2:y=h*0.88:enable='gte(t,${t(markers.lowTime)})*lt(t,${t(markers.choke)})'`,
        `drawtext=fontfile=${FONT}:text='Нет…':fontsize=72:fontcolor=0xff5555:borderw=5:bordercolor=black@0.9:x=(w-text_w)/2:y=h*0.88:enable='gte(t,${t(markers.choke)})*lt(t,${t(markers.fail)})'`,
        `drawtext=fontfile=${FONT}:text='ПРОВАЛ…':fontsize=84:fontcolor=0xff4444:borderw=5:bordercolor=black@0.95:x=(w-text_w)/2:y=h*0.84:enable='gte(t,${t(markers.fail)})*lt(t,${t(markers.failEnd)})'`,
        `drawtext=fontfile=${FONT}:text='Почти…':fontsize=56:fontcolor=white:borderw=4:bordercolor=black@0.9:x=(w-text_w)/2:y=h*0.90:enable='gte(t,${t(markers.fail)})*lt(t,${t(markers.failEnd)})'`,
        `drawtext=fontfile=${FONT}:text='Ещё раз…':fontsize=64:fontcolor=white:borderw=4:bordercolor=black@0.85:x=(w-text_w)/2:y=h*0.88:enable='gte(t,${t(markers.act2)})*lt(t,${t(markers.win)})'`,
        `drawtext=fontfile=${FONT}:text='Очистил!':fontsize=76:fontcolor=white:borderw=5:bordercolor=black@0.9:x=(w-text_w)/2:y=h*0.86:enable='gte(t,${t(markers.win)})*lt(t,${t(markers.winEnd)})'`,
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
      `[1:a]atrim=0:${durSec},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.2,afade=t=out:st=${fadeOut}:d=0.35,volume=0.3[a]`,
      '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k',
      '-shortest', '-movflags', '+faststart', OUT_FINAL,
    ]);

    fs.copyFileSync(OUT_FINAL, OUT_UPLOAD);
    await run('ffmpeg', ['-y', '-ss', '1.0', '-i', OUT_FINAL, '-update', '1', '-frames:v', '1', path.join(OUT_DIR, 'typing-ru-firstframe.jpg')]);
    await run('ffmpeg', ['-y', '-ss', `${Math.max(1, Number(t(markers.fail)) + 0.25)}`, '-i', OUT_FINAL, '-update', '1', '-frames:v', '1', path.join(OUT_DIR, 'typing-ru-fail.jpg')]);
    await run('ffmpeg', ['-y', '-ss', `${Math.max(1, Number(t(markers.win)) + 0.15)}`, '-i', OUT_FINAL, '-update', '1', '-frames:v', '1', path.join(OUT_DIR, 'typing-ru-win.jpg')]);
    console.log('OK', OUT_FINAL, 'dur', durSec, 'frames', total, markers);
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
