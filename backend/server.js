require('dotenv').config();

const express = require('express');
const authRoutes = require('./auth/authRoutes');
const app = express();

app.use(express.json());  									// Для обработки JSON данных
app.use('/api', authRoutes);  									// Подключение маршрутов

// Запуск сервера
app.listen(5000, () => {
  console.log('Сервер работает на порту 5000');
});

