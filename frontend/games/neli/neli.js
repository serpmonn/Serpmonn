/**
 * Neli — browser demo (top-down)
 * WASD / touch stick · RU/EN · name default Нэли / Neli
 */
let W = 1280;
let H = 720;
const TILE = 32;

const ASSETS = {
  neli: 'assets/characters/neli.jpg',
  hans: 'assets/characters/hans.jpg',
  rey: 'assets/characters/rey.jpg',
  liam: 'assets/characters/liam.jpg',
  'neli-neutral': 'assets/characters/neli-neutral.jpg',
  'neli-thought': 'assets/characters/neli-thought.jpg',
  'neli-interest': 'assets/characters/neli-interest.jpg',
  'neli-anger': 'assets/characters/neli-anger.jpg',
  'neli-awkward': 'assets/characters/neli-awkward.jpg',
  'neli-fear': 'assets/characters/neli-fear.jpg',
  'neli-joy': 'assets/characters/neli-joy.jpg'
};

const NELI_EMOTIONS = new Set([
  'neutral',
  'thought',
  'interest',
  'anger',
  'awkward',
  'fear',
  'joy'
]);

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const ui = {
  title: document.getElementById('screen-title'),
  dialogue: document.getElementById('screen-dialogue'),
  msg: document.getElementById('screen-msg'),
  hud: document.getElementById('hud'),
  nameInput: document.getElementById('name-input'),
  btnStart: document.getElementById('btn-start'),
  btnContinue: document.getElementById('btn-continue'),
  btnLeaderboard: document.getElementById('btn-leaderboard'),
  dlgSpeaker: document.getElementById('dlg-speaker'),
  dlgText: document.getElementById('dlg-text'),
  dlgChoices: document.getElementById('dlg-choices'),
  dlgNext: document.getElementById('dlg-next'),
  dlgContinue: document.getElementById('dlg-continue'),
  dlgLeft: document.getElementById('dlg-left'),
  dlgRight: document.getElementById('dlg-right'),
  msgTitle: document.getElementById('msg-title'),
  msgText: document.getElementById('msg-text'),
  msgOk: document.getElementById('msg-ok'),
  msgLeaderboard: document.getElementById('msg-leaderboard'),
  msgDonate: document.getElementById('msg-donate'),
  hudName: document.getElementById('hud-name'),
  creakWrap: document.getElementById('hud-creak'),
  creakCount: document.getElementById('creak-count'),
  escapeWrap: document.getElementById('hud-escape'),
  escapeCount: document.getElementById('escape-count'),
  clues: document.getElementById('hud-clues'),
  dim: document.getElementById('menu-dim'),
  menu: document.getElementById('screen-menu'),
  btnPause: document.getElementById('btn-pause'),
  menuResume: document.getElementById('menu-resume'),
  menuQuit: document.getElementById('menu-quit'),
  menuQuest: document.getElementById('menu-quest'),
  menuClues: document.getElementById('menu-clues'),
  menuCluesLabel: document.getElementById('menu-clues-label'),
  hudHint: document.getElementById('hud-hint'),
  touch: document.getElementById('touch-ui'),
  stick: document.getElementById('stick'),
  stickKnob: document.getElementById('stick-knob'),
  touchSprint: document.getElementById('touch-sprint'),
  touchAct: document.getElementById('touch-act'),
  goFade: document.getElementById('go-fade')
};

const images = {};
const keys = Object.create(null);
let mouse = { x: W / 2, y: H / 2, worldX: 0, worldY: 0, down: false };
let heroName = 'Нэли';
let mode = 'title'; // title | play | dialogue | msg
let cutscene = false;
let paused = false;
let questKey = '';
let msgSource = { title: '', text: '', deathReason: '' };
let scene = null;
let player = null;
let creaks = 0;
const clues = new Set();
const CLUE_TOTAL = 2;
let house = { liamReady: false, upstairs: false, creakDone: new Set(), escapeActive: false, escapeLeft: 0, clueHintOne: false, clueHintTwo: false, frontDoorReady: false };
let interactFlash = 0;
const SAVE_KEY = 'neli-save';
const NELI_GAME_ID = 'neli';

function syncMouseWorld() {
  const pad = scenePad();
  mouse.worldX = mouse.x - pad.x + cam.x;
  mouse.worldY = mouse.y - pad.y + cam.y;
}
function neliScoreTableUrl() {
  return lang === 'en'
    ? '/frontend/en/games/redsquare2/score_table.html'
    : '/frontend/games/redsquare2/score_table.html';
}

function neliDonateUrl() {
  return lang === 'en'
    ? '/frontend/en/donate/donate.html'
    : '/frontend/donate/donate.html';
}
const ADD_SCORE_URL = '/add-score';
let cam = { x: 0, y: 0 };
let lastTs = 0;
let pendingMsgOk = null;
let dialogueQueue = [];
let dialogueResolve = null;
let dialogueTapLockUntil = 0;

function lockDialogueTap(ms = 480) {
  dialogueTapLockUntil = performance.now() + ms;
}

function dialogueTapReady() {
  return performance.now() >= dialogueTapLockUntil;
}
let dpr = 1;
let audioCtx = null;
let pendingAmbienceScene = null;
const stick = { x: 0, y: 0, active: false };
let touchSprint = false;
let amb = null;
let noiseBuf = null;
let playTime = 0;
let playTiming = false;

function flushPendingAmbience() {
  if (pendingAmbienceScene == null || !audioCtx || audioCtx.state !== 'running') return;
  const id = pendingAmbienceScene;
  pendingAmbienceScene = null;
  setAmbience(id);
}

function ensureAudio() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
    noiseBuf = null;
  }
  if (audioCtx.state === 'suspended') {
    void audioCtx.resume().then(flushPendingAmbience).catch(() => {});
  }
  return audioCtx;
}

function noiseBuffer(ctx) {
  if (noiseBuf && noiseBuf.sampleRate === ctx.sampleRate) return noiseBuf;
  const n = Math.floor(ctx.sampleRate * 2);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < n; i++) {
    last = last * 0.96 + (Math.random() * 2 - 1) * 0.04;
    d[i] = last;
  }
  const seam = Math.min(256, n >> 4);
  const head = d[0];
  for (let i = 0; i < seam; i++) {
    const t = i / seam;
    d[n - seam + i] = d[n - seam + i] * (1 - t) + head * t;
  }
  noiseBuf = buf;
  return buf;
}

function playNoise(ctx, t0, dur, vol, freq, q, type, loop = false) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  src.loop = loop;
  if (loop) {
    src.loopStart = 0;
    src.loopEnd = src.buffer.duration;
  }
  const f = ctx.createBiquadFilter();
  f.type = type || 'bandpass';
  f.frequency.setValueAtTime(freq, t0);
  f.Q.value = q || 1.2;
  const g = ctx.createGain();
  src.connect(f);
  f.connect(g);
  g.connect(ctx.destination);
  const end = t0 + dur;
  const peak = Math.max(vol, 0.0001);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, end);
  g.gain.linearRampToValueAtTime(0, end + 0.02);
  src.start(t0);
  src.stop(end + 0.025);
}

function playOsc(ctx, t0, type, f0, f1, dur, vol) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t0);
  o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t0 + dur);
  o.connect(g);
  g.connect(ctx.destination);
  const end = t0 + dur;
  const peak = Math.max(vol, 0.0001);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, end);
  g.gain.linearRampToValueAtTime(0, end + 0.018);
  o.start(t0);
  o.stop(end + 0.022);
}

function playSfxKind(kind, ctx) {
  const t0 = ctx.currentTime;
    if (kind === 'creak') {
      playNoise(ctx, t0, 0.38, 0.09, 420, 1.8, 'bandpass');
      playOsc(ctx, t0, 'sawtooth', 160, 70, 0.32, 0.035);
      return;
    }
    if (kind === 'hit') {
      playNoise(ctx, t0, 0.45, 0.14, 90, 0.7, 'lowpass');
      playOsc(ctx, t0, 'sine', 90, 32, 0.4, 0.12);
      return;
    }
    if (kind === 'lock') {
      playOsc(ctx, t0, 'square', 880, 420, 0.08, 0.04);
      playOsc(ctx, t0 + 0.07, 'square', 520, 260, 0.1, 0.035);
      playNoise(ctx, t0, 0.16, 0.05, 1800, 4, 'bandpass');
      return;
    }
    if (kind === 'stinger') {
      playOsc(ctx, t0, 'sawtooth', 110, 40, 0.9, 0.1);
      playNoise(ctx, t0, 0.8, 0.1, 70, 0.6, 'lowpass');
      playOsc(ctx, t0 + 0.12, 'sine', 55, 40, 0.7, 0.08);
      return;
    }
    if (kind === 'warn') {
      playOsc(ctx, t0, 'square', 240, 150, 0.18, 0.055);
      playOsc(ctx, t0 + 0.12, 'square', 180, 110, 0.16, 0.045);
      return;
    }
    const tones = {
      click: { type: 'square', f0: 420, f1: 280, dur: 0.06, vol: 0.05 },
      interact: { type: 'triangle', f0: 520, f1: 780, dur: 0.12, vol: 0.07 },
      dialogue: { type: 'sine', f0: 300, f1: 240, dur: 0.05, vol: 0.04 },
      ok: { type: 'sine', f0: 440, f1: 660, dur: 0.1, vol: 0.05 }
    };
    const p = tones[kind] || tones.click;
    playOsc(ctx, t0, p.type, p.f0, p.f1, p.dur, p.vol);
}

function sfx(kind) {
  try {
    const ctx = ensureAudio();
    if (!ctx) return;
    playSfxKind(kind, ctx);
  } catch (_) { /* WebAudio quirks */ }
}

function stopAmbience() {
  if (!amb) return;
  const a = amb;
  amb = null;
  const ctx = audioCtx;
  if (!ctx) {
    try { a.src.stop(); a.osc.stop(); a.gain.disconnect(); } catch (_) { /* already stopped */ }
    return;
  }
  const t = ctx.currentTime;
  const fade = 0.07;
  try {
    a.gain.gain.cancelScheduledValues(t);
    a.gain.gain.setValueAtTime(Math.max(a.gain.gain.value, 0.0001), t);
    a.gain.gain.linearRampToValueAtTime(0, t + fade);
    a.src.stop(t + fade + 0.02);
    a.osc.stop(t + fade + 0.02);
    window.setTimeout(() => {
      try { a.gain.disconnect(); } catch (_) { /* already stopped */ }
    }, (fade + 0.05) * 1000);
  } catch (_) {
    try { a.src.stop(); a.osc.stop(); a.gain.disconnect(); } catch (_) { /* already stopped */ }
  }
}

function ambienceKind(sceneId) {
  if (sceneId === 'forest') return 'forest';
  if (sceneId === 'road') return 'road';
  if (sceneId === 'station') return 'station';
  if (sceneId === 'exit') return 'exit';
  if (sceneId === 'chase') return 'chase';
  return sceneId ? 'house' : null;
}

function setAmbience(sceneId) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const kind = ambienceKind(sceneId);
  if (amb && amb.kind === kind) return;
  stopAmbience();
  if (!kind) return;
  if (ctx.state !== 'running') {
    pendingAmbienceScene = sceneId;
    void ctx.resume().then(flushPendingAmbience).catch(() => {});
    return;
  }
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  src.loop = true;
  src.loopStart = 0;
  src.loopEnd = src.buffer.duration;
  const f = ctx.createBiquadFilter();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  src.connect(f);
  f.connect(g);
  osc.connect(g);
  g.connect(ctx.destination);
  const t = ctx.currentTime;
  if (kind === 'forest') {
    f.type = 'bandpass';
    f.frequency.value = 380;
    f.Q.value = 0.6;
    osc.type = 'sine';
    osc.frequency.value = 48;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.028, t + 1.2);
  } else if (kind === 'road') {
    f.type = 'lowpass';
    f.frequency.value = 220;
    osc.type = 'sine';
    osc.frequency.value = 62;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.016, t + 0.8);
  } else if (kind === 'station') {
    f.type = 'lowpass';
    f.frequency.value = 160;
    osc.type = 'sine';
    osc.frequency.value = 70;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.012, t + 0.8);
  } else if (kind === 'chase') {
    f.type = 'lowpass';
    f.frequency.value = 110;
    osc.type = 'sine';
    osc.frequency.value = 38;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.022, t + 0.5);
  } else if (kind === 'exit') {
    f.type = 'lowpass';
    f.frequency.value = 130;
    osc.type = 'sine';
    osc.frequency.value = 46;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.014, t + 0.8);
  } else {
    f.type = 'lowpass';
    f.frequency.value = 140;
    osc.type = 'sine';
    osc.frequency.value = 52;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.02, t + 1);
  }
  src.start();
  osc.start();
  amb = { kind, src, osc, gain: g };
}

function ambienceForScene(id) {
  if (house.escapeActive) {
    setAmbience('chase');
    return;
  }
  setAmbience(id);
}

function isTouchUi() {
  return window.matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints || 0) > 0;
}

function applyTouchHints() {
  const touch = isTouchUi();
  if (ui.hudHint) ui.hudHint.textContent = t(touch ? 'ui.hintTouch' : 'ui.hint');
  const fine = document.querySelector('#screen-title .fine');
  if (fine) fine.textContent = t(touch ? 'ui.fineTouch' : 'ui.fine');
  if (ui.btnPause) ui.btnPause.setAttribute('aria-label', t('ui.pause'));
  if (ui.touchSprint) ui.touchSprint.setAttribute('aria-label', t('ui.touchRun'));
  if (ui.touchAct) ui.touchAct.setAttribute('aria-label', t('ui.touchActLabel'));
  document.body.classList.toggle('neli-touch', touch);
  scheduleCanvasResize();
}

let canvasResizeRaf = 0;
function scheduleCanvasResize() {
  cancelAnimationFrame(canvasResizeRaf);
  canvasResizeRaf = requestAnimationFrame(() => {
    setupCanvas();
    requestAnimationFrame(setupCanvas);
  });
}

function isControlsMsg() {
  return mode === 'msg' && ui.msg && !ui.msg.hidden && !ui.msg.classList.contains('panel--gameover');
}

function syncTouchUi() {
  if (!ui.touch) return;
  const show = isTouchUi()
    && ui.hud
    && !ui.hud.hidden
    && !paused
    && !cutscene
    && (
      (mode === 'play' && player && !player.bound)
      || isControlsMsg()
    );
  ui.touch.hidden = !show;
  if (!show && stick.active) resetStick();
}

function resetStick() {
  stick.active = false;
  stick.x = 0;
  stick.y = 0;
  touchSprint = false;
  if (ui.stickKnob) ui.stickKnob.style.transform = '';
}

function viewportSize() {
  const vv = window.visualViewport;
  return {
    w: Math.max(1, vv?.width || window.innerWidth),
    h: Math.max(1, vv?.height || window.innerHeight)
  };
}

function gameViewportSize() {
  if (!isTouchUi()) return viewportSize();
  const cw = canvas.clientWidth;
  const ch = canvas.clientHeight;
  if (cw >= 20 && ch >= 20) return { w: cw, h: ch };
  return viewportSize();
}

function setupCanvas() {
  const { w: vw, h: vh } = gameViewportSize();
  dpr = Math.min(window.devicePixelRatio || 1, 3);

  if (isTouchUi()) {
    W = Math.max(320, Math.round(vw));
    H = Math.max(320, Math.round(vh));
  } else {
    const aspect = Math.max(0.42, Math.min(2.5, vw / vh));
    const BASE = 720;
    if (aspect >= 1) {
      H = BASE;
      W = Math.round(BASE * aspect);
    } else {
      W = BASE;
      H = Math.round(BASE / aspect);
    }
  }

  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
  mouse.x = W / 2;
  mouse.y = H / 2;
  refreshOverlayAds();
}

function scenePad() {
  if (!scene) return { x: 0, y: 0 };
  return {
    x: Math.max(0, (W - scene.w) / 2),
    y: Math.max(0, (H - scene.h) / 2)
  };
}

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      console.warn('Не загрузился ассет:', src);
      resolve(null);
    };
    img.src = src;
  });
}

function bindUi() {
  ui.dlgNext.addEventListener('click', () => {
    if (paused || !dialogueTapReady()) return;
    sfx('dialogue');
    advanceDialogue();
  });
  ui.dialogue.addEventListener('click', (e) => {
    if (paused || mode !== 'dialogue' || !dialogueTapReady()) return;
    if (e.target.closest('.choices')) return;
    if (ui.dlgChoices.children.length) return;
    sfx('dialogue');
    advanceDialogue();
  });
  ui.msgOk.addEventListener('click', () => {
    if (paused) return;
    sfx('ok');
    ui.msg.hidden = true;
    if (ui.msgLeaderboard) ui.msgLeaderboard.hidden = true;
    if (ui.msgDonate) ui.msgDonate.hidden = true;
    refreshOverlayAds();
    if (ui.msgOk) {
      ui.msgOk.textContent = t('ui.ok');
      ui.msgOk.classList.remove('secondary');
    }
    const fn = pendingMsgOk;
    pendingMsgOk = null;
    if (fn) fn();
    else setMode('play');
    syncTouchUi();
  });
  if (ui.msgLeaderboard) {
    ui.msgLeaderboard.addEventListener('click', () => {
      if (paused) return;
      ensureAudio();
      sfx('ok');
      openNeliLeaderboardPage();
    });
  }
  if (ui.msgDonate) {
    ui.msgDonate.addEventListener('click', () => {
      ensureAudio();
      sfx('ok');
    });
  }
  ui.btnStart.addEventListener('click', () => { ensureAudio(); sfx('ok'); startGame(false); });
  if (ui.btnContinue) {
    ui.btnContinue.addEventListener('click', () => { ensureAudio(); sfx('ok'); continueGame(); });
  }
  if (ui.btnLeaderboard) {
    ui.btnLeaderboard.addEventListener('click', () => {
      ensureAudio();
      sfx('ok');
      window.location.href = `${neliScoreTableUrl()}#neli`;
    });
  }
  ui.nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { ensureAudio(); startGame(false); }
  });
  ui.btnPause.addEventListener('click', () => setPaused(!paused));
  ui.menuResume.addEventListener('click', () => setPaused(false));
  ui.menuQuit.addEventListener('click', () => quitToTitle());
  ui.dim.addEventListener('click', () => setPaused(false));
  document.querySelectorAll('.lang-btn').forEach((btn) => {
    btn.addEventListener('click', () => setLang(btn.getAttribute('data-lang')));
  });
  window.addEventListener('keydown', onKey);
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  canvas.addEventListener('mousemove', onMouse);
  canvas.addEventListener('mousedown', (e) => {
    if (paused) return;
    ensureAudio();
    mouse.down = true;
    onMouse(e);
    tryInteract();
  });
  canvas.addEventListener('mouseup', () => { mouse.down = false; });
  document.addEventListener('pointerdown', () => ensureAudio());
  bindTouchControls();
}

function bindTouchControls() {
  const el = ui.stick;
  const knob = ui.stickKnob;
  if (!el || !knob) return;

  const setFromEvent = (e) => {
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const max = r.width / 2;
    const len = Math.hypot(dx, dy) || 1;
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    stick.x = dx / max;
    stick.y = dy / max;
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    ensureAudio();
    el.setPointerCapture(e.pointerId);
    stick.active = true;
    setFromEvent(e);
  });
  el.addEventListener('pointermove', (e) => {
    if (!stick.active) return;
    e.preventDefault();
    setFromEvent(e);
  });
  el.addEventListener('pointerup', resetStick);
  el.addEventListener('pointercancel', resetStick);

  const sprint = ui.touchSprint;
  if (sprint) {
    const down = (e) => { e.preventDefault(); ensureAudio(); touchSprint = true; };
    const up = (e) => { e.preventDefault(); touchSprint = false; };
    sprint.addEventListener('pointerdown', down);
    sprint.addEventListener('pointerup', up);
    sprint.addEventListener('pointercancel', up);
    sprint.addEventListener('pointerleave', up);
  }
  ui.touchAct?.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    ensureAudio();
    tryInteract({ quiet: true });
  }, { passive: false });
  ui.touchAct?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
  });
}

async function boot() {
  bindUi();
  applyTouchHints();
  scheduleCanvasResize();
  canvas.style.pointerEvents = 'none';
  window.addEventListener('resize', scheduleCanvasResize);
  window.visualViewport?.addEventListener('resize', scheduleCanvasResize);
  requestAnimationFrame(loop);
  await Promise.all(Object.entries(ASSETS).map(async ([k, src]) => {
    images[k] = await loadImage(src);
  }));
  refreshContinueBtn();
}

function onKey(e) {
  if (e.code === 'Escape') {
    e.preventDefault();
    if (mode === 'title' && ui.title && !ui.title.hidden) return;
    setPaused(!paused);
    return;
  }
  if (paused) return;
  keys[e.code] = true;
  if (mode === 'dialogue' && (e.code === 'Space' || e.code === 'Enter')) {
    e.preventDefault();
    if (!dialogueTapReady()) return;
    if (!ui.dlgChoices.children.length) {
      sfx('dialogue');
      advanceDialogue();
    }
  }
  if (mode === 'play' && (e.code === 'KeyE' || e.code === 'Space')) {
    e.preventDefault();
    tryInteract();
  }
}

function onMouse(e) {
  const r = canvas.getBoundingClientRect();
  mouse.x = ((e.clientX - r.left) / r.width) * W;
  mouse.y = ((e.clientY - r.top) / r.height) * H;
  syncMouseWorld();
}

function formatPlayTime(sec) {
  const total = Math.max(0, Math.floor(sec));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, '0');
  if (h > 0) return `${h}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

function startPlayTimer(fromSec = 0) {
  playTime = fromSec;
  playTiming = true;
}

function stopPlayTimer() {
  playTiming = false;
}

function tickPlayTime(dt) {
  if (!playTiming || paused || !ui.title.hidden) return;
  if (mode === 'msg' || mode === 'title') return;
  playTime += dt;
}

function startGame(isContinue) {
  if (ui.title.hidden) return;
  if (!isContinue) clearSave();
  heroName = (ui.nameInput.value || t('ui.defaultName')).trim().slice(0, 24) || t('ui.defaultName');
  ui.title.hidden = true;
  ui.hud.hidden = false;
  ui.hudName.textContent = heroName;
  creaks = 0;
  clues.clear();
  house.liamReady = false;
  house.upstairs = false;
  house.creakDone = new Set();
  house.clueHintOne = false;
  house.clueHintTwo = false;
  house.frontDoorReady = false;
  stopEscape();
  playTime = 0;
  playTiming = false;
  refreshClues();
  refreshHud();
  showMsg(
    t('ui.controlsTitle'),
    t(isTouchUi() ? 'ui.controlsBodyTouch' : 'ui.controlsBody'),
    () => beginIntro()
  );
  applyTouchHints();
  syncTouchUi();
  scheduleCanvasResize();
  refreshOverlayAds();
}

function readSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !data.id) return null;
    return data;
  } catch (_) {
    return null;
  }
}

function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch (_) { /* ignore */ }
  refreshContinueBtn();
}

function refreshContinueBtn() {
  if (!ui.btnContinue) return;
  ui.btnContinue.hidden = !readSave();
}

function saveCheckpoint(id) {
  if (!id) return;
  if (house.escapeActive && id === 'upstairs') return;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      v: 1,
      id,
      heroName,
      questKey,
      clues: [...clues],
      creaks,
      playTime,
      house: {
        liamReady: house.liamReady,
        upstairs: house.upstairs,
        creakDone: [...house.creakDone],
        clueHintOne: house.clueHintOne,
        clueHintTwo: house.clueHintTwo,
        frontDoorReady: house.frontDoorReady
      }
    }));
  } catch (_) { /* ignore */ }
  refreshContinueBtn();
}

function applySave(data) {
  heroName = data.heroName || t('ui.defaultName');
  ui.hudName.textContent = heroName;
  clues.clear();
  (data.clues || []).forEach((c) => clues.add(c));
  creaks = data.creaks || 0;
  house.liamReady = !!(data.house && data.house.liamReady);
  house.upstairs = !!(data.house && data.house.upstairs);
  house.creakDone = new Set((data.house && data.house.creakDone) || []);
  house.clueHintOne = !!(data.house && data.house.clueHintOne);
  house.clueHintTwo = !!(data.house && data.house.clueHintTwo);
  house.frontDoorReady = !!(data.house && data.house.frontDoorReady);
  playTime = data.playTime ?? (data.house && data.house.playTime) ?? 0;
  stopEscape();
  questKey = data.questKey || '';
  refreshClues();
  refreshHud();
  refreshPauseInfo();
}

function continueGame() {
  const data = readSave();
  if (!data) {
    startGame(false);
    return;
  }
  if (ui.title.hidden) return;
  ui.title.hidden = true;
  resumeFromCheckpoint(data);
}

function resumeFromCheckpoint(data) {
  applySave(data);
  ui.hud.hidden = false;
  startPlayTimer(data.playTime || 0);
  applyTouchHints();
  resumeAt(data.id);
}

function resumeAt(id) {
  setMode('play');
  if (id === 'upstairs') {
    enterHall2('stairs');
  } else if (id === 'living') {
    enterLiving('kitchen');
  } else {
    enterGarage({ resume: true });
  }
  refreshHud();
  syncTouchUi();
}

function refreshOverlayAds() {
  if (typeof window.neliRefreshOverlayAds === 'function') window.neliRefreshOverlayAds();
}

function showMsg(title, text, onOk, extra) {
  msgSource = { title, text, deathReason: extra?.deathReason || '' };
  setMode('msg');
  ui.msgTitle.textContent = tx(title);
  ui.msgText.textContent = tx(text);
  const showLb = !!extra?.showLeaderboard;
  if (ui.msgLeaderboard) {
    ui.msgLeaderboard.hidden = !showLb;
    ui.msgLeaderboard.textContent = t('ui.leaderboard');
  }
  if (ui.msgDonate) {
    ui.msgDonate.hidden = !showLb;
    ui.msgDonate.href = neliDonateUrl();
    const donateLabel = t('ui.donate');
    ui.msgDonate.setAttribute('aria-label', donateLabel);
    ui.msgDonate.title = donateLabel;
  }
  if (ui.msgOk) {
    ui.msgOk.textContent = showLb ? t('ui.toTitle') : t('ui.ok');
    ui.msgOk.classList.toggle('secondary', showLb);
  }
  ui.msg.hidden = false;
  pendingMsgOk = onOk || null;
  syncTouchUi();
  refreshOverlayAds();
}

function quitDemoToTitle() {
  clearSave();
  playTime = 0;
  ui.hud.hidden = true;
  ui.title.hidden = false;
  setMode('title');
  refreshContinueBtn();
  refreshOverlayAds();
}

function openNeliLeaderboardPage() {
  clearSave();
  playTime = 0;
  window.location.href = `${neliScoreTableUrl()}#neli`;
}

function setQuest(key) {
  questKey = key || '';
  refreshPauseInfo();
}

function refreshClues() {
  ui.clues.innerHTML = '';
  [...clues].forEach((c) => {
    const li = document.createElement('li');
    li.textContent = tx(c);
    ui.clues.appendChild(li);
  });
  refreshPauseInfo();
}

function refreshPauseInfo() {
  if (ui.menuQuest) {
    ui.menuQuest.textContent = questKey ? t(questKey) : t('ui.questEmpty');
  }
  if (ui.menuClues) {
    ui.menuClues.innerHTML = '';
    [...clues].forEach((c) => {
      const li = document.createElement('li');
      li.textContent = tx(c);
      ui.menuClues.appendChild(li);
    });
  }
  if (ui.menuCluesLabel) ui.menuCluesLabel.hidden = clues.size === 0;
}

function addCreak(c) {
  if (c?.id) house.creakDone.add(c.id);
  creaks += 1;
  refreshHud();
  sfx('creak');
  if (creaks >= 3) {
    sfx('hit');
    gameOver('death.creak');
  }
}

function stopEscape() {
  house.escapeActive = false;
  house.escapeLeft = 0;
  if (ui.escapeWrap) ui.escapeWrap.classList.remove('urgent');
  refreshHud();
  if (scene) ambienceForScene(scene.id);
}

function startEscape() {
  house.escapeActive = true;
  house.escapeLeft = 15;
  house.escapeTick = false;
  setQuest('quest.run');
  refreshHud();
  sfx('lock');
  window.setTimeout(() => sfx('warn'), 140);
  setAmbience('chase');
}

function refreshEscapeHud() {
  if (!ui.escapeWrap || !ui.escapeCount) return;
  if (!house.escapeActive) {
    ui.escapeWrap.hidden = true;
    return;
  }
  ui.escapeWrap.hidden = false;
  const sec = Math.max(0, Math.ceil(house.escapeLeft));
  ui.escapeCount.textContent = String(sec);
  ui.escapeWrap.classList.toggle('urgent', house.escapeLeft <= 5);
}

const UPSTAIRS_ROOMS = new Set(['hall2', 'storage1', 'storage2', 'guest1']);

function refreshHud() {
  if (ui.creakWrap && ui.creakCount) {
    const showCreak = house.upstairs && UPSTAIRS_ROOMS.has(scene?.id);
    ui.creakWrap.hidden = !showCreak;
    ui.creakCount.textContent = String(creaks);
  }
  refreshEscapeHud();
}

function tickEscape(dt) {
  if (!house.escapeActive || paused || mode !== 'play') return;
  house.escapeLeft -= dt;
  refreshEscapeHud();
  if (house.escapeLeft <= 5 && !house.escapeTick) {
    house.escapeTick = true;
    sfx('warn');
  }
  if (house.escapeLeft <= 0) {
    stopEscape();
    sfx('hit');
    gameOver('death.hansCatch');
  }
}

function resolveDeathText(reason) {
  if (typeof reason === 'string' && reason.startsWith('death.')) return t(reason);
  return tx(reason);
}

function buildGameOverBody(reason) {
  const lead = resolveDeathText(reason);
  if (readSave()) return lead + '\n\n' + t('ui.checkpointHint');
  return lead + '\n\n' + t('ui.gameOverFate') + '\n\n' + t('ui.restartHint');
}

function gameOver(reason) {
  setPaused(false);
  abortWalks();
  stopEscape();
  stopAmbience();
  ui.dialogue.hidden = true;
  ui.hud.hidden = true;
  canvas.classList.add('is-dying');
  if (ui.goFade) {
    ui.goFade.hidden = false;
    ui.goFade.classList.add('is-on');
  }
  sfx('hit');
  window.setTimeout(() => {
    scene = null;
    canvas.classList.remove('is-dying');
    setMode('msg');
    showMsg(t('ui.end'), buildGameOverBody(reason), () => {
      if (ui.goFade) {
        ui.goFade.classList.remove('is-on');
        ui.goFade.hidden = true;
      }
      const data = readSave();
      if (data) {
        resumeFromCheckpoint(data);
        return;
      }
      ui.hud.hidden = true;
      ui.title.hidden = false;
      setMode('title');
      refreshContinueBtn();
    }, { deathReason: reason });
    window.setTimeout(() => {
      if (typeof window.neliShowDeathFullscreenAd === 'function') {
        window.neliShowDeathFullscreenAd({ continueLabel: t('ui.ok') });
      }
    }, 500);
  }, 850);
}

function neliLeaderboardScore() {
  return Math.max(1, Math.min(86400, Math.floor(playTime)));
}

function submitNeliScore() {
  const nickname = (heroName || t('ui.defaultName')).trim().slice(0, 40);
  const score = neliLeaderboardScore();
  return fetch(ADD_SCORE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nickname, score, gameId: NELI_GAME_ID })
  }).catch(() => {});
}

async function demoEnd() {
  setPaused(false);
  abortWalks();
  stopAmbience();
  stopPlayTimer();
  setMode('msg');
  scene = null;
  const clueLine = t('ui.demoEndClues', { n: clues.size, total: CLUE_TOTAL });
  const timeLine = t('ui.demoEndTime', { time: formatPlayTime(playTime) });
  await submitNeliScore();
  const lbHint = t('ui.demoEndLbHint');
  showMsg(
    t('ui.demoEnd'),
    t('ui.demoEndBody') + '\n\n' + clueLine + '\n\n' + timeLine + '\n\n' + lbHint,
    () => quitDemoToTitle(),
    { showLeaderboard: true }
  );
}

/* ---------- dialogue ---------- */
function runDialogue(lines) {
  return new Promise((resolve) => {
    if (ui.msg) ui.msg.hidden = true;
    if (ui.msgLeaderboard) ui.msgLeaderboard.hidden = true;
    if (ui.msgDonate) ui.msgDonate.hidden = true;
    dialogueQueue = lines.slice();
    dialogueResolve = resolve;
    setMode('dialogue');
    ui.dialogue.hidden = false;
    lockDialogueTap();
    showDialogueLine();
    refreshOverlayAds();
  });
}

function showDialogueLine() {
  const line = dialogueQueue[0];
  if (!line) {
    ui.dialogue.hidden = true;
    ui.dlgChoices.innerHTML = '';
    if (ui.dlgContinue) ui.dlgContinue.hidden = true;
    ui.dlgNext.hidden = true;
    setMode('play');
    const r = dialogueResolve;
    dialogueResolve = null;
    if (r) r();
    refreshOverlayAds();
    return;
  }
  ui.dlgSpeaker.textContent = tx(line.speaker || '');
  ui.dlgSpeaker.hidden = !line.speaker;
  ui.dlgText.textContent = line.textKey
    ? t(line.textKey, { name: heroName })
    : tx(line.text || '');
  ui.dlgChoices.innerHTML = '';
  ui.dlgNext.hidden = true;
  if (ui.dlgContinue) ui.dlgContinue.hidden = !!line.choices;

  setPortrait(ui.dlgLeft, line.left, line.emotion);
  setPortrait(ui.dlgRight, line.right, line.rightEmotion);

  if (line.choices) {
    line.choices.forEach((ch) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = tx(ch.label);
      b.addEventListener('click', () => {
        if (paused) return;
        sfx('click');
        dialogueQueue.shift();
        if (ch.goto) dialogueQueue = ch.goto.concat(dialogueQueue);
        if (ch.effect) ch.effect();
        showDialogueLine();
      });
      ui.dlgChoices.appendChild(b);
    });
  }
  refreshOverlayAds();
}

function portraitAssetKey(key, emotion) {
  if (key !== 'neli') return key;
  const e = NELI_EMOTIONS.has(emotion) ? emotion : 'neutral';
  const asset = `neli-${e}`;
  return images[asset] ? asset : 'neli-neutral';
}

function setPortrait(el, key, emotion) {
  const assetKey = portraitAssetKey(key, emotion);
  if (assetKey && images[assetKey]) {
    el.hidden = false;
    el.classList.remove('gen-bust');
    el.src = ASSETS[assetKey];
    el.alt = assetKey;
    return;
  }
  if (key && typeof NeliSprites !== 'undefined' && NeliSprites.portraitUrl) {
    el.hidden = false;
    el.classList.add('gen-bust');
    el.src = NeliSprites.portraitUrl(key);
    el.alt = key;
    return;
  }
  el.hidden = true;
  el.classList.remove('gen-bust');
  el.removeAttribute('src');
}

function advanceDialogue() {
  if (dialogueQueue[0]?.choices) return;
  if (!dialogueTapReady()) return;
  dialogueQueue.shift();
  showDialogueLine();
}

function setMode(next) {
  mode = next;
  canvas.style.pointerEvents = (!paused && mode === 'play' && !cutscene) ? 'auto' : 'none';
  syncTouchUi();
}

function abortWalks() {
  scene?.npcs?.forEach((n) => {
    if (!n.walk) return;
    const done = n.walk.resolve;
    n.walk = null;
    done?.();
  });
}

function setPaused(on) {
  if (mode === 'title' && !ui.title.hidden && on) return;
  paused = !!on;
  ui.menu.hidden = !paused;
  ui.dim.hidden = !paused;
  if (paused) {
    Object.keys(keys).forEach((k) => { keys[k] = false; });
  }
  canvas.style.pointerEvents = (!paused && mode === 'play' && !cutscene) ? 'auto' : 'none';
  if (paused) resetStick();
  syncTouchUi();
  if (paused) refreshPauseInfo();
  refreshOverlayAds();
}

function quitToTitle() {
  abortWalks();
  paused = false;
  cutscene = false;
  questKey = '';
  scene = null;
  player = null;
  dialogueQueue = [];
  const r = dialogueResolve;
  dialogueResolve = null;
  pendingMsgOk = null;
  ui.dialogue.hidden = true;
  ui.msg.hidden = true;
  ui.menu.hidden = true;
  ui.dim.hidden = true;
  ui.hud.hidden = true;
  ui.title.hidden = false;
  setMode('title');
  refreshContinueBtn();
  stopAmbience();
  stopPlayTimer();
  playTime = 0;
  refreshOverlayAds();
  if (r) r();
}

window.onNeliLangChange = function () {
  applyTouchHints();
  refreshPauseInfo();
  refreshContinueBtn();
  if (!ui.dialogue.hidden) showDialogueLine();
  refreshClues();
  refreshHud();
  if (!ui.msg.hidden) {
    if (msgSource.deathReason) {
      ui.msgTitle.textContent = t('ui.end');
      ui.msgText.textContent = buildGameOverBody(msgSource.deathReason);
      msgSource.text = ui.msgText.textContent;
    } else {
      ui.msgTitle.textContent = tx(msgSource.title);
      ui.msgText.textContent = tx(msgSource.text);
    }
  }
};

function withCutscene(fn) {
  cutscene = true;
  canvas.style.pointerEvents = 'none';
  syncTouchUi();
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      cutscene = false;
      canvas.style.pointerEvents = (!paused && mode === 'play') ? 'auto' : 'none';
      syncTouchUi();
    });
}

function walkActor(who, x, y, speed = 190) {
  return new Promise((resolve) => {
    if (!who) {
      resolve();
      return;
    }
    who.hidden = false;
    who.walk = { x, y, speed, resolve };
  });
}

function walkNpc(npc, x, y, speed = 190) {
  return walkActor(npc, x, y, speed);
}

function walkPlayer(x, y, speed = 170) {
  return walkActor(player, x, y, speed);
}

function tickActorWalk(who, dt) {
  if (!who?.walk) return;
  const dx = who.walk.x - who.x;
  const dy = who.walk.y - who.y;
  const dist = Math.hypot(dx, dy);
  const step = who.walk.speed * dt;
  if (dist <= step) {
    who.x = who.walk.x;
    who.y = who.walk.y;
    const done = who.walk.resolve;
    who.walk = null;
    who.moving = false;
    NeliSprites.tick(who, dt, false, false);
    done?.();
    return;
  }
  const mx = (dx / dist) * step;
  const my = (dy / dist) * step;
  who.x += mx;
  who.y += my;
  const d = NeliSprites.dirFrom(mx, my);
  if (d) who.dir = d;
  who.moving = true;
  NeliSprites.tick(who, dt, true, who.walk.speed > 220);
}

function updateNpcWalks(dt) {
  scene?.npcs?.forEach((n) => {
    if (n.walk) tickActorWalk(n, dt);
    else {
      n.moving = false;
      NeliSprites.tick(n, dt, false, false);
    }
  });
  if (player?.walk) tickActorWalk(player, dt);
}

/* ---------- world helpers ---------- */
function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

const SPRITE = { ox: 16, oy: 56, player: 52, npc: 52, gap: 8 };

function spriteBox(x, y, size) {
  return {
    x: x - SPRITE.ox - SPRITE.gap,
    y: y - SPRITE.oy - SPRITE.gap,
    w: size + SPRITE.gap * 2,
    h: size + SPRITE.gap * 2
  };
}

function npcSprite(n) {
  if (!n.key) {
    const w = n.w || 28;
    const h = n.h || 28;
    return { x: n.x - SPRITE.gap, y: n.y - SPRITE.gap, w: w + SPRITE.gap * 2, h: h + SPRITE.gap * 2 };
  }
  return spriteBox(n.x, n.y, SPRITE.npc);
}

const WALKABLE_KINDS = new Set(['rug', 'none', 'drain']);

function isBlockingProp(p) {
  if (!p || p.hidden) return false;
  if (p.solid === false) return false;
  if (p.solid) return true;
  const kind = typeof inferPropKind === 'function' ? inferPropKind(p) : 'block';
  return !WALKABLE_KINDS.has(kind);
}

function unstickPlayer() {
  if (!player || !scene) return;
  if (!solidAt(scene, player.x, player.y, player.w, player.h)) return;
  for (let r = 8; r <= 96; r += 8) {
    const dirs = [
      [r, 0], [-r, 0], [0, r], [0, -r],
      [r, r], [-r, r], [r, -r], [-r, -r]
    ];
    for (const [dx, dy] of dirs) {
      const x = player.x + dx;
      const y = player.y + dy;
      if (!solidAt(scene, x, y, player.w, player.h)) {
        player.x = x;
        player.y = y;
        return;
      }
    }
  }
}

function insetBounds(w, h, m, t, back) {
  const side = (m == null ? WALL_M : m) + (t == null ? WALL_T : t);
  const top = (m == null ? WALL_M : m) + (back == null ? WALL_BACK : back);
  return { x: side, y: top, w: w - side * 2, h: h - side - top };
}

function worldSolidAt(scene, x, y, w, h) {
  if (!scene) return true;
  if (x < 0 || y < 0 || x + w > scene.w || y + h > scene.h) return true;
  if (scene.bounds) {
    const b = scene.bounds;
    if (x < b.x || y < b.y || x + w > b.x + b.w || y + h > b.y + b.h) return true;
  }
  const box = { x, y, w, h };
  if (scene.walls.some((wall) => rectsOverlap(box, wall))) return true;
  return (scene.props || []).some((p) => isBlockingProp(p) && rectsOverlap(box, p));
}

function clampPlayerToWorld() {
  if (!player || !scene) return;
  player.x = Math.max(0, Math.min(scene.w - player.w, player.x));
  player.y = Math.max(0, Math.min(scene.h - player.h, player.y));
  if (scene.bounds) {
    const b = scene.bounds;
    player.x = Math.max(b.x, Math.min(b.x + b.w - player.w, player.x));
    player.y = Math.max(b.y, Math.min(b.y + b.h - player.h, player.y));
  }
}

function charHitsOthers(self, x, y) {
  const box = self === player || self?.isPlayer
    ? spriteBox(x, y, SPRITE.player)
    : spriteBox(x, y, self?.key ? SPRITE.npc : (self?.w || 28));
  if (player && self !== player && rectsOverlap(box, spriteBox(player.x, player.y, SPRITE.player))) return true;
  return (scene?.npcs || []).some((n) => {
    if (n === self || n.hidden || n.solid === false) return false;
    return rectsOverlap(box, npcSprite(n));
  });
}

function makePlayer(x, y) {
  return {
    x, y, w: 22, h: 22, speed: 140,
    facing: 0,
    dir: 'down',
    frame: 0,
    animT: 0,
    bound: false
  };
}

function npcBody(n) {
  return npcSprite(n);
}

function solidAt(scene, x, y, w, h) {
  if (worldSolidAt(scene, x, y, w, h)) return true;
  return charHitsOthers(player, x, y);
}

function tryInteract(opts = {}) {
  if (paused || mode !== 'play' || !scene || !player || player.bound || cutscene) return;
  const reach = 64;
  const cx = player.x + player.w / 2;
  const cy = player.y + player.h / 2;

  const underCursor = scene.interactables.find((it) => {
    if (it.done) return false;
    const pad = 8;
    return (
      mouse.worldX >= it.x - pad &&
      mouse.worldX <= it.x + it.w + pad &&
      mouse.worldY >= it.y - pad &&
      mouse.worldY <= it.y + it.h + pad
    );
  });

  const nearPlayer = scene.interactables.find((it) => {
    if (it.done) return false;
    const ix = it.x + it.w / 2;
    const iy = it.y + it.h / 2;
    return Math.hypot(ix - cx, iy - cy) < reach + Math.max(it.w, it.h) / 2;
  });

  const target = underCursor || nearPlayer;
  if (target?.onInteract) {
    const ix = target.x + target.w / 2;
    const iy = target.y + target.h / 2;
    const dist = Math.hypot(ix - cx, iy - cy);
    if (dist > reach + Math.max(target.w, target.h) / 2 + 20) {
      sfx('warn');
      return;
    }
    sfx('interact');
    interactFlash = 0.25;
    target.onInteract(target);
    return;
  }

  const npc = pickTalkNpc(cx, cy, reach);
  if (npc) {
    sfx('interact');
    interactFlash = 0.25;
    talkWith(npc);
    return;
  }

  if (!opts.quiet) sfx('click');
}

function pickTalkNpc(cx, cy, reach) {
  if (!scene?.npcs) return null;
  const under = scene.npcs.find((n) => {
    if (n.hidden || n.talk === false) return false;
    const b = npcSprite(n);
    return (
      mouse.worldX >= b.x &&
      mouse.worldX <= b.x + b.w &&
      mouse.worldY >= b.y &&
      mouse.worldY <= b.y + b.h
    );
  });
  const near = scene.npcs.find((n) => {
    if (n.hidden || n.talk === false) return false;
    const b = npcSprite(n);
    const ix = b.x + b.w / 2;
    const iy = b.y + b.h / 2;
    return Math.hypot(ix - cx, iy - cy) < reach + Math.max(b.w, b.h) / 2;
  });
  return under || near || null;
}

async function talkWith(npc) {
  const lines = dialogueForNpc(npc);
  if (lines?.length) await runDialogue(lines);
}

function dialogueForNpc(npc) {
  const sid = scene?.id || '';
  if (npc.id === 'rey') {
    if (sid === 'garage') {
      return [
        {
          speaker: heroName,
          left: 'neli',
          emotion: 'thought',
          text: '…'
        },
        {
          speaker: 'Рей',
          right: 'rey',
          text: 'Чего уставилась? Вали, пока я не передумал.'
        },
        {
          speaker: heroName,
          left: 'neli',
          emotion: 'interest',
          text: 'Кто вы такие? Почему этот дом?'
        },
        {
          speaker: 'Рей',
          right: 'rey',
          text: 'Любопытство — плохая привычка. Особенно в форме.'
        }
      ];
    }
    return [
      { speaker: 'Рей', right: 'rey', text: 'Не сейчас.' }
    ];
  }
  if (npc.id === 'liam') {
    if (sid === 'garage') {
      return [
        {
          speaker: heroName,
          left: 'neli',
          emotion: 'thought',
          text: 'Лиам… ты правда поможешь?'
        },
        {
          speaker: 'Лиам',
          right: 'liam',
          text: 'Тише. Дверь в дом — справа. Дальше — как скажу. И не геройствуй.'
        }
      ];
    }
    if (sid === 'kitchen' || sid === 'hall1' || sid === 'living') {
      return [
        {
          speaker: heroName,
          left: 'neli',
          emotion: 'thought',
          text: 'Где выход?'
        },
        {
          speaker: 'Лиам',
          right: 'liam',
          text: 'Через кухню — в гостиную. Выход внизу, лестница справа вверху. Серые двери не трогай — это комнаты Ханса.'
        },
        {
          speaker: heroName,
          left: 'neli',
          emotion: 'interest',
          text: 'Кто такой Ханс?'
        },
        {
          speaker: 'Лиам',
          right: 'liam',
          text: 'Хозяин. Если встретишь — мы оба трупы. Идём.'
        }
      ];
    }
    if (sid === 'hall2' || sid === 'storage1' || sid === 'storage2' || sid === 'guest1') {
      if (clues.size >= CLUE_TOTAL) {
        return [
          {
            speaker: 'Лиам',
            right: 'liam',
            text: 'Хватит копаться. Лестница вниз — и к входу. Быстро.'
          }
        ];
      }
      if (clues.size >= 1) {
        return [
          {
            speaker: 'Лиам',
            right: 'liam',
            text: 'Можете ещё осмотреть комнаты — или спускайтесь к выходу.'
          }
        ];
      }
      return [
        {
          speaker: heroName,
          left: 'neli',
          emotion: 'interest',
          text: 'Что здесь искать?'
        },
        {
          speaker: 'Лиам',
          right: 'liam',
          text: 'Я… не должен тебе это говорить. Но если уж осталась — заходи в двери с коридора. И не скрипи досками, ради бога.'
        },
        {
          speaker: heroName,
          left: 'neli',
          emotion: 'awkward',
          text: 'Ты сам чья сторона?'
        },
        {
          speaker: 'Лиам',
          right: 'liam',
          text: 'Та, где я ещё дышу. Не усложняй.'
        }
      ];
    }
    if (sid === 'exit') {
      return [
        { speaker: 'Лиам', right: 'liam', text: '…Не сейчас.' }
      ];
    }
    return [
      { speaker: 'Лиам', right: 'liam', text: 'Потом поговорим.' }
    ];
  }
  if (npc.id === 'boss') {
    return [
      {
        speaker: 'Начальник полиции',
        right: 'boss',
        text: 'Чего стоишь? Дела сами себя не раскрывают.'
      }
    ];
  }
  if (npc.id === 'hans') {
    return [
      { speaker: '…', right: 'hans', text: '…' }
    ];
  }
  return null;
}

function nearestCreak(scene, px, py) {
  return scene.creaks?.find((c) => {
    const dx = (c.x + c.w / 2) - px;
    const dy = (c.y + c.h / 2) - py;
    return Math.hypot(dx, dy) < Math.max(22, c.w / 2 + 6);
  });
}

function onProp(p, extra) {
  return Object.assign({ x: p.x, y: p.y, w: p.w, h: p.h }, extra);
}

const WALL_M = 40;
const WALL_T = 24;
const WALL_BACK = 80;

function makeBoxWalls(rw, rh, doors) {
  const m = WALL_M;
  const t = WALL_T;
  const north = { x: m, y: m, w: rw - m * 2, h: WALL_BACK };
  const west = { x: m, y: m, w: t, h: rh - m * 2 };
  const east = { x: rw - m - t, y: m, w: t, h: rh - m * 2 };
  const south = { x: m, y: rh - m - t, w: rw - m * 2, h: t };
  const walls = [];
  function cut(wall, axis, holes) {
    if (!holes.length) {
      walls.push(wall);
      return;
    }
    const start = axis === 'x' ? wall.x : wall.y;
    const end = start + (axis === 'x' ? wall.w : wall.h);
    let cursor = start;
    holes
      .slice()
      .sort((a, b) => a.pos - b.pos)
      .forEach((d) => {
        const hole0 = d.pos;
        const hole1 = d.pos + d.len;
        if (hole0 > cursor) {
          if (axis === 'x') walls.push({ x: cursor, y: wall.y, w: hole0 - cursor, h: wall.h });
          else walls.push({ x: wall.x, y: cursor, w: wall.w, h: hole0 - cursor });
        }
        cursor = Math.max(cursor, hole1);
      });
    if (cursor < end) {
      if (axis === 'x') walls.push({ x: cursor, y: wall.y, w: end - cursor, h: wall.h });
      else walls.push({ x: wall.x, y: cursor, w: wall.w, h: end - cursor });
    }
  }
  cut(north, 'x', doors.filter((d) => d.side === 'n'));
  cut(south, 'x', doors.filter((d) => d.side === 's'));
  cut(west, 'y', doors.filter((d) => d.side === 'w'));
  cut(east, 'y', doors.filter((d) => d.side === 'e'));
  return walls;
}

function doorOn(rw, rh, side, pos, len, label) {
  const m = WALL_M;
  const t = WALL_T;
  if (side === 'e') return { x: rw - m - t, y: pos, w: t, h: len, label, solid: true, kind: 'door' };
  if (side === 'w') return { x: m, y: pos, w: t, h: len, label, solid: true, kind: 'door' };
  if (side === 'n') return { x: pos, y: m, w: len, h: WALL_BACK, label, solid: true, kind: 'door' };
  return { x: pos, y: rh - m - t, w: len, h: t, label, solid: true, kind: 'door' };
}

function spawnInside(rw, rh, side, pos, len) {
  const m = WALL_M;
  const t = WALL_T;
  const mid = pos + len / 2 - 11;
  if (side === 'w') return makePlayer(m + t + 18, mid);
  if (side === 'e') return makePlayer(rw - m - t - 40, mid);
  if (side === 'n') return makePlayer(mid, m + WALL_BACK + 18);
  return makePlayer(mid, rh - m - t - 40);
}

function liamNpc(x, y) {
  return { id: 'liam', x, y, key: 'liam', label: 'Лиам', dir: 'down', frame: 0, animT: 0 };
}

function openRoom(opts) {
  const { id, w, h, floor, doors, props, npcs, creaks, spawn, interactables } = opts;
  cam = { x: 0, y: 0 };
  doors.forEach((d) => {
    d.prop = doorOn(w, h, d.side, d.pos, d.len, d.label);
    if (d.locked) d.prop.locked = true;
  });
  const sp = spawn || doors[0];
  player = spawnInside(w, h, sp.side, sp.pos, sp.len);
  scene = {
    id,
    w,
    h,
    floor: floor || '#1e1a16',
    walls: makeBoxWalls(w, h, doors),
    props: doors.map((d) => d.prop).concat(props || []),
    npcs: npcs || [],
    creaks: creaks || [],
    interactables: doors
      .map((d) =>
        onProp(d.prop, {
          label: d.useLabel || 'дверь',
          marker: d.marker,
          onInteract: d.onInteract
        })
      )
      .concat(interactables || [])
  };
  scene.bounds = insetBounds(w, h);
  clampPlayerToWorld();
  unstickPlayer();
  ambienceForScene(id);
  refreshHud();
}

function creak(id, x, y, w, h) {
  return { id, x, y, w: w || 52, h: h || 22 };
}

function markCreaks(list) {
  return list.map((c) => Object.assign({}, c, { _latched: house.creakDone.has(c.id) }));
}

function hallCreaks() {
  return markCreaks([
    creak('h2a', 180, 228),
    creak('h2b', 320, 242),
    creak('h2c', 480, 230),
    creak('h2d', 620, 248),
    creak('h2e', 780, 234),
    creak('h2f', 920, 246),
    creak('h2g', 1060, 238),
    creak('h2h', 350, 268),
    creak('h2i', 750, 262),
    creak('h2j', 900, 320),
    creak('h2k', 820, 340),
    creak('h2l', 200, 310),
    creak('h2m', 260, 330)
  ]);
}

function storage1Creaks() {
  return markCreaks([
    creak('s1a', 220, 280),
    creak('s1b', 280, 300),
    creak('s1c', 340, 320),
    creak('s1d', 400, 340),
    creak('s1e', 180, 260)
  ]);
}

function storage2Creaks() {
  return markCreaks([
    creak('s2a', 480, 290),
    creak('s2b', 540, 310),
    creak('s2c', 400, 330),
    creak('s2d', 320, 300),
    creak('s2e', 580, 350)
  ]);
}

function guest1Creaks() {
  return markCreaks([
    creak('g1a', 130, 170),
    creak('g1b', 480, 190),
    creak('g1c', 520, 280),
    creak('g1d', 150, 380),
    creak('g1e', 450, 360)
  ]);
}

/* ---------- scenes ---------- */
async function beginIntro() {
  startPlayTimer(0);
  setMode('play');
  setQuest('quest.boss');
  enterPoliceStation();
}

function enterPoliceStation() {
  cam = { x: 0, y: 0 };
  player = makePlayer(200, 300);
  const desk = { x: 520, y: 148, w: 140, h: 80, color: '#353a42', label: 'стол начальника' };
  const exitDoor = { x: 680, y: 446, w: 70, h: 24, label: 'дверь на улицу', solid: true, kind: 'door' };
  scene = {
    id: 'station',
    w: 900,
    h: 520,
    floor: '#2c3038',
    bounds: { x: 84, y: 138, w: 732, h: 308 },
    walls: [
      { x: 60, y: 50, w: 780, h: 80 },
      { x: 60, y: 50, w: 24, h: 420 },
      { x: 816, y: 50, w: 24, h: 420 },
      { x: 60, y: 446, w: 620, h: 24 },
      { x: 750, y: 446, w: 90, h: 24 },
      { x: 400, y: 50, w: 24, h: 180 }
    ],
    props: [
      { x: 100, y: 140, w: 100, h: 60, color: '#3a4048', label: 'ресепшен' },
      desk,
      { x: 700, y: 300, w: 80, h: 100, color: '#2a3038', label: 'шкаф дел' },
      exitDoor
    ],
    npcs: [
      { id: 'boss', x: 575, y: 232, key: 'boss', label: 'Начальник полиции', dir: 'left' }
    ],
    creaks: [],
    interactables: [
      onProp(desk, {
        id: 'boss-talk',
        label: 'поговорить с начальником полиции',
        marker: true,
        once: true,
        onInteract: async (it) => {
          it.done = true;
          await runDialogue([
            {
              speaker: 'Начальник полиции',
              right: 'boss',
              textKey: 'dlg.boss.assign'
            },
            {
              speaker: heroName,
              left: 'neli',
              emotion: 'interest',
              text: 'Есть, сэр. …Честно — не знаю, с чего начать. Но готова.'
            },
            {
              speaker: 'Начальник полиции',
              right: 'boss',
              text: 'Начни с дороги на соседний город. Там видели странный транспорт — фургон, которому там не место. Проверь и доложи.'
            }
          ]);
          setQuest('quest.road');
          scene.interactables.push(
            onProp(exitDoor, {
              id: 'exit-station',
              label: '→ на улицу / дорога',
              marker: true,
              onInteract: () => enterRoad()
            })
          );
        }
      })
    ]
  };
  ambienceForScene('station');
  syncTouchUi();
}

function enterRoad() {
  cam = { x: 0, y: 0 };
  player = makePlayer(300, 1240);
  setQuest('quest.van');
  let vanSeen = false;
  const van = {
    id: 'van',
    kind: 'van',
    facing: 'e',
    x: 300,
    y: 268,
    w: 148,
    h: 58,
    solid: true,
    label: 'фургон'
  };
  const forestPath = {
    x: 460,
    y: 250,
    w: 200,
    h: 80,
    kind: 'none',
    label: 'тропинка в лес'
  };
  scene = {
    id: 'road',
    w: 900,
    h: 1400,
    floor: '#3a3a32',
    bounds: { x: 40, y: 80, w: 792, h: 1288 },
    floors: [
      { x: 440, y: 248, w: 360, h: 88, color: '#2a2418', label: 'тропинка' }
    ],
    walls: [
      { x: 176, y: 1376, w: 288, h: 24 }
    ],
    props: [
      van,
      forestPath,
      { kind: 'trees', x: 20, y: 80, w: 110, h: 120, label: 'Волчий лес' },
      { kind: 'trees', x: 40, y: 280, w: 100, h: 110, label: 'Волчий лес' },
      { kind: 'trees', x: 16, y: 520, w: 96, h: 115, label: 'Волчий лес' },
      { kind: 'trees', x: 36, y: 780, w: 108, h: 120, label: 'Волчий лес' },
      { kind: 'trees', x: 24, y: 1060, w: 100, h: 110, label: 'Волчий лес' },
      { kind: 'trees', x: 80, y: 20, w: 140, h: 130, label: 'Волчий лес' },
      { kind: 'trees', x: 280, y: 8, w: 150, h: 140, label: 'Волчий лес' },
      { kind: 'trees', x: 480, y: 0, w: 160, h: 150, label: 'Волчий лес' },
      { kind: 'trees', x: 680, y: 16, w: 140, h: 130, label: 'Волчий лес' },
      { kind: 'trees', x: 760, y: 140, w: 120, h: 110, label: 'Волчий лес' },
      { kind: 'trees', x: 720, y: 380, w: 130, h: 125, label: 'Волчий лес' },
      { kind: 'trees', x: 780, y: 560, w: 100, h: 115, label: 'Волчий лес' },
      { kind: 'trees', x: 500, y: 480, w: 110, h: 120, label: 'Волчий лес' },
      { kind: 'trees', x: 520, y: 700, w: 120, h: 125, label: 'Волчий лес' },
      { kind: 'trees', x: 490, y: 960, w: 115, h: 120, label: 'Волчий лес' },
      { kind: 'trees', x: 530, y: 1180, w: 110, h: 110, label: 'Волчий лес' }
    ],
    npcs: [],
    creaks: [],
    interactables: [],
    triggers: [
      {
        id: 'see-van',
        x: 212,
        y: 420,
        w: 250,
        h: 80,
        once: true,
        onEnter: async () => {
          if (vanSeen) return;
          vanSeen = true;
          await runCutscene([
            'Странный фургон сворачивает с дороги — прямо в чащу.',
            'В «Волчий лес». Без единой нормальной дороги. Просто так туда не ездят.',
            'Ты решаешь проследовать за ним.'
          ]);
          setQuest('quest.woods');
          const v = scene.props.find((p) => p.id === 'van');
          if (v) v.hidden = true;
          scene.interactables.push(
            onProp(forestPath, {
              id: 'enter-forest',
              label: 'тропинка в лес',
              marker: true,
              onInteract: () => enterForestPath()
            })
          );
        }
      }
    ]
  };
  ambienceForScene('road');
}

function enterForestPath() {
  cam = { x: 0, y: 0 };
  player = makePlayer(70, 380);
  setQuest('quest.forest');
  let deepDone = false;
  const trees = [
    [40, 40, 120, 130],
    [200, 20, 110, 120],
    [360, 50, 130, 140],
    [540, 16, 120, 125],
    [720, 40, 140, 135],
    [900, 30, 130, 120],
    [40, 220, 100, 115],
    [30, 520, 120, 130],
    [180, 620, 110, 120],
    [360, 640, 140, 130],
    [560, 610, 120, 125],
    [760, 640, 130, 120],
    [940, 560, 110, 140],
    [980, 200, 120, 130],
    [960, 380, 100, 110],
    [220, 180, 90, 100],
    [420, 200, 80, 95],
    [620, 170, 100, 110],
    [800, 210, 90, 100],
    [250, 420, 95, 105],
    [480, 450, 85, 100],
    [700, 430, 90, 95]
  ].map(([x, y, w, h]) => ({ kind: 'trees', x, y, w, h, label: 'лес' }));
  scene = {
    id: 'forest',
    w: 1100,
    h: 780,
    floor: '#1a2418',
    bounds: { x: 16, y: 16, w: 1068, h: 748 },
    walls: [],
    props: trees.concat([
      {
        id: 'van',
        kind: 'van',
        facing: 'e',
        x: 640,
        y: 340,
        w: 130,
        h: 52,
        solid: true,
        label: 'фургон'
      }
    ]),
    npcs: [],
    creaks: [],
    interactables: [],
    triggers: [
      {
        id: 'forest-deep',
        x: 620,
        y: 280,
        w: 180,
        h: 160,
        once: true,
        onEnter: async () => {
          if (deepDone) return;
          deepDone = true;
          const v = scene.props.find((p) => p.id === 'van');
          if (v) v.hidden = true;
          await runCutscene([
            'Ты пробираешься глубже. Листва цепляет форму. Фургон всё время ускользает между стволами…',
            'Ты останавливаешься.',
            'А где же машина?',
            'Тишина. Слишком тихая.',
            'Сзади — шорох. Удар прикладом. Экран меркнет.'
          ]);
          await fadeToBlack();
          abortWalks();
          enterGarage();
        }
      }
    ]
  };
  clampPlayerToWorld();
  unstickPlayer();
  ambienceForScene('forest');
}

function runCutscene(lines) {
  return runDialogue(lines.map((text) => ({ speaker: '', text })));
}

function fadeToBlack() {
  return new Promise((resolve) => {
    sfx('hit');
    setMode('msg');
    showMsg('…', 'Сознание гаснет.', () => resolve());
  });
}

function enterGarage(opts) {
  cam = { x: 0, y: 0 };
  player = makePlayer(356, 408);
  player.bound = !(opts && opts.resume);
  cutscene = false;
  if (ui.msg) ui.msg.hidden = true;
  scene = {
    id: 'garage',
    id: 'garage',
    w: 760,
    h: 920,
    floor: '#2a241c',
    bounds: insetBounds(760, 920, 40, 24, 24),
    floors: [
      {
        x: 56,
        y: 64,
        w: 230,
        h: 190,
        ellipse: true,
        color: '#1a1510',
        label: 'грязный ковёр',
        labelColor: '#6a5a48'
      },
      {
        x: 72,
        y: 620,
        w: 500,
        h: 210,
        color: '#3a342c',
        label: 'место для машины (пол чище)'
      }
    ],
    walls: [
      { x: 40, y: 40, w: 680, h: 24 },
      { x: 40, y: 40, w: 24, h: 840 },
      { x: 696, y: 40, w: 24, h: 250 },
      { x: 696, y: 430, w: 24, h: 450 },
      { x: 40, y: 856, w: 680, h: 24 }
    ],
    props: [
      { x: 72, y: 64, w: 150, h: 18, color: '#4a6a78', label: 'стекло', solid: true },
      { x: 80, y: 88, w: 150, h: 72, color: '#3a3028', label: 'диван', solid: true },
      { x: 300, y: 48, w: 180, h: 16, color: '#2a2620', label: 'инструменты на стене' },
      { x: 300, y: 72, w: 180, h: 58, color: '#4a4034', label: 'стол · инструмент', solid: true },
      { x: 330, y: 136, w: 40, h: 22, color: '#1a1814', label: 'слив' },
      { x: 580, y: 72, w: 100, h: 130, color: '#2f2a22', label: 'шкаф', solid: true },
      { x: 560, y: 580, w: 120, h: 140, color: '#3a3228', label: 'коробки · мусор', solid: true },
      { x: 540, y: 470, w: 100, h: 80, color: '#353028', label: 'полка', solid: true },
      { x: 696, y: 292, w: 24, h: 136, color: '#5a4634', label: 'в прихожую', solid: true, kind: 'door' },
      { x: 348, y: 400, w: 40, h: 40, color: '#4a4034', label: 'стул' },
      { x: 72, y: 280, w: 72, h: 96, color: '#2a2c30', label: 'оруж. сейф', solid: true },
      { x: 72, y: 500, w: 52, h: 44, color: '#3a4448', label: 'кондей', solid: true },
      { x: 220, y: 832, w: 280, h: 24, color: '#1a1410', label: 'ворота на замке' }
    ],
    npcs: [
      { id: 'rey', x: 530, y: 250, key: 'rey', label: '???', hidden: false },
      { id: 'liam', x: 650, y: 338, key: 'liam', label: '???', hidden: true }
    ],
    interactables: [],
    creaks: [],
    triggers: [
      {
        x: 180,
        y: 790,
        w: 360,
        h: 66,
        once: true,
        onEnter: () => {
          sfx('hit');
          gameOver('death.garageTrap');
        }
      }
    ],
    onEnterTalk: true
  };
  if (opts && opts.resume) {
    setupGaragePlayable();
    ambienceForScene('garage');
    return;
  }
  garageSequence();
  ambienceForScene('garage');
}

function garageSofaSeat(props) {
  const sofa = (props || []).find((p) => p.label === 'диван');
  return {
    x: sofa ? sofa.x + sofa.w / 2 - 11 : 144,
    y: sofa ? sofa.y + sofa.h * 0.38 : 112
  };
}

const GARAGE_LIAM_IDLE = { x: 368, y: 418, dir: 'left' };

/** После сцены в гараже: Рей на диване, Лиам после развязки. */
function applyGaragePostSequenceLayout() {
  if (!scene || scene.id !== 'garage') return;
  const seat = garageSofaSeat(scene.props);
  const rey = scene.npcs.find((n) => n.id === 'rey');
  const liam = scene.npcs.find((n) => n.id === 'liam');
  if (rey) {
    rey.label = 'Рей';
    rey.hidden = false;
    rey.x = seat.x;
    rey.y = seat.y;
    rey.dir = 'down';
    rey.sit = true;
    rey.moving = false;
    rey.walk = null;
  }
  if (liam) {
    liam.hidden = false;
    liam.label = 'Лиам';
    liam.x = GARAGE_LIAM_IDLE.x;
    liam.y = GARAGE_LIAM_IDLE.y;
    liam.dir = GARAGE_LIAM_IDLE.dir;
    liam.sit = false;
    liam.moving = false;
    liam.walk = null;
  }
  if (player) player.bound = false;
}

function setupGaragePlayable() {
  applyGaragePostSequenceLayout();
  const liam = scene.npcs.find((n) => n.id === 'liam');
  const rey = scene.npcs.find((n) => n.id === 'rey');
  if (liam) {
    liam.hidden = false;
    liam.label = 'Лиам';
  }
  if (rey) rey.label = 'Рей';
  unstickPlayer();
  setQuest('quest.house');
  syncTouchUi();
  if (!(scene.interactables || []).some((it) => it.id === 'to-house')) {
    scene.interactables.push({
      id: 'to-house',
      x: 696,
      y: 292,
      w: 24,
      h: 136,
      label: 'в прихожую',
      marker: true,
      onInteract: () => enterHall1('garage')
    });
  }
  saveCheckpoint('garage');
  refreshHud();
  syncTouchUi();
}

async function garageSequence() {
  const rey = scene.npcs.find((n) => n.id === 'rey');
  if (rey) {
    await withCutscene(async () => {
      await walkNpc(rey, 412, 405, 165);
      rey.dir = 'left';
      rey.moving = false;
    });
  }
  await runDialogue([
    {
      speaker: heroName,
      left: 'neli',
      emotion: 'fear',
      text: 'Ты приходишь в себя, привязанная к стулу. Пахнет маслом и пылью. Гараж.'
    },
    {
      speaker: '???',
      right: 'rey',
      text: 'Тебе не стоило тут быть. И тем более попадаться мне на глаза. Теперь… я буду развлекаться.'
    },
    {
      speaker: '???',
      right: 'rey',
      text: 'Чисто для интереса вырвал бы тебе любопытные глазки, но—'
    }
  ]);
  const liam = scene.npcs.find((n) => n.id === 'liam');
  await withCutscene(async () => {
    if (!liam || !rey) return;
    sfx('creak');
    liam.hidden = false;
    liam.x = 650;
    liam.y = 338;
    const meetX = rey.x + 46;
    const meetY = rey.y - 4;
    await walkNpc(liam, 650, 418);
    await walkNpc(liam, meetX, meetY);
    liam.dir = 'left';
    rey.dir = 'right';
    liam.moving = false;
    rey.moving = false;
  });
  await runDialogue([
    {
      speaker: '???',
      left: 'rey',
      right: 'liam',
      text: 'Рей, ты не поверишь, что там по распродаже крутят—\n\n…О.'
    },
    {
      speaker: '???',
      left: 'rey',
      right: 'liam',
      text: 'Чёрт… чёрт… Рей?! Почему здесь полиция?!'
    },
    {
      speaker: 'Рей',
      left: 'rey',
      right: 'liam',
      text: 'Лиам. Закрой рот.'
    },
    {
      speaker: 'Лиам',
      left: 'rey',
      right: 'liam',
      text: 'Ты только что сказал моё имя! И своё! Она всё запомнит!'
    }
  ]);
  await withCutscene(async () => {
    if (!liam) return;
    await walkNpc(liam, 384, 406, 140);
    liam.dir = 'left';
    liam.moving = false;
  });
  await runDialogue([
    {
      speaker: 'Лиам',
      left: 'neli',
      emotion: 'fear',
      right: 'liam',
      text: 'Я вытащу тебя отсюда. Тихо.'
    }
  ]);
  await withCutscene(async () => {
    if (!liam || !rey) return;
    const meetX = rey.x + 46;
    const meetY = rey.y - 4;
    await walkNpc(liam, meetX, meetY, 130);
    liam.dir = 'left';
    rey.dir = 'right';
    liam.moving = false;
    rey.moving = false;
  });
  await runDialogue([
    {
      speaker: 'Лиам',
      left: 'rey',
      right: 'liam',
      text: '(шепчет Рею — но ты слышишь:) Доведу до края леса и оставлю там.'
    },
    {
      speaker: 'Выбор',
      left: 'neli',
      emotion: 'thought',
      text: 'Ты всё слышала. Что делать?',
      choices: [
        {
          label: 'Вмешаться: «Я всё слышала.»',
          goto: [
            {
              speaker: 'Рей',
              right: 'rey',
              text: 'Вот и славно.'
            }
          ],
          effect: () => {
            if (scene) scene.badEnd = true;
            setTimeout(() => {
              ui.dialogue.hidden = true;
              dialogueQueue = [];
              gameOver('death.garageSpeak');
            }, 900);
          }
        },
        {
          label: 'Молчать',
          goto: [
            {
              speaker: 'Рей',
              right: 'rey',
              text: 'Она всё слышала. По глазам видно.'
            },
            {
              speaker: 'Лиам',
              right: 'liam',
              text: 'Нельзя тупо убить полицейского! Если об этом узнает Он…'
            },
            {
              speaker: 'Рей',
              right: 'rey',
              text: '…Скучно. Делай что хочешь.'
            }
          ]
        }
      ]
    }
  ]);
  if (creaks >= 3 || !scene || scene.badEnd) return;
  if (liam) liam.label = 'Лиам';
  await withCutscene(async () => {
    const rey = scene.npcs.find((n) => n.id === 'rey');
    if (!rey) return;
    rey.label = 'Рей';
    const sofa = (scene.props || []).find((p) => p.label === 'диван');
    const seat = garageSofaSeat(scene.props);
    const frontY = sofa ? sofa.y + sofa.h + 28 : 190;
    await walkNpc(rey, seat.x, frontY, 150);
    await walkNpc(rey, seat.x, seat.y, 110);
    rey.dir = 'down';
    rey.sit = true;
    rey.moving = false;
  });
  if (!scene || scene.badEnd) return;
  await runDialogue([
    {
      speaker: 'Лиам',
      left: 'neli',
      emotion: 'awkward',
      right: 'liam',
      text: 'Я развяжу тебя. Через коридор — на кухню. Тихо.'
    }
  ]);
  if (!scene || scene.badEnd) return;
  await withCutscene(async () => {
    const liamNpc = scene.npcs.find((n) => n.id === 'liam');
    if (liamNpc) {
      await walkNpc(liamNpc, 384, 406, 130);
      liamNpc.dir = 'left';
      liamNpc.moving = false;
    }
    sfx('click');
    await new Promise((resolve) => setTimeout(resolve, 500));
    if (player) player.bound = false;
    await new Promise((resolve) => setTimeout(resolve, 400));
    if (liamNpc) {
      await walkNpc(liamNpc, GARAGE_LIAM_IDLE.x, GARAGE_LIAM_IDLE.y, 110);
      liamNpc.dir = GARAGE_LIAM_IDLE.dir;
      liamNpc.moving = false;
    }
  });
  if (!scene || scene.badEnd) return;
  applyGaragePostSequenceLayout();
  unstickPlayer();
  setQuest('quest.house');
  syncTouchUi();
  scene.interactables.push({
    id: 'to-house',
    x: 696,
    y: 292,
    w: 24,
    h: 136,
    label: 'в прихожую',
    marker: true,
    onInteract: () => enterHall1('garage')
  });
  saveCheckpoint('garage');
}

function livingFrontDoorLabel() {
  return house.frontDoorReady ? 'парадная дверь · на улицу' : 'парадная дверь';
}

async function useFrontDoor() {
  if (house.escapeActive) {
    await runDialogue([
      {
        speaker: 'Лиам',
        right: 'liam',
        text: 'Беги! Он уже открывает!'
      }
    ]);
    return;
  }
  if (house.frontDoorReady) {
    await runDialogue([
      {
        speaker: 'Лиам',
        right: 'liam',
        textKey: 'dlg.exit.front'
      }
    ]);
    await meetHans();
    return;
  }
  await runDialogue([
    { speaker: 'Звук', text: '*отчётливый поворот ключа в замке*' },
    {
      speaker: 'Лиам',
      right: 'liam',
      text: 'Нет-нет-нет— прячься! Под кровать! Быстрее!'
    }
  ]);
  startEscape();
}

function refuseLocked() {
  return runDialogue([
    {
      speaker: 'Лиам',
      right: 'liam',
      text: 'Не сюда. Эта дверь не для нас.'
    }
  ]);
}

async function searchCloset() {
  if (!clues.has('Документы пропавших')) {
    clues.add('Документы пропавших');
    refreshClues();
    await runDialogue([
      {
        speaker: heroName,
        left: 'neli',
        emotion: 'fear',
        text: 'На вешалках — куртки. В карманах документы пропавших людей…'
      }
    ]);
    onClueFound();
  } else {
    await runDialogue([
      { speaker: heroName, left: 'neli', emotion: 'thought', text: 'Здесь ты уже всё проверила.' }
    ]);
  }
  saveCheckpoint('upstairs');
}

function ensureLiamNearby() {
  if (!scene || (scene.npcs || []).some((n) => n.id === 'liam')) return;
  const dist = 80;
  const tries = [
    { x: player.x + dist, y: player.y },
    { x: player.x - dist, y: player.y },
    { x: player.x, y: player.y + dist },
    { x: player.x, y: player.y - dist }
  ];
  const spot = tries.find((t) => !worldSolidAt(scene, t.x, t.y, 22, 22) && !charHitsOthers({ key: 'liam' }, t.x, t.y)) || tries[0];
  scene.npcs.push(liamNpc(spot.x, spot.y));
}

function onClueFound() {
  if (clues.size >= 1 && !house.liamReady) {
    house.liamReady = true;
    ensureLiamNearby();
  }
  if (clues.size === 1 && !house.clueHintOne) {
    house.clueHintOne = true;
    setQuest('quest.leave');
    runDialogue([
      {
        speaker: 'Лиам',
        right: 'liam',
        textKey: 'dlg.clue.one'
      }
    ]);
    return;
  }
  if (clues.size >= CLUE_TOTAL && !house.clueHintTwo) {
    house.clueHintTwo = true;
    setQuest('quest.leave');
    runDialogue([
      {
        speaker: 'Лиам',
        right: 'liam',
        textKey: 'dlg.clue.two'
      }
    ]);
  }
}

async function descendToExit() {
  const key = clues.size >= CLUE_TOTAL
    ? 'dlg.descend.full'
    : (clues.size >= 1 ? 'dlg.descend.one' : 'dlg.descend.none');
  await runDialogue([
    { speaker: 'Лиам', right: 'liam', textKey: key }
  ]);
  setQuest('quest.leave');
  enterLiving('stairs');
}

/** Дом по карте: зелёные комнаты открыты, серые — нет. Одна комната = одна локация. */
function enterKitchen(from) {
  setQuest('quest.exit');
  const w = 820;
  const h = 520;
  openRoom({
    id: 'kitchen',
    w,
    h,
    floor: '#2a2620',
    spawn: from === 'living' ? { side: 'e', pos: 140, len: 90 } : { side: 'n', pos: 280, len: 110 },
    doors: [
      {
        side: 'n',
        pos: 280,
        len: 110,
        label: 'дверь',
        onInteract: () => enterHall1('kitchen')
      },
      {
        side: 'e',
        pos: 140,
        len: 90,
        label: 'дверь',
        marker: true,
        onInteract: () => enterLiving('kitchen')
      }
    ],
    props: [
      { x: 80, y: 122, w: 220, h: 56, label: 'кухня', solid: true },
      { x: 280, y: 220, w: 180, h: 90, label: 'стол / столовая', solid: true },
      { x: 290, y: 320, w: 36, h: 36, label: 'стул' },
      { x: 400, y: 320, w: 36, h: 36, label: 'стул' },
      { x: 620, y: 122, w: 70, h: 100, label: 'шкаф', solid: true }
    ],
    npcs: [liamNpc(200, 280)]
  });
}

function enterHall1(from) {
  const w = 720;
  const h = 640;
  const spawn = {
    garage: { side: 'w', pos: 280, len: 120 },
    kitchen: { side: 's', pos: 280, len: 110 }
  }[from] || { side: 'w', pos: 280, len: 120 };
  openRoom({
    id: 'hall1',
    w,
    h,
    spawn,
    doors: [
      {
        side: 'w',
        pos: 280,
        len: 120,
        label: 'в гараж · чёрный ход',
        onInteract: async () => {
          await runDialogue([
            { speaker: 'Лиам', right: 'liam', textKey: 'dlg.garage.blocked' }
          ]);
        }
      },
      {
        side: 's',
        pos: 280,
        len: 110,
        label: 'дверь',
        marker: true,
        onInteract: () => enterKitchen('hall')
      },
      {
        side: 'e',
        pos: 160,
        len: 80,
        label: 'дверь',
        locked: true,
        onInteract: async () => {
          await runDialogue([
            {
              speaker: 'Лиам',
              right: 'liam',
              text: 'Не сюда. Это его комната. Нам нужен выход.'
            }
          ]);
        }
      },
      {
        side: 'e',
        pos: 360,
        len: 80,
        label: 'дверь',
        locked: true,
        onInteract: () => refuseLocked()
      },
      {
        side: 'n',
        pos: 220,
        len: 80,
        label: 'дверь',
        locked: true,
        onInteract: () => refuseLocked()
      }
    ],
    props: [
      { kind: 'rug', x: 80, y: 200, w: 70, h: 280, label: 'дорожка' },
      { kind: 'rug', x: 80, y: 122, w: 480, h: 70, label: 'дорожка' },
      { x: 200, y: 170, w: 90, h: 36, label: 'полка', solid: true }
    ],
    npcs: [liamNpc(180, 300)]
  });
}

function enterLiving(from) {
  if (!house.escapeActive) saveCheckpoint('living');
  const w = 900;
  const h = 640;
  const spawn = {
    kitchen: { side: 'w', pos: 140, len: 90 },
    stairs: { side: 'n', pos: 700, len: 90 }
  }[from] || { side: 'w', pos: 140, len: 90 };
  openRoom({
    id: 'living',
    w,
    h,
    spawn,
    doors: [
      {
        side: 'w',
        pos: 140,
        len: 90,
        label: 'дверь',
        onInteract: () => enterKitchen('living')
      },
      {
        side: 'w',
        pos: 400,
        len: 80,
        label: 'люк',
        onInteract: async () => {
          await runDialogue([
            {
              speaker: heroName,
              left: 'neli',
              emotion: 'anger',
              text: 'Дверь вниз. Пахнет сыростью… и чем-то хуже.'
            },
            {
              speaker: 'Лиам',
              right: 'liam',
              text: 'Подвал — позже. Сейчас — только наружу. Или наверх, если вход закрыт.'
            }
          ]);
        }
      },
      {
        side: 'w',
        pos: 500,
        len: 80,
        label: 'дверь',
        locked: true,
        onInteract: () => refuseLocked()
      },
      {
        side: 'n',
        pos: 220,
        len: 80,
        label: 'дверь',
        locked: true,
        onInteract: () => refuseLocked()
      },
      {
        side: 'n',
        pos: 700,
        len: 90,
        label: 'лестница ↑',
        useLabel: 'лестница',
        marker: true,
        onInteract: () => enterHall2('stairs')
      },
      {
        side: 's',
        pos: 360,
        len: 120,
        label: livingFrontDoorLabel(),
        useLabel: 'парадная дверь',
        marker: true,
        onInteract: () => useFrontDoor()
      }
    ],
    props: [
      { kind: 'rug', x: 200, y: 160, w: 380, h: 220, label: 'гостиная' },
      { x: 240, y: 200, w: 170, h: 80, label: 'диван', solid: true },
      { x: 460, y: 220, w: 70, h: 50, label: 'стол', solid: true },
      { kind: 'rug', x: 300, y: 500, w: 220, h: 70, label: 'прихожая' }
    ],
    npcs: [liamNpc(320, 360)]
  });
}

function enterHall2(from) {
  if (!house.upstairs) {
    house.upstairs = true;
    creaks = 0;
    if (!house.escapeActive) setQuest('quest.clues');
  }
  refreshHud();
  if (!house.escapeActive) saveCheckpoint('upstairs');
  const w = 1200;
  const h = 520;
  const closet = { x: 430, y: 360, w: 100, h: 80, label: 'ШКАФ', solid: true };
  const spawn = {
    stairs: { side: 's', pos: 920, len: 110 },
    storage1: { side: 'n', pos: 220, len: 80 },
    storage2: { side: 'n', pos: 480, len: 80 },
    guest1: { side: 's', pos: 180, len: 80 }
  }[from] || { side: 's', pos: 920, len: 110 };
  openRoom({
    id: 'hall2',
    w,
    h,
    spawn,
    doors: [
      {
        side: 's',
        pos: 920,
        len: 110,
        label: 'лестница ↓',
        useLabel: 'лестница',
        marker: true,
        onInteract: async () => {
          if (house.escapeActive) {
            await runDialogue([
              {
                speaker: 'Лиам',
                right: 'liam',
                text: 'Не вниз! Гостевая слева по коридору — под кровать!'
              }
            ]);
            return;
          }
          await descendToExit();
        }
      },
      {
        side: 'w',
        pos: 200,
        len: 80,
        label: 'люк',
        onInteract: async () => {
          await runDialogue([
            {
              speaker: heroName,
              left: 'neli',
              emotion: 'thought',
              text: 'Люк на чердак. Сейчас не до этого.'
            }
          ]);
        }
      },
      {
        side: 'n',
        pos: 220,
        len: 80,
        label: 'дверь',
        onInteract: () => enterStorage1()
      },
      {
        side: 'n',
        pos: 480,
        len: 80,
        label: 'дверь',
        marker: true,
        onInteract: () => enterStorage2()
      },
      {
        side: 's',
        pos: 180,
        len: 80,
        label: 'дверь',
        marker: true,
        onInteract: () => enterGuest1()
      },
      {
        side: 'n',
        pos: 820,
        len: 80,
        label: 'дверь',
        locked: true,
        onInteract: () => refuseLocked()
      },
      {
        side: 'e',
        pos: 160,
        len: 90,
        label: 'дверь',
        locked: true,
        onInteract: () => refuseLocked()
      }
    ],
    props: [
      { kind: 'rug', x: 90, y: 210, w: 1000, h: 70, label: 'дорожка' },
      closet
    ],
    npcs: house.liamReady ? [liamNpc(700, 240)] : [],
    creaks: hallCreaks(),
    interactables: [
      onProp(closet, {
        id: 'closet',
        label: 'шкаф',
        marker: true,
        onInteract: () => searchCloset()
      })
    ]
  });
}

function enterStorage1() {
  const w = 640;
  const h = 440;
  openRoom({
    id: 'storage1',
    w,
    h,
    spawn: { side: 's', pos: 220, len: 80 },
    doors: [
      {
        side: 's',
        pos: 220,
        len: 80,
        label: 'дверь',
        onInteract: () => enterHall2('storage1')
      }
    ],
    props: [
      { kind: 'rug', x: 80, y: 122, w: 200, h: 70, label: 'СКЛАД' },
      { x: 120, y: 180, w: 140, h: 90, label: 'коробки', solid: true },
      { x: 400, y: 132, w: 80, h: 110, label: 'полка', solid: true }
    ],
    npcs: house.liamReady ? [liamNpc(140, 280)] : [],
    creaks: storage1Creaks()
  });
}

function enterStorage2() {
  const w = 700;
  const h = 480;
  const boxes = { x: 250, y: 180, w: 160, h: 110, label: 'коробки', solid: true };
  openRoom({
    id: 'storage2',
    w,
    h,
    spawn: { side: 's', pos: 480, len: 80 },
    doors: [
      {
        side: 's',
        pos: 480,
        len: 80,
        label: 'дверь',
        onInteract: () => enterHall2('storage2')
      }
    ],
    props: [
      { kind: 'rug', x: 80, y: 122, w: 200, h: 70, label: 'СКЛАД 2' },
      boxes,
      { x: 480, y: 122, w: 80, h: 100, label: 'полка', solid: true }
    ],
    npcs: house.liamReady ? [liamNpc(120, 300)] : [],
    creaks: storage2Creaks(),
    interactables: [
      onProp(boxes, {
        id: 'storage2',
        label: 'коробки',
        marker: true,
        onInteract: async () => {
          if (!clues.has('Рей Филдс, 80-е')) {
            clues.add('Рей Филдс, 80-е');
            refreshClues();
            await runDialogue([
              {
                speaker: heroName,
                left: 'neli',
                emotion: 'interest',
                text: 'Фотографии, детская одежда, права… Пропавший подросток Рей Филдс. На фото — парень, очень похожий на мужчину из гаража.'
              }
            ]);
            onClueFound();
          } else {
            await runDialogue([
              { speaker: heroName, left: 'neli', emotion: 'thought', text: 'Коробка уже пуста для тебя.' }
            ]);
          }
          saveCheckpoint('upstairs');
        }
      })
    ]
  });
}

function enterGuest1() {
  const w = 680;
  const h = 480;
  const bed = { x: 220, y: 240, w: 140, h: 70, label: 'кровать', solid: true };
  openRoom({
    id: 'guest1',
    w,
    h,
    spawn: { side: 'n', pos: 180, len: 80 },
    doors: [
      {
        side: 'n',
        pos: 180,
        len: 80,
        label: 'дверь',
        onInteract: () => enterHall2('guest1')
      }
    ],
    props: [
      { kind: 'rug', x: 80, y: 122, w: 180, h: 80, label: 'Гостевая 1' },
      bed
    ],
    npcs: house.liamReady ? [liamNpc(120, 300)] : [],
    creaks: guest1Creaks(),
    interactables: [
      onProp(bed, {
        id: 'hide-bed',
        label: house.escapeActive ? 'спрятаться под кровать' : 'кровать · спрятаться',
        marker: true,
        onInteract: (it) => hideUnderBed(it)
      })
    ]
  });
}

function hideUnderBed(it) {
  return (async () => {
    if (house.escapeActive) {
      stopEscape();
      house.frontDoorReady = true;
      setQuest('quest.leave');
      sfx('creak');
      await runDialogue([
        {
          speaker: heroName,
          left: 'neli',
          emotion: 'fear',
          text: 'Ты ныряешь под кровать. Снизу — шаги. Голос. Дверь хлопает.\n\nТишина. Он ушёл.'
        },
        {
          speaker: heroName,
          left: 'neli',
          emotion: 'thought',
          text: 'Пока тихо. Можно осмотреть комнаты — или спуститься к парадной двери.'
        }
      ]);
      return;
    }
    await runDialogue([
      {
        speaker: heroName,
        left: 'neli',
        emotion: 'fear',
        text: 'Ты прячешься под кроватью. Время тянется… Никто не заходит.'
      }
    ]);
  })();
}

async function meetHans() {
  setMode('play');
  ui.dialogue.hidden = true;
  cam = { x: 0, y: 0 };
  const laneY = 168;
  const RUN = 292;
  const HANS_WALK = 98;
  const hitX = 406;
  const pairGap = 26;
  player = makePlayer(96, laneY);
  player.bound = false;
  player.dir = 'right';
  const frontDoor = {
    x: 668,
    y: 104,
    w: 56,
    h: 136,
    color: '#5a4634',
    label: 'парадная дверь',
    solid: true,
    kind: 'door'
  };
  scene = {
    id: 'exit',
    w: 760,
    h: 340,
    floor: '#1c1814',
    bounds: { x: 52, y: 132, w: 612, h: 96 },
    walls: [
      { x: 40, y: 40, w: 680, h: 24 },
      { x: 40, y: 40, w: 24, h: 260 },
      { x: 696, y: 40, w: 24, h: 64 },
      { x: 696, y: 240, w: 24, h: 60 },
      { x: 40, y: 276, w: 656, h: 24 },
      { x: 40, y: 108, w: 628, h: 24 },
      { x: 40, y: 228, w: 628, h: 24 }
    ],
    props: [
      { kind: 'rug', x: 52, y: 132, w: 612, h: 96, label: 'узкий коридор к выходу' },
      frontDoor
    ],
    npcs: [
      { id: 'liam', x: 96 - pairGap, y: laneY, key: 'liam', label: '', dir: 'right' },
      { id: 'hans', x: 548, y: laneY, key: 'hans', label: 'Ханс', dir: 'left' }
    ],
    creaks: [],
    interactables: []
  };
  ambienceForScene('exit');
  unstickPlayer();

  const liam = scene.npcs.find((n) => n.id === 'liam');
  const hans = scene.npcs.find((n) => n.id === 'hans');

  await withCutscene(async () => {
    await Promise.all([
      walkPlayer(hitX, laneY, RUN),
      walkNpc(liam, hitX - pairGap, laneY, RUN),
      walkNpc(hans, hitX + 34, laneY, HANS_WALK)
    ]);
    if (player) player.dir = 'right';
    if (hans) hans.dir = 'left';
    if (liam) liam.dir = 'right';
    sfx('hit');
    await new Promise((resolve) => setTimeout(resolve, 480));
  });

  await runDialogue([
    {
      speaker: '…',
      right: 'hans',
      textKey: 'dlg.exit.bump'
    },
    {
      speaker: 'Лиам',
      right: 'liam',
      textKey: 'dlg.exit.liamNo'
    },
    {
      speaker: 'Ханс',
      right: 'hans',
      textKey: 'dlg.exit.hansLine'
    }
  ]);
  sfx('stinger');
  demoEnd();
}

/* ---------- update / draw ---------- */
function update(dt) {
  tickPlayTime(dt);
  if (!scene || paused) return;
  updateNpcWalks(dt);
  tickEscape(dt);
  if (!scene) return;

  if (player) {
    const cx = player.x + player.w / 2;
    const cy = player.y + player.h / 2;
    cam.x = Math.max(0, Math.min(Math.max(0, scene.w - W), cx - W / 2));
    cam.y = Math.max(0, Math.min(Math.max(0, scene.h - H), cy - H / 2));
    syncMouseWorld();
  }

  if (interactFlash > 0) interactFlash -= dt;
  if (mode !== 'play' || !player || player.bound || cutscene) {
    if (player && !player.walk) NeliSprites.tick(player, dt, false, false);
    return;
  }

  let dx = 0;
  let dy = 0;
  if (keys.KeyW || keys.ArrowUp) dy -= 1;
  if (keys.KeyS || keys.ArrowDown) dy += 1;
  if (keys.KeyA || keys.ArrowLeft) dx -= 1;
  if (keys.KeyD || keys.ArrowRight) dx += 1;
  if (stick.active && (stick.x || stick.y)) {
    dx += stick.x;
    dy += stick.y;
  }
  const moving = !!(dx || dy);
  const sprinting = moving && (keys.ShiftLeft || keys.ShiftRight || touchSprint);
  if (moving) {
    const len = Math.hypot(dx, dy) || 1;
    const mag = Math.min(1, len);
    const sprint = sprinting ? 1.85 : 1;
    dx = (dx / len) * player.speed * sprint * mag * dt;
    dy = (dy / len) * player.speed * sprint * mag * dt;
    const nx = player.x + dx;
    const ny = player.y + dy;
    if (!solidAt(scene, nx, player.y, player.w, player.h)) player.x = nx;
    if (!solidAt(scene, player.x, ny, player.w, player.h)) player.y = ny;
    clampPlayerToWorld();
    const d = NeliSprites.dirFrom(dx, dy);
    if (d) player.dir = d;
    player.facing = Math.atan2(dy, dx);
  }
  NeliSprites.tick(player, dt, moving, sprinting);

  const cx = player.x + player.w / 2;
  const cy = player.y + player.h / 2;

  if (scene.creaks) {
    const c = nearestCreak(scene, cx, cy);
    if (c && !c._latched) {
      c._latched = true;
      addCreak(c);
    }
  }

  scene.triggers?.forEach((t) => {
    if (t.done) return;
    if (rectsOverlap(player, t)) {
      if (t.once) t.done = true;
      t.onEnter?.(t);
    }
  });
}

function draw() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;
  if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';

  ctx.fillStyle = '#080706';
  ctx.fillRect(0, 0, W, H);
  if (!scene) return;

  const pad = scenePad();
  ctx.save();
  ctx.translate(pad.x - cam.x, pad.y - cam.y);

  try {
    drawWorld(ctx, scene);
  } catch (err) {
    console.error('drawWorld', scene && scene.id, err);
  }

  scene.interactables?.forEach((it) => {
    if (it.done && it.once) return;
    const hover =
      mouse.worldX >= it.x - 8 &&
      mouse.worldX <= it.x + it.w + 8 &&
      mouse.worldY >= it.y - 8 &&
      mouse.worldY <= it.y + it.h + 8;
    if (it.marker) {
      const mx = it.x + it.w / 2;
      const my = it.y - 2;
      ctx.fillStyle = hover || interactFlash > 0 ? '#ffe080' : '#e0a050';
      ctx.beginPath();
      ctx.moveTo(mx, my - 14);
      ctx.lineTo(mx + 7, my - 4);
      ctx.lineTo(mx, my + 2);
      ctx.lineTo(mx - 7, my - 4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = hover ? '#fff4c0' : '#8a6020';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    if (it.label && hover) {
      ctx.fillStyle = '#f0dcc0';
      ctx.font = '12px sans-serif';
      ctx.fillText(tx(it.label), it.x + 4, it.y - 18);
    }
  });

  const actors = [];
  scene.npcs?.forEach((n) => {
    if (n.hidden) return;
    actors.push(n);
  });
  if (player) actors.push(player);
  actors.sort((a, b) => a.y - b.y);
  actors.forEach((n) => {
    if (n === player) {
      drawActor(player.x, player.y, 'neli', heroName, true);
      return;
    }
    if (!n.key && n.color) {
      ctx.fillStyle = n.color;
      ctx.fillRect(n.x, n.y, n.w || 28, n.h || 28);
      ctx.strokeStyle = '#6a5848';
      ctx.strokeRect(n.x + 0.5, n.y + 0.5, (n.w || 28) - 1, (n.h || 28) - 1);
      if (n.label) {
        ctx.fillStyle = '#efe6d8';
        ctx.font = '10px sans-serif';
        ctx.fillText(tx(n.label), n.x, n.y - 6);
      }
      return;
    }
    drawActor(n.x, n.y, n.key, tx(n.label), false, n);
  });

  ctx.restore();
}

function drawActor(x, y, key, label, isPlayer, npc) {
  const who = isPlayer ? player : npc;
  NeliSprites.draw(ctx, x, y, {
    key,
    dir: who?.dir || 'down',
    animT: who?.animT || 0,
    idleT: who?.idleT || 0,
    moving: !!who?.moving,
    bound: !!(isPlayer && player?.bound),
    sit: !!(!isPlayer && npc?.sit),
    label: label || ''
  });
}

function loop(ts) {
  const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0);
  lastTs = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

boot().catch((err) => {
  console.error(err);
  document.body.insertAdjacentHTML(
    'beforeend',
    `<p style="color:#f88;padding:1rem">Ошибка загрузки ассетов: ${err.message}</p>`
  );
});
