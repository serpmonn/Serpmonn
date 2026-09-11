// coins.js — Yandex Games build (Serpmonn)
(function () {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const size = 24;
  const cells = 20;
  canvas.width = canvas.height = size * cells;

  const btnStart = document.getElementById('btnStart');
  const btnReset = document.getElementById('btnReset');
  const $ = (id) => document.getElementById(id);

  const bestKey = 'coins_best_yg_v1';

  function t(key, fallback) {
    return (window.i18n && window.i18n[key]) || fallback;
  }
  function ygStart() {
    if (typeof window.__ygGameplayStart === 'function') window.__ygGameplayStart();
  }
  function ygStop() {
    if (typeof window.__ygGameplayStop === 'function') window.__ygGameplayStop();
  }

  let best = parseInt(localStorage.getItem(bestKey) || '0', 10);
  $('best').textContent = String(best);

  let player, coins, bads, score, timeLeft, secTimer, tickTimer, tickMs, tickCount, started, alive, adShownThisRound;

  function reset() {
    stop();
    player = { x: Math.floor(cells / 2), y: Math.floor(cells / 2), vx: 0, vy: 0 };
    coins = [];
    bads = [];
    score = 0;
    $('score').textContent = '0';
    timeLeft = 60;
    $('time').textContent = String(timeLeft);
    tickMs = 300;
    tickCount = 0;
    started = false;
    alive = true;
    adShownThisRound = false;
    ygStop();
    spawnCoins(5);
    spawnBads(2);
    draw();
  }

  function spawnCoins(n) {
    for (let i = 0; i < n; i++) coins.push(randEmptyCell());
  }
  function spawnBads(n) {
    for (let i = 0; i < n; i++) bads.push(randEmptyCell());
  }

  function randEmptyCell() {
    while (true) {
      const p = {
        x: Math.floor(Math.random() * cells),
        y: Math.floor(Math.random() * cells),
      };
      if (p.x === player.x && p.y === player.y) continue;
      if (coins.some((c) => c.x === p.x && c.y === p.y)) continue;
      if (bads.some((b) => b.x === p.x && b.y === p.y)) continue;
      return p;
    }
  }

  function start() {
    if (started) return;
    started = true;
    ygStart();
    secTimer = setInterval(() => {
      timeLeft -= 1;
      $('time').textContent = String(timeLeft);
      if (timeLeft <= 0) {
        alive = false;
        stop();
        gameOver();
      }
    }, 1000);
    tickTimer = setInterval(() => {
      tickCount++;
      step();
      draw();
    }, tickMs);
  }

  function stop() {
    if (secTimer) {
      clearInterval(secTimer);
      secTimer = null;
    }
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
    ygStop();
  }

  function step() {
    player.x = (player.x + player.vx + cells) % cells;
    player.y = (player.y + player.vy + cells) % cells;

    for (let i = coins.length - 1; i >= 0; i--) {
      if (coins[i].x === player.x && coins[i].y === player.y) {
        coins.splice(i, 1);
        score += 1;
        $('score').textContent = String(score);
        if (score > best) {
          best = score;
          localStorage.setItem(bestKey, String(best));
          $('best').textContent = String(best);
        }
      }
    }
    if (coins.length < 5) spawnCoins(1);

    for (const b of bads) {
      if (b.x === player.x && b.y === player.y) {
        alive = false;
        stop();
        gameOver();
        return;
      }
    }

    if (tickCount % 3 === 0) {
      bads = bads.map((b) => ({
        x: (b.x + (Math.random() < 0.5 ? -1 : 1) + cells) % cells,
        y: (b.y + (Math.random() < 0.5 ? -1 : 1) + cells) % cells,
      }));
    }
  }

  function draw() {
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--board').trim() || '#14171b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = 'rgba(255,255,255,.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= cells; i++) {
      ctx.beginPath();
      ctx.moveTo(i * size, 0);
      ctx.lineTo(i * size, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * size);
      ctx.lineTo(canvas.width, i * size);
      ctx.stroke();
    }

    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--coin').trim() || '#ffd54f';
    for (const c of coins) roundRect(ctx, c.x * size + 6, c.y * size + 6, size - 12, size - 12, 6, true);

    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bad').trim() || '#e74c3c';
    for (const b of bads) roundRect(ctx, b.x * size + 4, b.y * size + 4, size - 8, size - 8, 4, true);

    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--player').trim() || '#ffcc00';
    roundRect(ctx, player.x * size + 3, player.y * size + 3, size - 6, size - 6, 6, true);
  }

  function roundRect(ctx, x, y, w, h, r, fill) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
    if (fill) ctx.fill();
  }

  function gameOver() {
    ygStop();
    draw();
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 28px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.fillText(t('gameOver', 'Game over'), canvas.width / 2, canvas.height / 2 - 10);
    ctx.font = '16px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.fillText(t('pressRToRestart', 'Press R — restart'), canvas.width / 2, canvas.height / 2 + 18);

    if (!adShownThisRound && window.showFullScreenAd) {
      adShownThisRound = true;
      setTimeout(() => {
        try {
          window.showFullScreenAd();
        } catch (_) {}
      }, 800);
    }
  }

  function setDir(vx, vy) {
    player.vx = vx;
    player.vy = vy;
  }

  document.addEventListener(
    'keydown',
    (e) => {
      const k = (e.key || '').toLowerCase();
      const code = e.code || '';
      let handled = true;
      if (k === 'arrowup' || k === 'w' || code === 'ArrowUp' || code === 'KeyW') setDir(0, -1);
      else if (k === 'arrowdown' || k === 's' || code === 'ArrowDown' || code === 'KeyS') setDir(0, 1);
      else if (k === 'arrowleft' || k === 'a' || code === 'ArrowLeft' || code === 'KeyA') setDir(-1, 0);
      else if (k === 'arrowright' || k === 'd' || code === 'ArrowRight' || code === 'KeyD') setDir(1, 0);
      else if (k === 'r' || code === 'KeyR') {
        reset();
      } else handled = false;
      if (handled) {
        e.preventDefault();
        if (!started && alive && (k.startsWith('arrow') || 'wasd'.includes(k))) start();
      }
    },
    true
  );

  (function () {
    let sx = 0,
      sy = 0;
    canvas.addEventListener(
      'touchstart',
      (e) => {
        const t = e.touches[0];
        sx = t.clientX;
        sy = t.clientY;
        if (!started && alive) start();
      },
      { passive: true }
    );
    canvas.addEventListener(
      'touchend',
      (e) => {
        const t = e.changedTouches[0];
        const dx = t.clientX - sx;
        const dy = t.clientY - sy;
        if (Math.abs(dx) > Math.abs(dy)) {
          if (dx > 10) setDir(1, 0);
          else if (dx < -10) setDir(-1, 0);
        } else {
          if (dy > 10) setDir(0, 1);
          else if (dy < -10) setDir(0, -1);
        }
        sx = sy = 0;
      },
      { passive: true }
    );
  })();

  btnStart.addEventListener('click', () => {
    start();
    btnStart.blur();
  });
  btnReset.addEventListener('click', () => {
    reset();
    btnReset.blur();
  });

  if (/[?&]rec=1(?:&|$)/.test(location.search)) {
    window.__rec = {
      getState() {
        return {
          player: player ? { x: player.x, y: player.y, vx: player.vx, vy: player.vy } : null,
          coins: (coins || []).map((c) => ({ x: c.x, y: c.y })),
          bads: (bads || []).map((b) => ({ x: b.x, y: b.y })),
          score,
          timeLeft,
          started,
          alive,
          cells,
        };
      },
      setDir,
      start,
      reset,
    };
  }

  window.__ygOnReady = function () {
    reset();
  };
  if (window.__ygBoot) window.__ygBoot();
  else reset();
})();
