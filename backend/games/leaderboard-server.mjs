import dotenv from 'dotenv';
import { resolve, dirname, join } from 'path';                                                                                   // Импортируем методы для работы с путями
import { fileURLToPath } from 'url';                                                                                             // Импортируем утилиты для работы с ES модулями

const isProduction = process.env.NODE_ENV === 'production';                                                                      // Определяем режим работы: production или development
const envPath = isProduction                                                                                                     // Выбираем путь к .env файлу в зависимости от окружения
    ? '/var/www/serpmonn.ru/.env'                                                                                                // Продакшен путь на сервере
    : resolve(process.cwd(), 'backend/.env');                                                                                    // Разработка - абсолютный путь к .env в папке backend

dotenv.config({ path: envPath });                                                                                                // Загружаем переменные окружения из выбранного пути

const __filename = fileURLToPath(import.meta.url);                                                                               // Получаем абсолютный путь к текущему файлу
const __dirname = dirname(__filename);                                                                                           // Получаем директорию текущего файла

// Получаем порты из переменных окружения
const LEADERBOARD_PORT = process.env.LEADERBOARD_PORT;                                                                           // Порт для leaderboard сервера (только из .env)
const VITE_PORT = process.env.VITE_PORT;                                                                                         // Порт Vite dev сервера (из .env или 5173 по умолчанию)

import express from 'express';                                                                                                   // Импортируем Express для создания веб-сервера
import cors from 'cors';                                                                                                         // Импортируем CORS для обработки междоменных HTTP запросов
import { readFile, writeFile } from 'fs/promises';                                                                               // Используем промисы для асинхронной работы с файловой системой
import rateLimit from 'express-rate-limit';                                                                                      // Импортируем ограничитель частоты запросов

const app = express();                                                                                                           // Создаем экземпляр Express приложения
const port = process.env.LEADERBOARD_PORT;                                                                                       // Берем порт только из переменной окружения .env
const leaderboardFilePath = join(__dirname, 'leaderboards.json');                                                                // Определяем путь к файлу с данными таблицы лидеров
const bannedWordsFilePath = join(__dirname, 'bannedWords.json');                                                                 // Определяем путь к файлу с запрещенными словами

// Настройка доверия к прокси (nginx) для корректного определения IP адресов
app.set('trust proxy', 1);

const corsOptions = {                                                                                                             // Определяем настройки CORS
    origin: [                                                                                                                    // Указываем разрешенные домены для доступа к API
        'https://serpmonn.ru',                                                                                                   // Разрешаем основной домен serpmonn.ru
        'https://www.serpmonn.ru',                                                                                               // Разрешаем домен с www префиксом
        `http://localhost:${VITE_PORT}`,                                                                                         // Разрешаем локальный Vite dev сервер (порт из .env)
        `http://127.0.0.1:${VITE_PORT}`,                                                                                         // Разрешаем альтернативный адрес Vite dev сервера
        `http://localhost:${LEADERBOARD_PORT}`,                                                                                  // Разрешаем доступ с того же домена (leaderboard сервер)
        `http://127.0.0.1:${LEADERBOARD_PORT}`                                                                                   // Разрешаем альтернативный адрес leaderboard сервера
    ],
    optionsSuccessStatus: 200                                                                                                    // Статус успеха для предварительных запросов
};

// Глобальный лимитер запросов (защита от частых запросов и DDoS атак)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,                                                                                                    // Окно времени - 15 минут в миллисекундах
    max: 600,                                                                                                                    // Максимум 600 запросов за 15 минут
    standardHeaders: true,                                                                                                       // Использовать стандартные заголовки лимита
    legacyHeaders: false,                                                                                                        // Не использовать устаревшие заголовки
    keyGenerator: (req) => req.headers['x-forwarded-for'] || req.ip || (req.connection && req.connection.remoteAddress) || 'unknown' // Генератор ключа для идентификации клиента
});
app.use(apiLimiter);                                                                                                             // Применяем глобальный лимитер ко всем маршрутам

// In-memory хранилище таблиц лидеров: { [gameId: string]: Array<{nickname:string, score:number}> }
let leaderboards = {};

// Загрузка данных с диска с обратной совместимостью (массив -> { global: array })
async function loadLeaderboards() {
    try {
        const data = await readFile(leaderboardFilePath, 'utf8');                                                                 // Читаем файл с таблицами лидеров
        const parsed = JSON.parse(data);                                                                                          // Парсим JSON данные
        if (Array.isArray(parsed)) {                                                                                              // Проверяем обратную совместимость с массивом
            leaderboards = { global: parsed };                                                                                    // Конвертируем старый формат в новый
        } else if (parsed && typeof parsed === 'object') {
            leaderboards = parsed;                                                                                                // Используем новый формат объекта
        } else {
            leaderboards = {};                                                                                                    // Инициализируем пустым объектом при ошибке
        }
        console.log('Leaderboards loaded');                                                                                       // Логируем успешную загрузку
    } catch (err) {
        console.error('Error reading leaderboard file:', err?.message || err);                                                    // Логируем ошибку чтения файла
        leaderboards = {};                                                                                                        // Инициализируем пустым объектом при ошибке
    }
}

loadLeaderboards();                                                                                                               // Вызываем загрузку данных при запуске сервера

app.use(express.json());                                                                                                          // Используем встроенный express.json() для обработки JSON данных
app.use(cors(corsOptions));                                                                                                       // Применяем CORS с заданными настройками

// Функция для сохранения данных таблиц лидеров в файл
async function saveLeaderboards() {
    try {
        await writeFile(leaderboardFilePath, JSON.stringify(leaderboards, null, 2));                                              // Запись данных в файл с форматированием
        console.log('Leaderboards saved.');                                                                                       // Логируем успешное сохранение
    } catch (err) {
        console.error('Error writing leaderboard file:', err?.message || err);                                                    // Логируем ошибку записи файла
    }
}

// Функция для нормализации идентификатора игры
function normalizeGameId(raw) {
    const base = String(raw || 'global').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 32);                                   // Нормализуем и очищаем ID игры
    return base || 'global';                                                                                                      // Возвращаем 'global' если ID пустой
}

// Более строгий лимитер для записи очков (защита от спама)
const writeLimiter = rateLimit({
    windowMs: 60 * 1000,                                                                                                          // Окно времени - 1 минута
    max: 60,                                                                                                                      // Максимум 60 записей в минуту
    standardHeaders: true,                                                                                                        // Использовать стандартные заголовки лимита
    legacyHeaders: false,                                                                                                         // Не использовать устаревшие заголовки
    keyGenerator: (req) => req.headers['x-forwarded-for'] || req.ip || (req.connection && req.connection.remoteAddress) || 'unknown' // Генератор ключа для идентификации клиента
});

// Маршрут для добавления очков в таблицу лидеров конкретной игры
app.post('/add-score', writeLimiter, (req, res) => {
    const { nickname, score, gameId } = req.body || {};                                                                           // Извлекаем данные из тела запроса
    const safeNickname = String(nickname || '').trim().slice(0, 40) || `Player#${(Math.random()*1e6|0).toString(36)}`;            // Безопасно обрабатываем никнейм
    const safeScore = Number.isFinite(Number(score)) ? Math.max(0, Math.floor(Number(score))) : 0;                                // Безопасно обрабатываем очки
    const gid = normalizeGameId(gameId);                                                                                          // Нормализуем ID игры

    if (!leaderboards[gid]) leaderboards[gid] = [];                                                                               // Инициализируем массив если игры нет
    leaderboards[gid].push({ nickname: safeNickname, score: safeScore });                                                         // Добавляем новую запись
    leaderboards[gid].sort((a, b) => b.score - a.score);                                                                          // Сортируем по убыванию очков
    leaderboards[gid] = leaderboards[gid].slice(0, 5000);                                                                         // Ограничиваем размер для предотвращения роста файла

    saveLeaderboards();                                                                                                            // Сохраняем данные в файл
    res.sendStatus(200);                                                                                                           // Отправляем статус успеха
});

// Маршрут для получения таблицы лидеров конкретной игры с пагинацией
app.get('/leaderboard', (req, res) => {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);                                                                  // Извлекаем номер страницы из query параметров
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));                                                // Извлекаем лимит записей из query параметров
    const gid = normalizeGameId(req.query.gameId);                                                                                // Нормализуем ID игры

    const arr = leaderboards[gid] || [];                                                                                          // Получаем массив лидеров для игры
    const offset = (page - 1) * limit;                                                                                            // Вычисляем смещение для пагинации
    const paginatedLeaderboard = arr.slice(offset, offset + limit);                                                               // Получаем пагинированные данные
    res.json(paginatedLeaderboard);                                                                                               // Отправляем отфильтрованную таблицу лидеров в JSON
});

// Предоставляем bannedWords.json как статический файл через прокси
app.get('/proxy/bannedWords', (req, res) => {
    res.sendFile(bannedWordsFilePath);                                                                                            // Отправляем файл с запрещенными словами
});

// Запуск сервера таблиц лидеров
app.listen(port, '127.0.0.1', () => {                                                                                            // Запускаем сервер на localhost и порту из .env
    console.log(`Leaderboard server running at http://127.0.0.1:${port}`);                                                        // Логируем успешный запуск сервера
});