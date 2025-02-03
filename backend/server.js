require('dotenv').config();

import express, { json } from 'express';
import cookieParser from 'cookie-parser';
import authRoutes from './auth/authRoutes';
import profilesRoutes from './profiles/profilesRoutes';

const app = express();

app.use(json());									// Для обработки JSON данных
app.use(cookieParser());  									// Для работы cookie

app.use('/auth', authRoutes);  									// Подключение маршрутов
app.use('/profile', profilesRoutes);

// Запуск сервера
app.listen(5000, () => {
  console.log('Сервер работает на порту 5000');
});

