/**
 * news.js — загрузка и рендер новостей на главной странице.
 *
 * API: GET /news?locale=<lang>&limit=10
 * Ответ: { locale, news: NewsItem[], topics: string[], updatedAt }
 *
 * NewsItem: { id, topic_key, lang, title, body, cover_url, sources, generated_at }
 */

const NEWS_LIMIT = 10;

/** Относительный URL — работает и на localhost (если Vite проксирует), и на проде. */
function buildNewsUrl() {
  const lang = (document.documentElement.lang || 'en').toLowerCase();
  return `/news?locale=${encodeURIComponent(lang)}&limit=${NEWS_LIMIT}`;
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

/**
 * Возвращает первый источник из поля sources.
 * sources может быть JSON-строкой, массивом объектов { url, link } или массивом строк.
 */
function resolveSourceUrl(sources) {
  try {
    const arr = typeof sources === 'string' ? JSON.parse(sources) : sources;
    if (Array.isArray(arr) && arr.length > 0) {
      const first = arr[0];
      if (typeof first === 'string') return first || '#';
      return first.url || first.link || '#';
    }
  } catch {
    // ignore malformed JSON
  }
  return '#';
}

/** Экранирует HTML-спецсимволы в тексте (защита от XSS в title/body). */
function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Строит HTML одной карточки новости. */
function buildNewsCard(item) {
  const href = resolveSourceUrl(item.sources);
  const date = formatDate(item.generated_at);
  const cover = item.cover_url
    ? `<img class="news-item__cover" src="${esc(item.cover_url)}" alt="" loading="lazy" decoding="async">`
    : '';

  return `
    <a class="news-item" href="${esc(href)}" target="_blank" rel="noopener noreferrer">
      ${cover}
      <div class="news-item__body">
        ${item.topic_key ? `<span class="news-item__topic">${esc(item.topic_key)}</span>` : ''}
        <div class="news-item__title">${esc(item.title)}</div>
        ${item.body ? `<div class="news-item__desc">${esc(item.body)}</div>` : ''}
        ${date ? `<div class="news-item__date">${date}</div>` : ''}
      </div>
    </a>
  `.trim();
}

/**
 * Основная функция — вызывается из scripts.js → loadPageData().
 * Тихо выходит если #news-container нет на странице (например, страница /news/)
 */
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
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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
    // контейнер оставляем пустым — не ломаем страницу
  }
}
