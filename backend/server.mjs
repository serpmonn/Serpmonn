import dotenv from 'dotenv';                                                                                                     // Импортируем dotenv для работы с переменными окружения
import { resolve } from 'path';                                                                                                  // Импортируем resolve для создания абсолютных путей

const isProduction = process.env.NODE_ENV === 'production';                                                                      // Определяем режим работы: production или development
const envPath = isProduction                                                                                                     // Выбираем путь к .env файлу в зависимости от окружения
    ? '/var/www/serpmonn.ru/backend/.env'                                                                                        // Продакшен путь на сервере
    : resolve(process.cwd(), 'backend/.env');                                                                                    // Разработка - абсолютный путь к .env в папке backend

dotenv.config({ path: envPath });                                                                                                // Загружаем переменные окружения из выбранного пути

import cors from 'cors';                                                                                                         // Импортируем cors для обработки междоменных HTTP запросов
import express from 'express';                                                                                                   // Импортируем express для создания веб-сервера
import cookieParser from 'cookie-parser';                                                                                        // Импортируем cookie-parser для работы с cookies

import authRoutes from './auth/authRoutes.mjs';                                                                                  // Импортируем маршруты аутентификации и авторизации
import profilesRoutes from './profiles/profilesRoutes.mjs';                                                                      // Импортируем маршруты для работы с профилями пользователей
import counterRoutes from './Counter/CounterRoutes.mjs';                                                                         // Импортируем маршруты для работы со счетчиками и статистикой
import subscribeRouter from './subscriber/subscribeRoutes.mjs';                                                                  // Импортируем маршруты для управления подписками и рассылками
import rateLimit from 'express-rate-limit';                                                                                      // Импортируем ограничитель частоты запросов для защиты от DDoS
import csrf from 'csurf';                                                                                                        // Импортируем CSRF middleware для защиты от межсайтовых запросов
import promocodesRoutes from './promocodes/promocodesRoutes.mjs';                                                                // Импортируем маршруты для работы с промокодами и акциями
import likesRoutes from './likes/likesRoutes.mjs';                                                                               // Импортируем маршруты для системы лайков и реакций
import analyticsRoutes from './analytics/analyticsRoutes.mjs';                                                                   // Импортируем маршруты для сбора и анализа аналитики
import gameAnalyticsRoutes from './analytics/gameAnalytics.mjs';                                                                 // Импортируем маршруты для аналитики игровых событий
import improveRoutes from './improve/improve.mjs';                                                                               // Импорт маршрута для сбора предложений пользователей

const app = express();                                                                                                           // Создаем экземпляр Express приложения
app.set('trust proxy', 1);                                                                                                       // Доверяем первому прокси (например, Nginx) для корректного IP

// Порты из переменных окружения
const AUTH_PORT = process.env.AUTH_PORT;                                                                                         // Порт для auth сервера (только из .env)
const VITE_PORT = process.env.VITE_PORT;                                                                                         // Порт Vite dev сервера (из .env или 5173 по умолчанию)

const corsOptions = {                                                                                                            // Определяем настройки CORS для безопасности междоменных запросов
    origin: [                                                                                                                    // Указываем разрешенные источники (домены) для доступа к API
        'https://serpmonn.ru',                                                                                                   // Разрешаем основной домен serpmonn.ru
        'https://www.serpmonn.ru',                                                                                               // Разрешаем домен с www префиксом
        `http://localhost:${VITE_PORT}`,                                                                                         // Разрешаем локальный Vite dev сервер (порт из .env)
        `http://127.0.0.1:${VITE_PORT}`,                                                                                         // Разрешаем альтернативный адрес Vite dev сервера
        `http://localhost:${AUTH_PORT}`,                                                                                         // Разрешаем доступ с того же домена (auth сервер, порт из .env)
        `http://127.0.0.1:${AUTH_PORT}`                                                                                          // Разрешаем альтернативный адрес auth сервера
    ],                                                                                                                         
    credentials: true,                                                                                                           // Разрешаем отправку cookies через междоменные запросы
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],                                                                        // Указываем разрешенные HTTP методы для CORS запросов
    allowedHeaders: ['Authorization', 'Content-Type', 'Accept', 'Origin', 'X-CSRF-Token']                                        // Указываем разрешенные заголовки в CORS запросах
};

app.use(cors(corsOptions));                                                                                                      // Применяем CORS с заданными настройками ко всем маршрутам

app.use((req, res, next) => {                                                                                                    // Middleware: установка заголовка Content-Language по <html lang> страницы/пути
    try {
        // Простая эвристика: если путь /frontend/<lang>/..., используем <lang>
        const parts = req.path.split('/').filter(Boolean);                                                                       // Разбиваем путь на части и убираем пустые элементы
        const idx = parts.indexOf('frontend');                                                                                   // Ищем индекс 'frontend' в пути
        let lang = 'ru';                                                                                                         // Устанавливаем русский язык по умолчанию
        if (idx !== -1 && parts[idx + 1]) {                                                                                      // Если нашли 'frontend' и есть следующий элемент
            lang = parts[idx + 1].toLowerCase();                                                                                 // Используем следующий элемент как язык
        }
        // Нормализация некоторых кодов под стандарты 
        if (lang === 'pt-br') lang = 'pt-BR';                                                                                    // Нормализуем бразильский португальский
        if (lang === 'pt-pt') lang = 'pt-PT';                                                                                    // Нормализуем европейский португальский
        res.setHeader('Content-Language', lang);                                                                                 // Устанавливаем заголовок Content-Language
    } catch {}
    next();                                                                                                                      // Передаем управление следующему middleware
});

app.use(express.json({                                                                                                           // Парсинг JSON в запросах с защитой от атаки с огромными телами запросов
    limit: '10kb',                                                                                                               // Ограничиваем размер JSON тела до 10 килобайт
    strict: true                                                                                                                 // Включаем строгий режим парсинга JSON
}));  

app.use(express.urlencoded({                                                                                                     // Парсинг URL-encoded данных из форм и запросов
    extended: true,                                                                                                              // Включаем расширенный парсинг с поддержкой сложных объектов
    limit: '10kb',                                                                                                               // Ограничиваем размер данных до 10 килобайт
    parameterLimit: 10                                                                                                           // Ограничиваем количество параметров до 10
}));

app.use(cookieParser());                                                                                                         // Включаем парсинг cookies из заголовков запросов

const apiLimiter = rateLimit({                                                                                                   // Глобальный лимитер запросов (защита от DoS/брютфорса)
    windowMs: 15 * 60 * 1000,                                                                                                    // Окно времени - 15 минут в миллисекундах
    max: 300,                                                                                                                    // Максимум 300 запросов за 15 минут от одного IP
    standardHeaders: true,                                                                                                       // Возвращать стандартные заголовки лимита (RateLimit-*)
    legacyHeaders: false                                                                                                         // Не использовать устаревшие заголовки (X-RateLimit-*)
});
app.use(apiLimiter);                                                                                                             // Применяем глобальный лимитер ко всем маршрутам

const csrfProtection = csrf({                                                                                                    // CSRF защита и эндпоинт для получения CSRF-токена
    cookie: {
        httpOnly: true,                                                                                                          // Cookie недоступны через JavaScript (повышение безопасности)
        sameSite: 'lax',                                                                                                         // Защита от CSRF атак с сохранением UX для навигации
        secure: process.env.NODE_ENV === 'production'                                                                            // Secure cookie только в продакшене (HTTPS)
    },
    ignoreMethods: ['GET', 'HEAD', 'OPTIONS']                                                                                    // Игнорировать безопасные HTTP методы для CSRF проверки
});

app.get('/csrf-token', csrfProtection, (req, res) => {                                                                           // Эндпоинт для получения CSRF-токена
    res.json({ csrfToken: req.csrfToken() });                                                                                    // Возвращаем CSRF токен клиенту в JSON формате
});

app.use('/auth', authRoutes);                                                                                                    // Подключаем маршруты аутентификации с префиксом /auth
app.use('/profile', profilesRoutes);                                                                                             // Подключаем маршруты профилей с префиксом /profile
app.use('/counter', counterRoutes);                                                                                              // Подключаем маршруты счетчиков с префиксом /counter
app.use(subscribeRouter);                                                                                                        // Подключаем маршруты подписки без дополнительного префикса
app.use('/promocodes', promocodesRoutes);                                                                                        // Подключаем маршруты промокодов с префиксом /promocodes
app.use('/api/promocodes', promocodesRoutes);                                                                                    // Дублируем маршруты промокодов под /api/promocodes для фронтенда
app.use('/api/likes', likesRoutes);                                                                                              // Подключаем маршруты лайков с аутентификацией (GET без токена, POST с токеном)
app.use('/api/analytics/likes', analyticsRoutes);                                                                                // Подключаем маршруты аналитики лайков (статистика конверсии гостевых в авторизованные)
app.use('/api/analytics/game', gameAnalyticsRoutes);                                                                             // Подключаем маршруты аналитики игровых событий и статистики
app.use('/improve', improveRoutes);                                                                                              // Маршрут предложки

app.use((err, req, res, next) => {                                                                                               // Обработчик ошибок (после всех роутов и middleware)
    if (err && err.code === 'EBADCSRFTOKEN') {                                                                                   // Обработчик ошибок CSRF (невалидный токен)
        return res.status(403).json({ status: 'error', message: 'Invalid CSRF token' });                                         // Возвращаем ошибку 403 при невалидном CSRF токене
    }
    console.error('[ERROR]', err.stack);                                                                                         // Логируем полный стек ошибки для отладки
    res.status(500).json({                                                                                                       // Отправляем клиенту универсальную ошибку 500
        status: 'error',
        message: 'Internal Server Error'
    });
});

// Запуск основного auth сервера
const PORT = process.env.AUTH_PORT;                                                                                              // Берем порт только из переменной окружения .env
app.listen(PORT, () => {                                                                                                         // Запускаем сервер на порту из переменной окружения
    console.log(`Сервер работает на порту ${PORT}`);                                                                             // Логируем успешный запуск сервера с указанием порта
});