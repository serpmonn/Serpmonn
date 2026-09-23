// snake.js — Serpmonn: classic + walls/portals, brand colors, sound, leaderboard
(function () {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const CELL_SIZE = 20;
  const GRID_SIZE = 24;
  canvas.width = canvas.height = GRID_SIZE * CELL_SIZE;

  const GAME_ID = 'snake';
  const ADD_SCORE_URL = '/add-score';
  const BANNED_WORDS_URL = '/proxy/bannedWords';
  const NICK_KEY = 'snake_nickname_v1';
  const BEST_KEY = 'snake_best_score_v1';
  const MODE_KEY = 'snake_mode_v1';
  const SOUND_KEY = 'snake_sound_v1';

  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const speedEl = document.getElementById('speed');
  const comboEl = document.getElementById('combo');
  const btnStart = document.getElementById('btnStart');
  const btnPause = document.getElementById('btnPause');
  const btnReset = document.getElementById('btnReset');
  const btnLeaderboard = document.getElementById('btnLeaderboard');
  const btnChangeNick = document.getElementById('btnChangeNick');
  const btnSound = document.getElementById('btnSound');
  const modeSelect = document.getElementById('modeSelect');
  const nicknameForm = document.getElementById('nicknameForm');
  const nicknameInput = document.getElementById('nickname');
  const nickValueEl = document.getElementById('nickValue');
  const shakeLayer = document.getElementById('shakeLayer') || canvas.parentElement;

  let best = parseInt(localStorage.getItem(BEST_KEY) || '0', 10);
  bestEl.textContent = String(best);

  let nickname = (localStorage.getItem(NICK_KEY) || '').trim().slice(0, 40);
  let nickResolved = false;
  let pendingStart = null;
  let soundEnabled = localStorage.getItem(SOUND_KEY) !== '0';
  let mode = localStorage.getItem(MODE_KEY) || 'classic';
  if (!['classic', 'walls', 'portals'].includes(mode)) mode = 'classic';
  if (modeSelect) modeSelect.value = mode;

  let snake, dir, nextDir, food, score, tickMs, rafId, lastTick, paused, alive, adShownThisRound;
  let combo, comboFlash, portals, shakeUntil, trail, scoreSubmitted;
  let audioCtx = null;
  let bannedWords = [];

  function t(key, fallback) {
    return (window.i18n && window.i18n[key]) || fallback;
  }

  function cssVar(name, fallback) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
  }

  function scoreTableUrl() {
    return (window.i18n && window.i18n.scoreTableUrl) || '/frontend/games/redsquare2/score_table.html';
  }

  function updateNickDisplay() {
    if (nickValueEl) nickValueEl.textContent = nickname || '—';
  }

  function updateSoundBtn() {
    if (!btnSound) return;
    btnSound.textContent = soundEnabled ? t('soundOn', 'Звук: вкл') : t('soundOff', 'Звук: выкл');
    btnSound.setAttribute('aria-pressed', soundEnabled ? 'true' : 'false');
  }

  function updateComboDisplay() {
    if (!comboEl) return;
    comboEl.textContent = combo > 1 ? `×${combo}` : '—';
    comboEl.classList.toggle('combo-hot', combo >= 3);
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
    if (combo >= 3) beep(780, 0.06, 'triangle', 0.03);
  }

  function sfxDeath() {
    beep(180, 0.18, 'sawtooth', 0.06);
    setTimeout(() => beep(90, 0.22, 'sawtooth', 0.05), 80);
  }

  function sfxPortal() {
    beep(660, 0.05, 'sine', 0.04);
    beep(880, 0.07, 'sine', 0.03);
  }

  function haptic(ms) {
    try {
      if (navigator.vibrate) navigator.vibrate(ms);
    } catch (_) {}
  }

  function occupied(x, y) {
    if (snake.some((s) => s.x === x && s.y === y)) return true;
    if (food && food.x === x && food.y === y) return true;
    if (portals) {
      for (const p of portals) {
        if ((p.a.x === x && p.a.y === y) || (p.b.x === x && p.b.y === y)) return true;
      }
    }
    return false;
  }

  function randomEmptyCell() {
    for (let i = 0; i < 400; i++) {
      const pos = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      if (!occupied(pos.x, pos.y)) return pos;
    }
    return { x: 0, y: 0 };
  }

  function spawnFood() {
    return randomEmptyCell();
  }

  function spawnPortals() {
    if (mode !== 'portals') {
      portals = null;
      return;
    }
    const colors = ['#dc3545', '#6c757d'];
    portals = colors.map((color) => ({
      a: randomEmptyCell(),
      b: randomEmptyCell(),
      color,
    }));
  }

  function portalExit(x, y) {
    if (!portals) return null;
    for (const p of portals) {
      if (p.a.x === x && p.a.y === y) return { x: p.b.x, y: p.b.y };
      if (p.b.x === x && p.b.y === y) return { x: p.a.x, y: p.a.y };
    }
    return null;
  }

  function reset() {
    snake = [
      { x: 12, y: 12 },
      { x: 11, y: 12 },
      { x: 10, y: 12 },
    ];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    portals = null;
    spawnPortals();
    food = spawnFood();
    score = 0;
    combo = 1;
    comboFlash = 0;
    trail = [];
    shakeUntil = 0;
    scoreSubmitted = false;
    scoreEl.textContent = '0';
    tickMs = 140;
    updateSpeedDisplay();
    updateComboDisplay();
    paused = true;
    alive = true;
    adShownThisRound = false;
    stopGameLoop();
    draw();
  }

  function beginPlay() {
    ensureAudio();
    reset();
    paused = false;
    startGameLoop();
    focusPlayfield();
  }

  /** Смена режима: новое поле, без автостарта */
  function applyModeIdle() {
    reset();
    paused = true;
    stopGameLoop();
    draw();
  }

  function updateSpeedDisplay() {
    const multiplier = (160 - tickMs) / 20 + 1;
    speedEl.textContent = Math.max(1, Math.round(multiplier)) + 'x';
  }

  function startGameLoop() {
    stopGameLoop();
    lastTick = 0;
    rafId = requestAnimationFrame(frame);
  }

  function stopGameLoop() {
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    lastTick = 0;
  }

  function frame(now) {
    rafId = requestAnimationFrame(frame);
    if (paused || !alive) {
      lastTick = 0;
      return;
    }
    if (!lastTick) lastTick = now;
    // Не больше одного шага за кадр — иначе после возврата на вкладку «бешеная» скорость
    if (now - lastTick >= tickMs) {
      lastTick = now;
      step();
    }
  }

  function applyShake() {
    shakeUntil = performance.now() + 280;
    haptic(40);
    if (shakeLayer) {
      shakeLayer.classList.add('is-shaking');
      setTimeout(() => shakeLayer.classList.remove('is-shaking'), 300);
    }
  }

  function step() {
    if (paused || !alive) return;

    dir = nextDir;
    let head = {
      x: snake[0].x + dir.x,
      y: snake[0].y + dir.y,
    };

    if (mode === 'walls') {
      if (head.x < 0 || head.y < 0 || head.x >= GRID_SIZE || head.y >= GRID_SIZE) {
        gameOver();
        return;
      }
    } else {
      head.x = (head.x + GRID_SIZE) % GRID_SIZE;
      head.y = (head.y + GRID_SIZE) % GRID_SIZE;
    }

    const exit = portalExit(head.x, head.y);
    if (exit) {
      head = { x: exit.x, y: exit.y };
      sfxPortal();
      haptic(12);
    }

    if (snake.some((segment) => segment.x === head.x && segment.y === head.y)) {
      gameOver();
      return;
    }

    snake.unshift(head);
    trail.unshift({ x: head.x, y: head.y, life: 1 });
    if (trail.length > 18) trail.pop();
    trail.forEach((p) => {
      p.life *= 0.88;
    });

    if (head.x === food.x && head.y === food.y) {
      const gain = combo;
      score += gain;
      scoreEl.textContent = String(score);
      if (score > best) {
        best = score;
        bestEl.textContent = String(best);
        localStorage.setItem(BEST_KEY, String(best));
      }
      food = spawnFood();
      combo = Math.min(8, combo + 1);
      comboFlash = 12;
      updateComboDisplay();
      sfxEat();
      haptic(10);
      if (tickMs > 60) {
        tickMs -= 2;
        updateSpeedDisplay();
      }
    } else {
      snake.pop();
    }

    if (comboFlash > 0) comboFlash -= 1;
    draw();
  }

  function roundRect(x, y, width, height, radius, fill) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
    if (fill) ctx.fill();
  }

  function drawCell(x, y, color, inset) {
    const pad = inset == null ? 1 : inset;
    const px = x * CELL_SIZE + pad;
    const py = y * CELL_SIZE + pad;
    const s = CELL_SIZE - pad * 2;
    ctx.fillStyle = color;
    roundRect(px, py, s, s, 4, true);
  }

  function draw() {
    const bg = cssVar('--grid', '#1b1b1d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      const p = i * CELL_SIZE;
      ctx.beginPath();
      ctx.moveTo(p, 0);
      ctx.lineTo(p, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, p);
      ctx.lineTo(canvas.width, p);
      ctx.stroke();
    }

    if (mode === 'walls') {
      ctx.strokeStyle = 'rgba(220, 53, 69, 0.7)';
      ctx.lineWidth = 3;
      ctx.strokeRect(1.5, 1.5, canvas.width - 3, canvas.height - 3);
    }

    if (portals) {
      portals.forEach((p) => {
        drawCell(p.a.x, p.a.y, p.color, 3);
        drawCell(p.b.x, p.b.y, p.color, 3);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(p.a.x * CELL_SIZE + CELL_SIZE / 2, p.a.y * CELL_SIZE + CELL_SIZE / 2, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.b.x * CELL_SIZE + CELL_SIZE / 2, p.b.y * CELL_SIZE + CELL_SIZE / 2, 3, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    (trail || []).forEach((p) => {
      if (p.life < 0.08) return;
      ctx.globalAlpha = p.life * 0.25;
      drawCell(p.x, p.y, '#c82333', 4);
      ctx.globalAlpha = 1;
    });

    const pulse = 0.9 + 0.1 * Math.sin(performance.now() / 220);
    ctx.fillStyle = cssVar('--food', '#2ecc71');
    const fpad = 3 - pulse;
    roundRect(
      food.x * CELL_SIZE + fpad,
      food.y * CELL_SIZE + fpad,
      CELL_SIZE - fpad * 2,
      CELL_SIZE - fpad * 2,
      4,
      true
    );

    snake.forEach((segment, index) => {
      const tNorm = index / Math.max(1, snake.length - 1);
      // head: brand red; body: darker crimson → near-black red
      if (index === 0) {
        drawCell(segment.x, segment.y, cssVar('--snake-head', '#dc3545'), 0.5);
      } else {
        const shade = Math.round(139 - 70 * tNorm); // 8b → darker
        const color = `rgb(${shade},${Math.round(30 - 10 * tNorm)},${Math.round(45 - 15 * tNorm)})`;
        drawCell(segment.x, segment.y, color, 1.5);
      }
    });

    if (comboFlash > 0 && combo >= 2) {
      ctx.save();
      ctx.fillStyle = `rgba(220, 53, 69, ${0.06 + comboFlash * 0.015})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#dc3545';
      ctx.textAlign = 'center';
      ctx.font = 'bold 36px system-ui, -apple-system, Segoe UI, Roboto, Arial';
      ctx.fillText(`×${combo}`, canvas.width / 2, 48);
      ctx.restore();
    }

    if (!alive) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.font = 'bold 28px system-ui, -apple-system, Segoe UI, Roboto, Arial';
      ctx.fillText(t('gameOver', 'Игра окончена'), canvas.width / 2, canvas.height / 2 - 18);
      ctx.font = '16px system-ui, -apple-system, Segoe UI, Roboto, Arial';
      ctx.fillText(
        t('finalScore', 'Счёт') + ': ' + score,
        canvas.width / 2,
        canvas.height / 2 + 10
      );
      ctx.fillText(t('pressRToRestart', 'Нажмите R — заново'), canvas.width / 2, canvas.height / 2 + 36);
    }
  }

  function submitScore() {
    if (scoreSubmitted || score <= 0 || !nickname) return Promise.resolve();
    scoreSubmitted = true;
    return fetch(ADD_SCORE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname, score, gameId: GAME_ID }),
    }).catch(() => {});
  }

  function gameOver() {
    alive = false;
    stopGameLoop();
    applyShake();
    sfxDeath();
    draw();
    submitScore();

    if (!adShownThisRound && window.showFullScreenAd) {
      adShownThisRound = true;
      setTimeout(() => {
        try {
          window.showFullScreenAd();
        } catch (_) {}
      }, 800);
    }
  }

  function setDirection(newX, newY) {
    if (newX === -dir.x && newY === -dir.y) return;
    nextDir = { x: newX, y: newY };
  }

  function focusPlayfield() {
    try {
      if (document.activeElement && document.activeElement !== canvas && document.activeElement.blur) {
        document.activeElement.blur();
      }
      canvas.focus({ preventScroll: true });
    } catch (_) {
      try {
        canvas.focus();
      } catch (__) {}
    }
  }

  function updateChangeNickBtn() {
    if (!btnChangeNick) return;
    btnChangeNick.textContent = nickname
      ? t('changeNick', 'Сменить ник')
      : t('setNick', 'Указать ник');
    btnChangeNick.hidden = false;
  }

  function hideNickForm() {
    if (nicknameForm) nicknameForm.hidden = true;
    updateChangeNickBtn();
  }

  function showNickForm() {
    if (!nicknameForm) return;
    nicknameForm.hidden = false;
    if (btnChangeNick) btnChangeNick.hidden = true;
    if (nicknameInput) {
      if (nickname) nicknameInput.value = nickname;
      try { nicknameInput.focus(); } catch (_) {}
    }
    try { nicknameForm.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {}
  }

  function requireNicknameThen(startFn) {
    if (!nicknameForm) {
      startFn();
      return;
    }
    if (!nickResolved) {
      pendingStart = startFn;
      showNickForm();
      return;
    }
    hideNickForm();
    startFn();
  }

  function clearNickname() {
    nickname = '';
    try { localStorage.removeItem(NICK_KEY); } catch (_) {}
    if (nicknameInput) nicknameInput.value = '';
    updateNickDisplay();
  }

  function finishNickChoice(startAfter) {
    nickResolved = true;
    hideNickForm();
    const fn = pendingStart;
    pendingStart = null;
    if (fn) fn();
    else if (startAfter) beginPlay();
  }

  function setNickname(name) {
    nickname = String(name || '')
      .trim()
      .slice(0, 40);
    if (!nickname) return false;
    const lower = nickname.toLowerCase();
    if (bannedWords.some((w) => w && lower.includes(String(w).toLowerCase()))) {
      alert(t('bannedNicknameAlert', 'Этот ник нельзя использовать'));
      return false;
    }
    localStorage.setItem(NICK_KEY, nickname);
    updateNickDisplay();
    return true;
  }

  canvas.setAttribute('tabindex', '0');
  canvas.style.outline = 'none';
  canvas.addEventListener('pointerdown', focusPlayfield);

  function onKeyDown(e) {
    if (nicknameForm && !nicknameForm.hidden) return;
    const code = e.code || '';
    const key = (e.key || '').toLowerCase();
    let handled = true;

    if (code === 'ArrowUp' || key === 'arrowup' || code === 'KeyW' || key === 'w') {
      setDirection(0, -1);
    } else if (code === 'ArrowDown' || key === 'arrowdown' || code === 'KeyS' || key === 's') {
      setDirection(0, 1);
    } else if (code === 'ArrowLeft' || key === 'arrowleft' || code === 'KeyA' || key === 'a') {
      setDirection(-1, 0);
    } else if (code === 'ArrowRight' || key === 'arrowright' || code === 'KeyD' || key === 'd') {
      setDirection(1, 0);
    } else if (
      code === 'Space' ||
      key === ' ' ||
      key === 'spacebar' ||
      code === 'Escape' ||
      key === 'escape' ||
      code === 'Enter' ||
      key === 'enter' ||
      code === 'NumpadEnter'
    ) {
      paused = !paused;
      if (paused && combo > 1) {
        combo = 1;
        updateComboDisplay();
      }
      if (!paused && alive) startGameLoop();
      else stopGameLoop();
    } else if (code === 'KeyR' || key === 'r') {
      requireNicknameThen(beginPlay);
    } else {
      handled = false;
    }

    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  document.addEventListener('keydown', onKeyDown, true);

  (function () {
    let startX = 0,
      startY = 0;
    canvas.addEventListener(
      'touchstart',
      (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        startX = touch.clientX;
        startY = touch.clientY;
      },
      { passive: false }
    );
    canvas.addEventListener(
      'touchmove',
      (e) => {
        e.preventDefault();
      },
      { passive: false }
    );
    canvas.addEventListener(
      'touchend',
      (e) => {
        e.preventDefault();
        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - startX;
        const deltaY = touch.clientY - startY;
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          if (deltaX > 15) setDirection(1, 0);
          else if (deltaX < -15) setDirection(-1, 0);
        } else {
          if (deltaY > 15) setDirection(0, 1);
          else if (deltaY < -15) setDirection(0, -1);
        }
        startX = startY = 0;
      },
      { passive: false }
    );
  })();

  document.querySelectorAll('[data-dir]').forEach((btn) => {
    btn.setAttribute('tabindex', '-1');
    btn.addEventListener('click', () => {
      const direction = btn.getAttribute('data-dir');
      if (direction === 'up') setDirection(0, -1);
      if (direction === 'down') setDirection(0, 1);
      if (direction === 'left') setDirection(-1, 0);
      if (direction === 'right') setDirection(1, 0);
      focusPlayfield();
    });
  });

  btnStart.addEventListener('click', () => {
    requireNicknameThen(() => {
      ensureAudio();
      if (!alive || paused || score === 0) {
        beginPlay();
      } else {
        paused = false;
        startGameLoop();
        focusPlayfield();
      }
    });
  });

  btnPause.addEventListener('click', () => {
    paused = !paused;
    if (paused && combo > 1) {
      combo = 1;
      updateComboDisplay();
    }
    if (!paused) startGameLoop();
    else stopGameLoop();
    focusPlayfield();
  });

  btnReset.addEventListener('click', () => {
    requireNicknameThen(beginPlay);
  });

  if (btnLeaderboard) {
    btnLeaderboard.addEventListener('click', () => {
      window.location.href = `${scoreTableUrl()}#snake`;
    });
  }

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

  if (modeSelect) {
    modeSelect.addEventListener('change', () => {
      mode = modeSelect.value;
      localStorage.setItem(MODE_KEY, mode);
      applyModeIdle();
    });
  }

  if (nicknameForm) {
    nicknameForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!setNickname(nicknameInput ? nicknameInput.value : '')) return;
      // Сохранили ник — если ждали Старт, запускаем; иначе просто закрываем форму
      finishNickChoice(Boolean(pendingStart));
    });
    const btnSkip = document.getElementById('btnSkipNick');
    if (btnSkip) {
      btnSkip.addEventListener('click', () => {
        clearNickname();
        finishNickChoice(Boolean(pendingStart));
      });
    }
  }

  if (btnChangeNick) {
    btnChangeNick.addEventListener('click', () => {
      nickResolved = false;
      pendingStart = null;
      showNickForm();
    });
  }

  fetch(BANNED_WORDS_URL)
    .then((r) => r.json())
    .then((data) => {
      if (Array.isArray(data)) {
        bannedWords = data.map((item) => (item && item.word) || item).filter(Boolean);
      }
    })
    .catch(() => {});

  updateNickDisplay();
  updateSoundBtn();
  updateComboDisplay();

  // idle preview
  snake = [
    { x: 12, y: 12 },
    { x: 11, y: 12 },
    { x: 10, y: 12 },
  ];
  dir = { x: 1, y: 0 };
  nextDir = dir;
  food = { x: 18, y: 12 };
  score = 0;
  combo = 1;
  trail = [];
  portals = null;
  alive = true;
  paused = true;
  spawnPortals();
  draw();

  const recMode = (() => {
    try { return new URLSearchParams(location.search).get('rec'); } catch (_) { return null; }
  })();
  const recGameMode = (() => {
    try { return new URLSearchParams(location.search).get('mode'); } catch (_) { return null; }
  })();

  if (recMode) {
    nickResolved = true;
    if (nicknameForm) hideNickForm();
    if (recGameMode && ['classic', 'walls', 'portals'].includes(recGameMode)) {
      mode = recGameMode;
      if (modeSelect) modeSelect.value = mode;
      localStorage.setItem(MODE_KEY, mode);
    }
    beginPlay();
    try {
      window.__rec = {
        getState() {
          return {
            snake: (snake || []).map((s) => ({ x: s.x, y: s.y })),
            food: food ? { x: food.x, y: food.y } : null,
            dir: dir ? { x: dir.x, y: dir.y } : { x: 1, y: 0 },
            score,
            alive,
            paused,
            grid: GRID_SIZE,
            mode,
          };
        },
        setDir: setDirection,
        setMode(m) {
          if (!['classic', 'walls', 'portals'].includes(m)) return;
          mode = m;
          if (modeSelect) modeSelect.value = mode;
          applyModeIdle();
          paused = false;
          startGameLoop();
        },
      };
    } catch (_) {}
  } else if (nicknameForm) {
    if (nickname) {
      nickResolved = true;
      if (nicknameInput) nicknameInput.value = nickname;
      hideNickForm();
    } else {
      nickResolved = false;
      showNickForm();
    }
  }
  updateChangeNickBtn();
})();
