import dotenv from 'dotenv';
dotenv.config({ path: '/var/www/serpmonn.ru/.env' });                                     // Загружаем переменные окружения из файла .env

import express from 'express';                                                            // Импорт express
import cookieParser from 'cookie-parser';                                                 // Для работы с cookies
import authRoutes from './auth/authRoutes.mjs';                                            // Импорт маршрутов аутентификации
import profilesRoutes from './profiles/profilesRoutes.mjs';                                // Импорт маршрутов профилей

const app = express();                                                                    // Создаем экземпляр express

app.use(express.json()); 									                                                // Для обработки JSON данных
app.use(cookieParser());  									                                              // Для работы cookie

app.use('/auth', authRoutes);  									                                          // Подключение маршрутов
app.use('/profile', profilesRoutes);

app.listen(5000, () => {                                                                  // Запуск сервера
  console.log('Сервер работает на порту 5000');
});