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
    try {
      const saved = localStorage.getItem('spn_a11y_settings');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error('Ошибка загрузки настроек доступности:', e);
      return {};
    }
  }

  // Сохраняем настройки
  function saveSettings(settings){
    try {
      localStorage.setItem('spn_a11y_settings', JSON.stringify(settings));
    } catch (e) {
      console.error('Ошибка сохранения настроек доступности:', e);
    }
  }

  // Применяем настройки к странице
  function applySettings(savedSettings){
    Object.keys(settings).forEach(key => {
      if (savedSettings[key]) {
        document.documentElement.classList.add(settings[key].class);
      } else {
        document.documentElement.classList.remove(settings[key].class);
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
      const toggleEl = document.querySelector(`.a11y-toggle[data-setting="${key}"]`);
      if (toggleEl) {
        toggleEl.setAttribute('aria-checked', savedSettings[key] ? 'true' : 'false');
      }
    });
  }

  // Переключаем настройку
  function toggleSetting(settingKey){
    const savedSettings = loadSettings();
    savedSettings[settingKey] = !savedSettings[settingKey];
    
    if (savedSettings[settingKey]) {
      document.documentElement.classList.add(settings[settingKey].class);
    } else {
      document.documentElement.classList.remove(settings[settingKey].class);
    }
    
    saveSettings(savedSettings);
    updateButtonStates(savedSettings);
    
    // Вибрация на мобильных
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    return savedSettings[settingKey];
  }

  // Добавляем стили
  function injectStyles(){
    if (document.getElementById('spn-a11y-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'spn-a11y-styles';
    style.textContent = `
      /* Крупный текст */
      .a11y-large-text { font-size: 20px; }
      .a11y-large-text h1 { font-size: 2.5em; }
      .a11y-large-text h2 { font-size: 2.0em; }
      .a11y-large-text h3 { font-size: 1.6em; }
      .a11y-large-text button, .a11y-large-text input, .a11y-large-text select { font-size: 1.15em; }

      /* Высокий контраст */
      .a11y-high-contrast { 
        --text-color: #fff !important;
        --bg-color: #000 !important;
        --accent-color: #ffd700 !important; /* золотистый для ссылок */
        --border-color: #777 !important;
      }
      
      .a11y-high-contrast body { 
        background: var(--bg-color) !important; 
        color: var(--text-color) !important; 
      }
      
      .a11y-high-contrast a { 
        color: var(--accent-color) !important; 
        text-decoration: underline !important; 
      }
      
      .a11y-high-contrast .card, 
      .a11y-high-contrast .container, 
      .a11y-high-contrast .menu-container { 
        background: #111 !important; 
        color: var(--text-color) !important; 
        border-color: var(--border-color) !important; 
      }
      
      .a11y-high-contrast button { 
        background: var(--text-color) !important; 
        color: var(--bg-color) !important; 
        border: 2px solid var(--text-color) !important; 
      }
      .a11y-high-contrast :focus { outline: 3px solid #ffff00 !important; outline-offset: 2px; }
      .a11y-high-contrast .badge { background: #222 !important; color: #fff !important; border: 1px solid #fff !important; }

      /* Подчёркивание ссылок */
      .a11y-underline-links a { 
        text-decoration: underline !important; 
        text-underline-offset: 0.15em; 
      }

      /* Меньше анимаций */
      .a11y-reduce-motion *, 
      .a11y-reduce-motion *::before, 
      .a11y-reduce-motion *::after { 
        transition: none !important; 
        animation: none !important; 
        scroll-behavior: auto !important;
      }

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
    
    // Автоприменение reduce-motion, если пользователь не задавал настройку
    if (savedSettings['reduce-motion'] === undefined) {
      try {
        const mql = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)');
        if (mql && mql.matches) {
          savedSettings['reduce-motion'] = true;
          saveSettings(savedSettings);
        }
      } catch (e) {
        // безопасно игнорируем
      }
    }

    // Применяем сохранённые настройки сразу при инициализации
    applySettings(savedSettings);
    
    // Обновляем состояние кнопок
    updateButtonStates(savedSettings);
    
    // Делаем функции доступными глобально для menu.js
    window.initA11y = init;
    window.toggleA11ySetting = toggleSetting;
  }

  // Автоматическая инициализация при загрузке DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();