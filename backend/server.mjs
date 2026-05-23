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
import rateLimit from 'express-rate-limit';                                                                                      // Импортируем ограничитель частоты запросов для защиты от DDoS
import helmet from 'helmet';                                                                                                     // Импортируем Helmet для установки защитных HTTP-заголовков
import { doubleCsrf } from 'csrf-csrf';                                                                                          // Импортируем CSRF middleware для защиты от межсайтовых запросов
import { connectRoutes } from './routes/routes.mjs';                                                                             // Импортируем функцию централизованного подключения маршрутов

const app = express();                                                                                                           // Создаем экземпляр Express приложения
app.set('trust proxy', 1);                                                                                                       // Доверяем первому прокси (например, Nginx) для корректного IP

app.use(helmet());                                                                                                               // Подключаем стандартный набор защитных HTTP-заголовков для Express

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

app.get('/health', (req, res) => {                                                                                               // Эндпоинт проверки состояния приложения для мониторинга и оркестрации
    res.status(200).json({
        status: 'ok',                                                                                                            // Базовый статус приложения
        uptime: process.uptime(),                                                                                                // Время работы процесса в секундах с момента запуска
        timestamp: new Date().toISOString()                                                                                      // Текущее серверное время в ISO-формате
    });
});

app.use((req, res, next) => {                                                                                                    // Middleware: установка заголовка Content-Language по <html lang> страницы/пути
    try {
        const parts = req.path.split('/').filter(Boolean);                                                                       // Разбиваем путь на части и убираем пустые элементы
        const idx = parts.indexOf('frontend');                                                                                   // Ищем индекс 'frontend' в пути
        let lang = 'ru';                                                                                                         // Устанавливаем русский язык по умолчанию

        if (idx !== -1 && parts[idx + 1]) {                                                                                      // Если нашли 'frontend' и есть следующий элемент
            lang = parts[idx + 1].toLowerCase();                                                                                 // Используем следующий элемент как язык
        }

        if (lang === 'pt-br') lang = 'pt-BR';                                                                                    // Нормализуем бразильский португальский
        if (lang === 'pt-pt') lang = 'pt-PT';                                                                                    // Нормализуем европейский португальский

        res.setHeader('Content-Language', lang);                                                                                 // Устанавливаем заголовок Content-Language
    } catch {}                                                                                                                   // Игнорируем ошибки разбора пути, чтобы не ломать основной запрос

    next();                                                                                                                      // Передаем управление следующему middleware
});

app.use(cookieParser());                                                                                                         // Включаем парсинг cookies из заголовков запросов

app.use('/voice/stt', express.raw({                                                                                              // Middleware для парсинга бинарных аудиоданных (ДО express.json!)
    type: ['audio/webm', 'audio/ogg', 'audio/wav', 'audio/mpeg', 'audio/webm;codecs=opus'],                                      // Разрешаем поддерживаемые аудио MIME-типы
    limit: '10mb'                                                                                                                // Ограничиваем размер аудиофайла до 10 мегабайт
}));

app.use(express.json({                                                                                                           // Парсинг JSON в запросах с защитой от атаки с огромными телами запросов
    limit: '10kb',                                                                                                               // Ограничиваем размер JSON тела до 10 килобайт
    strict: true                                                                                                                 // Включаем строгий режим парсинга JSON
}));

app.use(express.urlencoded({                                                                                                     // Парсинг URL-encoded данных из форм и запросов
    extended: true,                                                                                                              // Включаем расширенный парсинг с поддержкой сложных объектов
    limit: '10kb',                                                                                                               // Ограничиваем размер данных до 10 килобайт
    parameterLimit: 10                                                                                                           // Ограничиваем количество параметров до 10
}));

const apiLimiter = rateLimit({                                                                                                   // Глобальный лимитер запросов (защита от DoS/брютфорса)
    windowMs: 15 * 60 * 1000,                                                                                                    // Окно времени - 15 минут в миллисекундах
    max: 300,                                                                                                                    // Максимум 300 запросов за 15 минут от одного IP
    standardHeaders: true,                                                                                                       // Возвращать стандартные заголовки лимита (RateLimit-*)
    legacyHeaders: false                                                                                                         // Не использовать устаревшие заголовки (X-RateLimit-*)
});
app.use(apiLimiter);                                                                                                             // Применяем глобальный лимитер ко всем маршрутам

const authLimiter = rateLimit({                                                                                                  // Отдельный лимитер для маршрутов авторизации
    windowMs: 15 * 60 * 1000,                                                                                                    // Окно ограничения — 15 минут
    max: 10,                                                                                                                     // Максимум 10 запросов на авторизационные маршруты за окно
    standardHeaders: true,                                                                                                       // Возвращаем стандартные заголовки лимита (RateLimit-*)
    legacyHeaders: false,                                                                                                        // Не используем устаревшие заголовки (X-RateLimit-*)
    message: {
        status: 'error',
        message: 'Too many authentication attempts'
    }                                                                                                                            // Сообщение при превышении лимита попыток
});

const {
    generateToken,
    doubleCsrfProtection,
    invalidCsrfTokenError
} = doubleCsrf({                                                                                                                 // Инициализируем CSRF-защиту через библиотеку csrf-csrf
    getSecret: () => process.env.CSRF_SECRET,                                                                                    // Берем секрет для подписи CSRF токенов из переменных окружения
    cookieName: '__Host-psifi.x-csrf-token',                                                                                     // Имя cookie, в которой хранится CSRF токен
    cookieOptions: {
        httpOnly: true,                                                                                                          // Запрещаем доступ к cookie из JavaScript
        sameSite: 'lax',                                                                                                         // Ограничиваем межсайтовую отправку cookie для защиты от CSRF
        secure: process.env.NODE_ENV === 'production',                                                                           // Отправляем cookie только по HTTPS в продакшене
        path: '/'                                                                                                                // Делаем cookie доступной для всего сайта
    },
    size: 64,                                                                                                                    // Устанавливаем длину генерируемого токена
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],                                                                                  // Исключаем безопасные HTTP методы из проверки CSRF
    getTokenFromRequest: (req) => req.headers['x-csrf-token']                                                                    // Берем CSRF токен из заголовка x-csrf-token
});

app.get('/csrf-token', (req, res) => {                                                                                           // Эндпоинт для выдачи CSRF токена клиенту
    res.json({ csrfToken: generateToken(req, res) });                                                                            // Генерируем и возвращаем новый CSRF токен в JSON
});

connectRoutes(app, authLimiter);                                                                                                 // Централизованно подключаем все маршруты приложения

// ВРЕМЕННО: CSRF middleware стоит внизу
// После поэтапного тестирования будем поднимать выше или вешать точечно на нужные роуты.
app.use(doubleCsrfProtection);                                                                                                   // Временно подключаем глобальную CSRF-защиту внизу, чтобы не затронуть уже объявленные выше маршруты

app.use((err, req, res, next) => {                                                                                               // Обработчик ошибок (после всех роутов и middleware)
    if (err === invalidCsrfTokenError || err?.code === 'INVALID_CSRF_TOKEN') {                                                  // Отдельно обрабатываем ошибки невалидного CSRF токена
        return res.status(403).json({ status: 'error', message: 'Invalid CSRF token' });                                        // Возвращаем ошибку 403 при невалидном CSRF токене
    }

    console.error('[ERROR]', err.stack);                                                                                         // Логируем полный стек ошибки для отладки
    res.status(500).json({                                                                                                       // Отправляем клиенту универсальную ошибку 500
        status: 'error',
        message: 'Internal Server Error'
    });
});

// Запуск основного auth сервера
const PORT = process.env.AUTH_PORT;                                                                                              // Получаем порт основного сервера из переменной окружения

if (process.env.NODE_ENV !== 'test') {                                                                                           // Не запускаем сервер автоматически в тестовой среде
    app.listen(PORT, () => {                                                                                                     // Запускаем сервер на указанном порту
        console.log(`Сервер работает на порту ${PORT}`);                                                                         // Логируем успешный запуск сервера
    });
}

export default app;                                                                                                              // Экспортируем Express-приложение для тестов и повторного использования