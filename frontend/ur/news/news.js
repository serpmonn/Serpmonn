/**
 * News page: filters, search, load more, ad visibility.
 */
import { getPageT } from '/frontend/scripts/i18n-loader.js';
import { getFrontendPath } from '/frontend/scripts/locale-paths.js';

document.addEventListener('DOMContentLoaded', async () => {
  const t = await getPageT('news');

  const categoryLinks = document.querySelectorAll('.category-link');
  const newsCards = document.querySelectorAll('.news-card');
  const searchInput = document.getElementById('searchInput');
  const searchSuggestions = document.getElementById('searchSuggestions');
  const loadMoreBtn = document.getElementById('loadMore');
  const loadingIndicator = document.getElementById('loadingIndicator');
  const newsGrid = document.getElementById('newsGrid');

  const itemsPerPage = 6;
  let visibleItems = itemsPerPage;
  let currentCategory = 'all';
  let currentSearch = '';

  init();

  function init() {
    categoryLinks.forEach((link) => {
      link.addEventListener('click', handleCategoryClick);
    });

    if (searchInput) {
      searchInput.addEventListener('input', handleSearch);
      searchInput.addEventListener('focus', showAllSuggestions);

      searchInput.addEventListener('keydown', function onSearchKeydown(e) {
        if (e.key === 'Escape') {
          this.value = '';
          currentSearch = '';
          updateDisplay();
          hideSuggestions();
        }
      });
    }

    if (loadMoreBtn) {
      loadMoreBtn.querySelector('button')?.addEventListener('click', loadMoreArticles);
    }

    processUrlParams();

    setTimeout(checkAdVisibility, 2000);
    setInterval(checkAdVisibility, 10000);

    updateDisplay();
  }

  function handleCategoryClick(e) {
    e.preventDefault();

    categoryLinks.forEach((l) => l.classList.remove('active'));
    this.classList.add('active');

    currentCategory = this.dataset.category;
    visibleItems = itemsPerPage;

    updateDisplay();
    updateUrl();
  }

  function handleSearch(e) {
    currentSearch = e.target.value.toLowerCase().trim();
    visibleItems = itemsPerPage;

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

    const allTags = new Set();
    newsCards.forEach((card) => {
      if (card.dataset.tags) {
        card.dataset.tags.split(',').forEach((tag) => allTags.add(tag.trim().toLowerCase()));
      }
    });

    const matchingTags = Array.from(allTags)
      .filter((tag) => searchTerm === '' || tag.includes(searchTerm))
      .slice(0, 5);

    if (matchingTags.length > 0) {
      matchingTags.forEach((tag) => {
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

    const newCards = Array.from(newsCards).filter(
      (card) =>
        card.style.display === 'block' &&
        card.getBoundingClientRect().top > window.innerHeight
    );

    if (newCards.length > 0) {
      newCards[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function cardMatchesFilters(card) {
    const matchesCategory = currentCategory === 'all' || card.dataset.category === currentCategory;
    const titleEl = card.querySelector('.news-card-title');
    const excerptEl = card.querySelector('.news-card-excerpt');
    const matchesSearch =
      currentSearch === '' ||
      (card.dataset.tags && card.dataset.tags.toLowerCase().includes(currentSearch)) ||
      (titleEl && titleEl.textContent.toLowerCase().includes(currentSearch)) ||
      (excerptEl && excerptEl.textContent.toLowerCase().includes(currentSearch));

    return matchesCategory && matchesSearch;
  }

  function updateDisplay() {
    if (loadingIndicator) {
      loadingIndicator.style.display = 'block';
    }

    requestAnimationFrame(() => {
      let visibleCount = 0;
      let hasVisibleCards = false;

      newsCards.forEach((card) => {
        const shouldShow = cardMatchesFilters(card) && visibleCount < visibleItems;

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

      updateLoadMoreButton(visibleCount);
      toggleNoResultsMessage(hasVisibleCards);

      if (loadingIndicator) {
        loadingIndicator.style.display = 'none';
      }
    });
  }

  function updateLoadMoreButton(visibleCount) {
    if (!loadMoreBtn) return;

    const totalMatching = Array.from(newsCards).filter(cardMatchesFilters).length;
    const button = loadMoreBtn.querySelector('button');
    if (!button) return;

    if (visibleCount < totalMatching) {
      loadMoreBtn.style.display = 'flex';
      button.textContent = t('news.loadMoreWithCount', {
        count: totalMatching - visibleCount
      });
    } else {
      loadMoreBtn.style.display = 'none';
    }
  }

  function createNoResultsElement() {
    const noResults = document.createElement('div');
    noResults.className = 'no-results';

    const heading = document.createElement('h3');
    heading.textContent = t('news.noResultsTitle');

    const hint = document.createElement('p');
    hint.textContent = t('news.noResultsHint');

    const linkWrap = document.createElement('p');
    const link = document.createElement('a');
    link.href = `${getFrontendPath('news/news.html')}?category=all`;
    link.className = 'rss-btn';
    link.style.display = 'inline-block';
    link.style.marginTop = '10px';
    link.textContent = t('news.viewAllArticles');
    linkWrap.appendChild(link);

    noResults.append(heading, hint, linkWrap);
    return noResults;
  }

  function toggleNoResultsMessage(hasVisibleCards) {
    let noResults = document.querySelector('.no-results');

    if (!hasVisibleCards) {
      if (!noResults) {
        noResults = createNoResultsElement();
        if (newsGrid?.parentNode) {
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
        categoryLinks.forEach((l) => l.classList.remove('active'));
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

    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    window.history.replaceState(null, '', newUrl);
  }

  function checkAdVisibility() {
    const adBanner = document.querySelector('.ad-top-banner');
    if (!adBanner) return;

    const adContent = adBanner.querySelector('ins');

    const isAdVisible =
      adContent &&
      adContent.offsetHeight > 0 &&
      adContent.innerHTML.trim() !== '' &&
      window.getComputedStyle(adContent).display !== 'none' &&
      window.getComputedStyle(adContent).visibility !== 'hidden' &&
      adContent.getBoundingClientRect().height > 0;

    adBanner.style.display = isAdVisible ? 'block' : 'none';
  }

  document.addEventListener('click', (e) => {
    if (
      searchInput &&
      searchSuggestions &&
      !searchInput.contains(e.target) &&
      !searchSuggestions.contains(e.target)
    ) {
      hideSuggestions();
    }
  });

  window.addEventListener('resize', () => {
    setTimeout(checkAdVisibility, 500);
  });
});

window.checkNewsAdVisibility = function checkNewsAdVisibility() {
  const adBanner = document.querySelector('.ad-top-banner');
  if (!adBanner) return;

  const adContent = adBanner.querySelector('ins');
  if (!adContent || adContent.offsetHeight === 0) {
    adBanner.style.display = 'none';
  }
};
