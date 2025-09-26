import express from 'express';                                                                                                  // Импортируем Express для создания сервера
import cors from 'cors';                                                                                                        // Импортируем cors для обработки CORS
import { isProduction } from '../config/env.mjs';                                                                                // Централизованная загрузка окружения
import newsRoutes from './newsRoutes.mjs';                                                                                      // Импортируем маршруты для новостного API
import compression from 'compression';                                                                                          // Сжатие ответов
import { notFoundHandler, errorHandler } from '../middleware/errorHandler.mjs';                                                // Централизованные обработчики ошибок

const app = express();                                                                                                          // Создаем экземпляр Express приложения
const port = process.env.PORT || 4000;                                                                                          // Устанавливаем порт из переменной окружения или 4000

// Middleware
app.use(cors({                                                                                                                  // Применяем CORS с заданными настройками
    origin: ['https://serpmonn.ru', 'https://www.serpmonn.ru'],                                                                 // Указываем разрешенные домены
    credentials: true                                                                                                           // Разрешаем отправку cookies
}));                                                                                                                           
app.use(express.json());                                                                                                        // Включаем парсинг JSON в запросах
app.use(express.urlencoded({ extended: true }));                                                                                // Включаем парсинг URL-encoded данных

app.use(compression({ threshold: '1kb' }));                                                                                      // Включаем сжатие ответов

// Подключаем маршруты
app.use('/', newsRoutes);                                                                                                       // Подключаем маршруты без префикса

// 404 и общий error handler
app.use(notFoundHandler);
app.use(errorHandler);

// Запуск сервера
app.listen(port, () => {                                                                                                        // Запускаем сервер на указанном порту
    console.log(`Сервер запущен на http://localhost:${port}`);                                                                  // Логируем запуск сервера
});