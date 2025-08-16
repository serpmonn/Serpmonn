import dotenv from 'dotenv';                                                                                                         // Импортируем dotenv для работы с .env файлом
dotenv.config({ path: '/var/www/serpmonn.ru/.env' });                                                                            // Настраиваем путь к файлу .env

import express from 'express';                                                                                                         // Импортируем Express для создания сервера
import cors from 'cors';                                                                                                               // Импортируем cors для обработки CORS
import helmet from 'helmet';                                                                                                           // Импортируем helmet для защиты заголовков
import cookieParser from 'cookie-parser';                                                                                              // Импортируем cookie-parser для работы с cookies
import onnmailRoutes from './onnmail/onnmailRoutes.mjs';                                                                              // Импортируем маршруты для почтового API

import rateLimit from 'express-rate-limit';
                                                      // Ограничитель запросов

import csrf from 'csurf';
                                                      // CSRF защита

const app = express();                                                                                                          // Создаем экземпляр Express приложения
app.set('trust proxy', 1);                                                                                                      // Доверяем первому прокси (Nginx)

// Middleware
app.use(helmet());                                                                                                              // Применяем helmet для защиты заголовков
app.use(cors({                                                                                                                  // Применяем CORS с заданными настройками
    origin: [                                                                                                                   // Указываем разрешенные источники
        'https://serpmonn.ru',                                                                                                  // Разрешаем домен serpmonn.ru
        'https://www.serpmonn.ru',                                                                                              // Разрешаем домен www.serpmonn.ru
        'http://localhost:6000',                                                                                                // Разрешаем локальный домен для разработки
        'http://localhost:5000'                                                                                                 // Разрешаем локальный домен для auth-сервера
    ],                                                                                                                         
    credentials: true                                                                                                            // Разрешаем отправку cookies
}));                                                                                                                           
app.use(express.json());                                                                                                        // Включаем парсинг JSON в запросах
app.use(cookieParser());                                                                                                        // Включаем парсинг cookies

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(apiLimiter);

// CSRF protection
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  },
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS']
});

// Token endpoint
app.get('/mail-api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Подключаем маршруты
app.use('/mail-api', onnmailRoutes);                                                                                            // Подключаем маршруты с префиксом /mail-api

// Error handler for CSRF
app.use((err, req, res, next) => {
  if (err && err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ status: 'error', message: 'Invalid CSRF token' });
  }
  return next(err);
});

// Запуск сервера
const PORT = 6000;                                                                                                              // Указываем порт для сервера
app.listen(PORT, () => {                                                                                                        // Запускаем сервер на указанном порту
    console.log(`Mail API запущен на порту ${PORT}`);                                                                           // Логируем запуск сервера
});