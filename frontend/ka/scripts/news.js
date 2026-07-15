/**
 * news.js — вариант 5: hero-карточка + горизонтальная лента
 *
 * HTML в шаблоне (верх страницы):
 *
 * <div id="news-block" style="display:none">
 *   <div class="news-block-header">
 *     <span class="news-dot"></span>
 *     <span class="news-block-title">Сейчас в мире</span>
 *   </div>
 *   <div id="news-hero-wrap"></div>
 *   <div class="feed-wrapper">
 *     <button class="feed-arrow feed-arrow-left" aria-label="Назад" hidden>
 *       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
 *     </button>
 *     <div class="news-feed" id="news-feed"></div>
 *     <button class="feed-arrow feed-arrow-right" aria-label="Вперёд">
 *       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
 *     </button>
 *   </div>
 * </div>
 */

import { getMessages, t } from './i18n-loader.js';
import { escapeHtml } from './finding-content-render.js';

const NEWS_LIMIT = 10;

const TOPIC_TAG_MAP = {
  ai:         { cls: 'ai',       key: 'news.tag.ai' },
  tech:       { cls: 'tech',     key: 'news.tag.tech' },
  technology: { cls: 'tech',     key: 'news.tag.tech' },
  world:      { cls: 'world',    key: 'news.tag.world' },
  science:    { cls: 'sci',      key: 'news.tag.science' },
  sci:        { cls: 'sci',      key: 'news.tag.science' },
  sport:      { cls: 'sport',    key: 'news.tag.sport' },
  sports:     { cls: 'sport',    key: 'news.tag.sport' },
  space:      { cls: 'space',    key: 'news.tag.space' },
  business:   { cls: 'business', key: 'news.tag.business' },
  health:     { cls: 'health',   key: 'news.tag.health' },
  games:      { cls: 'games',    key: 'news.tag.games' },
  politics:   { cls: 'politics', key: 'news.tag.politics' },
  economy:    { cls: 'economy',  key: 'news.tag.economy' },
  culture:    { cls: 'culture',  key: 'news.tag.culture' },
};

function getTag(topicKey) {
  const k = (topicKey || '').toLowerCase();
  const t = getMessages();
  if (TOPIC_TAG_MAP[k]) {
    const entry = TOPIC_TAG_MAP[k];
    return { cls: entry.cls, label: t[entry.key] || entry.key };
  }
  return { cls: 'world', label: topicKey || t['news.tag.world'] || 'News' };
}

function buildNewsUrl() {
  const lang = (document.documentElement.lang || 'en').toLowerCase();
  return `/news?locale=${encodeURIComponent(lang)}&limit=${NEWS_LIMIT}`;
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    const lang = (document.documentElement.lang || 'en').toLowerCase();
    return new Date(iso).toLocaleDateString(lang, { day: 'numeric', month: 'short' });
  } catch { return ''; }
}

function resolveSourceUrl(sources) {
  try {
    const arr = typeof sources === 'string' ? JSON.parse(sources) : sources;
    if (Array.isArray(arr) && arr.length > 0) {
      const f = arr[0];
      return (typeof f === 'string' ? f : f.url || f.link) || '#';
    }
  } catch { }
  return '#';
}

function resolveHostname(href) {
  try { return href !== '#' ? new URL(href).hostname : ''; } catch { return ''; }
}

function tagHtml(topicKey) {
  const t = getTag(topicKey);
  return `<span class="news-tag ${t.cls}">${t.label}</span>`;
}

/** Маленькая цветная точка категории для карточек ленты */
function dotHtml(topicKey) {
  const t = getTag(topicKey);
  return `<span class="card-dot card-dot--${t.cls}" title="${t.label}"></span>`;
}

function safeHttpUrl(url, fallback = '#') {
  try {
    const parsed = new URL(String(url || ''), window.location.origin);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
  } catch {
    /* ignore */
  }
  return fallback;
}

function faviconHtml(hostname) {
  if (!hostname) return '';
  const src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=16`;
  return `<img class="card-favicon" src="${escapeHtml(src)}" alt="" width="14" height="14" loading="lazy" onerror="this.style.display='none'">`;
}

function buildHero(item) {
  const href     = safeHttpUrl(item.url || resolveSourceUrl(item.sources) || '#', '#');
  const hostname = escapeHtml(item.source || resolveHostname(href));
  const date     = escapeHtml(formatDate(item.publishedAt || item.generated_at));
  return `
    <a class="combo-hero" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" data-tag="${escapeHtml(getTag(item.topicKey).cls)}">
      ${tagHtml(item.topicKey)}
      <p class="combo-hero-headline">${escapeHtml(item.title || '')}</p>
      ${item.snippet ? `<p class="combo-hero-desc">${escapeHtml(item.snippet)}</p>` : ''}
      <div class="combo-hero-meta">
        <span class="card-source">
          ${faviconHtml(item.source || resolveHostname(href))}
          ${hostname}
        </span>
        ${date ? `<span class="card-time">${date}</span>` : ''}
      </div>
    </a>
  `.trim();
}

function buildCard(item) {
  const href     = safeHttpUrl(item.url || resolveSourceUrl(item.sources) || '#', '#');
  const hostname = escapeHtml(item.source || resolveHostname(href));
  const date     = escapeHtml(formatDate(item.publishedAt || item.generated_at));
  const tagCls   = escapeHtml(getTag(item.topicKey).cls);
  return `
    <a class="card" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" data-tag="${tagCls}">
      <div class="card-top">
        ${dotHtml(item.topicKey)}
        <p class="card-headline">${escapeHtml(item.title || '')}</p>
      </div>
      <div class="card-meta">
        <span class="card-source">
          ${faviconHtml(item.source || resolveHostname(href))}
          ${hostname}
        </span>
        ${date ? `<span class="card-time">${date}</span>` : ''}
      </div>
    </a>
  `.trim();
}

/** Drag-to-scroll для ленты */
function initDragScroll(feed) {
  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;
  let moved = false;

  feed.addEventListener('mousedown', (e) => {
    isDown = true;
    moved = false;
    startX = e.pageX - feed.offsetLeft;
    scrollLeft = feed.scrollLeft;
    feed.style.cursor = 'grabbing';
    feed.style.userSelect = 'none';
  });

  feed.addEventListener('mouseleave', () => {
    isDown = false;
    feed.style.cursor = 'grab';
    feed.style.userSelect = '';
  });

  feed.addEventListener('mouseup', (e) => {
    isDown = false;
    feed.style.cursor = 'grab';
    feed.style.userSelect = '';
    if (moved) e.preventDefault();
  });

  feed.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - feed.offsetLeft;
    const walk = (x - startX) * 1.2;
    if (Math.abs(walk) > 4) moved = true;
    feed.scrollLeft = scrollLeft - walk;
  });

  feed.addEventListener('click', (e) => {
    if (moved) { e.preventDefault(); moved = false; }
  }, true);
}

/** Стрелки-кнопки: обновляем видимость */
function updateArrows(feed, btnLeft, btnRight) {
  if (!btnLeft || !btnRight) return;
  const atStart = feed.scrollLeft <= 4;
  const atEnd   = feed.scrollLeft >= feed.scrollWidth - feed.clientWidth - 4;
  btnLeft.hidden  = atStart;
  btnRight.hidden = atEnd;
}

/** Инициализация стрелок */
function initArrows(feed) {
  const wrapper  = feed.closest('.feed-wrapper');
  if (!wrapper) return;

  const btnLeft  = wrapper.querySelector('.feed-arrow-left');
  const btnRight = wrapper.querySelector('.feed-arrow-right');

  if (btnLeft) btnLeft.setAttribute('aria-label', t('news.prev'));
  if (btnRight) btnRight.setAttribute('aria-label', t('news.next'));

  const SCROLL_STEP = 220;

  btnLeft?.addEventListener('click', () => {
    feed.scrollBy({ left: -SCROLL_STEP, behavior: 'smooth' });
  });
  btnRight?.addEventListener('click', () => {
    feed.scrollBy({ left: SCROLL_STEP, behavior: 'smooth' });
  });

  feed.addEventListener('scroll', () => updateArrows(feed, btnLeft, btnRight), { passive: true });
  updateArrows(feed, btnLeft, btnRight);
}

export async function loadNews() {
  const block    = document.getElementById('news-block');
  const heroWrap = document.getElementById('news-hero-wrap');
  const feed     = document.getElementById('news-feed');

  if (!block || !heroWrap || !feed) return;

  try {
    const response = await fetch(buildNewsUrl(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data  = await response.json();
    const items = Array.isArray(data?.news) ? data.news : [];

    if (items.length === 0) return;

    heroWrap.innerHTML = buildHero(items[0]);
    feed.innerHTML     = items.slice(1).map(buildCard).join('');

    block.style.display = '';

    initDragScroll(feed);
    initArrows(feed);
  } catch (err) {
    console.error('[News] Ошибка загрузки:', err);
  }
}
