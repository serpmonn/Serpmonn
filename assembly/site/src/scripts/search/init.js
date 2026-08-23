import { loadMessages, getMessages } from '../i18n-loader.js';
import { showCookieBanner } from '../cookies.js';
import { loadNews } from '../news.js';
import { generateCombinedBackground } from '../backgroundGenerator.js';
import { initAdSlotObserver } from '../ad-pool.js';
import { searchState } from './state.js';
import {
  generateIdempotencyKey,
  getCurrentLocale,
  getQueryFromUrl
} from './env-analytics.js';
import {
  getModeFromUrl,
  getStoredSearchMode,
  getSearchMode,
  syncSearchQueryToUrl
} from './mode-filters.js';
import { prefetchPromoIntent } from './promo-intent.js';
import {
  hasImageAttachment,
  getSearchAttachmentPayload,
  initTxtAttachment,
  runReverseImageSearch
} from './attachments.js';
import { initVoiceInput } from './voice.js';
import {
  showLoading,
  showMediaLoading,
  hideMediaResults,
  requestAiSearch,
  consumeAiSearchStream,
  createStreamState,
  handleAiSearchStreamEvent,
  showSearchTimings
} from './ai-search.js';
import {
  showResult,
  showImageResults,
  showVideoResults
} from './quota-result.js';
import {
  setSearchMode,
  initResultsFilters,
  initAutocomplete,
  runResultsSearch,
  renderResultsMode
} from './results-mode.js';

function initAdObserver() {
  initAdSlotObserver();
}

async function initPage() {
  if (searchState.pageInitialized) return;
  searchState.pageInitialized = true;
  await loadMessages();

  // Больше НЕ падаем если #news-container нет — он опционален
  const newsContainer = document.getElementById('news-container');
  if (newsContainer) {
    newsContainer.addEventListener('click', function () {
      this.classList.toggle('expanded');
    });
  }

  function setupEventListeners() {
    const searchForm = document.getElementById('ai-search-form');
    const modeToggle = searchForm?.querySelector('.search-mode-toggle');
    const modeButtons = searchForm ? Array.from(searchForm.querySelectorAll('.search-mode-btn')) : [];
    const searchInput = searchForm?.querySelector('input[name="q"]');

    if (!searchForm) {
      console.warn('[AI] Форма поиска не найдена');
      return;
    }

    let isSubmitting = false;
    let currentIdempotencyKey = null;

    function setSubmitLoading(loading) {
      if (modeToggle) modeToggle.classList.toggle('is-loading', loading);
      modeButtons.forEach((btn) => {
        btn.disabled = loading;
      });
    }

    setSearchMode(getModeFromUrl() || getStoredSearchMode() || getSearchMode(searchForm));
    initResultsFilters();

    const isSubmittingRef = () => isSubmitting;
    initAutocomplete(searchInput, searchForm, {
      isSubmittingRef,
      setSubmitLoading,
      runSearch: async (query) => {
        if (!query || isSubmitting) return;
        isSubmitting = true;
        setSubmitLoading(true);
        try {
          setSearchMode('results');
          syncSearchQueryToUrl(query, 'results');
          await runResultsSearch(query, searchState.currentResultsCategory || 'general');
        } finally {
          isSubmitting = false;
          setSubmitLoading(false);
        }
      }
    });

    modeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (isSubmitting) return;
        const mode = btn.dataset.searchMode === 'results' ? 'results' : 'ai';
        const prev = getSearchMode(searchForm);
        if (mode === prev) return;
        setSearchMode(mode);
        const query = searchInput?.value.trim();
        if (!query) {
          searchInput?.focus();
          return;
        }
        searchForm.requestSubmit();
      });
    });

    searchInput?.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      e.preventDefault();
      if (isSubmitting) return;
      // Фото можно искать без текста в поле
      if (!searchInput.value.trim() && !hasImageAttachment()) return;
      searchForm.requestSubmit();
    });

    document.querySelectorAll('.results-tab').forEach((tab) => {
      tab.addEventListener('click', async () => {
        if (getSearchMode(searchForm) !== 'results') return;
        const category = tab.dataset.resultsCategory || 'general';
        const query = (searchState.resultsQuery || searchInput?.value || '').trim();
        if (!query || isSubmitting) return;
        isSubmitting = true;
        setSubmitLoading(true);
        try {
          await runResultsSearch(query, category);
        } catch (error) {
          console.error('[Results] tab error:', error);
          renderResultsMode({
            category,
            results: [],
            error: getMessages().resultsNetworkError || getMessages().networkError
          });
        } finally {
          isSubmitting = false;
          setSubmitLoading(false);
        }
      });
    });

    document.getElementById('ai-result-content')?.addEventListener('click', async (e) => {
      const btn = e.target?.closest?.('[data-results-query]');
      if (!btn || getSearchMode(searchForm) !== 'results') return;
      const nextQuery = String(btn.dataset.searchState.resultsQuery || '').trim();
      if (!nextQuery || isSubmitting) return;
      if (searchInput) {
        searchInput.value = nextQuery;
        searchInput.scrollLeft = 0;
      }
      syncSearchQueryToUrl(nextQuery);
      isSubmitting = true;
      setSubmitLoading(true);
      try {
        await runResultsSearch(nextQuery, searchState.currentResultsCategory || 'general');
      } catch (error) {
        console.error('[Results] suggestion error:', error);
        renderResultsMode({
          category: searchState.currentResultsCategory || 'general',
          results: [],
          error: getMessages().resultsNetworkError || getMessages().networkError
        });
      } finally {
        isSubmitting = false;
        setSubmitLoading(false);
      }
    });

    searchForm.addEventListener('submit', async e => {
      e.preventDefault();
      e.stopPropagation();

      const isVoiceInput = searchInput?.dataset.voiceInput === 'true';
      if (isVoiceInput) {
        delete searchInput.dataset.voiceInput;
      }

      if (isSubmitting) {
        console.warn('[AI] ⛔ Запрос УЖЕ выполняется (isSubmitting=true), ИГНОРИРУЕМ');
        return;
      }

      const query = searchInput?.value.trim();
      const imageAttached = hasImageAttachment();

      if (!query && !imageAttached) {
        return;
      }

      // Поиск по фото — всегда через Выдачу (reverse image), без vision-модели
      if (imageAttached) {
        syncSearchQueryToUrl(query || '');
        isSubmitting = true;
        setSubmitLoading(true);
        try {
          await runReverseImageSearch();
        } catch (error) {
          console.error('[Results] ❌ Ошибка reverse-image:', error);
          renderResultsMode({
            category: 'images',
            results: [],
            error: getMessages().reverseImageError || getMessages().resultsNetworkError || getMessages().networkError
          });
        } finally {
          isSubmitting = false;
          setSubmitLoading(false);
        }
        return;
      }

      syncSearchQueryToUrl(query);

      isSubmitting = true;
      setSubmitLoading(true);
      prefetchPromoIntent(query);

      if (getSearchMode(searchForm) === 'results') {
        try {
          await runResultsSearch(query, searchState.currentResultsCategory || 'general');
        } catch (error) {
          console.error('[Results] ❌ Ошибка при запросе к /web-search:', error);
          renderResultsMode({
            category: searchState.currentResultsCategory || 'general',
            results: [],
            error: getMessages().resultsNetworkError || getMessages().networkError
          });
        } finally {
          isSubmitting = false;
          setSubmitLoading(false);
          if (searchInput) {
            searchInput.placeholder =
              searchForm.dataset.placeholderResults ||
              getMessages().askResults ||
              getMessages().askAnything;
          }
        }
        return;
      }

      showLoading();

      const container = document.getElementById('ai-result-container');
      if (container) {
        container.style.display = 'block';
      }

      const resultsTabs = document.getElementById('results-tabs');
      if (resultsTabs) resultsTabs.hidden = true;
      const resultsFooter = document.querySelector('.ai-result-footer');
      if (resultsFooter) resultsFooter.style.display = '';

      showImageResults({ images: [] });
      showVideoResults({ videos: [] });

      const attachmentPayload = getSearchAttachmentPayload();
      const hasAttachment = Boolean(attachmentPayload.attachmentText);

      if (!hasAttachment) {
        showMediaLoading('images');
        showMediaLoading('videos');
      } else {
        hideMediaResults('images');
        hideMediaResults('videos');
      }

      let idempotencyKey = null;
      const useStream = true;

      try {
        idempotencyKey = generateIdempotencyKey();
        currentIdempotencyKey = idempotencyKey;

        const locale = getCurrentLocale();
        const result = await requestAiSearch({
          query,
          idempotencyKey,
          locale,
          useStream,
          attachment: attachmentPayload
        });

        if (currentIdempotencyKey !== idempotencyKey) {
          console.warn('[AI] ⚠️ Обнаружен более новый запрос, игнорируем старый ответ');
          return;
        }

        if (result.mode === 'json') {
          const { response, data } = result;

          if (!response.ok) {
            if (data?.error) {
              showResult({
                error: data.error,
                needAuth: data.needAuth === true,
                limit: data.limit,
                used: data.used
              });
            } else {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            showImageResults({ images: [] });
            showVideoResults({ videos: [] });
            return;
          }

          showResult({
            answer: data?.answer || '',
            usedWebSearch: data?.usedWebSearch === true,
            sources: Array.isArray(data?.sources) ? data.sources : [],
            answerEmpty: data?.answerEmpty === true,
            attachmentUsed: data?.attachmentUsed === true,
            attachmentName: data?.attachmentName || null
          });

          if (Array.isArray(data?.images) && data.images.length > 0) {
            showImageResults({ images: data.images });
          } else {
            hideMediaResults('images');
          }

          if (Array.isArray(data?.videos) && data.videos.length > 0) {
            showVideoResults({ videos: data.videos });
          } else {
            hideMediaResults('videos');
          }

          showSearchTimings(data?.timings);
          return;
        }

        const streamState = createStreamState();

        await consumeAiSearchStream(result.response, event => {
          if (currentIdempotencyKey !== idempotencyKey) return;
          handleAiSearchStreamEvent(event, streamState);
        });

        if (!streamState.gotText && result.response.ok === false) {
          showResult({ error: getMessages().networkError });
        }

      } catch (error) {
        console.error('[AI] ❌ Ошибка при запросе к /ai-search:', error);

        showResult({
          error: getMessages().networkError
        });

        showImageResults({ images: [] });
        showVideoResults({ videos: [] });
      } finally {
        if (searchInput) {
          searchInput.placeholder =
            searchForm.dataset.placeholderAi ||
            getMessages().askAnything;
        }

        const finishedKey = idempotencyKey;
        if (currentIdempotencyKey === finishedKey || currentIdempotencyKey === null) {
          isSubmitting = false;
          currentIdempotencyKey = null;
          setSubmitLoading(false);
        }
      }
    });

    initVoiceInput();
    initTxtAttachment();

    const sharedQuery = getQueryFromUrl();
    if (sharedQuery && searchInput) {
      searchInput.value = sharedQuery;
      requestAnimationFrame(() => {
        searchForm.requestSubmit();
      });
    }
  }

  async function loadPageData() {
    try {
      await Promise.allSettled([loadNews(), generateCombinedBackground()]);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    }
  }

  setupEventListeners();
  loadPageData();
  initAdObserver();
  showCookieBanner();
}

export { initPage, initAdObserver };
