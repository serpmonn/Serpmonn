import dotenv from 'dotenv';
  // Импортируем dotenv для работы с .env файлом

dotenv.config({ path: '/var/www/serpmonn.ru/.env' });
  // Настраиваем путь к файлу .env



import cors from 'cors';
  // Импортируем cors для обработки CORS

import express from 'express';
  // Импортируем express для создания сервера

import cookieParser from 'cookie-parser';
  // Импортируем cookie-parser для работы с cookie

import authRoutes from './auth/authRoutes.mjs';
  // Импортируем маршруты аутентификации

import profilesRoutes from './profiles/profilesRoutes.mjs';
  // Импорт маршрутов профиля

import counterRoutes from './Counter/CounterRoutes.mjs';
  // Импортируем маршруты счетчика

import subscribeRouter from './subscriber/subscribeRoutes.mjs';
  // Импортирует маршруты подписки рассылки

import rateLimit from 'express-rate-limit';
  // Импортируем ограничитель запросов

import csrf from 'csurf';
  // Импортируем CSRF middleware

import promocodesRoutes from './promocodes/promocodesRoutes.mjs';
  // Импорт маршрутов промокодов
import likesRoutes from './likes/likesRoutes.mjs';
  // Импорт маршрутов лайков


const app = express();
  // Создаем экземпляр Express приложения

app.set('trust proxy', 1);
  // Доверяем первому прокси (например, Nginx)



const corsOptions = {
  // Определяем настройки CORS

    origin: ['https://serpmonn.ru', 'https://www.serpmonn.ru'],
  // Указываем разрешенные домены

    credentials: true,
  // Разрешаем отправку cookie

    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  // Указываем разрешенные HTTP методы

    allowedHeaders: ['Authorization', 'Content-Type', 'Accept', 'Origin', 'X-CSRF-Token']         // Указываем разрешенные заголовки

};





app.use(cors(corsOptions));
  // Применяем CORS с заданными настройками

app.use(express.json({
  // Парсинг JSON в запросах с защитой от атаки с огромными телами запросов

    limit: '10kb',
    strict: true 
  }));  
app.use(express.urlencoded({ 
    extended: true, 
    limit: '10kb',
    parameterLimit: 10
  }));


app.use(cookieParser());
  // Включаем парсинг cookie


// Глобальный лимитер запросов (защита от DoS/брютфорса)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(apiLimiter);

// CSRF защита и эндпоинт для получения CSRF-токена
const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  },
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS']
});

// Эндпоинт для получения CSRF-токена
app.get('/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

app.use('/auth', authRoutes);
  // Подключаем маршруты для /auth

app.use('/profile', profilesRoutes);
  // Подключаем маршруты для /profile

app.use('/counter', counterRoutes);
  // Подключаем маршруты для /counter

app.use(subscribeRouter);

app.use('/promocodes', promocodesRoutes);
  // Подключаем маршруты для /promocodes

app.use('/api/promocodes', promocodesRoutes);
  // Дублируем маршруты под /api/promocodes для фронтенда

// Лайки API (минимально, без CSRF для GET; POST защищён глобальным лимитером)
app.use('/api/likes', likesRoutes);

app.use((err, req, res, next) => {
  // Обработчик ошибок (после всех роутов)

    // Обработчик ошибок CSRF
    if (err && err.code === 'EBADCSRFTOKEN') {
      return res.status(403).json({ status: 'error', message: 'Invalid CSRF token' });

    }
    console.error('[ERROR]', err.stack);
    res.status(500).json({ 
      status: 'error',
      message: 'Internal Server Error'
    });
  });



app.listen(5000, () => {
  // Запускаем сервер на порту 5000

    console.log('Сервер работает на порту 5000');
  // Логируем запуск сервера

});