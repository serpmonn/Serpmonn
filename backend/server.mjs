import dotenv from 'dotenv';
dotenv.config({ path: '/var/www/serpmonn.ru/.env' });                                     // Загружаем переменные окружения из файла .env

import cors from 'cors'                                                                   // Импорт cors
import express from 'express';                                                            // Импорт express
import cookieParser from 'cookie-parser';                                                 // Для работы с cookies
import authRoutes from './auth/authRoutes.mjs';                                           // Импорт маршрутов аутентификации
import profilesRoutes from './profiles/profilesRoutes.mjs';                               // Импорт маршрутов профилей

const app = express();                                                                    // Создаем экземпляр express

const corsOptions = {
  origin: ['https://serpmonn.ru', 'https://www.serpmonn.ru'],                             // Разрешенные источники для кросс-доменных запросов (CORS)
  credentials: true,                                                                      // Указание, что кросс-доменные запросы должны включать учетные данные (куки, заголовки авторизации и т.д.)
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],                                   // Разрешенные методы для кросс-доменных запросов
  allowedHeaders: ['Authorization', 'Content-Type', 'Accept', 'Origin']                   // Разрешенные заголовки для кросс-доменных запросов
};

app.use(cors(corsOptions));
app.use(express.json()); 								  // Для обработки JSON данных
app.use(cookieParser());  								  // Для работы cookie

app.use('/auth', authRoutes);  								  // Подключение маршрутов
app.use('/profile', profilesRoutes);

app.listen(5000, () => {                                                                  // Запуск сервера
  console.log('Сервер работает на порту 5000');
});
