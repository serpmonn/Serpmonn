const express = require('express');
const cookieSession = require('cookie-session');
const Database = require('better-sqlite3');

const app = express();
const db = new Database('/var/www/serpmonn.ru/users/users.db');

app.use(express.json());
app.use(cookieSession({
    name: 'session',
    keys: ['key1', 'key2']
}));

// Регистрация пользователя
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    const stmt = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)");
    try {
        stmt.run(username, password);
        res.json({ status: 'success' });
    } catch (err) {
        res.status(500).json({ status: 'failure' });
    }
});

// Вход пользователя
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const stmt = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?");
    const user = stmt.get(username, password);
    if (user) {
        req.session.userId = user.id;
        res.json({ status: 'success' });
    } else {
        res.status(401).json({ status: 'failure' });
    }
});

// Проверка авторизации
app.get('/check_login', (req, res) => {
    if (req.session.userId) {
        res.json({ status: 'logged_in' });
    } else {
        res.json({ status: 'not_logged_in' });
    }
});

app.post('/buy_coins', (req, res) => {

    if (!req.session.userId) {
        console.error('User not logged in');
        return res.status(401).json({ status: 'failure', message: 'Not logged in' });
    }

    const userId = req.session.userId;
    const amount = parseInt(req.body.amount, 10); // Преобразование amount в число

    if (!amount || isNaN(amount) || amount <= 0) {
        console.error('Invalid amount:', amount);
        return res.status(400).json({ status: 'failure', message: 'Invalid amount' });
    } 

    console.log(`User ID: ${userId}, Amount: ${amount}`);

    // Получение текущей даты
    const today = new Date().toISOString().split('T')[0];

    // Проверка, сколько монет пользователь уже купил сегодня
    const stmt = db.prepare("SELECT SUM(amount) as totalBoughtToday FROM coins WHERE user_id = ? AND purchase_date = ?");
    const result = stmt.get(userId, today);

    const totalBoughtToday = parseInt(result.totalBoughtToday || 0, 10); // Преобразование totalBoughtToday в число

    console.log(`Total bought today: ${totalBoughtToday}, Amount to buy: ${amount}`);

    if (totalBoughtToday + amount > 100000) {
        console.error('Daily limit exceeded:', totalBoughtToday + amount);
        return res.status(400).json({ status: 'failure', message: 'Превышен дневной лимит на покупку монет' });
    }

    // Добавление записи о покупке монет
    const insertStmt = db.prepare("INSERT INTO coins (user_id, amount, purchase_date) VALUES (?, ?, ?)");
    insertStmt.run(userId, amount, today);

    res.json({ status: 'success', amount });
});

// Получение количества монет пользователя
app.get('/user/coins', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ status: 'failure', message: 'Not logged in' });
    const stmt = db.prepare("SELECT SUM(amount) as totalCoins FROM coins WHERE user_id = ?");
    const result = stmt.get(req.session.userId);
    res.json({ totalCoins: result.totalCoins });
});

app.listen(5000, () => {
    console.log('Server is running on port 5000');
});
