// /var/www/serpmonn.ru/backend/ai-search/ai-image-search.mjs

import express from 'express';
import { fetchSearxViaCurl } from '../utils/fetchSearxViaCurl.js';

const router = express.Router();

const SEARXNG_URL = process.env.SEARXNG_URL || 'http://serpmonn.ru';
console.log('SEARXNG_URL at runtime:', SEARXNG_URL);

function extractHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

router.get('/ai-image-search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      // фронт ждёт всегда images: []
      return res.json({ images: [] });
    }

    console.log('IN /ai-image-search, q =', q);

    const fallbackImages = [
      {
        title: `Пример изображения по запросу "${q}"`,
        thumbnailUrl: '/frontend/images/Serpmonn-192x192.png',
        imageUrl: '/frontend/images/Serpmonn-192x192.png',
        sourceUrl: 'https://serpmonn.ru',
        sourceName: 'serpmonn.ru'
      },
      {
        title: `Ещё одно изображение по запросу "${q}"`,
        thumbnailUrl: '/frontend/images/Serpmonn-192x192.png',
        imageUrl: '/frontend/images/Serpmonn-192x192.png',
        sourceUrl: 'https://serpmonn.ru',
        sourceName: 'serpmonn.ru'
      }
    ];

    const url =
      `${SEARXNG_URL}/search` +
      `?q=${encodeURIComponent(q)}` +
      `&categories=images` +
      `&format=json`;

    let images = fallbackImages;

    try {
      console.log('SearXNG images URL (logical):', url);
      const start = Date.now();

      const data = await fetchSearxViaCurl(q, 'images');

      console.log('SearXNG images OK, ms =', Date.now() - start);

      const searxImages = (data.results || [])
        .slice(0, 24)
        .map(item => ({
          title: item.title || `Результат по запросу "${q}"`,
          thumbnailUrl: item.img_src || item.thumbnail || '',
          imageUrl: item.img_src || item.url || '',
          sourceUrl: item.url || '',
          sourceName: extractHostname(item.url || '')
        }))
        .filter(img => img.imageUrl);

      if (searxImages.length > 0) {
        images = searxImages;
      }
    } catch (e) {
      console.error('Ошибка при обращении к SearXNG (images):', e);
    }

    // Только { images }, без error/query
    res.json({ images });
  } catch (error) {
    console.error('💥 Ошибка в /ai-image-search:', error);
    // В случае ошибки тоже возвращаем images: [] без error
    res.json({ images: [] });
  }
});

export default router;