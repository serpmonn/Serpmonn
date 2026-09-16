// rat.js — Yandex Games build (Serpmonn Fat Rat)
(function () {
  'use strict';

  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const fatBar = document.getElementById('fatBar');
  const startBtn = document.getElementById('startBtn');
  const $ = (id) => document.getElementById(id);

  const W = canvas.width;
  const H = canvas.height;
  const CELL = 28;
  const COLS = Math.floor(W / CELL);
  const ROWS = Math.floor(H / CELL);
  const MAX_FAT = 60;
  const bestKey = 'rat_best_yg_v1';

  let rat, food, bonusFood, walls, eaten, weight, best, gameRunning, animFrame;
  let adShownThisRound = false;
  let clickTarget = null;
  let path = [];
  let stepTimer = 0;
  let bonusTimer = 0;
  let bonusSpawnTimer = 0;
  let lastTime = 0;

  best = parseFloat(localStorage.getItem(bestKey) || '0') || 0;

  function t(key, fallback) {
    return (window.i18n && window.i18n[key]) || fallback;
  }

  function ygStart() {
    if (typeof window.__ygGameplayStart === 'function') window.__ygGameplayStart();
  }
  function ygStop() {
    if (typeof window.__ygGameplayStop === 'function') window.__ygGameplayStop();
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
        if (!isWall(x, y) && !(rat && rat.x === x && rat.y === y)) free.push({ x, y });
      }
    }
    return free;
  }

  function randomFree() {
    const f = freeCells();
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
        const pathOut = [];
        let node = `${target.x},${target.y}`;
        while (visited.get(node)) {
          pathOut.unshift(node);
          node = visited.get(node);
        }
        return pathOut.map((k) => {
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

  function drawWalls() {
    ctx.fillStyle = '#23262f';
    for (let x = 0; x < COLS; x++) {
      for (let y = 0; y < ROWS; y++) {
        if (isWall(x, y)) {
          ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
          ctx.fillStyle = 'rgba(255,255,255,0.04)';
          ctx.fillRect(x * CELL, y * CELL, CELL, 2);
          ctx.fillStyle = '#23262f';
        }
      }
    }
  }

  function drawFood(f, isBonus) {
    if (!f) return;
    const cx = f.x * CELL + CELL / 2;
    const cy = f.y * CELL + CELL / 2;
    const r = isBonus ? CELL / 2 - 4 : CELL / 2 - 5;
    ctx.shadowColor = isBonus ? '#a78bfa' : '#ff6b35';
    ctx.shadowBlur = isBonus ? 14 : 10;
    ctx.fillStyle = isBonus ? '#a78bfa' : '#ff6b35';
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  function lerpColor(a, b, t) {
    const ah = parseInt(a.slice(1), 16);
    const bh = parseInt(b.slice(1), 16);
    const ar = (ah >> 16) & 0xff;
    const ag = (ah >> 8) & 0xff;
    const ab = ah & 0xff;
    const br = (bh >> 16) & 0xff;
    const bg = (bh >> 8) & 0xff;
    const bb = bh & 0xff;
    const r = Math.round(ar + (br - ar) * t);
    const g = Math.round(ag + (bg - ag) * t);
    const bl2 = Math.round(ab + (bb - ab) * t);
    return `rgb(${r},${g},${bl2})`;
  }

  function drawRat() {
    if (!rat) return;
    const fatT = Math.min(weight / MAX_FAT, 1);
    const baseR = CELL / 2 - 3;
    const bodyR = baseR + fatT * baseR * 1.8;
    const cx = rat.drawX + CELL / 2;
    const cy = rat.drawY + CELL / 2;

    ctx.fillStyle = 'rgba(0,0,0,0.25)';
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

    ctx.fillStyle = '#e8c0a0';
    ctx.beginPath();
    ctx.ellipse(
      hx - (rat.dirX || 1) * headR * 0.3,
      hy - headR * 0.7,
      headR * 0.4,
      headR * 0.3,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.fillStyle = '#1a0505';
    ctx.beginPath();
    ctx.arc(
      hx + (rat.dirX || 1) * headR * 0.2,
      hy - headR * 0.15,
      Math.max(1.5, headR * 0.2),
      0,
      Math.PI * 2
    );
    ctx.fill();

    const tx = cx - (rat.dirX || 1) * bodyR;
    ctx.strokeStyle = '#a07050';
    ctx.lineWidth = Math.max(1, 2 - fatT);
    ctx.beginPath();
    ctx.moveTo(tx, cy);
    ctx.quadraticCurveTo(tx - (rat.dirX || 1) * 12, cy + 10, tx - (rat.dirX || 1) * 20, cy + 5);
    ctx.stroke();

    if (fatT > 0.5) {
      const rings = Math.floor(fatT * 3);
      ctx.strokeStyle = `rgba(255,160,60,${0.15 + fatT * 0.2})`;
      ctx.lineWidth = 1.5;
      for (let i = 1; i <= rings; i++) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, bodyR * (0.5 + i * 0.2), bodyR * (0.4 + i * 0.15), 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0e0f11';
    ctx.fillRect(0, 0, W, H);
    if (walls) drawWalls();
    drawFood(food, false);
    drawFood(bonusFood, true);
    drawRat();
  }

  function cellFromClient(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mx = Math.floor(((clientX - rect.left) * scaleX) / CELL);
    const my = Math.floor(((clientY - rect.top) * scaleY) / CELL);
    return { x: mx, y: my };
  }

  function setTarget(x, y) {
    if (!gameRunning) return false;
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return false;
    if (isWall(x, y)) return false;
    clickTarget = { x, y };
    path = [];
    return true;
  }

  function clickCell(x, y) {
    return setTarget(x, y);
  }

  canvas.addEventListener('click', (e) => {
    if (!gameRunning) return;
    const { x, y } = cellFromClient(e.clientX, e.clientY);
    setTarget(x, y);
  });
  canvas.addEventListener(
    'touchend',
    (e) => {
      if (!gameRunning) return;
      e.preventDefault();
      const touch = e.changedTouches[0];
      const { x, y } = cellFromClient(touch.clientX, touch.clientY);
      setTarget(x, y);
    },
    { passive: false }
  );

  function getSpeed() {
    const fatT = Math.min(weight / MAX_FAT, 1);
    return Math.max(1.2, 6 - fatT * 4.8);
  }

  function spawnBonus() {
    bonusFood = randomFree();
    bonusTimer = 0;
  }
  function spawnBonusChance() {
    if (!bonusFood && Math.random() < 0.18) spawnBonus();
  }

  function saveBest() {
    if (weight > best) {
      best = weight;
      localStorage.setItem(bestKey, String(best));
    }
  }

  function updateUI() {
    $('eaten').textContent = String(eaten);
    $('weight').textContent = weight.toFixed(1);
    $('best').textContent = best.toFixed(1);
    const fatT = Math.min(weight / MAX_FAT, 1) * 100;
    fatBar.style.width = fatT + '%';
  }

  function gameLoop(ts) {
    const dt = Math.min((ts - lastTime) / 1000, 0.1);
    lastTime = ts;

    if (!gameRunning) return;

    const targetX = rat.x * CELL;
    const targetY = rat.y * CELL;
    rat.drawX += (targetX - rat.drawX) * Math.min(1, dt * 14);
    rat.drawY += (targetY - rat.drawY) * Math.min(1, dt * 14);

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
      }

      if (rat.x === food.x && rat.y === food.y) {
        eaten++;
        weight = Math.round((weight + 0.3 + Math.random() * 0.2) * 10) / 10;
        saveBest();
        food = randomFree();
        path = [];
        clickTarget = null;
        spawnBonusChance();
        updateUI();
        if (weight >= MAX_FAT) {
          endGame();
          return;
        }
      }
      if (bonusFood && rat.x === bonusFood.x && rat.y === bonusFood.y) {
        eaten += 3;
        weight = Math.round((weight + 1.2 + Math.random() * 0.5) * 10) / 10;
        saveBest();
        bonusFood = null;
        bonusTimer = 0;
        path = [];
        clickTarget = null;
        updateUI();
        if (weight >= MAX_FAT) {
          endGame();
          return;
        }
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
    food = randomFree();
    bonusFood = null;
    bonusTimer = 0;
    bonusSpawnTimer = 0;
    eaten = 0;
    weight = 0.1;
    path = [];
    clickTarget = null;
    stepTimer = 0;
    updateUI();
  }

  function showStartOverlay() {
    const titleEl = overlay.querySelector('.overlay-title');
    const subEl = overlay.querySelector('.overlay-sub');
    const scoreEl = $('overlayScore');
    if (titleEl) titleEl.textContent = t('overlayTitle', 'FAT RAT');
    if (subEl) {
      subEl.innerHTML = t(
        'overlaySub',
        'Click the maze — the rat runs toward food.<br>The fatter the rat, the slower it moves.'
      );
      subEl.hidden = false;
    }
    if (scoreEl) {
      scoreEl.hidden = true;
      scoreEl.textContent = '';
    }
    startBtn.textContent = t('start', 'START');
    overlay.classList.remove('hidden');
  }

  function endGame() {
    gameRunning = false;
    cancelAnimationFrame(animFrame);
    ygStop();
    render();

    const titleEl = overlay.querySelector('.overlay-title');
    const subEl = overlay.querySelector('.overlay-sub');
    const scoreEl = $('overlayScore');
    if (titleEl) titleEl.textContent = t('gameOverTitle', '🏆 MAX FAT!');
    if (subEl) subEl.hidden = true;
    if (scoreEl) {
      const tpl = t('gameOverScore', '{eaten} · {weight} Weight kg');
      scoreEl.textContent = tpl
        .replace('{eaten}', String(eaten))
        .replace('{weight}', weight.toFixed(1));
      scoreEl.hidden = false;
    }
    startBtn.textContent = t('playAgain', 'AGAIN');
    overlay.classList.remove('hidden');

    if (!adShownThisRound && window.showFullScreenAd) {
      adShownThisRound = true;
      setTimeout(() => {
        try {
          window.showFullScreenAd();
        } catch (_) {}
      }, 1000);
    }
  }

  function startGame() {
    init();
    overlay.classList.add('hidden');
    adShownThisRound = false;
    gameRunning = true;
    lastTime = performance.now();
    cancelAnimationFrame(animFrame);
    ygStart();
    animFrame = requestAnimationFrame(gameLoop);
    startBtn.blur();
  }

  startBtn.addEventListener('click', startGame);

  if (/[?&]rec=1(?:&|$)/.test(location.search)) {
    window.__rec = {
      getState() {
        return {
          weight,
          eaten,
          alive: gameRunning,
          best,
          food: food ? { x: food.x, y: food.y } : null,
          bonusFood: bonusFood ? { x: bonusFood.x, y: bonusFood.y } : null,
          rat: rat ? { x: rat.x, y: rat.y, dirX: rat.dirX, dirY: rat.dirY } : null,
          clickTarget: clickTarget ? { x: clickTarget.x, y: clickTarget.y } : null,
          cols: COLS,
          rows: ROWS,
          maxFat: MAX_FAT,
        };
      },
      clickCell,
      setTarget,
      start: startGame,
      init,
    };
  }

  window.__ygOnReady = function () {
    init();
    updateUI();
    showStartOverlay();
    render();
  };

  if (window.__ygBoot) window.__ygBoot();
  else {
    init();
    updateUI();
    showStartOverlay();
    render();
  }
})();
