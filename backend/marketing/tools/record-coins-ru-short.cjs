#!/usr/bin/env node
/**
 * Coins RU Short — chase with pressure, vertical 9:16, hooks + bed.
 * «Лови монетки…» → «Ещё!» → «serpmonn»
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('/root/.nvm/versions/node/v22.22.0/lib/node_modules/playwright');

const YANDEX_ROOT = '/var/www/serpmonn.ru/frontend/games/yandex';
const OUT_DIR = '/var/www/serpmonn.ru/backend/marketing/out/shorts-preview';
const SHORTS_DIR = '/var/www/serpmonn.ru/backend/marketing/out/shorts';
const OUT_FINAL = path.join(OUT_DIR, 'coins-preview-ru-serpmonn.mp4');
const OUT_UPLOAD = path.join(SHORTS_DIR, 'coins-vk-ru.mp4');
const AUDIO = '/var/www/serpmonn.ru/backend/marketing/assets/audio/games-11.mp3';
const FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
const TMP = '/tmp/coins-ru-short-rec';
const W = 1080;
const H = 1920;
const FPS = 16;
const DURATION_MS = 14000;

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
      html, body { margin:0!important; width:100%!important; height:100%!important; background:#0b1020!important; overflow:hidden!important; }
      .hint, .controls { display:none!important; }
      .page { max-width:none!important; width:100%!important; height:100%!important; margin:0!important; padding:72px 28px 100px!important; box-sizing:border-box!important; display:flex!important; flex-direction:column!important; }
      header { justify-content:center!important; margin:0 0 20px!important; }
      h1 { font-size:2rem!important; }
      .wrap { display:flex!important; flex-direction:column!important; flex:1!important; justify-content:center!important; gap:22px!important; grid-template-columns:none!important; }
      .panel { width:100%!important; box-sizing:border-box!important; }
      #game { width:min(920px,100%)!important; height:auto!important; max-width:920px!important; margin:0 auto!important; display:block!important; }
      .stats { display:grid!important; grid-template-columns:repeat(3,1fr)!important; gap:12px!important; font-size:1.15rem!important; text-align:center!important; }
      #btnStart, #btnPause, #btnReset { display:none!important; }
    `;
    document.head.appendChild(style);
  });
}

async function playSmart(page) {
  await page.waitForFunction(() => window.__rec && window.__rec.pressure, { timeout: 15000 });
  await page.evaluate(() => {
    window.__rec.reset();
    window.__rec.start();
    window.__rec.pressure({ badCount: 9, tick: 125, time: 40 });
  });
  await sleep(200);

  const end = Date.now() + DURATION_MS - 500;
  let lastPressure = Date.now();

  while (Date.now() < end) {
    if (Date.now() - lastPressure > 3500) {
      await page.evaluate(() => {
        const st = window.__rec.getState();
        if (!st.alive || !st.started) {
          window.__rec.reset();
          window.__rec.start();
        }
        window.__rec.pressure({ badCount: 10, tick: 115, time: Math.max(14, (st && st.timeLeft) || 28) });
      });
      lastPressure = Date.now();
    }

    const decision = await page.evaluate(() => {
      const st = window.__rec.getState();
      if (!st || !st.alive) return { action: 'restart' };
      if (!st.started) return { action: 'start' };
      const p = st.player;
      if (!p) return { action: 'wait' };

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
        if (best) return { action: 'dir', vx: best.vx, vy: best.vy, dist: 1 };
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
      return { action: 'dir', vx, vy, dist: bestD, score: st.score };
    });

    if (decision.action === 'restart' || decision.action === 'start') {
      await page.evaluate(() => {
        window.__rec.reset();
        window.__rec.start();
        window.__rec.pressure({ badCount: 9, tick: 120, time: 36 });
      });
      lastPressure = Date.now();
      await sleep(120);
      continue;
    }
    if (decision.action === 'dir') {
      await page.evaluate(({ vx, vy }) => window.__rec.setDir(vx, vy), decision);
      await sleep(decision.dist != null && decision.dist <= 2 ? 70 : 110);
      continue;
    }
    await sleep(70);
  }
}

async function main() {
  fs.mkdirSync(TMP, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(SHORTS_DIR, { recursive: true });
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
    await page.goto(`http://127.0.0.1:${port}/coins/index.html?rec=1&lang=ru`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });
    await page.waitForSelector('#game', { timeout: 20000 });
    await layout(page);
    await sleep(200);

    let frameIdx = 0;
    let capturing = true;
    const captureLoop = (async () => {
      const start = Date.now();
      while (capturing && Date.now() - start < DURATION_MS + 800) {
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

    console.log('recording coins RU chase…');
    await playSmart(page);
    await sleep(250);
    capturing = false;
    await captureLoop;
    await context.close();

    const jpgs = fs.readdirSync(framesDir).filter((f) => f.endsWith('.jpg')).sort();
    console.log('frames', jpgs.length);
    if (jpgs.length < 40) throw new Error('too few frames');

    const silent = path.join(TMP, 'silent.mp4');
    const durSec = (jpgs.length / FPS).toFixed(2);
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
        `drawtext=fontfile=${FONT}:text='Лови монетки…':fontsize=58:fontcolor=white:borderw=4:bordercolor=black@0.85:x=(w-text_w)/2:y=h*0.88:enable='lt(t,4.2)'`,
        `drawtext=fontfile=${FONT}:text='Ещё быстрее!':fontsize=62:fontcolor=white:borderw=4:bordercolor=black@0.9:x=(w-text_w)/2:y=h*0.88:enable='gte(t,4.2)*lt(t,8.5)'`,
        `drawtext=fontfile=${FONT}:text='serpmonn':fontsize=34:fontcolor=white@0.95:borderw=3:bordercolor=black@0.8:x=(w-text_w)/2:y=h*0.92:enable='gte(t,8.5)'`,
      ].join(','),
      silent,
    ]);

    const fadeOut = Math.max(0.3, Number(durSec) - 0.4);
    await run('ffmpeg', [
      '-y',
      '-i',
      silent,
      '-stream_loop',
      '-1',
      '-i',
      AUDIO,
      '-filter_complex',
      `[1:a]atrim=0:${durSec},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.2,afade=t=out:st=${fadeOut}:d=0.35,volume=0.32[a]`,
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

    fs.copyFileSync(OUT_FINAL, OUT_UPLOAD);
    await run('ffmpeg', ['-y', '-ss', '0.5', '-i', OUT_FINAL, '-update', '1', '-frames:v', '1', path.join(OUT_DIR, 'coins-ru-firstframe.jpg')]);
    await run('ffmpeg', ['-y', '-ss', '5.0', '-i', OUT_FINAL, '-update', '1', '-frames:v', '1', path.join(OUT_DIR, 'coins-ru-mid.jpg')]);
    console.log('OK', OUT_FINAL, 'dur', durSec);
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
