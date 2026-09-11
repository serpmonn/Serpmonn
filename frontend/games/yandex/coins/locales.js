window.SERPMONN_LOCALES = {
  ru: {
    htmlLang: 'ru',
    title: 'Монетки Serpmonn',
    heading: 'Монетки Serpmonn',
    score: 'Монеты',
    time: 'Время',
    best: 'Рекорд',
    start: 'Старт',
    reset: 'Заново',
    hint: 'Стрелки / WASD / свайп — движение · R — заново',
    gameOver: 'Игра окончена',
    pressRToRestart: 'Нажмите R — заново',
  },
  en: {
    htmlLang: 'en',
    title: 'Serpmonn Coins',
    heading: 'Serpmonn Coins',
    score: 'Coins',
    time: 'Time',
    best: 'Best',
    start: 'Start',
    reset: 'Restart',
    hint: 'Arrows / WASD / swipe — move · R — restart',
    gameOver: 'Game over',
    pressRToRestart: 'Press R — restart',
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
  set('[data-i18n="start"]', loc.start);
  set('[data-i18n="reset"]', loc.reset);
  function relabel(sel, label, id) {
    const wrap = document.querySelector(sel);
    if (!wrap) return;
    const v = document.getElementById(id)?.textContent || '0';
    wrap.innerHTML = label + '<br><b id="' + id + '">' + v + '</b>';
  }
  relabel('[data-i18n-score]', loc.score, 'score');
  relabel('[data-i18n-time]', loc.time, 'time');
  relabel('[data-i18n-best]', loc.best, 'best');
  window.i18n = {
    gameOver: loc.gameOver,
    pressRToRestart: loc.pressRToRestart,
  };
};
