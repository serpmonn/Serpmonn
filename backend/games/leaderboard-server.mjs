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
const corsOptions = {
    origin: ['https://serpmonn.ru', 'https://www.serpmonn.ru'],                                         // Разрешенные домены
    optionsSuccessStatus: 200
};

// Глобальный лимитер (защита от частых запросов)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(apiLimiter);

let leaderboard = [];                                                                                   // Массив для хранения таблицы лидеров

const loadLeaderboard = async () => {                                                                   // Загружаем данные из файла при запуске сервера
    try {
      const data = await readFile(leaderboardFilePath, 'utf8');
      leaderboard = JSON.parse(data);
      console.log('Leaderboards loaded:', leaderboard);
    } catch (err) {
      console.error('Error reading leaderboard file:', err);
      leaderboard = [];                                                                                 // Если файл пустой или ошибка, инициализируем пустым массивом
    }
  };
  
  loadLeaderboard();

app.use(express.json());                                                                                // Используем встроенный express.json() для обработки JSON данных
app.use(cors(corsOptions));                                                                             // Использование CORS

const saveLeaderboards = async () => {                                                                  // Функция для сохранения данных в файл
    try {
      await writeFile(leaderboardFilePath, JSON.stringify(leaderboard, null, 2));                       // Запись с форматированием
      console.log('Leaderboards saved.');
    } catch (err) {
      console.error('Error writing leaderboard file:', err);
    }
  };

// Боле строгий лимитер для записи очков
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false
});

app.post('/add-score', writeLimiter, (req, res) => {                                                                  // Маршрут для добавления данных в таблицу лидеров
    const { nickname, score } = req.body;
    leaderboard.push({ nickname, score });
    leaderboard.sort((a, b) => b.score - a.score);
    saveLeaderboards();                                                                                 // Сохранение данных в файл
    res.sendStatus(200);
});

app.get('/leaderboard', (req, res) => {                                                                 // Маршрут для получения таблицы лидеров с пагинацией
    const { page = 1, limit = 20 } = req.query;                                                         // Параметры запроса для пагинации (по умолчанию страница 1 и 20 записей на странице)
    const offset = (page - 1) * limit;                                                                  // Рассчитываем смещение для пагинации
    const paginatedLeaderboard = leaderboard.slice(offset, offset + limit);                             // Отбираем часть массива для текущей страницы
    res.json(paginatedLeaderboard);                                                                     // Отправляем отфильтрованную таблицу лидеров
});

app.get('/proxy/bannedWords', (req, res) => {                                                           // Маршрут для получения bannedWords.json
    res.sendFile(bannedWordsFilePath);
});

app.listen(port, '0.0.0.0', () => {                                                                     // Запуск сервера
    console.log(`Server running at http://serpmonn.ru:${port}`);
});
