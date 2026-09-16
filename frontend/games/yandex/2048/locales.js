/**
 * RU/EN strings. Language from YaGames SDK: ysdk.environment.i18n.lang
 */
window.SERPMONN_LOCALES = {
  ru: {
    htmlLang: 'ru',
    title: '2048 Serpmonn',
    heading: '2048 Serpmonn',
    score: 'Счёт',
    best: 'Лучший',
    newGame: 'Новая игра',
    undo: 'Отменить',
    hint: 'Стрелки или WASD · свайпы на телефоне · Отменить — последний ход',
    gameOver: 'Игра окончена',
    yourScore: 'Ваш счёт: {score}',
    playAgain: 'Ещё раз',
  },
  en: {
    htmlLang: 'en',
    title: 'Serpmonn 2048',
    heading: 'Serpmonn 2048',
    score: 'Score',
    best: 'Best',
    newGame: 'New game',
    undo: 'Undo',
    hint: 'Arrows or WASD · swipe on phone · Undo — last move',
    gameOver: 'Game over',
    yourScore: 'Your score: {score}',
    playAgain: 'Play again',
  },
};

window.resolveSerpmonnLocale = function (ysdk) {
  let code = 'ru';
  try {
    if (ysdk && ysdk.environment && ysdk.environment.i18n && ysdk.environment.i18n.lang) {
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
  set('[data-i18n="undo"]', loc.undo);
  set('[data-i18n="scoreLabel"]', loc.score);
  set('[data-i18n="bestLabel"]', loc.best);
  set('[data-i18n="gameOver"]', loc.gameOver);
  set('[data-i18n="playAgain"]', loc.playAgain);
  window.i18n = {
    gameOver: loc.gameOver,
    yourScore: loc.yourScore,
    playAgain: loc.playAgain,
  };
};
