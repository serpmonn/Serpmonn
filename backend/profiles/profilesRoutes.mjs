import express from 'express';                                                                            // Импортируем express для создания маршрутов
import { getUserProfile, getUserInfo, updateUserProfile } from '../profiles/profilesController.mjs';      // Импортируем функции профиля
import verifyToken from '../auth/verifyToken.mjs';                                                        // Импортируем middleware для проверки токена
                                                                             
const router = express.Router();                                                                          // Создаем экземпляр маршрутизатора
                                                                             
router.get('/get', verifyToken, getUserProfile);                                                          // Определяем GET маршрут для профиля
router.get('/info', verifyToken, getUserInfo);                                                            // Определяем GET маршрут для информации
router.post('/update', verifyToken, updateUserProfile);                                                   // Определяем POST маршрут для обновления
                                                                             
export default router;