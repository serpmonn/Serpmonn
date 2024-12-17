const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors'); // Добавлено для CORS
const fs = require('fs'); // Добавлено для работы с файловой системой
const path = require('path'); // Импортируем модуль path
const app = express();
const port = process.env.PORT || 3000;
const leaderboardFilePath = path.join(__dirname, 'leaderboards.json');
const bannedWordsFilePath = path.join(__dirname, 'bannedWords.json'); // Добавлено для пути к bannedWords.json
const corsOptions = {
    origin: ['https://serpmonn.ru', 'https://www.serpmonn.ru'], // Укажите оба домена
    optionsSuccessStatus: 200
};

// Массив для хранения таблицы лидеров
let leaderboard = [];

// Загрузка данных из файла при запуске сервера
fs.readFile(leaderboardFilePath, 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading leaderboard file:', err);
    } else {
        leaderboard = JSON.parse(data);
        console.log('Leaderboards loaded:', leaderboard);
    }
});

// Использование body-parser для обработки JSON данных
app.use(bodyParser.json());
app.use(cors()); // Добавлено для CORS

// Функция для сохранения данных в файл
function saveLeaderboards() {
    fs.writeFile(leaderboardFilePath, JSON.stringify(leaderboard), (err) => {
        if (err) {
            console.error('Error writing leaderboard file:', err);
        } else {
            console.log('Leaderboards saved.');
        }
    });
}

// Маршрут для добавления данных в таблицу лидеров
app.post('/add-score', cors(corsOptions), (req, res) => {
    const { nickname, score } = req.body;
    leaderboard.push({ nickname, score });
    leaderboard.sort((a, b) => b.score - a.score);
    saveLeaderboards(); // Сохранение данных в файл
    res.sendStatus(200);
});

// Маршрут для получения данных таблицы лидеров
app.get('/leaderboard', cors(corsOptions), (req, res) => {
    res.json(leaderboard);
});

// Маршрут для получения bannedWords.json
app.get('/proxy/bannedWords', (req, res) => {
    res.sendFile(bannedWordsFilePath);
});

// Запуск сервера
app.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://serpmonn.ru:${port}`);
});
