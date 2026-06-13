/**
 * news.js — загрузка и рендер новостей на главной странице.
 * Газетная сетка: 1 главная + 2 малых справа.
 *
 * HTML-структура (должна быть в шаблоне верхней частью страницы):
 *
 * <div id="news-block" style="display:none">
 *   <div class="news-block-header">
 *     <span class="news-dot"></span>
 *     <span class="news-block-title">Сейчас в мире</span>
 *   </div>
 *   <div class="newspaper" id="news-newspaper"></div>
 * </div>
 */

const NEWS_LIMIT = 3;

const TOPIC_TAG_MAP = {
  ai:         { cls: 'ai',    label: 'AI' },
  tech:       { cls: 'tech',  label: 'Технологии' },
  technology: { cls: 'tech',  label: 'Технологии' },
  world:      { cls: 'world', label: 'Мир' },
  science:    { cls: 'sci',   label: 'Наука' },
  sci:        { cls: 'sci',   label: 'Наука' },
  sport:      { cls: 'sport', label: 'Спорт' },
  sports:     { cls: 'sport', label: 'Спорт' },
};

function getTag(topicKey) {
  const k = (topicKey || '').toLowerCase();
  return TOPIC_TAG_MAP[k] || { cls: 'ai', label: topicKey || 'AI' };
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

function buildTagHtml(topicKey) {
  const t = getTag(topicKey);
  return `<span class="news-tag ${t.cls}">${t.label}</span>`;
}

function buildMainCard(item) {
  const href = resolveSourceUrl(item.sources);
  const host = resolveHostname(href);
  const date = formatDate(item.generated_at);
  return `
    <a class="np-main" href="${href}" target="_blank" rel="noopener noreferrer">
      ${buildTagHtml(item.topic_key)}
      <div class="np-main-headline">${item.title || ''}</div>
      ${item.body ? `<div class="np-main-desc">${item.body}</div>` : ''}
      <div class="np-main-meta">
        <span class="np-source">${host}</span>
        ${date ? `<span class="np-time">${date}</span>` : ''}
      </div>
    </a>
  `.trim();
}

function buildSmallCard(item) {
  const href = resolveSourceUrl(item.sources);
  const host = resolveHostname(href);
  const date = formatDate(item.generated_at);
  return `
    <a class="np-small" href="${href}" target="_blank" rel="noopener noreferrer">
      ${buildTagHtml(item.topic_key)}
      <div class="np-small-headline">${item.title || ''}</div>
      <div class="np-small-meta">
        <span class="np-source">${host}</span>
        ${date ? `<span class="np-time">${date}</span>` : ''}
      </div>
    </a>
  `.trim();
}

export async function loadNews() {
  const block     = document.getElementById('news-block');
  const newspaper = document.getElementById('news-newspaper');

  if (!block || !newspaper) return;

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

    let html = buildMainCard(items[0]);
    if (items[1]) html += buildSmallCard(items[1]);
    if (items[2]) html += buildSmallCard(items[2]);

    newspaper.innerHTML = html;
    block.style.display = '';
  } catch (err) {
    console.error('[News] Ошибка загрузки:', err);
  }
}
