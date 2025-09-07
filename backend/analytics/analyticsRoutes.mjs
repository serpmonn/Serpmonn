// API маршруты для аналитики лайков
// Предоставляет статистику конверсии гостевых лайков в авторизованные

import express from 'express';
import { 
  getGuestLikesConversionStats,
  getTopMigratedUrls,
  getMigrationStatsByDay,
  getOverallLikesStats,
  getUrlLikesStats
} from './likesAnalytics.mjs';

const router = express.Router();

// GET /api/analytics/likes/conversion - статистика конверсии
router.get('/conversion', async (req, res) => {
  try {
    const stats = await getGuestLikesConversionStats();
    if (!stats) {
      return res.status(500).json({ status: 'error', message: 'Ошибка получения статистики' });
    }
    
    res.json({ status: 'ok', data: stats });
  } catch (error) {
    console.error('Ошибка API конверсии:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// GET /api/analytics/likes/top-migrated - топ URL по миграциям
router.get('/top-migrated', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const results = await getTopMigratedUrls(limit);
    
    res.json({ status: 'ok', data: results });
  } catch (error) {
    console.error('Ошибка API топ миграций:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// GET /api/analytics/likes/migrations-by-day - миграции по дням
router.get('/migrations-by-day', async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const results = await getMigrationStatsByDay(days);
    
    res.json({ status: 'ok', data: results });
  } catch (error) {
    console.error('Ошибка API миграций по дням:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// GET /api/analytics/likes/overall - общая статистика
router.get('/overall', async (req, res) => {
  try {
    const stats = await getOverallLikesStats();
    if (!stats) {
      return res.status(500).json({ status: 'error', message: 'Ошибка получения статистики' });
    }
    
    res.json({ status: 'ok', data: stats });
  } catch (error) {
    console.error('Ошибка API общей статистики:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// GET /api/analytics/likes/url/:url - статистика для конкретного URL
router.get('/url/*', async (req, res) => {
  try {
    const url = req.params[0]; // Получаем весь путь после /url/
    const stats = await getUrlLikesStats(url);
    
    if (!stats) {
      return res.status(404).json({ status: 'error', message: 'URL не найден' });
    }
    
    res.json({ status: 'ok', data: stats });
  } catch (error) {
    console.error('Ошибка API статистики URL:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

export default router;