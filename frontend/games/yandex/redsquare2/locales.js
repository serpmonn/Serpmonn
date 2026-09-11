window.SERPMONN_LOCALES = {
  ru: {
    htmlLang: 'ru',
    title: 'Падающие фигуры Serpmonn',
    heading: 'Падающие фигуры Serpmonn',
    score: 'Очки',
    level: 'Уровень',
    misses: 'Промахи',
    best: 'Рекорд',
    start: 'Начать игру',
    pause: 'Пауза',
    resume: 'Продолжить',
    restart: 'Заново',
    soundOn: 'Звук',
    soundOff: 'Без звука',
    pauseOverlay: 'Пауза',
    understand: 'Понятно, начинаем!',
    howToTitle: 'Как играть в «Падающие фигуры»?',
    howTo1: 'Управление: стрелки или касание — двигайте красный квадрат влево и вправо',
    howTo2: 'Цель: ловите падающие фигуры платформой внизу',
    howTo3: 'Очки: +1 за каждую пойманную фигуру',
    howTo4: 'Промахи: фигура упала на пол — промах',
    howTo5: 'Конец игры: после 10 промахов',
    howTo6: 'Пауза: кнопка «Пауза» или пробел',
    scorePrefix: 'Очки:',
    missedPrefix: 'Промахи:',
    modalYourScore: 'Твои очки:',
    modalBestResult: 'Лучший результат:',
    modalOk: 'Окей',
    lbRestart: 'Играть снова',
    gameOverTitle: 'Игра окончена',
  },
  en: {
    htmlLang: 'en',
    title: 'Serpmonn Falling Shapes',
    heading: 'Serpmonn Falling Shapes',
    score: 'Score',
    level: 'Level',
    misses: 'Misses',
    best: 'Best',
    start: 'Start',
    pause: 'Pause',
    resume: 'Resume',
    restart: 'Restart',
    soundOn: 'Sound',
    soundOff: 'Muted',
    pauseOverlay: 'Pause',
    understand: 'Got it!',
    howToTitle: 'How to play Falling Shapes?',
    howTo1: 'Controls: arrow keys or touch — move the red paddle left and right',
    howTo2: 'Goal: catch falling shapes with the paddle at the bottom',
    howTo3: 'Score: +1 for each caught shape',
    howTo4: 'Misses: a shape hitting the floor counts as a miss',
    howTo5: 'Game over: after 10 misses',
    howTo6: 'Pause: Pause button or Space',
    scorePrefix: 'Score:',
    missedPrefix: 'Misses:',
    modalYourScore: 'Your score:',
    modalBestResult: 'Best result:',
    modalOk: 'OK',
    lbRestart: 'Play again',
    gameOverTitle: 'Game over',
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
  set('[data-i18n="score"]', loc.score);
  set('[data-i18n="level"]', loc.level);
  set('[data-i18n="misses"]', loc.misses);
  set('[data-i18n="best"]', loc.best);
  set('[data-i18n="start"]', loc.start);
  set('[data-i18n="pause"]', loc.pause);
  set('[data-i18n="restart"]', loc.restart);
  set('[data-i18n="sound"]', loc.soundOn);
  set('[data-i18n="understand"]', loc.understand);
  set('[data-i18n="howToTitle"]', loc.howToTitle);
  set('[data-i18n="howTo1"]', loc.howTo1);
  set('[data-i18n="howTo2"]', loc.howTo2);
  set('[data-i18n="howTo3"]', loc.howTo3);
  set('[data-i18n="howTo4"]', loc.howTo4);
  set('[data-i18n="howTo5"]', loc.howTo5);
  set('[data-i18n="howTo6"]', loc.howTo6);
  set('[data-i18n="pauseOverlay"]', loc.pauseOverlay);
  window.i18n = {
    scorePrefix: loc.scorePrefix,
    missedPrefix: loc.missedPrefix,
    pause: loc.pause,
    resume: loc.resume,
    modalYourScore: loc.modalYourScore,
    modalBestResult: loc.modalBestResult,
    modalOk: loc.modalOk,
    lbRestart: loc.lbRestart,
    soundOn: loc.soundOn,
    soundOff: loc.soundOff,
    pauseOverlay: loc.pauseOverlay,
    gameOverTitle: loc.gameOverTitle,
    restart: loc.restart,
    start: loc.start,
  };
};
