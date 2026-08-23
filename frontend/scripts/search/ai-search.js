import { getMessages, t } from '../i18n-loader.js';
import { escapeHtml } from '../finding-content-render.js';
import { searchState } from './state.js';
import { getActiveSearchQuery, getSearchAnalyticsHeaders } from './env-analytics.js';
import { getSearchMode } from './mode-filters.js';
import {
  peekPromoIntent,
  mountPromoIntentCard,
  maybeShowPromoIntent
} from './promo-intent.js';
import { renderMarkdown } from './markdown-sources.js';
import { resetFeedbackButtons } from './share-feedback.js';
import {
  showResult,
  showImageResults,
  showVideoResults
} from './quota-result.js';

function renderResultBadges(data, messages) {
  let html = '';

  if (data.attachmentUsed) {
    html += `
      <div class="ai-search-badge ai-attachment-badge">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <path d="M14 2v6h6"/>
        </svg>
        ${messages.attachmentUsed}
      </div>
    `;
  }

  if (data.usedWebSearch) {
    html += `
      <div class="ai-search-badge">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zM9.5 14C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
        ${messages.webSearchUsed}
      </div>
    `;
  }

  return html;
}

function setResultActionsVisible(visible) {
  const footer = document.querySelector('.ai-result-footer');
  if (!footer) return;
  footer.classList.toggle('is-pending', !visible);
}

function showLoading() {
  setResultActionsVisible(false);
  resetFeedbackButtons();
  searchState.feedbackLocked = false;
  searchState.lastShareContext.sources = [];
  searchState.lastShareContext.images = [];
  searchState.lastShareContext.videos = [];
  searchState.lastShareContext.timings = null;
  const t = getMessages();
  const contentDiv = document.getElementById('ai-result-content');
  if (!contentDiv) return;

  const form = document.getElementById('ai-search-form');
  const tabs = document.getElementById('results-tabs');
  const container = document.getElementById('ai-result-container');
  if (getSearchMode(form) !== 'results') {
    if (tabs) tabs.hidden = true;
    if (container) container.classList.remove('is-results-mode');
  }

  contentDiv.innerHTML = `
    <div class="ai-loading">
      <div class="loading-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div class="loading-text">${t.loading}</div>
    </div>
  `;

  const timestampDiv = document.getElementById('ai-timestamp');
  if (timestampDiv) {
    timestampDiv.textContent = '';
  }
}

function formatTimingSeconds(ms) {
  return (ms / 1000).toFixed(1);
}

function showSearchTimings(timings) {
  const timestampDiv = document.getElementById('ai-timestamp');
  if (!timestampDiv || !timings?.total_ms) return;

  searchState.lastShareContext.timings = timings;

  const total = formatTimingSeconds(timings.total_ms);

  if (timings.searx_ms != null && timings.model_ms != null) {
    timestampDiv.textContent = t('answerTimingDetail', {
      total,
      search: formatTimingSeconds(timings.searx_ms),
      ai: formatTimingSeconds(timings.model_ms)
    });
    return;
  }

  timestampDiv.textContent = t('answerTiming', { seconds: total });
}

function hideMediaResults(type) {
  const container = document.getElementById(`ai-${type}-results`);
  if (!container) return;
  container.style.display = 'none';
  container.innerHTML = '';
}

function resolveAnswerForDisplay(data) {
  const messages = getMessages();
  const answer = (data.answer || '').trim();

  if (data.answerEmpty === true) {
    return {
      text: answer || messages.emptyAnswer,
      isEmpty: true
    };
  }

  if (!answer || answer === messages.noModelText) {
    return {
      text: messages.emptyAnswer,
      isEmpty: true
    };
  }

  if (/^no information found in the provided data\.?$/i.test(answer)) {
    return {
      text: messages.noDataAnswer,
      isEmpty: true
    };
  }

  return {
    text: answer,
    isEmpty: false
  };
}

function renderAnswerHtml(answer, isEmpty) {
  if (isEmpty) {
    return `<div class="ai-empty-answer">${escapeHtml(answer)}</div>`;
  }

  return renderMarkdown(answer);
}

function showMediaLoading(type) {
  if (getSearchMode() === 'results') {
    hideMediaResults(type);
    return;
  }
  const container = document.getElementById(`ai-${type}-results`);
  if (!container) return;

  const messages = getMessages();
  const header = type === 'images' ? messages.imagesHeader : messages.videosHeader;

  container.innerHTML = `
    <div class="ai-${type === 'images' ? 'image' : 'video'}-header">
      <span>${header}</span>
    </div>
    <div class="ai-media-loading">
      <div class="loading-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div class="loading-text">${messages.mediaLoading}</div>
    </div>
  `;
  container.style.display = 'block';
}

async function consumeAiSearchStream(response, onEvent) {
  if (!response.body) {
    throw new Error('Streaming body is not available');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const processLine = line => {
    const trimmed = line.trim();
    if (!trimmed) return;
    onEvent(JSON.parse(trimmed));
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      processLine(line);
    }
  }

  if (buffer.trim()) {
    processLine(buffer);
  }
}

async function requestAiSearch({ query, idempotencyKey, locale, useStream, attachment }) {
  const hasAttachment = Boolean(attachment?.attachmentText);
  const include = {
    text: true,
    images: !hasAttachment,
    videos: !hasAttachment
  };

  const headers = {
    'Content-Type': 'application/json',
    'X-Idempotency-Key': idempotencyKey,
    'X-User-Lang': locale,
    ...getSearchAnalyticsHeaders(),
  };

  if (useStream) {
    headers.Accept = 'application/x-ndjson';
  } else {
    headers.Accept = 'application/json';
  }

  const miniToken =
    window.__SPN_VK_MINI_TOKEN__ ||
    (typeof window.spnVkMiniGetToken === 'function' ? window.spnVkMiniGetToken() : '') ||
    '';
  if (miniToken) {
    headers.Authorization = `Bearer ${miniToken}`;
  }

  const response = await fetch('/ai-search', {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({
      q: query,
      include,
      mode: 'full',
      lang: locale,
      stream: useStream,
      ...(attachment || {})
    })
  });

  const contentType = response.headers.get('content-type') || '';

  if (!useStream || !contentType.includes('application/x-ndjson')) {
    const data = await response.json().catch(() => null);
    return { mode: 'json', response, data };
  }

  return { mode: 'stream', response };
}

function createStreamState() {
  return {
    gotText: false,
    didScroll: false,
    streamingStarted: false,
    firstTokenReceived: false,
    streamedAnswer: '',
    pendingTextStart: null,
    pendingImages: null,
    pendingVideos: null,
    imagesShown: false,
    videosShown: false
  };
}

function flushPendingMedia(state) {
  if (getSearchMode() === 'results') {
    hideMediaResults('images');
    hideMediaResults('videos');
    return;
  }
  if (!state.imagesShown && state.pendingImages !== null) {
    if (state.pendingImages.length > 0) {
      showImageResults({ images: state.pendingImages });
    } else {
      hideMediaResults('images');
    }
    state.imagesShown = true;
  }

  if (state.imagesShown && !state.videosShown && state.pendingVideos !== null) {
    if (state.pendingVideos.length > 0) {
      showVideoResults({ videos: state.pendingVideos });
    } else {
      hideMediaResults('videos');
    }
    state.videosShown = true;
  }
}

function finalizePendingMedia(state) {
  if (!state.imagesShown) {
    hideMediaResults('images');
    state.imagesShown = true;
  }

  if (!state.videosShown) {
    hideMediaResults('videos');
    state.videosShown = true;
  }
}

function showStreamingTextStart(data, options = {}) {
  setResultActionsVisible(false);
  const messages = getMessages();
  const contentDiv = document.getElementById('ai-result-content');
  const container = document.getElementById('ai-result-container');
  if (!contentDiv) return;

  const query = getActiveSearchQuery();
  let html = '';
  html += renderResultBadges(data, messages);
  html += '<div class="ai-streaming-answer" aria-live="polite"></div>';
  contentDiv.innerHTML = html;
  // Под стримящимся ответом (не сверху)
  if (peekPromoIntent(query)) {
    mountPromoIntentCard(peekPromoIntent(query));
  } else {
    maybeShowPromoIntent(query);
  }

  if (container) {
    container.style.display = 'block';
    if (options.scroll !== false) {
      container.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }
}

function appendStreamingTextDelta(chunk, state) {
  state.streamedAnswer += chunk || '';
  const answerEl = document.querySelector('.ai-streaming-answer');
  if (answerEl) {
    answerEl.textContent = state.streamedAnswer;
  }
}

function finalizeStreamingText(event, state) {
  state.gotText = true;
  showResult(
    {
      answer: event.answer || state.streamedAnswer || '',
      usedWebSearch: event.usedWebSearch === true,
      sources: Array.isArray(event.sources) ? event.sources : [],
      answerEmpty: event.answerEmpty === true,
      attachmentUsed: event.attachmentUsed === true,
      attachmentName: event.attachmentName || null
    },
    { scroll: !state.didScroll }
  );
  state.didScroll = true;
  flushPendingMedia(state);
}

function handleAiSearchStreamEvent(event, state) {
  if (event.event === 'text_start') {
    state.streamingStarted = true;
    state.pendingTextStart = {
      usedWebSearch: event.usedWebSearch === true,
      sources: Array.isArray(event.sources) ? event.sources : [],
      attachmentUsed: event.attachmentUsed === true,
      attachmentName: event.attachmentName || null
    };
    return;
  }

  if (event.event === 'text_delta') {
    if (!state.firstTokenReceived) {
      state.firstTokenReceived = true;
      showStreamingTextStart(state.pendingTextStart || { usedWebSearch: true }, { scroll: !state.didScroll });
      state.didScroll = true;
      state.streamedAnswer = event.chunk || '';
      const answerEl = document.querySelector('.ai-streaming-answer');
      if (answerEl) {
        answerEl.textContent = state.streamedAnswer;
      }
      return;
    }

    appendStreamingTextDelta(event.chunk, state);
    return;
  }

  if (event.event === 'text_done') {
    if (state.streamingStarted) {
      finalizeStreamingText(event, state);
    } else {
      state.gotText = true;
      showResult(
        {
          answer: event.answer || '',
          usedWebSearch: event.usedWebSearch === true,
          sources: Array.isArray(event.sources) ? event.sources : [],
          answerEmpty: event.answerEmpty === true
        },
        { scroll: !state.didScroll }
      );
      state.didScroll = true;
      flushPendingMedia(state);
    }
    return;
  }

  if (event.event === 'error' && event.phase === 'text') {
    showResult({ error: event.error || getMessages().networkError }, { scroll: !state.didScroll });
    state.didScroll = true;
    return;
  }

  if (event.event === 'images') {
    state.pendingImages = Array.isArray(event.images) ? event.images : [];
    flushPendingMedia(state);
    return;
  }

  if (event.event === 'videos') {
    state.pendingVideos = Array.isArray(event.videos) ? event.videos : [];
    flushPendingMedia(state);
    return;
  }

  if (event.event === 'done') {
    flushPendingMedia(state);
    finalizePendingMedia(state);
    showSearchTimings(event.timings);
  }
}

export {
  renderResultBadges,
  setResultActionsVisible,
  showLoading,
  formatTimingSeconds,
  showSearchTimings,
  hideMediaResults,
  resolveAnswerForDisplay,
  renderAnswerHtml,
  showMediaLoading,
  consumeAiSearchStream,
  requestAiSearch,
  createStreamState,
  flushPendingMedia,
  finalizePendingMedia,
  showStreamingTextStart,
  appendStreamingTextDelta,
  finalizeStreamingText,
  handleAiSearchStreamEvent
};
