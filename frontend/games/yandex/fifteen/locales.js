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
    themeLight: 'Светлая',
    themeDark: 'Тёмная',
    undo: 'Отмена',
    daily: 'День',
    modeEasy: '3×3',
    modeHard: '4×4',
    modeEasyLabel: 'Лёгкий 3×3',
    modeHardLabel: 'Классика 4×4',
    dailyLabel: 'День',
    soundOn: 'Звук: вкл',
    soundOff: 'Звук: выкл',
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
    themeLight: 'Light',
    themeDark: 'Dark',
    undo: 'Undo',
    daily: 'Daily',
    modeEasy: '3×3',
    modeHard: '4×4',
    modeEasyLabel: 'Easy 3×3',
    modeHardLabel: 'Classic 4×4',
    dailyLabel: 'Daily',
    soundOn: 'Sound: on',
    soundOff: 'Sound: off',
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
  set('[data-i18n="undo"]', loc.undo);
  set('[data-i18n="daily"]', loc.daily);
  set('[data-i18n="modeEasy"]', loc.modeEasy);
  set('[data-i18n="soundOff"]', loc.soundOff);
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
    themeLight: loc.themeLight,
    themeDark: loc.themeDark,
    soundOn: loc.soundOn,
    soundOff: loc.soundOff,
    modeEasy: loc.modeEasy,
    modeHard: loc.modeHard,
    modeEasyLabel: loc.modeEasyLabel,
    modeHardLabel: loc.modeHardLabel,
    dailyLabel: loc.dailyLabel,
  };
  const themeBtn = document.getElementById('btnTheme');
  if (themeBtn) {
    const theme = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    themeBtn.textContent = theme === 'light' ? loc.themeDark : loc.themeLight;
  }
};
