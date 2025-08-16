import express from 'express';
import {
    getNewsFromSource,
    getPersonalizedNews,
    getAvailableSources,
    getSourcesStats,
    checkSourceAvailability,
    getNewsByCategory
} from './enhanced-newsController.mjs';

const router = express.Router();

// Получение новостей из конкретного источника
router.get('/source/:sourceId', getNewsFromSource);

// Получение персонализированных новостей
router.get('/personalized', getPersonalizedNews);

// Получение всех доступных источников
router.get('/sources', getAvailableSources);

// Получение статистики источников
router.get('/stats', getSourcesStats);

// Проверка доступности источника
router.get('/source/:sourceId/check', checkSourceAvailability);

// Получение новостей по категории
router.get('/category/:category', getNewsByCategory);

export default router;