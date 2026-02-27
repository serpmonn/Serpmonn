import express from 'express';										                                                                                                                                                // Импортирует express для создания маршрутов
import { getUserProfile, getUserInfo, updateUserProfile } from '../profiles/profilesController.mjs';                                                                                              // Импортирует функции профиля
import verifyToken from '../auth/verifyToken.mjs';                                                                                                                                                // Импортирует middleware для проверки токена
import rateLimit from 'express-rate-limit';                                                                                                                                                       // Импортирует ограничитель запросов
                                                        
const router = express.Router();                                                                                                                                                                  // Создает экземпляр маршрутизатора

const profileLimiter = rateLimit({                                                                                                                                                                // Лимитер для запросов профиля (защита от частых запросов)
  windowMs: 1 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});
                                                                   
router.get('/get', verifyToken, profileLimiter, getUserProfile);                                                                                                                                  // Определяет GET маршрут для профиля
router.get('/info', verifyToken, profileLimiter, getUserInfo);                                                                                                                                    // Определяет GET маршрут для информации
router.post('/update', verifyToken, profileLimiter, updateUserProfile);                                                                                                                           // Определяет POST маршрут для обновления
                                                                             
export default router;