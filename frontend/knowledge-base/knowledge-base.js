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

    updateDisplay();
    initShareButtons();
  }

  function initShareButtons() {
    document.querySelectorAll('.kb-share-button').forEach((btn) => {
      btn.setAttribute('aria-label', t('news.shareAria'));
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const url = btn.dataset.shareUrl || '';
        const title = btn.dataset.shareTitle || '';
        openKbSharePopup(title, url);
      });
    });
  }

  function getOrCreateKbShareOverlay() {
    let overlay = document.getElementById('kb-share-popup-overlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'kb-share-popup-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', t('news.shareDialogAria'));
    overlay.innerHTML = `
      <div class="kb-share-popup">
        <button type="button" class="kb-share-popup__close" aria-label="${t('promo.close')}">&times;</button>
        <p class="kb-share-popup__title">${t('news.shareHeading')}</p>
        <p class="kb-share-popup__name"></p>
        <div class="kb-share-networks">
          <a class="kb-share-network-btn" id="kb-sn-vk" href="#" target="_blank" rel="noopener noreferrer" aria-label="VK">
            <span class="sn-icon sn-icon--vk"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M13.162 18.994c.609 0 .85-.407.84-1.024-.032-1.82.614-2.737 2.066-1.26 1.64 1.67 1.986 2.284 3.408 2.284h2.742c.814 0 1.143-.27.95-.8-.48-1.327-4.297-5.17-4.056-5.512.222-.317 3.347-4.596 3.604-5.664.13-.54-.1-.8-.72-.8H18.22c-.69 0-.91.38-1.14.96-1.048 2.7-2.86 5.073-3.57 4.633-.69-.424-.52-2.686-.484-4.252.02-.75.013-1.557-.746-1.738-.518-.124-1.26-.108-1.76-.108-1.47 0-2.67.5-2.018 1.36.49.643.637 1.934.44 4.26-.26 3.117-3.148-.95-4.29-4.17-.285-.81-.567-1.25-1.3-1.25H1.616c-.777 0-.932.366-.72.972 1.37 3.956 5.87 12.638 12.266 12.11z"/></svg></span>
            VK
          </a>
          <a class="kb-share-network-btn" id="kb-sn-tg" href="#" target="_blank" rel="noopener noreferrer" aria-label="Telegram">
            <span class="sn-icon sn-icon--tg"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8l-1.68 7.92c-.12.56-.46.7-.93.44l-2.58-1.9-1.24 1.2c-.14.14-.26.26-.52.26l.18-2.6 4.74-4.28c.2-.18-.04-.28-.32-.1L7.92 13.8l-2.52-.79c-.54-.17-.56-.54.12-.8l9.84-3.8c.46-.16.86.11.28.39z"/></svg></span>
            Telegram
          </a>
          <a class="kb-share-network-btn" id="kb-sn-max" href="#" target="_blank" rel="noopener noreferrer" aria-label="MAX">
            <span class="sn-icon sn-icon--max"><svg width="24" height="24" viewBox="0 0 42 42" fill="currentColor"><path fill-rule="evenodd" d="M21.47 41.88c-4.11 0-6.02-.6-9.34-3-2.1 2.7-8.75 4.81-9.04 1.2 0-2.71-.6-5-1.28-7.5C1 29.5.08 26.07.08 21.1.08 9.23 9.82.3 21.36.3c11.55 0 20.6 9.37 20.6 20.91a20.6 20.6 0 0 1-20.49 20.67m.17-31.32c-5.62-.29-10 3.6-10.97 9.7-.8 5.05.62 11.2 1.83 11.52.58.14 2.04-1.04 2.95-1.95a10.4 10.4 0 0 0 5.08 1.81 10.7 10.7 0 0 0 11.19-9.97 10.7 10.7 0 0 0-10.08-11.1Z" clip-rule="evenodd"/></svg></span>
            MAX
          </a>
          <a class="kb-share-network-btn" id="kb-sn-ok" href="#" target="_blank" rel="noopener noreferrer" aria-label="OK">
            <span class="sn-icon sn-icon--ok"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1zm0 4.5a3.5 3.5 0 110 7 3.5 3.5 0 010-7zm3.75 9.25c.47.47.47 1.23 0 1.7l-1.9 1.9c.52.14 1.05.23 1.6.27.66.05 1.16.62 1.11 1.28-.05.66-.62 1.16-1.28 1.11-1.45-.11-2.82-.62-3.98-1.44-1.16.82-2.53 1.33-3.98 1.44-.66.05-1.23-.45-1.28-1.11-.05-.66.45-1.23 1.11-1.28.55-.04 1.08-.13 1.6-.27l-1.9-1.9c-.47-.47-.47-1.23 0-1.7.47-.47 1.23-.47 1.7 0L12 16.54l2.05-2.04c.47-.47 1.23-.47 1.7.25z"/></svg></span>
            OK
          </a>
          <a class="kb-share-network-btn" id="kb-sn-email" href="#" aria-label="Email">
            <span class="sn-icon sn-icon--email"><svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg></span>
            Email
          </a>
        </div>
        <div class="kb-share-popup__url-row">
          <input type="text" class="kb-share-popup__url-input" readonly aria-label="${t('news.shareUrlAria')}">
          <button type="button" class="kb-share-popup__copy-btn">${t('promo.copy')}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const close = () => overlay.classList.remove('visible');
    overlay.querySelector('.kb-share-popup__close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('visible')) close();
    });

    overlay.querySelector('.kb-share-popup__copy-btn').addEventListener('click', () => {
      const input = overlay.querySelector('.kb-share-popup__url-input');
      const copyBtn = overlay.querySelector('.kb-share-popup__copy-btn');
      navigator.clipboard.writeText(input.value).catch(() => {
        input.select();
        document.execCommand('copy');
      });
      copyBtn.textContent = t('promo.copied');
      copyBtn.classList.add('copied');
      setTimeout(() => {
        copyBtn.textContent = t('promo.copy');
        copyBtn.classList.remove('copied');
      }, 2000);
    });

    return overlay;
  }

  async function openKbSharePopup(title, url) {
    const shareText = t('news.shareText', { name: title });
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (navigator.share && isMobile) {
      try {
        await navigator.share({ title: t('news.shareTitle'), text: shareText, url });
        return;
      } catch (_) {
        /* user cancelled or unsupported — fall through to popup */
      }
    }

    const overlay = getOrCreateKbShareOverlay();
    overlay.querySelector('.kb-share-popup__name').textContent = title;
    overlay.querySelector('.kb-share-popup__url-input').value = url;
    const enc = encodeURIComponent;
    overlay.querySelector('#kb-sn-vk').href =
      `https://vk.com/share.php?url=${enc(url)}&title=${enc(shareText)}`;
    overlay.querySelector('#kb-sn-tg').href =
      `https://t.me/share/url?url=${enc(url)}&text=${enc(shareText)}`;
    overlay.querySelector('#kb-sn-max').href =
      `https://max.ru/:share?text=${enc(`${shareText}\n\n${url}`)}`;
    overlay.querySelector('#kb-sn-ok').href =
      `https://connect.ok.ru/offer?url=${enc(url)}&title=${enc(shareText)}`;
    overlay.querySelector('#kb-sn-email').href =
      `mailto:?subject=${enc(t('news.emailSubject'))}&body=${enc(`${shareText}\n\n${url}`)}`;
    overlay.classList.add('visible');
    overlay.querySelector('.kb-share-popup__close').focus();
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
    link.href = `${getFrontendPath('knowledge-base/knowledge-base.html')}?category=all`;
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
});
