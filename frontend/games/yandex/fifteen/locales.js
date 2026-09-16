window.SERPMONN_LOCALES = {
  ru: {
    htmlLang: 'ru',
    title: 'Пятнашки Serpmonn',
    heading: 'Пятнашки Serpmonn',
    moves: 'Ходы',
    time: 'Время',
    best: 'Рекорд',
    newGame: 'Новая игра',
    reset: 'Сбросить',
    hint: 'Стрелки / WASD / свайп — ход · клик по плитке · R — заново',
    winMessage: 'Собрано!',
    timeSuffix: 'с',
  },
  en: {
    htmlLang: 'en',
    title: 'Serpmonn Fifteen',
    heading: 'Serpmonn Fifteen',
    moves: 'Moves',
    time: 'Time',
    best: 'Best',
    newGame: 'New game',
    reset: 'Reset',
    hint: 'Arrows / WASD / swipe — move · tap a tile · R — restart',
    winMessage: 'Solved!',
    timeSuffix: 's',
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
  set('[data-i18n="heading"]', loc.heading);
  set('[data-i18n="hint"]', loc.hint);
  set('[data-i18n="newGame"]', loc.newGame);
  set('[data-i18n="reset"]', loc.reset);
  function relabel(sel, label, id) {
    const wrap = document.querySelector(sel);
    if (!wrap) return;
    const v = document.getElementById(id)?.textContent || '0';
    wrap.innerHTML = label + '<br><b id="' + id + '">' + v + '</b>';
  }
  relabel('[data-i18n-moves]', loc.moves, 'moves');
  relabel('[data-i18n-time]', loc.time, 'time');
  relabel('[data-i18n-best]', loc.best, 'best');
  window.i18n = {
    winMessage: loc.winMessage,
    timeSuffix: loc.timeSuffix,
  };
};
