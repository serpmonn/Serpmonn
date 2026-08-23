import { getMessages } from '../i18n-loader.js';
import { escapeHtml } from '../finding-content-render.js';
import { searchState } from './state.js';
import {
  getEnv,
  getCurrentLocale,
  getSearchAnalyticsHeaders
} from './env-analytics.js';

/** Lazy imports avoid static cycles with quota-result / results-mode. */
async function showShareToast(message) {
  const { showShareToast: toast } = await import('./quota-result.js');
  return toast(message);
}

async function ensurePromoResultsCard(intent) {
  const { ensurePromoResultsCard: ensure } = await import('./results-mode.js');
  return ensure(intent);
}

const PROMO_INTENT_RE =
  /промо\s*код(?:ы|а|ов)?|промокод(?:ы|а|ов)?|промик(?:и|а|ов)?|промо[\s\-]?акци(?:я|и|ю|ей)|купон(?:ы|а|ов)?|скидк(?:а|и|у|ой|е)(?:\s+на)?|код(?:ы)?\s+(?:на\s+)?скидк(?:у|и|а)|бонусн(?:ый|ые|ого|ых)\s+код(?:ы|а|ов)?|ваучер(?:ы|а|ов)?|к[еэ]шб[еэ]к(?:и|а|ов)?|promo\s*codes?|\bpromos?\b|coupons?|vouchers?|cashbacks?|bonus\s+codes?|\bdiscount\b/i;

const PROMO_BRAND_STOP = new Set([
  'что',
  'как',
  'где',
  'это',
  'для',
  'или',
  'про',
  'the',
  'and',
  'for',
  'www',
  'http',
  'https'
]);

function getPromoCatalogLocale() {
  try {
    const m = String(window.location.pathname || '').match(
      /^\/frontend\/([a-z]{2}(?:-[a-z0-9]+)?)(?:\/|$)/i
    );
    if (m && m[1]) {
      const seg = m[1].toLowerCase();
      const nonLocale = new Set([
        'promo-codes-and-discounts', 'images', 'styles', 'scripts', 'games', 'tools',
        'knowledge-base', 'about-project', 'ad-info', 'poleznoe', 'downloads', 'pwa',
        'profile', 'auth', 'find', 'news', 'menu', 'partners', 'admin'
      ]);
      if (!nonLocale.has(seg)) return seg;
    }
  } catch (_) {}
  return (getCurrentLocale() || 'ru').trim().toLowerCase() || 'ru';
}

function getPromoCatalogPath() {
  const locale = getPromoCatalogLocale();
  if (!locale || locale === 'ru') {
    return '/frontend/promo-codes-and-discounts/promokody-skidki.html';
  }
  return `/frontend/${locale}/promo-codes-and-discounts/promokody-skidki.html`;
}

function extractPromoSearchTerm(query) {
  const q = String(query || '').trim();
  if (!q) return '';
  const stripped = q.replace(PROMO_INTENT_RE, ' ').replace(/\s+/g, ' ').trim();
  return stripped || q;
}


function canAttachPromoIntent() {
  const env = getEnv();
  if (env === 'vk_mini' || env === 'twa') return false;
  try {
    if (window.__SPN_ANDROID_APP__) return false;
    if (document.documentElement?.classList?.contains('android-app')) return false;
    if (document.body?.classList?.contains('android-app')) return false;
    if (/(?:^|[?&])app=1(?:&|$)/.test(location.search || '')) return false;
  } catch (_) {}
  return true;
}

function detectPromoIntentKeyword(query) {
  if (!canAttachPromoIntent()) return null;
  const q = String(query || '').trim();
  if (!q || !PROMO_INTENT_RE.test(q)) return null;
  const search = extractPromoSearchTerm(q);
  return { search, label: search, reason: 'keyword' };
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function pickPromoBrandLabel(items, query) {
  const q = String(query || '')
    .toLowerCase()
    .trim();
  if (!q) return null;

  let best = null;
  for (const item of items) {
    const title = String(item?.title || '').trim();
    const t = title.toLowerCase();
    if (!t.includes(q)) continue;

    let score = 0;
    if (t === q) score = 100;
    else if (t.startsWith(`${q} `) || t.startsWith(`${q}/`) || t.startsWith(`${q}:`)) score = 90;
    else if (new RegExp(`(?:^|[\\s\\-_/])${escapeRegExp(q)}(?:$|[\\s\\-_/])`, 'i').test(t)) score = 75;
    else if (q.length >= 4) score = 50;
    else continue;

    if (!best || score > best.score) best = { title, score };
  }

  return best && best.score >= 50 ? best.title : null;
}

async function fetchPromoItemsForSearch(search) {
  const q = String(search || '').trim();
  if (!q) return [];
  try {
    const url = `/api/promocodes?search=${encodeURIComponent(q)}&status=active`;
    const res = await fetch(url, {
      credentials: 'same-origin',
      headers: getSearchAnalyticsHeaders()
    });
    if (!res.ok) return [];
    const data = await res.json();
    const items = Array.isArray(data?.data) ? data.data : [];
    return items
      .filter((p) => Boolean(String(p?.promocode || '').trim()))
      .map((p) => ({
        title: String(p.title || '').trim(),
        promocode: String(p.promocode || '').trim(),
        description: String(p.description || p.subtitle || '').trim()
      }));
  } catch (_) {
    return [];
  }
}

async function resolvePromoIntent(query) {
  if (!canAttachPromoIntent()) return null;

  const q = String(query || '').trim();
  if (!q) return null;

  const keyword = detectPromoIntentKeyword(q);
  let search = keyword ? keyword.search : q;

  if (!keyword) {
    const norm = q.toLowerCase();
    if (q.length < 3 || q.length > 48) return null;
    if (PROMO_BRAND_STOP.has(norm)) return null;
    if (q.split(/\s+/).length > 4) return null;
  }

  const allItems = await fetchPromoItemsForSearch(search);
  if (!allItems.length) {
    // Без кодов врезку не показываем — в источниках всё равно будет страница промокодов
    return null;
  }

  const items = allItems.slice(0, 6);
  const moreCount = Math.max(0, allItems.length - items.length);
  const label = keyword
    ? keyword.label || search
    : pickPromoBrandLabel(allItems, q) || items[0].title || search;

  return {
    search,
    label,
    reason: keyword ? 'keyword' : 'brand',
    items,
    moreCount
  };
}

/** Один fetch на query: стрим + showResult не бьют API дважды. */
const promoIntentCache = { query: '', promise: null, intent: undefined };

function peekPromoIntent(query) {
  const q = String(query || '').trim();
  if (!q || promoIntentCache.query !== q) return undefined;
  return promoIntentCache.intent;
}

function getPromoIntent(query) {
  const q = String(query || '').trim();
  if (!q) return Promise.resolve(null);
  if (promoIntentCache.query === q && promoIntentCache.promise) {
    return promoIntentCache.promise;
  }
  const promise = resolvePromoIntent(q).then((intent) => {
    if (promoIntentCache.query === q) {
      promoIntentCache.intent = intent;
    }
    return intent;
  });
  promoIntentCache.query = q;
  promoIntentCache.promise = promise;
  promoIntentCache.intent = undefined;
  return promise;
}


function formatPromoBenefit(item, maxLen = 18) {
  const raw = String(item?.title || item?.description || '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!raw) return '';
  if (raw.length <= maxLen) return raw;
  return `${raw.slice(0, maxLen - 1).trimEnd()}…`;
}

function formatPromoTooltip(item) {
  const title = String(item?.title || '').trim();
  const desc = String(item?.description || '').trim();
  if (title && desc && desc !== title) return `${title} — ${desc}`;
  return title || desc || '';
}

function parsePromoPipeVariants(raw, fallback) {
  const parts = String(raw || '')
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length) return parts;
  const fb = String(fallback || '').trim();
  return fb ? [fb] : [];
}

function stablePickIndex(seed, len) {
  if (!len || len <= 1) return 0;
  let h = 2166136261;
  const s = String(seed || '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % len;
}

function formatPromoLabelTemplate(tpl, brand) {
  const b = String(brand || '').trim() || 'Serpmonn';
  return String(tpl || '')
    .replaceAll('{brand}', b)
    .replace(/\s+/g, ' ')
    .trim();
}

/** Подпись врезки: стабильный вариант из списка по search. */
function pickPromoIntentLabelText(intent, messages = getMessages()) {
  const brand = String(intent?.label || intent?.search || '').trim();
  const variants = parsePromoPipeVariants(
    messages.promoIntentLabels,
    messages.promoIntentLabel || 'Promocodes:'
  );
  if (!variants.length) return 'Promocodes:';
  const tpl = variants[stablePickIndex(intent?.search || brand, variants.length)];
  return formatPromoLabelTemplate(tpl, brand);
}

function renderPromoIntentCard(intent) {
  if (!intent) return '';
  const messages = getMessages();
  const labelText = pickPromoIntentLabelText(intent, messages);
  const copyLabel = messages.promoIntentCopy || 'Copy';
  const moreTpl = messages.promoIntentMore || 'more {n}';
  const href = `${getPromoCatalogPath()}?search=${encodeURIComponent(intent.search)}`;
  const items = Array.isArray(intent.items) ? intent.items : [];
  const moreCount = Number(intent.moreCount) || 0;
  const copyIcon = `<svg class="promo-intent-copy-icon" viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;

  if (!items.length) return '';

  const codesHtml = items
    .map((item) => {
      const code = item.promocode || '';
      if (!code) return '';
      const tip = formatPromoTooltip(item) || copyLabel;
      return `<span class="promo-intent-chip" data-promo-code="${escapeHtml(code)}" data-promo-tip="${escapeHtml(tip)}" title="${escapeHtml(tip)}" role="button" tabindex="0">
        <code class="promo-intent-code">${escapeHtml(code)}</code>
        <button type="button" class="promo-intent-copy" data-promo-code="${escapeHtml(code)}" title="${escapeHtml(copyLabel)}" aria-label="${escapeHtml(copyLabel)}: ${escapeHtml(code)}">${copyIcon}</button>
      </span>`;
    })
    .filter(Boolean)
    .join('');

  // Всегда «ещё» на месте после кодов (с числом, если есть скрытые)
  const moreLabel =
    moreCount > 0
      ? moreTpl.replaceAll('{n}', String(moreCount))
      : moreTpl.replaceAll('{n}', '').replace(/\s+/g, ' ').trim() || 'ещё';
  const moreHtml = `<a class="promo-intent-more" href="${escapeHtml(href)}">${escapeHtml(moreLabel)}</a>`;

  return `
    <aside class="promo-intent-card" role="complementary" data-promo-intent="${escapeHtml(intent.reason || '')}">
      <div class="promo-intent-row">
        <span class="promo-intent-label">${escapeHtml(labelText)}</span>
        <span class="promo-intent-codes">${codesHtml}${moreHtml}</span>
      </div>
    </aside>`;
}

function bindPromoIntentCardActions(root = document) {
  const card = root.querySelector?.('.promo-intent-card') || document.querySelector('.promo-intent-card');
  if (!card || card.dataset.copyBound === '1') return;
  card.dataset.copyBound = '1';
  const messages = getMessages();
  const copyLabel = messages.promoIntentCopy || 'Copy';
  const copiedLabel = messages.promoIntentCopied || 'Copied';

  const copyCode = async (code, triggerEl) => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      const chip = triggerEl?.closest?.('.promo-intent-chip');
      const btn = chip?.querySelector?.('.promo-intent-copy') || triggerEl;
      const tip = String(chip?.getAttribute?.('title') || chip?.dataset?.promoTip || '').trim();
      if (btn?.classList?.contains('promo-intent-copy')) {
        btn.classList.add('is-copied');
        const prevTitle = btn.title;
        btn.title = copiedLabel;
        setTimeout(() => {
          btn.classList.remove('is-copied');
          btn.title = prevTitle || copyLabel;
        }, 1200);
      }
      // На таче нет hover-tooltip — описание показываем в тосте
      let toastText = copiedLabel;
      if (tip && tip !== copyLabel && tip !== copiedLabel) {
        const short = tip.length > 72 ? `${tip.slice(0, 71).trimEnd()}…` : tip;
        toastText = (messages.promoIntentCopiedDetail || '{copied}: {detail}')
          .replaceAll('{copied}', copiedLabel)
          .replaceAll('{detail}', short);
      }
      await showShareToast(toastText);
    } catch (_) {
      /* ignore */
    }
  };

  card.addEventListener('click', (e) => {
    if (e.target?.closest?.('a')) return;
    const target = e.target?.closest?.('[data-promo-code]');
    if (!target || !card.contains(target)) return;
    e.preventDefault();
    copyCode(String(target.dataset.promoCode || '').trim(), target);
  });

  card.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const target = e.target?.closest?.('.promo-intent-chip[data-promo-code]');
    if (!target || !card.contains(target)) return;
    e.preventDefault();
    copyCode(String(target.dataset.promoCode || '').trim(), target);
  });
}

function mountPromoIntentCard(intent) {
  const contentDiv = document.getElementById('ai-result-content');
  if (!contentDiv || !intent) return;
  if (contentDiv.querySelector('.promo-intent-card')) return;
  const html = renderPromoIntentCard(intent);
  const sources = contentDiv.querySelector('.ai-sources');
  if (sources) {
    sources.insertAdjacentHTML('beforebegin', html);
  } else {
    const answer = contentDiv.querySelector(
      '.ai-answer, .ai-empty-answer, .ai-streaming-answer, .results-general, .results-media-grid, .results-news-list, .results-map'
    );
    if (answer) {
      // После последнего блока выдачи / ответа
      const block =
        contentDiv.querySelector('.results-list, .results-media-grid, .results-news-list') ||
        answer;
      block.insertAdjacentHTML('afterend', html);
    } else {
      contentDiv.insertAdjacentHTML('beforeend', html);
    }
  }
  bindPromoIntentCardActions(contentDiv);
}

async function maybeShowPromoIntent(query) {
  const reqId = ++searchState.promoIntentRequestId;
  const intent = await getPromoIntent(query);
  if (reqId !== searchState.promoIntentRequestId) return;
  if (intent) {
    await ensurePromoResultsCard(intent);
    mountPromoIntentCard(intent);
  }
}

/** Старт параллельно с ИИ/Выдачей — врезка готова раньше ответа. */
function prefetchPromoIntent(query) {
  if (!canAttachPromoIntent()) return;
  const q = String(query || '').trim();
  if (!q) return;
  getPromoIntent(q).then(async (intent) => {
    if (!intent) return;
    const contentDiv = document.getElementById('ai-result-content');
    if (!contentDiv) return;
    // Когда уже есть ответ/стрим/выдача — докидываем результат + врезку кодов
    if (
      contentDiv.querySelector('.ai-streaming-answer') ||
      contentDiv.querySelector('.ai-answer, .ai-empty-answer') ||
      contentDiv.querySelector('.results-card, .results-list, .results-media-grid, .results-empty')
    ) {
      await ensurePromoResultsCard(intent);
      if (!contentDiv.querySelector('.promo-intent-card')) {
        mountPromoIntentCard(intent);
      }
    }
  });
}

export {
  PROMO_INTENT_RE,
  PROMO_BRAND_STOP,
  getPromoCatalogLocale,
  getPromoCatalogPath,
  extractPromoSearchTerm,
  canAttachPromoIntent,
  detectPromoIntentKeyword,
  escapeRegExp,
  pickPromoBrandLabel,
  fetchPromoItemsForSearch,
  resolvePromoIntent,
  peekPromoIntent,
  getPromoIntent,
  formatPromoBenefit,
  formatPromoTooltip,
  parsePromoPipeVariants,
  stablePickIndex,
  formatPromoLabelTemplate,
  pickPromoIntentLabelText,
  renderPromoIntentCard,
  bindPromoIntentCardActions,
  mountPromoIntentCard,
  maybeShowPromoIntent,
  prefetchPromoIntent
};
