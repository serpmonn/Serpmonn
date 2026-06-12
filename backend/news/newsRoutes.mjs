import express from 'express';
import {
  getNews,
  getTopics,
  getPrefs,
  savePrefs,
  trackClick,
  triggerGenerate,
} from './newsController.mjs';

const router = express.Router();

// Получить ленту новостей (персонализированную)
// GET /news?topic=tech&limit=20
router.get('/news', getNews);

// Получить список всех тем
// GET /news/topics
router.get('/news/topics', getTopics);

// Получить предпочтения пользователя
// GET /news/prefs
router.get('/news/prefs', getPrefs);

// Сохранить выбранные темы
// POST /news/prefs { topics: ['tech', 'ai', 'world'] }
router.post('/news/prefs', savePrefs);

// Трекинг клика по новости (пассивная персонализация)
// POST /news/click { topicKey: 'tech' }
router.post('/news/click', trackClick);

// Ручной запуск генерации (только 127.0.0.1)
// POST /news/generate
router.post('/news/generate', triggerGenerate);

export default router;
