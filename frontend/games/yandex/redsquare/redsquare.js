// redsquare.js — Yandex Games build (Serpmonn Square Escape)
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);

  const MAX_LIVES = 3;
  const INVINCIBLE_START_MS = 700;
  const INVINCIBLE_HIT_MS = 1200;
  const INVINCIBLE_LEVEL_MS = 900;
  const COMBO_WINDOW_MS = 2800;
  const BONUS_BASE = 10;
  const SCORE_TICK_MS = 1250;
  const MOVE_TICK_MS = 200;
  const stepPercent = 1.5;
  const BEST_KEY = 'rs_best_yg_v1';
  const STATE_KEY = 'rs_state_yg_v1';
  const SOUND_KEY = 'rs_sound_yg_v1';

  function t(key, fallback) {
    return (window.i18n && window.i18n[key]) || fallback || '';
  }

  function formatScore(n) {
    return t('scorePrefix', 'Score:') + n;
  }

  function ygStart() {
    if (typeof window.__ygGameplayStart === 'function') window.__ygGameplayStart();
  }

  function ygStop() {
    if (typeof window.__ygGameplayStop === 'function') window.__ygGameplayStop();
  }

  /* --- helpers (flattened modules) --- */

  function updatePlayerPosition(player, gameAreaRect, playerXPercent, playerYPercent) {
    if (!player || !gameAreaRect?.width || !gameAreaRect?.height) return;
    const playerX = (gameAreaRect.width * playerXPercent) / 100;
    const playerY = (gameAreaRect.height * playerYPercent) / 100;
    player.style.transform = 'none';
    player.style.top = `${playerY}px`;
    player.style.left = `${playerX}px`;
  }

  function createEnemies(num, { speed, gameArea, enemies }) {
    for (let i = 1; i <= num; i++) {
      const enemy = document.createElement('div');
      const isFast = Math.random() > 0.5;
      enemy.classList.add(isFast ? 'enemy-fast' : 'enemy-slow');
      enemy.id = `enemy${i}`;
      enemy.style.animationDuration = `${speed * (isFast ? 0.7 : 1.3)}s`;
      enemy.style.animationName = `move${i}`;
      gameArea.appendChild(enemy);
      enemies.push(enemy);
    }
  }

  function generateRandomKeyframes({ styleSheet }) {
    if (!styleSheet) return;
    for (let i = 1; i <= 5; i++) {
      const keyframes = `
        @keyframes move${i} {
          0% { top: ${Math.random() * 90}%; left: ${Math.random() * 90}%; }
          25% { top: ${Math.random() * 90}%; left: ${Math.random() * 90}%; }
          50% { top: ${Math.random() * 90}%; left: ${Math.random() * 90}%; }
          75% { top: ${Math.random() * 90}%; left: ${Math.random() * 90}%; }
          100% { top: ${Math.random() * 90}%; left: ${Math.random() * 90}%; }
        }
      `;
      try {
        styleSheet.insertRule(keyframes, styleSheet.cssRules.length);
      } catch (_) {}
    }
  }

  function checkCollision(player, enemies, onHit, { invincible = false } = {}) {
    if (invincible) return false;
    const playerRect = player.getBoundingClientRect();
    for (const enemy of enemies) {
      const enemyRect = enemy.getBoundingClientRect();
      if (
        playerRect.left < enemyRect.right &&
        playerRect.right > enemyRect.left &&
        playerRect.top < enemyRect.bottom &&
        playerRect.bottom > enemyRect.top
      ) {
        onHit();
        return true;
      }
    }
    const obstacles = document.querySelectorAll('.obstacle');
    for (const obstacle of obstacles) {
      const obstacleRect = obstacle.getBoundingClientRect();
      if (
        playerRect.left < obstacleRect.right &&
        playerRect.right > obstacleRect.left &&
        playerRect.top < obstacleRect.bottom &&
        playerRect.bottom > obstacleRect.top
      ) {
        onHit();
        return true;
      }
    }
    return false;
  }

  function createBonus() {
    const area = $('gameArea') || document.querySelector('.game-area');
    if (!area) return;
    const bonus = document.createElement('div');
    bonus.classList.add('bonus');
    bonus.style.top = `${Math.random() * 90}%`;
    bonus.style.left = `${Math.random() * 90}%`;
    area.appendChild(bonus);
    setTimeout(() => bonus.remove(), 5000);
  }

  function checkBonusCollision(onCollect) {
    const player = $('player');
    if (!player) return;
    const playerRect = player.getBoundingClientRect();
    document.querySelectorAll('.bonus').forEach((bonus) => {
      const bonusRect = bonus.getBoundingClientRect();
      if (
        playerRect.left < bonusRect.right &&
        playerRect.right > bonusRect.left &&
        playerRect.top < bonusRect.bottom &&
        playerRect.bottom > bonusRect.top
      ) {
        bonus.remove();
        if (typeof onCollect === 'function') onCollect();
        createBonus();
      }
    });
  }

  function loadProgress({ player, gameArea, gameAreaRect, scoreDisplay, levels, enemies, updatePlayerPosition: upd, createEnemies: mk }) {
    const savedState = localStorage.getItem(STATE_KEY);
    if (savedState) {
      try {
        const gameState = JSON.parse(savedState);
        const playerXPercent = gameState.playerXPercent;
        const playerYPercent = gameState.playerYPercent;
        const score = gameState.score;
        const speed = gameState.speed;
        const level = gameState.level;
        const lives = gameState.lives;
        upd(player, gameAreaRect, playerXPercent, playerYPercent);
        if (scoreDisplay) scoreDisplay.textContent = formatScore(score);
        mk(levels[Math.min(level, levels.length) - 1].enemies, { speed, gameArea, enemies });
        return { playerXPercent, playerYPercent, score, speed, level, lives };
      } catch (_) {}
    }
    mk(levels[0].enemies, { speed: levels[0].speed, gameArea, enemies });
    return { playerXPercent: 50, playerYPercent: 50, score: 0, speed: levels[0].speed, level: 1, lives: MAX_LIVES };
  }

  /* --- game state --- */

  const gameArea = $('gameArea') || document.querySelector('.game-area');
  let gameAreaRect = gameArea.getBoundingClientRect();
  const player = $('player');
  const playerSize = () => player.getBoundingClientRect().width;

  const keyframesStyle = document.createElement('style');
  keyframesStyle.setAttribute('data-rs-keyframes', '1');
  document.head.appendChild(keyframesStyle);
  const styleSheet = keyframesStyle.sheet;

  let isPaused = true;
  let gameStarted = false;
  let loopRunning = false;
  let playerXPercent = 50;
  let playerYPercent = 50;
  let score = 0;
  let speed = 3.2;
  let level = 1;
  let lives = MAX_LIVES;
  let enemies = [];
  let moveDirection = null;
  let touchStartX = 0;
  let touchStartY = 0;
  let invincibleUntil = 0;
  let combo = 0;
  let lastBonusAt = 0;
  let lastScoreAt = 0;
  let lastMoveAt = 0;
  let soundEnabled = localStorage.getItem(SOUND_KEY) !== '0';
  let audioCtx = null;
  let adShownThisRound = false;

  const levels = [
    { speed: 3.2, enemies: 1, points: 40 },
    { speed: 2.8, enemies: 2, points: 100 },
    { speed: 2.4, enemies: 3, points: 180 },
    { speed: 2.0, enemies: 4, points: 280 },
    { speed: 1.7, enemies: 5, points: 400 },
  ];

  const getBest = () => parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0;

  const saveBest = () => {
    const prev = getBest();
    if (score > prev) {
      localStorage.setItem(BEST_KEY, String(score));
      return score;
    }
    return prev;
  };

  const ensureAudio = () => {
    if (!soundEnabled) return null;
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return audioCtx;
  };

  const beep = (freq = 440, dur = 0.08, type = 'square', gain = 0.04) => {
    const ctx = ensureAudio();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g);
    g.connect(ctx.destination);
    const now = ctx.currentTime;
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.start(now);
    osc.stop(now + dur);
  };

  const play = {
    bonus: () => beep(740 + combo * 40, 0.07, 'square', 0.045),
    hit: () => beep(160, 0.18, 'sawtooth', 0.05),
    level: () => {
      beep(520, 0.08);
      setTimeout(() => beep(780, 0.1), 90);
    },
    win: () => {
      beep(523, 0.1);
      setTimeout(() => beep(659, 0.1), 100);
      setTimeout(() => beep(784, 0.16), 200);
    },
    lose: () => beep(110, 0.28, 'triangle', 0.05),
  };

  const setSoundUi = () => {
    const soundButton = $('soundBtn');
    if (!soundButton) return;
    soundButton.textContent = soundEnabled ? t('soundOn', 'Sound') : t('soundOff', 'Muted');
    soundButton.setAttribute('aria-pressed', soundEnabled ? 'true' : 'false');
  };

  const renderLives = () => {
    const livesValueEl = $('livesValue');
    if (!livesValueEl) return;
    livesValueEl.textContent = '●'.repeat(Math.max(0, lives)) + '○'.repeat(Math.max(0, MAX_LIVES - lives));
    livesValueEl.setAttribute('aria-label', String(lives));
  };

  const updateHud = () => {
    const scoreDisplay = $('score');
    const scoreValueEl = $('scoreValue');
    const levelValueEl = $('levelValue');
    const bestValueEl = $('bestValue');
    const progressBar = $('progressBar');
    const comboDisplay = $('comboDisplay');
    const comboValueEl = $('comboValue');

    if (scoreDisplay) scoreDisplay.textContent = formatScore(score);
    if (scoreValueEl) scoreValueEl.textContent = String(score);
    if (levelValueEl) levelValueEl.textContent = String(Math.min(level, levels.length));
    if (bestValueEl) bestValueEl.textContent = String(Math.max(getBest(), score));
    renderLives();

    const idx = Math.min(level, levels.length) - 1;
    const prevThreshold = idx > 0 ? levels[idx - 1].points : 0;
    const nextThreshold = levels[Math.min(level, levels.length) - 1].points;
    const span = Math.max(1, nextThreshold - prevThreshold);
    const pct =
      level > levels.length
        ? 100
        : Math.min(100, Math.max(0, ((score - prevThreshold) / span) * 100));
    if (progressBar) progressBar.style.width = `${pct}%`;

    if (comboDisplay && comboValueEl) {
      if (combo > 1) {
        comboDisplay.hidden = false;
        comboValueEl.textContent = `${t('comboLabel', 'Combo')} ×${combo}`;
      } else {
        comboDisplay.hidden = true;
      }
    }
  };

  const grantInvincible = (ms = INVINCIBLE_HIT_MS) => {
    invincibleUntil = Date.now() + ms;
    player.classList.add('player-invincible');
    setTimeout(() => {
      if (Date.now() >= invincibleUntil) {
        player.classList.remove('player-invincible');
      }
    }, ms + 30);
  };

  const isInvincible = () => Date.now() < invincibleUntil;

  const showToast = (text) => {
    const levelToast = $('levelToast');
    if (!levelToast) return;
    levelToast.textContent = text;
    levelToast.hidden = false;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      levelToast.hidden = true;
    }, 1400);
  };

  const setEnemyAnimState = (state) => {
    document.querySelectorAll('.enemy-fast, .enemy-slow').forEach((enemy) => {
      enemy.style.animationPlayState = state;
    });
  };

  const ensurePlayerSafePosition = () => {
    const obstacles = document.querySelectorAll('.obstacle');
    let isSafe = false;
    let guard = 0;
    while (!isSafe && guard++ < 40) {
      isSafe = true;
      for (const obstacle of obstacles) {
        const obstacleRect = obstacle.getBoundingClientRect();
        const playerRect = player.getBoundingClientRect();
        if (
          playerRect.left < obstacleRect.right &&
          playerRect.right > obstacleRect.left &&
          playerRect.top < obstacleRect.bottom &&
          playerRect.bottom > obstacleRect.top
        ) {
          playerXPercent = 10 + Math.random() * 80;
          playerYPercent = 10 + Math.random() * 80;
          updatePlayerPosition(player, gameAreaRect, playerXPercent, playerYPercent);
          isSafe = false;
          break;
        }
      }
    }
  };

  window.addEventListener('resize', () => {
    gameAreaRect = gameArea.getBoundingClientRect();
  });

  const refreshGameAreaRect = () => {
    gameAreaRect = gameArea.getBoundingClientRect();
    return gameAreaRect;
  };

  const movePlayer = (direction, { force = false } = {}) => {
    if (isPaused || !gameStarted) return;
    const now = Date.now();
    if (!force && now - lastMoveAt < MOVE_TICK_MS) return;
    lastMoveAt = now;
    refreshGameAreaRect();
    if (!gameAreaRect.width || !gameAreaRect.height) return;
    const sizePctW = (playerSize() / gameAreaRect.width) * 100;
    const sizePctH = (playerSize() / gameAreaRect.height) * 100;
    switch (direction) {
      case 'up':
        playerYPercent = Math.max(0, playerYPercent - stepPercent);
        break;
      case 'down':
        playerYPercent = Math.min(100 - sizePctH, playerYPercent + stepPercent);
        break;
      case 'left':
        playerXPercent = Math.max(0, playerXPercent - stepPercent);
        break;
      case 'right':
        playerXPercent = Math.min(100 - sizePctW, playerXPercent + stepPercent);
        break;
    }
    updatePlayerPosition(player, gameAreaRect, playerXPercent, playerYPercent);
  };

  const saveProgress = () => {
    const gameState = { playerXPercent, playerYPercent, score, speed, level, lives };
    localStorage.setItem(STATE_KEY, JSON.stringify(gameState));
  };

  const collectBonus = () => {
    const now = Date.now();
    if (now - lastBonusAt <= COMBO_WINDOW_MS) combo += 1;
    else combo = 1;
    lastBonusAt = now;
    const gained = BONUS_BASE * combo;
    score += gained;
    play.bonus();
    updateHud();
    if (level <= levels.length && score >= levels[level - 1].points) {
      nextLevel();
    }
    saveProgress();
  };

  const updateScoreTick = (now = Date.now()) => {
    if (now - lastScoreAt < SCORE_TICK_MS) return;
    lastScoreAt = now;
    score += 1;
    if (now - lastBonusAt > COMBO_WINDOW_MS) combo = 0;
    updateHud();
    if (level <= levels.length && score >= levels[level - 1].points) {
      nextLevel();
    }
    saveProgress();
  };

  const nextLevel = () => {
    level += 1;
    if (level <= levels.length) {
      speed = levels[level - 1].speed;
      enemies.forEach((enemy) => enemy.remove());
      enemies = [];
      createEnemies(levels[level - 1].enemies, { speed, gameArea, enemies });
      grantInvincible(INVINCIBLE_LEVEL_MS);
      play.level();
      showToast(`${t('levelUp', 'Level')} ${level}`);
      updateHud();
    } else {
      play.win();
      endGame({ won: true });
    }
  };

  const onPlayerHit = () => {
    if (isInvincible() || isPaused || !gameStarted) return;
    lives -= 1;
    play.hit();
    player.classList.add('player-collision');
    setTimeout(() => player.classList.remove('player-collision'), 500);
    combo = 0;
    updateHud();
    if (lives <= 0) {
      play.lose();
      endGame({ won: false });
      return;
    }
    grantInvincible();
    ensurePlayerSafePosition();
    saveProgress();
  };

  const maybeShowAd = () => {
    if (adShownThisRound || !window.showFullScreenAd) return;
    adShownThisRound = true;
    setTimeout(() => {
      try {
        window.showFullScreenAd();
      } catch (_) {}
    }, 600);
  };

  const showResultModal = ({ won }) => {
    const best = saveBest();
    const bestValueEl = $('bestValue');
    if (bestValueEl) bestValueEl.textContent = String(best);
    const existing = document.querySelector('.modal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.className = 'modal';
    const title = won ? t('allLevelsComplete', 'You cleared every level!') : t('gameOverTitle', 'Game over');
    modal.innerHTML = `
      <div class="modal-content">
        <h2>${title}</h2>
        <p>${t('modalYourScore', 'Your score:')} ${score}</p>
        <p>${t('modalBestResult', 'Best result:')} ${best}</p>
        <button type="button" id="okButton">${t('modalOk', 'OK')}</button>
      </div>
    `;
    document.body.appendChild(modal);
    $('okButton').addEventListener('click', () => {
      modal.remove();
      maybeShowAd();
    });
  };

  const endGame = ({ won = false } = {}) => {
    isPaused = true;
    gameStarted = false;
    setEnemyAnimState('paused');
    const pauseOverlay = $('pauseOverlay');
    if (pauseOverlay) pauseOverlay.hidden = true;
    const pauseButton = $('pauseBtn');
    if (pauseButton) pauseButton.hidden = true;
    const startButton = $('start');
    if (startButton) startButton.hidden = true;
    const restartButton = $('restart');
    if (restartButton) restartButton.hidden = false;
    localStorage.removeItem(STATE_KEY);
    ygStop();
    showResultModal({ won });
    maybeShowAd();
  };

  const startGame = () => {
    refreshGameAreaRect();
    const scoreDisplay = $('score');
    const state = loadProgress({
      player,
      gameArea,
      gameAreaRect,
      scoreDisplay,
      levels,
      enemies,
      updatePlayerPosition,
      createEnemies,
    });
    playerXPercent = state.playerXPercent;
    playerYPercent = state.playerYPercent;
    score = state.score;
    speed = state.speed;
    level = state.level;
    lives = Number(state.lives) > 0 ? Number(state.lives) : MAX_LIVES;
    combo = 0;
    adShownThisRound = false;
    generateRandomKeyframes({ styleSheet });
    document.querySelectorAll('.bonus').forEach((b) => b.remove());
    createBonus();
    updatePlayerPosition(player, gameAreaRect, playerXPercent, playerYPercent);
    ensurePlayerSafePosition();
    grantInvincible(INVINCIBLE_START_MS);
    isPaused = false;
    gameStarted = true;
    lastScoreAt = Date.now();
    lastMoveAt = 0;
    const pauseOverlay = $('pauseOverlay');
    if (pauseOverlay) pauseOverlay.hidden = true;
    const pauseButton = $('pauseBtn');
    if (pauseButton) {
      pauseButton.hidden = false;
      pauseButton.textContent = t('pause', 'Pause');
    }
    const restartButton = $('restart');
    if (restartButton) restartButton.hidden = false;
    updateHud();
    setEnemyAnimState('running');
    ensureAudio();
    ygStart();
    if (!loopRunning) {
      loopRunning = true;
      requestAnimationFrame(gameLoop);
    }
  };

  const resetRun = () => {
    localStorage.removeItem(STATE_KEY);
    refreshGameAreaRect();
    playerXPercent = 50;
    playerYPercent = 50;
    score = 0;
    speed = levels[0].speed;
    level = 1;
    lives = MAX_LIVES;
    combo = 0;
    adShownThisRound = false;
    lastScoreAt = Date.now();
    lastMoveAt = 0;
    enemies.forEach((enemy) => enemy.remove());
    enemies = [];
    document.querySelectorAll('.bonus').forEach((b) => b.remove());
    const existing = document.querySelector('.modal');
    if (existing) existing.remove();
    generateRandomKeyframes({ styleSheet });
    createEnemies(levels[0].enemies, { speed, gameArea, enemies });
    updatePlayerPosition(player, gameAreaRect, playerXPercent, playerYPercent);
    createBonus();
    ensurePlayerSafePosition();
    grantInvincible(INVINCIBLE_START_MS);
    isPaused = false;
    gameStarted = true;
    const pauseOverlay = $('pauseOverlay');
    if (pauseOverlay) pauseOverlay.hidden = true;
    const pauseButton = $('pauseBtn');
    if (pauseButton) {
      pauseButton.hidden = false;
      pauseButton.textContent = t('pause', 'Pause');
    }
    const restartButton = $('restart');
    if (restartButton) restartButton.hidden = false;
    const startButton = $('start');
    if (startButton) startButton.hidden = true;
    updateHud();
    setEnemyAnimState('running');
    ensureAudio();
    ygStart();
    if (!loopRunning) {
      loopRunning = true;
      requestAnimationFrame(gameLoop);
    }
  };

  const gameLoop = () => {
    if (!isPaused && gameStarted) {
      const now = Date.now();
      checkCollision(player, enemies, onPlayerHit, { invincible: isInvincible() });
      checkBonusCollision(collectBonus);
      updateScoreTick(now);
    }
    requestAnimationFrame(gameLoop);
  };

  const startMoving = (direction) => {
    moveDirection = direction;
    requestAnimationFrame(move);
  };

  const stopMoving = () => {
    moveDirection = null;
  };

  const move = () => {
    if (moveDirection) {
      movePlayer(moveDirection);
      requestAnimationFrame(move);
    }
  };

  const bindPad = (id, direction) => {
    const el = $(id);
    if (!el) return;
    const start = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.button != null && e.button !== 0) return;
      try {
        el.setPointerCapture?.(e.pointerId);
      } catch (_) {}
      startMoving(direction);
      try {
        navigator.vibrate && navigator.vibrate(10);
      } catch (_) {}
    };
    const stop = (e) => {
      if (e) e.preventDefault();
      stopMoving();
    };
    el.addEventListener('pointerdown', start);
    el.addEventListener('pointerup', stop);
    el.addEventListener('pointercancel', stop);
    el.addEventListener('pointerleave', (e) => {
      if (el.hasPointerCapture?.(e.pointerId)) stop(e);
    });
    el.addEventListener('touchstart', start, { passive: false });
    el.addEventListener('touchend', stop, { passive: false });
    el.addEventListener('mousedown', start);
    el.addEventListener('mouseup', stop);
  };

  function togglePause(forcePause) {
    if (!gameStarted && forcePause !== true) return;
    const pauseButton = $('pauseBtn');
    const pauseOverlay = $('pauseOverlay');
    const shouldPause = forcePause === true ? true : forcePause === false ? false : !isPaused;
    if (shouldPause) {
      setEnemyAnimState('paused');
      if (pauseButton) pauseButton.textContent = t('resume', 'Resume');
      if (pauseOverlay) pauseOverlay.hidden = false;
      isPaused = true;
      ygStop();
    } else {
      if (!gameStarted) return;
      setEnemyAnimState('running');
      if (pauseButton) pauseButton.textContent = t('pause', 'Pause');
      if (pauseOverlay) pauseOverlay.hidden = true;
      isPaused = false;
      ygStart();
    }
  }

  function beginPlay() {
    const startButton = $('start');
    if (startButton) startButton.hidden = true;
    const hasSave = Boolean(localStorage.getItem(STATE_KEY));
    if (hasSave) startGame();
    else resetRun();
  }

  $('understandBtn').addEventListener('click', () => {
    $('instructionOverlay').style.display = 'none';
    const startButton = $('start');
    if (startButton) startButton.hidden = false;
  });

  $('start').addEventListener('click', () => {
    beginPlay();
  });

  $('pauseBtn').addEventListener('click', () => {
    togglePause();
  });

  $('soundBtn').addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem(SOUND_KEY, soundEnabled ? '1' : '0');
    setSoundUi();
    if (soundEnabled) ensureAudio();
  });

  document.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
      event.preventDefault();
    }
    switch (event.key) {
      case 'ArrowUp':
        movePlayer('up', { force: true });
        break;
      case 'ArrowDown':
        movePlayer('down', { force: true });
        break;
      case 'ArrowLeft':
        movePlayer('left', { force: true });
        break;
      case 'ArrowRight':
        movePlayer('right', { force: true });
        break;
      case ' ':
        $('pauseBtn').click();
        break;
      case 'Enter': {
        const startButton = $('start');
        const restartButton = $('restart');
        if (startButton && !startButton.hidden) startButton.click();
        else if (restartButton) restartButton.click();
        break;
      }
    }
  });

  gameArea.addEventListener(
    'touchstart',
    (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    },
    { passive: true }
  );

  gameArea.addEventListener(
    'touchmove',
    (e) => {
      if (!gameStarted || isPaused) return;
      e.preventDefault();
      const deltaX = e.touches[0].clientX - touchStartX;
      const deltaY = e.touches[0].clientY - touchStartY;
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        movePlayer(deltaX > 0 ? 'right' : 'left');
      } else {
        movePlayer(deltaY > 0 ? 'down' : 'up');
      }
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    },
    { passive: false }
  );

  bindPad('up', 'up');
  bindPad('down', 'down');
  bindPad('left', 'left');
  bindPad('right', 'right');

  $('restart').addEventListener('click', () => {
    resetRun();
  });

  if (/[?&]rec=1(?:&|$)/.test(location.search)) {
    window.__rec = {
      getState() {
        return {
          score,
          lives,
          level,
          running: Boolean(gameStarted && !isPaused),
          paused: isPaused,
          started: gameStarted,
          player: { x: playerXPercent, y: playerYPercent },
          enemies: enemies.length,
        };
      },
      start() {
        const overlay = $('instructionOverlay');
        if (overlay) overlay.style.display = 'none';
        if (!gameStarted) beginPlay();
        else if (isPaused) togglePause(false);
      },
      pause() {
        if (gameStarted && !isPaused) togglePause(true);
      },
      reset: resetRun,
    };
  }

  function initUi() {
    setSoundUi();
    updateHud();
    const startButton = $('start');
    const pauseButton = $('pauseBtn');
    const restartButton = $('restart');
    if (startButton) startButton.hidden = true;
    if (pauseButton) pauseButton.hidden = true;
    if (restartButton) restartButton.hidden = true;
  }

  window.__ygOnReady = function () {
    initUi();
  };

  if (window.__ygBoot) window.__ygBoot();
  else initUi();
})();
