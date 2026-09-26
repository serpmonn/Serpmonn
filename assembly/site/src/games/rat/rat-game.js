// rat-game.js — Fat Rat: themes, stages, combo, fleeing food, cat, sound, leaderboard
(function () {
  'use strict';

  const canvas = document.getElementById('c');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const overlaySub = document.getElementById('overlaySub');
  const fatBar = document.getElementById('fatBar');
  const fatStageEl = document.getElementById('fatStage');
  const canvasWrap = document.getElementById('canvasWrap');
  const comboBadge = document.getElementById('comboBadge');
  const weightEl = document.getElementById('weight');
  const toastEl = document.getElementById('toast');
  const hintEl = document.getElementById('hint');
  const startBtn = document.getElementById('startBtn');
  const shareBtn = document.getElementById('shareBtn');
  const btnPause = document.getElementById('btnPause');
  const btnSound = document.getElementById('btnSound');
  const btnChangeNick = document.getElementById('btnChangeNick');
  const btnLeaderboard = document.getElementById('btnLeaderboard');
  const nicknameForm = document.getElementById('nicknameForm');
  const nicknameInput = document.getElementById('nickname');
  const nickValueEl = document.getElementById('nickValue');
  const btnSkipNick = document.getElementById('btnSkipNick');

  const W = canvas.width;
  const H = canvas.height;
  const CELL = 28;
  const COLS = Math.floor(W / CELL);
  const ROWS = Math.floor(H / CELL);
  const MAX_FAT = 60;
  const COMBO_WINDOW = 2.5;
  const GAME_ID = 'rat';
  const ADD_SCORE_URL = '/add-score';
  const BANNED_WORDS_URL = '/proxy/bannedWords';
  const NICK_KEY = 'rat_nickname_v1';
  const BEST_KEY = 'rat_best_weight_v1';
  const SOUND_KEY = 'rat_sound_v1';
  const FLEE_HINT_KEY = 'rat_flee_hint_v1';

  function t(key, fallback) {
    return (window.i18n && window.i18n[key]) || fallback;
  }

  function introHtml() {
    return (
      t('overlayLine1', '') +
      '<br>' +
      t('overlayLine2', '') +
      '<br><span style="color:var(--bonus-color)">' +
      t('bonusFoodLabel', '') +
      '</span>' +
      t('overlayLine3', '') +
      '<br>' +
      t('overlayGoal', '')
    );
  }

  const PALETTE = {
    dark: {
      canvasBg: '#0e0f11',
      wall: '#23262f',
      wallEdge: 'rgba(255,255,255,0.04)',
      food: '#ff6b35',
      bonus: '#a78bfa',
      ear: '#e8c0a0',
      eye: '#1a0505',
      tail: '#a07050',
      shadow: 'rgba(0,0,0,0.25)',
      nearWall: 'rgba(255,107,53,0.22)',
      cat: '#6b7280',
      catEye: '#fbbf24',
    },
    light: {
      canvasBg: '#ebe6dc',
      wall: '#3a3630',
      wallEdge: 'rgba(255,255,255,0.14)',
      food: '#ff6b35',
      bonus: '#7c5cbf',
      ear: '#e8c0a0',
      eye: '#1a0505',
      tail: '#8a5a3a',
      shadow: 'rgba(28,26,22,0.18)',
      nearWall: 'rgba(255,107,53,0.28)',
      cat: '#4b5563',
      catEye: '#d97706',
    },
  };

  let themeKey = 'dark';
  let colors = PALETTE.dark;
  let soundEnabled = localStorage.getItem(SOUND_KEY) !== '0';
  let audioCtx = null;
  let bannedWords = [];
  let nickname = (localStorage.getItem(NICK_KEY) || '').trim().slice(0, 40);
  let nickResolved = false;
  let pendingStart = null;
  let scoreSubmitted = false;
  let endReason = null;
  let paused = false;
  let fleeHintShown = localStorage.getItem(FLEE_HINT_KEY) === '1';
  let toastTimer = 0;

  let rat, food, bonusFood, cat, walls, eaten, weight, best, gameRunning, animFrame;
  let ratAdShownThisRound = false;
  let combo = 0;
  let comboMult = 1;
  let lastEatAt = 0;
  let eatsUntilFlee = 4 + Math.floor(Math.random() * 3);
  let nearMissCooldown = 0;
  let catStepTimer = 0;
  let path = [];
  let clickTarget = null;
  let stepTimer = 0;
  let bonusTimer = 0;
  let bonusSpawnTimer = 0;
  let lastTime = 0;

  best = parseFloat(localStorage.getItem(BEST_KEY) || '0') || 0;

  function resolveThemeKey() {
    const attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'light' || attr === 'dark') return attr;
    try {
      const stored = localStorage.getItem('spn_theme');
      if (stored === 'light' || stored === 'dark') return stored;
    } catch (_) {}
    return 'dark';
  }

  function applyCanvasTheme() {
    themeKey = resolveThemeKey();
    colors = PALETTE[themeKey] || PALETTE.dark;
    if (walls) render();
  }

  function ensureAudio() {
    if (!soundEnabled) return null;
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return audioCtx;
  }

  function beep(freq, dur, type, gain) {
    const ctxA = ensureAudio();
    if (!ctxA) return;
    const now = ctxA.currentTime;
    const osc = ctxA.createOscillator();
    const g = ctxA.createGain();
    osc.type = type || 'square';
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain || 0.04, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.connect(g);
    g.connect(ctxA.destination);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  function sfxEat() {
    beep(520 + combo * 40, 0.08, 'square', 0.05);
    if (comboMult >= 2) beep(780, 0.06, 'triangle', 0.03);
  }

  function sfxNear() {
    beep(220, 0.1, 'sawtooth', 0.045);
  }

  function sfxTooFat() {
    beep(360, 0.12, 'triangle', 0.05);
    setTimeout(() => beep(520, 0.14, 'triangle', 0.045), 90);
    setTimeout(() => beep(700, 0.18, 'sine', 0.04), 180);
  }

  function sfxCat() {
    beep(160, 0.16, 'sawtooth', 0.06);
    setTimeout(() => beep(90, 0.22, 'sawtooth', 0.05), 70);
  }

  function haptic(ms) {
    try {
      if (navigator.vibrate) navigator.vibrate(ms);
    } catch (_) {}
  }

  function showToast(text, ms) {
    if (!toastEl) return;
    toastEl.textContent = text;
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('on'), ms || 1800);
  }

  function updateSoundBtn() {
    if (!btnSound) return;
    btnSound.textContent = soundEnabled ? t('soundOn', 'Sound: on') : t('soundOff', 'Sound: off');
    btnSound.setAttribute('aria-pressed', soundEnabled ? 'true' : 'false');
  }

  function updateNickDisplay() {
    if (nickValueEl) nickValueEl.textContent = nickname || '—';
    if (btnChangeNick) {
      btnChangeNick.textContent = nickname ? t('changeNick', 'Change nick') : t('setNick', 'Set nick');
    }
  }

  function updatePauseBtn() {
    if (!btnPause) return;
    btnPause.textContent = paused ? t('resumeBtn', 'Resume') : t('pauseBtn', 'Pause');
    btnPause.hidden = !gameRunning;
  }

  function generateMaze() {
    const mc = Math.floor(COLS / 2);
    const mr = Math.floor(ROWS / 2);
    const visited = Array.from({ length: mr }, () => new Array(mc).fill(false));
    const wallGrid = Array.from({ length: mr }, () =>
      Array.from({ length: mc }, () => ({ N: true, E: true, S: true, W: true }))
    );

    function carve(cx, cy) {
      visited[cy][cx] = true;
      const dirs = [
        { dx: 1, dy: 0, d: 'E', od: 'W' },
        { dx: -1, dy: 0, d: 'W', od: 'E' },
        { dx: 0, dy: 1, d: 'S', od: 'N' },
        { dx: 0, dy: -1, d: 'N', od: 'S' },
      ].sort(() => Math.random() - 0.5);
      for (const { dx, dy, d, od } of dirs) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx >= 0 && nx < mc && ny >= 0 && ny < mr && !visited[ny][nx]) {
          wallGrid[cy][cx][d] = false;
          wallGrid[ny][nx][od] = false;
          carve(nx, ny);
        }
      }
    }
    carve(0, 0);

    const ws = new Set();
    for (let row = 0; row < mr; row++) {
      for (let col = 0; col < mc; col++) {
        const px = col * 2;
        const py = row * 2;
        if (wallGrid[row][col].E && col < mc - 1) ws.add(`${px + 1},${py}`);
        if (wallGrid[row][col].S && row < mr - 1) ws.add(`${px},${py + 1}`);
      }
    }
    const wallSet = new Set();
    for (let c = 0; c < COLS; c++) {
      wallSet.add(`${c},0`);
      wallSet.add(`${c},${ROWS - 1}`);
    }
    for (let r = 0; r < ROWS; r++) {
      wallSet.add(`0,${r}`);
      wallSet.add(`${COLS - 1},${r}`);
    }
    for (const key of ws) {
      const [x, y] = key.split(',').map(Number);
      wallSet.add(`${x + 1},${y + 1}`);
    }
    return wallSet;
  }

  function isWall(x, y) {
    return walls.has(`${x},${y}`);
  }

  function freeCells() {
    const free = [];
    for (let x = 1; x < COLS - 1; x++) {
      for (let y = 1; y < ROWS - 1; y++) {
        if (!isWall(x, y) && !(rat && rat.x === x && rat.y === y) && !(cat && cat.x === x && cat.y === y)) {
          free.push({ x, y });
        }
      }
    }
    return free;
  }

  function randomFree() {
    const f = freeCells();
    if (!f.length) return null;
    return f[Math.floor(Math.random() * f.length)];
  }

  function bfs(start, target) {
    const queue = [start];
    const visited = new Map();
    visited.set(`${start.x},${start.y}`, null);
    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ];
    while (queue.length) {
      const cur = queue.shift();
      if (cur.x === target.x && cur.y === target.y) {
        const out = [];
        let node = `${target.x},${target.y}`;
        while (visited.get(node)) {
          out.unshift(node);
          node = visited.get(node);
        }
        return out.map((k) => {
          const [x, y] = k.split(',').map(Number);
          return { x, y };
        });
      }
      for (const d of dirs) {
        const nx = cur.x + d.x;
        const ny = cur.y + d.y;
        const key = `${nx},${ny}`;
        if (!isWall(nx, ny) && !visited.has(key)) {
          visited.set(key, `${cur.x},${cur.y}`);
          queue.push({ x: nx, y: ny });
        }
      }
    }
    return [];
  }

  function fatStageName() {
    const ratio = Math.min(weight / MAX_FAT, 1);
    if (ratio >= 0.66) return t('stageStuck', 'Stuck');
    if (ratio >= 0.33) return t('stageChonk', 'Chonk');
    return t('stageSlim', 'Slim');
  }

  function openNeighbors(x, y) {
    return [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ].filter((d) => !isWall(x + d.x, y + d.y));
  }

  function inTightCorridor(x, y) {
    return openNeighbors(x, y).length <= 2;
  }

  function triggerNearMiss() {
    if (nearMissCooldown > 0) return;
    nearMissCooldown = 0.9;
    canvasWrap.classList.remove('shake', 'near-flash');
    void canvasWrap.offsetWidth;
    canvasWrap.classList.add('shake', 'near-flash');
    sfxNear();
    haptic(30);
    setTimeout(() => canvasWrap.classList.remove('shake', 'near-flash'), 300);
  }

  function spawnCatIfNeeded() {
    if (cat || weight / MAX_FAT < 0.33) return;
    const free = freeCells().filter((c) => Math.abs(c.x - rat.x) + Math.abs(c.y - rat.y) >= 6);
    const pick = free.length ? free[Math.floor(Math.random() * free.length)] : randomFree();
    if (!pick) return;
    cat = { x: pick.x, y: pick.y, drawX: pick.x * CELL, drawY: pick.y * CELL, path: [] };
  }

  function moveCat() {
    if (!cat || !rat) return;
    if (!cat.path.length) cat.path = bfs({ x: cat.x, y: cat.y }, { x: rat.x, y: rat.y });
    if (!cat.path.length) {
      const opens = openNeighbors(cat.x, cat.y);
      if (!opens.length) return;
      const n = opens[Math.floor(Math.random() * opens.length)];
      cat.x += n.x;
      cat.y += n.y;
    } else {
      const next = cat.path.shift();
      cat.x = next.x;
      cat.y = next.y;
    }
    if (cat.x === rat.x && cat.y === rat.y) endGame('cat');
  }

  function drawWalls() {
    for (let x = 0; x < COLS; x++) {
      for (let y = 0; y < ROWS; y++) {
        if (!isWall(x, y)) continue;
        ctx.fillStyle = colors.wall;
        ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
        ctx.fillStyle = colors.wallEdge;
        ctx.fillRect(x * CELL, y * CELL, CELL, 2);
      }
    }
  }

  function drawNearWallGlow() {
    if (!rat || weight / MAX_FAT < 0.55) return;
    ctx.fillStyle = colors.nearWall;
    for (const d of [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 },
    ]) {
      const nx = rat.x + d.x;
      const ny = rat.y + d.y;
      if (isWall(nx, ny)) ctx.fillRect(nx * CELL, ny * CELL, CELL, CELL);
    }
  }

  function drawFood(f, isBonus) {
    if (!f) return;
    const cx = f.x * CELL + CELL / 2;
    const cy = f.y * CELL + CELL / 2;
    const r = isBonus ? CELL / 2 - 4 : CELL / 2 - 5;
    const col = isBonus ? colors.bonus : colors.food;
    ctx.shadowColor = col;
    ctx.shadowBlur = isBonus ? 14 : 10;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (f.flee && !isBonus) {
      ctx.strokeStyle = col;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawCat() {
    if (!cat) return;
    const cx = cat.drawX + CELL / 2;
    const cy = cat.drawY + CELL / 2;
    const r = CELL / 2 - 4;
    ctx.fillStyle = colors.shadow;
    ctx.beginPath();
    ctx.ellipse(cx, cy + r * 0.7, r * 0.85, r * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = colors.cat;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.55, cy - r * 0.55);
    ctx.lineTo(cx - r * 0.2, cy - r * 1.15);
    ctx.lineTo(cx, cy - r * 0.45);
    ctx.moveTo(cx + r * 0.55, cy - r * 0.55);
    ctx.lineTo(cx + r * 0.2, cy - r * 1.15);
    ctx.lineTo(cx, cy - r * 0.45);
    ctx.fill();
    ctx.fillStyle = colors.catEye;
    ctx.beginPath();
    ctx.arc(cx - r * 0.25, cy - r * 0.1, 2, 0, Math.PI * 2);
    ctx.arc(cx + r * 0.25, cy - r * 0.1, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawRat() {
    if (!rat) return;
    const fatT = Math.min(weight / MAX_FAT, 1);
    const baseR = CELL / 2 - 3;
    const bodyR = baseR + fatT * baseR * 1.8;
    const cx = rat.drawX + CELL / 2;
    const cy = rat.drawY + CELL / 2;

    ctx.fillStyle = colors.shadow;
    ctx.beginPath();
    ctx.ellipse(cx, cy + bodyR * 0.5 + 3, bodyR * 0.9, bodyR * 0.25, 0, 0, Math.PI * 2);
    ctx.fill();

    const fatColor =
      fatT < 0.5
        ? lerpColor('#c8a882', '#e8a050', fatT * 2)
        : lerpColor('#e8a050', '#ff7030', (fatT - 0.5) * 2);
    ctx.shadowColor = fatT > 0.7 ? '#ff6020' : 'transparent';
    ctx.shadowBlur = fatT > 0.7 ? 18 : 0;
    ctx.fillStyle = fatColor;
    ctx.beginPath();
    ctx.ellipse(cx, cy, bodyR, bodyR * 0.85, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    const headR = baseR * 0.65 + fatT * baseR * 0.4;
    const headOff = bodyR * 0.7;
    const hx = cx + (rat.dirX || 1) * headOff;
    const hy = cy + (rat.dirY || 0) * headOff * 0.7;
    ctx.fillStyle = fatColor;
    ctx.beginPath();
    ctx.ellipse(hx, hy, headR, headR * 0.9, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.ear;
    ctx.beginPath();
    ctx.ellipse(hx - (rat.dirX || 1) * headR * 0.3, hy - headR * 0.7, headR * 0.4, headR * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors.eye;
    ctx.beginPath();
    ctx.arc(hx + (rat.dirX || 1) * headR * 0.2, hy - headR * 0.15, Math.max(1.5, headR * 0.2), 0, Math.PI * 2);
    ctx.fill();

    const tx = cx - (rat.dirX || 1) * bodyR;
    ctx.strokeStyle = colors.tail;
    ctx.lineWidth = Math.max(1, 2 - fatT);
    ctx.beginPath();
    ctx.moveTo(tx, cy);
    ctx.quadraticCurveTo(tx - (rat.dirX || 1) * 12, cy + 10, tx - (rat.dirX || 1) * 20, cy + 5);
    ctx.stroke();

    if (fatT > 0.33) {
      const rings = Math.floor(1 + fatT * 3);
      ctx.strokeStyle = `rgba(255,160,60,${0.12 + fatT * 0.22})`;
      ctx.lineWidth = 1.5;
      for (let i = 1; i <= rings; i++) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, bodyR * (0.5 + i * 0.2), bodyR * (0.4 + i * 0.15), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  function lerpColor(a, b, ratio) {
    const ah = parseInt(a.slice(1), 16);
    const bh = parseInt(b.slice(1), 16);
    const ar = (ah >> 16) & 0xff;
    const ag = (ah >> 8) & 0xff;
    const ab = ah & 0xff;
    const br = (bh >> 16) & 0xff;
    const bg = (bh >> 8) & 0xff;
    const bb = bh & 0xff;
    const r = Math.round(ar + (br - ar) * ratio);
    const g = Math.round(ag + (bg - ag) * ratio);
    const bl = Math.round(ab + (bb - ab) * ratio);
    return `rgb(${r},${g},${bl})`;
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = colors.canvasBg;
    ctx.fillRect(0, 0, W, H);
    drawWalls();
    drawNearWallGlow();
    drawFood(food, false);
    drawFood(bonusFood, true);
    drawCat();
    drawRat();
  }

  function maybeFleeFood() {
    if (!food || !food.flee || food.fled) return;
    const dist = Math.abs(food.x - rat.x) + Math.abs(food.y - rat.y);
    if (dist > 2) return;
    const away = [
      { x: food.x + Math.sign(food.x - rat.x || 1), y: food.y },
      { x: food.x, y: food.y + Math.sign(food.y - rat.y || 1) },
      { x: food.x + 1, y: food.y },
      { x: food.x - 1, y: food.y },
      { x: food.x, y: food.y + 1 },
      { x: food.x, y: food.y - 1 },
    ];
    for (const n of away) {
      if (!isWall(n.x, n.y) && !(n.x === rat.x && n.y === rat.y) && !(cat && n.x === cat.x && n.y === cat.y)) {
        food.x = n.x;
        food.y = n.y;
        food.fled = true;
        path = [];
        if (!fleeHintShown) {
          fleeHintShown = true;
          try {
            localStorage.setItem(FLEE_HINT_KEY, '1');
          } catch (_) {}
          showToast(t('fleeHint', 'Food is fleeing — catch it!'));
        }
        return;
      }
    }
    food.fled = true;
  }

  function registerEat(baseGain) {
    const now = performance.now() / 1000;
    if (lastEatAt && now - lastEatAt <= COMBO_WINDOW) combo += 1;
    else combo = 1;
    lastEatAt = now;
    comboMult = Math.min(3, combo);
    weight = Math.round((weight + baseGain * comboMult) * 10) / 10;
    if (weight > best) {
      best = weight;
      try {
        localStorage.setItem(BEST_KEY, String(best));
      } catch (_) {}
    }
    flashCombo();
    sfxEat();
    spawnCatIfNeeded();
  }

  function flashCombo() {
    if (comboMult <= 1) {
      comboBadge.classList.remove('on');
      return;
    }
    comboBadge.textContent = t('comboLabel', 'Combo') + ' ×' + comboMult;
    comboBadge.classList.add('on');
    weightEl.classList.remove('combo-flash');
    void weightEl.offsetWidth;
    weightEl.classList.add('combo-flash');
  }

  function spawnNextFood() {
    eatsUntilFlee -= 1;
    const cell = randomFree();
    if (!cell) return null;
    const flee = eatsUntilFlee <= 0;
    if (flee) eatsUntilFlee = 4 + Math.floor(Math.random() * 3);
    return { x: cell.x, y: cell.y, flee, fled: false };
  }

  function getSpeed() {
    const fatT = Math.min(weight / MAX_FAT, 1);
    return Math.max(1.2, 6 - fatT * 4.8);
  }

  function getCatSpeed() {
    const fatT = Math.min(weight / MAX_FAT, 1);
    return 1.4 + fatT * 1.4;
  }

  function gameLoop(ts) {
    const dt = Math.min((ts - lastTime) / 1000, 0.1);
    lastTime = ts;
    if (!gameRunning) return;
    if (paused) {
      render();
      animFrame = requestAnimationFrame(gameLoop);
      return;
    }

    if (nearMissCooldown > 0) nearMissCooldown -= dt;
    if (lastEatAt && performance.now() / 1000 - lastEatAt > COMBO_WINDOW && combo > 0) {
      combo = 0;
      comboMult = 1;
      comboBadge.classList.remove('on');
    }

    const targetX = rat.x * CELL;
    const targetY = rat.y * CELL;
    rat.drawX += (targetX - rat.drawX) * Math.min(1, dt * 14);
    rat.drawY += (targetY - rat.drawY) * Math.min(1, dt * 14);
    if (cat) {
      cat.drawX += (cat.x * CELL - cat.drawX) * Math.min(1, dt * 12);
      cat.drawY += (cat.y * CELL - cat.drawY) * Math.min(1, dt * 12);
    }

    stepTimer += dt;
    const stepInterval = 1 / getSpeed();
    if (stepTimer >= stepInterval) {
      stepTimer -= stepInterval;
      const target = clickTarget || food;
      if (
        !path.length ||
        (clickTarget &&
          (path[path.length - 1].x !== clickTarget.x || path[path.length - 1].y !== clickTarget.y))
      ) {
        path = bfs({ x: rat.x, y: rat.y }, target);
      }
      if (path.length) {
        const next = path.shift();
        rat.dirX = next.x - rat.x;
        rat.dirY = next.y - rat.y;
        rat.x = next.x;
        rat.y = next.y;
        if (weight / MAX_FAT >= 0.55 && inTightCorridor(rat.x, rat.y)) triggerNearMiss();
        if (cat && cat.x === rat.x && cat.y === rat.y) {
          endGame('cat');
          return;
        }
      }
      maybeFleeFood();

      if (food && rat.x === food.x && rat.y === food.y) {
        eaten++;
        registerEat(0.3 + Math.random() * 0.2);
        food = spawnNextFood();
        path = [];
        clickTarget = null;
        spawnBonusChance();
        updateUI();
        if (weight >= MAX_FAT) {
          endGame('fat');
          return;
        }
      }
      if (bonusFood && rat.x === bonusFood.x && rat.y === bonusFood.y) {
        eaten += 3;
        registerEat(1.2 + Math.random() * 0.5);
        bonusFood = null;
        bonusTimer = 0;
        path = [];
        clickTarget = null;
        updateUI();
        if (weight >= MAX_FAT) {
          endGame('fat');
          return;
        }
      }
    }

    if (cat) {
      catStepTimer += dt;
      const catInterval = 1 / getCatSpeed();
      if (catStepTimer >= catInterval) {
        catStepTimer -= catInterval;
        moveCat();
        if (!gameRunning) return;
      }
    }

    if (bonusFood) {
      bonusTimer += dt;
      if (bonusTimer > 8) {
        bonusFood = null;
        bonusTimer = 0;
      }
    }
    bonusSpawnTimer += dt;
    if (bonusSpawnTimer > 15) {
      bonusSpawnTimer = 0;
      spawnBonus();
    }

    render();
    animFrame = requestAnimationFrame(gameLoop);
  }

  function spawnBonusChance() {
    if (!bonusFood && Math.random() < 0.18) spawnBonus();
  }

  function spawnBonus() {
    const cell = randomFree();
    if (!cell) return;
    bonusFood = { x: cell.x, y: cell.y };
    bonusTimer = 0;
  }

  function updateUI() {
    document.getElementById('eaten').textContent = String(eaten);
    weightEl.textContent = weight.toFixed(1);
    document.getElementById('best').textContent = best.toFixed(1);
    fatBar.style.width = Math.min(weight / MAX_FAT, 1) * 100 + '%';
    fatStageEl.textContent = fatStageName();
  }

  function scorePoints() {
    return Math.max(0, Math.round(weight * 10));
  }

  function submitScore() {
    if (scoreSubmitted || scorePoints() <= 0 || !nickname) return Promise.resolve();
    scoreSubmitted = true;
    return fetch(ADD_SCORE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname, score: scorePoints(), gameId: GAME_ID }),
    }).catch(() => {});
  }

  function init() {
    walls = generateMaze();
    rat = {
      x: Math.floor(COLS / 2),
      y: Math.floor(ROWS / 2),
      drawX: 0,
      drawY: 0,
      dirX: 1,
      dirY: 0,
    };
    if (isWall(rat.x, rat.y)) {
      const f = freeCells();
      const c = f[Math.floor(f.length / 2)];
      rat.x = c.x;
      rat.y = c.y;
    }
    rat.drawX = rat.x * CELL;
    rat.drawY = rat.y * CELL;
    eatsUntilFlee = 4 + Math.floor(Math.random() * 3);
    food = spawnNextFood();
    bonusFood = null;
    cat = null;
    bonusTimer = 0;
    bonusSpawnTimer = 0;
    catStepTimer = 0;
    eaten = 0;
    weight = 0.1;
    combo = 0;
    comboMult = 1;
    lastEatAt = 0;
    nearMissCooldown = 0;
    path = [];
    clickTarget = null;
    stepTimer = 0;
    scoreSubmitted = false;
    endReason = null;
    paused = false;
    comboBadge.classList.remove('on');
    if (shareBtn) shareBtn.hidden = true;
    if (hintEl) hintEl.textContent = t('hintDefault', '');
    updateUI();
    updatePauseBtn();
  }

  function endGame(reason) {
    if (!gameRunning && endReason) return;
    gameRunning = false;
    paused = false;
    endReason = reason || 'fat';
    cancelAnimationFrame(animFrame);
    updatePauseBtn();

    const title =
      endReason === 'cat'
        ? t('catCaughtTitle', 'CAUGHT BY CAT')
        : t('tooFatTitle', t('gameOverTitle', 'TOO FAT'));
    overlay.querySelector('.overlay-title').textContent = title;
    overlaySub.innerHTML = eaten + ' · ' + weight.toFixed(1) + ' ' + t('weightLabel', '');
    overlay.classList.remove('hidden');
    if (shareBtn) shareBtn.hidden = false;
    // keep existing start label

    if (endReason === 'cat') sfxCat();
    else sfxTooFat();
    haptic(endReason === 'cat' ? [40, 40, 60] : 50);

    submitScore();

    if (!ratAdShownThisRound && window.showFullScreenAd) {
      ratAdShownThisRound = true;
      setTimeout(() => {
        try {
          window.showFullScreenAd();
        } catch (_) {}
      }, 1000);
    }
  }

  function beginPlay() {
    init();
    overlay.classList.add('hidden');
    if (overlaySub) overlaySub.innerHTML = introHtml();
    ratAdShownThisRound = false;
    gameRunning = true;
    paused = false;
    lastTime = performance.now();
    cancelAnimationFrame(animFrame);
    animFrame = requestAnimationFrame(gameLoop);
    updatePauseBtn();
    ensureAudio();
  }

  function requireNicknameThen(fn) {
    if (!nicknameForm) {
      fn();
      return;
    }
    if (!nickResolved) {
      pendingStart = fn;
      showNickForm();
      return;
    }
    hideNickForm();
    fn();
  }

  function showNickForm() {
    if (!nicknameForm) return;
    nicknameForm.hidden = false;
    if (nicknameInput && nickname) nicknameInput.value = nickname;
  }

  function hideNickForm() {
    if (nicknameForm) nicknameForm.hidden = true;
    updateNickDisplay();
  }

  function setNickname(name) {
    nickname = String(name || '')
      .trim()
      .slice(0, 40);
    if (!nickname) return false;
    const lower = nickname.toLowerCase();
    if (bannedWords.some((w) => w && lower.includes(String(w).toLowerCase()))) {
      alert(t('bannedNicknameAlert', 'This nickname is not allowed'));
      return false;
    }
    localStorage.setItem(NICK_KEY, nickname);
    updateNickDisplay();
    return true;
  }

  function clearNickname() {
    nickname = '';
    try {
      localStorage.removeItem(NICK_KEY);
    } catch (_) {}
    if (nicknameInput) nicknameInput.value = '';
    updateNickDisplay();
  }

  function finishNickChoice() {
    nickResolved = true;
    hideNickForm();
    const fn = pendingStart;
    pendingStart = null;
    if (fn) fn();
  }

  function togglePause() {
    if (!gameRunning) return;
    paused = !paused;
    updatePauseBtn();
    if (hintEl) {
      hintEl.textContent = paused ? t('pausedHint', 'Paused') : t('hintDefault', '');
    }
    if (!paused) {
      lastTime = performance.now();
    }
  }

  async function shareResult() {
    const url = location.href.split('#')[0];
    const text = t('shareText', 'Fat Rat: {weight} kg, eaten {eaten}. {url}')
      .replace('{weight}', weight.toFixed(1))
      .replace('{eaten}', String(eaten))
      .replace('{url}', url);
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Fat Rat — Serpmonn', text, url });
        return;
      }
    } catch (_) {}
    try {
      await navigator.clipboard.writeText(text);
      showToast(t('shareCopied', 'Copied'));
    } catch (_) {
      showToast(text.slice(0, 48) + '…', 2400);
    }
  }

  function pointerCell(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const cellW = rect.width / COLS;
    const cellH = rect.height / ROWS;
    return {
      x: Math.floor((clientX - rect.left) / cellW),
      y: Math.floor((clientY - rect.top) / cellH),
    };
  }

  canvas.addEventListener('click', (e) => {
    if (!gameRunning || paused) return;
    const { x: mx, y: my } = pointerCell(e.clientX, e.clientY);
    if (!isWall(mx, my)) clickTarget = { x: mx, y: my };
  });
  canvas.addEventListener(
    'touchend',
    (e) => {
      if (!gameRunning || paused) return;
      e.preventDefault();
      const touch = e.changedTouches[0];
      const { x: mx, y: my } = pointerCell(touch.clientX, touch.clientY);
      if (!isWall(mx, my)) clickTarget = { x: mx, y: my };
    },
    { passive: false }
  );

  startBtn.addEventListener('click', () => requireNicknameThen(beginPlay));
  if (shareBtn) shareBtn.addEventListener('click', shareResult);
  if (btnPause) btnPause.addEventListener('click', togglePause);
  if (btnSound) {
    btnSound.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      localStorage.setItem(SOUND_KEY, soundEnabled ? '1' : '0');
      updateSoundBtn();
      if (soundEnabled) {
        ensureAudio();
        beep(440, 0.05, 'sine', 0.04);
      }
    });
  }
  if (btnLeaderboard) {
    btnLeaderboard.addEventListener('click', () => {
      location.href = t('scoreTableUrl', '/frontend/games/redsquare2/score_table.html#rat');
    });
  }
  if (btnChangeNick) {
    btnChangeNick.addEventListener('click', () => {
      nickResolved = false;
      pendingStart = null;
      showNickForm();
    });
  }
  if (nicknameForm) {
    nicknameForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!setNickname(nicknameInput ? nicknameInput.value : '')) return;
      finishNickChoice();
    });
  }
  if (btnSkipNick) {
    btnSkipNick.addEventListener('click', () => {
      clearNickname();
      finishNickChoice();
    });
  }

  window.addEventListener('keydown', (e) => {
    if (nicknameForm && !nicknameForm.hidden) return;
    if (e.code === 'Space' || e.key === 'Escape' || e.key === 'Enter') {
      if (gameRunning) {
        e.preventDefault();
        togglePause();
      }
    }
  });

  window.addEventListener('spn-theme-changed', applyCanvasTheme);
  window.addEventListener('storage', (e) => {
    if (e.key === 'spn_theme') applyCanvasTheme();
  });

  fetch(BANNED_WORDS_URL)
    .then((r) => r.json())
    .then((data) => {
      if (Array.isArray(data)) {
        bannedWords = data.map((item) => (item && item.word) || item).filter(Boolean);
      }
    })
    .catch(() => {});

  applyCanvasTheme();
  updateSoundBtn();
  updateNickDisplay();
  updatePauseBtn();
  if (overlaySub) overlaySub.innerHTML = introHtml();
  init();
  render();

  window.__rec = {
    beginPlay,
    endGame,
    getState() {
      return {
        running: !!gameRunning,
        paused: !!paused,
        weight,
        eaten,
        best,
        fatT: Math.min(weight / MAX_FAT, 1),
        stage: fatStageName(),
        rat: rat ? { x: rat.x, y: rat.y } : null,
        food: food ? { x: food.x, y: food.y, flee: !!food.flee } : null,
        bonus: bonusFood ? { x: bonusFood.x, y: bonusFood.y } : null,
        cat: cat ? { x: cat.x, y: cat.y } : null,
        cols: COLS,
        rows: ROWS,
        endReason,
      };
    },
    setWeight(v) {
      weight = Math.max(0.1, Math.min(MAX_FAT, Number(v) || 0.1));
      if (weight > best) best = weight;
      spawnCatIfNeeded();
      updateUI();
    },
    clickCell(x, y) {
      if (!gameRunning || paused) return false;
      if (isWall(x, y)) return false;
      clickTarget = { x: x | 0, y: y | 0 };
      path = [];
      return true;
    },
    goFood() {
      if (!food) return false;
      return window.__rec.clickCell(food.x, food.y);
    },
    forceFleeFood() {
      const cell = randomFree();
      if (!cell) return false;
      food = { x: cell.x, y: cell.y, flee: true, fled: false };
      eatsUntilFlee = 4;
      path = [];
      return true;
    },
    spawnCatNow() {
      if (weight / MAX_FAT < 0.33) weight = MAX_FAT * 0.34;
      cat = null;
      spawnCatIfNeeded();
      updateUI();
      return !!cat;
    },
    nudgeCatAway() {
      if (!cat || !rat) return false;
      const free = freeCells().filter((c) => Math.abs(c.x - rat.x) + Math.abs(c.y - rat.y) >= 9);
      const pick = free.length ? free[Math.floor(Math.random() * free.length)] : randomFree();
      if (!pick) return false;
      cat.x = pick.x;
      cat.y = pick.y;
      cat.drawX = pick.x * CELL;
      cat.drawY = pick.y * CELL;
      cat.path = [];
      return true;
    },
    flashNearMiss() {
      triggerNearMiss();
      return true;
    },
    hideChrome() {
      document.querySelectorAll(
        '.ad-top-banner, #menuContainer, .toolbar, #nicknameForm, .hint, .mobile-anchor-ad'
      ).forEach((el) => {
        el.style.display = 'none';
      });
      if (overlay) overlay.classList.add('hidden');
    },
  };

  try {
    if (/[?&]rec=1(?:&|$)/.test(location.search)) {
      nickResolved = true;
      hideNickForm();
      soundEnabled = false;
      updateSoundBtn();
      beginPlay();
      const w = Number(new URLSearchParams(location.search).get('w') || 28);
      if (Number.isFinite(w) && w > 0) window.__rec.setWeight(w);
      window.__rec.hideChrome();
    }
  } catch (_) {}
})();
