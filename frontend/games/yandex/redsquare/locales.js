window.SERPMONN_LOCALES = {
  ru: {
    htmlLang: 'ru',
    title: 'Квадратное бегство Serpmonn',
    heading: 'Квадратное бегство Serpmonn',
    score: 'Очки',
    level: 'Уровень',
    best: 'Рекорд',
    lives: 'Жизни',
    start: 'Начать игру',
    pause: 'Пауза',
    resume: 'Продолжить',
    restart: 'Заново',
    soundOn: 'Звук',
    soundOff: 'Без звука',
    pauseOverlay: 'Пауза',
    understand: 'Всё понятно!',
    howToTitle: 'Как играть в «Квадратное бегство»?',
    howTo1: '1. Управляйте красным квадратом кнопками, стрелками или свайпами',
    howTo2: '2. Избегайте синих квадратов и серых препятствий',
    howTo3: '3. Собирайте золотые бонусы для дополнительных очков',
    howTo4: '4. Чем дольше держитесь — тем больше очков',
    howTo5: '5. Пауза — кнопка или пробел',
    howTo6: '6. У вас 3 жизни. После удара — короткая неуязвимость. Бонусы подряд дают комбо.',
    scorePrefix: 'Очки:',
    allLevelsComplete: 'Ты прошёл все уровни! Поздравляем!',
    modalYourScore: 'Твои очки:',
    modalBestResult: 'Лучший результат:',
    modalOk: 'Окей',
    levelUp: 'Уровень',
    gameOverTitle: 'Игра окончена',
    comboLabel: 'Комбо',
  },
  en: {
    htmlLang: 'en',
    title: 'Serpmonn Square Escape',
    heading: 'Serpmonn Square Escape',
    score: 'Score',
    level: 'Level',
    best: 'Best',
    lives: 'Lives',
    start: 'Start',
    pause: 'Pause',
    resume: 'Resume',
    restart: 'Restart',
    soundOn: 'Sound',
    soundOff: 'Muted',
    pauseOverlay: 'Pause',
    understand: 'Got it!',
    howToTitle: 'How to play Square Escape?',
    howTo1: '1. Move the red square with buttons, arrow keys, or swipes',
    howTo2: '2. Avoid blue squares and gray obstacles',
    howTo3: '3. Collect gold bonuses for extra points',
    howTo4: '4. Survive longer to score more',
    howTo5: '5. Pause with the button or Space',
    howTo6: '6. You have 3 lives. Hits grant brief invincibility. Chain bonuses for combo.',
    scorePrefix: 'Score:',
    allLevelsComplete: 'You cleared every level! Congrats!',
    modalYourScore: 'Your score:',
    modalBestResult: 'Best result:',
    modalOk: 'OK',
    levelUp: 'Level',
    gameOverTitle: 'Game over',
    comboLabel: 'Combo',
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
  set('[data-i18n="best"]', loc.best);
  set('[data-i18n="lives"]', loc.lives);
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
  const pauseSpan = document.querySelector('#pauseOverlay span');
  if (pauseSpan) pauseSpan.textContent = loc.pauseOverlay;
  window.i18n = {
    scorePrefix: loc.scorePrefix,
    pause: loc.pause,
    resume: loc.resume,
    allLevelsComplete: loc.allLevelsComplete,
    modalYourScore: loc.modalYourScore,
    modalBestResult: loc.modalBestResult,
    modalOk: loc.modalOk,
    levelLabel: loc.level,
    bestLabel: loc.best,
    livesLabel: loc.lives,
    comboLabel: loc.comboLabel,
    soundOn: loc.soundOn,
    soundOff: loc.soundOff,
    pauseOverlay: loc.pauseOverlay,
    levelUp: loc.levelUp,
    gameOverTitle: loc.gameOverTitle,
    restart: loc.restart,
    start: loc.start,
  };
};
