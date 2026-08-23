import { getQueryFromUrl } from './env-analytics.js';

function getModeFromUrl() {
  const mode = (new URLSearchParams(window.location.search).get('mode') || '').trim().toLowerCase();
  return mode === 'results' || mode === 'web' ? 'results' : mode === 'ai' ? 'ai' : null;
}

const SEARCH_MODE_STORAGE_KEY = 'serpmonn_search_mode';
const RESULTS_TIME_RANGE_KEY = 'serpmonn_results_time_range';
const RESULTS_SAFESEARCH_KEY = 'serpmonn_results_safesearch';

function getStoredSearchMode() {
  try {
    const mode = localStorage.getItem(SEARCH_MODE_STORAGE_KEY);
    return mode === 'results' ? 'results' : mode === 'ai' ? 'ai' : null;
  } catch (_) {
    return null;
  }
}

function storeSearchMode(mode) {
  try {
    localStorage.setItem(SEARCH_MODE_STORAGE_KEY, mode === 'results' ? 'results' : 'ai');
  } catch (_) {
    /* ignore */
  }
}

function getResultsTimeRange() {
  const select = document.getElementById('results-time-range');
  if (select) {
    const v = select.value;
    return ['day', 'week', 'month', 'year'].includes(v) ? v : '';
  }
  try {
    const stored = localStorage.getItem(RESULTS_TIME_RANGE_KEY) || '';
    return ['day', 'week', 'month', 'year'].includes(stored) ? stored : '';
  } catch (_) {
    return '';
  }
}

function getResultsSafesearch() {
  const select = document.getElementById('results-safe-search');
  if (select) {
    const n = Number(select.value);
    return [0, 1, 2].includes(n) ? n : 2;
  }
  try {
    const n = Number(localStorage.getItem(RESULTS_SAFESEARCH_KEY));
    return [0, 1, 2].includes(n) ? n : 2;
  } catch (_) {
    return 2;
  }
}

function persistResultsFilters() {
  try {
    localStorage.setItem(RESULTS_TIME_RANGE_KEY, getResultsTimeRange());
    localStorage.setItem(RESULTS_SAFESEARCH_KEY, String(getResultsSafesearch()));
  } catch (_) {
    /* ignore */
  }
}

function buildSharePageUrl(query) {
  // В VK Mini App делимся ссылкой на приложение, а не на полный сайт
  if (
    window.__SPN_VK_MINI__ ||
    /vk_app_id=\d+/.test(window.location.search) ||
    /(?:^|[?&])vk_mini=1(?:&|$)/.test(window.location.search)
  ) {
    const appId = (window.__SPN_MINI_CFG__ && window.__SPN_MINI_CFG__.appId) || '54486769';
    const base = `https://vk.com/app${appId}`;
    if (query) {
      return `${base}#q=${encodeURIComponent(query)}`;
    }
    return base;
  }

  const url = new URL(window.location.href);
  url.hash = '';

  if (query) {
    url.searchParams.set('q', query);
  } else {
    url.searchParams.delete('q');
  }

  return url.toString();
}

function getSearchMode(form = document.getElementById('ai-search-form')) {
  return form?.dataset.searchMode === 'results' ? 'results' : 'ai';
}

function syncSearchQueryToUrl(query, mode = getSearchMode()) {
  try {
    const url = new URL(window.location.href);
    if (query) {
      url.searchParams.set('q', query);
    } else {
      url.searchParams.delete('q');
    }
    if (mode === 'results') {
      url.searchParams.set('mode', 'results');
    } else {
      url.searchParams.delete('mode');
    }
    // Только same-origin: нельзя replaceState на vk.com с serpmonn.ru (ломает поиск в mini app)
    const next = `${url.pathname}${url.search}${url.hash}`;
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (next !== current) {
      history.replaceState(null, '', next);
    }
  } catch (err) {
    console.warn('syncSearchQueryToUrl failed', err);
  }
}

export {
  getModeFromUrl,
  SEARCH_MODE_STORAGE_KEY,
  RESULTS_TIME_RANGE_KEY,
  RESULTS_SAFESEARCH_KEY,
  getStoredSearchMode,
  storeSearchMode,
  getResultsTimeRange,
  getResultsSafesearch,
  persistResultsFilters,
  buildSharePageUrl,
  getSearchMode,
  syncSearchQueryToUrl
};
