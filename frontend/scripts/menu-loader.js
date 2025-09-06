// Исправленный импорт
import { initMenu } from './menu.js';
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
        
        // Только после вставки меню инициализируем поиск (надёжно)
        try {
            const hasSearchBox = !!document.querySelector('.gcse-searchbox-only');
            if (hasSearchBox) {
                window.__gcse = window.__gcse || {};
                window.__gcse.parsetags = 'explicit';
                const hasCseScript = !!document.querySelector('script[src*="cse.google.com/cse.js"]');
                if (!hasCseScript) {
                    const s = document.createElement('script');
                    s.src = 'https://cse.google.com/cse.js?cx=97e62541ff5274a28';
                    s.async = true;
                    s.onload = function () { if (window.__gcse && window.__gcse.parse) window.__gcse.parse(); };
                    document.body.appendChild(s);
                } else {
                    setTimeout(() => { if (window.__gcse && window.__gcse.parse) window.__gcse.parse(); }, 0);
                }
            }
        } catch (_) {}
        
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