/**
 * news.js — загрузка и рендер новостей на главной странице.
 *
 * API: GET /news?locale=<lang>&limit=10
 * Ответ: { locale, news: NewsItem[], topics: string[], updatedAt }
 *
 * NewsItem: { id, topic_key, lang, title, body, cover_url, sources, generated_at }
 */

const NEWS_LIMIT = 10;

function buildNewsUrl() {
  const lang = (document.documentElement.lang || 'en').toLowerCase();
  return `/news?locale=${encodeURIComponent(lang)}&limit=${NEWS_LIMIT}`;
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    const lang = (document.documentElement.lang || 'en').toLowerCase();
    return new Date(iso).toLocaleDateString(lang, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

function resolveSourceUrl(sources) {
  try {
    const arr = typeof sources === 'string' ? JSON.parse(sources) : sources;
    if (Array.isArray(arr) && arr.length > 0) {
      const first = arr[0];
      if (typeof first === 'string') return first || '#';
      return first.url || first.link || '#';
    }
  } catch {
    // ignore
  }
  return '#';
}

function buildFeedCard(item) {
  const href = resolveSourceUrl(item.sources);
  const date = formatDate(item.generated_at);
  return `
    <a class="feed-item" href="${href}" target="_blank" rel="noopener noreferrer">
      <div class="feed-item-body">
        ${item.topic_key ? `<span class="news-tag">${item.topic_key}</span>` : ''}
        <div class="feed-item-title">${item.title}</div>
        ${date ? `<div class="feed-item-date">${date}</div>` : ''}
      </div>
    </a>
  `.trim();
}

export async function loadNews() {
  const block   = document.getElementById('news-block');
  const heroEl  = document.getElementById('news-hero');
  const feed    = document.getElementById('news-feed');

  if (!block || !heroEl || !feed) return;

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

    // Первая новость — герой
    const hero = items[0];
    const heroHref = resolveSourceUrl(hero.sources);

    heroEl.href = heroHref;
    document.getElementById('news-hero-tag').textContent       = hero.topic_key || '';
    document.getElementById('news-hero-headline').textContent  = hero.title     || '';
    document.getElementById('news-hero-desc').textContent      = hero.body      || '';
    document.getElementById('news-hero-source').textContent    = heroHref !== '#' ? new URL(heroHref).hostname : '';
    document.getElementById('news-hero-time').textContent      = formatDate(hero.generated_at);

    // Остальные — лента
    feed.innerHTML = items.slice(1).map(buildFeedCard).join('');

    block.style.display = '';
  } catch (err) {
    console.error('[News] Ошибка загрузки:', err);
  }
}
