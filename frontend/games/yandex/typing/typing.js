// typing.js — Yandex Games build (Serpmonn Typing)
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const BEST_KEY = 'typing_best_yg_v1';

  const WORDS_FALLBACK_EN = [
    'server', 'client', 'network', 'port', 'request', 'response', 'file', 'data', 'code', 'function',
    'class', 'object', 'method', 'string', 'array', 'loop', 'error', 'test', 'database', 'table',
  ];

  function ygStart() {
    if (typeof window.__ygGameplayStart === 'function') window.__ygGameplayStart();
  }
  function ygStop() {
    if (typeof window.__ygGameplayStop === 'function') window.__ygGameplayStop();
  }

  function loadBest() {
    try {
      const raw = localStorage.getItem(BEST_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (_) {
      return {};
    }
  }

  function saveBest() {
    try {
      localStorage.setItem(BEST_KEY, JSON.stringify(bestWpm));
    } catch (_) {}
  }

  function getWordBank() {
    const bank = window.i18n?.wordBank;
    if (Array.isArray(bank) && bank.length) return bank;
    return WORDS_FALLBACK_EN;
  }

  let mode = '15';
  let words = [];
  let charList = [];
  let cursorPos = 0;
  let started = false;
  let finished = false;
  let timerInterval = null;
  let timeLeft = 0;
  let totalTime = 0;
  let correctChars = 0;
  let wrongChars = 0;
  let history = [];
  let bestWpm = loadBest();
  let adShownThisRound = false;
  let startTs = 0;

  function generateWords() {
    const bank = getWordBank();
    const count = mode === 'words' ? 25 : 90;
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push(bank[Math.floor(Math.random() * bank.length)]);
    }
    return arr;
  }

  function buildCharList(wordArr) {
    const chars = [];
    wordArr.forEach((w, wi) => {
      for (let i = 0; i < w.length; i++) chars.push({ ch: w[i], state: 'pending', word: wi });
      if (wi < wordArr.length - 1) chars.push({ ch: ' ', state: 'pending', word: wi, isSpace: true });
    });
    return chars;
  }

  function renderWords() {
    const wordsDisplay = $('wordsDisplay');
    if (!wordsDisplay) return;
    wordsDisplay.innerHTML = '';
    charList.forEach((c, i) => {
      const span = document.createElement('span');
      span.className = 'char ' + c.state + (i === cursorPos ? ' cursor' : '');
      span.textContent = c.ch === ' ' ? '\u00a0' : c.ch;
      wordsDisplay.appendChild(span);
    });
    const curEl = wordsDisplay.querySelector('.cursor');
    if (curEl) {
      const wTop = wordsDisplay.getBoundingClientRect().top;
      const cTop = curEl.getBoundingClientRect().top;
      const lineH = parseFloat(getComputedStyle(wordsDisplay).lineHeight);
      if (cTop - wTop > lineH * 1.5) {
        wordsDisplay.scrollTop += lineH;
      }
    }
  }

  function updateLiveStats() {
    const elapsed = totalTime > 0 ? totalTime : 0.01;
    const wpm = Math.round(correctChars / 5 / (elapsed / 60));
    const total = correctChars + wrongChars;
    const acc = total > 0 ? Math.round((correctChars / total) * 100) : 100;
    const liveWpm = $('liveWpm');
    const liveAcc = $('liveAcc');
    const liveTimer = $('liveTimer');
    const liveBest = $('liveBest');
    const progressFill = $('progressFill');
    if (liveWpm) liveWpm.textContent = started ? String(wpm) : '—';
    if (liveAcc) liveAcc.textContent = started ? acc + '%' : '—';
    if (mode !== 'words') {
      if (liveTimer) liveTimer.textContent = timeLeft + 's';
      if (progressFill) progressFill.style.width = (1 - timeLeft / parseInt(mode, 10)) * 100 + '%';
    } else {
      const done = charList.filter((c) => c.state !== 'pending').length;
      if (progressFill) progressFill.style.width = (done / Math.max(charList.length, 1)) * 100 + '%';
      if (liveTimer) liveTimer.textContent = started ? Math.round(totalTime) + 's' : '—';
    }
    const bk = bestWpm[mode];
    if (liveBest) liveBest.textContent = bk ? bk + ' wpm' : '—';
  }

  function initTest(newText) {
    if (newText === undefined) newText = true;
    clearInterval(timerInterval);
    timerInterval = null;
    ygStop();
    started = false;
    finished = false;
    adShownThisRound = false;
    cursorPos = 0;
    correctChars = 0;
    wrongChars = 0;
    totalTime = 0;
    startTs = 0;
    if (newText) words = generateWords();
    charList = buildCharList(words);
    timeLeft = mode === 'words' ? 0 : parseInt(mode, 10);
    const progressFill = $('progressFill');
    const wordsDisplay = $('wordsDisplay');
    const clickHint = $('clickHint');
    const resultPanel = $('resultPanel');
    const typingWrap = $('typingWrap');
    const hiddenInput = $('hiddenInput');
    if (progressFill) progressFill.style.width = '0%';
    if (wordsDisplay) wordsDisplay.scrollTop = 0;
    if (clickHint) clickHint.style.display = 'block';
    if (resultPanel) resultPanel.classList.remove('show');
    if (typingWrap) typingWrap.style.display = 'block';
    if (hiddenInput) hiddenInput.value = '';
    renderWords();
    updateLiveStats();
  }

  function startTest() {
    if (started || finished) return;
    started = true;
    const clickHint = $('clickHint');
    if (clickHint) clickHint.style.display = 'none';
    ygStart();
    startTs = performance.now();
    if (mode !== 'words') {
      timerInterval = setInterval(() => {
        totalTime = (performance.now() - startTs) / 1000;
        timeLeft = Math.max(0, parseInt(mode, 10) - Math.floor(totalTime));
        updateLiveStats();
        if (timeLeft <= 0) finishTest();
      }, 100);
    } else {
      timerInterval = setInterval(() => {
        totalTime = (performance.now() - startTs) / 1000;
        updateLiveStats();
      }, 100);
    }
  }

  function typeChar(typed) {
    if (!typed || finished) return false;
    if (!started) startTest();
    if (cursorPos >= charList.length) return false;
    const expected = charList[cursorPos].ch;
    const typingWrap = $('typingWrap');
    if (typed === expected) {
      charList[cursorPos].state = 'correct';
      correctChars++;
    } else {
      charList[cursorPos].state = 'wrong';
      wrongChars++;
      if (typingWrap) {
        typingWrap.classList.remove('shake');
        void typingWrap.offsetWidth;
        typingWrap.classList.add('shake');
        setTimeout(() => typingWrap.classList.remove('shake'), 150);
      }
    }
    cursorPos++;
    if (mode === 'words' && cursorPos >= charList.length) {
      finishTest();
      return true;
    }
    renderWords();
    updateLiveStats();
    return true;
  }

  function finishTest() {
    if (finished) return;
    finished = true;
    clearInterval(timerInterval);
    timerInterval = null;
    ygStop();

    const elapsed = mode !== 'words' ? parseInt(mode, 10) : Math.max(totalTime, 1);
    const wpm = Math.max(0, Math.round(correctChars / 5 / (elapsed / 60)));
    const total = correctChars + wrongChars;
    const acc = total > 0 ? Math.round((correctChars / total) * 100) : 100;
    const errors = charList.filter((c) => c.state === 'wrong').length;
    const isNew = (!bestWpm[mode] || wpm > bestWpm[mode]) && wpm > 0;
    if (isNew) {
      bestWpm[mode] = wpm;
      saveBest();
    }
    history.unshift({ wpm, acc, mode });
    if (history.length > 8) history.pop();

    const resWpm = $('resWpm');
    const resAcc = $('resAcc');
    const resChars = $('resChars');
    const resErrors = $('resErrors');
    const newRecord = $('newRecord');
    const resultPanel = $('resultPanel');
    const typingWrap = $('typingWrap');

    if (resWpm) resWpm.textContent = String(wpm);
    if (resAcc) resAcc.textContent = acc + '%';
    if (resChars) resChars.textContent = String(correctChars);
    if (resErrors) resErrors.textContent = String(errors);
    if (newRecord) {
      newRecord.style.display = isNew ? 'block' : 'none';
      if (isNew) newRecord.textContent = (window.i18n && window.i18n.newRecord) || '🏆 NEW RECORD!';
    }
    if (resultPanel) resultPanel.classList.add('show');
    if (typingWrap) typingWrap.style.display = 'none';
    renderHistory();
    updateLiveStats();

    if (!adShownThisRound && window.showFullScreenAd) {
      adShownThisRound = true;
      setTimeout(() => {
        try {
          window.showFullScreenAd();
        } catch (_) {}
      }, 800);
    }
  }

  function renderHistory() {
    const panel = $('historyPanel');
    const list = $('historyList');
    if (!panel || !list) return;
    if (!history.length) {
      panel.style.display = 'none';
      return;
    }
    panel.style.display = 'flex';
    list.innerHTML = '';
    const best = Math.max(...history.map((h) => h.wpm));
    history.forEach((h) => {
      const chip = document.createElement('span');
      chip.className = 'history-chip' + (h.wpm === best ? ' top' : '');
      chip.textContent = h.wpm + ' wpm · ' + h.acc + '% · ' + h.mode;
      list.appendChild(chip);
    });
  }

  function focusInput() {
    const hiddenInput = $('hiddenInput');
    if (hiddenInput) hiddenInput.focus({ preventScroll: true });
  }

  function setMode(nextMode, newText) {
    mode = String(nextMode);
    document.querySelectorAll('.tab').forEach((b) => {
      const on = b.dataset.mode === mode;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    initTest(newText !== false);
    focusInput();
  }

  function bindUi() {
    const typingWrap = $('typingWrap');
    const hiddenInput = $('hiddenInput');
    if (typingWrap) {
      typingWrap.addEventListener('click', () => {
        if (!finished) focusInput();
      });
    }
    if (hiddenInput) {
      hiddenInput.addEventListener('input', () => {
        const val = hiddenInput.value;
        if (!val.length || finished) return;
        const typed = val[val.length - 1];
        hiddenInput.value = '';
        typeChar(typed);
      });
      hiddenInput.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && cursorPos > 0 && !finished) {
          cursorPos--;
          const c = charList[cursorPos];
          if (c.state === 'wrong') wrongChars--;
          else if (c.state === 'correct') correctChars--;
          c.state = 'pending';
          renderWords();
          updateLiveStats();
          e.preventDefault();
        }
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !started && !finished) focusInput();
      if (e.key === 'Escape') {
        initTest(false);
        focusInput();
      }
    });

    const retryBtn = $('retryBtn');
    const newTextBtn = $('newTextBtn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        initTest(false);
        focusInput();
      });
    }
    if (newTextBtn) {
      newTextBtn.addEventListener('click', () => {
        initTest(true);
        focusInput();
      });
    }

    document.querySelectorAll('.tab').forEach((btn) => {
      btn.addEventListener('click', () => {
        setMode(btn.dataset.mode, true);
      });
    });
  }

  window.__typingOnLocale = function () {
    if (!started && !finished) {
      initTest(true);
    } else {
      updateLiveStats();
    }
  };

  if (/[?&]rec=1(?:&|$)/.test(location.search)) {
    window.__rec = {
      getState() {
        return {
          mode,
          started,
          finished,
          cursorPos,
          correctChars,
          wrongChars,
          timeLeft,
          totalTime,
          wpmLive: (() => {
            const elapsed = totalTime > 0 ? totalTime : 0.01;
            return Math.round(correctChars / 5 / (elapsed / 60));
          })(),
          bestWpm: bestWpm[mode] || 0,
          wordsLeft: Math.max(0, charList.length - cursorPos),
          textPreview: words.slice(0, 8).join(' '),
        };
      },
      start() {
        focusInput();
        startTest();
      },
      type(str) {
        const s = String(str || '');
        for (let i = 0; i < s.length; i++) typeChar(s[i]);
      },
      setMode,
      reset(newText) {
        initTest(newText !== false);
        focusInput();
      },
      finish: finishTest,
    };
  }

  window.__ygOnReady = function () {
    bindUi();
    initTest(true);
  };

  if (window.__ygBoot) window.__ygBoot();
  else {
    if (typeof window.applySerpmonnLocale === 'function') {
      window.applySerpmonnLocale(window.SERPMONN_LOCALES.ru);
    }
    bindUi();
    initTest(true);
  }
})();
