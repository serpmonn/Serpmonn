import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const STORAGE_BEST = "obryv-score-v4";
const STORAGE_MUTE = "obryv-mute-v1";
const STORAGE_LANG = "obryv-lang-v1";
const STORAGE_INVERT_Y = "obryv-invert-y-v1";
const STORAGE_INVERT_X = "obryv-invert-x-v1";
const STORAGE_SENS = "obryv-sens-v1";
const STORAGE_MUSIC = "obryv-music-v1";
const STORAGE_MUSIC_VOL = "obryv-music-vol-v1";

const LEVEL_NAMES = {
  ru: [
    "Нижний двор", "Разлом", "Мост пепла", "Холодный шпиль",
    "Галерея эха", "Чёрный уступ", "Кольцо бури", "Тоннель шёпота",
    "Край забвения", "Маяк Имён",
    "Слепая арка", "Зубчатый спуск", "Двойной обман", "Ночной карниз", "Вершина памяти",
  ],
  en: [
    "Lower Court", "The Fracture", "Ash Bridge", "Cold Spire",
    "Echo Gallery", "Black Ledge", "Storm Ring", "Whisper Tunnel",
    "Edge of Oblivion", "Beacon of Names",
    "Blind Arch", "Toothed Descent", "Double Deceit", "Night Cornice", "Peak of Memory",
  ],
};

const I18N = {
  ru: {
    title: "Обрыв",
    tag: "Кампания носителя памяти: соберите Имена, зажгите маяки, пройдите 15 ярусов.",
    menuSub: "Вы — носитель. Доставьте имена до маяков — или город останется забытым.",
    btnPlay: "Играть",
    btnHow: "Как играть",
    btnSettings: "Настройки",
    btnBack: "Назад",
    btnResume: "Продолжить",
    btnMenu: "В меню",
    pause: "Пауза",
    pauseSub: "Имена ещё не донесены. Город ждёт.",
    level: "Ярус",
    shards: "Имена",
    lives: "Дыхание",
    score: "Память",
    setSound: "Звуки",
    setMusic: "Музыка",
    setMusicVol: "Громкость музыки",
    setInvertY: "Инверт мыши (Y)",
    setInvertX: "Инверт мыши (X)",
    setSens: "Чувств. мыши",
    objCollect: "Соберите жёлтые Имена",
    objBeacon: "Маяк горит — доберитесь до синего света",
    hint: "WASD · Пробел · мышь · ESC — пауза",
    hintMob: "← стик · свайп справа — обзор · ⤒ прыжок · Ⅱ пауза",
    howtoHtml:
      "<div><span class=\"y\">1. Жёлтые кристаллы</span> — соберите все Имена на ярусе</div>" +
      "<div><span class=\"b\">2. Синий маяк</span> — когда загорится, войдите в него</div>" +
      "<div><span class=\"o\">3. Рыжие плиты</span> — не стойте долго, осыпаются</div>" +
      "<div><span class=\"r\">4. Красные твари</span> — касание отнимает дыхание</div>" +
      "<div><span class=\"c\">5. Голубые флаконы</span> — возвращают дыхание</div>" +
      "<div><span class=\"b\">6. Подсветка пути</span> — отмечает безопасный маршрут и ложные ответвления</div>",
    levelClear: "Ярус помянут",
    nextLevel: "Дальше — выше",
    campaignWin: "Город вспомнил",
    campaignWinText: "Пятнадцать маяков горят. Это не спасение мира — отказ забыть. Память:",
    playAgain: "Играть снова",
    gameOver: "Забвение победило",
    gameOverText: "Дыхание кончилось. Память:",
    retry: "Ещё попытка",
    btnRevive: "+1 дыхание (реклама)",
    reviveBusy: "Воскрешение уже использовано",
    bestLabel: "Рекорд памяти:",
    btnPathHint: "Подсветка пути (реклама)",
    pathHintOn: "Безопасный путь подсвечен до потери дыхания",
    pathHintBusy: "Подсветка уже активна на эту жизнь",
    adUnavailable: "Реклама сейчас недоступна. Попробуйте позже.",
  },
  en: {
    title: "The Drop",
    tag: "Memory-carrier campaign: collect Names, light beacons, clear 15 tiers.",
    menuSub: "You are the carrier. Bring the names to the beacons — or the city stays forgotten.",
    btnPlay: "Play",
    btnHow: "How to play",
    btnSettings: "Settings",
    btnBack: "Back",
    btnResume: "Resume",
    btnMenu: "Main menu",
    pause: "Paused",
    pauseSub: "The names are not delivered yet. The city waits.",
    level: "Tier",
    shards: "Names",
    lives: "Breath",
    score: "Memory",
    setSound: "SFX",
    setMusic: "Music",
    setMusicVol: "Music volume",
    setInvertY: "Invert mouse (Y)",
    setInvertX: "Invert mouse (X)",
    setSens: "Mouse sens.",
    objCollect: "Collect the yellow Names",
    objBeacon: "Beacon lit — reach the blue light",
    hint: "WASD · Space · mouse · ESC pause",
    hintMob: "← stick · swipe right — look · ⤒ jump · Ⅱ pause",
    howtoHtml:
      "<div><span class=\"y\">1. Yellow crystals</span> — collect every Name on the tier</div>" +
      "<div><span class=\"b\">2. Blue beacon</span> — when it lights, run into it</div>" +
      "<div><span class=\"o\">3. Orange tiles</span> — don't linger, they crumble</div>" +
      "<div><span class=\"r\">4. Red beasts</span> — a touch costs a breath</div>" +
      "<div><span class=\"c\">5. Cyan vials</span> — restore a breath</div>" +
      "<div><span class=\"b\">6. Path hint</span> — marks the safe route and false branches</div>",
    levelClear: "Tier remembered",
    nextLevel: "Climb higher",
    campaignWin: "The city remembered",
    campaignWinText: "Fifteen beacons burn. Not saving the world — refusing to forget. Memory:",
    playAgain: "Play again",
    gameOver: "Oblivion won",
    gameOverText: "Breath is gone. Memory:",
    retry: "Try again",
    btnRevive: "+1 breath (ad)",
    reviveBusy: "Revive already used",
    bestLabel: "Best memory:",
    btnPathHint: "Path hint (ad)",
    pathHintOn: "Safe route lit until you lose a breath",
    pathHintBusy: "Path hint already active for this life",
    adUnavailable: "Ad unavailable right now. Try again later.",
  },
};

let lang = "ru";
try { const s = localStorage.getItem(STORAGE_LANG); if (s === "en" || s === "ru") lang = s; } catch (_) {}
let muted = false;
try { muted = localStorage.getItem(STORAGE_MUTE) === "1"; } catch (_) {}
let musicOn = true;
try { const v = localStorage.getItem(STORAGE_MUSIC); if (v === "0") musicOn = false; if (v === "1") musicOn = true; } catch (_) {}
let musicVol = 50;
try {
  const v = parseInt(localStorage.getItem(STORAGE_MUSIC_VOL) || "50", 10);
  if (v >= 0 && v <= 100) musicVol = v;
} catch (_) {}
let invertY = true;
try { const v = localStorage.getItem(STORAGE_INVERT_Y); if (v === "0") invertY = false; if (v === "1") invertY = true; } catch (_) {}
let invertX = false;
try { const v = localStorage.getItem(STORAGE_INVERT_X); if (v === "0") invertX = false; if (v === "1") invertX = true; } catch (_) {}
let sens = 10;
try { const v = parseInt(localStorage.getItem(STORAGE_SENS) || "10", 10); if (v >= 4 && v <= 20) sens = v; } catch (_) {}
let bestScore = 0;
try { bestScore = parseInt(localStorage.getItem(STORAGE_BEST) || "0", 10) || 0; } catch (_) {}

const t = (k) => I18N[lang][k] || k;

/* DOM */
const viewport = document.getElementById("viewport");
const hud = document.getElementById("hud");
const objectiveEl = document.getElementById("objective");
const hintEl = document.getElementById("hint");
const levelEl = document.getElementById("level");
const levelMaxEl = document.getElementById("level-max");
const shardsEl = document.getElementById("shards");
const shardsMaxEl = document.getElementById("shards-max");
const livesEl = document.getElementById("lives");
const scoreEl = document.getElementById("score");
const panelMenu = document.getElementById("panel-menu");
const panelHow = document.getElementById("panel-how");
const panelSettings = document.getElementById("panel-settings");
const panelPause = document.getElementById("panel-pause");
const panelResult = document.getElementById("panel-result");
const howtoBody = document.getElementById("howto-body");
const menuMeta = document.getElementById("menu-meta");
const resultTitle = document.getElementById("result-title");
const resultText = document.getElementById("result-text");
const btnResultMain = document.getElementById("btn-result-main");
const btnResultMenu = document.getElementById("btn-result-menu");
const setMute = document.getElementById("set-mute");
const setMusic = document.getElementById("set-music");
const setMusicVol = document.getElementById("set-music-vol");
const setInvertY = document.getElementById("set-invert-y");
const setInvertX = document.getElementById("set-invert-x");
const setSens = document.getElementById("set-sens");
const langRu = document.getElementById("lang-ru");
const langEn = document.getElementById("lang-en");

function hideAllPanels() {
  [panelMenu, panelHow, panelSettings, panelPause, panelResult].forEach((p) => p.classList.add("hidden"));
}
function showPanel(p) {
  hideAllPanels();
  p.classList.remove("hidden");
}
function isTouchUI() {
  return window.matchMedia("(max-width: 640px)").matches ||
    window.matchMedia("(hover: none) and (pointer: coarse)").matches ||
    ("ontouchstart" in window && navigator.maxTouchPoints > 0);
}

function syncPlayChrome() {
  const inSession =
    mode === "play" || mode === "pause" || mode === "levelclear" ||
    mode === "win" || mode === "over" ||
    (mode === "settings" && settingsFrom === "pause");
  document.body.classList.toggle("obryv-play", inSession);
  document.body.classList.toggle("obryv-playing", mode === "play");
  const softOk = mode === "menu" || mode === "pause" || mode === "how" ||
    (mode === "settings" && settingsFrom === "menu");
  if (typeof window.syncObryvSoftBanners === "function") {
    window.syncObryvSoftBanners(softOk);
  }
  requestAnimationFrame(resize);
}

function setHudVisible(on) {
  hud.classList.toggle("visible", on);
  objectiveEl.classList.toggle("visible", on);
  hintEl.classList.toggle("visible", on);
}

function applyI18n() {
  document.documentElement.lang = lang;
  document.title = t("title") + " — Serpmonn";
  document.getElementById("page-title").textContent = t("title");
  document.getElementById("page-tag").textContent = t("tag");
  document.getElementById("menu-title").textContent = t("title");
  document.getElementById("menu-sub").textContent = t("menuSub");
  document.getElementById("pause-sub").textContent = t("pauseSub");
  hintEl.textContent = isTouchUI() ? t("hintMob") : t("hint");
  howtoBody.innerHTML = t("howtoHtml");
  menuMeta.textContent = `${t("bestLabel")} ${bestScore || "—"}`;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (I18N[lang][key]) el.textContent = I18N[lang][key];
  });
  langRu.setAttribute("aria-pressed", lang === "ru" ? "true" : "false");
  langEn.setAttribute("aria-pressed", lang === "en" ? "true" : "false");
  setMute.textContent = muted ? "OFF" : "ON";
  setMute.setAttribute("aria-pressed", muted ? "false" : "true");
  if (setMusic) {
    setMusic.textContent = musicOn ? "ON" : "OFF";
    setMusic.setAttribute("aria-pressed", musicOn ? "true" : "false");
  }
  if (setMusicVol) setMusicVol.value = String(musicVol);
  setInvertY.textContent = invertY ? "ON" : "OFF";
  setInvertY.setAttribute("aria-pressed", invertY ? "true" : "false");
  if (setInvertX) {
    setInvertX.textContent = invertX ? "ON" : "OFF";
    setInvertX.setAttribute("aria-pressed", invertX ? "true" : "false");
  }
  setSens.value = String(sens);
  refreshObjective();
}

/* audio */
let audioCtx = null;
let sfxMaster = null;
function ensureAudio() {
  if (muted) return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  if (!sfxMaster) {
    sfxMaster = audioCtx.createGain();
    sfxMaster.gain.value = 1;
    sfxMaster.connect(audioCtx.destination);
  }
  return audioCtx;
}
function sfxOut() {
  const ac = ensureAudio();
  if (!ac) return null;
  return sfxMaster || ac.destination;
}
function beep(freq, dur, type = "sine", gain = 0.12) {
  const ac = ensureAudio();
  const dest = sfxOut();
  if (!ac || !dest) return;
  const t0 = ac.currentTime;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(Math.max(0.001, gain), t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g);
  g.connect(dest);
  o.start(t0);
  o.stop(t0 + dur + 0.02);
}
/** Whoosh into the void */
function fallTone() {
  const ac = ensureAudio();
  const dest = sfxOut();
  if (!ac || !dest) return;
  const t0 = ac.currentTime;
  const o = ac.createOscillator();
  const g = ac.createGain();
  const f = ac.createBiquadFilter();
  o.type = "sine";
  f.type = "lowpass";
  f.frequency.setValueAtTime(1800, t0);
  f.frequency.exponentialRampToValueAtTime(200, t0 + 0.7);
  o.frequency.setValueAtTime(420, t0);
  o.frequency.exponentialRampToValueAtTime(55, t0 + 0.75);
  g.gain.setValueAtTime(0.001, t0);
  g.gain.linearRampToValueAtTime(0.22, t0 + 0.05);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.85);
  o.connect(f);
  f.connect(g);
  g.connect(dest);
  o.start(t0);
  o.stop(t0 + 0.9);
  // air noise-ish second layer (quiet triangle)
  const o2 = ac.createOscillator();
  const g2 = ac.createGain();
  o2.type = "triangle";
  o2.frequency.setValueAtTime(180, t0);
  o2.frequency.exponentialRampToValueAtTime(40, t0 + 0.7);
  g2.gain.setValueAtTime(0.08, t0);
  g2.gain.exponentialRampToValueAtTime(0.001, t0 + 0.75);
  o2.connect(g2);
  g2.connect(dest);
  o2.start(t0);
  o2.stop(t0 + 0.8);
}
function deathChord() {
  const ac = ensureAudio();
  const dest = sfxOut();
  if (!ac || !dest) return;
  const t0 = ac.currentTime;
  for (const freq of [65, 98, 130]) {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.001, t0);
    g.gain.linearRampToValueAtTime(0.16, t0 + 0.06);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + 1.0);
    o.connect(g);
    g.connect(dest);
    o.start(t0);
    o.stop(t0 + 1.05);
  }
}
function hurtThud() {
  const ac = ensureAudio();
  const dest = sfxOut();
  if (!ac || !dest) return;
  const t0 = ac.currentTime;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = "sine";
  o.frequency.setValueAtTime(220, t0);
  o.frequency.exponentialRampToValueAtTime(70, t0 + 0.2);
  g.gain.setValueAtTime(0.2, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.28);
  o.connect(g);
  g.connect(dest);
  o.start(t0);
  o.stop(t0 + 0.3);
}
const SFX = {
  jump: () => beep(240, 0.08, "sine", 0.1),
  land: () => beep(110, 0.07, "sine", 0.11),
  fall: () => fallTone(),
  crumble: () => beep(150, 0.18, "triangle", 0.09),
  shard: () => { beep(660, 0.08, "sine", 0.11); setTimeout(() => beep(880, 0.11, "sine", 0.1), 55); },
  hurt: () => hurtThud(),
  open: () => { beep(392, 0.09, "sine", 0.11); setTimeout(() => beep(523, 0.12, "sine", 0.1), 80); },
  win: () => { beep(523, 0.1, "sine", 0.11); setTimeout(() => beep(659, 0.1, "sine", 0.1), 90); setTimeout(() => beep(784, 0.16, "sine", 0.11), 180); },
  over: () => deathChord(),
  pause: () => beep(240, 0.06, "sine", 0.07),
  click: () => beep(420, 0.04, "sine", 0.06),
};

/** Real audio files — frontend/games/obryv/preview/music/*.ogg */
const MUSIC_TRACKS = [
  "./music/01-ash.ogg?v=5",
  "./music/02-echo.ogg?v=5",
  "./music/03-storm.ogg?v=5",
  "./music/04-beacon.ogg?v=5",
];
const Music = {
  // One element only — never layer two tracks
  audio: (() => {
    const a = new Audio();
    a.loop = true;
    a.preload = "auto";
    a.volume = 0.5;
    return a;
  })(),
  track: -1,
  _adPaused: false,
  _volBeforeAd: 0.5,
  stop() {
    try {
      this.audio.pause();
      this.audio.currentTime = 0;
    } catch (_) {}
    this.track = -1;
    this._adPaused = false;
  },
  gain() {
    return Math.max(0, Math.min(1, (musicVol / 100) * 0.85));
  },
  applyVolume() {
    this.audio.volume = this.gain();
  },
  play(id, force) {
    if (!musicOn || musicVol <= 0) { this.stop(); return; }
    id = Math.max(0, Math.min(MUSIC_TRACKS.length - 1, id | 0));
    if (!force && this.track === id && !this.audio.paused) return;
    try { this.audio.pause(); } catch (_) {}
    if (this.track !== id || !this.audio.src) {
      this.audio.src = MUSIC_TRACKS[id];
      this.track = id;
      try { this.audio.currentTime = 0; } catch (_) {}
    } else {
      try { this.audio.currentTime = 0; } catch (_) {}
    }
    this.applyVolume();
    this.audio.loop = true;
    const p = this.audio.play();
    if (p && p.catch) p.catch((err) => console.warn("Music play blocked:", err));
  },
  forLevel(idx) {
    const id = idx >= 12 ? 3 : idx >= 8 ? 2 : idx >= 4 ? 1 : 0;
    this.play(id, true);
  },
  menu() { /* no autoplay before click */ },
  ensurePlaying() {
    if (muted) return;
    if (mode === "play") this.forLevel(typeof levelIndex === "number" ? levelIndex : 0);
    else this.play(0, true);
  },
  duck(paused) {
    if (!this.audio) return;
    const g = this.gain();
    this.audio.volume = paused ? g * 0.35 : g;
  },
  pauseForAd() {
    this._adPaused = false;
    if (!this.audio || this.audio.paused) return;
    this._adPaused = true;
    this._volBeforeAd = this.audio.volume;
    try { this.audio.pause(); } catch (_) {}
  },
  resumeAfterAd() {
    if (!musicOn || musicVol <= 0 || !this._adPaused) return;
    this.applyVolume();
    this._adPaused = false;
    const p = this.audio.play();
    if (p && p.catch) p.catch(() => {});
  },
};

/* textures — denser, readable surfaces */
function makeNoiseTex(base, speck, extra) {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = base; g.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 500; i++) {
    g.fillStyle = speck;
    g.fillRect(Math.random() * 128, Math.random() * 128, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  if (extra) extra(g);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}
function makeStripeTex(c1, c2) {
  const c = document.createElement("canvas");
  c.width = 128; c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = c1; g.fillRect(0, 0, 128, 128);
  g.fillStyle = c2;
  for (let i = 0; i < 16; i++) g.fillRect(0, i * 8, 128, 3);
  for (let i = 0; i < 40; i++) {
    g.fillStyle = "rgba(0,0,0,0.12)";
    g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
function makeTileTex() {
  return makeNoiseTex("#3d4a5c", "rgba(255,255,255,0.05)", (g) => {
    g.strokeStyle = "rgba(0,0,0,0.35)";
    g.lineWidth = 2;
    for (let y = 0; y < 128; y += 32) {
      for (let x = 0; x < 128; x += 32) {
        g.strokeRect(x + 1, y + 1, 30, 30);
        g.fillStyle = "rgba(255,255,255,0.03)";
        g.fillRect(x + 4, y + 4, 10, 6);
      }
    }
  });
}
function makeClothTex() {
  return makeNoiseTex("#1c2c42", "rgba(255,255,255,0.035)", (g) => {
    g.strokeStyle = "rgba(255,255,255,0.04)";
    for (let y = 0; y < 128; y += 4) {
      g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke();
    }
    for (let x = 0; x < 128; x += 6) {
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 128); g.stroke();
    }
  });
}
function makeSkinTex() {
  return makeNoiseTex("#c9a886", "rgba(120,60,40,0.07)", (g) => {
    g.fillStyle = "rgba(180,90,70,0.08)";
    g.beginPath(); g.ellipse(64, 70, 28, 34, 0, 0, Math.PI * 2); g.fill();
  });
}
const texStone = makeTileTex();
const texMoss = makeNoiseTex("#2f5a45", "rgba(180,255,200,0.1)", (g) => {
  for (let i = 0; i < 30; i++) {
    g.fillStyle = "rgba(60,140,80,0.25)";
    g.beginPath();
    g.arc(Math.random() * 128, Math.random() * 128, 3 + Math.random() * 6, 0, Math.PI * 2);
    g.fill();
  }
});
const texRust = makeStripeTex("#a65a28", "#7a3d16");
const texDark = makeNoiseTex("#1a1522", "rgba(255,80,80,0.1)");
const texCloth = makeClothTex();
const texSkin = makeSkinTex();
const texLeather = makeNoiseTex("#3b2a1c", "rgba(255,220,160,0.05)");

/* three */
const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.25));
renderer.setClearColor(0x06080d, 1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.BasicShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
viewport.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x06080d, 0.032);
const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 180);
const clock = new THREE.Clock();

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
pmrem.dispose();

scene.add(new THREE.HemisphereLight(0x8eb6ff, 0x1a1018, 0.75));
const sun = new THREE.DirectionalLight(0xe8f2ff, 1.15);
sun.position.set(14, 24, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(512, 512);
sun.shadow.camera.left = -28;
sun.shadow.camera.right = 28;
sun.shadow.camera.top = 28;
sun.shadow.camera.bottom = -28;
sun.shadow.camera.far = 70;
sun.shadow.bias = -0.0006;
scene.add(sun);
const fill = new THREE.PointLight(0x6ad0ff, 0.85, 50, 2);
scene.add(fill);
const rim = new THREE.PointLight(0xffd166, 0.35, 36, 2);
scene.add(rim);

(function buildBackdrop() {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0x0d121c });
  for (let i = 0; i < 8; i++) {
    const w = 1.6 + Math.random() * 2.8;
    const h = 5 + Math.random() * 14;
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 1.2), mat);
    m.position.set((i - 4) * 5.2 + Math.random(), h * 0.28 - 8, -95 - Math.random() * 10);
    m.castShadow = false;
    m.receiveShadow = false;
    group.add(m);
  }
  scene.add(group);
})();

/** Long campaign: 10 tiers */
const LEVELS = [
  {
    shardsNeeded: 3,
    plats: [
      [0, 0, 0, 7, 1, 7, "start"],
      [0, 0, -8, 3.4, 1, 3.4, ""],
      [3.6, 0.4, -14, 2.6, 1, 2.6, "crumble"],
      [6.2, 0.9, -20, 3, 1, 3, ""],
      // false right branch — same look as main, longer dead-end
      [9.8, 1.05, -21.5, 2.7, 1, 2.7, "trap"],
      [12.2, 1.35, -26.5, 2.5, 1, 2.5, "trap"],
      [14.0, 1.7, -31.5, 2.4, 1, 2.4, "trap"],
      [15.6, 2.05, -36.5, 2.3, 1, 2.3, "trap"],
      [16.8, 2.4, -41.5, 2.2, 1, 2.2, "trap"],
      [17.8, 2.8, -46.5, 2.1, 1, 2.1, "trap"],
      [18.5, 3.2, -51.5, 2.0, 1, 2.0, "trap"],
      [3, 1.3, -26, 2.5, 1, 2.5, "crumble"],
      [-0.5, 1.8, -32, 3.6, 1, 3.6, "check"],
      [-4, 2.2, -38, 2.5, 1, 2.5, "crumble"],
      // false left branch
      [-8.5, 2.4, -39.5, 2.6, 1, 2.6, "trap"],
      [-11.2, 2.75, -44, 2.4, 1, 2.4, "trap"],
      [-13.5, 3.15, -49, 2.3, 1, 2.3, "trap"],
      [-15.2, 3.5, -54, 2.2, 1, 2.2, "trap"],
      [-16.6, 3.9, -59, 2.1, 1, 2.1, "trap"],
      [-17.6, 4.3, -64, 2.0, 1, 2.0, "trap"],
      [-6.5, 2.7, -44, 3, 1, 3, ""],
      [-3, 3.1, -50, 2.6, 1, 2.6, "crumble"],
      [1, 3.6, -56, 3.4, 1, 3.4, ""],
      [4.5, 4.0, -62, 2.5, 1, 2.5, "crumble"],
      [2, 4.5, -68, 4.5, 1, 4.5, ""],
    ],
    shards: [[6.2, 1.9, -20], [-4, 3.2, -38], [4.5, 5.0, -62]],
    hazards: [[-0.5, 2.9, -32, 1.3, "stalker"], [1, 4.7, -56, 1.25, "wraith"]],
    breaths: [[-7.8, 3.9, -44]],
    beacon: [2, 5.2, -68],
  },
  {
    shardsNeeded: 4,
    plats: [
      [0, 0, 0, 6, 1, 6, "start"],
      [2.5, 0.35, -7, 2.3, 1, 2.3, "crumble"],
      [5.5, 0.9, -13, 2.8, 1, 2.8, ""],
      [8, 1.4, -19, 2.3, 1, 2.3, "crumble"],
      [11.2, 1.55, -20.5, 2.5, 1, 2.5, "trap"],
      [13.5, 1.95, -25.5, 2.4, 1, 2.4, "trap"],
      [15.2, 2.35, -30.5, 2.3, 1, 2.3, "trap"],
      [16.6, 2.75, -35.5, 2.2, 1, 2.2, "trap"],
      [17.5, 3.1, -40.5, 2.1, 1, 2.1, "trap"],
      [18.2, 3.5, -45.5, 2.0, 1, 2.0, "trap"],
      [18.8, 3.95, -50.5, 1.95, 1, 1.95, "trap"],
      [5, 1.9, -25, 3, 1, 3, ""],
      [1.5, 2.4, -31, 2.4, 1, 2.4, "crumble"],
      [-2, 2.9, -37, 3.5, 1, 3.5, "check"],
      [-5.5, 3.4, -43, 2.3, 1, 2.3, "crumble"],
      [-8, 3.9, -49, 2.8, 1, 2.8, ""],
      [-5, 4.4, -55, 2.3, 1, 2.3, "crumble"],
      [-1.5, 4.9, -61, 3, 1, 3, ""],
      [2.5, 5.4, -67, 2.3, 1, 2.3, "crumble"],
      [5.5, 5.9, -73, 2.8, 1, 2.8, ""],
      [2, 6.4, -79, 4.8, 1, 4.8, ""],
    ],
    shards: [[8, 2.4, -19], [-5.5, 4.4, -43], [-1.5, 5.9, -61], [5.5, 6.9, -73]],
    hazards: [[-2, 4.0, -37, 1.35, "crawler"], [2.5, 6.5, -67, 1.3, "stalker"], [2, 7.6, -79, 1.4, "sentinel"]],
    breaths: [[9.2, 2.6, -19]],
    beacon: [2, 7.1, -79],
  },
  {
    shardsNeeded: 4,
    plats: [
      [0, 0, 0, 6, 1, 6, "start"],
      [-3, 0.4, -7.5, 2.4, 1, 2.4, "crumble"],
      [-6, 1.0, -14, 3, 1, 3, ""],
      [-9.5, 1.2, -16, 2.5, 1, 2.5, "trap"],
      [-12.2, 1.55, -21, 2.4, 1, 2.4, "trap"],
      [-14.5, 1.95, -26, 2.3, 1, 2.3, "trap"],
      [-16.2, 2.35, -31, 2.2, 1, 2.2, "trap"],
      [-17.5, 2.8, -36, 2.1, 1, 2.1, "trap"],
      [-18.4, 3.25, -41, 2.0, 1, 2.0, "trap"],
      [-3.5, 1.5, -20.5, 2.3, 1, 2.3, "crumble"],
      [0, 2.1, -27, 2.8, 1, 2.8, ""],
      [3.8, 2.3, -28.5, 2.5, 1, 2.5, "trap"],
      [6.6, 2.8, -33.5, 2.4, 1, 2.4, "trap"],
      [9.0, 3.35, -38.5, 2.3, 1, 2.3, "trap"],
      [3.5, 2.6, -33.5, 2.3, 1, 2.3, "crumble"],
      [6.5, 3.2, -40, 3.2, 1, 3.2, "check"],
      [3.5, 3.7, -46.5, 2.3, 1, 2.3, "crumble"],
      [0, 4.3, -53, 2.8, 1, 2.8, ""],
      [-3.5, 4.8, -59.5, 2.3, 1, 2.3, "crumble"],
      [-6.5, 5.4, -66, 3, 1, 3, ""],
      [-3, 5.9, -72.5, 2.4, 1, 2.4, "crumble"],
      [1, 6.5, -79, 3.2, 1, 3.2, ""],
      [4.5, 7.0, -85.5, 2.4, 1, 2.4, "crumble"],
      [1.5, 7.6, -92, 5, 1, 5, ""],
    ],
    shards: [[-6, 2.0, -14], [6.5, 4.2, -40], [-6.5, 6.4, -66], [4.5, 8.0, -85.5]],
    hazards: [[0, 3.2, -27, 1.25, "wraith"], [6.5, 4.4, -40, 1.35, "crawler"], [1, 7.6, -79, 1.3, "stalker"], [1.5, 8.8, -92, 1.45, "sentinel"]],
    breaths: [[-8.2, 6.6, -66]],
    beacon: [1.5, 8.3, -92],
  },
  {
    shardsNeeded: 5,
    plats: [
      [0, 0, 0, 5.5, 1, 5.5, "start"],
      [2.2, 0.5, -6.5, 2.2, 1, 2.2, "crumble"],
      [5, 1.1, -12.5, 2.5, 1, 2.5, ""],
      // tempting right spur
      [8.4, 1.25, -14, 2.5, 1, 2.5, "trap"],
      [11.0, 1.65, -19, 2.4, 1, 2.4, "trap"],
      [13.2, 2.1, -24, 2.3, 1, 2.3, "trap"],
      [14.8, 2.55, -29, 2.2, 1, 2.2, "trap"],
      [16.0, 3.0, -34, 2.1, 1, 2.1, "trap"],
      [7.5, 1.7, -18.5, 2.2, 1, 2.2, "crumble"],
      [5, 2.3, -24.5, 2.8, 1, 2.8, ""],
      [1.5, 2.9, -30.5, 2.2, 1, 2.2, "crumble"],
      [-2, 3.5, -36.5, 3.2, 1, 3.2, "check"],
      // left false after check
      [-6.2, 3.7, -38, 2.5, 1, 2.5, "trap"],
      [-9.0, 4.15, -43, 2.4, 1, 2.4, "trap"],
      [-11.4, 4.6, -48, 2.3, 1, 2.3, "trap"],
      [-13.2, 5.05, -53, 2.2, 1, 2.2, "trap"],
      [-5.2, 4.1, -42.5, 2.2, 1, 2.2, "crumble"],
      [-8, 4.7, -48.5, 2.6, 1, 2.6, ""],
      [-5.2, 5.3, -54.5, 2.2, 1, 2.2, "crumble"],
      [-1.5, 5.9, -60.5, 2.8, 1, 2.8, ""],
      [2, 6.5, -66.5, 2.2, 1, 2.2, "crumble"],
      [5.2, 7.1, -72.5, 2.6, 1, 2.6, ""],
      [8.8, 7.3, -74, 2.4, 1, 2.4, "trap"],
      [11.5, 7.75, -79, 2.3, 1, 2.3, "trap"],
      [13.8, 8.25, -84, 2.2, 1, 2.2, "trap"],
      [2, 7.7, -78.5, 2.2, 1, 2.2, "crumble"],
      [-1.5, 8.3, -84.5, 3, 1, 3, ""],
      [-4.5, 8.9, -90.5, 2.2, 1, 2.2, "crumble"],
      [-1, 9.5, -97, 5.2, 1, 5.2, ""],
    ],
    shards: [[7.5, 2.7, -18.5], [-5.2, 5.1, -42.5], [-1.5, 6.9, -60.5], [5.2, 8.1, -72.5], [-4.5, 9.9, -90.5]],
    hazards: [[-2, 4.6, -36.5, 1.35, "stalker"], [2, 7.6, -66.5, 1.3, "wraith"], [-1.5, 9.4, -84.5, 1.3, "crawler"], [-1, 10.7, -97, 1.5, "sentinel"]],
    breaths: [[8.8, 2.9, -18.5]],
    beacon: [-1, 10.2, -97],
  },
  {
    shardsNeeded: 5,
    plats: [
      [0, 0, 0, 6, 1, 6, "start"],
      [-2.8, 0.55, -7, 2.3, 1, 2.3, "crumble"],
      [-5.8, 1.2, -13.5, 2.7, 1, 2.7, ""],
      [-9.5, 1.4, -15, 2.5, 1, 2.5, "trap"],
      [-12.2, 1.85, -20, 2.4, 1, 2.4, "trap"],
      [-14.5, 2.35, -25, 2.3, 1, 2.3, "trap"],
      [-16.2, 2.85, -30, 2.2, 1, 2.2, "trap"],
      [-3, 1.85, -20, 2.3, 1, 2.3, "crumble"],
      [0.5, 2.5, -26.5, 3, 1, 3, ""],
      [4.2, 2.7, -28, 2.5, 1, 2.5, "trap"],
      [7.0, 3.15, -33, 2.4, 1, 2.4, "trap"],
      [9.4, 3.65, -38, 2.3, 1, 2.3, "trap"],
      [11.2, 4.15, -43, 2.2, 1, 2.2, "trap"],
      [4, 3.15, -33, 2.3, 1, 2.3, "crumble"],
      [7, 3.8, -39.5, 3.2, 1, 3.2, "check"],
      [4, 4.45, -46, 2.3, 1, 2.3, "crumble"],
      [0.5, 5.1, -52.5, 2.8, 1, 2.8, ""],
      [-3, 5.75, -59, 2.3, 1, 2.3, "crumble"],
      [-6.2, 6.4, -65.5, 2.8, 1, 2.8, ""],
      [-10.0, 6.6, -67, 2.4, 1, 2.4, "trap"],
      [-12.8, 7.1, -72, 2.3, 1, 2.3, "trap"],
      [-15.0, 7.6, -77, 2.2, 1, 2.2, "trap"],
      [-3, 7.05, -72, 2.3, 1, 2.3, "crumble"],
      [0.8, 7.7, -78.5, 3, 1, 3, ""],
      [4.2, 8.35, -85, 2.3, 1, 2.3, "crumble"],
      [7, 9.0, -91.5, 2.8, 1, 2.8, ""],
      [3.5, 9.65, -98, 2.4, 1, 2.4, "crumble"],
      [0, 10.3, -104.5, 3.2, 1, 3.2, ""],
      [-3.5, 10.95, -111, 2.4, 1, 2.4, "crumble"],
      [0, 11.6, -118, 6, 1, 6, ""],
    ],
    shards: [[-5.8, 2.2, -13.5], [7, 4.8, -39.5], [-6.2, 7.4, -65.5], [7, 10.0, -91.5], [-3.5, 12.0, -111]],
    hazards: [
      [0.5, 3.6, -26.5, 1.3, "crawler"], [7, 5.0, -39.5, 1.4, "stalker"], [0.8, 8.8, -78.5, 1.3, "wraith"],
      [0, 11.4, -104.5, 1.35, "sentinel"], [0, 12.9, -118, 1.55, "sentinel"],
    ],
    breaths: [[8.5, 4.95, -39.5]],
    beacon: [0, 12.3, -118],
  },
  {
    shardsNeeded: 4,
    plats: [
      [0, 0, 0, 6, 1, 6, "start"],
      [3, 0.45, -7, 2.4, 1, 2.4, "crumble"],
      [6.2, 1.0, -13.5, 2.8, 1, 2.8, ""],
      [9.8, 1.2, -15, 2.5, 1, 2.5, "trap"],
      [12.5, 1.65, -20, 2.4, 1, 2.4, "trap"],
      [14.8, 2.15, -25, 2.3, 1, 2.3, "trap"],
      [16.5, 2.65, -30, 2.2, 1, 2.2, "trap"],
      [3.5, 1.55, -20, 2.3, 1, 2.3, "crumble"],
      [0, 2.15, -26.5, 3.2, 1, 3.2, "check"],
      [-3.8, 2.35, -28, 2.5, 1, 2.5, "trap"],
      [-6.8, 2.85, -33, 2.4, 1, 2.4, "trap"],
      [-9.2, 3.4, -38, 2.3, 1, 2.3, "trap"],
      [-11.2, 3.95, -43, 2.2, 1, 2.2, "trap"],
      [-3.5, 2.75, -33, 2.3, 1, 2.3, "crumble"],
      [-6.5, 3.35, -39.5, 2.8, 1, 2.8, ""],
      [-3.2, 3.95, -46, 2.3, 1, 2.3, "crumble"],
      [0.5, 4.55, -52.5, 3, 1, 3, ""],
      [4, 5.15, -59, 2.3, 1, 2.3, "crumble"],
      [7, 5.75, -65.5, 2.8, 1, 2.8, ""],
      [10.6, 6.0, -67, 2.4, 1, 2.4, "trap"],
      [13.2, 6.5, -72, 2.3, 1, 2.3, "trap"],
      [15.4, 7.05, -77, 2.2, 1, 2.2, "trap"],
      [3.5, 6.35, -72, 2.4, 1, 2.4, "crumble"],
      [0, 7.0, -79, 5, 1, 5, ""],
    ],
    shards: [[6.2, 2.0, -13.5], [-6.5, 4.35, -39.5], [0.5, 5.55, -52.5], [7, 6.75, -65.5]],
    hazards: [[0, 3.25, -26.5, 1.3, "wraith"], [-3.2, 5.05, -46, 1.25, "stalker"], [0, 8.2, -79, 1.4, "sentinel"]],
    breaths: [[8.2, 6.95, -65.5]],
    beacon: [0, 7.7, -79],
  },
  {
    shardsNeeded: 5,
    plats: [
      [0, 0, 0, 5.5, 1, 5.5, "start"],
      [-2.5, 0.5, -6.5, 2.2, 1, 2.2, "crumble"],
      [-5.5, 1.15, -13, 2.6, 1, 2.6, ""],
      [-9.2, 1.35, -14.5, 2.5, 1, 2.5, "trap"],
      [-12.0, 1.85, -19.5, 2.4, 1, 2.4, "trap"],
      [-14.4, 2.4, -24.5, 2.3, 1, 2.3, "trap"],
      [-16.2, 2.95, -29.5, 2.2, 1, 2.2, "trap"],
      [-2.8, 1.8, -19.5, 2.2, 1, 2.2, "crumble"],
      [0.8, 2.45, -26, 2.8, 1, 2.8, ""],
      [4.6, 2.65, -27.5, 2.5, 1, 2.5, "trap"],
      [7.5, 3.15, -32.5, 2.4, 1, 2.4, "trap"],
      [10.0, 3.7, -37.5, 2.3, 1, 2.3, "trap"],
      [12.0, 4.25, -42.5, 2.2, 1, 2.2, "trap"],
      [4, 3.1, -32.5, 2.2, 1, 2.2, "crumble"],
      [7, 3.75, -39, 3.2, 1, 3.2, "check"],
      [4, 4.4, -45.5, 2.2, 1, 2.2, "crumble"],
      [0.5, 5.05, -52, 2.8, 1, 2.8, ""],
      [-3, 5.7, -58.5, 2.2, 1, 2.2, "crumble"],
      [-6, 6.35, -65, 2.6, 1, 2.6, ""],
      [-9.8, 6.55, -66.5, 2.4, 1, 2.4, "trap"],
      [-12.6, 7.1, -71.5, 2.3, 1, 2.3, "trap"],
      [-14.8, 7.65, -76.5, 2.2, 1, 2.2, "trap"],
      [-2.5, 7.0, -71.5, 2.2, 1, 2.2, "crumble"],
      [1.2, 7.65, -78, 3, 1, 3, ""],
      [4.5, 8.3, -84.5, 2.2, 1, 2.2, "crumble"],
      [1, 9.0, -92, 5.2, 1, 5.2, ""],
    ],
    shards: [[-5.5, 2.15, -13], [7, 4.75, -39], [-6, 7.35, -65], [1.2, 8.65, -78], [4.5, 9.3, -84.5]],
    hazards: [[0.8, 3.55, -26, 1.25, "crawler"], [7, 4.95, -39, 1.35, "stalker"], [1.2, 8.85, -78, 1.3, "wraith"], [1, 10.2, -92, 1.45, "sentinel"]],
    breaths: [[-7.2, 7.55, -65]],
    beacon: [1, 9.7, -92],
  },
  {
    shardsNeeded: 5,
    plats: [
      [0, 0, 0, 5.5, 1, 5.5, "start"],
      [2.4, 0.4, -6.5, 2.1, 1, 2.1, "crumble"],
      [5.2, 0.95, -12.5, 2.5, 1, 2.5, ""],
      [8.8, 1.15, -14, 2.5, 1, 2.5, "trap"],
      [11.5, 1.65, -19, 2.4, 1, 2.4, "trap"],
      [13.8, 2.2, -24, 2.3, 1, 2.3, "trap"],
      [15.6, 2.75, -29, 2.2, 1, 2.2, "trap"],
      [2.6, 1.5, -18.5, 2.1, 1, 2.1, "crumble"],
      [-0.8, 2.1, -24.5, 2.7, 1, 2.7, ""],
      [-4.6, 2.3, -26, 2.5, 1, 2.5, "trap"],
      [-7.5, 2.85, -31, 2.4, 1, 2.4, "trap"],
      [-10.0, 3.4, -36, 2.3, 1, 2.3, "trap"],
      [-12.0, 4.0, -41, 2.2, 1, 2.2, "trap"],
      [-4.2, 2.7, -30.5, 2.1, 1, 2.1, "crumble"],
      [-7, 3.35, -37, 3, 1, 3, "check"],
      [-4, 4.0, -43.5, 2.1, 1, 2.1, "crumble"],
      [-0.5, 4.65, -50, 2.6, 1, 2.6, ""],
      [3.2, 5.3, -56.5, 2.1, 1, 2.1, "crumble"],
      [6.2, 6.0, -63, 2.6, 1, 2.6, ""],
      [9.8, 6.2, -64.5, 2.4, 1, 2.4, "trap"],
      [12.5, 6.75, -69.5, 2.3, 1, 2.3, "trap"],
      [14.8, 7.35, -74.5, 2.2, 1, 2.2, "trap"],
      [3, 6.65, -69.5, 2.1, 1, 2.1, "crumble"],
      [-0.5, 7.3, -76, 2.8, 1, 2.8, ""],
      [-3.8, 8.0, -82.5, 2.1, 1, 2.1, "crumble"],
      [-0.2, 8.7, -90, 5, 1, 5, ""],
    ],
    shards: [[5.2, 1.95, -12.5], [-7, 4.35, -37], [6.2, 7.0, -63], [-0.5, 8.3, -76], [-3.8, 9.0, -82.5]],
    hazards: [[-0.8, 3.2, -24.5, 1.25, "wraith"], [-7, 4.5, -37, 1.35, "stalker"], [6.2, 7.2, -63, 1.3, "crawler"], [-0.2, 9.9, -90, 1.5, "sentinel"]],
    breaths: [[7.5, 7.2, -63]],
    beacon: [-0.2, 9.4, -90],
  },
  {
    shardsNeeded: 5,
    plats: [
      [0, 0, 0, 5.5, 1, 5.5, "start"],
      [-2.6, 0.5, -6.5, 2.15, 1, 2.15, "crumble"],
      [-5.6, 1.1, -13, 2.55, 1, 2.55, ""],
      [-9.4, 1.3, -14.5, 2.5, 1, 2.5, "trap"],
      [-12.2, 1.8, -19.5, 2.4, 1, 2.4, "trap"],
      [-14.6, 2.35, -24.5, 2.3, 1, 2.3, "trap"],
      [-16.4, 2.9, -29.5, 2.2, 1, 2.2, "trap"],
      [-2.8, 1.7, -19.5, 2.15, 1, 2.15, "crumble"],
      [0.6, 2.35, -26, 2.7, 1, 2.7, ""],
      [4.4, 2.55, -27.5, 2.5, 1, 2.5, "trap"],
      [7.4, 3.1, -32.5, 2.4, 1, 2.4, "trap"],
      [9.8, 3.7, -37.5, 2.3, 1, 2.3, "trap"],
      [11.8, 4.3, -42.5, 2.2, 1, 2.2, "trap"],
      [4.2, 3.0, -32.5, 2.15, 1, 2.15, "crumble"],
      [7.2, 3.7, -39.5, 3.1, 1, 3.1, "check"],
      [4.2, 4.4, -46, 2.15, 1, 2.15, "crumble"],
      [0.4, 5.1, -52.5, 2.7, 1, 2.7, ""],
      [-3.4, 5.8, -59, 2.15, 1, 2.15, "crumble"],
      [-6.4, 6.5, -65.5, 2.6, 1, 2.6, ""],
      [-10.2, 6.7, -67, 2.4, 1, 2.4, "trap"],
      [-13.0, 7.3, -72, 2.3, 1, 2.3, "trap"],
      [-15.2, 7.9, -77, 2.2, 1, 2.2, "trap"],
      [-3.2, 7.2, -72, 2.15, 1, 2.15, "crumble"],
      [0.6, 7.9, -78.5, 2.9, 1, 2.9, ""],
      [4, 8.6, -85, 2.15, 1, 2.15, "crumble"],
      [0.5, 9.4, -93, 5.4, 1, 5.4, ""],
    ],
    shards: [[-5.6, 2.1, -13], [7.2, 4.7, -39.5], [-6.4, 7.5, -65.5], [0.6, 8.9, -78.5], [4, 9.6, -85]],
    hazards: [[0.6, 3.45, -26, 1.25, "stalker"], [7.2, 4.9, -39.5, 1.4, "crawler"], [-6.4, 7.7, -65.5, 1.3, "wraith"], [0.5, 10.6, -93, 1.5, "sentinel"]],
    breaths: [[8.5, 4.9, -39.5]],
    beacon: [0.5, 10.1, -93],
  },
  {
    shardsNeeded: 5,
    plats: [
      [0, 0, 0, 6, 1, 6, "start"],
      [2.8, 0.55, -7, 2.3, 1, 2.3, "crumble"],
      [5.8, 1.2, -13.5, 2.7, 1, 2.7, ""],
      [9.6, 1.4, -15, 2.5, 1, 2.5, "trap"],
      [12.4, 1.9, -20, 2.4, 1, 2.4, "trap"],
      [14.8, 2.45, -25, 2.3, 1, 2.3, "trap"],
      [16.6, 3.0, -30, 2.2, 1, 2.2, "trap"],
      [3, 1.85, -20, 2.3, 1, 2.3, "crumble"],
      [-0.5, 2.5, -26.5, 3, 1, 3, ""],
      [-4.4, 2.7, -28, 2.5, 1, 2.5, "trap"],
      [-7.4, 3.25, -33, 2.4, 1, 2.4, "trap"],
      [-9.8, 3.85, -38, 2.3, 1, 2.3, "trap"],
      [-11.8, 4.45, -43, 2.2, 1, 2.2, "trap"],
      [-4, 3.15, -33, 2.3, 1, 2.3, "crumble"],
      [-7, 3.8, -39.5, 3.2, 1, 3.2, "check"],
      [-4, 4.45, -46, 2.3, 1, 2.3, "crumble"],
      [-0.5, 5.1, -52.5, 2.8, 1, 2.8, ""],
      [3, 5.75, -59, 2.3, 1, 2.3, "crumble"],
      [6.2, 6.4, -65.5, 2.8, 1, 2.8, ""],
      [10.0, 6.6, -67, 2.4, 1, 2.4, "trap"],
      [12.8, 7.15, -72, 2.3, 1, 2.3, "trap"],
      [15.0, 7.7, -77, 2.2, 1, 2.2, "trap"],
      [3, 7.05, -72, 2.3, 1, 2.3, "crumble"],
      [-0.8, 7.7, -78.5, 3, 1, 3, ""],
      [-4.2, 8.35, -85, 2.3, 1, 2.3, "crumble"],
      [-7, 9.0, -91.5, 2.8, 1, 2.8, ""],
      [-3.5, 9.65, -98, 2.4, 1, 2.4, "crumble"],
      [0, 10.3, -104.5, 3.2, 1, 3.2, ""],
      [3.5, 10.95, -111, 2.4, 1, 2.4, "crumble"],
      [0, 11.7, -119, 6.5, 1, 6.5, ""],
    ],
    shards: [[5.8, 2.2, -13.5], [-7, 4.8, -39.5], [6.2, 7.4, -65.5], [-7, 10.0, -91.5], [3.5, 12.0, -111]],
    hazards: [
      [-0.5, 3.6, -26.5, 1.3, "stalker"], [-7, 5.0, -39.5, 1.4, "crawler"], [-0.8, 8.8, -78.5, 1.3, "wraith"],
      [0, 11.4, -104.5, 1.35, "sentinel"], [0, 12.95, -119, 1.55, "sentinel"],
    ],
    breaths: [[7.5, 7.6, -65.5]],
    beacon: [0, 12.4, -119],
  },
  // —— 11–15: denser forks ——
  {
    shardsNeeded: 5,
    plats: [
      [0, 0, 0, 5.8, 1, 5.8, "start"],
      [2.2, 0.45, -6.5, 2.2, 1, 2.2, "crumble"],
      [5.0, 1.05, -12.5, 2.6, 1, 2.6, ""],
      [8.6, 1.25, -14, 2.5, 1, 2.5, "trap"],
      [11.4, 1.75, -19, 2.4, 1, 2.4, "trap"],
      [13.8, 2.3, -24, 2.3, 1, 2.3, "trap"],
      [15.8, 2.9, -29.5, 2.2, 1, 2.2, "trap"],
      [17.2, 3.5, -35, 2.1, 1, 2.1, "trap"],
      [2.4, 1.6, -18.5, 2.15, 1, 2.15, "crumble"],
      [-0.6, 2.25, -25, 2.7, 1, 2.7, ""],
      [-4.4, 2.45, -26.5, 2.5, 1, 2.5, "trap"],
      [-7.4, 3.0, -31.5, 2.4, 1, 2.4, "trap"],
      [-9.8, 3.6, -36.5, 2.3, 1, 2.3, "trap"],
      [-11.8, 4.2, -41.5, 2.2, 1, 2.2, "trap"],
      [-3.8, 2.9, -31.5, 2.15, 1, 2.15, "crumble"],
      [-6.8, 3.6, -38, 3.1, 1, 3.1, "check"],
      [-3.6, 4.25, -44.5, 2.15, 1, 2.15, "crumble"],
      [0.2, 4.95, -51, 2.7, 1, 2.7, ""],
      [4.0, 5.65, -57.5, 2.15, 1, 2.15, "crumble"],
      [7.0, 6.35, -64, 2.7, 1, 2.7, ""],
      [10.8, 6.55, -65.5, 2.4, 1, 2.4, "trap"],
      [13.6, 7.15, -70.5, 2.3, 1, 2.3, "trap"],
      [15.8, 7.8, -75.5, 2.2, 1, 2.2, "trap"],
      [3.5, 7.05, -70.5, 2.15, 1, 2.15, "crumble"],
      [0, 7.75, -77.5, 2.9, 1, 2.9, ""],
      [-3.5, 8.45, -84, 2.15, 1, 2.15, "crumble"],
      [0.2, 9.25, -92, 5.2, 1, 5.2, ""],
    ],
    shards: [[5.0, 2.05, -12.5], [-6.8, 4.6, -38], [7.0, 7.35, -64], [0, 8.75, -77.5], [-3.5, 9.45, -84]],
    hazards: [[-0.6, 3.35, -25, 1.25, "wraith"], [-6.8, 4.8, -38, 1.35, "stalker"], [7.0, 7.55, -64, 1.3, "crawler"], [0.2, 10.45, -92, 1.5, "sentinel"]],
    breaths: [[8.4, 7.55, -64]],
    beacon: [0.2, 9.95, -92],
  },
  {
    shardsNeeded: 6,
    plats: [
      [0, 0, 0, 5.5, 1, 5.5, "start"],
      [-2.4, 0.5, -6.5, 2.1, 1, 2.1, "crumble"],
      [-5.2, 1.15, -13, 2.55, 1, 2.55, ""],
      [-8.8, 1.35, -14.5, 2.5, 1, 2.5, "trap"],
      [-11.6, 1.9, -19.5, 2.4, 1, 2.4, "trap"],
      [-14.0, 2.5, -24.5, 2.3, 1, 2.3, "trap"],
      [-16.0, 3.15, -30, 2.2, 1, 2.2, "trap"],
      [-2.6, 1.75, -19.5, 2.1, 1, 2.1, "crumble"],
      [0.8, 2.45, -26, 2.7, 1, 2.7, ""],
      [4.6, 2.65, -27.5, 2.5, 1, 2.5, "trap"],
      [7.6, 3.25, -32.5, 2.4, 1, 2.4, "trap"],
      [10.2, 3.9, -37.5, 2.3, 1, 2.3, "trap"],
      [12.4, 4.55, -42.5, 2.2, 1, 2.2, "trap"],
      [4.0, 3.15, -33, 2.1, 1, 2.1, "crumble"],
      [7.0, 3.9, -40, 3.1, 1, 3.1, "check"],
      [4.0, 4.6, -46.5, 2.1, 1, 2.1, "crumble"],
      [0.2, 5.35, -53, 2.7, 1, 2.7, ""],
      [-3.6, 6.1, -59.5, 2.1, 1, 2.1, "crumble"],
      [-6.6, 6.85, -66, 2.6, 1, 2.6, ""],
      [-10.4, 7.05, -67.5, 2.4, 1, 2.4, "trap"],
      [-13.2, 7.7, -72.5, 2.3, 1, 2.3, "trap"],
      [-15.4, 8.4, -77.5, 2.2, 1, 2.2, "trap"],
      [-3.0, 7.55, -72.5, 2.1, 1, 2.1, "crumble"],
      [0.8, 8.3, -79, 2.8, 1, 2.8, ""],
      [4.4, 9.05, -85.5, 2.1, 1, 2.1, "crumble"],
      [1.0, 9.85, -93, 3.0, 1, 3.0, ""],
      [-2.5, 10.55, -99.5, 2.1, 1, 2.1, "crumble"],
      [0.5, 11.35, -107, 5.4, 1, 5.4, ""],
    ],
    shards: [[-5.2, 2.15, -13], [7.0, 4.9, -40], [-6.6, 7.85, -66], [0.8, 9.3, -79], [4.4, 10.05, -85.5], [-2.5, 11.55, -99.5]],
    hazards: [
      [0.8, 3.55, -26, 1.25, "crawler"], [7.0, 5.1, -40, 1.4, "stalker"], [-6.6, 8.05, -66, 1.3, "wraith"],
      [1.0, 11.05, -93, 1.35, "sentinel"], [0.5, 12.55, -107, 1.55, "sentinel"],
    ],
    breaths: [[8.4, 5.1, -40], [-7.8, 8.05, -66]],
    beacon: [0.5, 12.05, -107],
  },
  {
    shardsNeeded: 6,
    plats: [
      [0, 0, 0, 5.5, 1, 5.5, "start"],
      [2.5, 0.5, -6.5, 2.15, 1, 2.15, "crumble"],
      [5.4, 1.15, -13, 2.55, 1, 2.55, ""],
      // twin false forks early
      [9.0, 1.35, -14.5, 2.5, 1, 2.5, "trap"],
      [11.8, 1.9, -19.5, 2.4, 1, 2.4, "trap"],
      [14.2, 2.5, -24.5, 2.3, 1, 2.3, "trap"],
      [16.2, 3.15, -30, 2.2, 1, 2.2, "trap"],
      [1.8, 1.4, -14.5, 2.3, 1, 2.3, "trap"],
      [-0.5, 1.95, -19.5, 2.2, 1, 2.2, "trap"],
      [-2.5, 2.55, -24.5, 2.1, 1, 2.1, "trap"],
      [2.6, 1.8, -19.5, 2.15, 1, 2.15, "crumble"],
      [-0.8, 2.5, -26, 2.7, 1, 2.7, ""],
      [-4.6, 2.7, -27.5, 2.5, 1, 2.5, "trap"],
      [-7.6, 3.3, -32.5, 2.4, 1, 2.4, "trap"],
      [-10.0, 3.95, -37.5, 2.3, 1, 2.3, "trap"],
      [-4.0, 3.2, -33, 2.15, 1, 2.15, "crumble"],
      [-7.0, 3.95, -40, 3.15, 1, 3.15, "check"],
      [-3.8, 4.65, -46.5, 2.15, 1, 2.15, "crumble"],
      [0, 5.4, -53, 2.7, 1, 2.7, ""],
      [3.8, 6.15, -59.5, 2.15, 1, 2.15, "crumble"],
      [6.8, 6.9, -66, 2.65, 1, 2.65, ""],
      [10.6, 7.1, -67.5, 2.4, 1, 2.4, "trap"],
      [13.4, 7.75, -72.5, 2.3, 1, 2.3, "trap"],
      [15.6, 8.45, -77.5, 2.2, 1, 2.2, "trap"],
      [3.2, 7.6, -72.5, 2.15, 1, 2.15, "crumble"],
      [-0.4, 8.35, -79, 2.85, 1, 2.85, ""],
      [-3.8, 9.1, -85.5, 2.15, 1, 2.15, "crumble"],
      [0, 9.9, -93, 3.1, 1, 3.1, ""],
      [3.6, 10.65, -99.5, 2.15, 1, 2.15, "crumble"],
      [0.2, 11.45, -107, 5.5, 1, 5.5, ""],
    ],
    shards: [[5.4, 2.15, -13], [-7.0, 4.95, -40], [6.8, 7.9, -66], [-0.4, 9.35, -79], [-3.8, 10.1, -85.5], [3.6, 11.65, -99.5]],
    hazards: [
      [-0.8, 3.6, -26, 1.25, "wraith"], [-7.0, 5.15, -40, 1.4, "stalker"], [6.8, 8.1, -66, 1.3, "crawler"],
      [0, 11.1, -93, 1.35, "sentinel"], [0.2, 12.65, -107, 1.55, "sentinel"],
    ],
    breaths: [[8.2, 8.1, -66]],
    beacon: [0.2, 12.15, -107],
  },
  {
    shardsNeeded: 6,
    plats: [
      [0, 0, 0, 5.6, 1, 5.6, "start"],
      [-2.5, 0.5, -6.5, 2.15, 1, 2.15, "crumble"],
      [-5.4, 1.2, -13, 2.55, 1, 2.55, ""],
      [-9.0, 1.4, -14.5, 2.5, 1, 2.5, "trap"],
      [-11.8, 2.0, -19.5, 2.4, 1, 2.4, "trap"],
      [-14.2, 2.65, -24.5, 2.3, 1, 2.3, "trap"],
      [-16.2, 3.35, -30, 2.2, 1, 2.2, "trap"],
      [-2.6, 1.85, -19.5, 2.15, 1, 2.15, "crumble"],
      [0.8, 2.55, -26, 2.7, 1, 2.7, ""],
      [4.6, 2.75, -27.5, 2.5, 1, 2.5, "trap"],
      [7.6, 3.4, -32.5, 2.4, 1, 2.4, "trap"],
      [10.2, 4.1, -37.5, 2.3, 1, 2.3, "trap"],
      [12.4, 4.85, -42.5, 2.2, 1, 2.2, "trap"],
      [14.2, 5.6, -47.5, 2.1, 1, 2.1, "trap"],
      [4.0, 3.3, -33, 2.15, 1, 2.15, "crumble"],
      [7.0, 4.1, -40, 3.15, 1, 3.15, "check"],
      [3.8, 4.85, -46.5, 2.15, 1, 2.15, "crumble"],
      [0, 5.65, -53, 2.7, 1, 2.7, ""],
      [-3.8, 6.45, -59.5, 2.15, 1, 2.15, "crumble"],
      [-6.8, 7.25, -66, 2.65, 1, 2.65, ""],
      [-10.6, 7.45, -67.5, 2.4, 1, 2.4, "trap"],
      [-13.4, 8.15, -72.5, 2.3, 1, 2.3, "trap"],
      [-15.6, 8.9, -77.5, 2.2, 1, 2.2, "trap"],
      [-3.2, 8.0, -72.5, 2.15, 1, 2.15, "crumble"],
      [0.6, 8.8, -79, 2.85, 1, 2.85, ""],
      [4.2, 9.6, -85.5, 2.15, 1, 2.15, "crumble"],
      [0.8, 10.45, -93, 3.1, 1, 3.1, ""],
      [-2.8, 11.25, -99.5, 2.15, 1, 2.15, "crumble"],
      [0.4, 12.15, -108, 5.6, 1, 5.6, ""],
    ],
    shards: [[-5.4, 2.2, -13], [7.0, 5.1, -40], [-6.8, 8.25, -66], [0.6, 9.8, -79], [4.2, 10.6, -85.5], [-2.8, 12.25, -99.5]],
    hazards: [
      [0.8, 3.65, -26, 1.25, "stalker"], [7.0, 5.3, -40, 1.4, "crawler"], [-6.8, 8.45, -66, 1.3, "wraith"],
      [0.8, 11.65, -93, 1.35, "sentinel"], [0.4, 13.35, -108, 1.55, "sentinel"],
    ],
    breaths: [[8.4, 5.3, -40], [-8.0, 8.45, -66]],
    beacon: [0.4, 12.85, -108],
  },
  {
    shardsNeeded: 6,
    plats: [
      [0, 0, 0, 6, 1, 6, "start"],
      [2.6, 0.55, -7, 2.2, 1, 2.2, "crumble"],
      [5.6, 1.25, -13.5, 2.65, 1, 2.65, ""],
      [9.4, 1.45, -15, 2.5, 1, 2.5, "trap"],
      [12.2, 2.05, -20, 2.4, 1, 2.4, "trap"],
      [14.6, 2.7, -25, 2.3, 1, 2.3, "trap"],
      [16.6, 3.4, -30.5, 2.2, 1, 2.2, "trap"],
      [18.0, 4.1, -36, 2.1, 1, 2.1, "trap"],
      [2.8, 1.95, -20, 2.2, 1, 2.2, "crumble"],
      [-0.6, 2.7, -26.5, 2.9, 1, 2.9, ""],
      [-4.6, 2.9, -28, 2.5, 1, 2.5, "trap"],
      [-7.6, 3.55, -33, 2.4, 1, 2.4, "trap"],
      [-10.0, 4.25, -38, 2.3, 1, 2.3, "trap"],
      [-12.0, 5.0, -43, 2.2, 1, 2.2, "trap"],
      [-4.0, 3.4, -33.5, 2.2, 1, 2.2, "crumble"],
      [-7.0, 4.2, -40.5, 3.2, 1, 3.2, "check"],
      [-3.8, 4.95, -47, 2.2, 1, 2.2, "crumble"],
      [0, 5.75, -53.5, 2.8, 1, 2.8, ""],
      [3.8, 6.55, -60, 2.2, 1, 2.2, "crumble"],
      [6.8, 7.35, -66.5, 2.7, 1, 2.7, ""],
      [10.6, 7.55, -68, 2.4, 1, 2.4, "trap"],
      [13.4, 8.25, -73, 2.3, 1, 2.3, "trap"],
      [15.6, 9.0, -78, 2.2, 1, 2.2, "trap"],
      [3.2, 8.1, -73, 2.2, 1, 2.2, "crumble"],
      [-0.4, 8.9, -79.5, 2.9, 1, 2.9, ""],
      [-4.0, 9.7, -86, 2.2, 1, 2.2, "crumble"],
      [-7.0, 10.5, -92.5, 2.7, 1, 2.7, ""],
      [-3.4, 11.3, -99, 2.2, 1, 2.2, "crumble"],
      [0.2, 12.15, -106, 3.2, 1, 3.2, ""],
      [3.8, 12.95, -112.5, 2.2, 1, 2.2, "crumble"],
      [0, 13.85, -121, 6.5, 1, 6.5, ""],
    ],
    shards: [[5.6, 2.25, -13.5], [-7.0, 5.2, -40.5], [6.8, 8.35, -66.5], [-7.0, 11.5, -92.5], [0.2, 13.15, -106], [3.8, 13.95, -112.5]],
    hazards: [
      [-0.6, 3.8, -26.5, 1.3, "stalker"], [-7.0, 5.4, -40.5, 1.4, "crawler"], [6.8, 8.55, -66.5, 1.3, "wraith"],
      [-0.4, 10.1, -79.5, 1.35, "sentinel"], [0, 15.05, -121, 1.6, "sentinel"],
    ],
    breaths: [[8.2, 8.55, -66.5], [-8.2, 11.7, -92.5]],
    beacon: [0, 14.55, -121],
  },
];

levelMaxEl.textContent = String(LEVELS.length);

const platforms = [];
const shards = [];
const hazards = [];
const breaths = [];
let beacon = null;
let levelExtras = [];
const dust = [];
let pathHints = [];
let pathHintActive = false;
let adShownThisOver = false;
let reviveUsedThisOver = false;
let fallAdTick = 0;
let lastInterstitialAt = 0;
let adBreak = false;
const AD_COOLDOWN_MS = 40000;
const START_LIVES = 5;
const MAX_LIVES = 8;

function clearLevel() {
  for (const p of platforms) scene.remove(p.mesh);
  platforms.length = 0;
  for (const s of shards) scene.remove(s.mesh);
  shards.length = 0;
  for (const h of hazards) scene.remove(h.mesh);
  hazards.length = 0;
  for (const b of breaths) scene.remove(b.mesh);
  breaths.length = 0;
  clearPathHints();
  for (const e of levelExtras) scene.remove(e);
  levelExtras = [];
  beacon = null;
}

function clearPathHints() {
  for (const m of pathHints) scene.remove(m);
  pathHints = [];
}

function addBreath(x, y, z) {
  const g = new THREE.Group();
  const vial = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.12, 0.22, 4, 8),
    new THREE.MeshStandardMaterial({
      color: 0xa8e8ff, emissive: 0x2a90c0, emissiveIntensity: 0.95,
      roughness: 0.25, metalness: 0.2, transparent: true, opacity: 0.9,
    })
  );
  vial.castShadow = true;
  g.add(vial);
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0x6ad0ff, transparent: true, opacity: 0.12, depthWrite: false })
  );
  g.add(glow);
  g.position.set(x, y, z);
  scene.add(g);
  breaths.push({ mesh: g, vial, taken: false, baseY: y });
}

function platCenter(p) {
  return new THREE.Vector3((p.min.x + p.max.x) / 2, p.max.y, (p.min.z + p.max.z) / 2);
}

function jumpCost(a, b) {
  const ca = platCenter(a);
  const cb = platCenter(b);
  const dx = cb.x - ca.x;
  const dz = cb.z - ca.z;
  const dy = cb.y - ca.y;
  const horiz = Math.hypot(dx, dz);
  if (horiz > 6.2) return Infinity;
  if (dy > 2.4 || dy < -3.2) return Infinity;
  if (cb.z > ca.z + 1.5) return Infinity; // mostly forward (−Z)
  let cost = horiz + Math.abs(dy) * 1.4;
  if (b.crumble) cost += 2.2;
  if (b.trap) cost += 80; // almost never prefer traps
  // hazard near landing
  for (const h of hazards) {
    const d = Math.hypot(h.base.x - cb.x, h.base.z - cb.z);
    if (d < 2.2) cost += 4.5;
  }
  return cost;
}

/** Safe route toward beacon — avoids trap spurs */
function computeSafeRoute() {
  const alive = platforms.filter((p) => !p.gone);
  if (!alive.length || !beacon) return [];
  let start = alive[0];
  let bestD = Infinity;
  for (const p of alive) {
    const c = platCenter(p);
    const d = c.distanceToSquared(player.pos);
    if (d < bestD) { bestD = d; start = p; }
  }
  const goalPos = beacon.pos;
  let goal = alive[0];
  bestD = Infinity;
  for (const p of alive) {
    const c = platCenter(p);
    const d = c.distanceToSquared(goalPos);
    if (d < bestD) { bestD = d; goal = p; }
  }
  // Dijkstra
  const dist = new Map();
  const prev = new Map();
  const q = [];
  for (const p of alive) dist.set(p, Infinity);
  dist.set(start, 0);
  q.push(start);
  while (q.length) {
    q.sort((a, b) => dist.get(a) - dist.get(b));
    const u = q.shift();
    if (u === goal) break;
    for (const v of alive) {
      if (v === u) continue;
      const w = jumpCost(u, v);
      if (!Number.isFinite(w)) continue;
      const nd = dist.get(u) + w;
      if (nd < dist.get(v)) {
        dist.set(v, nd);
        prev.set(v, u);
        if (!q.includes(v)) q.push(v);
      }
    }
  }
  if (!prev.has(goal) && start !== goal) {
    // fallback: sort by −Z toward beacon
    return alive
      .filter((p) => platCenter(p).z <= player.pos.z + 0.5)
      .sort((a, b) => platCenter(a).z - platCenter(b).z)
      .slice(0, 8);
  }
  const path = [];
  let cur = goal;
  const guard = new Set();
  while (cur && !guard.has(cur)) {
    path.push(cur);
    guard.add(cur);
    cur = prev.get(cur);
  }
  path.reverse();
  return path;
}

function addHintMarker(pos, color, tall = 1.15) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.045, 6, 18),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.85 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.set(pos.x, pos.y + 0.1, pos.z);
  scene.add(ring);
  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.035, 0.035, tall, 6),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.4 })
  );
  beam.position.set(pos.x, pos.y + tall * 0.55, pos.z);
  scene.add(beam);
  pathHints.push(ring, beam);
}

function addHintLink(a, b, color) {
  const mid = a.clone().lerp(b, 0.5);
  mid.y += 0.35;
  const len = a.distanceTo(b);
  const link = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, Math.max(0.2, len), 5),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55 })
  );
  link.position.copy(mid);
  link.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    b.clone().sub(a).normalize()
  );
  scene.add(link);
  pathHints.push(link);
}

function rebuildPathHints() {
  clearPathHints();
  if (!pathHintActive) return;
  const route = computeSafeRoute();
  // only upcoming plates on the safe chain
  const ahead = route.filter((p) => {
    const c = platCenter(p);
    return c.z < player.pos.z - 0.4 || c.distanceTo(player.pos) > 1.2;
  }).slice(0, 7);
  for (let i = 0; i < ahead.length; i++) {
    const c = platCenter(ahead[i]);
    addHintMarker(c, 0x6ad0ff, 1.0 + (1 - i / 7) * 0.4);
    if (i > 0) addHintLink(platCenter(ahead[i - 1]), c, 0x4ec4ff);
  }
  // mark nearby trap forks in red — so the choice is clear
  for (const p of platforms) {
    if (p.gone || !p.trap) continue;
    const c = platCenter(p);
    if (c.distanceTo(player.pos) > 22) continue;
    addHintMarker(c, 0xff4060, 0.7);
    // X mark
    const x1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.06, 0.08),
      new THREE.MeshBasicMaterial({ color: 0xff4060 })
    );
    x1.position.set(c.x, c.y + 0.35, c.z);
    x1.rotation.y = Math.PI / 4;
    const x2 = x1.clone();
    x2.rotation.y = -Math.PI / 4;
    scene.add(x1); scene.add(x2);
    pathHints.push(x1, x2);
  }
}

function enablePathHint() {
  pathHintActive = true;
  rebuildPathHints();
  if (objectiveEl) {
    objectiveEl.textContent = t("pathHintOn");
    setTimeout(() => { if (mode === "play") refreshObjective(); }, 2200);
  }
}

function clearPathHintLife() {
  pathHintActive = false;
  clearPathHints();
}

function showAdWithMusicPause(opts = {}) {
  const show = window.showFullScreenAd;
  const userClose = opts.onClose;
  const userSkip = opts.onSkip;
  const wrap = (fn) => () => {
    adBreak = false;
    Music.resumeAfterAd();
    if (typeof fn === "function") fn();
  };
  if (typeof show !== "function") {
    wrap(userSkip || userClose)();
    return;
  }
  adBreak = true;
  Music.pauseForAd();
  try {
    show({
      onClose: wrap(userClose),
      onSkip: wrap(userSkip || userClose),
    });
  } catch (_) {
    wrap(userSkip || userClose)();
  }
}

/** Interstitial with anti-spam cooldown. force=true bypasses cooldown (game over). */
function showInterstitialAd(opts = {}) {
  const force = !!opts.force;
  const now = performance.now();
  if (!force && now - lastInterstitialAt < AD_COOLDOWN_MS) {
    if (typeof opts.onSkip === "function") opts.onSkip();
    else if (typeof opts.onClose === "function") opts.onClose();
    return false;
  }
  lastInterstitialAt = now;
  showAdWithMusicPause(opts);
  return true;
}

function requestPathHintAd() {
  if (pathHintActive) {
    alert(t("pathHintBusy"));
    return;
  }
  showAdWithMusicPause({
    onClose: () => enablePathHint(),
    onSkip: () => { try { alert(t("adUnavailable")); } catch (_) {} },
  });
}

function showGameOverAd() {
  if (adShownThisOver) return;
  adShownThisOver = true;
  setTimeout(() => {
    showInterstitialAd({ force: true, onClose() {} });
  }, 700);
}

/** Every other fall (while breaths remain). */
function maybeFallAd() {
  fallAdTick += 1;
  if (fallAdTick % 2 !== 0) return;
  setTimeout(() => {
    if (mode !== "play" && mode !== "pause") return;
    showInterstitialAd({ onClose() {}, onSkip() {} });
  }, 450);
}

/** After clearing even-numbered tiers (2, 4, 6…). */
function maybeLevelClearAd() {
  if ((levelIndex + 1) % 2 !== 0) return;
  setTimeout(() => {
    if (mode !== "levelclear") return;
    showInterstitialAd({ onClose() {}, onSkip() {} });
  }, 900);
}

function requestReviveAd() {
  if (mode !== "over") return;
  if (reviveUsedThisOver) {
    try { alert(t("reviveBusy")); } catch (_) {}
    return;
  }
  showAdWithMusicPause({
    onClose: () => {
      reviveUsedThisOver = true;
      lives = 1;
      refreshHud();
      respawn();
      mode = "play";
      hideAllPanels();
      setHudVisible(true);
      syncPlayChrome();
      Music.forLevel(levelIndex);
      if (!isTouchUI()) {
        try { viewport.requestPointerLock(); } catch (_) {}
      }
    },
    onSkip: () => { try { alert(t("adUnavailable")); } catch (_) {} },
  });
}

function decoratePlatform(group, w, d, kind) {
  // rim sits ON the slab top (slab half-height = 0.5)
  const topY = 0.5;
  const rimMat = new THREE.MeshStandardMaterial({
    color: kind === "crumble" ? 0xc47a3a : kind === "check" || kind === "start" ? 0x5ecf8c : 0x6a7d99,
    emissive: kind === "crumble" ? 0x401800 : kind === "check" || kind === "start" ? 0x0a3020 : 0x101820,
    emissiveIntensity: 0.3,
    roughness: 0.55,
  });
  const edge = new THREE.Mesh(new THREE.BoxGeometry(w + 0.06, 0.06, d + 0.06), rimMat);
  edge.position.y = topY + 0.02;
  edge.castShadow = false;
  group.add(edge);

  // underside brace — does not pierce the top
  const under = new THREE.Mesh(
    new THREE.BoxGeometry(w * 0.88, 0.28, d * 0.88),
    new THREE.MeshStandardMaterial({ color: 0x121820, roughness: 0.95 })
  );
  under.position.y = -0.55;
  under.castShadow = false;
  group.add(under);

  if (kind === "crumble") {
    for (let i = 0; i < 3; i++) {
      const crack = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.03, 0.45 + Math.random() * 0.5),
        new THREE.MeshStandardMaterial({ color: 0x2a1408 })
      );
      crack.position.set((Math.random() - 0.5) * w * 0.5, topY + 0.02, (Math.random() - 0.5) * d * 0.5);
      crack.rotation.y = Math.random() * Math.PI;
      crack.castShadow = false;
      group.add(crack);
    }
  }

  // short corner stubs ON TOP only (no pillars through the slab)
  if (kind !== "crumble" && w >= 2.8 && d >= 2.8) {
    const stubMat = new THREE.MeshStandardMaterial({ color: 0x2a3344, roughness: 0.7, metalness: 0.25 });
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => {
      const stub = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.12), stubMat);
      stub.position.set(sx * (w * 0.42), topY + 0.1, sz * (d * 0.42));
      stub.castShadow = false;
      group.add(stub);
    });
  }

  // lantern sits on the surface, not through it
  if (kind === "check" || kind === "start") {
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.14, 0.08, 8),
      new THREE.MeshStandardMaterial({ color: 0x314055, metalness: 0.4, roughness: 0.45 })
    );
    base.position.set(w * 0.28, topY + 0.05, d * 0.28);
    base.castShadow = false;
    group.add(base);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.055, 0.95, 6),
      new THREE.MeshStandardMaterial({ color: 0x314055, metalness: 0.45, roughness: 0.4 })
    );
    pole.position.set(w * 0.28, topY + 0.55, d * 0.28);
    pole.castShadow = false;
    group.add(pole);
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 10, 10),
      new THREE.MeshStandardMaterial({ color: 0xb8ffd8, emissive: 0x3dff9a, emissiveIntensity: 1.2 })
    );
    lamp.position.set(w * 0.28, topY + 1.1, d * 0.28);
    lamp.castShadow = false;
    group.add(lamp);
  }
}

function addPlatform(x, y, z, w, h, d, kind) {
  const raw = kind || "";
  const isTrap = raw === "trap" || raw.startsWith("trap-") || raw === "trap-stone";
  let look = raw;
  if (raw === "trap" || raw === "trap-stone") {
    // Same mix as the real route: stone / crumble / lantern check
    const hsh = Math.abs(Math.floor(Math.sin(x * 1.73 + z * 0.37) * 10007)) % 5;
    look = hsh <= 1 ? "crumble" : hsh === 2 ? "check" : "";
  } else if (raw === "trap-crumble") look = "crumble";
  else if (raw === "trap-check") look = "check";
  else if (isTrap) look = "";

  // Match typical safe-path footprint so dead-ends don't "shrink into a tip"
  let pw = w;
  let pd = d;
  if (isTrap) {
    pw = Math.max(2.55, Math.min(3.1, w < 2.4 ? 2.7 : w));
    pd = Math.max(2.55, Math.min(3.1, d < 2.4 ? 2.7 : d));
  }

  const group = new THREE.Group();
  group.position.set(x, y, z);
  let map = texStone;
  if (look === "crumble") map = texRust;
  else if (look === "check" || look === "start") map = texMoss;
  const mesh = new THREE.Mesh(
    new RoundedBoxGeometry(pw, h, pd, 2, 0.06),
    new THREE.MeshStandardMaterial({
      map,
      roughness: look === "crumble" ? 0.92 : 0.65,
      metalness: 0.1,
      envMapIntensity: 0.4,
    })
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  decoratePlatform(group, pw, pd, look);
  scene.add(group);
  platforms.push({
    mesh: group, topMesh: mesh,
    min: new THREE.Vector3(x - pw / 2, y - h / 2, z - pd / 2),
    max: new THREE.Vector3(x + pw / 2, y + h / 2, z + pd / 2),
    crumble: look === "crumble",
    trap: isTrap,
    // Fake lantern checks on traps must NOT rewrite spawn
    checkpoint: !isTrap && (look === "check" || look === "start"),
    timer: 0, gone: false, baseY: y,
  });
}

function addShard(x, y, z, decoy = false) {
  const g = new THREE.Group();
  const crystal = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.4, 0),
    new THREE.MeshStandardMaterial({
      color: 0xffe099, emissive: 0xffb000, emissiveIntensity: 1.15,
      roughness: 0.18, metalness: 0.4, transparent: true, opacity: 0.95,
    })
  );
  crystal.castShadow = true;
  g.add(crystal);
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xffc84a, transparent: true, opacity: 0.12 })
  );
  g.add(glow);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.6, 0.035, 8, 24),
    new THREE.MeshStandardMaterial({ color: 0xffd166, emissive: 0xaa7700, emissiveIntensity: 0.85 })
  );
  ring.rotation.x = Math.PI / 2;
  g.add(ring);
  g.position.set(x, y, z);
  scene.add(g);
  shards.push({ mesh: g, crystal, ring, taken: false, baseY: y, decoy: !!decoy });
}

/** Fill false branches with the same props as the real route. */
function dressTrapBranches() {
  const traps = platforms.filter((p) => p.trap);
  if (!traps.length) return;
  const kinds = ["stalker", "wraith", "crawler", "sentinel"];
  let ki = Math.abs(traps.length * 3 + levelIndex) % kinds.length;
  for (let i = 0; i < traps.length; i++) {
    const p = traps[i];
    const cx = (p.min.x + p.max.x) / 2;
    const cy = p.max.y;
    const cz = (p.min.z + p.max.z) / 2;
    // Monsters on most trap plates (skip the first step of a spur — less obvious)
    if (i % 2 === 1) {
      addHazard(cx, cy + 1.05, cz, 1.25 + (i % 3) * 0.05, kinds[ki++ % kinds.length]);
    }
    // Decoy Names — look real, don't count toward the beacon
    if (i % 3 === 2) {
      addShard(cx, cy + 1.35, cz, true);
    }
    // Occasional breath vial as further bait
    if (i % 5 === 4) {
      addBreath(cx + 0.35, cy + 1.15, cz - 0.2);
    }
  }
}

function matsOblivion() {
  return {
    hide: new THREE.MeshStandardMaterial({
      color: 0x2a060c, emissive: 0x7a0814, emissiveIntensity: 0.55, roughness: 0.72, metalness: 0.12,
    }),
    bone: new THREE.MeshStandardMaterial({
      color: 0x5a1018, emissive: 0xcc1020, emissiveIntensity: 0.35, roughness: 0.45, metalness: 0.2,
    }),
    glow: new THREE.MeshStandardMaterial({
      color: 0xff4058, emissive: 0xff1020, emissiveIntensity: 1.6, roughness: 0.2,
    }),
    mist: new THREE.MeshBasicMaterial({
      color: 0xff1830, transparent: true, opacity: 0.16, depthWrite: false,
    }),
  };
}

function buildStalker(m) {
  const g = new THREE.Group();
  const mist = new THREE.Mesh(new THREE.SphereGeometry(0.55, 8, 6), m.mist);
  mist.position.y = 0.35;
  mist.scale.set(1.2, 0.7, 1.1);
  g.add(mist);
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.42, 4, 8), m.hide);
  torso.position.set(0, 0.95, 0.05);
  torso.rotation.x = 0.55;
  torso.castShadow = true;
  g.add(torso);
  for (let i = 0; i < 3; i++) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.2 - i * 0.02, 0.022, 4, 10, Math.PI), m.bone);
    rib.position.set(0, 0.88 + i * 0.11, -0.04);
    rib.rotation.set(0.4, 0, Math.PI / 2);
    g.add(rib);
  }
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff2038 }));
  core.position.set(0, 1.0, -0.1);
  g.add(core);
  const headG = new THREE.Group();
  headG.position.set(0, 1.42, -0.32);
  headG.rotation.x = -0.35;
  g.add(headG);
  const skull = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.26, 4, 8), m.hide);
  skull.rotation.x = Math.PI / 2;
  headG.add(skull);
  const jaw = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.24, 5), m.bone);
  jaw.position.set(0, -0.1, -0.2);
  jaw.rotation.x = Math.PI / 2 + 0.3;
  headG.add(jaw);
  [[-1, 0.1], [1, 0.1]].forEach(([sx, y]) => {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.28, 5), m.bone);
    horn.position.set(sx * 0.13, y, 0.04);
    horn.rotation.z = sx * -0.55;
    horn.rotation.x = -0.4;
    headG.add(horn);
  });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), m.glow);
  eyeL.position.set(-0.09, 0.05, -0.16);
  headG.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.09;
  headG.add(eyeR);
  function makeArm(side) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.3, 1.05, 0.05);
    const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.4, 3, 5), m.hide);
    upper.rotation.z = side * 0.85;
    upper.rotation.x = 0.5;
    arm.add(upper);
    const claw = new THREE.Group();
    claw.position.set(side * 0.3, -0.26, -0.14);
    for (let i = -1; i <= 1; i++) {
      const talon = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.2, 4), m.glow);
      talon.position.set(i * 0.045, -0.07, -0.02);
      talon.rotation.x = 1.1;
      claw.add(talon);
    }
    arm.add(claw);
    g.add(arm);
    return arm;
  }
  const armL = makeArm(-1);
  const armR = makeArm(1);
  const hipL = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.22, 3, 5), m.hide);
  hipL.position.set(-0.16, 0.45, 0.18);
  hipL.rotation.x = 0.8;
  g.add(hipL);
  const hipR = hipL.clone();
  hipR.position.x = 0.16;
  g.add(hipR);
  const spine = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.5, 3, 5), m.bone);
  spine.position.set(0, 0.7, 0.32);
  spine.rotation.x = 1.1;
  g.add(spine);
  const aura = new THREE.Mesh(new THREE.SphereGeometry(0.8, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff1028, transparent: true, opacity: 0.06, depthWrite: false }));
  aura.position.y = 0.9;
  g.add(aura);
  return { g, armL, armR, head: headG, aura, mist, core, hitY: 1.0 };
}

function buildWraith(m) {
  const g = new THREE.Group();
  const mist = new THREE.Mesh(new THREE.SphereGeometry(0.7, 8, 8), m.mist);
  mist.position.y = 1.0;
  g.add(mist);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.7, 4, 8), m.hide);
  body.position.y = 1.15;
  body.castShadow = true;
  g.add(body);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff3048 }));
  core.position.y = 1.3;
  g.add(core);
  const headG = new THREE.Group();
  headG.position.y = 1.75;
  g.add(headG);
  headG.add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), m.hide));
  const veil = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.55), m.hide);
  veil.position.y = 0.05;
  headG.add(veil);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 6), m.glow);
  eye.position.set(0, 0.02, -0.18);
  headG.add(eye);
  function tendril(side, y) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.2, y, 0);
    const t = new THREE.Mesh(new THREE.CapsuleGeometry(0.04, 0.55, 3, 5), m.bone);
    t.rotation.z = side * 0.9;
    arm.add(t);
    g.add(arm);
    return arm;
  }
  const armL = tendril(-1, 1.25);
  const armR = tendril(1, 1.15);
  const aura = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff2040, transparent: true, opacity: 0.08, depthWrite: false }));
  aura.position.y = 1.2;
  g.add(aura);
  return { g, armL, armR, head: headG, aura, mist, core, hitY: 1.2 };
}

function buildCrawler(m) {
  const g = new THREE.Group();
  const mist = new THREE.Mesh(new THREE.SphereGeometry(0.45, 7, 5), m.mist);
  mist.position.y = 0.2;
  mist.scale.set(1.4, 0.5, 1.3);
  g.add(mist);
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.35, 4, 8), m.hide);
  body.position.set(0, 0.35, 0);
  body.rotation.z = Math.PI / 2;
  body.castShadow = true;
  g.add(body);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.1, 7, 7), new THREE.MeshBasicMaterial({ color: 0xff2038 }));
  core.position.set(0, 0.4, -0.05);
  g.add(core);
  const headG = new THREE.Group();
  headG.position.set(0, 0.45, -0.35);
  g.add(headG);
  headG.add(new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 7), m.hide));
  [[-1], [1]].forEach(([sx]) => {
    const fang = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.16, 4), m.glow);
    fang.position.set(sx * 0.07, -0.05, -0.14);
    fang.rotation.x = 1.2;
    headG.add(fang);
  });
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 5), m.glow);
  eyeL.position.set(-0.07, 0.06, -0.12);
  headG.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.07;
  headG.add(eyeR);
  const legs = [];
  for (let i = 0; i < 6; i++) {
    const side = i < 3 ? -1 : 1;
    const idx = i % 3;
    const leg = new THREE.Group();
    leg.position.set(side * 0.15, 0.25, -0.15 + idx * 0.18);
    const seg = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.32, 2, 4), m.bone);
    seg.rotation.z = side * 1.1;
    seg.rotation.x = 0.4;
    leg.add(seg);
    g.add(leg);
    legs.push(leg);
  }
  const armL = legs[0];
  const armR = legs[3];
  const aura = new THREE.Mesh(new THREE.SphereGeometry(0.6, 7, 7), new THREE.MeshBasicMaterial({ color: 0xff1028, transparent: true, opacity: 0.06, depthWrite: false }));
  aura.position.y = 0.35;
  g.add(aura);
  return { g, armL, armR, head: headG, aura, mist, core, legs, hitY: 0.4 };
}

function buildSentinel(m) {
  const g = new THREE.Group();
  const mist = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 0.8, 8, 1, true), m.mist);
  mist.position.y = 0.4;
  g.add(mist);
  const pillar = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 1.1, 4, 8), m.hide);
  pillar.position.y = 1.0;
  pillar.castShadow = true;
  g.add(pillar);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: 0xff2840 }));
  core.position.y = 1.35;
  g.add(core);
  const headG = new THREE.Group();
  headG.position.y = 1.85;
  g.add(headG);
  const mask = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), m.hide);
  mask.scale.set(1, 1.15, 0.85);
  headG.add(mask);
  const crest = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.35, 5), m.bone);
  crest.position.y = 0.28;
  headG.add(crest);
  const eye = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.11, 12), m.glow);
  eye.position.set(0, 0.02, -0.2);
  headG.add(eye);
  function arm(side) {
    const a = new THREE.Group();
    a.position.set(side * 0.28, 1.2, 0);
    const u = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.5, 3, 5), m.bone);
    u.rotation.z = side * 0.35;
    a.add(u);
    const blade = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.35, 4), m.glow);
    blade.position.set(side * 0.05, -0.4, -0.05);
    blade.rotation.x = 0.5;
    a.add(blade);
    g.add(a);
    return a;
  }
  const armL = arm(-1);
  const armR = arm(1);
  const aura = new THREE.Mesh(new THREE.SphereGeometry(0.75, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff1028, transparent: true, opacity: 0.07, depthWrite: false }));
  aura.position.y = 1.1;
  g.add(aura);
  return { g, armL, armR, head: headG, aura, mist, core, hitY: 1.2 };
}

const HAZARD_KINDS = ["stalker", "wraith", "crawler", "sentinel"];

function addHazard(x, y, z, r, kind) {
  const m = matsOblivion();
  if (!kind) {
    const pick = Math.abs(Math.floor(x * 7 + z * 3 + (r || 1) * 11)) % HAZARD_KINDS.length;
    kind = HAZARD_KINDS[pick];
  }
  let built;
  if (kind === "wraith") built = buildWraith(m);
  else if (kind === "crawler") built = buildCrawler(m);
  else if (kind === "sentinel") built = buildSentinel(m);
  else built = buildStalker(m);

  const yOff = kind === "wraith" ? -0.2 : kind === "crawler" ? -0.15 : kind === "sentinel" ? -0.5 : -0.7;
  built.g.position.set(x, y + yOff, z);
  scene.add(built.g);
  hazards.push({
    mesh: built.g,
    armL: built.armL,
    armR: built.armR,
    head: built.head,
    aura: built.aura,
    mist: built.mist,
    core: built.core,
    legs: built.legs || null,
    kind,
    hitY: built.hitY || 1.0,
    r: (r || 1.3) * (kind === "crawler" ? 0.95 : kind === "wraith" ? 1.05 : 1),
    base: new THREE.Vector3(x, y + yOff, z),
    phase: Math.random() * Math.PI * 2,
  });
}

function buildBeacon(x, y, z) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(
    new RoundedBoxGeometry(1.8, 0.4, 1.8, 2, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x2a3348, metalness: 0.4, roughness: 0.45 })
  ));
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.24, 3.0, 12),
    new THREE.MeshStandardMaterial({ color: 0x3a5060, metalness: 0.5, roughness: 0.35 })
  );
  pole.position.y = 1.7;
  pole.castShadow = true;
  g.add(pole);
  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.55, 24, 24),
    new THREE.MeshStandardMaterial({ color: 0x445566, emissive: 0x102030, emissiveIntensity: 0.25, roughness: 0.12, metalness: 0.25 })
  );
  orb.position.y = 3.5;
  g.add(orb);
  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(0.9, 0.045, 8, 28),
    new THREE.MeshStandardMaterial({ color: 0x223344, emissive: 0x000000 })
  );
  halo.rotation.x = Math.PI / 2;
  halo.position.y = 3.5;
  g.add(halo);
  g.position.set(x, y, z);
  scene.add(g);
  beacon = { mesh: g, orb, halo, pole, open: false, pos: new THREE.Vector3(x, y, z) };
  fill.position.set(x, y + 5, z);
  rim.position.set(x - 3, y + 2, z + 2);
}

function buildLevel(idx) {
  clearLevel();
  const L = LEVELS[idx];
  for (const p of L.plats) addPlatform(...p);
  dressTrapBranches();
  for (const s of L.shards) addShard(...s);
  for (const h of L.hazards) addHazard(...h);
  for (const b of (L.breaths || [])) addBreath(...b);
  buildBeacon(...L.beacon);
  for (let i = 0; i < 8; i++) {
    const chip = new THREE.Mesh(
      new THREE.BoxGeometry(0.5 + Math.random(), 0.16, 0.5 + Math.random()),
      new THREE.MeshStandardMaterial({ color: 0x1b2230, roughness: 1 })
    );
    chip.position.set((Math.random() - 0.5) * 24, -3 - Math.random() * 10, -Math.random() * 90);
    chip.rotation.set(Math.random(), Math.random(), Math.random());
    chip.castShadow = false;
    scene.add(chip);
    levelExtras.push(chip);
  }
  shardsMaxEl.textContent = String(L.shardsNeeded);
}

/* denser humanoid carrier */
const player = {
  pos: new THREE.Vector3(0, 1.2, 0),
  vel: new THREE.Vector3(),
  radius: 0.38,
  height: 1.65,
  onGround: false,
  yaw: 0,
  mesh: null,
  invuln: 0,
  animPhase: 0,
  wasGround: true,
};

function makePlayerMesh() {
  if (player.mesh) scene.remove(player.mesh);
  const root = new THREE.Group();
  const g = new THREE.Group(); // faces -Z
  root.add(g);

  // Memory-carrier: courier of Names — soft volumes, no embedded cones
  const cloth = new THREE.MeshStandardMaterial({
    color: 0x2e4058, roughness: 0.76, metalness: 0.08, envMapIntensity: 0.4,
  });
  const clothDark = new THREE.MeshStandardMaterial({
    color: 0x1a2433, roughness: 0.85, metalness: 0.05, envMapIntensity: 0.28,
  });
  const skin = new THREE.MeshStandardMaterial({ color: 0xc4a07a, roughness: 0.55, metalness: 0.02 });
  const leather = new THREE.MeshStandardMaterial({ color: 0x3d2a1c, roughness: 0.78, metalness: 0.1 });
  const memory = new THREE.MeshStandardMaterial({
    color: 0xffe099, emissive: 0xcc8800, emissiveIntensity: 1.25, roughness: 0.2, metalness: 0.5,
  });
  const rune = new THREE.MeshStandardMaterial({
    color: 0x7ad4ff, emissive: 0x1a80aa, emissiveIntensity: 1.0, roughness: 0.28, metalness: 0.35,
  });

  function mesh(geo, mat) {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }

  const hips = new THREE.Group();
  hips.position.set(0, 0.92, 0);
  g.add(hips);
  // subtle belt band instead of hip ball
  const hipBand = mesh(new THREE.TorusGeometry(0.14, 0.03, 6, 14), leather);
  hipBand.rotation.x = Math.PI / 2;
  hips.add(hipBand);

  function makeLeg(side) {
    const hip = new THREE.Group();
    hip.position.set(side * 0.11, -0.02, 0);
    hips.add(hip);
    const thigh = mesh(new THREE.CapsuleGeometry(0.072, 0.28, 4, 8), cloth);
    thigh.position.y = -0.2;
    hip.add(thigh);
    const knee = new THREE.Group();
    knee.position.y = -0.38;
    hip.add(knee);
    const shin = mesh(new THREE.CapsuleGeometry(0.062, 0.26, 4, 8), clothDark);
    shin.position.y = -0.18;
    knee.add(shin);
    const foot = mesh(new THREE.CapsuleGeometry(0.048, 0.13, 3, 6), leather);
    foot.rotation.x = Math.PI / 2;
    foot.position.set(0, -0.34, -0.04);
    knee.add(foot);
    return { hip, knee, thigh, shin, foot };
  }
  const legL = makeLeg(-1);
  const legR = makeLeg(1);

  const torso = new THREE.Group();
  torso.position.set(0, 0.08, 0);
  hips.add(torso);
  const body = mesh(new THREE.CapsuleGeometry(0.2, 0.36, 6, 10), cloth);
  body.position.y = 0.22;
  torso.add(body);
  // hood collar merges into torso (no floating shoulder orbs)
  const collar = mesh(new THREE.CapsuleGeometry(0.16, 0.08, 4, 8), clothDark);
  collar.position.y = 0.42;
  torso.add(collar);

  // Courier sash + memory beads (lore: carrying Names)
  const sash = mesh(new THREE.TorusGeometry(0.2, 0.028, 6, 16), leather);
  sash.rotation.x = Math.PI / 2;
  sash.rotation.z = 0.35;
  sash.position.y = 0.12;
  torso.add(sash);
  for (let i = 0; i < 3; i++) {
    const bead = mesh(new THREE.OctahedronGeometry(0.032, 0), memory);
    bead.position.set(-0.12 + i * 0.12, 0.14, -0.18);
    torso.add(bead);
  }

  // Courier cloak: single thin flap (no shoulder/back spheres)
  const cloak = mesh(new RoundedBoxGeometry(0.4, 0.72, 0.05, 2, 0.04), clothDark);
  cloak.position.set(0, -0.02, 0.2);
  cloak.rotation.x = 0.18;
  torso.add(cloak);
  const cloakTip = null;

  function makeArm(side) {
    const shoulder = new THREE.Group();
    shoulder.position.set(side * 0.24, 0.36, 0);
    torso.add(shoulder);
    // continuous sleeve from shoulder — no ball joint sphere
    const upper = mesh(new THREE.CapsuleGeometry(0.055, 0.24, 4, 8), cloth);
    upper.position.y = -0.14;
    shoulder.add(upper);
    const elbow = new THREE.Group();
    elbow.position.y = -0.28;
    shoulder.add(elbow);
    const fore = mesh(new THREE.CapsuleGeometry(0.045, 0.2, 4, 8), clothDark);
    fore.position.y = -0.14;
    elbow.add(fore);
    const hand = mesh(new THREE.SphereGeometry(0.052, 8, 6), skin);
    hand.position.y = -0.28;
    elbow.add(hand);
    return { shoulder, elbow };
  }
  const armL = makeArm(-1);
  const armR = makeArm(1);

  const neck = mesh(new THREE.CapsuleGeometry(0.05, 0.06, 3, 6), skin);
  neck.position.y = 0.48;
  torso.add(neck);

  const head = new THREE.Group();
  head.position.y = 0.62;
  torso.add(head);
  head.add(mesh(new THREE.SphereGeometry(0.15, 14, 12), skin));
  const hood = mesh(new THREE.SphereGeometry(0.19, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.58), clothDark);
  hood.position.set(0, 0.04, 0.02);
  hood.rotation.x = -0.15;
  head.add(hood);
  // Memory-sight brow (rune arc)
  const brow = mesh(new THREE.TorusGeometry(0.085, 0.016, 6, 12, Math.PI), rune);
  brow.position.set(0, 0.02, -0.125);
  brow.rotation.x = -0.2;
  head.add(brow);

  // Name-vessel cradle on chest (lore focus) — not a backpack brick
  const cradle = mesh(new THREE.TorusGeometry(0.09, 0.02, 6, 14), rune);
  cradle.position.set(0, 0.28, -0.16);
  cradle.rotation.x = Math.PI / 2;
  torso.add(cradle);
  const vessel = mesh(new THREE.OctahedronGeometry(0.085, 0), memory);
  vessel.position.set(0, 0.28, -0.16);
  torso.add(vessel);

  // Side scroll case — courier gear
  const scroll = mesh(new THREE.CapsuleGeometry(0.04, 0.22, 3, 6), leather);
  scroll.rotation.z = 0.4;
  scroll.position.set(0.22, 0.05, 0.05);
  torso.add(scroll);

  scene.add(root);
  player.mesh = root;
  player.rig = g;
  player.hips = hips;
  player.torso = torso;
  player.head = head;
  player.cloak = cloak;
  player.cloakTip = cloakTip;
  player.vessel = vessel;
  player.legL = legL;
  player.legR = legR;
  player.armL = armL;
  player.armR = armR;
}

function spawnDust(x, y, z) {
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 6, 6),
      new THREE.MeshStandardMaterial({ color: 0x8a9bb0, transparent: true, opacity: 0.7, roughness: 1 })
    );
    m.position.set(x, y, z);
    scene.add(m);
    dust.push({
      mesh: m,
      vx: (Math.random() - 0.5) * 2.4,
      vy: 0.9 + Math.random() * 1.5,
      vz: (Math.random() - 0.5) * 2.4,
      life: 0.5 + Math.random() * 0.25,
    });
  }
}
function updateDust(dt) {
  for (let i = dust.length - 1; i >= 0; i--) {
    const d = dust[i];
    d.life -= dt;
    d.vy -= 5 * dt;
    d.mesh.position.x += d.vx * dt;
    d.mesh.position.y += d.vy * dt;
    d.mesh.position.z += d.vz * dt;
    d.mesh.material.opacity = Math.max(0, d.life * 1.4);
    if (d.life <= 0) { scene.remove(d.mesh); dust.splice(i, 1); }
  }
}

/* state */
const keys = Object.create(null);
const look = { x: 0.35 };
let pointerLocked = false;
let ignoreEscUntil = 0;
let mode = "menu"; // menu | how | settings | play | pause | levelclear | win | over
let settingsFrom = "menu";
let levelIndex = 0;
let lives = START_LIVES;
let score = 0;
let shardsGot = 0;
let spawnPos = new THREE.Vector3(0, 1.2, 0);
const mobile = { active: false, x: 0, y: 0, jump: false };
let stickBase = null;
let resultAction = null;

function refreshObjective() {
  if (!beacon) { objectiveEl.textContent = "—"; return; }
  const need = LEVELS[levelIndex].shardsNeeded;
  objectiveEl.textContent = !beacon.open
    ? `${t("objCollect")} · ${shardsGot}/${need}`
    : t("objBeacon");
}
function refreshHud() {
  levelEl.textContent = String(levelIndex + 1);
  shardsEl.textContent = String(shardsGot);
  livesEl.textContent = String(lives);
  scoreEl.textContent = String(score);
  refreshObjective();
}

function resetCrumble() {
  for (const p of platforms) {
    if (!p.crumble) continue;
    p.gone = false; p.timer = 0;
    p.mesh.visible = true;
    p.mesh.position.y = p.baseY;
    p.mesh.position.x = (p.min.x + p.max.x) / 2;
    p.topMesh.material.transparent = false;
    p.topMesh.material.opacity = 1;
  }
}
function respawn() {
  player.pos.copy(spawnPos);
  player.vel.set(0, 0, 0);
  player.onGround = false;
  player.invuln = 1.05;
  resetCrumble();
}

function openBeacon() {
  if (!beacon || beacon.open) return;
  beacon.open = true;
  beacon.orb.material.color.setHex(0xb8f0ff);
  beacon.orb.material.emissive.setHex(0x5ec8ff);
  beacon.orb.material.emissiveIntensity = 1.6;
  beacon.pole.material.emissive.setHex(0x1a6a88);
  beacon.pole.material.emissiveIntensity = 0.75;
  beacon.halo.material.emissive.setHex(0x5ec8ff);
  beacon.halo.material.emissiveIntensity = 0.9;
  const bGlow = new THREE.PointLight(0x6ad0ff, 1.7, 15, 2);
  bGlow.position.set(0, 3.5, 0);
  beacon.mesh.add(bGlow);
  SFX.open();
  refreshObjective();
}

function goMenu() {
  mode = "menu";
  settingsFrom = "menu";
  document.exitPointerLock?.();
  setHudVisible(false);
  showPanel(panelMenu);
  syncPlayChrome();
  menuMeta.textContent = `${t("bestLabel")} ${bestScore || "—"}`;
  buildLevel(0);
  player.pos.set(0, 1.2, 0);
  player.yaw = 0.4;
  if (player.mesh) {
    player.mesh.position.copy(player.pos);
    player.mesh.rotation.y = player.yaw;
  }
  Music.menu();
}

function startCampaign() {
  try {
    ensureAudio();
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
    SFX.click();
    levelIndex = 0;
    lives = START_LIVES;
    adShownThisOver = false;
    reviveUsedThisOver = false;
    fallAdTick = 0;
    clearPathHintLife();
    score = 0;
    startLevel();
  } catch (err) {
    console.error("startCampaign failed", err);
    alert("Не удалось начать игру: " + (err && err.message ? err.message : err));
  }
}

function startLevel() {
  shardsGot = 0;
  buildLevel(levelIndex);
  spawnPos.set(0, 1.2, 0);
  player.yaw = 0;
  respawn();
  mode = "play";
  hideAllPanels();
  setHudVisible(true);
  refreshHud();
  syncPlayChrome();
  Music.forLevel(levelIndex);
  if (!isTouchUI()) {
    try { viewport.requestPointerLock(); } catch (_) {}
  }
}

function setPaused(on) {
  if (on) {
    if (mode !== "play") return;
    mode = "pause";
    document.exitPointerLock?.();
    SFX.pause();
    Music.duck(true);
    document.getElementById("pause-sub").textContent =
      `${LEVEL_NAMES[lang][levelIndex]}. ${t("pauseSub")}`;
    showPanel(panelPause);
    syncPlayChrome();
  } else {
    if (mode !== "pause") return;
    mode = "play";
    hideAllPanels();
    Music.duck(false);
    syncPlayChrome();
    if (!isTouchUI()) {
      try { viewport.requestPointerLock(); } catch (_) {}
    }
  }
}

function showResult(title, text, primaryLabel, primaryFn, showMenuBtn) {
  mode = primaryFn === "next" ? "levelclear" : primaryFn === "win" ? "win" : "over";
  document.exitPointerLock?.();
  resultTitle.textContent = title;
  resultText.textContent = text;
  btnResultMain.textContent = primaryLabel;
  resultAction = primaryFn;
  btnResultMenu.classList.toggle("hidden", !showMenuBtn);
  const hintBtn = document.getElementById("btn-result-hint");
  if (hintBtn) hintBtn.classList.toggle("hidden", primaryFn !== "retry");
  const reviveBtn = document.getElementById("btn-result-revive");
  if (reviveBtn) {
    const canRevive = primaryFn === "retry" && mode === "over" && title === t("gameOver");
    reviveBtn.classList.toggle("hidden", !canRevive);
    reviveUsedThisOver = false;
  }
  showPanel(panelResult);
  syncPlayChrome();
  if (primaryFn === "retry" && title === t("gameOver")) showGameOverAd();
}

function loseLife(reasonFall) {
  if (mode !== "play") return;
  if (player.invuln > 0 && !reasonFall) return;
  // Path hint lasts for one life only
  clearPathHintLife();
  lives -= 1;
  refreshHud();
  if (reasonFall) SFX.fall(); else SFX.hurt();
  if (lives <= 0) {
    SFX.over();
    showResult(t("gameOver"), `${t("gameOverText")} ${score}` + (bestScore ? ` · best ${bestScore}` : ""), t("retry"), "retry", true);
    return;
  }
  respawn();
  if (reasonFall) maybeFallAd();
}

function levelCleared() {
  if (mode !== "play") return;
  const bonus = 600 + lives * 120 + LEVELS[levelIndex].shardsNeeded * 60;
  score += bonus;
  refreshHud();
  SFX.win();
  const name = LEVEL_NAMES[lang][levelIndex];
  if (levelIndex >= LEVELS.length - 1) {
    if (score > bestScore) {
      bestScore = score;
      try { localStorage.setItem(STORAGE_BEST, String(bestScore)); } catch (_) {}
    }
    showResult(t("campaignWin"), `${t("campaignWinText")} ${score} · best ${bestScore}`, t("playAgain"), "retry", true);
  } else {
    showResult(t("levelClear"), `${name}. +${bonus} · ${t("score")}: ${score}`, t("nextLevel"), "next", true);
    maybeLevelClearAd();
  }
}

/* collision */
function collideWorld(dt) {
  player.onGround = false;
  const r = player.radius;
  const feet = player.pos.y;
  const prevFeet = feet - player.vel.y * dt;
  const fallSpan = Math.max(0.5, Math.abs(player.vel.y) * dt + 0.4);
  for (const p of platforms) {
    if (p.gone) continue;
    const top = p.max.y - (p.crumble && p.timer > 0 ? p.timer * 0.12 : 0);
    const nx = Math.max(p.min.x, Math.min(player.pos.x, p.max.x));
    const nz = Math.max(p.min.z, Math.min(player.pos.z, p.max.z));
    const dx = player.pos.x - nx, dz = player.pos.z - nz;
    if (dx * dx + dz * dz > r * r) continue;
    const comingDown = player.vel.y <= 0.05;
    const crossedTop = prevFeet >= top - 0.02 && feet <= top + 0.3;
    const nearTop = feet <= top + 0.3 && feet >= top - fallSpan;
    if (comingDown && (crossedTop || nearTop)) {
      player.pos.y = top;
      player.vel.y = 0;
      if (!player.onGround) SFX.land();
      player.onGround = true;
      if (p.checkpoint) {
        const sp = new THREE.Vector3((p.min.x + p.max.x) / 2, top + 0.05, (p.min.z + p.max.z) / 2);
        if (sp.distanceToSquared(spawnPos) > 0.25) spawnPos.copy(sp);
      }
      if (p.crumble) {
        p.timer += dt;
        p.topMesh.material.transparent = true;
        p.topMesh.material.opacity = Math.max(0.35, 1 - p.timer / 0.9);
        p.mesh.position.x = (p.min.x + p.max.x) / 2 + Math.sin(p.timer * 40) * 0.03 * Math.min(1, p.timer);
        if (p.timer > 0.9) {
          p.gone = true;
          p.mesh.visible = false;
          SFX.crumble();
          player.onGround = false;
          player.vel.y = -1;
        }
      }
      continue;
    }
    const bottom = p.min.y;
    const head = player.pos.y + player.height;
    if (head > bottom + 0.05 && feet < top - 0.05) {
      const left = player.pos.x - (p.min.x - r);
      const right = (p.max.x + r) - player.pos.x;
      const near = player.pos.z - (p.min.z - r);
      const far = (p.max.z + r) - player.pos.z;
      const m = Math.min(left, right, near, far);
      if (m === left) { player.pos.x = p.min.x - r; player.vel.x = Math.min(0, player.vel.x); }
      else if (m === right) { player.pos.x = p.max.x + r; player.vel.x = Math.max(0, player.vel.x); }
      else if (m === near) { player.pos.z = p.min.z - r; player.vel.z = Math.min(0, player.vel.z); }
      else { player.pos.z = p.max.z + r; player.vel.z = Math.max(0, player.vel.z); }
    }
  }
}

function updatePlayer(dt) {
  if (player.invuln > 0) player.invuln -= dt;
  const speed = 7.2;
  const forward = new THREE.Vector3(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
  const right = new THREE.Vector3(Math.cos(player.yaw), 0, -Math.sin(player.yaw));
  let ix = 0, iz = 0;
  if (keys.KeyW || keys.ArrowUp) iz -= 1;
  if (keys.KeyS || keys.ArrowDown) iz += 1;
  if (keys.KeyA || keys.ArrowLeft) ix -= 1;
  if (keys.KeyD || keys.ArrowRight) ix += 1;
  if (mobile.active) { ix += mobile.x; iz += mobile.y; }
  const wish = forward.multiplyScalar(-iz).add(right.multiplyScalar(ix));
  if (wish.lengthSq() > 1) wish.normalize();
  player.vel.x = wish.x * speed;
  player.vel.z = wish.z * speed;
  player.vel.y -= 22 * dt;
  if ((keys.Space || mobile.jump) && player.onGround) {
    player.vel.y = 9.2;
    player.onGround = false;
    mobile.jump = false;
    SFX.jump();
  }
  player.pos.x += player.vel.x * dt;
  player.pos.z += player.vel.z * dt;
  player.pos.y += player.vel.y * dt;
  collideWorld(dt);
  if (player.pos.y < -14) loseLife(true);

  for (const s of shards) {
    if (s.taken) continue;
    s.crystal.rotation.y += dt * 2.2;
    s.ring.rotation.z += dt * 1.1;
    s.mesh.position.y = s.baseY + Math.sin(performance.now() * 0.005) * 0.14;
    if (player.pos.distanceTo(s.mesh.position) < 1.2) {
      s.taken = true; s.mesh.visible = false;
      if (s.decoy) {
        score += 40;
        SFX.shard();
        refreshHud();
      } else {
        shardsGot += 1; score += 120;
        SFX.shard(); refreshHud();
        if (shardsGot >= LEVELS[levelIndex].shardsNeeded) openBeacon();
      }
    }
  }
  for (const b of breaths) {
    if (b.taken) continue;
    b.vial.rotation.y += dt * 1.8;
    b.mesh.position.y = b.baseY + Math.sin(performance.now() * 0.004) * 0.1;
    if (player.pos.distanceTo(b.mesh.position) < 1.15) {
      b.taken = true;
      b.mesh.visible = false;
      if (lives < MAX_LIVES) {
        lives += 1;
        refreshHud();
        SFX.open();
      } else {
        score += 80;
        refreshHud();
        SFX.shard();
      }
    }
  }
  if (pathHintActive) {
    if (pathHints.length === 0) rebuildPathHints();
    else if (Math.floor(performance.now() / 1200) !== Math.floor((performance.now() - dt * 1000) / 1200)) rebuildPathHints();
  } else if (pathHints.length) {
    clearPathHints();
  }
  for (const h of hazards) {
    const kind = h.kind || "stalker";
    if (kind === "wraith") {
      h.phase += dt * 0.95;
      h.mesh.position.x = h.base.x + Math.sin(h.phase * 0.7) * 1.8;
      h.mesh.position.y = h.base.y + 0.55 + Math.sin(h.phase * 1.4) * 0.45;
      h.mesh.position.z = h.base.z + Math.cos(h.phase * 0.55) * 1.1;
    } else if (kind === "crawler") {
      h.phase += dt * 2.1;
      h.mesh.position.x = h.base.x + Math.sin(h.phase) * 2.2;
      h.mesh.position.y = h.base.y + Math.abs(Math.sin(h.phase * 2)) * 0.08;
      h.mesh.position.z = h.base.z + Math.sin(h.phase * 2) * 0.9;
      if (h.legs) {
        h.legs.forEach((leg, i) => {
          leg.rotation.x = Math.sin(h.phase * 3 + i) * 0.5;
        });
      }
    } else if (kind === "sentinel") {
      h.phase += dt * 0.7;
      h.mesh.position.x = h.base.x + Math.sin(h.phase * 0.35) * 0.35;
      h.mesh.position.y = h.base.y + Math.sin(h.phase) * 0.08;
      h.mesh.position.z = h.base.z + Math.cos(h.phase * 0.35) * 0.35;
      h.mesh.rotation.y += dt * 0.9;
    } else {
      h.phase += dt * 1.35;
      h.mesh.position.x = h.base.x + Math.sin(h.phase) * 1.35 + Math.sin(h.phase * 0.4) * 0.2;
      h.mesh.position.y = h.base.y + Math.sin(h.phase * 1.7) * 0.2;
      h.mesh.position.z = h.base.z + Math.cos(h.phase * 0.55) * 0.25;
    }
    if (kind !== "sentinel") {
      const dx = player.pos.x - h.mesh.position.x;
      const dz = player.pos.z - h.mesh.position.z;
      h.mesh.rotation.y = Math.atan2(-dx, -dz);
    }
    if (h.armL) h.armL.rotation.x = Math.sin(h.phase * 2.2) * (kind === "wraith" ? 0.7 : 0.45);
    if (h.armR) h.armR.rotation.x = Math.sin(h.phase * 2.2 + 1.2) * (kind === "wraith" ? 0.7 : 0.45);
    if (h.mist) h.mist.rotation.y = -Math.sin(h.phase * 0.7) * 0.12;
    if (h.aura) h.aura.scale.setScalar(1 + Math.sin(h.phase * 3) * 0.1);
    if (h.core) h.core.scale.setScalar(1 + Math.sin(h.phase * 4) * 0.15);
    const hx = h.mesh.position.x;
    const hy = h.mesh.position.y + (h.hitY || 1.0);
    const hz = h.mesh.position.z;
    const pdx = player.pos.x - hx;
    const pdy = (player.pos.y + 0.9) - hy;
    const pdz = player.pos.z - hz;
    if (player.invuln <= 0 && pdx * pdx + pdy * pdy + pdz * pdz < h.r * h.r) loseLife(false);
  }
  if (beacon && beacon.open && player.pos.distanceTo(beacon.pos) < 2.2) levelCleared();

  player.mesh.position.copy(player.pos);
  player.mesh.rotation.y = player.yaw;

  const spd = Math.hypot(player.vel.x, player.vel.z);
  const moving = player.onGround && spd > 0.35;
  if (moving) player.animPhase += dt * (11 + spd * 0.6);
  else if (!player.onGround) player.animPhase += dt * 5;
  else player.animPhase += dt * 1.4;

  const swing = Math.sin(player.animPhase);
  const swing2 = Math.sin(player.animPhase + Math.PI);
  const runAmp = moving ? 1 : (!player.onGround ? 0.65 : 0.15);

  // Jointed run: hip/knee pivots
  if (player.legL && player.legR) {
    player.legL.hip.rotation.x = swing * 0.9 * runAmp;
    player.legR.hip.rotation.x = swing2 * 0.9 * runAmp;
    player.legL.knee.rotation.x = Math.max(0.05, -swing) * 1.1 * runAmp + (!player.onGround ? 0.45 : 0.1);
    player.legR.knee.rotation.x = Math.max(0.05, -swing2) * 1.1 * runAmp + (!player.onGround ? 0.4 : 0.1);
  }
  if (player.armL && player.armR) {
    player.armL.shoulder.rotation.x = swing2 * 0.85 * runAmp + (!player.onGround ? -0.55 : 0);
    player.armR.shoulder.rotation.x = swing * 0.85 * runAmp + (!player.onGround ? -0.45 : 0);
    player.armL.elbow.rotation.x = 0.35 + Math.max(0, swing2) * 0.55 * runAmp;
    player.armR.elbow.rotation.x = 0.35 + Math.max(0, swing) * 0.55 * runAmp;
  }
  if (player.torso) {
    player.torso.rotation.x = moving ? -0.2 : (!player.onGround ? -0.1 : -0.05);
    player.torso.rotation.y = swing * 0.1 * runAmp;
  }
  if (player.hips) player.hips.rotation.y = swing2 * 0.07 * runAmp;
  if (player.head) {
    player.head.rotation.x = moving ? 0.06 : (!player.onGround ? -0.12 : 0);
    player.head.rotation.y = -swing * 0.06 * runAmp;
  }
  if (player.cloak) {
    const flap = moving ? 0.3 + Math.abs(swing) * 0.22 : 0.08;
    player.cloak.rotation.x = THREE.MathUtils.lerp(player.cloak.rotation.x || 0, flap, 0.18);
    player.cloak.rotation.z = swing * 0.1 * runAmp;
    if (player.cloakTip) {
      player.cloakTip.rotation.x = player.cloak.rotation.x * 0.5;
      player.cloakTip.rotation.z = -player.cloak.rotation.z;
    }
  }
  if (player.vessel) player.vessel.rotation.y += dt * (moving ? 3.5 : 1.3);

  if (player.onGround && !player.wasGround) spawnDust(player.pos.x, player.pos.y + 0.05, player.pos.z);
  player.wasGround = player.onGround;

  if (player.onGround && moving) {
    player.mesh.position.y += Math.abs(Math.sin(player.animPhase)) * 0.05;
  } else if (player.onGround) {
    player.mesh.position.y += Math.sin(performance.now() * 0.003) * 0.01;
  }
  player.mesh.visible = player.invuln <= 0 || Math.floor(performance.now() / 80) % 2 === 0;
}

function updateCamera(dt) {
  const dist = 5.6, height = 2.25;
  const ox = Math.sin(player.yaw) * Math.cos(look.x) * dist;
  const oy = Math.sin(look.x) * dist + height;
  const oz = Math.cos(player.yaw) * Math.cos(look.x) * dist;
  const desired = new THREE.Vector3(player.pos.x + ox, player.pos.y + oy, player.pos.z + oz);
  camera.position.lerp(desired, mode === "menu" ? 0.04 : 0.14);
  camera.lookAt(player.pos.x, player.pos.y + 1.15, player.pos.z);
  if (mode === "menu") {
    player.yaw += dt * 0.15;
    if (player.mesh) {
      player.mesh.position.copy(player.pos);
      player.mesh.rotation.y = player.yaw;
      if (player.vessel) player.vessel.rotation.y += dt * 1.2;
    }
  }
}

function resize() {
  const w = viewport.clientWidth;
  const h = Math.max(340, viewport.clientHeight);
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);

function tick() {
  const dt = Math.min(0.033, clock.getDelta());
  if (mode === "play" && !adBreak) updatePlayer(dt);
  updateDust(dt);
  if (player.mesh) updateCamera(dt);
  if (beacon) {
    beacon.mesh.rotation.y += dt * (beacon.open ? 1.25 : 0.3);
    if (beacon.open) {
      beacon.orb.position.y = 3.5 + Math.sin(performance.now() * 0.005) * 0.16;
      beacon.halo.rotation.z += dt * 1.4;
    } else {
      beacon.orb.material.emissiveIntensity = 0.2 + Math.sin(performance.now() * 0.004) * 0.08;
    }
  }
  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}

/* input */
window.addEventListener("keydown", (e) => {
  keys[e.code] = true;
  if (e.code === "Space") e.preventDefault();
  if (e.code === "Escape") {
    e.preventDefault();
    if (mode === "pause") {
      if (performance.now() < ignoreEscUntil) return;
      setPaused(false);
    } else if (mode === "play") setPaused(true);
    else if (mode === "how" || mode === "settings") {
      if (settingsFrom === "pause" && mode === "settings") {
        mode = "pause"; showPanel(panelPause);
      } else goMenu();
    }
  }
});
window.addEventListener("keyup", (e) => { keys[e.code] = false; });
document.addEventListener("pointerlockchange", () => {
  pointerLocked = document.pointerLockElement === viewport || document.pointerLockElement === renderer.domElement;
  if (!pointerLocked && mode === "play" && !isTouchUI()) {
    ignoreEscUntil = performance.now() + 350;
    setPaused(true);
  }
});
viewport.addEventListener("mousemove", (e) => {
  if (!pointerLocked || mode !== "play") return;
  const s = sens * 0.00025;
  player.yaw -= (invertX ? -1 : 1) * e.movementX * s;
  look.x += (invertY ? 1 : -1) * e.movementY * s;
  look.x = Math.max(-0.05, Math.min(1.15, look.x));
});

/* menu buttons */
document.getElementById("btn-play").onclick = () => startCampaign();
document.getElementById("btn-how").onclick = () => { SFX.click(); mode = "how"; settingsFrom = "menu"; showPanel(panelHow); syncPlayChrome(); };
document.getElementById("btn-settings").onclick = () => { SFX.click(); mode = "settings"; settingsFrom = "menu"; showPanel(panelSettings); syncPlayChrome(); };
document.getElementById("btn-how-back").onclick = () => { SFX.click(); goMenu(); };
document.getElementById("btn-set-back").onclick = () => {
  SFX.click();
  if (settingsFrom === "pause") { mode = "pause"; showPanel(panelPause); syncPlayChrome(); }
  else goMenu();
};
document.getElementById("btn-resume").onclick = () => setPaused(false);
document.getElementById("btn-pause-settings").onclick = () => {
  SFX.click(); mode = "settings"; settingsFrom = "pause"; showPanel(panelSettings); syncPlayChrome();
};
const btnMobPause = document.getElementById("btn-mob-pause");
if (btnMobPause) {
  btnMobPause.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (mode === "play") setPaused(true);
  });
}
document.getElementById("btn-to-menu").onclick = () => { SFX.click(); goMenu(); };
document.getElementById("btn-path-hint").onclick = () => {
  SFX.click();
  requestPathHintAd();
};
const btnResultHint = document.getElementById("btn-result-hint");
if (btnResultHint) {
  btnResultHint.onclick = () => {
    SFX.click();
    requestPathHintAd();
  };
}
const btnResultRevive = document.getElementById("btn-result-revive");
if (btnResultRevive) {
  btnResultRevive.onclick = () => {
    SFX.click();
    requestReviveAd();
  };
}
btnResultMain.onclick = () => {
  SFX.click();
  if (resultAction === "next") { levelIndex += 1; startLevel(); }
  else if (resultAction === "retry") startCampaign();
  else goMenu();
};
btnResultMenu.onclick = () => { SFX.click(); goMenu(); };

setMute.onclick = () => {
  muted = !muted;
  try { localStorage.setItem(STORAGE_MUTE, muted ? "1" : "0"); } catch (_) {}
  applyI18n();
};
if (setMusic) {
  setMusic.onclick = () => {
    musicOn = !musicOn;
    try { localStorage.setItem(STORAGE_MUSIC, musicOn ? "1" : "0"); } catch (_) {}
    if (!musicOn) Music.stop();
    else {
      ensureAudio();
      Music.ensurePlaying();
    }
    applyI18n();
  };
}
if (setMusicVol) {
  setMusicVol.oninput = () => {
    musicVol = parseInt(setMusicVol.value, 10) || 0;
    try { localStorage.setItem(STORAGE_MUSIC_VOL, String(musicVol)); } catch (_) {}
    Music.applyVolume();
    if (musicOn && musicVol > 0 && Music.audio.paused && mode === "play") Music.ensurePlaying();
    if (musicVol <= 0) Music.stop();
  };
}
setInvertY.onclick = () => {
  invertY = !invertY;
  try { localStorage.setItem(STORAGE_INVERT_Y, invertY ? "1" : "0"); } catch (_) {}
  applyI18n();
};
if (setInvertX) {
  setInvertX.onclick = () => {
    invertX = !invertX;
    try { localStorage.setItem(STORAGE_INVERT_X, invertX ? "1" : "0"); } catch (_) {}
    applyI18n();
  };
}
setSens.oninput = () => {
  sens = parseInt(setSens.value, 10) || 10;
  try { localStorage.setItem(STORAGE_SENS, String(sens)); } catch (_) {}
};

langRu.onclick = () => { lang = "ru"; try { localStorage.setItem(STORAGE_LANG, lang); } catch (_) {} applyI18n(); };
langEn.onclick = () => { lang = "en"; try { localStorage.setItem(STORAGE_LANG, lang); } catch (_) {} applyI18n(); };

(function setupMobile() {
  const stickZone = document.createElement("div");
  stickZone.className = "mob-ctrl";
  stickZone.style.cssText =
    "position:absolute;left:0;bottom:0;width:46%;height:46%;touch-action:none;pointer-events:auto;z-index:3;" +
    "padding-bottom:env(safe-area-inset-bottom);";
  const stickRing = document.createElement("div");
  stickRing.style.cssText =
    "position:absolute;left:1.1rem;bottom:1.3rem;width:96px;height:96px;border-radius:50%;" +
    "border:1px solid rgba(255,255,255,.18);background:rgba(0,0,0,.22);pointer-events:none;";
  const stickKnob = document.createElement("div");
  stickKnob.style.cssText =
    "position:absolute;left:50%;top:50%;width:40px;height:40px;margin:-20px 0 0 -20px;border-radius:50%;" +
    "background:rgba(106,208,255,.45);border:1px solid rgba(255,255,255,.25);pointer-events:none;";
  stickRing.appendChild(stickKnob);
  stickZone.appendChild(stickRing);

  const lookZone = document.createElement("div");
  lookZone.className = "mob-ctrl";
  lookZone.style.cssText =
    "position:absolute;right:0;top:0;width:58%;height:100%;touch-action:none;pointer-events:auto;z-index:2;";

  const jumpBtn = document.createElement("button");
  jumpBtn.type = "button";
  jumpBtn.className = "mob-ctrl";
  jumpBtn.textContent = "⤒";
  jumpBtn.setAttribute("aria-label", "Jump");
  jumpBtn.style.cssText =
    "position:absolute;right:max(0.9rem, env(safe-area-inset-right));" +
    "bottom:max(1.1rem, calc(env(safe-area-inset-bottom) + 0.6rem));" +
    "width:68px;height:68px;border-radius:50%;border:1px solid rgba(255,255,255,.22);" +
    "background:rgba(0,0,0,.4);color:#fff;font-size:1.45rem;pointer-events:auto;z-index:4;padding:0;";

  viewport.appendChild(lookZone);
  viewport.appendChild(stickZone);
  viewport.appendChild(jumpBtn);

  let lookDragging = false;
  let lookLast = null;

  stickZone.addEventListener("pointerdown", (e) => {
    if (mode !== "play") return;
    e.preventDefault();
    mobile.active = true;
    stickBase = { x: e.clientX, y: e.clientY };
    stickZone.setPointerCapture(e.pointerId);
  });
  stickZone.addEventListener("pointermove", (e) => {
    if (!mobile.active || !stickBase) return;
    const dx = e.clientX - stickBase.x;
    const dy = e.clientY - stickBase.y;
    mobile.x = Math.max(-1, Math.min(1, dx / 52));
    mobile.y = Math.max(-1, Math.min(1, dy / 52));
    stickKnob.style.transform =
      `translate(${mobile.x * 22}px, ${mobile.y * 22}px)`;
  });
  const endStick = () => {
    mobile.active = false;
    mobile.x = 0;
    mobile.y = 0;
    stickBase = null;
    stickKnob.style.transform = "translate(0,0)";
  };
  stickZone.addEventListener("pointerup", endStick);
  stickZone.addEventListener("pointercancel", endStick);

  lookZone.addEventListener("pointerdown", (e) => {
    if (mode !== "play") return;
    if (e.target === jumpBtn || jumpBtn.contains(e.target)) return;
    e.preventDefault();
    lookDragging = true;
    lookLast = { x: e.clientX, y: e.clientY };
    lookZone.setPointerCapture(e.pointerId);
  });
  lookZone.addEventListener("pointermove", (e) => {
    if (!lookDragging || !lookLast || mode !== "play") return;
    const dx = e.clientX - lookLast.x;
    const dy = e.clientY - lookLast.y;
    lookLast = { x: e.clientX, y: e.clientY };
    const s = sens * 0.0038;
    player.yaw -= (invertX ? -1 : 1) * dx * s;
    look.x += (invertY ? 1 : -1) * dy * s;
    look.x = Math.max(-0.05, Math.min(1.15, look.x));
  });
  const endLook = () => { lookDragging = false; lookLast = null; };
  lookZone.addEventListener("pointerup", endLook);
  lookZone.addEventListener("pointercancel", endLook);

  jumpBtn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (mode === "play") mobile.jump = true;
  });
})();

applyI18n();
makePlayerMesh();
goMenu();
resize();
requestAnimationFrame(tick);
