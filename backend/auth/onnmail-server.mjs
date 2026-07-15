import dotenv from 'dotenv';                                                                                                     // Импортируем dotenv для работы с переменными окружения
import { resolve } from 'path';                                                                                                  // Импортируем resolve для создания абсолютных путей

const isProduction = process.env.NODE_ENV === 'production';                                                                      // Определяем режим работы: production или development
const envPath = isProduction                                                                                                     // Выбираем путь к .env файлу в зависимости от окружения
    ? '/var/www/serpmonn.ru/backend/.env'                                                                                        // Продакшен путь на сервере
    : resolve(process.cwd(), 'backend/.env');                                                                                    // Разработка - абсолютный путь к .env в папке backend

dotenv.config({ path: envPath });                                                                                                // Загружаем переменные окружения из выбранного пути

import express from 'express';                                                                                                   // Импортируем Express для создания веб-сервера
import cors from 'cors';                                                                                                         // Импортируем cors для обработки междоменных HTTP запросов
import helmet from 'helmet';                                                                                                     // Импортируем helmet для автоматической защиты HTTP заголовков
import cookieParser from 'cookie-parser';                                                                                        // Импортируем cookie-parser для работы с cookies
import { doubleCsrf } from 'csrf-csrf';
import onnmailRoutes from './onnmail/onnmailRoutes.mjs';                                                                         // Импортируем маршруты для почтового API и рассылок

import rateLimit from 'express-rate-limit';                                                                                      // Импортируем ограничитель частоты запросов для защиты от спама

const app = express();                                                                                                           // Создаем экземпляр Express приложения
app.set('trust proxy', 1);                                                                                                       // Доверяем первому прокси (например, Nginx) для корректного IP

// Получаем порты из переменных окружения
const ONNMAIL_PORT = process.env.ONNMAIL_PORT;                                                                                   // Порт для почтового сервера (только из .env)
const AUTH_PORT = process.env.AUTH_PORT;                                                                                         // Порт для auth сервера (только из .env)
const VITE_PORT = process.env.VITE_PORT;                                                                                         // Порт Vite dev сервера (из .env или 5173 по умолчанию)

// Middleware - промежуточное программное обеспечение
app.use(helmet());                                                                                                               // Применяем helmet для автоматической защиты HTTP заголовков безопасности
app.use(cors({                                                                                                                   // Применяем CORS с заданными настройками безопасности
    origin: [                                                                                                                    // Указываем разрешенные источники (домены) для доступа к API
        'https://serpmonn.ru',                                                                                                   // Разрешаем основной домен serpmonn.ru
        'https://www.serpmonn.ru',                                                                                               // Разрешаем домен с www префиксом
        `http://localhost:${VITE_PORT}`,                                                                                         // Разрешаем локальный Vite dev сервер (порт из .env)
        `http://127.0.0.1:${VITE_PORT}`,                                                                                         // Разрешаем альтернативный адрес Vite dev сервера
        `http://localhost:${ONNMAIL_PORT}`,                                                                                      // Разрешаем локальный домен для разработки (почтовый сервер)
        `http://localhost:${AUTH_PORT}`                                                                                          // Разрешаем локальный домен для auth-сервера
    ],
    credentials: true,                                                                                                           // Разрешаем отправку cookies через междоменные запросы
    allowedHeaders: ['Authorization', 'Content-Type', 'Accept', 'Origin', 'X-CSRF-Token']
}));
app.use(express.json());                                                                                                         // Включаем парсинг JSON данных в теле входящих запросов
app.use(cookieParser());                                                                                                         // Включаем парсинг cookies из заголовков запросов

// Rate limiting - ограничение частоты запросов для защиты от спама и DDoS атак
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,                                                                                                    // Окно времени - 15 минут в миллисекундах
    max: 300,                                                                                                                    // Максимум 300 запросов за 15 минут от одного IP адреса
    standardHeaders: true,                                                                                                       // Использовать стандартные заголовки лимита (RateLimit-*)
    legacyHeaders: false                                                                                                         // Не использовать устаревшие заголовки (X-RateLimit-*)
});
app.use(apiLimiter);                                                                                                             // Применяем ограничитель ко всем маршрутам почтового API

const {
    generateCsrfToken,
    doubleCsrfProtection,
    invalidCsrfTokenError
} = doubleCsrf({
    getSecret: () => process.env.CSRF_SECRET,
    getSessionIdentifier: (req) => `${req.ip || 'unknown-ip'}:${req.get('user-agent') || 'unknown-ua'}`,
    cookieName: '__Host-psifi.x-csrf-token',
    cookieOptions: {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        path: '/'
    },
    size: 64,
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS']
});

app.get('/csrf-token', (req, res) => {
    return res.status(200).json({ csrfToken: generateCsrfToken(req, res) });
});

// CSRF на create-mailbox (cookie-сессия). Токен берём с того же хоста (/csrf-token).
app.use('/mail-api', (req, res, next) => {
    if (req.method === 'POST' && req.path === '/create-mailbox') {
        return doubleCsrfProtection(req, res, next);
    }
    return next();
});

// Подключаем маршруты почтового API
app.use('/mail-api', onnmailRoutes);                                                                                             // Подключаем маршруты с префиксом /mail-api для изоляции API

// Обработчик ошибок CSRF для почтового API
app.use((err, req, res, next) => {
    if (err === invalidCsrfTokenError || err?.code === 'INVALID_CSRF_TOKEN' || err?.code === 'EBADCSRFTOKEN') {
        return res.status(403).json({ status: 'error', message: 'Invalid CSRF token' });
    }
    return next(err);
});

// Запуск сервера почтового API
app.listen(ONNMAIL_PORT, () => {                                                                                                 // Запускаем сервер на порту из переменной окружения
    console.log(`Mail API запущен на порту ${ONNMAIL_PORT}`);                                                                    // Логируем успешный запуск почтового сервера с указанием порта
});
