import dotenv from 'dotenv';                                                                                                     // Импортируем dotenv для работы с переменными окружения
import { resolve } from 'path';                                                                                                  // Импортируем resolve для создания абсолютных путей

const isProduction = process.env.NODE_ENV === 'production';                                                                      // Определяем режим работы: production или development
const envPath = isProduction                                                                                                     // Выбираем путь к .env файлу в зависимости от окружения
    ? '/var/www/serpmonn.ru/.env'                                                                                                // Продакшен путь на сервере
    : resolve(process.cwd(), 'backend/.env');                                                                                    // Разработка - абсолютный путь к .env в папке backend

dotenv.config({ path: envPath });                                                                                                // Загружаем переменные окружения из выбранного пути

import express from 'express';                                                                                                   // Импортируем Express для создания веб-сервера
import cors from 'cors';                                                                                                         // Импортируем cors для обработки междоменных HTTP запросов
import newsRoutes from './newsRoutes.mjs';                                                                                       // Импортируем маршруты для новостного API

const app = express();                                                                                                           // Создаем экземпляр Express приложения
const port = process.env.NEWS_PORT;                                                                                              // Берем порт только из переменной окружения .env

// Получаем порты из переменных окружения
const VITE_PORT = process.env.VITE_PORT;                                                                                        // Порт Vite dev сервера (из .env или 5173 по умолчанию)
const NEWS_PORT = process.env.NEWS_PORT;                                                                                        // Порт news сервера (только из .env)

// Middleware - промежуточное программное обеспечение
app.use(cors({                                                                                                                   // Применяем CORS с заданными настройками безопасности
    origin: [                                                                                                                    // Указываем разрешенные домены для доступа к API
        'https://serpmonn.ru',                                                                                                   // Разрешаем основной домен serpmonn.ru
        'https://www.serpmonn.ru',                                                                                               // Разрешаем домен с www префиксом
        `http://localhost:${VITE_PORT}`,                                                                                         // Разрешаем локальный Vite dev сервер (порт из .env)
        `http://127.0.0.1:${VITE_PORT}`,                                                                                         // Разрешаем альтернативный адрес Vite dev сервера
        `http://localhost:${NEWS_PORT}`,                                                                                         // Разрешаем доступ с того же домена (news сервер, порт из .env)
        `http://127.0.0.1:${NEWS_PORT}`                                                                                          // Разрешаем альтернативный адрес news сервера
    ],                                                                                                                         
    credentials: true                                                                                                            // Разрешаем отправку cookies через междоменные запросы
}));                                                                                                                           
app.use(express.json());                                                                                                         // Включаем парсинг JSON данных в теле входящих запросов
app.use(express.urlencoded({ extended: true }));                                                                                 // Включаем парсинг URL-encoded данных с расширенным синтаксисом

// Подключаем маршруты новостного API
app.use('/', newsRoutes);                                                                                                        // Подключаем маршруты без дополнительного префикса URL

// Запуск сервера новостного API
app.listen(port, () => {                                                                                                         // Запускаем сервер на порту из переменной окружения
    console.log(`Сервер запущен на http://localhost:${port}`);                                                                   // Логируем успешный запуск новостного сервера
});