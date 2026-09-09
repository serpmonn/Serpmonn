// snake.js — Yandex Games build (Serpmonn)
(function () {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const CELL_SIZE = 20;
  const GRID_SIZE = 24;
  canvas.width = canvas.height = GRID_SIZE * CELL_SIZE;

  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const speedEl = document.getElementById('speed');
  const btnStart = document.getElementById('btnStart');
  const btnPause = document.getElementById('btnPause');
  const btnReset = document.getElementById('btnReset');

  const bestKey = 'snake_best_score_yg_v1';
  let best = parseInt(localStorage.getItem(bestKey) || '0', 10);
  bestEl.textContent = String(best);

  let snake, dir, nextDir, food, score, tickMs, timer, paused, alive, adShownThisRound;

  function ygStart() {
    if (typeof window.__ygGameplayStart === 'function') window.__ygGameplayStart();
  }
  function ygStop() {
    if (typeof window.__ygGameplayStop === 'function') window.__ygGameplayStop();
  }

  function reset() {
    snake = [
      { x: 12, y: 12 },
      { x: 11, y: 12 },
      { x: 10, y: 12 },
    ];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    food = spawnFood();
    score = 0;
    scoreEl.textContent = '0';
    tickMs = 140;
    updateSpeedDisplay();
    paused = false;
    alive = true;
    adShownThisRound = false;
    startGameLoop();
  }

  function updateSpeedDisplay() {
    const multiplier = (160 - tickMs) / 20 + 1;
    speedEl.textContent = Math.max(1, Math.round(multiplier)) + 'x';
  }

  function spawnFood() {
    while (true) {
      const foodPos = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      if (!snake.some((segment) => segment.x === foodPos.x && segment.y === foodPos.y)) {
        return foodPos;
      }
    }
  }

  function startGameLoop() {
    stopGameLoop(false);
    timer = setInterval(step, tickMs);
    if (alive && !paused) ygStart();
  }

  function stopGameLoop(notify = true) {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    if (notify) ygStop();
  }

  function step() {
    if (paused || !alive) return;

    dir = nextDir;
    const head = {
      x: snake[0].x + dir.x,
      y: snake[0].y + dir.y,
    };

    head.x = (head.x + GRID_SIZE) % GRID_SIZE;
    head.y = (head.y + GRID_SIZE) % GRID_SIZE;

    if (snake.some((segment) => segment.x === head.x && segment.y === head.y)) {
      gameOver();
      return;
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      score += 1;
      scoreEl.textContent = String(score);
      if (score > best) {
        best = score;
        bestEl.textContent = String(best);
        localStorage.setItem(bestKey, String(best));
      }
      food = spawnFood();
      if (tickMs > 60) {
        tickMs -= 2;
        updateSpeedDisplay();
        startGameLoop();
      }
    } else {
      snake.pop();
    }

    draw();
  }

  function draw() {
    ctx.fillStyle = '#1b1b1d';
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

    ctx.fillStyle = '#e74c3c';
    roundRect(food.x * CELL_SIZE + 2, food.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4, 4, true);

    snake.forEach((segment, index) => {
      ctx.fillStyle = index === 0 ? '#27ae60' : '#2ecc71';
      roundRect(
        segment.x * CELL_SIZE + 1,
        segment.y * CELL_SIZE + 1,
        CELL_SIZE - 2,
        CELL_SIZE - 2,
        4,
        true
      );
    });
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

  function gameOverText(key, fallback) {
    return (window.i18n && window.i18n[key]) || fallback;
  }

  function gameOver() {
    alive = false;
    stopGameLoop(true);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 28px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.fillText(gameOverText('gameOver', 'Игра окончена'), canvas.width / 2, canvas.height / 2 - 10);

    ctx.font = '16px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.fillText(
      gameOverText('pressRToRestart', 'Нажмите R — заново'),
      canvas.width / 2,
      canvas.height / 2 + 18
    );

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
    // block 180° reverse
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

  canvas.setAttribute('tabindex', '0');
  canvas.style.outline = 'none';
  canvas.addEventListener('pointerdown', focusPlayfield);

  function onKeyDown(e) {
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
      // TV remote OK/Enter → pause toggle (or resume); same as Space/Esc
      paused = !paused;
      if (!paused && alive) startGameLoop();
      else stopGameLoop(true);
    } else if (code === 'KeyR' || key === 'r') {
      reset();
    } else {
      handled = false;
    }

    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  // capture=true: arrows won't get eaten by focused buttons / iframe chrome
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
    if (!alive) reset();
    else {
      paused = false;
      startGameLoop();
    }
    focusPlayfield();
  });

  btnPause.addEventListener('click', () => {
    paused = !paused;
    if (!paused) startGameLoop();
    else stopGameLoop(true);
    focusPlayfield();
  });

  btnReset.addEventListener('click', () => {
    reset();
    focusPlayfield();
  });

  // Wait for Yandex SDK ready, then start
  window.__ygOnReady = function () {
    reset();
    draw();
    focusPlayfield();
  };

  if (window.__ygBoot) {
    window.__ygBoot();
  } else {
    reset();
    draw();
  }
})();
