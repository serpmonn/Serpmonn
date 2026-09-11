window.SERPMONN_LOCALES = {
  ru: {
    htmlLang: 'ru',
    title: 'Толстая крыса Serpmonn',
    heading: 'Толстая крыса Serpmonn',
    eaten: 'Съедено',
    weight: 'Вес кг',
    best: 'Рекорд',
    start: 'НАЧАТЬ',
    hint: '[клик / тап] — укажи еду крысе',
    overlayTitle: 'FAT RAT',
    overlaySub:
      'Кликай по лабиринту — крыса бежит к еде.<br>Чем толще крыса — тем медленнее движется.<br><span style="color:#a78bfa">Фиолетовая еда</span> — супербуст ×3!<br>Цель: максимально разжиреть крысу!',
    gameOverTitle: '🏆 МАКС. ЖИР!',
    gameOverScore: '{eaten} · {weight} Вес кг',
    playAgain: 'ЕЩЁ РАЗ',
  },
  en: {
    htmlLang: 'en',
    title: 'Serpmonn Fat Rat',
    heading: 'Serpmonn Fat Rat',
    eaten: 'Eaten',
    weight: 'Weight kg',
    best: 'Best',
    start: 'START',
    hint: '[click / tap] — set a path for the rat',
    overlayTitle: 'FAT RAT',
    overlaySub:
      'Click the maze — the rat runs toward food.<br>The fatter the rat, the slower it moves.<br><span style="color:#a78bfa">Purple food</span> — super boost ×3!<br>Goal: make the rat as fat as possible!',
    gameOverTitle: '🏆 MAX FAT!',
    gameOverScore: '{eaten} · {weight} Weight kg',
    playAgain: 'AGAIN',
  },
};

window.resolveSerpmonnLocale = function (ysdk) {
  let code = 'ru';
  try {
    if (ysdk?.environment?.i18n?.lang) {
      code = String(ysdk.environment.i18n.lang).toLowerCase().slice(0, 2);
    }
  } catch (_) {}
  if (code !== 'en') code = 'ru';
  return window.SERPMONN_LOCALES[code] || window.SERPMONN_LOCALES.ru;
};

window.applySerpmonnLocale = function (loc) {
  if (!loc) return;
  document.documentElement.lang = loc.htmlLang || 'ru';
  document.title = loc.title;
  const set = (sel, text) => {
    const el = document.querySelector(sel);
    if (el && text != null) el.textContent = text;
  };
  const setHtml = (sel, html) => {
    const el = document.querySelector(sel);
    if (el && html != null) el.innerHTML = html;
  };
  set('[data-i18n="heading"]', loc.heading);
  set('[data-i18n="hint"]', loc.hint);
  set('[data-i18n="start"]', loc.start);
  set('[data-i18n="overlayTitle"]', loc.overlayTitle);
  setHtml('[data-i18n-html="overlaySub"]', loc.overlaySub);

  function relabel(sel, label, id) {
    const wrap = document.querySelector(sel);
    if (!wrap) return;
    const v = document.getElementById(id)?.textContent || '0';
    wrap.innerHTML =
      '<div class="score-label">' +
      label +
      '</div><div class="score-value" id="' +
      id +
      '">' +
      v +
      '</div>';
  }
  relabel('[data-i18n-eaten]', loc.eaten, 'eaten');
  relabel('[data-i18n-weight]', loc.weight, 'weight');
  relabel('[data-i18n-best]', loc.best, 'best');

  window.i18n = {
    gameOverTitle: loc.gameOverTitle,
    gameOverScore: loc.gameOverScore,
    playAgain: loc.playAgain,
    overlayTitle: loc.overlayTitle,
    overlaySub: loc.overlaySub,
    start: loc.start,
  };
};
