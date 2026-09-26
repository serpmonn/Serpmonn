// fifteen.js — Yandex Games build (undo, daily, sound, 3×3, haptic, theme, __rec)
(function () {
  'use strict';

  const gameBoard = document.getElementById('game');
  const btnNewGame = document.getElementById('btnNewGame');
  const btnReset = document.getElementById('btnReset');
  const btnUndo = document.getElementById('btnUndo');
  const btnDaily = document.getElementById('btnDaily');
  const btnMode = document.getElementById('btnMode');
  const btnSound = document.getElementById('btnSound');
  const btnTheme = document.getElementById('btnTheme');
  const modeLabelEl = document.getElementById('modeLabel');
  const endOverlay = document.getElementById('end-overlay');
  const endMessage = document.getElementById('end-message');
  const $ = (id) => document.getElementById(id);

  const MODE_KEY = 'fifteen_mode_yg_v1';
  const SOUND_KEY = 'fifteen_sound_yg_v1';
  const THEME_KEY = 'fifteen_theme_yg_v1';
  const SLIDE_MS = 180;

  function t(key, fallback) {
    return (window.i18n && window.i18n[key]) || fallback;
  }
  function ygStart() {
    if (typeof window.__ygGameplayStart === 'function') window.__ygGameplayStart();
  }
  function ygStop() {
    if (typeof window.__ygGameplayStop === 'function') window.__ygGameplayStop();
  }

  let boardSize = localStorage.getItem(MODE_KEY) === '3' ? 3 : 4;
  let totalTiles = boardSize * boardSize - 1;
  let tiles = [];
  let emptyIndex = totalTiles;
  let moves = 0;
  let time = 0;
  let timer = null;
  let gameStarted = false;
  let gameSolved = false;
  let adShownThisRound = false;
  let animating = false;
  let isDaily = false;
  let lastMove = null;
  let soundEnabled = localStorage.getItem(SOUND_KEY) === '1';
  let audioCtx = null;

  function bestKey() {
    return boardSize === 3 ? 'fifteen_best_yg_3_v1' : 'fifteen_best_yg_v1';
  }
  let best = parseInt(localStorage.getItem(bestKey()) || '0', 10) || 0;
  if ($('best')) $('best').textContent = String(best);

  function ensureAudio() {
    if (!soundEnabled) return null;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      return audioCtx;
    } catch (_) {
      return null;
    }
  }
  function beep(freq, dur, type, gain) {
    const ctx = ensureAudio();
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    g.gain.value = gain || 0.04;
    o.connect(g);
    g.connect(ctx.destination);
    const now = ctx.currentTime;
    g.gain.setValueAtTime(gain || 0.04, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + (dur || 0.06));
    o.start(now);
    o.stop(now + (dur || 0.06));
  }
  function sfxMove() { beep(420, 0.05, 'triangle', 0.035); }
  function sfxUndo() { beep(280, 0.06, 'sine', 0.03); }
  function sfxWin() {
    beep(520, 0.08, 'triangle', 0.04);
    setTimeout(() => beep(700, 0.12, 'sine', 0.035), 80);
  }
  function haptic(ms) {
    try { if (navigator.vibrate) navigator.vibrate(ms || 12); } catch (_) {}
  }

  function syncThemeButton() {
    if (!btnTheme) return;
    const theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    btnTheme.textContent = theme === 'light' ? t('themeDark', 'Тёмная') : t('themeLight', 'Светлая');
  }
  function setTheme(theme) {
    const next = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem(THEME_KEY, next); } catch (_) {}
    syncThemeButton();
  }
  function updateSoundBtn() {
    if (!btnSound) return;
    btnSound.textContent = soundEnabled ? t('soundOn', 'Звук: вкл') : t('soundOff', 'Звук: выкл');
  }
  function updateModeUi() {
    if (gameBoard) {
      gameBoard.classList.toggle('size-3', boardSize === 3);
      gameBoard.style.gridTemplateColumns = `repeat(${boardSize}, 1fr)`;
      gameBoard.style.gridTemplateRows = `repeat(${boardSize}, 1fr)`;
    }
    if (btnMode) btnMode.textContent = boardSize === 3 ? t('modeHard', '4×4') : t('modeEasy', '3×3');
    if (modeLabelEl) {
      modeLabelEl.textContent =
        (boardSize === 3 ? t('modeEasyLabel', 'Лёгкий 3×3') : t('modeHardLabel', 'Классика 4×4')) +
        (isDaily ? ' · ' + t('dailyLabel', 'День') : '');
    }
    if (btnDaily) btnDaily.classList.toggle('primary', isDaily);
    if (btnUndo) btnUndo.disabled = !lastMove || gameSolved || animating;
  }

  function hideEnd() { endOverlay.classList.add('hidden'); }
  function showEnd(text) {
    endMessage.textContent = text;
    endOverlay.classList.remove('hidden');
    ygStop();
    if (!adShownThisRound && window.showFullScreenAd) {
      adShownThisRound = true;
      setTimeout(() => { try { window.showFullScreenAd(); } catch (_) {} }, 900);
    }
  }

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function daySeed() {
    const d = new Date();
    const s = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}-yg${boardSize}`;
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return h >>> 0;
  }
  function shuffleTiles(rng) {
    const rand = rng || Math.random;
    for (let i = tiles.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
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
    if (boardSize % 2 === 1) return inversions % 2 === 0;
    const emptyRowFromBottom = boardSize - Math.floor(emptyIndex / boardSize);
    return (emptyRowFromBottom % 2 === 0) === (inversions % 2 === 1);
  }
  function isSolved() {
    for (let i = 0; i < totalTiles; i++) if (tiles[i] !== i + 1) return false;
    return tiles[totalTiles] === 0;
  }

  function renderBoard(slide) {
    gameBoard.innerHTML = '';
    tiles.forEach((value, index) => {
      const tile = document.createElement('div');
      tile.className = 'tile';
      if (value !== 0) {
        tile.textContent = String(value);
        tile.dataset.index = String(index);
        tile.addEventListener('click', () => moveTile(index));
        if (gameSolved) tile.classList.add('solved');
        if (slide && index === slide.to && value === slide.value) {
          const fromRow = Math.floor(slide.from / boardSize);
          const fromCol = slide.from % boardSize;
          const toRow = Math.floor(slide.to / boardSize);
          const toCol = slide.to % boardSize;
          tile.style.transform = `translate(${(fromCol - toCol) * 100}%, ${(fromRow - toRow) * 100}%)`;
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              tile.classList.add('sliding');
              tile.style.transform = '';
            });
          });
        }
      } else tile.classList.add('empty');
      gameBoard.appendChild(tile);
    });
    updateModeUi();
  }

  function canMove(index) {
    const row = Math.floor(index / boardSize);
    const col = index % boardSize;
    const emptyRow = Math.floor(emptyIndex / boardSize);
    const emptyCol = emptyIndex % boardSize;
    return (
      (Math.abs(row - emptyRow) === 1 && col === emptyCol) ||
      (Math.abs(col - emptyCol) === 1 && row === emptyRow)
    );
  }

  function startGame() {
    if (gameStarted || gameSolved) return;
    gameStarted = true;
    ygStart();
    timer = setInterval(() => {
      time++;
      if ($('time')) $('time').textContent = String(time);
    }, 1000);
  }

  function moveTile(index) {
    if (gameSolved || animating) return;
    if (!gameStarted) startGame();
    if (!canMove(index)) return;
    const from = index;
    const to = emptyIndex;
    const value = tiles[index];
    lastMove = { from, to, value };
    tiles[index] = 0;
    tiles[emptyIndex] = value;
    emptyIndex = index;
    moves++;
    if ($('moves')) $('moves').textContent = String(moves);
    sfxMove();
    haptic(12);
    animating = true;
    renderBoard({ from, to, value });
    setTimeout(() => {
      animating = false;
      updateModeUi();
      checkSolution();
    }, SLIDE_MS + 20);
  }

  function undoMove() {
    if (animating || gameSolved || !lastMove || moves <= 0) return;
    const { from, to, value } = lastMove;
    tiles[from] = value;
    tiles[to] = 0;
    emptyIndex = to;
    moves = Math.max(0, moves - 1);
    if ($('moves')) $('moves').textContent = String(moves);
    lastMove = null;
    sfxUndo();
    haptic(8);
    animating = true;
    renderBoard({ from: to, to: from, value });
    setTimeout(() => {
      animating = false;
      updateModeUi();
    }, SLIDE_MS + 20);
  }

  function checkSolution() {
    if (!isSolved()) return;
    gameSolved = true;
    lastMove = null;
    if (timer) { clearInterval(timer); timer = null; }
    if (moves < best || best === 0) {
      best = moves;
      localStorage.setItem(bestKey(), String(best));
      if ($('best')) $('best').textContent = String(best);
    }
    sfxWin();
    haptic([20, 40, 20]);
    renderBoard();
    showEnd(t('winMessage', 'Solved!'));
  }

  function initGame(opts) {
    const daily = !!(opts && opts.daily);
    isDaily = daily;
    totalTiles = boardSize * boardSize - 1;
    tiles = Array.from({ length: totalTiles }, (_, i) => i + 1);
    tiles.push(0);
    emptyIndex = totalTiles;
    const rng = daily ? mulberry32(daySeed()) : null;
    do { shuffleTiles(rng); } while (!isSolvable() || isSolved());
    moves = 0;
    time = 0;
    gameStarted = false;
    gameSolved = false;
    adShownThisRound = false;
    animating = false;
    lastMove = null;
    best = parseInt(localStorage.getItem(bestKey()) || '0', 10) || 0;
    if ($('moves')) $('moves').textContent = '0';
    if ($('time')) $('time').textContent = '0';
    if ($('best')) $('best').textContent = String(best);
    hideEnd();
    ygStop();
    if (timer) { clearInterval(timer); timer = null; }
    renderBoard();
  }

  function setBoardSize(size) {
    boardSize = size === 3 ? 3 : 4;
    localStorage.setItem(MODE_KEY, String(boardSize));
    initGame({ daily: isDaily });
  }

  let touchStartX = 0;
  let touchStartY = 0;
  gameBoard.addEventListener('touchstart', (e) => {
    if (!e.touches.length) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  }, { passive: true });
  gameBoard.addEventListener('touchend', (e) => {
    if (gameSolved || !e.changedTouches.length) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    let targetIndex = -1;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 24) {
      targetIndex = dx > 0 ? emptyIndex - 1 : emptyIndex + 1;
      if (targetIndex < 0 || targetIndex >= tiles.length) return;
      if (Math.floor(targetIndex / boardSize) !== Math.floor(emptyIndex / boardSize)) return;
    } else if (Math.abs(dy) > 24) {
      targetIndex = dy > 0 ? emptyIndex - boardSize : emptyIndex + boardSize;
      if (targetIndex < 0 || targetIndex >= tiles.length) return;
    } else return;
    if (canMove(targetIndex)) moveTile(targetIndex);
  }, { passive: true });

  function handleKeyDown(e) {
    if (e.code === 'KeyR' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      initGame({ daily: isDaily });
      return;
    }
    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      undoMove();
      return;
    }
    if (gameSolved || animating) return;
    let targetIndex = -1;
    switch (e.key) {
      case 'ArrowUp': case 'w': case 'W': targetIndex = emptyIndex + boardSize; break;
      case 'ArrowDown': case 's': case 'S': targetIndex = emptyIndex - boardSize; break;
      case 'ArrowLeft': case 'a': case 'A': targetIndex = emptyIndex + 1; break;
      case 'ArrowRight': case 'd': case 'D': targetIndex = emptyIndex - 1; break;
      default: return;
    }
    e.preventDefault();
    if (targetIndex >= 0 && targetIndex < tiles.length && canMove(targetIndex)) moveTile(targetIndex);
  }

  btnNewGame.addEventListener('click', () => { initGame({ daily: false }); btnNewGame.blur(); });
  btnReset.addEventListener('click', () => { initGame({ daily: isDaily }); btnReset.blur(); });
  if (btnUndo) btnUndo.addEventListener('click', () => { undoMove(); btnUndo.blur(); });
  if (btnDaily) btnDaily.addEventListener('click', () => { initGame({ daily: true }); btnDaily.blur(); });
  if (btnMode) btnMode.addEventListener('click', () => { setBoardSize(boardSize === 3 ? 4 : 3); btnMode.blur(); });
  if (btnSound) {
    btnSound.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      localStorage.setItem(SOUND_KEY, soundEnabled ? '1' : '0');
      updateSoundBtn();
      if (soundEnabled) { ensureAudio(); beep(440, 0.05, 'sine', 0.04); }
      btnSound.blur();
    });
  }
  if (btnTheme) {
    btnTheme.addEventListener('click', () => {
      const cur = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      setTheme(cur === 'light' ? 'dark' : 'light');
      btnTheme.blur();
    });
  }
  syncThemeButton();
  updateSoundBtn();
  window.addEventListener('keydown', handleKeyDown, true);

  function armRecTimer() {
    if (timer) { clearInterval(timer); timer = null; }
    ygStart();
    timer = setInterval(() => {
      time++;
      if ($('time')) $('time').textContent = String(time);
    }, 1000);
  }

  if (/[?&]rec=1(?:&|$)/.test(location.search)) {
    window.__rec = {
      getState() {
        return { tiles: tiles.slice(), emptyIndex, moves, time, solved: gameSolved, started: gameStarted, boardSize, isDaily, soundEnabled };
      },
      reset() { boardSize = 4; isDaily = false; initGame({ daily: false }); },
      setTheme(theme) { setTheme(theme === 'light' ? 'light' : 'dark'); },
      setSound(on) {
        soundEnabled = !!on;
        try { localStorage.setItem(SOUND_KEY, soundEnabled ? '1' : '0'); } catch (_) {}
        updateSoundBtn();
        if (soundEnabled) { ensureAudio(); beep(440, 0.05, 'sine', 0.04); }
      },
      setModeLabel(text) {
        if (modeLabelEl) modeLabelEl.textContent = String(text || '');
      },
      /** 3×3 one move from solved (empty left of 8). */
      setupEasyNear() {
        boardSize = 3;
        totalTiles = 8;
        tiles = [1, 2, 3, 4, 5, 6, 7, 0, 8];
        emptyIndex = 7;
        moves = 11; time = 9;
        gameStarted = true; gameSolved = false; adShownThisRound = true;
        lastMove = null; animating = false; isDaily = false;
        if ($('moves')) $('moves').textContent = String(moves);
        if ($('time')) $('time').textContent = String(time);
        hideEnd(); armRecTimer(); renderBoard();
        updateModeUi();
        return { emptyIndex, moves, nextIndex: 8, wrongIndex: 6 };
      },
      setupEasyDailyNear() {
        const r = this.setupEasyNear();
        isDaily = true;
        updateModeUi();
        if (modeLabelEl) modeLabelEl.textContent = t('modeEasyLabel', 'Easy 3×3') + ' · ' + t('dailyLabel', 'Daily');
        return r;
      },
      setupNearSolved() {
        boardSize = 4;
        totalTiles = 15;
        tiles = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 0, 15];
        emptyIndex = 14;
        moves = 24; time = 18;
        gameStarted = true; gameSolved = false; adShownThisRound = true; lastMove = null; animating = false; isDaily = false;
        if ($('moves')) $('moves').textContent = String(moves);
        if ($('time')) $('time').textContent = String(time);
        hideEnd(); armRecTimer(); renderBoard();
        updateModeUi();
        return { emptyIndex, moves, nextIndex: 15, wrongIndex: 13 };
      },
      setupTwoAway() {
        boardSize = 4;
        totalTiles = 15;
        tiles = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 0, 14, 15];
        emptyIndex = 13;
        moves = 23; time = 17;
        gameStarted = true; gameSolved = false; adShownThisRound = true; lastMove = null; animating = false; isDaily = false;
        if ($('moves')) $('moves').textContent = String(moves);
        if ($('time')) $('time').textContent = String(time);
        hideEnd(); armRecTimer(); renderBoard();
        updateModeUi();
        return { emptyIndex, moves, nextIndex: 14 };
      },
      failNearEnd() {
        if (boardSize === 3) {
          tiles = [1, 2, 3, 4, 5, 6, 8, 7, 0];
          emptyIndex = 8;
        } else {
          tiles = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 14, 13, 0];
          emptyIndex = 15;
        }
        moves += 1; gameSolved = false; lastMove = null;
        if ($('moves')) $('moves').textContent = String(moves);
        hideEnd(); renderBoard();
        endMessage.textContent = 'Almost…';
        endOverlay.classList.remove('hidden');
        return { emptyIndex, moves };
      },
      undo() { undoMove(); },
      hideEnd() { hideEnd(); },
      showBanner(text) {
        endMessage.textContent = String(text || 'Almost…');
        endOverlay.classList.remove('hidden');
      },
      moveIndex(index) {
        moveTile(index);
        return { solved: gameSolved, emptyIndex, moves };
      },
      slide(dir) {
        let target = -1;
        if (dir === 'up') target = emptyIndex + boardSize;
        else if (dir === 'down') target = emptyIndex - boardSize;
        else if (dir === 'left') target = emptyIndex + 1;
        else if (dir === 'right') target = emptyIndex - 1;
        if (target >= 0 && target < tiles.length && canMove(target)) {
          moveTile(target);
          return true;
        }
        return false;
      },
      wait(ms) {
        return new Promise((r) => setTimeout(r, ms));
      },
    };
  }

  window.__ygOnReady = function () { initGame({ daily: false }); };
  if (window.__ygBoot) window.__ygBoot();
  else initGame({ daily: false });
})();
