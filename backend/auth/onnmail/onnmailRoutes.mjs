import express from 'express';                                                                                                  // Импортируем Express для создания маршрутов
import rateLimit from 'express-rate-limit';                                                                                     // Импортируем express-rate-limit для ограничения запросов
import verifyToken from '../verifyToken.mjs';                                                                                   // Импортируем middleware для проверки токена
import { createMailbox } from './onnmailController.mjs';                                                          // Импортируем функции контроллеров

const router = express.Router();                                                                                                // Создаем экземпляр маршрутизатора Express

// Rate Limiting
const apiLimiter = rateLimit({                                                                                                  // Настраиваем ограничение скорости запросов
    windowMs: 15 * 60 * 1000,                                                                                                   // Устанавливаем окно в 15 минут
    max: 100,                                                                                                                   // Устанавливаем максимум 100 запросов
    message: 'Слишком много запросов, попробуйте позже'                                                                         // Указываем сообщение при превышении лимита
});

router.post('/create-mailbox', apiLimiter, verifyToken, createMailbox);                                                         // Определяем POST маршрут для регистрации почтового ящика

export default router;                                                                                                          // Экспортируем маршрутизатор для использования в приложении
