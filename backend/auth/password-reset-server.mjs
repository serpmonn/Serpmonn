import dotenv from 'dotenv';
import { resolve } from 'path';

const isProduction = process.env.NODE_ENV === 'production';
const envPath = isProduction 
    ? '/var/www/serpmonn.ru/.env'
    : resolve(process.cwd(), 'backend/.env');

dotenv.config({ path: envPath });

import express from 'express';                                                                                                   // Импортируем Express для создания веб-сервера
import bodyParser from 'body-parser';                                                                                            // Импортируем body-parser для парсинга JSON данных
import resetRoutes from './password-reset/password-resetRoutes.mjs';                                                             // Импортируем маршруты для функционала сброса пароля

const app = express();                                                                                                           // Создаем экземпляр Express приложения
const PORT = process.env.PASSWORD_RESET_PORT;                                                                                   // Берем порт только из переменной окружения .env

// Миддлвары - промежуточное программное обеспечение
app.use(bodyParser.json());                                                                                                      // Включаем парсинг JSON данных в теле входящих запросов

// Подключаем маршруты с префиксом /auth-api
app.use('/auth-api', resetRoutes);                                                                                               // Подключаем маршруты для сброса пароля с префиксом /auth-api

// Запуск сервера для обработки запросов сброса пароля
app.listen(PORT, () => {                                                                                                         // Запускаем сервер на порту из переменной окружения
    console.log(`password-reset Server is running on http://localhost:${PORT}`);                                                 // Логируем успешный запуск сервера сброса пароля
});