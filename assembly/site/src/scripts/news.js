/**
 * news.js — загрузка и рендер новостей на главной странице.
 *
 * API: GET /api/news?locale=<lang>&limit=10
 * Ответ: { locale, news: NewsItem[], topics: string[], updatedAt }
 *
 * NewsItem: { id, topic_key, lang, title, body, cover_url, sources, generated_at }
 */

const NEWS_LIMIT = 10;

/** Относительный URL — работает и на localhost, и на проде. */
function buildNewsUrl() {
  const lang = (document.documentElement.lang || 'en').toLowerCase();
  return `/api/news?locale=${encodeURIComponent(lang)}&limit=${NEWS_LIMIT}`;
}

/** Форматирует дату generated_at в человекочитаемый вид. */
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

/** Возвращает первый источник из поля sources (JSON или массив). */
function resolveSourceUrl(sources) {
  try {
    const arr = typeof sources === 'string' ? JSON.parse(sources) : sources;
    if (Array.isArray(arr) && arr.length > 0) {
      return arr[0].url || arr[0].link || arr[0] || '#';
    }
  } catch {
    // ignore
  }
  return '#';
}

/** Строит HTML одной карточки новости. */
function buildNewsCard(item) {
  const href = resolveSourceUrl(item.sources);
  const date = formatDate(item.generated_at);
  const cover = item.cover_url
    ? `<img class="news-item__cover" src="${item.cover_url}" alt="" loading="lazy" decoding="async">`
    : '';

  return `
    <a class="news-item" href="${href}" target="_blank" rel="noopener noreferrer">
      ${cover}
      <div class="news-item__body">
        ${item.topic_key ? `<span class="news-item__topic">${item.topic_key}</span>` : ''}
        <div class="news-item__title">${item.title}</div>
        ${item.body ? `<div class="news-item__desc">${item.body}</div>` : ''}
        ${date ? `<div class="news-item__date">${date}</div>` : ''}
      </div>
    </a>
  `;
}

/** Основная функция — вызывается из scripts.js → loadPageData(). */
export async function loadNews() {
  const container = document.getElementById('news-container');
  if (!container) return;

  try {
    const response = await fetch(buildNewsUrl(), {
      method: 'GET',
      headers: { Accept: 'application/json' },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    const items = Array.isArray(data?.news) ? data.news : [];

    if (items.length === 0) {
      container.innerHTML = '<p class="news-empty">Нет свежих новостей.</p>';
      return;
    }

    container.innerHTML = items.map(buildNewsCard).join('');
  } catch (err) {
    console.error('[News] Ошибка загрузки:', err);
    container.innerHTML = '';
  }
}
