#!/usr/bin/env node
/**
 * Obрыв / The Drop — YouTube Shorts.
 * Isolated /tmp copy only — never mutates frontend/games/obryv.
 *
 * - CDP screencast for ~20–24 fps
 * - In-game bot follows safe route + Names + beacon (real playthrough)
 * - Clears tier 1 → tier 2 (partial/full), ~45–60s
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const { chromium } = require('/root/.nvm/versions/node/v22.22.0/lib/node_modules/playwright');

const SRC = '/var/www/serpmonn.ru/frontend/games/obryv';
const REC_ROOT = '/tmp/obryv-shorts-rec';
const OUT_DIR = '/var/www/serpmonn.ru/backend/marketing/out/shorts-preview';
const SHORTS_DIR = '/var/www/serpmonn.ru/backend/marketing/out/shorts';
const PUBLIC = '/var/www/serpmonn.ru/frontend/shorts-preview';
const OUT_FINAL = path.join(OUT_DIR, 'obryv-preview-en-serpmonn.mp4');
const OUT_UPLOAD = path.join(SHORTS_DIR, 'obryv-short-serpmonn.mp4');
const AUDIO = '/var/www/serpmonn.ru/backend/marketing/assets/audio/games-15.mp3';
const FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
const TMP = '/tmp/obryv-short-frames';
const W = 720;
const H = 1280;
const TARGET_DURATION_MS = 55000;
const MAX_LEVELS = 2; // clear 2 tiers (0 and 1)

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.ogg': 'audio/ogg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.json': 'application/json',
};

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    child.stderr.on('data', (d) => { err += d.toString(); });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${code}: ${err.slice(-1200)}`))));
  });
}

function prepareCopy() {
  fs.rmSync(REC_ROOT, { recursive: true, force: true });
  fs.mkdirSync(REC_ROOT, { recursive: true });
  for (const name of ['index.html', 'game.js', 'obryv-ads.js', 'music']) {
    spawnSync('cp', ['-a', path.join(SRC, name), path.join(REC_ROOT, name)], { stdio: 'ignore' });
  }

  let html = fs.readFileSync(path.join(REC_ROOT, 'index.html'), 'utf8');
  html = html.replace('<body>', '<body class="obryv-rec">');
  html = html.replace(
    '</style>',
    `
    body.obryv-rec .bar { display:none !important; }
    body.obryv-rec #viewport {
      position:fixed !important; inset:0 !important;
      width:100vw !important; height:100dvh !important;
      margin:0 !important; border:0 !important; border-radius:0 !important;
    }
    body.obryv-rec .obryv-soft-ad, body.obryv-rec .mob-ctrl, body.obryv-rec #btn-mob-pause {
      display:none !important;
    }
    body.obryv-rec .overlay { pointer-events:auto; }
    body.obryv-rec .hud { opacity:0.92 !important; }
    </style>`
  );
  fs.writeFileSync(path.join(REC_ROOT, 'index.html'), html);

  let js = fs.readFileSync(path.join(REC_ROOT, 'game.js'), 'utf8');
  js = js.replace(
    'new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" })',
    'new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance", preserveDrawingBuffer: true })'
  );
  // Hook bot into game tick (before physics)
  js = js.replace(
    'function tick() {\n  const dt = Math.min(0.033, clock.getDelta());\n  if (mode === "play" && !adBreak) updatePlayer(dt);',
    `function tick() {
  const dt = Math.min(0.033, clock.getDelta());
  if (window.__obryvRec && window.__obryvRec._botOn && mode === "play" && !adBreak) {
    try { window.__obryvRec.botTick(dt); } catch (e) { console.warn("bot", e); }
  }
  if (mode === "play" && !adBreak) updatePlayer(dt);`
  );

  js += `

/* --- shorts recorder bridge (tmp copy only) --- */
window.__obryvRec = {
  _botOn: false,
  _lastJump: 0,
  _stuckMs: 0,
  _lastPos: null,
  mode: () => mode,
  level: () => levelIndex,
  shards: () => ({ got: shardsGot, need: LEVELS[levelIndex] ? LEVELS[levelIndex].shardsNeeded : 0 }),
  lives: () => lives,
  beaconOpen: () => !!(beacon && beacon.open),
  play() {
    const btn = document.getElementById("btn-play") || document.getElementById("btn-result-main");
    if (btn) btn.click();
  },
  clickResult() {
    const btn = document.getElementById("btn-result-main");
    if (btn) btn.click();
  },
  clearKeys() {
    for (const k of Object.keys(keys)) delete keys[k];
    mobile.active = false; mobile.x = 0; mobile.y = 0; mobile.jump = false;
  },
  setBot(on) {
    this._botOn = !!on;
    this._stuckMs = 0;
    this._lastPos = null;
    if (!on) this.clearKeys();
  },
  hush() {
    try { muted = true; musicOn = false; Music.stop(); } catch (_) {}
    window.showFullScreenAd = function (opts) {
      const fn = opts && (opts.onClose || opts.onSkip);
      if (typeof fn === "function") setTimeout(fn, 0);
    };
    window.syncObryvSoftBanners = function () {};
    adBreak = false;
  },
  snapshot() {
    return {
      mode, level: levelIndex, lives, shardsGot,
      need: LEVELS[levelIndex] ? LEVELS[levelIndex].shardsNeeded : 0,
      beaconOpen: !!(beacon && beacon.open),
      x: player.pos.x, y: player.pos.y, z: player.pos.z,
      onGround: player.onGround, yaw: player.yaw,
    };
  },
  botTick(dt) {
    if (mode !== "play") return;
    look.x = 0.36;
    const need = LEVELS[levelIndex].shardsNeeded;
    let tx = null, ty = null, tz = null, reason = "none";

    // 1) nearest real Name
    if (shardsGot < need) {
      let best = Infinity;
      for (const s of shards) {
        if (s.taken || s.decoy) continue;
        const d = player.pos.distanceToSquared(s.mesh.position);
        if (d < best) {
          best = d;
          tx = s.mesh.position.x; ty = s.mesh.position.y; tz = s.mesh.position.z;
          reason = "shard";
        }
      }
    }
    // 2) open beacon
    if (tx == null && beacon && beacon.open) {
      tx = beacon.pos.x; ty = beacon.pos.y; tz = beacon.pos.z;
      reason = "beacon";
    }
    // 3) safe route platform (prefer over distant shard if gap is large)
    const route = computeSafeRoute();
    let nextPlat = null;
    for (const p of route) {
      if (p.gone || p.trap) continue;
      const c = platCenter(p);
      const d = c.distanceTo(player.pos);
      if (d > 1.15) { nextPlat = c; break; }
    }
    if (nextPlat) {
      if (tx == null) {
        tx = nextPlat.x; ty = nextPlat.y; tz = nextPlat.z; reason = "route";
      } else {
        const shardHoriz = Math.hypot(tx - player.pos.x, tz - player.pos.z);
        // If Name is far / off the safe chain, stick to route first
        if (reason === "shard" && shardHoriz > 4.5) {
          tx = nextPlat.x; ty = nextPlat.y; tz = nextPlat.z; reason = "route";
        }
      }
    }
    if (tx == null) {
      // push forward −Z
      tx = player.pos.x; ty = player.pos.y; tz = player.pos.z - 4;
      reason = "fwd";
    }

    // hazard dodge
    for (const h of hazards) {
      const hx = h.mesh.position.x - player.pos.x;
      const hz = h.mesh.position.z - player.pos.z;
      const hd = Math.hypot(hx, hz);
      if (hd < 2.4 && hd > 0.05) {
        tx -= (hx / hd) * 2.2;
        tz -= (hz / hd) * 2.2;
      }
    }

    const dx = tx - player.pos.x;
    const dz = tz - player.pos.z;
    const dist = Math.hypot(dx, dz);
    const desiredYaw = Math.atan2(-dx, -dz);
    let dyaw = desiredYaw - player.yaw;
    while (dyaw > Math.PI) dyaw -= Math.PI * 2;
    while (dyaw < -Math.PI) dyaw += Math.PI * 2;
    player.yaw += Math.max(-0.18, Math.min(0.18, dyaw));

    for (const k of Object.keys(keys)) delete keys[k];
    keys.KeyW = dist > 0.4;
    // micro-strafe if almost aligned but offset
    if (Math.abs(dyaw) > 0.55) keys.KeyW = dist > 0.8;

    const dy = ty - player.pos.y;
    const now = performance.now();
    const needJump = player.onGround && (
      dy > 0.28 ||
      dist > 2.0 ||
      (nextPlat && nextPlat.y > player.pos.y + 0.25)
    );
    if (needJump && now - this._lastJump > 380) {
      keys.Space = true;
      mobile.jump = true;
      this._lastJump = now;
      setTimeout(() => { keys.Space = false; mobile.jump = false; }, 90);
    }

    // unstick: if barely moved, hop sideways
    if (!this._lastPos) this._lastPos = player.pos.clone();
    const moved = player.pos.distanceTo(this._lastPos);
    if (moved < 0.08) this._stuckMs += (dt || 0.016) * 1000;
    else { this._stuckMs = 0; this._lastPos.copy(player.pos); }
    if (this._stuckMs > 700 && player.onGround && now - this._lastJump > 300) {
      player.yaw += (Math.random() > 0.5 ? 0.4 : -0.4);
      keys.Space = true;
      this._lastJump = now;
      this._stuckMs = 0;
      setTimeout(() => { keys.Space = false; }, 90);
    }
  },
};
`;
  fs.writeFileSync(path.join(REC_ROOT, 'game.js'), js);
}

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      let rel = decodeURIComponent(url.pathname);
      if (rel === '/') rel = '/index.html';
      const filePath = path.join(REC_ROOT, rel.replace(/^\//, ''));
      if (!filePath.startsWith(REC_ROOT) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
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

async function main() {
  console.log('Preparing isolated copy…');
  prepareCopy();
  fs.mkdirSync(TMP, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(SHORTS_DIR, { recursive: true });
  fs.mkdirSync(PUBLIC, { recursive: true });
  const framesDir = path.join(TMP, 'frames');
  fs.rmSync(framesDir, { recursive: true, force: true });
  fs.mkdirSync(framesDir, { recursive: true });

  const { server, port } = await startServer();
  console.log('Local rec server', port);

  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || '/usr/bin/chromium-browser',
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--ignore-gpu-blocklist',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-webgl',
      '--hide-scrollbars',
    ],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: W, height: H },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.showFullScreenAd = function (opts) {
        const fn = opts && (opts.onClose || opts.onSkip);
        if (typeof fn === 'function') setTimeout(fn, 0);
      };
      window.syncObryvSoftBanners = function () {};
    });

    await page.goto(`http://127.0.0.1:${port}/index.html?rec=1`, {
      waitUntil: 'networkidle',
      timeout: 90000,
    });
    await page.waitForFunction(() => window.__obryvRec, { timeout: 25000 });
    await page.evaluate(() => window.__obryvRec.hush());
    await page.waitForSelector('#viewport canvas', { timeout: 20000 });
    await sleep(500);

    // CDP screencast — high FPS capture
    const cdp = await context.newCDPSession(page);
    let frameIdx = 0;
    let capturing = true;
    const frameTimes = [];
    const captureStartedAt = Date.now();
    const markers = { start: 0 };

    cdp.on('Page.screencastFrame', async (frame) => {
      try {
        if (!capturing) {
          await cdp.send('Page.screencastFrameAck', { sessionId: frame.sessionId }).catch(() => {});
          return;
        }
        const idx = frameIdx++;
        frameTimes[idx] = Date.now() - captureStartedAt;
        fs.writeFileSync(
          path.join(framesDir, `f${String(idx).padStart(5, '0')}.jpg`),
          Buffer.from(frame.data, 'base64')
        );
        await cdp.send('Page.screencastFrameAck', { sessionId: frame.sessionId });
      } catch (_) {
        try { await cdp.send('Page.screencastFrameAck', { sessionId: frame.sessionId }); } catch (__) {}
      }
    });

    await cdp.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 72,
      maxWidth: W,
      maxHeight: H,
      everyNthFrame: 1,
    });

    // Start campaign
    await page.evaluate(() => {
      window.__obryvRec.hush();
      window.__obryvRec.play();
    });
    await sleep(400);
    await page.waitForFunction(() => window.__obryvRec.mode() === 'play', { timeout: 10000 });
    await page.evaluate(() => {
      window.__obryvRec.hush();
      window.__obryvRec.setBot(true);
      document.body.classList.add('obryv-play', 'obryv-playing');
    });
    markers.play = frameIdx;

    const t0 = Date.now();
    let cleared = 0;
    let lastMode = 'play';
    let sawClimb = false;
    let sawNames = false;
    let sawBeacon = false;
    let sawClear1 = false;
    let sawTier2 = false;
    let sawHold = false;

    while (Date.now() - t0 < TARGET_DURATION_MS) {
      const snap = await page.evaluate(() => window.__obryvRec.snapshot());
      if (!sawClimb && snap.mode === 'play') {
        markers.climb = frameIdx;
        sawClimb = true;
      }
      if (!sawNames && snap.shardsGot >= 1) {
        markers.names = frameIdx;
        sawNames = true;
      }
      if (!sawBeacon && snap.beaconOpen) {
        markers.beacon = frameIdx;
        sawBeacon = true;
      }

      if (snap.mode === 'levelclear' && lastMode !== 'levelclear') {
        markers['clear' + cleared] = frameIdx;
        cleared += 1;
        if (!sawClear1) { markers.clear1 = frameIdx; sawClear1 = true; }
        await sleep(900);
        await page.evaluate(() => {
          window.__obryvRec.hush();
          window.__obryvRec.clickResult();
        });
        await sleep(500);
        await page.evaluate(() => {
          window.__obryvRec.hush();
          window.__obryvRec.setBot(true);
        });
        if (cleared >= MAX_LEVELS) {
          // play a bit into next tier then end on hold
          markers.tier2 = frameIdx;
          sawTier2 = true;
          await sleep(9000);
          markers.hold = frameIdx;
          sawHold = true;
          break;
        }
      }

      if (snap.mode === 'over') {
        // retry and continue
        await page.evaluate(() => {
          window.__obryvRec.hush();
          window.__obryvRec.clickResult();
        });
        await sleep(600);
        await page.evaluate(() => {
          window.__obryvRec.hush();
          window.__obryvRec.setBot(true);
        });
      }

      if (snap.mode === 'play' && snap.level >= 1 && !sawTier2) {
        markers.tier2 = frameIdx;
        sawTier2 = true;
      }

      lastMode = snap.mode;
      await sleep(180);
    }

    if (!sawHold) markers.hold = frameIdx;
    markers.end = frameIdx;

    capturing = false;
    try { await cdp.send('Page.stopScreencast'); } catch (_) {}
    await page.evaluate(() => window.__obryvRec.setBot(false));
    await context.close();

    // Wait for late frames to flush
    await sleep(400);

    let jpgs = fs.readdirSync(framesDir).filter((f) => f.endsWith('.jpg')).sort();
    if (jpgs.length < 40) throw new Error('Too few frames: ' + jpgs.length);

    // Compute real FPS from timestamps
    const lastT = frameTimes[jpgs.length - 1] || (Date.now() - captureStartedAt);
    const realFps = Math.max(10, Math.min(30, (jpgs.length / Math.max(0.5, lastT / 1000))));
    const fpsStr = realFps.toFixed(3);
    const t = (f) => {
      if (f == null) return '0';
      if (frameTimes[f] != null) return (frameTimes[f] / 1000).toFixed(2);
      return (f / realFps).toFixed(2);
    };

    console.log('frames', jpgs.length, 'fps~', fpsStr, 'cleared', cleared, markers);

    // Soft trim: drop trailing flat frames after hold+1.2s if any
    const holdAt = markers.hold || jpgs.length - 1;
    const cutMs = (frameTimes[holdAt] || lastT) + 1500;
    for (const f of jpgs) {
      const n = parseInt(f.replace(/\D/g, ''), 10);
      if (frameTimes[n] != null && frameTimes[n] > cutMs) {
        fs.unlinkSync(path.join(framesDir, f));
      }
    }
    jpgs = fs.readdirSync(framesDir).filter((f) => f.endsWith('.jpg')).sort();
    const total = jpgs.length;
    const durSec = (frameTimes[total - 1] != null
      ? frameTimes[total - 1] / 1000
      : total / realFps).toFixed(2);

    // Recompute fps for trimmed set
    const trimFps = Math.max(10, Math.min(30, total / Math.max(0.5, Number(durSec))));
    const trimFpsStr = trimFps.toFixed(3);

    const cClimb = t(markers.climb || markers.play || 0);
    const cNames = t(markers.names || markers.climb);
    const cBeacon = t(markers.beacon || markers.names);
    const cClear = t(markers.clear1 || markers.beacon);
    const cTier2 = t(markers.tier2 || markers.clear1);
    const cHold = t(markers.hold || markers.end);
    const cEnd = durSec;

    const silent = path.join(TMP, 'silent.mp4');
    await run('ffmpeg', [
      '-y', '-framerate', trimFpsStr, '-i', path.join(framesDir, 'f%05d.jpg'),
      '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'veryfast',
      '-vf',
      [
        'scale=1080:1920:flags=lanczos',
        `drawtext=fontfile=${FONT}:text='Climb…':fontsize=64:fontcolor=white:borderw=4:bordercolor=black@0.85:x=(w-text_w)/2:y=h*0.88:enable='gte(t,${cClimb})*lt(t,${cNames})'`,
        `drawtext=fontfile=${FONT}:text='Names…':fontsize=68:fontcolor=white:borderw=4:bordercolor=black@0.9:x=(w-text_w)/2:y=h*0.88:enable='gte(t,${cNames})*lt(t,${cBeacon})'`,
        `drawtext=fontfile=${FONT}:text='Beacon…':fontsize=68:fontcolor=white:borderw=4:bordercolor=black@0.9:x=(w-text_w)/2:y=h*0.88:enable='gte(t,${cBeacon})*lt(t,${cClear})'`,
        `drawtext=fontfile=${FONT}:text='Cleared…':fontsize=76:fontcolor=0x7dffb0:borderw=5:bordercolor=black@0.95:x=(w-text_w)/2:y=h*0.86:enable='gte(t,${cClear})*lt(t,${cTier2})'`,
        `drawtext=fontfile=${FONT}:text='Higher…':fontsize=68:fontcolor=white:borderw=4:bordercolor=black@0.9:x=(w-text_w)/2:y=h*0.88:enable='gte(t,${cTier2})*lt(t,${cHold})'`,
        `drawtext=fontfile=${FONT}:text='Hold…':fontsize=76:fontcolor=white:borderw=5:bordercolor=black@0.9:x=(w-text_w)/2:y=h*0.86:enable='gte(t,${cHold})*lt(t,${cEnd})'`,
        `drawtext=fontfile=${FONT}:text='serpmonn':fontsize=32:fontcolor=white@0.95:borderw=3:bordercolor=black@0.8:x=(w-text_w)/2:y=h*0.92:enable='gte(t,${cHold})*lt(t,${cEnd})'`,
      ].join(','),
      silent,
    ]);

    const fadeOut = Math.max(0.3, Number(durSec) - 0.5);
    await run('ffmpeg', [
      '-y', '-i', silent, '-stream_loop', '-1', '-i', AUDIO,
      '-filter_complex',
      `[1:a]atrim=0:${durSec},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.3,afade=t=out:st=${fadeOut}:d=0.5,volume=0.32[a]`,
      '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k',
      '-shortest', '-movflags', '+faststart', OUT_FINAL,
    ]);

    fs.copyFileSync(OUT_FINAL, OUT_UPLOAD);
    const pub = path.join(PUBLIC, 'obryv-preview-en-serpmonn.mp4');
    fs.copyFileSync(OUT_FINAL, pub);

    const ss = (sec, out) => run('ffmpeg', ['-y', '-ss', String(sec), '-i', OUT_FINAL, '-update', '1', '-frames:v', '1', out]);
    await ss(Math.min(2, Number(durSec) * 0.08), path.join(OUT_DIR, 'obryv-firstframe.jpg'));
    await ss(Math.min(Number(cClear) || Number(durSec) * 0.45, Number(durSec) - 0.5), path.join(OUT_DIR, 'obryv-clear.jpg'));
    await ss(Math.max(1, Number(cHold) || Number(durSec) - 1.5), path.join(OUT_DIR, 'obryv-hold.jpg'));

    console.log('OK', OUT_FINAL);
    console.log('UPLOAD', OUT_UPLOAD);
    console.log('PUBLIC', pub);
    console.log('dur', durSec, 'fps', trimFpsStr, 'frames', total, 'tiersCleared', cleared);
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
