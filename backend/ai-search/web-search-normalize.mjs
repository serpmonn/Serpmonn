import {
  extractHostname,
  cleanWebText,
  rankAndDedupRawResults,
} from './web-text.mjs';

const WEB_RESULT_LIMIT = 15;
const WEB_CATEGORIES = new Set([
  'general',
  'images',
  'videos',
  'news',
  'map',
  'music',
  'it',
  'science',
  'files',
  'social media',
]);
const WEB_TIME_RANGES = new Set(['day', 'week', 'month', 'year']);
const WEB_SAFESEARCH = new Set([0, 1, 2]);

function normalizeWebSearchResults(category, query, data, t) {
  const raw = rankAndDedupRawResults(
    Array.isArray(data?.results) ? data.results : []
  );

  if (category === 'images') {
    return raw
      .map((item) => ({
        title: cleanWebText(item.title || t.imageFallbackTitle?.replace('{query}', query) || query),
        url: item.url || '',
        content: cleanWebText(item.content || item.summary || ''),
        thumbnail: item.thumbnail || item.img_src || '',
        imageUrl: item.img_src || item.url || '',
        engine: item.engine || '',
        hostname: extractHostname(item.url || ''),
      }))
      .filter((item) => item.imageUrl || item.url)
      .slice(0, WEB_RESULT_LIMIT);
  }

  if (category === 'videos') {
    return raw
      .map((item) => ({
        title: cleanWebText(item.title || t.videoFallbackTitle?.replace('{query}', query) || query),
        url: item.url || '',
        content: cleanWebText(item.content || item.summary || ''),
        thumbnail: item.thumbnail || item.img_src || '',
        duration: item.duration || '',
        engine: item.engine || '',
        hostname: extractHostname(item.url || ''),
      }))
      .filter((item) => item.url)
      .slice(0, WEB_RESULT_LIMIT);
  }

  return raw
    .map((item) => {
      const lat = item.latitude != null ? Number(item.latitude) : NaN;
      const lon = item.longitude != null ? Number(item.longitude) : NaN;
      return {
        title: cleanWebText(item.title || ''),
        url: item.url || '',
        content: cleanWebText(item.content || item.summary || item.address || ''),
        thumbnail: item.thumbnail || item.img_src || '',
        publishedDate: item.publishedDate || item.pubdate || '',
        engine: item.engine || '',
        hostname: extractHostname(item.url || ''),
        duration: item.duration || '',
        latitude: Number.isFinite(lat) ? lat : null,
        longitude: Number.isFinite(lon) ? lon : null,
        osm: item.osm || null,
        boundingbox: Array.isArray(item.boundingbox) ? item.boundingbox : null,
      };
    })
    .filter((item) => {
      if (item.latitude != null && item.longitude != null) return true;
      if (!item.url) return false;
      // Отсекаем пустые карточки без title/content
      return Boolean(item.title || item.content);
    })
    .slice(0, WEB_RESULT_LIMIT);
}

function localeToSearxLanguage(locale) {
  const raw = String(locale || '').trim().toLowerCase().replace(/_/g, '-');
  if (!raw || raw === 'auto') return undefined;
  // SearXNG accepts BCP47-ish tags; map our locale ids
  const map = {
    'zh-cn': 'zh-CN',
    'pt-br': 'pt-BR',
    'pt-pt': 'pt-PT',
    'es-419': 'es',
    'ku-arab': 'ku',
  };
  return map[raw] || raw;
}

function normalizeWebSearchExtras(data) {
  const answers = (Array.isArray(data?.answers) ? data.answers : [])
    .slice(0, 3)
    .map((item) => {
      if (typeof item === 'string') {
        return { answer: cleanWebText(item), url: '', engine: '' };
      }
      return {
        answer: cleanWebText(item?.answer || item?.content || ''),
        url: String(item?.url || '').trim(),
        engine: String(item?.engine || '').trim(),
      };
    })
    .filter((item) => item.answer);

  const suggestions = (Array.isArray(data?.suggestions) ? data.suggestions : [])
    .map((item) => cleanWebText(item || ''))
    .filter(Boolean)
    .slice(0, 8);

  const corrections = (Array.isArray(data?.corrections) ? data.corrections : [])
    .map((item) => cleanWebText(item || ''))
    .filter(Boolean)
    .slice(0, 3);

  const infoboxes = (Array.isArray(data?.infoboxes) ? data.infoboxes : [])
    .slice(0, 2)
    .map((item) => {
      const attributes = Array.isArray(item?.attributes)
        ? item.attributes
            .slice(0, 8)
            .map((attr) => ({
              label: cleanWebText(attr?.label || attr?.key || ''),
              value: cleanWebText(attr?.value || attr?.content || ''),
            }))
            .filter((attr) => attr.label && attr.value)
        : [];
      const urls = Array.isArray(item?.urls)
        ? item.urls
            .slice(0, 6)
            .map((u) => ({
              title: cleanWebText(u?.title || u?.url || ''),
              url: String(u?.url || '').trim(),
            }))
            .filter((u) => u.url)
        : [];
      return {
        title: cleanWebText(item?.infobox || item?.title || ''),
        content: cleanWebText(item?.content || ''),
        url: String(item?.id || item?.url || '').trim(),
        imageUrl: String(item?.img_src || item?.thumbnail || '').trim(),
        engine: String(item?.engine || '').trim(),
        attributes,
        urls,
      };
    })
    .filter((item) => item.title || item.content);

  return { answers, suggestions, corrections, infoboxes };
}

export {
  WEB_RESULT_LIMIT,
  WEB_CATEGORIES,
  WEB_TIME_RANGES,
  WEB_SAFESEARCH,
  normalizeWebSearchResults,
  localeToSearxLanguage,
  normalizeWebSearchExtras,
};
