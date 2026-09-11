// minesweeper.js — Yandex Games build (Serpmonn)
(function () {
  'use strict';

  const SIZE = 10;
  const MINES = 15;
  const bestKey = 'mines_best_time_yg_v1';

  const boardEl = document.getElementById('board');
  const btnStart = document.getElementById('btnStart');
  const btnReset = document.getElementById('btnReset');
  const endOverlay = document.getElementById('end-overlay');
  const endMessage = document.getElementById('end-message');
  const $ = (id) => document.getElementById(id);

  function t(key, fallback) {
    return (window.i18n && window.i18n[key]) || fallback;
  }
  function formatTime(seconds) {
    return String(seconds) + t('timeSuffix', 's');
  }
  function ygStart() {
    if (typeof window.__ygGameplayStart === 'function') window.__ygGameplayStart();
  }
  function ygStop() {
    if (typeof window.__ygGameplayStop === 'function') window.__ygGameplayStop();
  }

  let bestSaved = parseInt(localStorage.getItem(bestKey) || '0', 10);
  $('best').textContent = bestSaved > 0 ? formatTime(bestSaved) : t('noRecord', '—');

  let grid, revealed, flagged, mineMap, minesPlaced, timerOn, alive, startTime, timer, adShownThisRound;

  function hideEnd() {
    endOverlay.classList.add('hidden');
  }

  function showEnd(text) {
    endMessage.textContent = text;
    endOverlay.classList.remove('hidden');
    ygStop();
    if (!adShownThisRound && window.showFullScreenAd) {
      adShownThisRound = true;
      setTimeout(() => {
        try {
          window.showFullScreenAd();
        } catch (_) {}
      }, 900);
    }
  }

  function reset() {
    grid = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    revealed = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
    flagged = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
    mineMap = Array.from({ length: SIZE }, () => Array(SIZE).fill(false));
    minesPlaced = false;
    timerOn = false;
    alive = true;
    startTime = 0;
    adShownThisRound = false;
    clearInterval(timer);
    $('time').textContent = '0';
    $('minesLeft').textContent = String(MINES);
    hideEnd();
    ygStop();
    render();
  }

  function inBounds(x, y) {
    return x >= 0 && y >= 0 && x < SIZE && y < SIZE;
  }

  function getNeighbors(x, y) {
    const out = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (!dx && !dy) continue;
        const nx = x + dx,
          ny = y + dy;
        if (inBounds(nx, ny)) out.push([nx, ny]);
      }
    }
    return out;
  }

  function placeMines(safeX, safeY) {
    let placed = 0;
    while (placed < MINES) {
      const x = Math.floor(Math.random() * SIZE);
      const y = Math.floor(Math.random() * SIZE);
      if ((x === safeX && y === safeY) || mineMap[x][y]) continue;
      mineMap[x][y] = true;
      placed++;
    }
    for (let x = 0; x < SIZE; x++) {
      for (let y = 0; y < SIZE; y++) {
        if (mineMap[x][y]) {
          grid[x][y] = -1;
          continue;
        }
        grid[x][y] = getNeighbors(x, y).reduce((acc, [nx, ny]) => acc + (mineMap[nx][ny] ? 1 : 0), 0);
      }
    }
  }

  function startTimer() {
    startTime = Date.now();
    clearInterval(timer);
    timer = setInterval(() => {
      $('time').textContent = String(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    timerOn = true;
    ygStart();
  }

  function reveal(x, y) {
    if (!alive || flagged[x][y] || revealed[x][y]) return;
    if (!minesPlaced) {
      placeMines(x, y);
      minesPlaced = true;
      if (!timerOn) startTimer();
    }
    revealed[x][y] = true;
    if (grid[x][y] === -1) {
      alive = false;
      clearInterval(timer);
      showMines();
      showEnd(t('loseMessage', 'Boom!'));
      return;
    }
    if (grid[x][y] === 0) {
      const queue = [[x, y]];
      const visited = new Set([x + ',' + y]);
      while (queue.length) {
        const [cx, cy] = queue.shift();
        for (const [nx, ny] of getNeighbors(cx, cy)) {
          const key = nx + ',' + ny;
          if (visited.has(key) || flagged[nx][ny]) continue;
          revealed[nx][ny] = true;
          visited.add(key);
          if (grid[nx][ny] === 0) queue.push([nx, ny]);
        }
      }
    }
    render();
    if (checkWin()) {
      alive = false;
      clearInterval(timer);
      const finalTime = Math.floor((Date.now() - startTime) / 1000);
      if (bestSaved === 0 || finalTime < bestSaved) {
        bestSaved = finalTime;
        localStorage.setItem(bestKey, String(finalTime));
        $('best').textContent = formatTime(finalTime);
      }
      showEnd(t('winMessage', 'You win!'));
    }
  }

  function toggleFlag(x, y) {
    if (!alive || revealed[x][y]) return;
    if (!timerOn) startTimer();
    flagged[x][y] = !flagged[x][y];
    $('minesLeft').textContent = String(Math.max(MINES - flagged.flat().filter(Boolean).length, 0));
    renderCell(x, y);
  }

  function checkWin() {
    for (let x = 0; x < SIZE; x++) {
      for (let y = 0; y < SIZE; y++) {
        if (grid[x][y] !== -1 && !revealed[x][y]) return false;
      }
    }
    return true;
  }

  function showMines() {
    for (let x = 0; x < SIZE; x++) {
      for (let y = 0; y < SIZE; y++) {
        if (mineMap[x][y]) {
          const el = getCellElement(x, y);
          if (!el) continue;
          el.classList.add('mine', 'open');
          el.textContent = '*';
        }
      }
    }
  }

  function getCellElement(x, y) {
    return document.querySelector('[data-x="' + x + '"][data-y="' + y + '"]');
  }

  function render() {
    boardEl.innerHTML = '';
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.setAttribute('data-x', String(x));
        cell.setAttribute('data-y', String(y));
        cell.addEventListener('click', (e) => {
          e.preventDefault();
          reveal(x, y);
        });
        (function () {
          let touchTimer;
          cell.addEventListener(
            'touchstart',
            (te) => {
              te.preventDefault();
              touchTimer = setTimeout(() => {
                toggleFlag(x, y);
                touchTimer = null;
              }, 400);
            },
            { passive: false }
          );
          cell.addEventListener(
            'touchend',
            (te) => {
              te.preventDefault();
              if (touchTimer) {
                clearTimeout(touchTimer);
                touchTimer = null;
                reveal(x, y);
              }
            },
            { passive: false }
          );
        })();
        cell.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          toggleFlag(x, y);
        });
        cell.addEventListener('mousedown', (e) => {
          if (e.shiftKey) {
            e.preventDefault();
            toggleFlag(x, y);
          }
        });
        if (flagged[x][y]) {
          cell.classList.add('flag');
          cell.textContent = 'F';
        } else if (revealed[x][y]) {
          cell.classList.add('open');
          const value = grid[x][y];
          if (value === -1) {
            cell.classList.add('mine');
            cell.textContent = '*';
          } else if (value > 0) {
            cell.textContent = String(value);
            cell.classList.add('n' + value);
          }
        }
        boardEl.appendChild(cell);
      }
    }
  }

  function renderCell(x, y) {
    const cell = getCellElement(x, y);
    if (!cell) return;
    cell.className = 'cell';
    if (flagged[x][y]) {
      cell.classList.add('flag');
      cell.textContent = 'F';
      return;
    }
    if (!revealed[x][y]) {
      cell.textContent = '';
      return;
    }
    cell.classList.add('open');
    const value = grid[x][y];
    if (value === -1) {
      cell.classList.add('mine');
      cell.textContent = '*';
    } else if (value > 0) {
      cell.textContent = String(value);
      cell.classList.add('n' + value);
    } else cell.textContent = '';
  }

  btnStart.addEventListener('click', () => {
    if (!timerOn) startTimer();
  });
  btnReset.addEventListener('click', () => {
    reset();
    btnReset.blur();
  });
  document.addEventListener(
    'keydown',
    (e) => {
      if ((e.code === 'KeyR' || (e.key || '').toLowerCase() === 'r') && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        reset();
      }
    },
    true
  );

  window.__ygOnReady = function () {
    reset();
  };
  if (window.__ygBoot) window.__ygBoot();
  else reset();
})();
