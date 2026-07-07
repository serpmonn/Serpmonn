/**
 * Улучшенный скрипт для страницы новостей
 * С обработкой рекламы и динамической загрузкой контента
 */

document.addEventListener("DOMContentLoaded", function() {
  // Элементы DOM
  const categoryLinks = document.querySelectorAll('.category-link');
  const newsCards = document.querySelectorAll('.news-card');
  const searchInput = document.getElementById('searchInput');
  const searchSuggestions = document.getElementById('searchSuggestions');
  const loadMoreBtn = document.getElementById('loadMore');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const newsGrid = document.getElementById('newsGrid');
  
  // Настройки
  const itemsPerPage = 6;
  let visibleItems = itemsPerPage;
  let currentCategory = 'all';
  let currentSearch = '';

  // Инициализация
  init();

  function init() {
    // Обработчики категорий
    categoryLinks.forEach(link => {
      link.addEventListener('click', handleCategoryClick);
    });

    // Обработчик поиска
    if (searchInput) {
      searchInput.addEventListener('input', handleSearch);
      searchInput.addEventListener('focus', showAllSuggestions);
      
      // Очистка поиска при нажатии Escape
      searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
          this.value = '';
          currentSearch = '';
          updateDisplay();
          hideSuggestions();
        }
      });
    }

    // Обработчик кнопки "Загрузить еще"
    if (loadMoreBtn) {
      loadMoreBtn.querySelector('button').addEventListener('click', loadMoreArticles);
    }

    // Обработка URL параметров
    processUrlParams();
    
    // Проверка рекламы
    setTimeout(checkAdVisibility, 2000);
    setInterval(checkAdVisibility, 10000); // Проверка каждые 10 секунд
    
    // Инициализация отображения
    updateDisplay();
  }

  function handleCategoryClick(e) {
    e.preventDefault();
    
    // Обновление активной категории
    categoryLinks.forEach(l => l.classList.remove('active'));
    this.classList.add('active');
    
    currentCategory = this.dataset.category;
    visibleItems = itemsPerPage; // Сброс пагинации
    
    updateDisplay();
    updateUrl();
  }

  function handleSearch(e) {
    currentSearch = e.target.value.toLowerCase().trim();
    visibleItems = itemsPerPage; // Сброс пагинации при новом поиске
    
    if (currentSearch.length > 0) {
      showSuggestions(currentSearch);
    } else {
      hideSuggestions();
    }
    
    updateDisplay();
  }

  function showAllSuggestions() {
    if (currentSearch.length === 0) {
      showSuggestions('');
    }
  }

  function showSuggestions(searchTerm) {
    if (!searchSuggestions) return;
    
    searchSuggestions.innerHTML = '';
    
    // Получаем все уникальные теги
    const allTags = new Set();
    newsCards.forEach(card => {
      if (card.dataset.tags) {
        const tags = card.dataset.tags.split(',');
        tags.forEach(tag => allTags.add(tag.trim().toLowerCase()));
      }
    });
    
    // Фильтруем теги по поисковому запросу
    const matchingTags = Array.from(allTags).filter(tag => 
      searchTerm === '' || tag.includes(searchTerm)
    ).slice(0, 5); // Ограничиваем 5 подсказками
    
    if (matchingTags.length > 0) {
      matchingTags.forEach(tag => {
        const suggestion = document.createElement('div');
        suggestion.className = 'search-suggestion';
        suggestion.textContent = tag;
        suggestion.addEventListener('click', () => {
          searchInput.value = tag;
          currentSearch = tag.toLowerCase();
          updateDisplay();
          hideSuggestions();
        });
        searchSuggestions.appendChild(suggestion);
      });
      searchSuggestions.style.display = 'block';
    } else {
      hideSuggestions();
    }
  }

  function hideSuggestions() {
    if (searchSuggestions) {
      searchSuggestions.style.display = 'none';
    }
  }

  function loadMoreArticles() {
    visibleItems += itemsPerPage;
    updateDisplay();
    
    // Плавная прокрутка к новым элементам
    const newCards = Array.from(newsCards).filter(card => 
      card.style.display === 'block' && 
      card.getBoundingClientRect().top > window.innerHeight
    );
    
    if (newCards.length > 0) {
      newCards[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function updateDisplay() {
    if (loadingIndicator) {
      loadingIndicator.style.display = 'block';
    }
    
    // Используем requestAnimationFrame для плавного обновления
    requestAnimationFrame(() => {
      let visibleCount = 0;
      let hasVisibleCards = false;
      
      newsCards.forEach((card, index) => {
        const matchesCategory = currentCategory === 'all' || card.dataset.category === currentCategory;
        const matchesSearch = currentSearch === '' || 
          (card.dataset.tags && card.dataset.tags.toLowerCase().includes(currentSearch)) ||
          (card.querySelector('.news-card-title') && card.querySelector('.news-card-title').textContent.toLowerCase().includes(currentSearch)) ||
          (card.querySelector('.news-card-excerpt') && card.querySelector('.news-card-excerpt').textContent.toLowerCase().includes(currentSearch));
        
        const shouldShow = matchesCategory && matchesSearch && visibleCount < visibleItems;
        
        if (shouldShow) {
          card.style.display = 'block';
          card.classList.remove('hidden');
          visibleCount++;
          hasVisibleCards = true;
        } else {
          card.style.display = 'none';
          card.classList.add('hidden');
        }
      });
      
      // Управление состоянием кнопки "Загрузить еще"
      updateLoadMoreButton(visibleCount);
      
      // Показать/скрыть сообщение "ничего не найдено"
      toggleNoResultsMessage(hasVisibleCards);
      
      if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
      }
    });
  }

  function updateLoadMoreButton(visibleCount) {
    if (!loadMoreBtn) return;
    
    const totalMatching = Array.from(newsCards).filter(card => {
      const matchesCategory = currentCategory === 'all' || card.dataset.category === currentCategory;
      const matchesSearch = currentSearch === '' || 
        (card.dataset.tags && card.dataset.tags.toLowerCase().includes(currentSearch)) ||
        (card.querySelector('.news-card-title') && card.querySelector('.news-card-title').textContent.toLowerCase().includes(currentSearch));
      
      return matchesCategory && matchesSearch;
    }).length;
    
    if (visibleCount < totalMatching) {
      loadMoreBtn.style.display = 'flex';
      loadMoreBtn.querySelector('button').textContent = `Загрузить еще (${totalMatching - visibleCount})`;
    } else {
      loadMoreBtn.style.display = 'none';
    }
  }

  function toggleNoResultsMessage(hasVisibleCards) {
    let noResults = document.querySelector('.no-results');
    
    if (!hasVisibleCards) {
      if (!noResults) {
        noResults = document.createElement('div');
        noResults.className = 'no-results';
        noResults.innerHTML = `
          <h3>🔍 Ничего не найдено</h3>
          <p>Попробуйте изменить запрос или выбрать другую категорию.</p>
          <p><a href="/frontend/news/?category=all" class="rss-btn" style="display:inline-block;margin-top:10px;">Смотреть все статьи</a></p>
        `;
        if (newsGrid && newsGrid.parentNode) {
          newsGrid.parentNode.insertBefore(noResults, newsGrid.nextSibling);
        }
      }
    } else if (noResults) {
      noResults.remove();
    }
  }

  function processUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const category = urlParams.get('category');
    const search = urlParams.get('search');
    
    if (category) {
      const categoryLink = document.querySelector(`[data-category="${category}"]`);
      if (categoryLink) {
        categoryLinks.forEach(l => l.classList.remove('active'));
        categoryLink.classList.add('active');
        currentCategory = category;
      }
    }
    
    if (search && searchInput) {
      searchInput.value = search;
      currentSearch = search.toLowerCase();
    }
  }

  function updateUrl() {
    const params = new URLSearchParams();
    if (currentCategory !== 'all') params.set('category', currentCategory);
    if (currentSearch) params.set('search', currentSearch);
    
    const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
    window.history.replaceState(null, '', newUrl);
  }

  function checkAdVisibility() {
    const adBanner = document.querySelector('.ad-top-banner');
    if (!adBanner) return;
    
    const adContent = adBanner.querySelector('ins');
    
    // Проверяем различные условия невидимости рекламы
    const isAdVisible = adContent && 
                       adContent.offsetHeight > 0 && 
                       adContent.innerHTML.trim() !== '' &&
                       window.getComputedStyle(adContent).display !== 'none' &&
                       window.getComputedStyle(adContent).visibility !== 'hidden' &&
                       adContent.getBoundingClientRect().height > 0;
    
    if (!isAdVisible) {
      adBanner.style.display = 'none';
    } else {
      adBanner.style.display = 'block';
    }
  }

  // Закрытие подсказок при клике вне поиска
  document.addEventListener('click', function(e) {
    if (searchInput && searchSuggestions && 
        !searchInput.contains(e.target) && 
        !searchSuggestions.contains(e.target)) {
      hideSuggestions();
    }
  });

  // Обработка изменения размера окна
  window.addEventListener('resize', function() {
    // Перепроверяем видимость рекламы при изменении размера
    setTimeout(checkAdVisibility, 500);
  });
});

// Глобальная функция для проверки рекламы (может быть вызвана извне)
window.checkNewsAdVisibility = function() {
  const adBanner = document.querySelector('.ad-top-banner');
  if (!adBanner) return;
  
  const adContent = adBanner.querySelector('ins');
  if (!adContent || adContent.offsetHeight === 0) {
    adBanner.style.display = 'none';
  }
};