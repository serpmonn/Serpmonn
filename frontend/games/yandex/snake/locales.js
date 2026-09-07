/**
 * RU/EN strings. Language from YaGames SDK: ysdk.environment.i18n.lang
 */
window.SERPMONN_LOCALES = {
  ru: {
    htmlLang: 'ru',
    title: 'Змейка — Serpmonn',
    heading: 'Змейка',
    hint: 'Стрелки / WASD · Пробел или Esc — пауза · R — заново · На телефоне — свайпы',
    stats: 'Статистика',
    score: 'Счёт',
    best: 'Рекорд',
    speed: 'Скорость',
    field: 'Поле',
    start: 'Старт',
    pause: 'Пауза',
    reset: 'Заново',
    gameOver: 'Игра окончена',
    pressRToRestart: 'Нажмите R — заново',
    canvasLabel: 'Игровое поле',
    controlsLabel: 'Мобильное управление',
  },
  en: {
    htmlLang: 'en',
    title: 'Snake — Serpmonn',
    heading: 'Snake',
    hint: 'Arrows / WASD · Space or Esc — pause · R — restart · Mobile — swipes',
    stats: 'Stats',
    score: 'Score',
    best: 'Best',
    speed: 'Speed',
    field: 'Field',
    start: 'Start',
    pause: 'Pause',
    reset: 'Restart',
    gameOver: 'Game over',
    pressRToRestart: 'Press R — restart',
    canvasLabel: 'Game field',
    controlsLabel: 'Mobile controls',
  },
};

window.resolveSerpmonnLocale = function (ysdk) {
  // Yandex Games requirement 2.14: language ONLY from SDK when available.
  // ysdk.environment.i18n.lang — ISO 639-1 ('ru', 'en', ...)
  let code = 'ru';
  try {
    if (ysdk && ysdk.environment && ysdk.environment.i18n && ysdk.environment.i18n.lang) {
      code = String(ysdk.environment.i18n.lang).toLowerCase().slice(0, 2);
    }
  } catch (_) {}
  // Declared languages in console: RU + EN. Anything else → RU.
  if (code !== 'en') code = 'ru';
  return window.SERPMONN_LOCALES[code] || window.SERPMONN_LOCALES.ru;
};

window.applySerpmonnLocale = function (loc) {
  if (!loc) return;
  document.documentElement.lang = loc.htmlLang || 'ru';
  document.title = loc.title;
  const set = (sel, text, attr) => {
    const el = document.querySelector(sel);
    if (!el || text == null) return;
    if (attr) el.setAttribute(attr, text);
    else el.textContent = text;
  };
  set('[data-i18n="heading"]', loc.heading);
  set('[data-i18n="hint"]', loc.hint);
  set('[data-i18n="stats"]', loc.stats);
  set('[data-i18n="start"]', loc.start);
  set('[data-i18n="pause"]', loc.pause);
  set('[data-i18n="reset"]', loc.reset);
  set('#game', loc.canvasLabel, 'aria-label');
  set('.controls', loc.controlsLabel, 'aria-label');

  function relabelStat(sel, label, keepId) {
    const wrap = document.querySelector(sel);
    if (!wrap) return;
    const b = wrap.querySelector('b');
    const val = b ? b.textContent : '';
    if (keepId) {
      wrap.innerHTML = label + '<br><b id="' + keepId + '">' + val + '</b>';
    } else {
      wrap.innerHTML = label + '<br><b>' + (b ? b.innerHTML : val) + '</b>';
    }
  }
  relabelStat('[data-i18n-score]', loc.score, 'score');
  relabelStat('[data-i18n-best]', loc.best, 'best');
  relabelStat('[data-i18n-speed]', loc.speed, 'speed');
  relabelStat('[data-i18n-field]', loc.field, null);

  window.i18n = {
    gameOver: loc.gameOver,
    pressRToRestart: loc.pressRToRestart,
  };
};
