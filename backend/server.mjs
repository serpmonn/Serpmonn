import dotenv from 'dotenv';                                                      // Импортируем dotenv для работы с .env файлом
dotenv.config({ path: '/var/www/serpmonn.ru/.env' });                             // Настраиваем путь к файлу .env
                                                                                 
import cors from 'cors';                                                          // Импортируем cors для обработки CORS
import express from 'express';                                                    // Импортируем express для создания сервера
import cookieParser from 'cookie-parser';                                         // Импортируем cookie-parser для работы с cookie
import authRoutes from './auth/authRoutes.mjs';                                   // Импортируем маршруты аутентификации
import profilesRoutes from './profiles/profilesRoutes.mjs';                       // Импорт маршрутов профиля
import counterRoutes from './Counter/CounterRoutes.mjs';                          // Импортируем маршруты счетчика
                                                                                 
const app = express();                                                            // Создаем экземпляр Express приложения
                                                                                 
const corsOptions = {                                                             // Определяем настройки CORS
    origin: ['https://serpmonn.ru', 'https://www.serpmonn.ru'],                   // Указываем разрешенные домены
    credentials: true,                                                            // Разрешаем отправку cookie
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],                         // Указываем разрешенные HTTP методы
    allowedHeaders: ['Authorization', 'Content-Type', 'Accept', 'Origin']         // Указываем разрешенные заголовки
};                                                                               
                                                                                 
app.use(cors(corsOptions));                                                       // Применяем CORS с заданными настройками
app.use(express.json());                                                          // Включаем парсинг JSON в запросах
app.use(cookieParser());                                                          // Включаем парсинг cookie
app.use('/auth', authRoutes);                                                     // Подключаем маршруты для /auth
app.use('/profile', profilesRoutes);                                              // Подключаем маршруты для /profile
app.use('/counter', counterRoutes);                                               // Подключаем маршруты для /counter
                                                                                 
app.listen(5000, () => {                                                          // Запускаем сервер на порту 5000
    console.log('Сервер работает на порту 5000');                                 // Логируем запуск сервера
});