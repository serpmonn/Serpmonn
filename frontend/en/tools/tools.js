document.addEventListener('DOMContentLoaded', () => {                                                                           // Ожидание полной загрузки DOM перед выполнением скрипта
  // Кэширование DOM-элементов
  const adBanners = document.querySelectorAll('.ad-banner');                                                                   // Все рекламные баннеры на странице
  const searchInput = document.querySelector('.filter-bar input[type="text"]');                                                // Поле ввода для поиска инструментов
  const categorySelect = document.querySelector('.filter-bar select');                                                         // Выпадающий список категорий
  const clearButton = document.querySelector('.filter-bar button[aria-label="Очистить фильтры"]');                             // Кнопка очистки фильтров
  const clearFavoritesButton = document.getElementById('clear-favorites');                                                     // Кнопка очистки избранного
  const sortFavoritesButton = document.getElementById('sort-favorites');                                                       // Кнопка сортировки по избранному
  const toolsCountElement = document.getElementById('tools-count');                                                            // Элемент для отображения количества инструментов
  const cards = document.querySelectorAll('.card');                                                                            // Все карточки инструментов
  const filterMessage = document.querySelector('.filter-message');                                                             // Сообщение при отсутствии результатов
  const menuContainer = document.getElementById('menuContainer');                                                              // Контейнер меню
  let adScriptLoaded = false;                                                                                                  // Флаг загрузки рекламного скрипта

  // Функция debounce - ограничение частоты вызова функции
  function debounce(func, wait) {                                                                                              // func - функция для выполнения, wait - время задержки
    let timeout;                                                                                                               // Переменная для хранения идентификатора таймера
    return function executedFunction(...args) {                                                                                // Возвращаемая функция с аргументами
      const later = () => {                                                                                                    // Функция, выполняемая после задержки
        clearTimeout(timeout);                                                                                                 // Очистка таймера
        func(...args);                                                                                                         // Вызов оригинальной функции с аргументами
      };
      clearTimeout(timeout);                                                                                                   // Сброс предыдущего таймера
      timeout = setTimeout(later, wait);                                                                                       // Установка нового таймера
    };
  }

  // Ленивая загрузка скрипта рекламы
  function loadAdScript() {                                                                                                    // Функция загрузки рекламного скрипта
    if (!adScriptLoaded) {                                                                                                     // Проверка, не загружен ли уже скрипт
      const script = document.createElement('script');                                                                         // Создание элемента script
      script.src = 'https://ad.mail.ru/static/ads-async.js';                                                                   // URL скрипта рекламы Mail.ru
      script.async = true;                                                                                                     // Асинхронная загрузка
      script.onload = () => { adScriptLoaded = true; };                                                                        // Установка флага после загрузки
      document.head.appendChild(script);                                                                                       // Добавление скрипта в head документа
    }
  }

  // Инициализация рекламы с использованием Intersection Observer
  const observerOptions = { threshold: 0.1 };                                                                                  // Настройки observer - срабатывает при 10% видимости
  const adObserver = new IntersectionObserver(                                                                                 // Создание observer для ленивой загрузки рекламы
    debounce((entries, observer) => {                                                                                          // Оборачивание в debounce для оптимизации
      entries.forEach(entry => {                                                                                               // Обработка каждого наблюдаемого элемента
        if (entry.isIntersecting) {                                                                                            // Если элемент видим в viewport
          loadAdScript();                                                                                                      // Загрузка рекламного скрипта
          (MRGtag = window.MRGtag || []).push({});                                                                             // Инициализация рекламного тега
          observer.unobserve(entry.target);                                                                                    // Прекращение наблюдения за элементом
        }
      });
    }, 100),                                                                                                                   // Задержка 100ms для debounce
    observerOptions                                                                                                            // Передача настроек observer
  );

  // Один MutationObserver для всех баннеров - отслеживание изменений в DOM рекламных баннеров
  const mutationObserver = new MutationObserver(() => {                                                                        // Создание observer для отслеживания мутаций
    adBanners.forEach(banner => {                                                                                              // Перебор всех рекламных баннеров
      const ad = banner.querySelector('.mrg-tag');                                                                             // Поиск рекламного тега внутри баннера
      let attempts = 0;                                                                                                        // Счетчик попыток проверки
      const maxAttempts = 5;                                                                                                   // Максимальное количество попыток
      const interval = setInterval(() => {                                                                                     // Установка интервала для проверки
        if (!ad.hasChildNodes() || ad.innerHTML.trim() === '') {                                                               // Если реклама не загрузилась (пустой контент)
          if (attempts >= maxAttempts) {                                                                                       // Если достигнут лимит попыток
            banner.classList.add('hidden');                                                                                    // Скрытие баннера
            banner.classList.remove('loading');                                                                                // Удаление индикатора загрузки
            clearInterval(interval);                                                                                           // Очистка интервала
            setTimeout(() => {                                                                                                 // Повторная попытка через 5 секунд
              if (!ad.hasChildNodes() || ad.innerHTML.trim() === '') {                                                         // Если реклама все еще не загружена
                (MRGtag = window.MRGtag || []).push({});                                                                       // Повторная инициализация рекламы
              }
            }, 5000);
          }
        } else {                                                                                                               // Если реклама загрузилась успешно
          banner.classList.remove('loading');                                                                                  // Удаление индикатора загрузки
          clearInterval(interval);                                                                                             // Очистка интервала
        }
        attempts++;                                                                                                            // Увеличение счетчика попыток
      }, 1000);                                                                                                                // Проверка каждую секунду
    });
  });

  // Применение observers ко всем рекламным баннерам
  adBanners.forEach(banner => {                                                                                                // Перебор всех рекламных баннеров
    const ad = banner.querySelector('.mrg-tag');                                                                               // Поиск рекламного тега
    adObserver.observe(ad);                                                                                                    // Наблюдение за видимостью рекламы
    mutationObserver.observe(ad, { childList: true, subtree: true });                                                          // Наблюдение за изменениями в рекламном теге
  });

  // Удаление индикатора загрузки меню после его загрузки
  menuContainer.addEventListener('load', () => {                                                                               // Событие загрузки меню
    menuContainer.classList.remove('loading');                                                                                 // Удаление класса loading
  }, { once: true });                                                                                                          // Одноразовый обработчик

  // Инициализация избранного из localStorage
  let favorites = [];                                                                                                          // Массив для хранения избранных инструментов
  const storedFavorites = localStorage.getItem('favorites');                                                                   // Получение избранного из localStorage
  if (storedFavorites && typeof storedFavorites === 'string') {                                                                // Проверка наличия и типа данных
    try {
      favorites = JSON.parse(storedFavorites);                                                                                 // Парсинг JSON строки в массив
      if (!Array.isArray(favorites)) throw new Error('Invalid favorites format');                                              // Проверка, что это массив
    } catch (e) {                                                                                                              // Обработка ошибок парсинга
      favorites = [];                                                                                                          // Сброс к пустому массиву при ошибке
      localStorage.setItem('favorites', JSON.stringify(favorites));                                                            // Сохранение пустого массива
    }
  }

  // Установка начального количества инструментов
  toolsCountElement.textContent = document.querySelectorAll('.card:not(.tool-placeholder)').length;                            // Подсчет активных инструментов (исключая заглушки)

  // Обработчик для кнопок избранного
  document.querySelectorAll('.favorite-btn').forEach(btn => {                                                                  // Перебор всех кнопок избранного
    const toolName = btn.getAttribute('data-tool-name') || btn.parentElement.querySelector('h2').textContent.trim();           // Получение названия инструмента из data-атрибута или заголовка
    if (favorites.includes(toolName)) {                                                                                        // Проверка, есть ли инструмент в избранном
      btn.classList.add('favorite');                                                                                           // Добавление класса для визуального выделения
      btn.setAttribute('aria-pressed', 'true');                                                                                // Установка состояния для accessibility
    } else {
      btn.classList.remove('favorite');                                                                                        // Удаление класса выделения
      btn.setAttribute('aria-pressed', 'false');                                                                               // Сброс состояния для accessibility
    }
    btn.addEventListener('click', () => {                                                                                      // Добавление обработчика клика
      if (!toolName) return;                                                                                                   // Выход если нет названия инструмента
      if (!favorites.includes(toolName)) {                                                                                     // Если инструмента нет в избранном
        favorites.push(toolName);                                                                                              // Добавление в массив избранного
        btn.classList.add('favorite');                                                                                         // Визуальное выделение
        btn.setAttribute('aria-pressed', 'true');                                                                              // Обновление состояния
      } else {                                                                                                                 // Если инструмент уже в избранном
        favorites = favorites.filter(name => name !== toolName);                                                               // Удаление из массива
        btn.classList.remove('favorite');                                                                                      // Снятие визуального выделения
        btn.setAttribute('aria-pressed', 'false');                                                                             // Обновление состояния
      }
      try {
        localStorage.setItem('favorites', JSON.stringify(favorites));                                                          // Сохранение в localStorage
      } catch (e) {}                                                                                                           // Игнорирование ошибок localStorage
      if (sortFavoritesButton.classList.contains('active')) {                                                                  // Если активна сортировка по избранному
        filterTools(searchInput.value.replace(/[<>]/g, '').toLowerCase().trim(), categorySelect.value, true);                  // Обновление фильтрации
      }
    });
  });

  // Очистка избранного
  clearFavoritesButton.addEventListener('click', () => {                                                                       // Обработчик клика по кнопке очистки избранного
    favorites = [];                                                                                                            // Очистка массива избранного
    try {
      localStorage.removeItem('favorites');                                                                                    // Удаление из localStorage
    } catch (e) {}                                                                                                             // Игнорирование ошибок
    document.querySelectorAll('.favorite-btn').forEach(btn => {                                                                // Сброс состояния всех кнопок избранного
      btn.classList.remove('favorite');                                                                                        // Удаление класса выделения
      btn.setAttribute('aria-pressed', 'false');                                                                               // Сброс состояния
    });
    filterTools(searchInput.value.replace(/[<>]/g, '').toLowerCase().trim(), categorySelect.value, sortFavoritesButton.classList.contains('active')); // Обновление фильтрации
  });

  // Сортировка по избранному
  sortFavoritesButton.addEventListener('click', () => {                                                                        // Обработчик переключения сортировки
    sortFavoritesButton.classList.toggle('active');                                                                            // Переключение активного состояния
    const urlParams = new URLSearchParams(window.location.search);                                                             // Получение текущих параметров URL
    urlParams.set('sort', sortFavoritesButton.classList.contains('active') ? 'favorites' : '');                                // Установка параметра сортировки
    window.history.replaceState({}, '', `${window.location.pathname}?${urlParams}`);                                           // Обновление URL без перезагрузки
    filterTools(searchInput.value.replace(/[<>]/g, '').toLowerCase().trim(), categorySelect.value, sortFavoritesButton.classList.contains('active')); // Применение фильтрации
  });

  // Кэш для фильтрации - оптимизация повторных фильтраций
  const filterCache = new Map();                                                                                               // Создание Map для кэширования результатов

  // Функция фильтрации карточек по поисковому запросу и категории
  function filterCards(searchTerm = '', category = '') {                                                                       // searchTerm - строка поиска, category - выбранная категория
    const cacheKey = `${searchTerm}|${category}`;                                                                              // Создание ключа для кэша
    if (filterCache.has(cacheKey)) {                                                                                           // Проверка наличия в кэше
      return filterCache.get(cacheKey);                                                                                        // Возврат закэшированного результата
    }

    const filteredCards = Array.from(cards).filter(card => {                                                                   // Фильтрация массива карточек
      const title = card.querySelector('h2').textContent.toLowerCase();                                                        // Получение заголовка в нижнем регистре
      const description = card.querySelector('p').textContent.toLowerCase();                                                   // Получение описания в нижнем регистре
      const cardCategory = card.closest('.category-section').classList;                                                        // Получение классов родительской секции

      const matchesSearch = !searchTerm || title.includes(searchTerm) || description.includes(searchTerm);                     // Проверка соответствия поиску
      const matchesCategory = !category || cardCategory.contains(`category-${category}`);                                      // Проверка соответствия категории
      return matchesSearch && matchesCategory;                                                                                 // Возврат карточек, соответствующих обоим условиям
    });

    filterCache.set(cacheKey, filteredCards);                                                                                  // Сохранение результата в кэш
    return filteredCards;                                                                                                      // Возврат отфильтрованного массива
  }

  // Функция сортировки карточек по избранному
  function sortCards(cards, sortByFavorites = false) {                                                                         // cards - массив карточек, sortByFavorites - флаг сортировки
    return sortByFavorites                                                                                                     // Если включена сортировка по избранному
      ? cards.sort((a, b) => {                                                                                                 // Сортировка массива
          const aIsFavorite = favorites.includes(a.querySelector('.favorite-btn')?.getAttribute('data-tool-name') || a.querySelector('h2').textContent.trim()); // Проверка избранного для карточки A
          const bIsFavorite = favorites.includes(b.querySelector('.favorite-btn')?.getAttribute('data-tool-name') || b.querySelector('h2').textContent.trim()); // Проверка избранного для карточки B
          return bIsFavorite - aIsFavorite;                                                                                    // Сортировка: избранные сверху (true - false = 1)
        })
      : cards;                                                                                                                 // Возврат исходного массива без сортировки
  }

  // Основная функция фильтрации и сортировки инструментов
  function filterTools(searchTerm = '', category = '', sortByFavorites = false) {                                              // Параметры фильтрации и сортировки
    const filteredCards = filterCards(searchTerm, category);                                                                   // Фильтрация карточек
    const sortedCards = sortCards(filteredCards, sortByFavorites);                                                             // Сортировка отфильтрованных карточек

    cards.forEach(card => {                                                                                                    // Обработка каждой карточки
      card.style.display = sortedCards.includes(card) ? '' : 'none';                                                           // Показ/скрытие карточки
      if (sortedCards.includes(card)) {                                                                                        // Если карточка прошла фильтрацию
        card.parentElement.appendChild(card);                                                                                 // Перемещение в конец для правильного порядка
      }
    });

    const activeCount = document.querySelectorAll('.card:not(.tool-placeholder):not([style*="display: none"])').length;        // Подсчет видимых активных инструментов
    toolsCountElement.textContent = activeCount;                                                                               // Обновление счетчика
    filterMessage.classList.toggle('hidden', activeCount > 0);                                                                 // Показ/скрытие сообщения "не найдено"

    // Обновление мета-описания для SEO
    document.querySelector('meta[name="description"]').content = `Инструменты Serpmonn для ${category || 'всех категорий'}: UTM-генератор, пароли, калькуляторы и др.`; // Динамическое обновление meta description
  }

  // Инициализация фильтрации из параметров URL
  const urlParams = new URLSearchParams(window.location.search);                                                               // Получение параметров из URL
  const initialCategory = urlParams.get('category') || '';                                                                     // Получение начальной категории
  const initialSort = urlParams.get('sort') === 'favorites';                                                                   // Проверка начальной сортировки
  categorySelect.value = initialCategory;                                                                                      // Установка значения выпадающего списка
  if (initialSort) sortFavoritesButton.classList.add('active');                                                                // Активация сортировки если нужно
  filterTools('', initialCategory, initialSort);                                                                               // Применение начальной фильтрации

  // Обработчик поиска с debounce для оптимизации
  let searchTimeout = null;                                                                                                    // Переменная для хранения таймера
  searchInput.addEventListener('input', (e) => {                                                                               // Обработчик ввода в поле поиска
    if (searchTimeout) clearTimeout(searchTimeout);                                                                            // Очистка предыдущего таймера
    searchTimeout = setTimeout(() => {                                                                                         // Установка нового таймера
      const searchTerm = e.target.value.replace(/[<>]/g, '').toLowerCase().trim();                                             // Очистка и нормализация поискового запроса
      const urlParams = new URLSearchParams(window.location.search);                                                           // Получение текущих параметров URL
      urlParams.set('search', searchTerm);                                                                                     // Установка параметра поиска
      window.history.replaceState({}, '', `${window.location.pathname}?${urlParams}`);                                         // Обновление URL
      filterTools(searchTerm, categorySelect.value, sortFavoritesButton.classList.contains('active'));                         // Применение фильтрации
    }, 300);                                                                                                                   // Задержка 300ms
  });

  // Обработчик изменения категории
  categorySelect.addEventListener('change', (e) => {                                                                           // Обработчик изменения выпадающего списка
    const urlParams = new URLSearchParams(window.location.search);                                                             // Получение параметров URL
    urlParams.set('category', e.target.value);                                                                                 // Установка выбранной категории
    window.history.replaceState({}, '', `${window.location.pathname}?${urlParams}`);                                           // Обновление URL
    filterTools(searchInput.value.replace(/[<>]/g, '').toLowerCase().trim(), e.target.value, sortFavoritesButton.classList.contains('active')); // Применение фильтрации
  });

  // Обработчик кнопки "Очистить фильтры"
  clearButton.addEventListener('click', () => {                                                                                // Обработчик клика по кнопке очистки
    searchInput.value = '';                                                                                                    // Очистка поля поиска
    categorySelect.value = '';                                                                                                 // Сброс выбора категории
    sortFavoritesButton.classList.remove('active');                                                                            // Отключение сортировки по избранному
    window.history.replaceState({}, '', window.location.pathname);                                                             // Очистка параметров URL
    filterTools('', '', false);                                                                                                // Сброс фильтрации
  });
});