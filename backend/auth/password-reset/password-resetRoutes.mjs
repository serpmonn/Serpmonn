import express from 'express';                                                                                                   // Импортируем Express для создания маршрутов
import { forgotPassword, resetPassword } from './resetController.mjs';                                                           // Импортируем функции контроллеров для сброса пароля

const router = express.Router();                                                                                                 // Создаем экземпляр маршрутизатора Express

router.post('/forgot', forgotPassword);                                                                                          // Определяем POST маршрут для запроса сброса пароля
router.post('/reset', resetPassword);                                                                                            // Определяем POST маршрут для выполнения сброса пароля

export default router;                                                                                                           // Экспортируем маршрутизатор для использования в приложении