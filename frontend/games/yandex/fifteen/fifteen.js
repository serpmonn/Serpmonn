// fifteen.js — Yandex Games build (Serpmonn)
(function () {
  'use strict';

  const BOARD_SIZE = 4;
  const TOTAL_TILES = BOARD_SIZE * BOARD_SIZE - 1;
  const bestKey = 'fifteen_best_yg_v1';

  const gameBoard = document.getElementById('game');
  const btnNewGame = document.getElementById('btnNewGame');
  const btnReset = document.getElementById('btnReset');
  const endOverlay = document.getElementById('end-overlay');
  const endMessage = document.getElementById('end-message');
  const $ = (id) => document.getElementById(id);

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

  let tiles = [];
  let emptyIndex = 15;
  let moves = 0;
  let time = 0;
  let timer = null;
  let gameStarted = false;
  let gameSolved = false;
  let adShownThisRound = false;

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

  function shuffleTiles() {
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = tiles[i];
      tiles[i] = tiles[j];
      tiles[j] = tmp;
    }
    emptyIndex = tiles.indexOf(0);
  }

  function isSolvable() {
    let inversions = 0;
    for (let i = 0; i < tiles.length; i++) {
      for (let j = i + 1; j < tiles.length; j++) {
        if (tiles[i] !== 0 && tiles[j] !== 0 && tiles[i] > tiles[j]) inversions++;
      }
    }
    const emptyIdx = tiles.indexOf(0);
    const emptyRowFromBottom = BOARD_SIZE - Math.floor(emptyIdx / BOARD_SIZE);
    return (emptyRowFromBottom % 2 === 0) === (inversions % 2 === 1);
  }

  function isSolved() {
    for (let i = 0; i < TOTAL_TILES; i++) {
      if (tiles[i] !== i + 1) return false;
    }
    return tiles[TOTAL_TILES] === 0;
  }

  function initGame() {
    tiles = Array.from({ length: TOTAL_TILES }, (_, i) => i + 1);
    tiles.push(0);
    do {
      shuffleTiles();
    } while (!isSolvable() || isSolved());

    moves = 0;
    $('moves').textContent = '0';
    time = 0;
    $('time').textContent = '0';
    gameStarted = false;
    gameSolved = false;
    adShownThisRound = false;
    hideEnd();
    ygStop();
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    renderBoard();
  }

  function renderBoard() {
    gameBoard.innerHTML = '';
    tiles.forEach((value, index) => {
      const tile = document.createElement('div');
      tile.className = 'tile';
      if (value !== 0) {
        tile.textContent = String(value);
        tile.dataset.value = String(value);
        tile.dataset.index = String(index);
        tile.addEventListener('click', () => moveTile(index));
        if (gameSolved) tile.classList.add('solved');
      } else {
        tile.classList.add('empty');
      }
      gameBoard.appendChild(tile);
    });
  }

  function canMove(index) {
    const row = Math.floor(index / BOARD_SIZE);
    const col = index % BOARD_SIZE;
    const emptyRow = Math.floor(emptyIndex / BOARD_SIZE);
    const emptyCol = emptyIndex % BOARD_SIZE;
    return (Math.abs(row - emptyRow) === 1 && col === emptyCol) || (Math.abs(col - emptyCol) === 1 && row === emptyRow);
  }

  function startGame() {
    if (gameStarted || gameSolved) return;
    gameStarted = true;
    ygStart();
    timer = setInterval(() => {
      time++;
      $('time').textContent = String(time);
    }, 1000);
  }

  function moveTile(index) {
    if (gameSolved) return;
    if (!gameStarted) startGame();
    if (!canMove(index)) return;
    const tmp = tiles[index];
    tiles[index] = tiles[emptyIndex];
    tiles[emptyIndex] = tmp;
    emptyIndex = index;
    moves++;
    $('moves').textContent = String(moves);
    renderBoard();
    checkSolution();
  }

  function checkSolution() {
    if (!isSolved()) return;
    gameSolved = true;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    if (moves < best || best === 0) {
      best = moves;
      localStorage.setItem(bestKey, String(best));
      $('best').textContent = String(best);
    }
    renderBoard();
    showEnd(t('winMessage', 'Solved!'));
  }

  // Swipe on board (moves tile into empty)
  let touchStartX = 0;
  let touchStartY = 0;
  gameBoard.addEventListener(
    'touchstart',
    (e) => {
      if (!e.touches.length) return;
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    },
    { passive: true }
  );
  gameBoard.addEventListener(
    'touchend',
    (e) => {
      if (gameSolved || !e.changedTouches.length) return;
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      let targetIndex = -1;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 24) {
        targetIndex = dx > 0 ? emptyIndex - 1 : emptyIndex + 1;
        if (targetIndex < 0 || targetIndex >= tiles.length) return;
        if (Math.floor(targetIndex / BOARD_SIZE) !== Math.floor(emptyIndex / BOARD_SIZE)) return;
      } else if (Math.abs(dy) > 24) {
        targetIndex = dy > 0 ? emptyIndex - BOARD_SIZE : emptyIndex + BOARD_SIZE;
        if (targetIndex < 0 || targetIndex >= tiles.length) return;
      } else {
        return;
      }
      if (canMove(targetIndex)) moveTile(targetIndex);
    },
    { passive: true }
  );

  function handleKeyDown(e) {
    if (e.code === 'KeyR' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      initGame();
      return;
    }
    if (gameSolved) return;
    let targetIndex = -1;
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        targetIndex = emptyIndex + BOARD_SIZE;
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        targetIndex = emptyIndex - BOARD_SIZE;
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        targetIndex = emptyIndex + 1;
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        targetIndex = emptyIndex - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    if (targetIndex >= 0 && targetIndex < tiles.length && canMove(targetIndex)) moveTile(targetIndex);
  }

  btnNewGame.addEventListener('click', () => {
    initGame();
    btnNewGame.blur();
  });
  btnReset.addEventListener('click', () => {
    initGame();
    btnReset.blur();
  });
  window.addEventListener('keydown', handleKeyDown, true);

  window.__ygOnReady = function () {
    initGame();
  };
  if (window.__ygBoot) window.__ygBoot();
  else initGame();
})();
