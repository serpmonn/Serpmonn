import express from 'express';
import cors from 'cors';                                                                                // Для CORS
import { readFile, writeFile } from 'fs/promises';                                                      // Используем промисы для файловой системы
import { join, dirname } from 'path';                                                                   // Модуль path для работы с путями
import { fileURLToPath } from 'url';                                                                    // Для получения __dirname в ESM
import rateLimit from 'express-rate-limit';                                                            // Лимитер запросов

const __filename = fileURLToPath(import.meta.url);                                                      // Получаем __dirname для ESM
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;
const leaderboardFilePath = join(__dirname, 'leaderboards.json');
const bannedWordsFilePath = join(__dirname, 'bannedWords.json');                                        // Путь к bannedWords.json

// Настройка доверия к прокси (nginx)
app.set('trust proxy', 1);

const corsOptions = {
    origin: ['https://serpmonn.ru', 'https://www.serpmonn.ru'],                                         // Разрешенные домены
    optionsSuccessStatus: 200
};

// Глобальный лимитер (защита от частых запросов)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.headers['x-forwarded-for'] || req.ip || (req.connection && req.connection.remoteAddress) || 'unknown'
});
app.use(apiLimiter);

// In-memory leaderboards storage: { [gameId: string]: Array<{nickname:string, score:number}> }
let leaderboards = {};

// Load from disk with backward compatibility (array -> { global: array })
async function loadLeaderboards() {
  try {
    const data = await readFile(leaderboardFilePath, 'utf8');
    const parsed = JSON.parse(data);
    if (Array.isArray(parsed)) {
      leaderboards = { global: parsed };
    } else if (parsed && typeof parsed === 'object') {
      leaderboards = parsed;
    } else {
      leaderboards = {};
    }
    console.log('Leaderboards loaded');
  } catch (err) {
    console.error('Error reading leaderboard file:', err?.message || err);
    leaderboards = {};
  }
}

loadLeaderboards();

app.use(express.json());                                                                                // Используем встроенный express.json() для обработки JSON данных
app.use(cors(corsOptions));                                                                             // Использование CORS

async function saveLeaderboards() {                                                                  // Функция для сохранения данных в файл
    try {
      await writeFile(leaderboardFilePath, JSON.stringify(leaderboards, null, 2));                       // Запись с форматированием
      console.log('Leaderboards saved.');
    } catch (err) {
      console.error('Error writing leaderboard file:', err?.message || err);
    }
  };

function normalizeGameId(raw) {
  const base = String(raw || 'global').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 32);
  return base || 'global';
}

// Боле строгий лимитер для записи очков
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.headers['x-forwarded-for'] || req.ip || (req.connection && req.connection.remoteAddress) || 'unknown'
});

// Add score to a specific game's leaderboard
app.post('/add-score', writeLimiter, (req, res) => {                                                                  // Маршрут для добавления данных в таблицу лидеров
    const { nickname, score, gameId } = req.body || {};
    const safeNickname = String(nickname || '').trim().slice(0, 40) || `Player#${(Math.random()*1e6|0).toString(36)}`;
    const safeScore = Number.isFinite(Number(score)) ? Math.max(0, Math.floor(Number(score))) : 0;
    const gid = normalizeGameId(gameId);

    if (!leaderboards[gid]) leaderboards[gid] = [];
    leaderboards[gid].push({ nickname: safeNickname, score: safeScore });
    leaderboards[gid].sort((a, b) => b.score - a.score);
    // keep top N to prevent unbounded file growth (optional)
    leaderboards[gid] = leaderboards[gid].slice(0, 5000);

    saveLeaderboards();                                                                                 // Сохранение данных в файл
    res.sendStatus(200);
});

// Get leaderboard for a specific gameId with pagination
app.get('/leaderboard', (req, res) => {                                                                 // Маршрут для получения таблицы лидеров с пагинацией
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const gid = normalizeGameId(req.query.gameId);

    const arr = leaderboards[gid] || [];
    const offset = (page - 1) * limit;
    const paginatedLeaderboard = arr.slice(offset, offset + limit);
    res.json(paginatedLeaderboard);                                                                     // Отправляем отфильтрованную таблицу лидеров
});

// Expose banned words JSON as a static file
app.get('/proxy/bannedWords', (req, res) => {                                                           // Маршрут для получения bannedWords.json
    res.sendFile(bannedWordsFilePath);
});

app.listen(port, '0.0.0.0', () => {                                                                     // Запуск сервера
    console.log(`Server running at http://serpmonn.ru:${port}`);
});
