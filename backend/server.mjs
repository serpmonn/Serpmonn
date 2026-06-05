import dotenv from 'dotenv';                                                                                                     // Импортируем dotenv для работы с переменными окружения
import { resolve } from 'path';                                                                                                  // Импортируем resolve для создания абсолютных путей

const nodeEnv = process.env.NODE_ENV || 'development';                                                                           // Определяем текущее окружение: production, test или development
const envPath = nodeEnv === 'production'
    ? '/var/www/serpmonn.ru/backend/.env'                                                                                        // Продакшен: используем основной .env на сервере
    : nodeEnv === 'test'
        ? resolve(process.cwd(), 'backend/.env.test')                                                                            // Тесты: используем отдельный тестовый .env.test
        : resolve(process.cwd(), 'backend/.env');                                                                                // Разработка: используем обычный backend/.env

dotenv.config({ path: envPath });                                                                                                // Загружаем переменные окружения из выбранного файла

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
    allowedHeaders: ['Authorization', 'Content-Type', 'Accept', 'Origin', 'X-CSRF-Token', 'X-Idempotency-Key']                   // Указываем разрешенные заголовки в CORS запросах
};

app.use(cors(corsOptions));                                                                                                      // Применяем CORS с заданными настройками ко всем маршрутам

let isShuttingDown = false;                                                                                                      // Флаг: идёт ли graceful shutdown

process.on('SIGTERM', () => { isShuttingDown = true; });                                                                         // При SIGTERM помечаем: сервер завершается
process.on('SIGINT',  () => { isShuttingDown = true; });                                                                         // При SIGINT (Ctrl+C) тоже

function getHealthData() {                                                                                                       // Собирает диагностические данные о процессе
    const mem = process.memoryUsage();
    const toMb = (b) => Math.round(b / 1024 / 1024 * 100) / 100;

    const smtpConfigured = Boolean(                                                                                              // Проверяем наличие обязательных SMTP-переменных
        process.env.SMTP_HOST &&
        process.env.SMTP_PORT &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASS &&
        process.env.SMTP_FROM
    );

    const ready = !isShuttingDown;                                                                                               // Готов принимать трафик, если не в shutdown

    return {
        status:         ready ? 'ok' : 'shutting_down',                                                                          // Статус: ok / shutting_down
        ready,
        service:        'serpmonn-backend',
        env:            process.env.NODE_ENV,
        pid:            process.pid,                                                                                             // ID процесса — полезно при нескольких воркерах
        uptimeSec:      Math.floor(process.uptime()),                                                                            // Uptime в секундах
        timestamp:      new Date().toISOString(),
        nodeVersion:    process.version,                                                                                         // Версия Node.js
        isShuttingDown,
        memory: {                                                                                                                // Память процесса в мегабайтах
            rssMb:       toMb(mem.rss),                                                                                          // Реальная память процесса (всё вместе)
            heapTotalMb: toMb(mem.heapTotal),                                                                                    // Выделено под кучу
            heapUsedMb:  toMb(mem.heapUsed),                                                                                     // Реально занято в куче
            externalMb:  toMb(mem.external)                                                                                      // Память нативных буферов (Buffer и т.п.)
        },
        checks: {
            smtp: { configured: smtpConfigured }                                                                                 // Позже сюда можно добавить transporter.verify()
        }
    };
}

app.get('/health/live', (_req, res) => {                                                                                         // Liveness: процесс жив и отвечает
    res.status(200).json({
        status:    'ok',
        uptimeSec: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
    });
});

app.get('/health/ready', (_req, res) => {                                                                                        // Readiness: приложение готово принимать трафик
    const data = getHealthData();
    res.status(data.ready ? 200 : 503).json(data);
});

app.get('/health', (_req, res) => {                                                                                              // Полная диагностика — для ручного curl/мониторинга
    const data = getHealthData();
    res.status(data.ready ? 200 : 503).json(data);
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

const csrfTools = doubleCsrf({
    getSecret: () => process.env.CSRF_SECRET,                                                                                    // Берём секрет из переменной окружения
    getSessionIdentifier: (req) => `${req.ip || 'unknown-ip'}:${req.get('user-agent') || 'unknown-ua'}`,                         // Формируем идентификатор сессии для CSRF из IP и User-Agent
    cookieName: '__Host-psifi.x-csrf-token',                                                                                     // Имя cookie с CSRF-токеном
    cookieOptions: {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        path: '/'
    },
    size: 64,
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS']
});

const {
    generateCsrfToken,                                                                                                           // Правильная функция генерации CSRF-токена в текущей версии csrf-csrf
    validateRequest,
    doubleCsrfProtection,
    invalidCsrfTokenError
} = csrfTools;

app.get('/csrf-token', (req, res) => {                                                                                           // Эндпоинт выдачи CSRF-токена клиенту
    return res.status(200).json({ csrfToken: generateCsrfToken(req, res) });                                                    // Генерируем и возвращаем токен правильной функцией
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