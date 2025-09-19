// Исправленный импорт
import { initMenu } from './menu.js';
import '/frontend/scripts/language-selector.js';
import '/frontend/scripts/i18n-overlay.js';
import '/frontend/scripts/accessibility.js';
import { applyGeoFilter } from '/frontend/scripts/geo-filter.js';

// Немедленно применяем сохранённые настройки доступности
(function applySavedAccessibility() {
  const saved = localStorage.getItem('spn_a11y_settings');
  if (saved) {
    try {
      const settings = JSON.parse(saved);
      Object.keys(settings).forEach(key => {
        if (settings[key]) {
          document.documentElement.classList.add(`a11y-${key.replace('-', '-')}`);
        }
      });
    } catch (e) {
      console.warn('Failed to apply saved accessibility settings:', e);
    }
  }
})();

// Загружаем меню ПЕРВЫМ делом (с учётом языка)
const spnLang = (localStorage.getItem('spn_lang') || (document.documentElement.lang || 'ru')).toLowerCase();
const langToDir = {
  'en': 'en', 'es': 'es', 'pt-br': 'pt-br', 'hi': 'hi', 'ar': 'ar', 'id': 'id',
  'zh-cn': 'zh-cn', 'ja': 'ja', 'ko': 'ko', 'vi': 'vi', 'tr': 'tr',
  'de': 'de', 'fr': 'fr', 'it': 'it', 'pl': 'pl', 'nl': 'nl',
  // new
  'kk': 'kk', 'he': 'he', 'fa': 'fa', 'bn': 'bn', 'ur': 'ur',
  'ms': 'ms', 'fil': 'fil', 'th': 'th',
  'ro': 'ro', 'cs': 'cs', 'hu': 'hu', 'bg': 'bg', 'el': 'el', 'sr': 'sr',
  'ka': 'ka', 'hy': 'hy', 'be': 'be', 'uz': 'uz', 'az': 'az',
  'sv': 'sv', 'da': 'da', 'nb': 'nb', 'fi': 'fi',
  'pt-pt': 'pt-pt', 'es-419': 'es-419'
};
const resolvedDir = langToDir[spnLang];
const primaryMenuPath = resolvedDir ? `/frontend/${resolvedDir}/menu.html` : '/frontend/menu.html';
fetch(primaryMenuPath)
    .then(r => r.ok ? r : fetch('/frontend/menu.html'))
        // Путь из папки about-project

    .then(response => {
        if (!response.ok) throw new Error('Меню не найдено');
        return response.text();
    })
    .then(html => {
        document.body.insertAdjacentHTML('afterbegin', html);
        try {
            const currentLang = spnLang;
            const supported = new Set(Object.keys(langToDir));
            const container = document.getElementById('menuContainer');
            const anchors = container ? Array.from(container.querySelectorAll('a[href]')) : [];
            anchors.forEach(a => {
                const href = a.getAttribute('href');
                if (!href || href.startsWith('#') || /^https?:\/\//i.test(href) || href.startsWith('mailto:') || href.startsWith('javascript:')) return;
                if (!href.startsWith('/frontend/')) return;
                const url = new URL(href, location.origin);
                const parts = url.pathname.split('/').filter(Boolean);
                const idx = parts.indexOf('frontend');
                if (idx === -1) return;
                const after = parts.slice(idx + 1);
                const hasLang = after[0] && supported.has(after[0]);
                const rest = hasLang ? after.slice(1) : after;
                let newParts;
                if (currentLang === 'ru') {
                    if (rest.length === 0 || (rest.length === 1 && /^(index\.html)?$/.test(rest[0]))) {
                        a.setAttribute('href', '/frontend/main.html');
                        return;
                    }
                    newParts = ['frontend', ...rest];
                } else {
                    if (rest.length === 0 || (rest.length === 1 && /^(index\.html)?$/.test(rest[0]))) {
                        newParts = ['frontend', currentLang, 'index.html'];
                    } else {
                        newParts = ['frontend', currentLang, ...rest];
                    }
                }
                a.setAttribute('href', '/' + newParts.join('/'));
            });
        } catch {}
        
        // Синхронизируем поисковую форму в меню с основной формой на странице
        try {
            const primaryBox = document.querySelector('.main-search-container .gcse-searchbox-only')
                || document.querySelector('.gcse-searchbox-only[data-resultsUrl]');
            const menuBox = document.querySelector('#menuSearchContainer .gcse-searchbox-only');
            if (primaryBox && menuBox) {
                const gname = primaryBox.getAttribute('data-gname');
                const resultsUrl = primaryBox.getAttribute('data-resultsUrl');
                if (gname) menuBox.setAttribute('data-gname', gname);
                if (resultsUrl) menuBox.setAttribute('data-resultsUrl', resultsUrl);
                menuBox.setAttribute('data-newWindow', 'false');
            }
        } catch {}

        // Подключаем Google CSE, если он ещё не подключен и нет тега со скриптом
        const hasCseScript = !!document.querySelector('script[src*="cse.google.com/cse.js"]');
        if (document.querySelector('.gcse-searchbox-only') && !window.__gcse && !hasCseScript && !window.__SPN_CSE_LOADING) {
            window.__SPN_CSE_LOADING = true;
            const script = document.createElement('script');
            script.src = 'https://cse.google.com/cse.js?cx=97e62541ff5274a28';
            script.async = true;
            script.onload = () => { window.__SPN_CSE_LOADING = false; };
            document.body.appendChild(script);
        }
        
        initMenu();
        // Apply GEO filtering after menu init
        try { applyGeoFilter(); } catch {}
        
        // Инициализируем доступность ПОСЛЕ загрузки меню
        setTimeout(() => {
            if (window.initA11y) {
                window.initA11y();
            }
        }, 100);
    })
    .catch(err => console.error('Ошибка загрузки меню:', err));
