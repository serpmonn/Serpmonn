import express from 'express';										                                                                                                                                                // Импортирует express для создания маршрутов
import { getUserProfile, getUserInfo, updateUserProfile } from '../profiles/profilesController.mjs';
import { avatarUploadMiddleware, uploadAvatar, removeAvatar } from '../profiles/avatarController.mjs';                                                                                              // Импортирует функции профиля
import verifyToken from '../auth/verifyToken.mjs';                                                                                                                                                // Импортирует middleware для проверки токена
import rateLimit from 'express-rate-limit';                                                                                                                                                       // Импортирует ограничитель запросов
                                                        
const router = express.Router();                                                                                                                                                                  // Создает экземпляр маршрутизатора

const profileLimiter = rateLimit({                                                                                                                                                                // Лимитер для запросов профиля (защита от частых запросов)
  windowMs: 1 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});

const avatarLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false
});
                                                                   
router.get('/get', verifyToken, profileLimiter, getUserProfile);
router.get('/info', verifyToken, profileLimiter, getUserInfo);
router.post('/update', verifyToken, profileLimiter, updateUserProfile);
router.post('/avatar', verifyToken, avatarLimiter, avatarUploadMiddleware, uploadAvatar);
router.delete('/avatar', verifyToken, avatarLimiter, removeAvatar);
                                                                             
export default router;