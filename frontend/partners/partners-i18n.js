/**
 * Локализация партнёрских кабинетов.
 * Данные: partners-i18n-data.js (все локали). Fallback: en.
 * Бренд: ru → «Серпмонн», иначе «Serpmonn» (из JSON).
 */
(function (global) {
  const DATA = global.PARTNERS_I18N_DATA || {};

  function detectLocale() {
    const path = location.pathname || '';
    const m = path.match(/^\/frontend\/([^/]+)\/partners(?:\/|$)/);
    if (m && m[1] && m[1] !== 'partners') return m[1].toLowerCase();
    if (path.startsWith('/frontend/partners')) {
      try {
        const stored = (localStorage.getItem('spn_lang') || '').toLowerCase();
        if (stored) return stored;
      } catch {
        /* ignore */
      }
      return (document.documentElement.lang || 'ru').toLowerCase();
    }
    return (document.documentElement.lang || 'ru').toLowerCase();
  }

  function dictFor(locale) {
    if (DATA[locale]) return DATA[locale];
    const base = String(locale || '').split('-')[0];
    if (base && DATA[base]) return DATA[base];
    // es-419 → es
    if (locale === 'es-419' && DATA.es) return DATA.es;
    if (locale === 'pt-br' && DATA['pt-br']) return DATA['pt-br'];
    if (locale === 'pt-pt' && DATA['pt-pt']) return DATA['pt-pt'];
    if (locale === 'zh-cn' && DATA['zh-cn']) return DATA['zh-cn'];
    return DATA.en || {};
  }

  function t(key, vars) {
    const locale = detectLocale();
    const d = dictFor(locale);
    const en = DATA.en || {};
    let s = d[key] != null ? d[key] : en[key] != null ? en[key] : key;
    if (vars && typeof s === 'string') {
      Object.keys(vars).forEach((k) => {
        s = s.replace(new RegExp('\\{' + k + '\\}', 'g'), String(vars[k]));
      });
    }
    return s;
  }

  function brand() {
    return t('brand');
  }

  function partnersBase() {
    const locale = detectLocale();
    if (!locale || locale === 'ru') return '/frontend/partners';
    return `/frontend/${locale}/partners`;
  }

  function cabinetUrl(role) {
    const base = partnersBase();
    if (role === 'publisher') return `${base}/publisher.html`;
    if (role === 'admin') return '/frontend/admin/partners.html';
    return `${base}/advertiser.html`;
  }

  function authUrl() {
    return `${partnersBase()}/index.html`;
  }

  function helpUrl(hash) {
    const h = hash ? (String(hash).startsWith('#') ? hash : `#${hash}`) : '';
    return `${partnersBase()}/help.html${h}`;
  }

  function apply() {
    const locale = detectLocale();
    document.documentElement.lang = locale;
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      if (!key) return;
      const val = t(key);
      if (el.getAttribute('data-i18n-html') === '1') el.innerHTML = val;
      else el.textContent = val;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key) el.setAttribute('placeholder', t(key));
    });
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      if (key) el.setAttribute('title', t(key));
    });
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      const key = el.getAttribute('data-i18n-aria');
      if (key) el.setAttribute('aria-label', t(key));
    });
    const titleKey = document.body.getAttribute('data-i18n-page-title');
    if (titleKey) document.title = t(titleKey);
  }

  global.PartnersI18n = {
    detectLocale,
    t,
    brand,
    partnersBase,
    cabinetUrl,
    authUrl,
    helpUrl,
    apply,
    locales: Object.keys(DATA)
  };
})(typeof window !== 'undefined' ? window : globalThis);
