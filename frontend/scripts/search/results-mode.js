import { getMessages } from '../i18n-loader.js';
import { escapeHtml } from '../finding-content-render.js';
import { searchState } from './state.js';
import {
  getActiveSearchQuery,
  getCurrentLocale,
  getQueryFromUrl,
  isAdultQuery,
  getSearchAnalyticsHeaders
} from './env-analytics.js';
import {
  getSearchMode,
  storeSearchMode,
  syncSearchQueryToUrl,
  getResultsTimeRange,
  getResultsSafesearch,
  persistResultsFilters
} from './mode-filters.js';
import {
  peekPromoIntent,
  canAttachPromoIntent,
  renderPromoIntentCard,
  bindPromoIntentCardActions,
  maybeShowPromoIntent
} from './promo-intent.js';
import {
  safeHttpUrl,
  getSourceHostname,
  getSourceFaviconUrl,
  withPromoResultFirst,
  buildPromoCatalogResultItem
} from './markdown-sources.js';
import { showLoading, hideMediaResults, setResultActionsVisible } from './ai-search.js';
import { isQuotaError, quotaNoticeHtml } from './quota-result.js';

function setSearchMode(mode) {
  const form = document.getElementById('ai-search-form');
  if (!form) return;
  const next = mode === 'results' ? 'results' : 'ai';
  form.dataset.searchMode = next;
  form.classList.toggle('is-results-mode', next === 'results');
  storeSearchMode(next);
  syncSearchQueryToUrl(
    form.querySelector('input[name="q"]')?.value?.trim() || getQueryFromUrl() || '',
    next
  );

  form.querySelectorAll('.search-mode-btn').forEach((btn) => {
    const active = btn.dataset.searchMode === next;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  const tabs = document.getElementById('results-tabs');
  const filters = document.getElementById('results-filters');
  const footer = document.querySelector('.ai-result-footer');
  const container = document.getElementById('ai-result-container');
  const searchInput = form.querySelector('input[name="q"]');
  const messages = getMessages();

  if (container) {
    container.classList.toggle('is-results-mode', next === 'results');
  }

  if (filters) {
    filters.hidden = next !== 'results';
  }

  if (next === 'results') {
    // Вкладки только после выдачи результатов — не показываем заранее
    if (footer) footer.style.display = 'none';
    if (searchInput) {
      searchInput.placeholder =
        form.dataset.placeholderResults ||
        messages.askResults ||
        messages.askAnything ||
        '';
      // Без скрепки показываем запрос с начала строки
      requestAnimationFrame(() => {
        searchInput.scrollLeft = 0;
      });
    }
    hideMediaResults('images');
    hideMediaResults('videos');
  } else {
    if (tabs) tabs.hidden = true;
    if (footer) footer.style.display = '';
    hideAutocomplete();
    if (searchInput) {
      searchInput.placeholder =
        form.dataset.placeholderAi ||
        messages.askAnything ||
        '';
    }
  }
}

function setActiveResultsTab(category) {
  searchState.currentResultsCategory = category;
  document.querySelectorAll('.results-tab').forEach((tab) => {
    tab.classList.toggle('is-active', tab.dataset.resultsCategory === category);
  });
}

function bindResultsModeActions(root) {
  if (!root) return;

  root.querySelectorAll('.retry-btn').forEach((btn) => {
    if (btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => {
      document.getElementById('ai-search-form')?.requestSubmit();
    });
  });

  root.querySelectorAll('[data-results-try-ai]').forEach((btn) => {
    if (btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => {
      setSearchMode('ai');
      document.getElementById('ai-search-form')?.requestSubmit();
    });
  });
}

function getSourceFaviconForResults(hostname) {
  return getSourceFaviconUrl(hostname, 32);
}

async function requestWebSearch({ query, category, locale, timeRange, safesearch }) {
  const response = await fetch('/web-search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...getSearchAnalyticsHeaders(),
    },
    credentials: 'same-origin',
    body: JSON.stringify({
      q: query,
      category: category || 'general',
      locale: locale || getCurrentLocale(),
      timeRange: timeRange || getResultsTimeRange() || undefined,
      safesearch:
        safesearch !== undefined ? safesearch : getResultsSafesearch()
    })
  });

  let data = null;
  try {
    data = await response.json();
  } catch (_) {
    data = null;
  }

  return { response, data };
}

function formatResultsPublishedDate(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  try {
    return new Intl.DateTimeFormat(getCurrentLocale() || 'ru', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  } catch (_) {
    return raw;
  }
}

function buildResultsExtrasHtml({
  answers = [],
  suggestions = [],
  corrections = [],
  infoboxes = [],
  messages = {}
}) {
  const parts = [];

  if (Array.isArray(corrections) && corrections.length) {
    const label = escapeHtml(messages.resultsDidYouMean || 'Did you mean:');
    const chips = corrections
      .map(
        (text) =>
          `<button type="button" class="results-correction-btn" data-results-query="${escapeHtml(text)}">${escapeHtml(text)}</button>`
      )
      .join('');
    parts.push(
      `<div class="results-corrections"><span class="results-corrections-label">${label}</span> ${chips}</div>`
    );
  }

  if (Array.isArray(answers) && answers.length) {
    const blocks = answers
      .map((item) => {
        const answer = escapeHtml(item.answer || '');
        const href = safeHttpUrl(item.url || '', '');
        const link = href
          ? `<a class="results-answer-link" href="${escapeHtml(href)}" target="_blank" rel="noopener">${escapeHtml(messages.resultsAnswerSource || 'Source')}</a>`
          : '';
        return `
          <div class="results-answer">
            <div class="results-answer-text">${answer}</div>
            ${link ? `<div class="results-answer-meta">${link}</div>` : ''}
          </div>`;
      })
      .join('');
    parts.push(`<div class="results-answers">${blocks}</div>`);
  }

  if (Array.isArray(infoboxes) && infoboxes.length) {
    const boxes = infoboxes
      .map((box) => {
        const title = escapeHtml(box.title || '');
        const content = escapeHtml(box.content || '');
        const href = escapeHtml(safeHttpUrl(box.url || '#', '#'));
        const img = escapeHtml(safeHttpUrl(box.imageUrl || '', ''));
        const attrs = Array.isArray(box.attributes)
          ? box.attributes
              .map(
                (attr) =>
                  `<div class="results-infobox-attr"><span>${escapeHtml(attr.label)}</span><span>${escapeHtml(attr.value)}</span></div>`
              )
              .join('')
          : '';
        const urls = Array.isArray(box.urls)
          ? `<div class="results-infobox-urls">${box.urls
              .map((u) => {
                const uHref = escapeHtml(safeHttpUrl(u.url || '#', '#'));
                return `<a href="${uHref}" target="_blank" rel="noopener">${escapeHtml(u.title || u.url)}</a>`;
              })
              .join('')}</div>`
          : '';
        return `
          <aside class="results-infobox">
            ${img ? `<div class="results-infobox-media"><img src="${img}" alt="" loading="lazy"></div>` : ''}
            <div class="results-infobox-body">
              <a class="results-infobox-title" href="${href}" target="_blank" rel="noopener">${title}</a>
              ${content ? `<p class="results-infobox-content">${content}</p>` : ''}
              ${attrs ? `<div class="results-infobox-attrs">${attrs}</div>` : ''}
              ${urls}
            </div>
          </aside>`;
      })
      .join('');
    parts.push(`<div class="results-infoboxes">${boxes}</div>`);
  }

  if (Array.isArray(suggestions) && suggestions.length) {
    const label = escapeHtml(messages.resultsSuggestions || 'Related searches');
    const chips = suggestions
      .map(
        (text) =>
          `<button type="button" class="results-suggestion-btn" data-results-query="${escapeHtml(text)}">${escapeHtml(text)}</button>`
      )
      .join('');
    parts.push(
      `<div class="results-suggestions"><div class="results-suggestions-label">${label}</div><div class="results-suggestions-list">${chips}</div></div>`
    );
  }

  return parts.join('');
}

function wrapMediaNsfwHtml(innerHtml, messages = getMessages()) {
  if (!innerHtml) return '';
  const badge = messages.mediaNsfwBadge || '18+';
  return `<div class="media-nsfw is-blurred" data-nsfw-blur>
    <span class="media-nsfw-badge" aria-hidden="true">${escapeHtml(badge)}</span>
    <div class="media-nsfw-content">${innerHtml}</div>
  </div>`;
}

function bindMediaNsfwReveal(root = document) {
  const scope = root?.querySelectorAll ? root : document;
  scope.querySelectorAll('[data-nsfw-blur].is-blurred').forEach((wrap) => {
    if (wrap.dataset.nsfwBound === '1') return;
    wrap.dataset.nsfwBound = '1';
    wrap.addEventListener(
      'click',
      (e) => {
        if (!wrap.classList.contains('is-blurred')) return;
        e.preventDefault();
        e.stopPropagation();
        wrap.classList.remove('is-blurred');
        wrap.querySelector('.media-nsfw-badge')?.remove();
      },
      true
    );
  });
}

function buildOsmEmbedUrl(lat, lon) {
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return '';
  const d = 0.08;
  const bbox = [
    longitude - d,
    latitude - d,
    longitude + d,
    latitude + d
  ].join('%2C');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude}%2C${longitude}`;
}

function buildResultsMediaGridHtml(items, { showDuration = false, videoLayout = false } = {}) {
  const cards = items
    .map((item) => {
      const title = escapeHtml(item.title || '');
      const href = escapeHtml(safeHttpUrl(item.url || item.imageUrl || '#', '#'));
      const thumb = escapeHtml(safeHttpUrl(item.thumbnail || item.imageUrl || '', ''));
      const host = escapeHtml(item.hostname || getSourceHostname(item.url || ''));
      const duration = escapeHtml(item.duration || '');
      const sourceBits = host;
      const durationBadge =
        showDuration && duration
          ? `<span class="results-media-duration">${duration}</span>`
          : '';
      const img = thumb
        ? `<div class="results-media-thumb"><img src="${thumb}" alt="${title}" loading="lazy" decoding="async">${durationBadge}</div>`
        : videoLayout
          ? `<div class="results-media-thumb results-media-thumb--empty" aria-hidden="true">${durationBadge}</div>`
          : '';
      return `
        <a class="results-media-card${videoLayout ? ' is-video' : ''}" href="${href}" target="_blank" rel="noopener">
          ${img}
          <div class="results-media-meta">
            <div class="results-media-title">${title}</div>
            <div class="results-media-source">${sourceBits}</div>
          </div>
        </a>`;
    })
    .join('');
  const grid = `<div class="results-media-grid${videoLayout ? ' is-video-grid' : ''}">${cards}</div>`;
  return isAdultQuery(getActiveSearchQuery()) ? wrapMediaNsfwHtml(grid) : grid;
}

function buildResultsMapHtml(items) {
  const cards = items
    .map((item) => {
      const title = escapeHtml(item.title || item.url || '');
      const href = escapeHtml(safeHttpUrl(item.url || '#', '#'));
      const content = escapeHtml(item.content || '');
      const embed = buildOsmEmbedUrl(item.latitude, item.longitude);
      const coords =
        item.latitude != null && item.longitude != null
          ? `${Number(item.latitude).toFixed(5)}, ${Number(item.longitude).toFixed(5)}`
          : '';
      return `
        <article class="results-map-card">
          ${
            embed
              ? `<iframe class="results-map-embed" src="${escapeHtml(embed)}" loading="lazy" title="${title}" referrerpolicy="no-referrer-when-downgrade"></iframe>`
              : ''
          }
          <div class="results-map-body">
            <a class="results-map-title" href="${href}" target="_blank" rel="noopener">${title}</a>
            ${coords ? `<div class="results-map-coords">${escapeHtml(coords)}</div>` : ''}
            ${content ? `<p class="results-map-content">${content}</p>` : ''}
          </div>
        </article>`;
    })
    .join('');
  return `<div class="results-map-list">${cards}</div>`;
}

function buildResultsNewsHtml(items) {
  const list = items
    .map((item) => {
      const title = escapeHtml(item.title || item.url || '');
      const href = escapeHtml(safeHttpUrl(item.url || '#', '#'));
      const host = item.hostname || getSourceHostname(item.url || '');
      const favicon = escapeHtml(getSourceFaviconForResults(host));
      const snippet = escapeHtml(item.content || '');
      const published = formatResultsPublishedDate(item.publishedDate || '');
      const thumb = escapeHtml(safeHttpUrl(item.thumbnail || '', ''));
      return `
        <a class="results-news-card" href="${href}" target="_blank" rel="noopener">
          ${thumb ? `<div class="results-news-thumb"><img src="${thumb}" alt="" loading="lazy"></div>` : ''}
          <div class="results-news-body">
            <div class="results-news-meta">
              <img class="results-favicon" src="${favicon}" alt="" width="14" height="14" loading="lazy">
              <span class="results-host">${escapeHtml(host)}</span>
              ${published ? `<time class="results-news-date">${escapeHtml(published)}</time>` : ''}
            </div>
            <div class="results-news-title">${title}</div>
            ${snippet ? `<p class="results-news-snippet">${snippet}</p>` : ''}
          </div>
        </a>`;
    })
    .join('');
  return `<div class="results-news-list">${list}</div>`;
}

function buildResultsGeneralCardHtml(item) {
  const title = escapeHtml(item.title || item.url || '');
  const href = escapeHtml(safeHttpUrl(item.url || '#', '#'));
  const host = item.hostname || getSourceHostname(item.url || '');
  const favicon = escapeHtml(getSourceFaviconForResults(host));
  const snippet = escapeHtml(item.content || '');
  const published = formatResultsPublishedDate(item.publishedDate || '');
  const metaBits = [host, published].filter(Boolean).join(' · ');
  const thumb = escapeHtml(safeHttpUrl(item.thumbnail || '', ''));
  return `
        <a class="results-card${thumb ? ' has-thumb' : ''}" href="${href}" target="_blank" rel="noopener">
          ${thumb ? `<div class="results-card-thumb"><img src="${thumb}" alt="" loading="lazy"></div>` : ''}
          <div class="results-card-body">
            <div class="results-card-top">
              <img class="results-favicon" src="${favicon}" alt="" width="16" height="16" loading="lazy">
              <span class="results-host">${escapeHtml(metaBits || host)}</span>
            </div>
            <div class="results-title">${title}</div>
            ${snippet ? `<p class="results-snippet">${snippet}</p>` : ''}
          </div>
        </a>`;
}

function buildResultsGeneralHtml(items) {
  const list = (Array.isArray(items) ? items : []).map(buildResultsGeneralCardHtml).join('');
  return `<div class="results-list">${list}</div>`;
}

/** Если intent пришёл позже выдачи — докидываем карточку каталога первым результатом. */
function ensurePromoResultsCard(intent) {
  if (!intent || !canAttachPromoIntent()) return;
  const form = document.getElementById('ai-search-form');
  if (getSearchMode(form) !== 'results') return;
  if (['images', 'videos', 'map', 'news'].includes(searchState.currentResultsCategory)) return;

  const contentDiv = document.getElementById('ai-result-content');
  if (!contentDiv) return;

  const promoItem = buildPromoCatalogResultItem(intent);
  if (!promoItem) return;

  const isPromoHref = (href) =>
    /promo-codes-and-discounts|promokody-skidki/i.test(String(href || ''));

  let list = contentDiv.querySelector('.results-list');
  if (list) {
    const first = list.querySelector('.results-card');
    if (first && isPromoHref(first.getAttribute('href'))) return;
    list.querySelectorAll('.results-card').forEach((card) => {
      if (isPromoHref(card.getAttribute('href'))) card.remove();
    });
    list.insertAdjacentHTML('afterbegin', buildResultsGeneralCardHtml(promoItem));
    return;
  }

  // Пустая выдача: вместо/перед empty показываем хотя бы наш результат
  const empty = contentDiv.querySelector('.results-empty');
  if (empty) empty.remove();
  const cardWrap = `<div class="results-list">${buildResultsGeneralCardHtml(promoItem)}</div>`;
  const promoStrip = contentDiv.querySelector('.promo-intent-card');
  if (promoStrip) {
    promoStrip.insertAdjacentHTML('beforebegin', cardWrap);
  } else {
    contentDiv.insertAdjacentHTML('beforeend', cardWrap);
  }
}

function hideAutocomplete() {
  const box = document.getElementById('search-autocomplete');
  if (!box) return;
  box.hidden = true;
  box.innerHTML = '';
}

function renderAutocomplete(suggestions) {
  const box = document.getElementById('search-autocomplete');
  if (!box) return;
  const items = Array.isArray(suggestions) ? suggestions.filter(Boolean).slice(0, 8) : [];
  if (!items.length) {
    hideAutocomplete();
    return;
  }
  box.hidden = false;
  box.innerHTML = items
    .map(
      (text, index) =>
        `<button type="button" class="search-autocomplete-item" data-ac-index="${index}" data-results-query="${escapeHtml(text)}">${escapeHtml(text)}</button>`
    )
    .join('');
}

function initResultsFilters() {
  const timeSelect = document.getElementById('results-time-range');
  const safeSelect = document.getElementById('results-safe-search');
  if (timeSelect) {
    timeSelect.value = getResultsTimeRange();
    timeSelect.addEventListener('change', () => {
      persistResultsFilters();
      const q = (searchState.resultsQuery || document.querySelector('#ai-search-form input[name="q"]')?.value || '').trim();
      if (q && getSearchMode() === 'results') {
        document.getElementById('ai-search-form')?.requestSubmit();
      }
    });
  }
  if (safeSelect) {
    safeSelect.value = String(getResultsSafesearch());
    safeSelect.addEventListener('change', () => {
      persistResultsFilters();
      const q = (searchState.resultsQuery || document.querySelector('#ai-search-form input[name="q"]')?.value || '').trim();
      if (q && getSearchMode() === 'results') {
        document.getElementById('ai-search-form')?.requestSubmit();
      }
    });
  }
}

function initAutocomplete(searchInput, searchForm, { isSubmittingRef, setSubmitLoading, runSearch }) {
  const box = document.getElementById('search-autocomplete');
  if (!searchInput || !box) return;

  let timer = null;
  let seq = 0;

  const schedule = () => {
    if (getSearchMode(searchForm) !== 'results') {
      hideAutocomplete();
      return;
    }
    const q = searchInput.value.trim();
    if (q.length < 2) {
      hideAutocomplete();
      return;
    }
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const my = ++seq;
      try {
        const res = await fetch(`/web-autocomplete?q=${encodeURIComponent(q)}`, {
          headers: { Accept: 'application/json' },
          credentials: 'same-origin'
        });
        const data = await res.json().catch(() => null);
        if (my !== seq) return;
        if (document.activeElement !== searchInput) return;
        renderAutocomplete(data?.suggestions || []);
      } catch (_) {
        if (my === seq) hideAutocomplete();
      }
    }, 220);
  };

  searchInput.addEventListener('input', schedule);
  searchInput.addEventListener('focus', schedule);
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') hideAutocomplete();
  });
  document.addEventListener('click', (e) => {
    if (e.target?.closest?.('#search-autocomplete') || e.target === searchInput) return;
    hideAutocomplete();
  });
  box.addEventListener('click', async (e) => {
    const btn = e.target?.closest?.('[data-results-query]');
    if (!btn) return;
    const nextQuery = String(btn.dataset.searchState.resultsQuery || '').trim();
    if (!nextQuery || isSubmittingRef()) return;
    hideAutocomplete();
    searchInput.value = nextQuery;
    searchInput.scrollLeft = 0;
    await runSearch(nextQuery);
  });
}

function renderResultsMode({
  category,
  results,
  answers,
  suggestions,
  corrections,
  infoboxes,
  error,
  emptyText,
  quota
}) {
  const contentDiv = document.getElementById('ai-result-content');
  const container = document.getElementById('ai-result-container');
  const tabs = document.getElementById('results-tabs');
  const footer = document.querySelector('.ai-result-footer');
  const messages = getMessages();
  const form = document.getElementById('ai-search-form');

  if (!contentDiv || !container) return;

  // Вкладки категорий SearXNG — только в режиме Выдача
  if (getSearchMode(form) !== 'results') {
    if (tabs) tabs.hidden = true;
    container.classList.remove('is-results-mode');
    return;
  }

  container.style.display = 'block';
  container.classList.add('is-results-mode');
  if (tabs) tabs.hidden = false;
  if (footer) footer.style.display = 'none';
  setResultActionsVisible(false);
  hideMediaResults('images');
  hideMediaResults('videos');
  setActiveResultsTab(category || 'general');

  const query = getActiveSearchQuery();
  const promoIntent = peekPromoIntent(query);
  const promoHtml = promoIntent ? renderPromoIntentCard(promoIntent) : '';
  if (!promoIntent) {
    maybeShowPromoIntent(query);
  }

  if (quota && isQuotaError(quota)) {
    contentDiv.innerHTML = quotaNoticeHtml(quota, messages, { meter: 'web' });
    return;
  }

  if (error) {
    contentDiv.innerHTML = `
      <div class="results-error">
        <div class="results-error-message">${escapeHtml(error)}</div>
        <button type="button" class="retry-btn">${escapeHtml(messages.retry || 'Retry')}</button>
      </div>${promoHtml}`;
    bindPromoIntentCardActions(contentDiv);
    bindResultsModeActions(contentDiv);
    return;
  }

  const rawItems = Array.isArray(results) ? results : [];
  // В general (и при пустой выдаче) — тот же первый результат, что и источник ИИ
  const usePromoFirstResult =
    category !== 'images' && category !== 'videos' && category !== 'map' && category !== 'news';
  const items = usePromoFirstResult
    ? withPromoResultFirst(rawItems, query, messages)
    : rawItems;
  const extrasHtml = buildResultsExtrasHtml({
    answers,
    suggestions,
    corrections,
    infoboxes,
    messages
  });

  if (!rawItems.length && !(usePromoFirstResult && items.length)) {
    const empty =
      emptyText ||
      messages.resultsEmpty ||
      document.getElementById('ai-search-form')?.dataset.emptyResults ||
      'Nothing found.';
    const tryAiLabel =
      messages.resultsTryAi ||
      messages.modeAiLabel ||
      'Ask AI';
    const emptyActions = `
      <div class="results-empty-actions">
        <button type="button" class="retry-btn">${escapeHtml(messages.retry || 'Retry')}</button>
        <button type="button" class="results-try-ai-btn" data-results-try-ai>${escapeHtml(tryAiLabel)}</button>
      </div>`;
    contentDiv.innerHTML = extrasHtml
      ? `${extrasHtml}<div class="results-empty">${escapeHtml(empty)}</div>${emptyActions}${promoHtml}`
      : `<div class="results-empty">${escapeHtml(empty)}</div>${emptyActions}${promoHtml}`;
    bindPromoIntentCardActions(contentDiv);
    bindResultsModeActions(contentDiv);
    return;
  }

  let mainHtml = '';
  if (category === 'images') {
    mainHtml = buildResultsMediaGridHtml(items, { showDuration: false });
  } else if (category === 'videos') {
    mainHtml = buildResultsMediaGridHtml(items, { showDuration: true, videoLayout: true });
  } else if (category === 'map') {
    mainHtml = buildResultsMapHtml(items);
  } else if (category === 'news') {
    mainHtml = buildResultsNewsHtml(items);
  } else {
    mainHtml = buildResultsGeneralHtml(items);
  }

  // Suggestions after results feel more natural; corrections/answers/infobox above
  const topExtras = buildResultsExtrasHtml({
    answers,
    corrections,
    infoboxes,
    suggestions: [],
    messages
  });
  const bottomExtras = buildResultsExtrasHtml({
    suggestions,
    messages
  });

  contentDiv.innerHTML = `${topExtras}${mainHtml}${promoHtml}${bottomExtras}`;
  bindPromoIntentCardActions(contentDiv);
  bindMediaNsfwReveal(contentDiv);
  bindResultsThumbFallbacks(contentDiv);
}

/** Скрывает пустые/битые превью в Выдаче (вместо серых болванок). */
function bindResultsThumbFallbacks(root) {
  if (!root) return;
  const imgs = root.querySelectorAll(
    '.results-card-thumb img, .results-news-thumb img, .results-media-thumb img, .results-infobox-media img'
  );
  imgs.forEach((img) => {
    const hideBrokenThumb = () => {
      const wrap = img.closest(
        '.results-card-thumb, .results-news-thumb, .results-media-thumb, .results-infobox-media'
      );
      const card = img.closest(
        '.results-card, .results-news-card, .results-media-card, .results-infobox'
      );
      // В сетке картинок карточка без превью бесполезна
      if (
        card &&
        card.classList.contains('results-media-card') &&
        !card.classList.contains('is-video')
      ) {
        card.remove();
        return;
      }
      if (wrap) wrap.remove();
      if (card) card.classList.remove('has-thumb');
    };

    if (img.complete && img.naturalWidth === 0) {
      hideBrokenThumb();
      return;
    }
    img.addEventListener('error', hideBrokenThumb, { once: true });
  });
}

async function runResultsSearch(query, category = searchState.currentResultsCategory) {
  const messages = getMessages();
  const form = document.getElementById('ai-search-form');
  searchState.resultsQuery = query;
  setActiveResultsTab(category);
  showLoading();

  const container = document.getElementById('ai-result-container');
  if (container) container.style.display = 'block';

  const { response, data } = await requestWebSearch({
    query,
    category,
    locale: getCurrentLocale()
  });

  if (!response.ok) {
    if (data && isQuotaError(data)) {
      renderResultsMode({
        category,
        results: [],
        quota: {
          error: data.error,
          needAuth: data.needAuth === true,
          limit: data.limit,
          used: data.used
        }
      });
      return;
    }
    renderResultsMode({
      category,
      results: [],
      error:
        data?.error ||
        messages.resultsNetworkError ||
        messages.networkError
    });
    return;
  }

  renderResultsMode({
    category: data?.category || category,
    results: Array.isArray(data?.results) ? data.results : [],
    answers: Array.isArray(data?.answers) ? data.answers : [],
    suggestions: Array.isArray(data?.suggestions) ? data.suggestions : [],
    corrections: Array.isArray(data?.corrections) ? data.corrections : [],
    infoboxes: Array.isArray(data?.infoboxes) ? data.infoboxes : [],
    emptyText:
      form?.dataset.emptyResults ||
      messages.resultsEmpty
  });
}

export {
  setSearchMode,
  setActiveResultsTab,
  bindResultsModeActions,
  getSourceFaviconForResults,
  requestWebSearch,
  formatResultsPublishedDate,
  buildResultsExtrasHtml,
  wrapMediaNsfwHtml,
  bindMediaNsfwReveal,
  buildOsmEmbedUrl,
  buildResultsMediaGridHtml,
  buildResultsMapHtml,
  buildResultsNewsHtml,
  buildResultsGeneralCardHtml,
  buildResultsGeneralHtml,
  ensurePromoResultsCard,
  hideAutocomplete,
  renderAutocomplete,
  initResultsFilters,
  initAutocomplete,
  renderResultsMode,
  bindResultsThumbFallbacks,
  runResultsSearch
};
