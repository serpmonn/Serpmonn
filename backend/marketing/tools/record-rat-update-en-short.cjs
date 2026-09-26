#!/usr/bin/env node
/**
 * Fat Rat update EN Short — per PUBLISH-RULES (A brand + B retention).
 * Hook in first second, dense update beat (flee → cat → near-miss → TOO FAT),
 * captions readable muted, short hold, no CTA. Audio from rotation (not honey-1).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('/root/.nvm/versions/node/v22.22.0/lib/node_modules/playwright');

const SITE_ROOT = '/var/www/serpmonn-dev';
const OUT_DIR = '/var/www/serpmonn.ru/backend/marketing/out/shorts-preview';
const OUT_FINAL = path.join(OUT_DIR, 'rat-update-preview-en-serpmonn.mp4');
const AUDIO_DIR = '/var/www/serpmonn.ru/backend/marketing/assets/audio';
const FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
const TMP = '/tmp/rat-update-en-short-frames';
const CAP_W = 540;
const CAP_H = 960;
const W = 1080;
const H = 1920;
const FPS = 12;
const DURATION_MS = 14000;
const TARGET_SEC = 8.5;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      let rel = decodeURIComponent(url.pathname).replace(/^\/+/, '');
      const filePath = path.join(SITE_ROOT, rel);
      if (!filePath.startsWith(SITE_ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
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
      else reject(new Error(`${cmd} ${code}: ${err.slice(-900)}`));
    });
  });
}

function pickAudio() {
  // honey-1 was previous rat-update take — skip recent beds
  const prefer = [
    'honey-3.mp3',
    'honey-4.mp3',
    'default-11.mp3',
    'default-12.mp3',
    'honey-2.mp3',
  ];
  for (const n of prefer) {
    const p = path.join(AUDIO_DIR, n);
    if (fs.existsSync(p)) return p;
  }
  const files = fs.readdirSync(AUDIO_DIR).filter((f) => f.endsWith('.mp3')).sort();
  return path.join(AUDIO_DIR, files.find((f) => f !== 'honey-1.mp3') || files[0]);
}

async function seedHot(page) {
  // Hook frame: already Chonk, cheese fleeing, cat on the board
  await page.evaluate(() => {
    const rec = window.__rec;
    if (!rec) return;
    if (!rec.getState().running) rec.beginPlay();
    rec.setWeight(24);
    rec.spawnCatNow();
    rec.nudgeCatAway();
    rec.forceFleeFood();
    rec.goFood();
    rec.hideChrome();
  });
  await sleep(180);
}

async function playBeat(page) {
  // Act 1 — flee chase under cat pressure (hook already seeded)
  for (let i = 0; i < 8; i++) {
    const dead = await page.evaluate((step) => {
      const rec = window.__rec;
      if (!rec) return true;
      let st = rec.getState();
      if (!st.running) {
        rec.beginPlay();
        rec.setWeight(24 + step);
        rec.hideChrome();
        rec.spawnCatNow();
        rec.nudgeCatAway();
        st = rec.getState();
      }
      if (step === 0 || step === 4) rec.forceFleeFood();
      if (step % 2 === 0) rec.nudgeCatAway();
      if (st.weight < 32) rec.setWeight(Math.min(34, st.weight + 1.4));
      rec.goFood();
      return !rec.getState().running;
    }, i);
    if (dead) {
      await page.evaluate(() => {
        const rec = window.__rec;
        rec.beginPlay();
        rec.setWeight(30);
        rec.hideChrome();
        rec.spawnCatNow();
        rec.nudgeCatAway();
        rec.forceFleeFood();
        rec.goFood();
      });
    }
    await sleep(420);
  }

  // Act 2 — heavier + near-miss + stuck climb
  for (let i = 0; i < 9; i++) {
    const dead = await page.evaluate((step) => {
      const rec = window.__rec;
      if (!rec) return true;
      let st = rec.getState();
      if (!st.running) {
        rec.beginPlay();
        rec.setWeight(36);
        rec.hideChrome();
        rec.spawnCatNow();
        rec.nudgeCatAway();
        st = rec.getState();
      }
      if (step % 3 === 0) rec.nudgeCatAway();
      if (step === 2) rec.forceFleeFood();
      if (step === 5 || step === 7) rec.flashNearMiss();
      if (st.weight < 50) rec.setWeight(Math.min(52, st.weight + 2.2));
      rec.goFood();
      return !rec.getState().running;
    }, i);
    if (dead) {
      await page.evaluate(() => {
        const rec = window.__rec;
        rec.beginPlay();
        rec.setWeight(44);
        rec.hideChrome();
        rec.spawnCatNow();
        rec.nudgeCatAway();
        rec.goFood();
      });
    }
    await sleep(400);
  }

  // Act 3 — payoff TOO FAT (short hold for loopability)
  await page.evaluate(() => {
    const rec = window.__rec;
    if (!rec.getState().running) {
      rec.beginPlay();
      rec.hideChrome();
    }
    rec.setWeight(56);
    rec.nudgeCatAway();
    rec.flashNearMiss();
    rec.goFood();
  });
  await sleep(450);
  await page.evaluate(() => {
    const rec = window.__rec;
    if (!rec.getState().running) {
      rec.beginPlay();
      rec.hideChrome();
    }
    rec.setWeight(60);
    rec.endGame('fat');
    const ov = document.getElementById('overlay');
    if (ov) ov.classList.remove('hidden');
  });
  await sleep(900);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(TMP, { recursive: true });

  const { server, port } = await startServer();
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: CAP_W, height: CAP_H },
      deviceScaleFactor: 1,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.showFullScreenAd = function () {};
      try {
        localStorage.setItem('spn_theme', 'dark');
        localStorage.setItem('rat_sound_v1', '0');
      } catch (_) {}
    });

    const url = `http://127.0.0.1:${port}/frontend/en/games/rat/index.html?rec=1&w=24`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForSelector('#c', { timeout: 15000 });
    await page.waitForFunction(() => typeof window.__rec !== 'undefined', null, { timeout: 20000 });
    await page.evaluate(() => {
      window.showFullScreenAd = function () {};
      if (!window.__rec.getState().running) {
        window.__rec.beginPlay();
        window.__rec.setWeight(24);
      }
      window.__rec.hideChrome();
      const style = document.createElement('style');
      style.textContent = `
        .ad-top-banner, #menuContainer, .toolbar, #nicknameForm, .hint,
        .mobile-anchor-ad, .toast { display: none !important; }
        html, body.rat-page {
          background: #0e0f11 !important;
          margin: 0 !important;
          padding: 18px 10px 24px !important;
          height: 100% !important;
          overflow: hidden !important;
          gap: 8px !important;
        }
        .rat-game {
          width: 100%;
          max-width: 520px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .header h1 {
          font-size: 1.15rem !important;
          letter-spacing: 0.08em !important;
        }
        .header h1::after {
          content: ' · Serpmonn';
          color: #7b7e8a;
          font-size: 0.72em;
          letter-spacing: 0.04em;
        }
        .scoreboard { transform: scale(1.05); }
        .canvas-wrap {
          width: min(92vw, 500px) !important;
          border-width: 2px !important;
        }
        canvas#c {
          width: 100% !important;
          height: auto !important;
        }
        .fat-meta, .fat-bar-wrap { width: min(92vw, 500px) !important; }
        .overlay-title { font-size: 1.35rem !important; }
        .overlay .btn, .overlay-actions { display: none !important; }
      `;
      document.head.appendChild(style);
    });
    await seedHot(page);

    let frameIdx = 0;
    let capturing = true;
    const captureLoop = (async () => {
      const t0 = Date.now();
      while (capturing && Date.now() - t0 < DURATION_MS + 2500) {
        const shotT = Date.now();
        await page.screenshot({
          path: path.join(TMP, `f${String(frameIdx).padStart(5, '0')}.jpg`),
          type: 'jpeg',
          quality: 78,
        });
        frameIdx++;
        await sleep(Math.max(0, Math.floor(1000 / FPS) - (Date.now() - shotT)));
      }
    })();

    await playBeat(page);
    capturing = false;
    await sleep(80);
    await captureLoop;
    await context.close();

    let jpgs = fs.readdirSync(TMP).filter((f) => f.endsWith('.jpg')).sort();
    if (jpgs.length < 36) throw new Error(`too few frames: ${jpgs.length}`);

    const keep = Math.min(jpgs.length, Math.round(FPS * TARGET_SEC));
    if (jpgs.length > keep) {
      const drop = jpgs.length - keep;
      const startDrop = Math.max(4, Math.floor(jpgs.length * 0.2));
      const removeSet = new Set();
      for (let i = 0; i < drop; i++) removeSet.add(jpgs[startDrop + i]);
      for (const f of removeSet) {
        if (f && fs.existsSync(path.join(TMP, f))) fs.unlinkSync(path.join(TMP, f));
      }
      const left = fs
        .readdirSync(TMP)
        .filter((f) => f.endsWith('.jpg'))
        .sort();
      left.forEach((f, i) => {
        fs.renameSync(path.join(TMP, f), path.join(TMP, `g${String(i).padStart(5, '0')}.jpg`));
      });
      left.forEach((_, i) => {
        fs.renameSync(
          path.join(TMP, `g${String(i).padStart(5, '0')}.jpg`),
          path.join(TMP, `f${String(i).padStart(5, '0')}.jpg`)
        );
      });
    }
    jpgs = fs.readdirSync(TMP).filter((f) => f.endsWith('.jpg')).sort();
    // Short finale hold — loopability
    const loopN = Math.min(8, Math.max(5, Math.round(FPS * 0.45)));
    const last = jpgs[jpgs.length - 1];
    for (let i = 0; i < loopN; i++) {
      fs.copyFileSync(path.join(TMP, last), path.join(TMP, `f${String(jpgs.length + i).padStart(5, '0')}.jpg`));
    }
    const total = jpgs.length + loopN;
    console.log('frames', jpgs.length, 'total', total);

    const silent = '/tmp/rat-update-en-silent.mp4';
    const endAt = ((jpgs.length - 5) / FPS).toFixed(2);
    const t1 = (Number(endAt) / 3).toFixed(2);
    const t2 = ((Number(endAt) * 2) / 3).toFixed(2);
    // Free title formula (not One more…) — mute-readable captions
    const lines = ['Cheese just ran.', 'Cat joined the party.', 'Still eating…'];
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
        `scale=${W}:${H}:flags=lanczos`,
        `drawtext=fontfile=${FONT}:text='${lines[0]}':fontsize=48:fontcolor=white:borderw=4:bordercolor=black@0.85:x=(w-text_w)/2:y=h*0.88:enable='lt(t,${t1})'`,
        `drawtext=fontfile=${FONT}:text='${lines[1]}':fontsize=46:fontcolor=white:borderw=4:bordercolor=black@0.85:x=(w-text_w)/2:y=h*0.88:enable='gte(t,${t1})*lt(t,${t2})'`,
        `drawtext=fontfile=${FONT}:text='${lines[2]}':fontsize=50:fontcolor=white:borderw=4:bordercolor=black@0.85:x=(w-text_w)/2:y=h*0.88:enable='gte(t,${t2})*lt(t,${endAt})'`,
        `drawtext=fontfile=${FONT}:text='TOO FAT':fontsize=72:fontcolor=white:borderw=4:bordercolor=black@0.9:x=(w-text_w)/2:y=h*0.86:enable='gte(t,${endAt})'`,
      ].join(','),
      silent,
    ]);

    const audio = pickAudio();
    console.log('audio', path.basename(audio));
    const durSec = (total / FPS).toFixed(2);
    const fadeOut = Math.max(0.25, Number(durSec) - 0.35);
    const mixed = '/tmp/rat-update-en-mixed.mp4';
    await run('ffmpeg', [
      '-y',
      '-i',
      silent,
      '-stream_loop',
      '-1',
      '-i',
      audio,
      '-filter_complex',
      `[1:a]atrim=0:${durSec},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.15,afade=t=out:st=${fadeOut}:d=0.3,volume=0.34[a]`,
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
      mixed,
    ]);

    // Dense punch (~15%)
    await run('ffmpeg', [
      '-y',
      '-i',
      mixed,
      '-filter_complex',
      '[0:v]setpts=0.85*PTS[v];[0:a]atempo=1.176[a]',
      '-map',
      '[v]',
      '-map',
      '[a]',
      '-c:v',
      'libx264',
      '-pix_fmt',
      'yuv420p',
      '-crf',
      '18',
      '-c:a',
      'aac',
      '-b:a',
      '128k',
      '-movflags',
      '+faststart',
      OUT_FINAL,
    ]);

    await run('ffmpeg', [
      '-y',
      '-ss',
      '0.25',
      '-i',
      OUT_FINAL,
      '-frames:v',
      '1',
      path.join(OUT_DIR, 'rat-update-en-firstframe.jpg'),
    ]);
    await run('ffmpeg', [
      '-y',
      '-ss',
      '3.2',
      '-i',
      OUT_FINAL,
      '-frames:v',
      '1',
      path.join(OUT_DIR, 'rat-update-en-midframe.jpg'),
    ]);
    await run('ffmpeg', [
      '-y',
      '-sseof',
      '-0.4',
      '-i',
      OUT_FINAL,
      '-frames:v',
      '1',
      path.join(OUT_DIR, 'rat-update-en-lastframe.jpg'),
    ]);

    const pub = '/var/www/serpmonn.ru/frontend/shorts-preview';
    fs.mkdirSync(pub, { recursive: true });
    fs.copyFileSync(OUT_FINAL, path.join(pub, 'rat-update-preview-en-serpmonn.mp4'));

    const probe = spawn(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', OUT_FINAL],
      { encoding: 'utf8' }
    );
    let dur = '';
    for await (const chunk of probe.stdout) dur += chunk;
    console.log('OUT', OUT_FINAL);
    console.log('duration', String(dur).trim());
    console.log('preview https://serpmonn.ru/shorts-preview/rat-update-preview-en-serpmonn.mp4');
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
