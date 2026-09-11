/**
 * Yandex Games locale bridge for Neli.
 * Maps ysdk.environment.i18n.lang → existing neli i18n (setLang / applyUi).
 */
window.SERPMONN_LOCALES = {
  ru: {
    htmlLang: 'ru',
    title: 'Нэли Serpmonn',
  },
  en: {
    htmlLang: 'en',
    title: 'Serpmonn Neli',
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
  const code = loc.htmlLang === 'en' ? 'en' : 'ru';
  document.documentElement.lang = code;
  document.title = loc.title || (code === 'en' ? 'Serpmonn Neli' : 'Нэли Serpmonn');
  if (typeof setLang === 'function') {
    setLang(code);
  } else if (typeof applyUi === 'function') {
    try {
      // eslint-disable-next-line no-undef
      lang = code;
    } catch (_) {}
    applyUi();
  }
};
