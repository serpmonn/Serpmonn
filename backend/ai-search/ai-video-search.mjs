// /var/www/serpmonn.ru/backend/ai-search/ai-video-search.mjs

import express from 'express';
import { fetchSearxViaCurl } from '../utils/fetchSearxViaCurl.js';

const router = express.Router();

const SEARXNG_URL = process.env.SEARXNG_URL || 'http://serpmonn.ru';

function extractHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

router.get('/ai-video-search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      return res.json({ videos: [] });
    }

    console.log('IN /ai-video-search, q =', q);

    const fallbackVideos = [
      {
        title: `Пример видео по запросу "${q}"`,
        thumbnailUrl: '/frontend/images/Serpmonn-192x192.png',
        videoUrl: '/frontend/images/Serpmonn-192x192.png',
        sourceUrl: 'https://serpmonn.ru',
        sourceName: 'serpmonn.ru',
        duration: ''
      },
      {
        title: `Ещё одно видео по запросу "${q}"`,
        thumbnailUrl: '/frontend/images/Serpmonn-192x192.png',
        videoUrl: '/frontend/images/Serpmonn-192x192.png',
        sourceUrl: 'https://serpmonn.ru',
        sourceName: 'serpmonn.ru',
        duration: ''
      }
    ];

    const url =
      `${SEARXNG_URL}/search` +
      `?q=${encodeURIComponent(q)}` +
      `&categories=videos` +
      `&format=json`;

    let videos = fallbackVideos;

    try {
      console.log('SearXNG videos URL (logical):', url);
      const start = Date.now();

      const data = await fetchSearxViaCurl(q, 'videos');

      console.log('SearXNG videos OK, ms =', Date.now() - start);

      const searxVideos = (data.results || [])
        .slice(0, 18)
        .map(item => ({
          title: item.title || `Видео по запросу "${q}"`,
          thumbnailUrl: item.thumbnail || item.img_src || '',
          videoUrl: item.url || '',
          sourceUrl: item.url || '',
          sourceName: extractHostname(item.url || ''),
          duration: item.duration || ''
        }))
        .filter(v => v.videoUrl);

      if (searxVideos.length > 0) {
        videos = searxVideos;
      }
    } catch (e) {
      console.error('Ошибка при обращении к SearXNG (videos):', e);
    }

    res.json({ videos });
  } catch (error) {
    console.error('💥 Ошибка в /ai-video-search:', error);
    res.json({ videos: [] });
  }
});

export default router;