// breakout.js — Yandex Games build (Serpmonn)
(function () {
  'use strict';

  const W = 240, H = 320, SCALE = 2;
  const rows = 5, cols = 8, brickW = 24, brickH = 10, gap = 4;
  const bestKey = 'breakout_best_yg_v1';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);

  const paddle = { w: 48, h: 8, x: (W - 48) / 2, y: H - 20, speed: 4, vx: 0 };
  const ballInit = { x: W / 2, y: H / 2, r: 4, vx: 2.6, vy: -2.4 };
  let ball = { ...ballInit };

  const offsetX = (W - (cols * brickW + (cols - 1) * gap)) / 2;
  const offsetY = 30;
  let bricks = [];

  let best = parseInt(localStorage.getItem(bestKey) || '0', 10);
  const $ = (id) => document.getElementById(id);
  $('best').textContent = String(best);

  let score = 0, lives = 3, running = false, adShownThisRound = false;
  let endState = null; // null | 'gameover' | 'win'

  function t(key, fallback) {
    return (window.i18n && window.i18n[key]) || fallback;
  }
  function ygStart() {
    if (typeof window.__ygGameplayStart === 'function') window.__ygGameplayStart();
  }
  function ygStop() {
    if (typeof window.__ygGameplayStop === 'function') window.__ygGameplayStop();
  }

  function resetBricks() {
    bricks = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        bricks.push({
          x: offsetX + c * (brickW + gap),
          y: offsetY + r * (brickH + gap),
          w: brickW,
          h: brickH,
          alive: true,
          v: rows - r,
        });
      }
    }
  }

  function reset(all = true) {
    if (all) {
      score = 0;
      lives = 3;
      adShownThisRound = false;
      endState = null;
    }
    ball = { ...ballInit };
    paddle.x = (W - paddle.w) / 2;
    paddle.vx = 0;
    resetBricks();
    $('score').textContent = String(score);
    $('lives').textContent = String(lives);
    running = false;
    ygStop();
    draw();
  }

  function start() {
    running = true;
    ygStart();
  }
  function pause() {
    running = false;
    ygStop();
  }

  function showAdOnce() {
    if (adShownThisRound || !window.showFullScreenAd) return;
    adShownThisRound = true;
    setTimeout(() => {
      try {
        window.showFullScreenAd();
      } catch (_) {}
    }, 700);
  }

  function update() {
    if (!running) return;

    paddle.x += paddle.vx;
    if (paddle.x < 4) paddle.x = 4;
    if (paddle.x + paddle.w > W - 4) paddle.x = W - 4 - paddle.w;

    ball.x += ball.vx;
    ball.y += ball.vy;

    if (ball.x - ball.r < 0) {
      ball.x = ball.r;
      ball.vx *= -1;
    }
    if (ball.x + ball.r > W) {
      ball.x = W - ball.r;
      ball.vx *= -1;
    }
    if (ball.y - ball.r < 0) {
      ball.y = ball.r;
      ball.vy *= -1;
    }

    if (ball.y - ball.r > H) {
      lives -= 1;
      $('lives').textContent = String(lives);
      running = false;
      ygStop();
      if (lives <= 0) {
        gameOver();
        return;
      }
      ball = { ...ballInit };
    }

    if (
      ball.y + ball.r >= paddle.y &&
      ball.y - ball.r <= paddle.y + paddle.h &&
      ball.x >= paddle.x &&
      ball.x <= paddle.x + paddle.w
    ) {
      ball.y = paddle.y - ball.r;
      ball.vy *= -1;
      const hit = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
      ball.vx = 3.2 * hit;
    }

    for (const b of bricks) {
      if (!b.alive) continue;
      if (
        ball.x + ball.r > b.x &&
        ball.x - ball.r < b.x + b.w &&
        ball.y + ball.r > b.y &&
        ball.y - ball.r < b.y + b.h
      ) {
        b.alive = false;
        score += b.v;
        $('score').textContent = String(score);
        if (score > best) {
          best = score;
          localStorage.setItem(bestKey, String(best));
          $('best').textContent = String(best);
        }
        ball.vy *= -1;
        break;
      }
    }

    if (bricks.every((b) => !b.alive)) {
      running = false;
      win();
    }
  }

  function draw() {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#1d2735');
    grad.addColorStop(1, '#0e131b');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    for (const b of bricks) {
      if (!b.alive) continue;
      ctx.fillStyle = b.v >= 3 ? '#2ecc71' : b.v === 2 ? '#3498db' : '#9b59b6';
      ctx.fillRect(b.x, b.y, b.w, b.h);
    }

    ctx.fillStyle = '#dc3545';
    ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);

    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(String(score), 8, 18);
  }

  function paintEndOverlay(kind) {
    draw();
    ctx.fillStyle = kind === 'win' ? 'rgba(0,0,0,.45)' : 'rgba(0,0,0,.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText(
      kind === 'win' ? t('winMessage', 'You win!') : t('gameOver', 'Game over'),
      W / 2,
      H / 2 - 10
    );
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(t('pressRToRestart', 'Press R — restart'), W / 2, H / 2 + 16);
  }

  function gameOver() {
    endState = 'gameover';
    ygStop();
    paintEndOverlay('gameover');
    showAdOnce();
  }

  function win() {
    endState = 'win';
    ygStop();
    paintEndOverlay('win');
    showAdOnce();
  }

  function loop() {
    update();
    if (endState) paintEndOverlay(endState);
    else draw();
    requestAnimationFrame(loop);
  }

  function setPaddle(vx) {
    paddle.vx = vx;
  }

  document.addEventListener(
    'keydown',
    (e) => {
      const code = e.code || '';
      const key = (e.key || '').toLowerCase();
      let handled = true;
      if (code === 'ArrowLeft' || code === 'KeyA' || key === 'arrowleft' || key === 'a') setPaddle(-paddle.speed);
      else if (code === 'ArrowRight' || code === 'KeyD' || key === 'arrowright' || key === 'd') setPaddle(paddle.speed);
      else if (code === 'Space' || key === ' ' || key === 'spacebar') running ? pause() : start();
      else if (code === 'KeyR' || key === 'r') reset(true);
      else handled = false;
      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true
  );

  document.addEventListener(
    'keyup',
    (e) => {
      const code = e.code || '';
      const key = (e.key || '').toLowerCase();
      if (
        code === 'ArrowLeft' ||
        code === 'KeyA' ||
        code === 'ArrowRight' ||
        code === 'KeyD' ||
        key === 'arrowleft' ||
        key === 'a' ||
        key === 'arrowright' ||
        key === 'd'
      ) {
        setPaddle(0);
        e.preventDefault();
      }
    },
    true
  );

  document.getElementById('btnStart').addEventListener('click', () => (running ? pause() : start()));
  document.getElementById('btnReset').addEventListener('click', () => reset(true));

  let touching = false;
  canvas.addEventListener(
    'touchstart',
    (e) => {
      touching = true;
      e.preventDefault();
      if (!running) start();
      const rect = canvas.getBoundingClientRect();
      const x = (e.touches[0].clientX - rect.left) / (rect.width / W);
      paddle.x = Math.max(4, Math.min(x - paddle.w / 2, W - paddle.w - 4));
    },
    { passive: false }
  );
  canvas.addEventListener(
    'touchmove',
    (e) => {
      if (!touching) return;
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const x = (e.touches[0].clientX - rect.left) / (rect.width / W);
      paddle.x = Math.max(4, Math.min(x - paddle.w / 2, W - paddle.w - 4));
    },
    { passive: false }
  );
  canvas.addEventListener('touchend', () => {
    touching = false;
  });

  window.__ygOnReady = function () {
    reset(true);
    loop();
  };

  if (/[?&]rec=1(?:&|$)/.test(location.search)) {
    window.__rec = {
      getState() {
        return {
          ball: { x: ball.x, y: ball.y, r: ball.r, vx: ball.vx, vy: ball.vy },
          paddle: { x: paddle.x, y: paddle.y, w: paddle.w, h: paddle.h },
          running,
          lives,
          score,
          endState,
          W,
          H,
        };
      },
      setPaddle,
      start,
      pause,
      reset,
    };
  }

  if (window.__ygBoot) window.__ygBoot();
  else {
    reset(true);
    loop();
  }
})();
