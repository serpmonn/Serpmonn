import {
  normalizeToolHref,
  loadAndMigrateFavorites,
  isFavoriteHref
} from '../scripts/tool-favorites.js';

document.addEventListener('DOMContentLoaded', () => {                                                                           // Ожидание полной загрузки DOM перед выполнением скрипта
  // Кэширование DOM-элементов
  const searchInput = document.querySelector('.filter-bar input[type="text"]');                                                // Поле ввода для поиска инструментов
  const categorySelect = document.querySelector('.filter-bar select');                                                         // Выпадающий список категорий
  const filterBar = document.getElementById('tools-filter-bar');
  const clearButton = document.getElementById('clear-filters');
  const clearFavoritesButton = document.getElementById('clear-favorites');                                                     // Кнопка очистки избранного
  const sortFavoritesButton = document.getElementById('sort-favorites');                                                       // Кнопка сортировки по избранному
  const toolsCountElement = document.getElementById('tools-count');                                                            // Элемент для отображения количества инструментов
  const cards = document.querySelectorAll('.category-section .card');                                                                            // Все карточки инструментов
  const filterMessage = document.querySelector('.filter-message');                                                             // Сообщение при отсутствии результатов
  const menuContainer = document.getElementById('menuContainer');                                                              // Контейнер меню

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

  // Удаление индикатора загрузки меню после его загрузки
  menuContainer.addEventListener('load', () => {                                                                               // Событие загрузки меню
    menuContainer.classList.remove('loading');                                                                                 // Удаление класса loading
  }, { once: true });                                                                                                          // Одноразовый обработчик

  let favorites = loadAndMigrateFavorites();

  function normalizeFavoriteKey(btn) {
    const link = btn.closest('.card')?.querySelector('a[href]');
    const href = link?.getAttribute('href') || '';
    return normalizeToolHref(href);
  }

  function isFavoriteKey(key) {
    if (!key) return false;
    return favorites.some(entry => isFavoriteHref(entry, key));
  }

  const categoryLabels = {};
  if (categorySelect) {
    categorySelect.querySelectorAll('option').forEach((option) => {
      if (option.value) categoryLabels[option.value] = option.textContent.trim();
    });
  }

  const defaultMetaDescription = document.querySelector('meta[name="description"]')?.content || '';
  const metaAllTemplate = filterBar?.dataset.dynamicMetaAll || defaultMetaDescription;
  const metaCategoryTemplate = filterBar?.dataset.dynamicMetaCategory || defaultMetaDescription;

  function updateMetaDescription(category = '') {
    const meta = document.querySelector('meta[name="description"]');
    if (!meta) return;
    if (!category) {
      meta.content = metaAllTemplate;
      return;
    }
    const categoryLabel = categoryLabels[category] || category;
    meta.content = metaCategoryTemplate.replace('{category}', categoryLabel);
  }

  toolsCountElement.textContent = document.querySelectorAll('.card:not(.tool-placeholder)').length;                            // Подсчет активных инструментов (исключая заглушки)

  // Обработчик для кнопок избранного
  document.querySelectorAll('.favorite-btn').forEach(btn => {                                                                  // Перебор всех кнопок избранного
    const toolKey = normalizeFavoriteKey(btn);                                                                                 // Стабильный ключ (href без локали или название)
    if (isFavoriteKey(toolKey)) {                                                                                              // Проверка, есть ли инструмент в избранном
      btn.classList.add('favorite');                                                                                           // Добавление класса для визуального выделения
      btn.setAttribute('aria-pressed', 'true');                                                                                // Установка состояния для accessibility
    } else {
      btn.classList.remove('favorite');                                                                                        // Удаление класса выделения
      btn.setAttribute('aria-pressed', 'false');                                                                               // Сброс состояния для accessibility
    }
    btn.addEventListener('click', () => {                                                                                      // Добавление обработчика клика
      if (!toolKey) return;                                                                                                   // Выход если нет ключа инструмента
      if (!isFavoriteKey(toolKey)) {                                                                                           // Если инструмента нет в избранном
        favorites.push(toolKey);                                                                                               // Добавление в массив избранного
        btn.classList.add('favorite');                                                                                         // Визуальное выделение
        btn.setAttribute('aria-pressed', 'true');                                                                              // Обновление состояния
      } else {
        favorites = favorites.filter(entry => !isFavoriteHref(entry, toolKey));
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

    const filteredCards = Array.from(cards).filter(card => {
      const titleEl = card.querySelector('h2');
      const descEl = card.querySelector('p');
      const section = card.closest('.category-section');
      if (!titleEl || !descEl || !section) {
        return false;
      }

      const title = titleEl.textContent.toLowerCase();
      const description = descEl.textContent.toLowerCase();
      const cardCategory = section.classList;

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
          const aKey = a.querySelector('.favorite-btn') ? normalizeFavoriteKey(a.querySelector('.favorite-btn')) : '';
          const bKey = b.querySelector('.favorite-btn') ? normalizeFavoriteKey(b.querySelector('.favorite-btn')) : '';
          const aIsFavorite = isFavoriteKey(aKey);
          const bIsFavorite = isFavoriteKey(bKey);
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
    updateMetaDescription(category);
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
  if (clearButton) clearButton.addEventListener('click', () => {                                                                                // Обработчик клика по кнопке очистки
    searchInput.value = '';                                                                                                    // Очистка поля поиска
    categorySelect.value = '';                                                                                                 // Сброс выбора категории
    sortFavoritesButton.classList.remove('active');                                                                            // Отключение сортировки по избранному
    window.history.replaceState({}, '', window.location.pathname);                                                             // Очистка параметров URL
    filterTools('', '', false);                                                                                                // Сброс фильтрации
  });
});