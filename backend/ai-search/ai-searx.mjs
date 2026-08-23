import { fetchSearxViaCurl } from '../utils/fetchSearxViaCurl.js';
import {
  extractHostname,
  cleanWebText,
  rankAndDedupRawResults,
} from './web-text.mjs';

const SEARXNG_URL = process.env.SEARXNG_URL || 'http://serpmonn.ru';

async function webSearchWithSearxng(query, t, safesearch = 2) {
  try {
    const data = await fetchSearxViaCurl(query, 'general', { safesearch });

    const results = rankAndDedupRawResults(data.results || [])
      .map((item) => ({
        title: cleanWebText(item.title || ''),
        content: cleanWebText(item.content || item.summary || ''),
        url: item.url || '',
      }))
      .filter((r) => r.url && (r.title || r.content))
      .slice(0, 6);

    const webContext = results.length
      ? results
        .map((r) => `${t.searchContextSource}: ${r.title}\n${t.searchContextSnippet}: ${r.content}`)
        .join('\n\n')
      : t.searchNoData;

    const sources = results.map((r) => ({
      title: r.title,
      link: r.url,
    }));

    return { webContext, sources };
  } catch (e) {
    console.error('Ошибка при обращении к SearXNG (general):', e.message);
    return {
      webContext: t.searchNoData,
      sources: [],
    };
  }
}

async function imageSearchWithSearxng(query, t, safesearch = 2) {
  try {
    const data = await fetchSearxViaCurl(query, 'images', { safesearch });

    const images = rankAndDedupRawResults(data.results || [])
      .map((item) => ({
        title: cleanWebText(
          item.title || t.imageFallbackTitle.replace('{query}', query)
        ),
        thumbnailUrl: item.img_src || item.thumbnail || '',
        imageUrl: item.img_src || item.url || '',
        sourceUrl: item.url || '',
        sourceName: extractHostname(item.url || ''),
      }))
      .filter((img) => img.imageUrl)
      .slice(0, 6);

    return images;
  } catch (e) {
    console.error('Ошибка при обращении к SearXNG (images):', e.message);
    return [];
  }
}

async function videoSearchWithSearxng(query, t, safesearch = 2) {
  try {
    const data = await fetchSearxViaCurl(query, 'videos', { safesearch });

    const videos = rankAndDedupRawResults(data.results || [])
      .map((item) => ({
        title: cleanWebText(
          item.title || t.videoFallbackTitle.replace('{query}', query)
        ),
        thumbnailUrl: item.thumbnail || item.img_src || '',
        videoUrl: item.url || '',
        sourceUrl: item.url || '',
        sourceName: extractHostname(item.url || ''),
        duration: item.duration || '',
      }))
      .filter((v) => v.videoUrl)
      .slice(0, 6);

    return videos;
  } catch (e) {
    console.error('Ошибка при обращении к SearXNG (videos):', e.message);
    return [];
  }
}

export {
  SEARXNG_URL,
  webSearchWithSearxng,
  imageSearchWithSearxng,
  videoSearchWithSearxng,
};
