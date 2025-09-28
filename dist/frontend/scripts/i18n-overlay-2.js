// Улучшенный i18n-оверлей: загружает JSON-словари и подставляет тексты по data-i18n
(function(){
  function getLang(){
    try { return (localStorage.getItem('spn_lang') || (document.documentElement.lang || 'ru')).toLowerCase(); } catch { return (document.documentElement.lang || 'ru').toLowerCase(); }
  }
  function toPath(scope){ return scope.replace(/\./g, '.'); }
  function fetchJson(url){ return fetch(url, { cache: 'no-cache' }).then(r => r.ok ? r.json() : null).catch(() => null); }
  async function loadDicts(lang, scope){
    const base = '/frontend/locales';
    const commonUrlLang = `${base}/${lang}/common.json`;
    const commonUrlRu = `${base}/ru/common.json`;
    const pageUrlLang = scope ? `${base}/${lang}/${toPath(scope)}.json` : null;
    const pageUrlRu = scope ? `${base}/ru/${toPath(scope)}.json` : null;
    const [commonL, commonR, pageL, pageR] = await Promise.all([
      fetchJson(commonUrlLang), fetchJson(commonUrlRu),
      pageUrlLang ? fetchJson(pageUrlLang) : Promise.resolve(null),
      pageUrlRu ? fetchJson(pageUrlRu) : Promise.resolve(null)
    ]);
    return Object.assign({}, commonR || {}, commonL || {}, pageR || {}, pageL || {});
  }
  function applyI18n(dict){
    try {
      // Тег <title>
      const titleEl = document.querySelector('title[data-i18n]');
      if (titleEl){ const key = titleEl.getAttribute('data-i18n'); if (dict[key]) document.title = dict[key]; }
      // Элементы с data-i18n
      document.querySelectorAll('[data-i18n]').forEach(el => {
        if (el.tagName.toLowerCase() === 'title') return; // уже обработали
        const key = el.getAttribute('data-i18n');
        const attr = el.getAttribute('data-i18n-attr');
        const val = dict[key];
        if (!val) return;
        if (attr) { el.setAttribute(attr, val); } else { el.textContent = val; }
      });
    } catch (e) { console.warn('[i18n-overlay-2]', e); }
  }
  document.addEventListener('DOMContentLoaded', function(){
    const lang = getLang();
    const metaScope = document.querySelector('meta[name="i18n-scope"]');
    const scope = metaScope ? metaScope.getAttribute('content') : (document.body && document.body.getAttribute('data-i18n-scope'));
    loadDicts(lang, scope).then(dict => { if (dict) applyI18n(dict); });
  });
})();

