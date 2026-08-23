import { getMessages } from '../i18n-loader.js';
import { escapeHtml } from '../finding-content-render.js';
import { buildAuthUrl, getFrontendPath } from '../locale-paths.js';
import { searchState } from './state.js';
import {
  getActiveSearchQuery,
  getQueryFromUrl,
  isAdultQuery
} from './env-analytics.js';
import { getSearchMode } from './mode-filters.js';
import {
  peekPromoIntent,
  detectPromoIntentKeyword,
  renderPromoIntentCard,
  bindPromoIntentCardActions,
  maybeShowPromoIntent
} from './promo-intent.js';
import {
  safeHttpUrl,
  withPromoSourceFirst,
  renderSourcesBlock,
  setupSourcesToggle
} from './markdown-sources.js';
import {
  renderResultBadges,
  resolveAnswerForDisplay,
  renderAnswerHtml,
  setResultActionsVisible
} from './ai-search.js';
import { setShareContext, setupActionButtons } from './share-feedback.js';
import { wrapMediaNsfwHtml, bindMediaNsfwReveal } from './results-mode.js';

function isQuotaError(data) {
  if (!data?.error) return false;
  if (data.needAuth === true || data.limit != null) return true;
  const e = String(data.error);
  return /лимит/i.test(e) || /limit/i.test(e);
}

function quotaCtaHtml(data, t) {
  if (window.__SPN_VK_MINI__) return '';
  const inAndroid =
    Boolean(window.__SPN_ANDROID_APP__) ||
    document.documentElement.classList.contains('android-app');
  if (data.needAuth) {
    const href = buildAuthUrl({ tab: 'login' });
    return `<a class="quota-card__cta" href="${escapeHtml(href)}">${escapeHtml(t.limitCtaLogin || 'Войти')}</a>`;
  }
  if (inAndroid) return '';
  const isProMonthly =
    /pro/i.test(String(data.error)) || Number(data.limit) >= 2000;
  if (isProMonthly) return '';
  const href = getFrontendPath('tariffs/tariffs.html');
  return `<a class="quota-card__cta" href="${escapeHtml(href)}">${escapeHtml(t.limitCtaPro || 'Оформить Pro')}</a>`;
}

function quotaKind(data) {
  if (data.needAuth) return 'guest';
  if (/pro/i.test(String(data.error)) || Number(data.limit) >= 2000) return 'pro';
  return 'free';
}

function quotaMeter(data, explicit) {
  if (explicit === 'web' || explicit === 'ai') return explicit;
  const limit = Number(data.limit);
  if (limit === 40 || limit === 120 || limit === 16000) return 'web';
  if (limit === 5 || limit === 15 || limit === 2000) return 'ai';
  return getSearchMode() === 'results' ? 'web' : 'ai';
}

function quotaKickerText(data, t, meter) {
  if (quotaKind(data) === 'pro') {
    return t.limitKickerProMonth || 'Pro · этот месяц';
  }
  if (meter === 'web') {
    return t.limitKickerWebToday || 'Выдача · сегодня';
  }
  return t.limitKickerAiToday || 'ИИ · сегодня';
}

function quotaUsageHtml(data, t) {
  const used = Number(data.used);
  const limit = Number(data.limit);
  if (!Number.isFinite(limit) || limit <= 0) return '';
  const safeUsed = Number.isFinite(used) ? Math.max(0, used) : limit;
  const remaining = Math.max(0, limit - safeUsed);
  const fillPct = Math.min(100, Math.round((safeUsed / limit) * 100));
  const ofLabel = String(t.limitOf || 'из {limit}').replaceAll('{limit}', String(limit));
  const remainingClass =
    remaining === 0 ? 'quota-card__remaining is-empty' : 'quota-card__remaining';
  return `
      <div class="quota-card__usage">
        <div class="quota-card__count">
          <span class="${remainingClass}">${escapeHtml(String(remaining))}</span>
          <span class="quota-card__of">${escapeHtml(ofLabel)}</span>
        </div>
        <div class="quota-card__bar" role="progressbar" aria-valuemin="0" aria-valuemax="${limit}" aria-valuenow="${safeUsed}" aria-valuetext="${escapeHtml(String(remaining))} ${escapeHtml(ofLabel)}">
          <div class="quota-card__bar-fill" style="width: ${fillPct}%"></div>
        </div>
      </div>`;
}

function quotaNoticeHtml(data, t, options = {}) {
  const kind = quotaKind(data);
  const meter = quotaMeter(data, options.meter);
  const kicker = quotaKickerText(data, t, meter);
  const title =
    kind === 'guest'
      ? t.limitTitleGuest
      : kind === 'pro'
        ? t.limitTitlePro
        : t.limitTitleFree;
  const text =
    kind === 'guest'
      ? t.limitTextGuest
      : kind === 'pro'
        ? t.limitTextPro
        : t.limitTextFree;
  return `
    <div class="quota-card">
      <div class="quota-card__kicker"><span class="quota-card__dot"></span>${escapeHtml(kicker)}</div>
      <div class="quota-card__title">${escapeHtml(title || data.error)}</div>
      <p class="quota-card__text">${escapeHtml(text || data.error)}</p>
      ${quotaUsageHtml(data, t)}
      ${quotaCtaHtml(data, t)}
    </div>
  `;
}

function showResult(data, options = {}) {
  if (
    data?.error &&
    window.__SPN_VK_MINI__ &&
    typeof window.spnVkMiniShowLimit === 'function' &&
    (data.needAuth === true ||
      data.limit != null ||
      /лимит/i.test(String(data.error)) ||
      /limit/i.test(String(data.error)))
  ) {
    window.spnVkMiniShowLimit({
      error: data.error,
      needAuth: data.needAuth === true,
      limit: data.limit,
      used: data.used
    });
  }
  const t = getMessages();
  const contentDiv = document.getElementById('ai-result-content');
  const container = document.getElementById('ai-result-container');
  const shouldScroll = options.scroll !== false;
  let html = '';

  const form = document.getElementById('ai-search-form');
  const tabs = document.getElementById('results-tabs');
  if (getSearchMode(form) !== 'results') {
    if (tabs) tabs.hidden = true;
    if (container) container.classList.remove('is-results-mode');
  }

  const query = getActiveSearchQuery();
  const promoIntent = !data.error ? peekPromoIntent(query) : null;

  if (data.error) {
    html = isQuotaError(data)
      ? quotaNoticeHtml(data, t, { meter: 'ai' })
      : `
      <div class="ai-error">
        <div class="error-icon">⚠️</div>
        <div class="error-message">${escapeHtml(data.error)}</div>
        <button class="retry-btn">${escapeHtml(t.retry)}</button>
      </div>
    `;
  } else {
    const resolved = resolveAnswerForDisplay(data);

    html += renderResultBadges(data, t);

    html += renderAnswerHtml(resolved.text, resolved.isEmpty);

    // Под ответом, над источниками
    if (promoIntent) {
      html += renderPromoIntentCard(promoIntent);
    }

    const sourcesForRender = withPromoSourceFirst(data.sources || [], query, t);
    const hasPromoSource = Boolean(promoIntent || detectPromoIntentKeyword(query));
    if (
      !resolved.isEmpty &&
      sourcesForRender.length > 0 &&
      (data.usedWebSearch || hasPromoSource)
    ) {
      html += renderSourcesBlock(sourcesForRender, t);
    }
  }

  contentDiv.innerHTML = html;
  setupSourcesToggle(contentDiv);
  bindPromoIntentCardActions(contentDiv);
  setResultActionsVisible(!data.error);
  if (!data.error && !promoIntent) {
    maybeShowPromoIntent(query);
  }

  if (!data.error) {
    const resolved = resolveAnswerForDisplay(data);
    const searchInput = document.querySelector('#ai-search-form input[name="q"]');
    const sourcesForShare = withPromoSourceFirst(data.sources || [], query, t);
    setShareContext(
      searchInput?.value.trim() || getQueryFromUrl(),
      resolved.text,
      resolved.isEmpty,
      data.usedWebSearch === true || sourcesForShare.length > 0,
      { sources: sourcesForShare }
    );
  }

  if (container) {
    container.style.display = 'block';
    if (shouldScroll) {
      container.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }

  setupActionButtons();
}

function showImageResults(data) {
  const t = getMessages();
  const container = document.getElementById('ai-image-results');
  if (!container) return;

  // Блоки «Фото/Видео по запросу» только для режима ИИ
  if (getSearchMode() === 'results') {
    container.style.display = 'none';
    container.innerHTML = '';
    searchState.lastShareContext.images = [];
    return;
  }

  if (data.error || !Array.isArray(data.images) || data.images.length === 0) {
    container.style.display = 'none';
    container.innerHTML = '';
    searchState.lastShareContext.images = [];
    return;
  }

  searchState.lastShareContext.images = data.images.slice(0, 6);

  const itemsHtml = data.images
    .slice(0, 6)
    .map(img => {
      const title = escapeHtml(img.title || '');
      const thumb = escapeHtml(safeHttpUrl(img.thumbnailUrl || img.imageUrl || '', ''));
      const link = escapeHtml(safeHttpUrl(img.imageUrl || img.sourceUrl || '#', '#'));
      const source = escapeHtml(img.sourceName || '');

      return `
        <a class="ai-image-card" href="${link}" target="_blank" rel="noopener">
          <div class="ai-image-thumb">
            <img src="${thumb}" alt="${title}">
          </div>
          <div class="ai-image-meta">
            <div class="ai-image-title">${title}</div>
            <div class="ai-image-source">${source}</div>
          </div>
        </a>
      `;
    })
    .join('');

  const gridHtml = `<div class="ai-image-grid">${itemsHtml}</div>`;
  const bodyHtml = isAdultQuery(getActiveSearchQuery())
    ? wrapMediaNsfwHtml(gridHtml)
    : gridHtml;

  container.innerHTML = `
    <div class="ai-image-header">
      <span>${t.imagesHeader}</span>
    </div>
    ${bodyHtml}
  `;
  container.style.display = 'block';
  bindMediaNsfwReveal(container);
}

function showVideoResults(data) {
  const t = getMessages();
  const container = document.getElementById('ai-video-results');
  if (!container) return;

  if (getSearchMode() === 'results') {
    container.style.display = 'none';
    container.innerHTML = '';
    searchState.lastShareContext.videos = [];
    return;
  }

  if (data.error || !Array.isArray(data.videos) || data.videos.length === 0) {
    container.style.display = 'none';
    container.innerHTML = '';
    searchState.lastShareContext.videos = [];
    return;
  }

  searchState.lastShareContext.videos = data.videos.slice(0, 6);

  const itemsHtml = data.videos
    .slice(0, 6)
    .map(video => {
      const title = escapeHtml(video.title || '');
      const thumb = escapeHtml(safeHttpUrl(video.thumbnailUrl || '', ''));
      const link = escapeHtml(safeHttpUrl(video.videoUrl || video.sourceUrl || '#', '#'));
      const source = escapeHtml(video.sourceName || '');
      const duration = escapeHtml(video.duration || '');

      return `
        <a class="ai-video-card" href="${link}" target="_blank" rel="noopener">
          <div class="ai-video-thumb">
            <img src="${thumb}" alt="${title}">
            ${duration ? `<div class="ai-video-duration">${duration}</div>` : ''}
          </div>
          <div class="ai-video-meta">
            <div class="ai-video-title">${title}</div>
            <div class="ai-video-source">${source}</div>
          </div>
        </a>
      `;
    })
    .join('');

  const gridHtml = `<div class="ai-video-grid">${itemsHtml}</div>`;
  const bodyHtml = isAdultQuery(getActiveSearchQuery())
    ? wrapMediaNsfwHtml(gridHtml)
    : gridHtml;

  container.innerHTML = `
    <div class="ai-video-header">
      <span>${t.videosHeader}</span>
    </div>
    ${bodyHtml}
  `;
  container.style.display = 'block';
  bindMediaNsfwReveal(container);
}

function showShareToast(message) {
  const toast = document.getElementById('ai-share-toast');
  if (!toast) return;
  toast.textContent = message;
  toast.style.display = 'block';
  toast.classList.add('visible');
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => {
      toast.style.display = 'none';
    }, 200);
  }, 2000);
}

export {
  isQuotaError,
  quotaCtaHtml,
  quotaKind,
  quotaMeter,
  quotaKickerText,
  quotaUsageHtml,
  quotaNoticeHtml,
  showResult,
  showImageResults,
  showVideoResults,
  showShareToast
};
