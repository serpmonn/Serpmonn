import express from 'express';
import {
  getNews,
  getTopics,
  refreshLocale,
} from './newsController.mjs';

const router = express.Router();

// GET /news?locale=ru&topic=tech&limit=20
router.get('/news', getNews);

// GET /news/topics?locale=ru
router.get('/news/topics', getTopics);

// POST /news/refresh?locale=ru  (только с localhost)
router.post('/news/refresh', refreshLocale);

export default router;
