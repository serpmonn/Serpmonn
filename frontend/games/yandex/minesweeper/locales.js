window.SERPMONN_LOCALES = {
  ru: {
    htmlLang: 'ru',
    title: 'Сапёр Serpmonn',
    heading: 'Сапёр Serpmonn',
    mines: 'Мины',
    time: 'Время',
    best: 'Лучшее',
    start: 'Старт',
    reset: 'Заново',
    hint: 'ЛКМ — открыть · ПКМ / Shift — флаг · долгий тап — флаг · R — заново · первый клик безопасный',
    timeSuffix: 'с',
    noRecord: '—',
    winMessage: 'Победа!',
    loseMessage: 'Подорвались',
  },
  en: {
    htmlLang: 'en',
    title: 'Serpmonn Minesweeper',
    heading: 'Serpmonn Minesweeper',
    mines: 'Mines',
    time: 'Time',
    best: 'Best',
    start: 'Start',
    reset: 'Restart',
    hint: 'LMB — open · RMB / Shift — flag · long tap — flag · R — restart · first click is safe',
    timeSuffix: 's',
    noRecord: '—',
    winMessage: 'You win!',
    loseMessage: 'Boom!',
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
  function relabel(sel, label, id, suffix) {
    const wrap = document.querySelector(sel);
    if (!wrap) return;
    const v = document.getElementById(id)?.textContent || '0';
    wrap.innerHTML = label + '<br><b id="' + id + '">' + v + '</b>' + (suffix || '');
  }
  relabel('[data-i18n-mines]', loc.mines, 'minesLeft');
  relabel('[data-i18n-time]', loc.time, 'time');
  relabel('[data-i18n-best]', loc.best, 'best');
  window.i18n = {
    timeSuffix: loc.timeSuffix,
    noRecord: loc.noRecord,
    winMessage: loc.winMessage,
    loseMessage: loc.loseMessage,
  };
};
