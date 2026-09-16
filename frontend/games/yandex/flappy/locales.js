/**
 * RU/EN strings. Language from YaGames SDK: ysdk.environment.i18n.lang
 */
window.SERPMONN_LOCALES = {
  ru: {
    htmlLang: 'ru',
    title: 'Flappy Serpmonn',
    heading: 'Flappy Serpmonn',
    score: 'Счёт',
    best: 'Рекорд',
    start: 'Старт',
    reset: 'Заново',
    hint: 'Пробел / клик / тап — взмах · R — заново',
    welcomeTitle: 'Flappy Serpmonn',
    welcomeLine1: 'Нажмите ПРОБЕЛ, КЛИК',
    welcomeLine2: 'или кнопку СТАРТ',
    welcomeLine3: 'чтобы начать',
    yourBest: 'Ваш рекорд: {score}',
    gameOver: 'Игра окончена',
    yourScore: 'Ваш счёт: {score}',
    newRecord: 'Новый рекорд!',
    restartLine1: 'ПРОБЕЛ / R — снова',
    restartLine2: 'или кнопка ЗАНОВО',
    restartLine3: '',
  },
  en: {
    htmlLang: 'en',
    title: 'Serpmonn Flappy',
    heading: 'Serpmonn Flappy',
    score: 'Score',
    best: 'Best',
    start: 'Start',
    reset: 'Restart',
    hint: 'Space / click / tap — flap · R — restart',
    welcomeTitle: 'Serpmonn Flappy',
    welcomeLine1: 'Press SPACE, CLICK',
    welcomeLine2: 'or the START button',
    welcomeLine3: 'to begin',
    yourBest: 'Your best: {score}',
    gameOver: 'Game over',
    yourScore: 'Your score: {score}',
    newRecord: 'New record!',
    restartLine1: 'SPACE / R — again',
    restartLine2: 'or RESTART button',
    restartLine3: '',
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
  set('[data-i18n="start"]', loc.start);
  set('[data-i18n="reset"]', loc.reset);
  // rebuild score labels keeping values
  const scoreWrap = document.querySelector('[data-i18n-score]');
  const bestWrap = document.querySelector('[data-i18n-best]');
  if (scoreWrap) {
    const v = document.getElementById('score')?.textContent || '0';
    scoreWrap.innerHTML = loc.score + '<br><b id="score">' + v + '</b>';
  }
  if (bestWrap) {
    const v = document.getElementById('best')?.textContent || '0';
    bestWrap.innerHTML = loc.best + '<br><b id="best">' + v + '</b>';
  }
  window.i18n = {
    welcomeTitle: loc.welcomeTitle,
    welcomeLine1: loc.welcomeLine1,
    welcomeLine2: loc.welcomeLine2,
    welcomeLine3: loc.welcomeLine3,
    yourBest: loc.yourBest,
    gameOver: loc.gameOver,
    yourScore: loc.yourScore,
    newRecord: loc.newRecord,
    restartLine1: loc.restartLine1,
    restartLine2: loc.restartLine2,
    restartLine3: loc.restartLine3,
  };
};
