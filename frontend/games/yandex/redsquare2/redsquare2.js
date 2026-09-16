// redsquare2.js — Yandex Games build (Serpmonn Falling Shapes)
(function () {
  'use strict';

  const MAX_MISSES = 10;
  const BASE_OBJECT_SPEED = 1.35;
  const SPEED_PER_LEVEL = 0.18;
  const MAX_OBJECT_SPEED = 4.8;
  const SPAWN_START_MS = 1100;
  const SPAWN_MIN_MS = 480;
  const SPAWN_STEP_MS = 45;
  const PLAYER_SPEED = 5.2;
  const FRICTION = 0.88;
  const BEST_KEY = 'rs2_best_yg_v1';
  const SOUND_KEY = 'rs2_sound_yg_v1';

  const stage = document.getElementById('gameStage');
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const missedEl = document.getElementById('missed');
  const scoreValueEl = document.getElementById('scoreValue');
  const levelValueEl = document.getElementById('levelValue');
  const missesValueEl = document.getElementById('missesValue');
  const bestValueEl = document.getElementById('bestValue');
  const pauseOverlay = document.getElementById('pauseOverlay');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const restartBtn = document.getElementById('restartBtn');
  const soundBtn = document.getElementById('soundBtn');
  const instructionOverlay = document.getElementById('instructionOverlay');
  const understandBtn = document.getElementById('understandBtn');

  function t(key, fallback) {
    return (window.i18n && window.i18n[key]) || fallback || '';
  }

  function formatScore(n) {
    return t('scorePrefix', 'Score:') + n;
  }

  function formatMissed(n) {
    return t('missedPrefix', 'Misses:') + n;
  }

  function ygStart() {
    if (typeof window.__ygGameplayStart === 'function') window.__ygGameplayStart();
  }

  function ygStop() {
    if (typeof window.__ygGameplayStop === 'function') window.__ygGameplayStop();
  }

  const player = {
    x: 0,
    y: 0,
    width: 44,
    height: 44,
    speed: PLAYER_SPEED,
    dx: 0,
  };

  const objects = [];
  let objectSpeed = BASE_OBJECT_SPEED;
  let score = 0;
  let level = 1;
  let missedObjects = 0;
  let isPaused = false;
  let gameStarted = false;
  let loopRunning = false;
  let lastTime = 0;
  let gameInterval = null;
  let touchX = null;
  let soundEnabled = localStorage.getItem(SOUND_KEY) !== '0';
  let audioCtx = null;
  let adShownThisRound = false;
  let best = parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0;

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
    const ctxA = ensureAudio();
    if (!ctxA) return;
    const osc = ctxA.createOscillator();
    const g = ctxA.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.value = gain;
    osc.connect(g);
    g.connect(ctxA.destination);
    const now = ctxA.currentTime;
    g.gain.setValueAtTime(gain, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + dur);
    osc.start(now);
    osc.stop(now + dur);
  };

  const play = {
    dodge: () => beep(620, 0.05, 'square', 0.03),
    hit: () => beep(170, 0.16, 'sawtooth', 0.05),
    level: () => {
      beep(480, 0.07);
      setTimeout(() => beep(720, 0.09), 80);
    },
    lose: () => beep(110, 0.28, 'triangle', 0.05),
  };

  const setSoundUi = () => {
    if (!soundBtn) return;
    soundBtn.textContent = soundEnabled ? t('soundOn', 'Sound') : t('soundOff', 'Muted');
    soundBtn.setAttribute('aria-pressed', soundEnabled ? 'true' : 'false');
  };

  const spawnIntervalMs = () =>
    Math.max(SPAWN_MIN_MS, SPAWN_START_MS - (level - 1) * SPAWN_STEP_MS);

  const currentObjectSpeed = () =>
    Math.min(MAX_OBJECT_SPEED, BASE_OBJECT_SPEED + (level - 1) * SPEED_PER_LEVEL);

  const getBest = () => parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0;

  const saveBest = () => {
    best = getBest();
    if (score > best) {
      best = score;
      try {
        localStorage.setItem(BEST_KEY, String(best));
      } catch (_) {}
    }
    return best;
  };

  const resizeCanvas = () => {
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    const prevW = canvas.width || w;
    const ratio = w / prevW;
    canvas.width = w;
    canvas.height = h;
    player.width = Math.max(34, Math.round(w * 0.09));
    player.height = player.width;
    player.y = h - player.height - 10;
    if (gameStarted) {
      player.x = Math.min(Math.max(0, player.x * ratio), w - player.width);
    } else {
      player.x = w / 2 - player.width / 2;
    }
  };

  const updateHud = () => {
    if (scoreEl) scoreEl.textContent = formatScore(score);
    if (missedEl) missedEl.textContent = formatMissed(missedObjects);
    if (scoreValueEl) scoreValueEl.textContent = String(score);
    if (levelValueEl) levelValueEl.textContent = String(level);
    if (missesValueEl) missesValueEl.textContent = `${missedObjects}/${MAX_MISSES}`;
    if (bestValueEl) bestValueEl.textContent = String(best);
  };

  const drawPlayer = () => {
    const color = level % 2 === 0 ? '#3dba7a' : '#f47059';
    ctx.fillStyle = color;
    ctx.strokeStyle = '#ffe0d8';
    ctx.lineWidth = 2;
    ctx.fillRect(player.x, player.y, player.width, player.height);
    ctx.strokeRect(player.x + 0.5, player.y + 0.5, player.width - 1, player.height - 1);
  };

  const createObject = () => {
    if (!gameStarted || isPaused) return;
    const size = 18 + Math.random() * 34;
    const x = Math.random() * Math.max(1, canvas.width - size);
    const shapeTypes = ['square', 'circle', 'triangle', 'star'];
    const shape = shapeTypes[Math.floor(Math.random() * shapeTypes.length)];
    const dx = (Math.random() - 0.5) * 2.4;
    objects.push({ x, y: -size, size, shape, dx });
  };

  const objectColorForLevel = () => {
    if (level < 5) return '#5b8cff';
    if (level < 10) return '#e0a24a';
    return '#c084fc';
  };

  const drawObject = (obj) => {
    ctx.beginPath();
    ctx.fillStyle = objectColorForLevel();
    switch (obj.shape) {
      case 'square':
        ctx.fillRect(obj.x, obj.y, obj.size, obj.size);
        break;
      case 'circle':
        ctx.arc(obj.x + obj.size / 2, obj.y + obj.size / 2, obj.size / 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'triangle':
        ctx.moveTo(obj.x + obj.size / 2, obj.y);
        ctx.lineTo(obj.x, obj.y + obj.size);
        ctx.lineTo(obj.x + obj.size, obj.y + obj.size);
        ctx.closePath();
        ctx.fill();
        break;
      case 'star': {
        const centerX = obj.x + obj.size / 2;
        const centerY = obj.y + obj.size / 2;
        const spikes = 5;
        const outerRadius = obj.size / 2;
        const innerRadius = obj.size / 4;
        let rot = (Math.PI / 2) * 3;
        const step = Math.PI / spikes;
        ctx.moveTo(centerX, centerY - outerRadius);
        for (let i = 0; i < spikes; i++) {
          ctx.lineTo(centerX + Math.cos(rot) * outerRadius, centerY + Math.sin(rot) * outerRadius);
          rot += step;
          ctx.lineTo(centerX + Math.cos(rot) * innerRadius, centerY + Math.sin(rot) * innerRadius);
          rot += step;
        }
        ctx.closePath();
        ctx.fill();
        break;
      }
      default:
        break;
    }
  };

  const maybeLevelUp = () => {
    const nextLevel = Math.floor(score / 10) + 1;
    if (nextLevel > level) {
      level = nextLevel;
      objectSpeed = currentObjectSpeed();
      play.level();
      restartSpawnTimer();
      updateHud();
    }
  };

  const updateObjects = (deltaTime) => {
    const scale = deltaTime / 16;
    for (let i = objects.length - 1; i >= 0; i--) {
      const obj = objects[i];
      obj.y += objectSpeed * scale;
      obj.x += obj.dx * scale;
      if (obj.x < 0) obj.x = 0;
      if (obj.x + obj.size > canvas.width) obj.x = canvas.width - obj.size;

      if (obj.y + obj.size > canvas.height) {
        objects.splice(i, 1);
        missedObjects += 1;
        play.hit();
        updateHud();
        if (missedObjects >= MAX_MISSES) {
          endGame();
        }
        continue;
      }

      const hit =
        obj.x < player.x + player.width &&
        obj.x + obj.size > player.x &&
        obj.y < player.y + player.height &&
        obj.y + obj.size > player.y;

      if (hit) {
        objects.splice(i, 1);
        score += 1;
        play.dodge();
        updateHud();
        maybeLevelUp();
      }
    }
  };

  const clear = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const movePlayer = (deltaTime) => {
    player.dx *= FRICTION;
    if (Math.abs(player.dx) < 0.05) player.dx = 0;
    player.x += player.dx * (deltaTime / 16);
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
  };

  const update = (timestamp) => {
    if (!lastTime) lastTime = timestamp;
    const deltaTime = Math.min(48, timestamp - lastTime);
    lastTime = timestamp;

    if (gameStarted && !isPaused) {
      clear();
      drawPlayer();
      objects.forEach(drawObject);
      updateObjects(deltaTime);
      movePlayer(deltaTime);
    } else if (gameStarted && isPaused) {
      clear();
      drawPlayer();
      objects.forEach(drawObject);
    }
    requestAnimationFrame(update);
  };

  const keyDown = (e) => {
    if (e.key === ' ') {
      e.preventDefault();
      if (gameStarted) pauseBtn.click();
      return;
    }
    if (e.key === 'Enter') {
      if (startBtn && !startBtn.hidden) {
        e.preventDefault();
        startBtn.click();
        return;
      }
      if (restartBtn && !restartBtn.hidden && !gameStarted) {
        e.preventDefault();
        restartBtn.click();
        return;
      }
    }
    if (!gameStarted || isPaused) return;
    if (e.key === 'ArrowRight' || e.key === 'Right') {
      e.preventDefault();
      player.dx = player.speed;
    } else if (e.key === 'ArrowLeft' || e.key === 'Left') {
      e.preventDefault();
      player.dx = -player.speed;
    }
  };

  const keyUp = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'Right' || e.key === 'ArrowLeft' || e.key === 'Left') {
      player.dx = 0;
    }
  };

  document.addEventListener('keydown', keyDown);
  document.addEventListener('keyup', keyUp);

  canvas.addEventListener(
    'touchstart',
    (e) => {
      touchX = e.touches[0].clientX;
    },
    { passive: true }
  );

  canvas.addEventListener(
    'touchmove',
    (e) => {
      if (!gameStarted || isPaused || touchX === null) return;
      e.preventDefault();
      const newTouchX = e.touches[0].clientX;
      player.x += newTouchX - touchX;
      touchX = newTouchX;
      if (player.x < 0) player.x = 0;
      if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    },
    { passive: false }
  );

  canvas.addEventListener(
    'touchend',
    () => {
      touchX = null;
    },
    { passive: true }
  );

  const restartSpawnTimer = () => {
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = setInterval(createObject, spawnIntervalMs());
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

  const showResultModal = (finalScore) => {
    const savedBest = saveBest();
    updateHud();
    const existing = document.querySelector('.rs2-modal');
    if (existing) existing.remove();
    const modal = document.createElement('div');
    modal.className = 'rs2-modal';
    modal.innerHTML = `
      <div class="rs2-modal-content">
        <h2>${t('gameOverTitle', 'Game over')}</h2>
        <p>${t('modalYourScore', 'Your score:')} ${finalScore}</p>
        <p>${t('modalBestResult', 'Best result:')} ${savedBest}</p>
        <div class="rs2-modal-actions">
          <button type="button" id="rs2RestartBtn">${t('lbRestart', 'Play again')}</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.querySelector('#rs2RestartBtn').addEventListener('click', () => {
      modal.remove();
      restartGame();
    });
  };

  function endGame() {
    isPaused = true;
    gameStarted = false;
    if (pauseOverlay) pauseOverlay.hidden = true;
    if (gameInterval) clearInterval(gameInterval);
    gameInterval = null;
    play.lose();
    const finalScore = score;
    if (pauseBtn) pauseBtn.hidden = true;
    if (startBtn) startBtn.hidden = true;
    if (restartBtn) restartBtn.hidden = false;
    ygStop();
    showResultModal(finalScore);
    maybeShowAd();
  }

  function restartGame() {
    const existing = document.querySelector('.rs2-modal');
    if (existing) existing.remove();
    score = 0;
    level = 1;
    missedObjects = 0;
    objectSpeed = BASE_OBJECT_SPEED;
    objects.length = 0;
    adShownThisRound = false;
    resizeCanvas();
    player.x = canvas.width / 2 - player.width / 2;
    player.dx = 0;
    isPaused = false;
    gameStarted = true;
    if (pauseOverlay) pauseOverlay.hidden = true;
    if (startBtn) startBtn.hidden = true;
    if (pauseBtn) {
      pauseBtn.hidden = false;
      pauseBtn.textContent = t('pause', 'Pause');
    }
    if (restartBtn) restartBtn.hidden = false;
    updateHud();
    restartSpawnTimer();
    ensureAudio();
    ygStart();
    if (!loopRunning) {
      loopRunning = true;
      lastTime = 0;
      requestAnimationFrame(update);
    }
  }

  function dismissInstruction() {
    if (!instructionOverlay || instructionOverlay.classList.contains('is-hidden')) return;
    instructionOverlay.classList.add('is-hidden');
    instructionOverlay.hidden = true;
    instructionOverlay.style.cssText = 'display:none!important;pointer-events:none!important';
    instructionOverlay.setAttribute('aria-hidden', 'true');
    if (startBtn) startBtn.hidden = false;
    requestAnimationFrame(() => {
      resizeCanvas();
      try {
        window.dispatchEvent(new Event('resize'));
      } catch (_) {}
    });
  }

  if (understandBtn) {
    understandBtn.addEventListener('click', (e) => {
      e.preventDefault();
      dismissInstruction();
    });
  }
  if (instructionOverlay) {
    instructionOverlay.addEventListener(
      'click',
      (e) => {
        if (e.target === instructionOverlay) dismissInstruction();
      },
      true
    );
  }

  if (startBtn) {
    startBtn.addEventListener('click', () => {
      restartGame();
    });
  }

  if (pauseBtn) {
    pauseBtn.addEventListener('click', () => {
      if (!gameStarted) return;
      isPaused = !isPaused;
      pauseBtn.textContent = isPaused ? t('resume', 'Resume') : t('pause', 'Pause');
      if (pauseOverlay) pauseOverlay.hidden = !isPaused;
      if (isPaused) ygStop();
      else ygStart();
    });
  }

  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      restartGame();
    });
  }

  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      try {
        localStorage.setItem(SOUND_KEY, soundEnabled ? '1' : '0');
      } catch (_) {}
      setSoundUi();
      if (soundEnabled) ensureAudio();
    });
  }

  window.addEventListener('resize', () => {
    resizeCanvas();
    if (gameStarted) {
      clear();
      drawPlayer();
      objects.forEach(drawObject);
    }
  });

  if (typeof ResizeObserver !== 'undefined' && stage) {
    new ResizeObserver(() => resizeCanvas()).observe(stage);
  }

  if (/[?&]rec=1(?:&|$)/.test(location.search)) {
    window.__rec = {
      getState() {
        return {
          score,
          misses: missedObjects,
          level,
          running: Boolean(gameStarted && !isPaused),
          started: gameStarted,
        };
      },
      start() {
        dismissInstruction();
        if (!gameStarted) restartGame();
        else if (isPaused) {
          isPaused = false;
          if (pauseBtn) pauseBtn.textContent = t('pause', 'Pause');
          if (pauseOverlay) pauseOverlay.hidden = true;
          ygStart();
        }
      },
      reset() {
        dismissInstruction();
        restartGame();
      },
    };
  }

  function initUi() {
    best = getBest();
    setSoundUi();
    resizeCanvas();
    updateHud();
    if (startBtn) startBtn.hidden = true;
    if (pauseBtn) pauseBtn.hidden = true;
    if (restartBtn) restartBtn.hidden = true;
  }

  window.__ygOnReady = function () {
    initUi();
  };

  if (window.__ygBoot) window.__ygBoot();
  else initUi();
})();
