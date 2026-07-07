(function(){
  "use strict";
  
// Проверка режима разработки - только localhost
  const IS_DEVELOPMENT = window.location.hostname === 'localhost';                        // Локальный хост
  
  // Настройки доступности с классами CSS и иконками
  const settings = {
    'large-text': { class: 'a11y-large-text', icon: '🔤' },                               // Крупный текст
    'high-contrast': { class: 'a11y-high-contrast', icon: '🌓' },                         // Высокий контраст
    'underline-links': { class: 'a11y-underline-links', icon: '🔗' },                     // Подчеркивание ссылок
    'reduce-motion': { class: 'a11y-reduce-motion', icon: '🎬' }                          // Уменьшение анимаций
  };

  // Загружаем сохранённые настройки из localStorage
  function loadSettings(){
    try {
      const saved = localStorage.getItem('spn_a11y_settings');                            // Получаем данные из хранилища
      return saved ? JSON.parse(saved) : {};                                              // Парсим JSON или возвращаем пустой объект
    } catch (e) {
      if (IS_DEVELOPMENT) {
        console.error('Ошибка загрузки настроек доступности:', e);                        // Логируем ошибку только в разработке
      }
      return {};                                                                          // Возвращаем пустой объект при ошибке
    }
  }

  // Сохраняем настройки в localStorage
  function saveSettings(settings){
    try {
      localStorage.setItem('spn_a11y_settings', JSON.stringify(settings));                // Сохраняем как JSON строку
    } catch (e) {
      if (IS_DEVELOPMENT) {
        console.error('Ошибка сохранения настроек доступности:', e);                      // Логируем ошибку только в разработке
      }
    }
  }

  // Применяем настройки к странице - добавляем/удаляем CSS классы
  function applySettings(savedSettings){
    Object.keys(settings).forEach(key => {                                                // Перебираем все настройки
      if (savedSettings[key]) {
        document.documentElement.classList.add(settings[key].class);                      // Добавляем класс если настройка включена
      } else {
        document.documentElement.classList.remove(settings[key].class);                   // Удаляем класс если настройка выключена
      }
    });
  }

  // Обновляем визуальное состояние кнопок в интерфейсе
  function updateButtonStates(savedSettings){
    Object.keys(settings).forEach(key => {                                                // Для каждой настройки
      const statusEl = document.querySelector(`[data-status="${key}"]`);                  // Находим элемент статуса
      if (statusEl) {
        statusEl.textContent = savedSettings[key] ? '🟢' : '⚪';                          // Зеленый кружок если включено, белый если выключено
      }
      const toggleEl = document.querySelector(`.a11y-toggle[data-setting="${key}"]`);     // Находим кнопку переключения
      if (toggleEl) {
        toggleEl.setAttribute('aria-checked', savedSettings[key] ? 'true' : 'false');     // Устанавливаем ARIA атрибут для доступности
      }
    });
  }

  // Переключаем настройку (включить/выключить)
  function toggleSetting(settingKey){
    const savedSettings = loadSettings();                                                 // Загружаем текущие настройки
    savedSettings[settingKey] = !savedSettings[settingKey];                               // Инвертируем значение настройки
    
    if (savedSettings[settingKey]) {
      document.documentElement.classList.add(settings[settingKey].class);                 // Добавляем CSS класс если включено
    } else {
      document.documentElement.classList.remove(settings[settingKey].class);              // Удаляем CSS класс если выключено
    }
    
    saveSettings(savedSettings);                                                          // Сохраняем изменения
    updateButtonStates(savedSettings);                                                    // Обновляем отображение кнопок
    
    // Вибрация на мобильных устройствах для тактильной обратной связи
    if (navigator.vibrate) {
      navigator.vibrate(50);                                                              // Короткая вибрация 50ms
    }
    
    return savedSettings[settingKey];                                                     // Возвращаем новое состояние настройки
  }

  // Добавляем CSS стили для доступности в head документа
  function injectStyles(){
    if (document.getElementById('spn-a11y-styles')) return;                              // Если стили уже добавлены - выходим
    
    const style = document.createElement('style');                                        // Создаем элемент style
    style.id = 'spn-a11y-styles';                                                         // Устанавливаем ID для предотвращения дублирования
    style.textContent = `
      /* Крупный текст - увеличиваем размеры шрифтов */
      .a11y-large-text { font-size: 20px; }
      .a11y-large-text h1 { font-size: 2.5em; }
      .a11y-large-text h2 { font-size: 2.0em; }
      .a11y-large-text h3 { font-size: 1.6em; }
      .a11y-large-text button, .a11y-large-text input, .a11y-large-text select { font-size: 1.15em; }

      /* Высокий контраст - черно-белая тема с золотыми акцентами */
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

      /* Подчёркивание ссылок - улучшает видимость для пользователей */
      .a11y-underline-links a { 
        text-decoration: underline !important; 
        text-underline-offset: 0.15em; 
      }

      /* Меньше анимаций - отключает переходы и анимации для чувствительных пользователей */
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
    document.head.appendChild(style);                                                     // Добавляем стили в head документа
  }

  // Основная функция инициализации скрипта доступности
  function init(){
    if (IS_DEVELOPMENT) {
      console.log('🔧 Accessibility script initialized');                                // Логируем инициализацию только в разработке
    }
    
    injectStyles();                                                                       // Вставляем CSS стили
    
    const savedSettings = loadSettings();                                                 // Загружаем сохраненные настройки
    
    if (IS_DEVELOPMENT) {
      console.log('📋 Loaded settings:', savedSettings);                                 // Логируем загруженные настройки только в разработке
    }
    
    // Автоприменение reduce-motion, если пользователь не задавал настройку
    if (savedSettings['reduce-motion'] === undefined) {
      try {
        const mql = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)'); // Проверяем системные настройки
        if (mql && mql.matches) {
          savedSettings['reduce-motion'] = true;                                          // Включаем если система требует уменьшения анимаций
          saveSettings(savedSettings);                                                    // Сохраняем настройку
        }
      } catch (e) {
        // безопасно игнорируем ошибки медиа-запросов
      }
    }

    // Применяем сохранённые настройки сразу при инициализации
    applySettings(savedSettings);
    
    // Обновляем состояние кнопок в интерфейсе
    updateButtonStates(savedSettings);
    
    // Делаем функции доступными глобально для menu.js и других скриптов
    window.initA11y = init;
    window.toggleA11ySetting = toggleSetting;
  }

  // Автоматическая инициализация при загрузке DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);                                  // Ждем полной загрузки DOM
  } else {
    init();                                                                               // Запускаем сразу если DOM уже готов
  }

})();