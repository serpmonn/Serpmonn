// 2048.js — Yandex Games build (Serpmonn)
(function () {
  'use strict';

  const BEST_KEY = 'serpmonn_2048_yg_best_v1';

  function ygStart() {
    if (typeof window.__ygGameplayStart === 'function') window.__ygGameplayStart();
  }
  function ygStop() {
    if (typeof window.__ygGameplayStop === 'function') window.__ygGameplayStop();
  }
  function t(key, fallback) {
    return (window.i18n && window.i18n[key]) || fallback;
  }

  class Game2048 {
    constructor() {
      this.board = Array(16).fill(0);
      this.score = 0;
      this.best = parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0;
      this.history = [];
      this.alive = true;
      this.adShownThisRound = false;
      this.overlay = document.getElementById('overlay');
      this.overlayScore = document.getElementById('overlay-score');
      this.createBoard();
      this.setupEventListeners();
      this.newGame(false);
    }

    createBoard() {
      const boardElement = document.getElementById('board');
      boardElement.innerHTML = '';
      for (let i = 0; i < 16; i++) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        tile.dataset.index = String(i);
        boardElement.appendChild(tile);
      }
    }

    addRandomTile() {
      const empty = [];
      for (let i = 0; i < 16; i++) if (this.board[i] === 0) empty.push(i);
      if (!empty.length) return;
      const idx = empty[Math.floor(Math.random() * empty.length)];
      this.board[idx] = Math.random() < 0.9 ? 2 : 4;
    }

    updateDisplay() {
      document.querySelectorAll('.tile').forEach((tile, index) => {
        const value = this.board[index];
        tile.textContent = value || '';
        tile.className = value ? `tile tile-${value}` : 'tile';
      });
      document.getElementById('score').textContent = String(this.score);
      document.getElementById('best').textContent = String(this.best);
    }

    updateBestScore() {
      if (this.score > this.best) {
        this.best = this.score;
        localStorage.setItem(BEST_KEY, String(this.best));
      }
    }

    setupEventListeners() {
      const board = document.getElementById('board');

      document.addEventListener(
        'keydown',
        (e) => {
          const code = e.code || '';
          const key = e.key || '';
          let dir = null;
          if (code === 'ArrowUp' || code === 'KeyW' || key === 'ArrowUp' || key === 'w' || key === 'W') dir = 'ArrowUp';
          else if (code === 'ArrowDown' || code === 'KeyS' || key === 'ArrowDown' || key === 's' || key === 'S') dir = 'ArrowDown';
          else if (code === 'ArrowLeft' || code === 'KeyA' || key === 'ArrowLeft' || key === 'a' || key === 'A') dir = 'ArrowLeft';
          else if (code === 'ArrowRight' || code === 'KeyD' || key === 'ArrowRight' || key === 'd' || key === 'D') dir = 'ArrowRight';
          else if (code === 'KeyR' || key === 'r' || key === 'R') {
            e.preventDefault();
            this.newGame(true);
            return;
          } else return;
          e.preventDefault();
          e.stopPropagation();
          this.handleMove(dir);
        },
        true
      );

      let startX = 0;
      let startY = 0;
      board.addEventListener(
        'touchstart',
        (e) => {
          e.preventDefault();
          startX = e.touches[0].clientX;
          startY = e.touches[0].clientY;
        },
        { passive: false }
      );
      board.addEventListener(
        'touchmove',
        (e) => {
          e.preventDefault();
        },
        { passive: false }
      );
      board.addEventListener(
        'touchend',
        (e) => {
          e.preventDefault();
          const endX = e.changedTouches[0].clientX;
          const endY = e.changedTouches[0].clientY;
          const dx = endX - startX;
          const dy = endY - startY;
          if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
          if (Math.abs(dx) > Math.abs(dy)) this.handleMove(dx > 0 ? 'ArrowRight' : 'ArrowLeft');
          else this.handleMove(dy > 0 ? 'ArrowDown' : 'ArrowUp');
        },
        { passive: false }
      );

      document.getElementById('new-game').addEventListener('click', () => this.newGame(true));
      document.getElementById('undo').addEventListener('click', () => this.undo());
      document.getElementById('play-again').addEventListener('click', () => this.newGame(true));
    }

    handleMove(key) {
      if (!this.alive) return;
      this.saveState();
      let moved = false;
      if (key === 'ArrowUp') moved = this.moveUp();
      else if (key === 'ArrowDown') moved = this.moveDown();
      else if (key === 'ArrowLeft') moved = this.moveLeft();
      else if (key === 'ArrowRight') moved = this.moveRight();

      if (!moved) {
        this.history.pop();
        return;
      }

      this.addRandomTile();
      this.updateBestScore();
      this.updateDisplay();
      if (navigator.vibrate) navigator.vibrate(30);

      if (this.isGameOver()) this.gameOver();
    }

    moveLeft() {
      return this.moveRows((row) => ({ input: row, output: this.mergeLine(row) }));
    }
    moveRight() {
      return this.moveRows((row) => ({
        input: row,
        output: this.mergeLine([...row].reverse()).reverse(),
      }));
    }
    moveUp() {
      return this.moveColumns((col) => ({ input: col, output: this.mergeLine(col) }));
    }
    moveDown() {
      return this.moveColumns((col) => ({
        input: col,
        output: this.mergeLine([...col].reverse()).reverse(),
      }));
    }

    moveRows(transform) {
      let moved = false;
      for (let i = 0; i < 4; i++) {
        const row = this.getRow(i);
        const result = transform(row);
        if (JSON.stringify(result.input) !== JSON.stringify(result.output)) {
          moved = true;
          this.setRow(i, result.output);
        }
      }
      return moved;
    }

    moveColumns(transform) {
      let moved = false;
      for (let i = 0; i < 4; i++) {
        const column = this.getColumn(i);
        const result = transform(column);
        if (JSON.stringify(result.input) !== JSON.stringify(result.output)) {
          moved = true;
          this.setColumn(i, result.output);
        }
      }
      return moved;
    }

    getRow(rowIndex) {
      return [0, 1, 2, 3].map((j) => this.board[rowIndex * 4 + j]);
    }
    setRow(rowIndex, values) {
      for (let j = 0; j < 4; j++) this.board[rowIndex * 4 + j] = values[j];
    }
    getColumn(colIndex) {
      return [0, 1, 2, 3].map((i) => this.board[i * 4 + colIndex]);
    }
    setColumn(colIndex, values) {
      for (let i = 0; i < 4; i++) this.board[i * 4 + colIndex] = values[i];
    }

    mergeLine(line) {
      const filtered = line.filter((cell) => cell !== 0);
      for (let i = 0; i < filtered.length - 1; i++) {
        if (filtered[i] === filtered[i + 1]) {
          filtered[i] *= 2;
          this.score += filtered[i];
          filtered.splice(i + 1, 1);
        }
      }
      while (filtered.length < 4) filtered.push(0);
      return filtered;
    }

    saveState() {
      this.history.push({ board: [...this.board], score: this.score });
      if (this.history.length > 10) this.history.shift();
    }

    undo() {
      if (!this.history.length || !this.alive) return;
      const prev = this.history.pop();
      this.board = prev.board;
      this.score = prev.score;
      this.updateDisplay();
    }

    hideOverlay() {
      this.overlay.classList.add('hidden');
    }

    newGame(fromUser) {
      this.hideOverlay();
      this.board = Array(16).fill(0);
      this.score = 0;
      this.history = [];
      this.alive = true;
      this.adShownThisRound = false;
      this.addRandomTile();
      this.addRandomTile();
      this.updateDisplay();
      ygStart();
      try {
        document.getElementById('board').focus({ preventScroll: true });
      } catch (_) {}
      if (fromUser) {
        /* keep playing */
      }
    }

    gameOver() {
      this.alive = false;
      ygStop();
      const tpl = t('yourScore', 'Ваш счёт: {score}');
      this.overlayScore.textContent = tpl.replace('{score}', String(this.score));
      this.overlay.classList.remove('hidden');

      if (!this.adShownThisRound && window.showFullScreenAd) {
        this.adShownThisRound = true;
        setTimeout(() => {
          try {
            window.showFullScreenAd();
          } catch (_) {}
        }, 700);
      }
    }

    isGameOver() {
      if (this.board.includes(0)) return false;
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 3; j++) {
          if (this.board[i * 4 + j] === this.board[i * 4 + j + 1]) return false;
        }
      }
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 4; j++) {
          if (this.board[i * 4 + j] === this.board[(i + 1) * 4 + j]) return false;
        }
      }
      return true;
    }
  }

  window.__ygOnReady = function () {
    window.game2048 = new Game2048();
  };

  if (window.__ygBoot) {
    window.__ygBoot();
  } else {
    window.game2048 = new Game2048();
  }

  window.addEventListener('beforeunload', () => {
    if (window.game2048) localStorage.setItem(BEST_KEY, String(window.game2048.best));
  });
})();
