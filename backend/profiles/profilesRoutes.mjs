import express from 'express';
                          // Импортируем express для создания маршрутов

import { getUserProfile, getUserInfo, updateUserProfile } from '../profiles/profilesController.mjs';      // Импортируем функции профиля

import verifyToken from '../auth/verifyToken.mjs';
                          // Импортируем middleware для проверки токена

import rateLimit from 'express-rate-limit';
                          // Импортируем ограничитель запросов

                                                                             
const router = express.Router();
                          // Создаем экземпляр маршрутизатора

// Лимитер для запросов профиля (защита от частых запросов)
const profileLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});

                                                                             
router.get('/get', verifyToken, profileLimiter, getUserProfile);
                          // Определяем GET маршрут для профиля

router.get('/info', verifyToken, profileLimiter, getUserInfo);
                          // Определяем GET маршрут для информации

router.post('/update', verifyToken, profileLimiter, updateUserProfile);
                          // Определяем POST маршрут для обновления

                                                                             
export default router;