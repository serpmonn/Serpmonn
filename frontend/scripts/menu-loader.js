// Исправленный импорт
import { initMenu } from './menu.js';
import '/frontend/scripts/accessibility.js';

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

// Загружаем меню ПЕРВЫМ делом
fetch('/frontend/menu.html')
        // Путь из папки about-project

    .then(response => {
        if (!response.ok) throw new Error('Меню не найдено');
        return response.text();
    })
    .then(html => {
        document.body.insertAdjacentHTML('afterbegin', html);
        
        // Только после вставки меню проверяем поиск
        if (document.querySelector('.gcse-searchbox-only') && !window.__gcse) {
            const script = document.createElement('script');
            script.src = 'https://cse.google.com/cse.js?cx=97e62541ff5274a28';
            script.async = true;
            document.body.appendChild(script);
        }
        
        initMenu();
        
        // Инициализируем доступность ПОСЛЕ загрузки меню
        setTimeout(() => {
            if (window.initAccessibility) {
                window.initAccessibility();
            }
        }, 100);
    })
    .catch(err => console.error('Ошибка загрузки меню:', err));