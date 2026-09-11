// flappy.js — Yandex Games build (Serpmonn)
(function () {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const W = 240;
  const H = 320;
  const SCALE = 2;
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);

  const gap = 60;
  const pipeWidth = 26;
  const floorY = H - 20;
  const gravity = 0.35;
  const flapVel = -5.2;
  const pipeSpeed = 1.8;

  const btnStart = document.getElementById('btnStart');
  const btnReset = document.getElementById('btnReset');
  const $ = (id) => document.getElementById(id);

  const bestKey = 'flappy_best_score_yg_v1';

  function t(key, fallback) {
    return (window.i18n && window.i18n[key]) || fallback;
  }
  function tVar(key, fallback, score) {
    return t(key, fallback).replace('{score}', String(score));
  }
  function ygStart() {
    if (typeof window.__ygGameplayStart === 'function') window.__ygGameplayStart();
  }
  function ygStop() {
    if (typeof window.__ygGameplayStop === 'function') window.__ygGameplayStop();
  }

  let best = parseInt(localStorage.getItem(bestKey) || '0', 10);
  $('best').textContent = String(best);

  let bird, pipes, score, alive, started, gameActive, adShownThisRound;

  function reset() {
    bird = { x: 40, y: H / 2, vy: 0, r: 6 };
    pipes = [];
    score = 0;
    alive = true;
    started = false;
    gameActive = false;
    adShownThisRound = false;
    spawnPipe();
    updateScore();
    ygStop();
  }

  function startGame() {
    started = true;
    gameActive = true;
    alive = true;
    ygStart();
  }

  function fullRestart() {
    reset();
    startGame();
  }

  function drawSceneBase() {
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#6dd5fa');
    grad.addColorStop(1, '#2980b9');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#2ecc71';
    for (const p of pipes) {
      ctx.fillRect(p.x, 0, pipeWidth, p.top);
      ctx.fillRect(p.x, p.top + gap, pipeWidth, H - (p.top + gap));
    }

    ctx.fillStyle = '#1f2a38';
    ctx.fillRect(0, floorY, W, H - floorY);

    ctx.fillStyle = '#f1c40f';
    ctx.beginPath();
    ctx.arc(bird.x, bird.y, bird.r, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawWelcomeScreen() {
    drawSceneBase();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText(t('welcomeTitle', 'Flappy Serpmonn'), W / 2, H / 2 - 48);
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(t('welcomeLine1', 'Press SPACE or CLICK'), W / 2, H / 2 - 12);
    ctx.fillText(t('welcomeLine2', 'or START'), W / 2, H / 2 + 4);
    ctx.fillText(t('welcomeLine3', 'to begin'), W / 2, H / 2 + 20);
    ctx.fillStyle = '#f1c40f';
    ctx.fillText(tVar('yourBest', 'Best: {score}', best), W / 2, H / 2 + 44);
  }

  function spawnPipe() {
    const topH = 30 + Math.floor(Math.random() * (H - gap - 80));
    pipes.push({ x: W + 20, top: topH, passed: false });
  }

  function circleRectCollide(cx, cy, cr, r) {
    const testX = Math.max(r.x, Math.min(cx, r.x + r.w));
    const testY = Math.max(r.y, Math.min(cy, r.y + r.h));
    const dx = cx - testX;
    const dy = cy - testY;
    return dx * dx + dy * dy <= cr * cr;
  }

  function updateScore() {
    $('score').textContent = String(score);
  }

  function drawGame() {
    drawSceneBase();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(String(score), 8, 18);
  }

  function showGameOver() {
    gameActive = false;
    ygStop();
    drawGame();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.fillText(t('gameOver', 'Game over'), W / 2, H / 2 - 40);
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(tVar('yourScore', 'Score: {score}', score), W / 2, H / 2 - 14);
    if (score === best && score > 0) {
      ctx.fillStyle = '#f1c40f';
      ctx.fillText(t('newRecord', 'New record!'), W / 2, H / 2 + 8);
      ctx.fillStyle = '#fff';
    }
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillText(t('restartLine1', 'SPACE / R — again'), W / 2, H / 2 + 36);
    ctx.fillText(t('restartLine2', 'or RESTART'), W / 2, H / 2 + 52);

    if (!adShownThisRound && window.showFullScreenAd) {
      adShownThisRound = true;
      setTimeout(() => {
        try {
          window.showFullScreenAd();
        } catch (_) {}
      }, 800);
    }
  }

  function step() {
    if (!gameActive || !alive) return;

    bird.vy += gravity;
    bird.y += bird.vy;

    if (bird.y + bird.r > floorY) {
      bird.y = floorY - bird.r;
      alive = false;
      showGameOver();
      return;
    }
    if (bird.y - bird.r < 0) {
      bird.y = bird.r;
      bird.vy = 0;
    }

    for (let i = 0; i < pipes.length; i++) {
      const p = pipes[i];
      p.x -= pipeSpeed;
      if (!p.passed && p.x + pipeWidth < bird.x) {
        p.passed = true;
        score += 1;
        updateScore();
        if (score > best) {
          best = score;
          localStorage.setItem(bestKey, String(best));
          $('best').textContent = String(best);
        }
      }
    }

    if (pipes.length && pipes[0].x + pipeWidth < -10) pipes.shift();
    if (!pipes.length || pipes[pipes.length - 1].x < W - 110) spawnPipe();

    for (const p of pipes) {
      const topRect = { x: p.x, y: 0, w: pipeWidth, h: p.top };
      const botRect = { x: p.x, y: p.top + gap, w: pipeWidth, h: H - (p.top + gap) };
      if (
        circleRectCollide(bird.x, bird.y, bird.r, topRect) ||
        circleRectCollide(bird.x, bird.y, bird.r, botRect)
      ) {
        alive = false;
        showGameOver();
        return;
      }
    }

    drawGame();
  }

  function flap() {
    if (gameActive && alive) bird.vy = flapVel;
  }

  function handleGameStart() {
    if (!started) startGame();
    else if (!gameActive) fullRestart();
  }

  canvas.addEventListener('pointerdown', () => {
    if (!started || !gameActive) handleGameStart();
    else flap();
  });

  canvas.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault();
      if (!started || !gameActive) handleGameStart();
      else flap();
    },
    { passive: false }
  );

  document.addEventListener(
    'keydown',
    (e) => {
      const code = e.code || '';
      const key = (e.key || '').toLowerCase();
      let handled = false;
      if (code === 'Space' || key === ' ' || key === 'spacebar') {
        handled = true;
        if (!started || !gameActive) handleGameStart();
        else flap();
      } else if (code === 'KeyR' || key === 'r' || key === 'к') {
        handled = true;
        fullRestart();
      } else if (code === 'Enter' || key === 'enter') {
        handled = true;
        if (!started || !gameActive) handleGameStart();
        else flap();
      }
      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true
  );

  btnStart.addEventListener('click', () => fullRestart());
  btnReset.addEventListener('click', () => {
    reset();
    drawWelcomeScreen();
    btnReset.blur();
  });

  function loop() {
    if (gameActive) step();
    else if (!started) drawWelcomeScreen();
    requestAnimationFrame(loop);
  }

  window.__ygOnReady = function () {
    reset();
    loop();
  };

  if (/[?&]rec=1(?:&|$)/.test(location.search)) {
    window.__rec = {
      getState() {
        return {
          bird: bird ? { x: bird.x, y: bird.y, vy: bird.vy, r: bird.r } : null,
          pipes: (pipes || []).map((p) => ({ x: p.x, top: p.top, passed: p.passed })),
          alive,
          started,
          gameActive,
          score,
          gap,
          pipeWidth,
          floorY: floorY,
          H,
          W,
        };
      },
      flap,
      start: handleGameStart,
      restart: fullRestart,
    };
  }

  if (window.__ygBoot) window.__ygBoot();
  else {
    reset();
    loop();
  }
})();
