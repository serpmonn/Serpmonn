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
  ai:         { cls: 'ai',       label: '\u0418\u0418' },
  tech:       { cls: 'tech',     label: '\u0422\u0435\u0445\u043d\u043e\u043b\u043e\u0433\u0438\u0438' },
  technology: { cls: 'tech',     label: '\u0422\u0435\u0445\u043d\u043e\u043b\u043e\u0433\u0438\u0438' },
  world:      { cls: 'world',    label: '\u041c\u0438\u0440' },
  science:    { cls: 'sci',      label: '\u041d\u0430\u0443\u043a\u0430' },
  sci:        { cls: 'sci',      label: '\u041d\u0430\u0443\u043a\u0430' },
  sport:      { cls: 'sport',    label: '\u0421\u043f\u043e\u0440\u0442' },
  sports:     { cls: 'sport',    label: '\u0421\u043f\u043e\u0440\u0442' },
  space:      { cls: 'space',    label: '\u041a\u043e\u0441\u043c\u043e\u0441' },
  business:   { cls: 'business', label: '\u0411\u0438\u0437\u043d\u0435\u0441' },
  health:     { cls: 'health',   label: '\u0417\u0434\u043e\u0440\u043e\u0432\u044c\u0435' },
  games:      { cls: 'games',    label: '\u0418\u0433\u0440\u044b' },
  politics:   { cls: 'politics', label: '\u041f\u043e\u043b\u0438\u0442\u0438\u043a\u0430' },
  economy:    { cls: 'economy',  label: '\u042d\u043a\u043e\u043d\u043e\u043c\u0438\u043a\u0430' },
  culture:    { cls: 'culture',  label: '\u041a\u0443\u043b\u044c\u0442\u0443\u0440\u0430' },
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
      ${tagHtml(item.topicKey)}
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
      ${tagHtml(item.topicKey)}
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
    console.error('[News] \u041e\u0448\u0438\u0431\u043a\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438:', err);
  }
}
