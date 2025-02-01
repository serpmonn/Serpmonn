require('dotenv').config();

const express = require('express');
const cookieParser = require('cookie-parser');
const authRoutes = require('./auth/authRoutes');
const profilesRoutes = require('./profiles/profilesRoutes');

const app = express();

app.use(express.json());									// Для обработки JSON данных
app.use(cookieParser());  									// Для работы cookie

app.use('/auth', authRoutes);  									// Подключение маршрутов
app.use('/profile', profilesRoutes);

// Запуск сервера
app.listen(5000, () => {
  console.log('Сервер работает на порту 5000');
});

