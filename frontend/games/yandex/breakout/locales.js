window.SERPMONN_LOCALES = {
  ru: {
    htmlLang: 'ru',
    title: 'Арканоид Serpmonn',
    heading: 'Арканоид Serpmonn',
    score: 'Счёт',
    lives: 'Жизни',
    best: 'Рекорд',
    start: 'Старт',
    reset: 'Заново',
    hint: '← → или A/D — платформа · Пробел — старт/пауза · R — заново · На телефоне — палец',
    gameOver: 'Игра окончена',
    winMessage: 'Победа!',
    pressRToRestart: 'Нажмите R — заново',
  },
  en: {
    htmlLang: 'en',
    title: 'Serpmonn Breakout',
    heading: 'Serpmonn Breakout',
    score: 'Score',
    lives: 'Lives',
    best: 'Best',
    start: 'Start',
    reset: 'Restart',
    hint: '← → or A/D — paddle · Space — start/pause · R — restart · Mobile — drag',
    gameOver: 'Game over',
    winMessage: 'You win!',
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
  relabel('[data-i18n-lives]', loc.lives, 'lives');
  relabel('[data-i18n-best]', loc.best, 'best');
  window.i18n = {
    gameOver: loc.gameOver,
    winMessage: loc.winMessage,
    pressRToRestart: loc.pressRToRestart,
  };
};
