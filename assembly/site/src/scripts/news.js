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
 *     <div class="news-feed" id="news-feed"></div>
 *   </div>
 * </div>
 */

const NEWS_LIMIT = 10;

const TOPIC_TAG_MAP = {
  ai:         { cls: 'ai',    label: 'ИИ' },
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

function tagHtml(topicKey) {
  const t = getTag(topicKey);
  return `<span class="news-tag ${t.cls}">${t.label}</span>`;
}

function buildHero(item) {
  const href = resolveSourceUrl(item.sources);
  const host = resolveHostname(href);
  const date = formatDate(item.generated_at);
  return `
    <a class="combo-hero" href="${href}" target="_blank" rel="noopener noreferrer">
      ${tagHtml(item.topic_key)}
      <p class="combo-hero-headline">${item.title || ''}</p>
      ${item.body ? `<p class="combo-hero-desc">${item.body}</p>` : ''}
      <div class="combo-hero-meta">
        <span class="card-source">${host}</span>
        ${date ? `<span class="card-time">${date}</span>` : ''}
      </div>
    </a>
  `.trim();
}

function buildCard(item) {
  const href = resolveSourceUrl(item.sources);
  const host = resolveHostname(href);
  const date = formatDate(item.generated_at);
  return `
    <a class="card" href="${href}" target="_blank" rel="noopener noreferrer">
      ${tagHtml(item.topic_key)}
      <p class="card-headline">${item.title || ''}</p>
      <div class="card-meta">
        <span class="card-source">${host}</span>
        ${date ? `<span class="card-time">${date}</span>` : ''}
      </div>
    </a>
  `.trim();
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
  } catch (err) {
    console.error('[News] Ошибка загрузки:', err);
  }
}
