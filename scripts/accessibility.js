// Скрипт доступности - настройки прямо в меню
(function(){
  "use strict";
  
  // Настройки доступности
  const settings = {
    'large-text': { class: 'a11y-large-text', icon: '🔤' },
    'high-contrast': { class: 'a11y-high-contrast', icon: '🌓' },
    'underline-links': { class: 'a11y-underline-links', icon: '🔗' },
    'reduce-motion': { class: 'a11y-reduce-motion', icon: '🎬' }
  };

  // Загружаем сохранённые настройки
  function loadSettings(){
    const saved = localStorage.getItem('spn_a11y_settings');
    return saved ? JSON.parse(saved) : {};
  }

  // Сохраняем настройки
  function saveSettings(settings){
    localStorage.setItem('spn_a11y_settings', JSON.stringify(settings));
  }

  // Применяем настройки к странице
  function applySettings(savedSettings){
    Object.keys(settings).forEach(key => {
      if (savedSettings[key]) {
        document.body.classList.add(settings[key].class);
      }
    });
  }

  // Обновляем визуальное состояние кнопок
  function updateButtonStates(savedSettings){
    Object.keys(settings).forEach(key => {
      const statusEl = document.querySelector(`[data-status="${key}"]`);
      if (statusEl) {
        statusEl.textContent = savedSettings[key] ? '🟢' : '⚪';
      }
    });
  }

  // Переключаем настройку
  function toggleSetting(settingKey){
    const savedSettings = loadSettings();
    savedSettings[settingKey] = !savedSettings[settingKey];
    
    if (savedSettings[settingKey]) {
      document.body.classList.add(settings[settingKey].class);
    } else {
      document.body.classList.remove(settings[settingKey].class);
    }
    
    saveSettings(savedSettings);
    updateButtonStates(savedSettings);
    
    // Вибрация на мобильных
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }

  // Добавляем стили
  function injectStyles(){
    if (document.getElementById('spn-a11y-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'spn-a11y-styles';
    style.textContent = `
      /* Крупный текст */
      .a11y-large-text body { font-size: 18px; }
      .a11y-large-text h1 { font-size: 2.2em; }
      .a11y-large-text h2 { font-size: 1.8em; }
      .a11y-large-text h3 { font-size: 1.4em; }
      .a11y-large-text button, .a11y-large-text input, .a11y-large-text select { font-size: 1.05em; }

      /* Высокий контраст */
      .a11y-high-contrast body { background: #000 !important; color: #fff !important; }
      .a11y-high-contrast a { color: #00e5ff !important; }
      .a11y-high-contrast .card, .a11y-high-contrast .container, .a11y-high-contrast .menu-container { background: #111 !important; color:#fff !important; border-color:#555 !important; }
      .a11y-high-contrast button { background:#fff !important; color:#000 !important; border:2px solid #fff !important; }

      /* Подчёркивание ссылок */
      .a11y-underline-links a { text-decoration: underline !important; text-underline-offset: 0.15em; }

      /* Меньше анимаций */
      .a11y-reduce-motion *, .a11y-reduce-motion *::before, .a11y-reduce-motion *::after { transition: none !important; animation: none !important; }

      /* Стили для кнопок доступности в меню */
      .a11y-toggle {
        display: flex !important;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px !important;
        text-decoration: none !important;
        color: inherit !important;
        border-radius: 6px;
        transition: background-color 0.2s;
      }
      
      .a11y-toggle:hover {
        background-color: rgba(255,255,255,0.1) !important;
      }
      
      .a11y-icon {
        margin-right: 8px;
        font-size: 16px;
      }
      
      .a11y-status {
        font-size: 14px;
        margin-left: auto;
      }
    `;
    document.head.appendChild(style);
  }

  // Инициализация
  function init(){
    console.log('🔧 Accessibility script initialized');
    injectStyles();
    
    const savedSettings = loadSettings();
    console.log('📋 Loaded settings:', savedSettings);
    applySettings(savedSettings);
    
    // Обработчики для кнопок доступности
    document.addEventListener('click', (e) => {
      const toggle = e.target.closest('.a11y-toggle');
      if (toggle) {
        console.log('🎯 Toggle clicked:', toggle.dataset.setting);
        e.preventDefault();
        const setting = toggle.dataset.setting;
        if (setting && settings[setting]) {
          toggleSetting(setting);
        }
      }
    });
    
    // Обновляем состояние кнопок после загрузки меню
    setTimeout(() => {
      console.log('🔍 Looking for toggle buttons...');
      const toggles = document.querySelectorAll('.a11y-toggle');
      console.log('📱 Found toggle buttons:', toggles.length);
      toggles.forEach(toggle => {
        console.log('  -', toggle.dataset.setting, toggle.textContent.trim());
      });
      updateButtonStates(savedSettings);
    }, 500); // Увеличил время ожидания
  }

  // Делаем функцию доступной глобально
  window.initAccessibility = init;

  // Автоматическая инициализация при загрузке DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Дополнительная инициализация через MutationObserver для динамически загруженного контента
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // Проверяем, добавились ли элементы меню
        const hasMenuElements = Array.from(mutation.addedNodes).some(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            return node.querySelector('.a11y-toggle') || node.classList.contains('a11y-toggle');
          }
          return false;
        });
        
        if (hasMenuElements) {
          console.log('🔄 Menu elements detected, updating accessibility...');
          setTimeout(() => {
            const savedSettings = loadSettings();
            updateButtonStates(savedSettings);
          }, 100);
        }
      }
    });
  });

  // Начинаем наблюдение за изменениями в DOM
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

})();

