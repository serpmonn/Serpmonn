// fifteen.js — Пятнашки Serpmonn (undo, daily, sound, 3×3, haptic)
(function () {
  'use strict';

  const gameBoard = document.getElementById('game');
  const movesEl = document.getElementById('moves');
  const timeEl = document.getElementById('time');
  const bestEl = document.getElementById('best');
  const btnNewGame = document.getElementById('btnNewGame');
  const btnReset = document.getElementById('btnReset');
  const btnUndo = document.getElementById('btnUndo');
  const btnDaily = document.getElementById('btnDaily');
  const btnMode = document.getElementById('btnMode');
  const btnSound = document.getElementById('btnSound');
  const btnLeaderboard = document.getElementById('btnLeaderboard');
  const btnChangeNick = document.getElementById('btnChangeNick');
  const nickValueEl = document.getElementById('nickValue');
  const nicknameForm = document.getElementById('nicknameForm');
  const nicknameInput = document.getElementById('nickname');
  const btnSkipNick = document.getElementById('btnSkipNick');
  const solvedMessage = document.getElementById('solvedMessage');
  const modeLabelEl = document.getElementById('modeLabel');

  const ADD_SCORE_URL = '/add-score';
  const BANNED_WORDS_URL = '/proxy/bannedWords';
  const NICK_KEY = 'fifteen_nickname_v1';
  const MODE_KEY = 'fifteen_mode_v1';
  const SOUND_KEY = 'fifteen_sound_v1';
  const SLIDE_MS = 180;

  function t(key, fallback) {
    return (window.i18n && window.i18n[key]) || fallback;
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
  let animating = false;
  let scoreSubmitted = false;
  let isDaily = false;
  let lastMove = null;
  let bannedWords = [];
  let nickname = (localStorage.getItem(NICK_KEY) || '').trim().slice(0, 40);
  let soundEnabled = localStorage.getItem(SOUND_KEY) === '1';
  let audioCtx = null;

  function gameId() {
    return boardSize === 3 ? 'fifteen3' : 'fifteen';
  }

  function bestKey() {
    return boardSize === 3 ? 'fifteen_best_score_3_v1' : 'fifteen_best_score_v1';
  }

  function loadBest() {
    return parseInt(localStorage.getItem(bestKey()) || '0', 10) || 0;
  }

  let best = loadBest();
  if (bestEl) bestEl.textContent = String(best);

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

  function sfxMove() {
    beep(420, 0.05, 'triangle', 0.035);
  }

  function sfxUndo() {
    beep(280, 0.06, 'sine', 0.03);
  }

  function sfxWin() {
    beep(520, 0.08, 'triangle', 0.04);
    setTimeout(() => beep(700, 0.12, 'sine', 0.035), 80);
  }

  function haptic(ms) {
    try {
      if (navigator.vibrate) navigator.vibrate(ms || 12);
    } catch (_) {}
  }

  function updateSoundBtn() {
    if (!btnSound) return;
    btnSound.textContent = soundEnabled
      ? t('soundOn', 'Звук: вкл')
      : t('soundOff', 'Звук: выкл');
    btnSound.setAttribute('aria-pressed', soundEnabled ? 'true' : 'false');
  }

  function updateModeUi() {
    if (gameBoard) {
      gameBoard.classList.toggle('size-3', boardSize === 3);
      gameBoard.classList.toggle('size-4', boardSize === 4);
      gameBoard.style.gridTemplateColumns = `repeat(${boardSize}, 1fr)`;
      gameBoard.style.gridTemplateRows = `repeat(${boardSize}, 1fr)`;
    }
    if (btnMode) {
      btnMode.textContent =
        boardSize === 3 ? t('modeHard', '4×4') : t('modeEasy', '3×3');
    }
    if (modeLabelEl) {
      modeLabelEl.textContent =
        (boardSize === 3 ? t('modeEasyLabel', 'Лёгкий 3×3') : t('modeHardLabel', 'Классика 4×4')) +
        (isDaily ? ' · ' + t('dailyLabel', 'День') : '');
    }
    if (btnDaily) {
      btnDaily.classList.toggle('primary', isDaily);
    }
    if (btnUndo) btnUndo.disabled = !lastMove || gameSolved || animating;
  }

  function updateNickUi() {
    if (nickValueEl) nickValueEl.textContent = nickname || '—';
    if (btnChangeNick) {
      btnChangeNick.textContent = nickname
        ? t('changeNick', 'Сменить ник')
        : t('setNick', 'Указать ник');
    }
  }

  function showNickForm() {
    if (!nicknameForm) return;
    nicknameForm.hidden = false;
    if (nicknameInput && nickname) nicknameInput.value = nickname;
  }

  function hideNickForm() {
    if (nicknameForm) nicknameForm.hidden = true;
    updateNickUi();
  }

  function setNickname(name) {
    const next = String(name || '').trim().slice(0, 40);
    if (!next) return false;
    const lower = next.toLowerCase();
    if (bannedWords.some((w) => w && lower.includes(String(w).toLowerCase()))) {
      alert(t('bannedNicknameAlert', 'Этот ник нельзя использовать'));
      return false;
    }
    nickname = next;
    localStorage.setItem(NICK_KEY, nickname);
    return true;
  }

  function clearNickname() {
    nickname = '';
    localStorage.removeItem(NICK_KEY);
    if (nicknameInput) nicknameInput.value = '';
  }

  function submitScore() {
    if (scoreSubmitted || moves <= 0 || !nickname) return Promise.resolve();
    scoreSubmitted = true;
    return fetch(ADD_SCORE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname, score: moves, gameId: gameId() }),
    }).catch(() => {});
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
    const s = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}-b${boardSize}`;
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
    for (let i = 0; i < totalTiles; i++) {
      if (tiles[i] !== i + 1) return false;
    }
    return tiles[totalTiles] === 0;
  }

  function renderBoard(slide) {
    gameBoard.innerHTML = '';
    tiles.forEach((value, index) => {
      const tile = document.createElement('div');
      tile.className = 'tile';
      if (value !== 0) {
        tile.textContent = String(value);
        tile.dataset.value = String(value);
        tile.dataset.index = String(index);
        tile.addEventListener('click', () => moveTile(index));
        tile.addEventListener('touchstart', handleTouchStart, { passive: false });
        tile.addEventListener('touchmove', handleTouchMove, { passive: false });
        tile.addEventListener('touchend', handleTouchEnd);
        tile.setAttribute('tabindex', '0');
        tile.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            moveTile(index);
          }
        });
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
      } else {
        tile.classList.add('empty');
      }
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
    timer = setInterval(() => {
      time++;
      if (timeEl) timeEl.textContent = String(time);
    }, 1000);
  }

  function finishAfterMove() {
    animating = false;
    updateModeUi();
    checkSolution();
  }

  function moveTile(index) {
    if (animating || gameSolved) return;
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
    if (movesEl) movesEl.textContent = String(moves);

    sfxMove();
    haptic(12);
    animating = true;
    renderBoard({ from, to, value });
    setTimeout(finishAfterMove, SLIDE_MS + 20);
  }

  function undoMove() {
    if (animating || gameSolved || !lastMove || moves <= 0) return;
    const { from, to, value } = lastMove;
    // reverse: tile is at `to` (old empty), empty is at `from`
    tiles[from] = value;
    tiles[to] = 0;
    emptyIndex = to;
    moves = Math.max(0, moves - 1);
    if (movesEl) movesEl.textContent = String(moves);
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
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    if (moves < best || best === 0) {
      best = moves;
      localStorage.setItem(bestKey(), String(best));
      if (bestEl) bestEl.textContent = String(best);
    }
    sfxWin();
    haptic([20, 40, 20]);
    renderBoard();
    if (solvedMessage) solvedMessage.style.display = 'block';
    submitScore();
    try {
      if (window.showFullScreenAd) window.showFullScreenAd();
    } catch (_) {}
  }

  function initGame(opts) {
    const daily = !!(opts && opts.daily);
    isDaily = daily;
    totalTiles = boardSize * boardSize - 1;
    tiles = Array.from({ length: totalTiles }, (_, i) => i + 1);
    tiles.push(0);
    emptyIndex = totalTiles;

    const rng = daily ? mulberry32(daySeed()) : null;
    do {
      shuffleTiles(rng);
    } while (!isSolvable() || isSolved());

    moves = 0;
    time = 0;
    gameStarted = false;
    gameSolved = false;
    animating = false;
    scoreSubmitted = false;
    lastMove = null;
    best = loadBest();
    if (movesEl) movesEl.textContent = '0';
    if (timeEl) timeEl.textContent = '0';
    if (bestEl) bestEl.textContent = String(best);
    if (solvedMessage) solvedMessage.style.display = 'none';
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    renderBoard();
  }

  function setBoardSize(size) {
    boardSize = size === 3 ? 3 : 4;
    localStorage.setItem(MODE_KEY, String(boardSize));
    initGame({ daily: isDaily });
  }

  let touchStartX = 0;
  let touchStartY = 0;

  function handleTouchStart(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    e.preventDefault();
  }

  function handleTouchMove(e) {
    e.preventDefault();
  }

  function handleTouchEnd(e) {
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    let targetIndex = -1;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10) {
      targetIndex = dx > 0 ? emptyIndex - 1 : emptyIndex + 1;
      if (targetIndex < 0 || targetIndex >= tiles.length) return;
      if (Math.floor(targetIndex / boardSize) !== Math.floor(emptyIndex / boardSize)) return;
    } else if (Math.abs(dy) > 10) {
      targetIndex = dy > 0 ? emptyIndex - boardSize : emptyIndex + boardSize;
      if (targetIndex < 0 || targetIndex >= tiles.length) return;
    } else {
      return;
    }
    if (canMove(targetIndex)) moveTile(targetIndex);
  }

  function handleKeyDown(e) {
    if (nicknameForm && !nicknameForm.hidden) return;
    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      undoMove();
      return;
    }
    if (gameSolved || animating) return;
    let targetIndex = -1;
    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        targetIndex = emptyIndex + boardSize;
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        targetIndex = emptyIndex - boardSize;
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
    if (targetIndex >= 0 && targetIndex < tiles.length && canMove(targetIndex)) {
      moveTile(targetIndex);
    }
  }

  if (btnNewGame) {
    btnNewGame.addEventListener('click', () => initGame({ daily: false }));
  }
  if (btnReset) {
    btnReset.addEventListener('click', () => initGame({ daily: isDaily }));
  }
  if (btnUndo) btnUndo.addEventListener('click', undoMove);
  if (btnDaily) {
    btnDaily.addEventListener('click', () => initGame({ daily: true }));
  }
  if (btnMode) {
    btnMode.addEventListener('click', () => setBoardSize(boardSize === 3 ? 4 : 3));
  }
  if (btnSound) {
    btnSound.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      localStorage.setItem(SOUND_KEY, soundEnabled ? '1' : '0');
      updateSoundBtn();
      if (soundEnabled) {
        ensureAudio();
        beep(440, 0.05, 'sine', 0.04);
      }
    });
  }
  if (btnLeaderboard) {
    btnLeaderboard.addEventListener('click', () => {
      const hash = boardSize === 3 ? 'fifteen3' : 'fifteen';
      location.href = t(
        'scoreTableUrl',
        '/frontend/games/redsquare2/score_table.html'
      ).replace(/#.*$/, '') + '#' + hash;
    });
  }
  if (btnChangeNick) btnChangeNick.addEventListener('click', () => showNickForm());
  if (nicknameForm) {
    nicknameForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!setNickname(nicknameInput ? nicknameInput.value : '')) return;
      hideNickForm();
    });
  }
  if (btnSkipNick) {
    btnSkipNick.addEventListener('click', () => {
      clearNickname();
      hideNickForm();
    });
  }

  window.addEventListener('keydown', handleKeyDown);
  updateNickUi();
  updateSoundBtn();
  initGame({ daily: false });

  fetch(BANNED_WORDS_URL)
    .then((r) => (r.ok ? r.json() : []))
    .then((data) => {
      bannedWords = (Array.isArray(data) ? data : [])
        .map((item) => (item && item.word) || item)
        .filter(Boolean);
    })
    .catch(() => {});
})();
