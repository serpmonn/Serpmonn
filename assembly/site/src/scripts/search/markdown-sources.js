import { getMessages } from '../i18n-loader.js';
import { escapeHtml } from '../finding-content-render.js';
import {
  canAttachPromoIntent,
  peekPromoIntent,
  detectPromoIntentKeyword,
  getPromoCatalogPath,
  parsePromoPipeVariants,
  stablePickIndex,
  formatPromoLabelTemplate
} from './promo-intent.js';

function safeHttpUrl(url, fallback = '#') {
  const raw = String(url || '').trim();
  if (!raw) return fallback;
  try {
    const parsed = new URL(raw, window.location.origin);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

function renderMarkdown(text) {
  const placeholders = [];
  let raw = String(text ?? '');

  raw = raw.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    const token = `\u0000MDLINK${placeholders.length}\u0000`;
    placeholders.push({
      label: String(label || ''),
      href: safeHttpUrl(href, '#')
    });
    return token;
  });

  let html = escapeHtml(raw);

  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

  // списки
  html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/^(\d+)\. (.*$)/gim, '<li>$2</li>');
  html = html.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');

  html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');
  html = html.replace(/\n/g, '<br>');

  placeholders.forEach((item, index) => {
    const needle = escapeHtml(`\u0000MDLINK${index}\u0000`);
    const anchor = `<a href="${escapeHtml(item.href)}" target="_blank" rel="noopener" class="md-link">${escapeHtml(item.label)}</a>`;
    html = html.split(needle).join(anchor);
  });

  return html;
}

function getSourceHostname(link) {
  try {
    return new URL(link).hostname.replace(/^www\./, '');
  } catch (e) {
    return '';
  }
}

function getSourceFaviconUrl(hostname, size = 64) {
  if (!hostname) return '';
  const host = String(hostname).replace(/^www\./, '').toLowerCase();
  // Свой значок для Serpmonn
  if (host === 'serpmonn.ru' || host.endsWith('.serpmonn.ru')) {
    // Берём 32/192 и даём браузеру даунскейл — так резче, чем 16px
    return size >= 48
      ? '/frontend/images/serpmonn-192.png?v=3'
      : '/frontend/images/favicon-32x32.png?v=3';
  }
  // Google s2: запрашиваем крупнее (64), иначе на ретине мыло
  const sz = size <= 16 ? 32 : size <= 32 ? 64 : 128;
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${sz}`;
}

function normalizeSourceItems(items) {
  return items
    .slice(0, 6)
    .map((item) => ({
      link: item.link || item.url || '',
      title: item.title || item.text || item.link || item.url || ''
    }))
    .filter((item) => item.link);
}

function dedupeSourcesByHostname(sources) {
  const seen = new Set();
  const unique = [];

  for (const src of sources) {
    const hostname = getSourceHostname(src.link);
    const key = hostname || src.link;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push({ ...src, hostname });
  }

  return unique;
}

function buildSourceHostnameCounts(sources) {
  const counts = new Map();

  for (const src of sources) {
    const hostname = getSourceHostname(src.link);
    const key = hostname || src.link;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return counts;
}


function getPromoCatalogPublicOrigin() {
  // Канонический прод-домен: даже на dev.serpmonn.ru источник ведёт на serpmonn.ru
  return 'https://serpmonn.ru';
}

function buildPromoCatalogSource(intent, messages = getMessages()) {
  if (!intent) return null;
  const search = String(intent.search || '').trim();
  // getPromoCatalogPath() уже учитывает текущую локаль (ru / en / …)
  // Источник — просто страница каталога, без ?search= фильтра
  const path = getPromoCatalogPath();
  const href = `${getPromoCatalogPublicOrigin()}${path}`;
  const brand = intent.label || search || 'Serpmonn';
  const titleVariants = parsePromoPipeVariants(
    messages.promoIntentSourceTitles,
    messages.promoIntentSourceTitle || 'Serpmonn promocodes: {brand}'
  );
  const titleTpl =
    titleVariants[stablePickIndex(search || brand, titleVariants.length)] ||
    'Serpmonn promocodes: {brand}';
  const title = formatPromoLabelTemplate(titleTpl, brand);
  return { link: href, url: href, title };
}

function resolvePromoAttachIntent(query) {
  if (!canAttachPromoIntent()) return null;
  return peekPromoIntent(query) || detectPromoIntentKeyword(query);
}

/** Страница промокодов — всегда первый источник при promo-intent. */
function withPromoSourceFirst(sources, query, messages = getMessages()) {
  const intent = resolvePromoAttachIntent(query);
  if (!intent) {
    return Array.isArray(sources) ? sources : [];
  }

  const promoSrc = buildPromoCatalogSource(
    typeof intent.search === 'string'
      ? intent
      : { search: intent.search, label: intent.label },
    messages
  );
  if (!promoSrc) return Array.isArray(sources) ? sources : [];

  const list = Array.isArray(sources) ? sources.slice() : [];
  const filtered = list.filter((src) => {
    const link = String(src?.link || src?.url || '');
    return !/promo-codes-and-discounts|promokody-skidki/i.test(link);
  });
  return [promoSrc, ...filtered];
}

/** Тот же каталог промокодов — первый результат в режиме Выдача. */
function buildPromoCatalogResultItem(intent, messages = getMessages()) {
  const promoSrc = buildPromoCatalogSource(intent, messages);
  if (!promoSrc) return null;
  return {
    title: promoSrc.title,
    url: promoSrc.link,
    link: promoSrc.link,
    content: messages.promoIntentText || 'Current codes on Serpmonn',
    hostname: 'serpmonn.ru',
    engine: 'Serpmonn'
  };
}

function withPromoResultFirst(items, query, messages = getMessages()) {
  const intent = resolvePromoAttachIntent(query);
  if (!intent) return Array.isArray(items) ? items : [];

  const promoItem = buildPromoCatalogResultItem(intent, messages);
  if (!promoItem) return Array.isArray(items) ? items : [];

  const list = Array.isArray(items) ? items.slice() : [];
  const filtered = list.filter((item) => {
    const link = String(item?.url || item?.link || '');
    return !/promo-codes-and-discounts|promokody-skidki/i.test(link);
  });
  return [promoItem, ...filtered];
}

function renderSourcesBlock(items, messages) {
  const sources = normalizeSourceItems(items);
  if (!sources.length) return '';

  const chipSources = dedupeSourcesByHostname(sources);
  const hostnameCounts = buildSourceHostnameCounts(sources);
  const toggleLabel = `${messages.sources} (${sources.length})`;

  const chips = chipSources
    .map((src) => {
      const hostname = src.hostname || getSourceHostname(src.link);
      const favicon = getSourceFaviconUrl(hostname, 64);
      const count = hostnameCounts.get(hostname || src.link) || 1;
      const chipTitle =
        count > 1 ? `${hostname} (${count})` : src.title || hostname;
      const href = safeHttpUrl(src.link, '#');

      return `
        <a href="${escapeHtml(href)}" target="_blank" rel="noopener" class="ai-source-chip" title="${escapeHtml(chipTitle)}">
          <img src="${escapeHtml(favicon)}" class="ai-source-chip-favicon" alt="" width="16" height="16" loading="lazy">
        </a>
      `;
    })
    .join('');

  const listItems = sources
    .map((src) => {
      const hostname = getSourceHostname(src.link);
      const favicon = getSourceFaviconUrl(hostname, 32);
      const href = safeHttpUrl(src.link, '#');
      return `
        <a href="${escapeHtml(href)}" target="_blank" rel="noopener" class="source-item">
          <img src="${escapeHtml(favicon)}" class="source-favicon" alt="" width="16" height="16" loading="lazy">
          <span class="source-title">${escapeHtml(src.title)}</span>
          <span class="source-url">${escapeHtml(hostname)}</span>
        </a>
      `;
    })
    .join('');

  return `
    <div class="ai-sources">
      <div class="ai-sources-bar">
        <div class="ai-sources-chips">${chips}</div>
        <button type="button" class="ai-sources-toggle" aria-expanded="false" aria-controls="ai-sources-list">
          <span class="ai-sources-toggle-label">${toggleLabel}</span>
          <svg class="ai-sources-chevron" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>
          </svg>
        </button>
      </div>
      <div id="ai-sources-list" class="ai-sources-list" hidden>
        ${listItems}
      </div>
    </div>
  `;
}

function setupSourcesToggle(root = document) {
  const block = root.querySelector('.ai-sources');
  if (!block) return;

  const toggle = block.querySelector('.ai-sources-toggle');
  const list = block.querySelector('.ai-sources-list');
  if (!toggle || !list) return;

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    const nextExpanded = !expanded;

    toggle.setAttribute('aria-expanded', nextExpanded ? 'true' : 'false');
    list.hidden = !nextExpanded;
    block.classList.toggle('is-expanded', nextExpanded);
  });
}

export {
  safeHttpUrl,
  renderMarkdown,
  getSourceHostname,
  getSourceFaviconUrl,
  normalizeSourceItems,
  dedupeSourcesByHostname,
  buildSourceHostnameCounts,
  getPromoCatalogPublicOrigin,
  buildPromoCatalogSource,
  resolvePromoAttachIntent,
  withPromoSourceFirst,
  buildPromoCatalogResultItem,
  withPromoResultFirst,
  renderSourcesBlock,
  setupSourcesToggle
};
