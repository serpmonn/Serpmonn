import dotenv from 'dotenv';                                                                                                         // Импортируем dotenv для работы с .env файлом
dotenv.config({ path: '/var/www/serpmonn.ru/.env' });                                                                            // Настраиваем путь к файлу .env

import express from 'express';                                                                                                         // Импортируем Express для создания сервера
import cors from 'cors';                                                                                                               // Импортируем cors для обработки CORS
import helmet from 'helmet';                                                                                                           // Импортируем helmet для защиты заголовков
import cookieParser from 'cookie-parser';                                                                                              // Импортируем cookie-parser для работы с cookies
import onnmailRoutes from './onnmail/onnmailRoutes.mjs';                                                                              // Импортируем маршруты для почтового API

const app = express();                                                                                                          // Создаем экземпляр Express приложения
app.set('trust proxy', 1);                                                                                                      // Доверяем первому прокси (Nginx)

// Middleware
app.use(helmet());                                                                                                              // Применяем helmet для защиты заголовков
app.use(cors({                                                                                                                  // Применяем CORS с заданными настройками
    origin: [                                                                                                                   // Указываем разрешенные источники
        'https://serpmonn.ru',                                                                                                  // Разрешаем домен serpmonn.ru
        'https://www.serpmonn.ru',                                                                                              // Разрешаем домен www.serpmonn.ru
        'http://localhost:6000'                                                                                                 // Разрешаем локальный домен для разработки
    ],                                                                                                                         
    credentials: true                                                                                                            // Разрешаем отправку cookies
}));                                                                                                                           
app.use(express.json());                                                                                                        // Включаем парсинг JSON в запросах
app.use(cookieParser());                                                                                                        // Включаем парсинг cookies

// Подключаем маршруты
app.use('/mail-api', onnmailRoutes);                                                                                            // Подключаем маршруты с префиксом /mail-api

// Запуск сервера
const PORT = 6000;                                                                                                              // Указываем порт для сервера
app.listen(PORT, () => {                                                                                                        // Запускаем сервер на указанном порту
    console.log(`Mail API запущен на порту ${PORT}`);                                                                           // Логируем запуск сервера
});