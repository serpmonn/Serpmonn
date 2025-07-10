import express from 'express';                                                                                                  // Импортируем Express для создания сервера
import cors from 'cors';                                                                                                        // Импортируем cors для обработки CORS
import dotenv from 'dotenv';                                                                                                    // Импортируем dotenv для работы с .env файлом
import newsRoutes from './newsRoutes.mjs';                                                                                      // Импортируем маршруты для новостного API

dotenv.config({ path: '/var/www/serpmonn.ru/.env' });                                                                           // Настраиваем путь к файлу .env

const app = express();                                                                                                          // Создаем экземпляр Express приложения
const port = process.env.PORT || 4000;                                                                                          // Устанавливаем порт из переменной окружения или 4000

// Middleware
app.use(cors({                                                                                                                  // Применяем CORS с заданными настройками
    origin: ['https://serpmonn.ru', 'https://www.serpmonn.ru'],                                                                 // Указываем разрешенные домены
    credentials: true                                                                                                           // Разрешаем отправку cookies
}));                                                                                                                           
app.use(express.json());                                                                                                        // Включаем парсинг JSON в запросах
app.use(express.urlencoded({ extended: true }));                                                                                // Включаем парсинг URL-encoded данных

// Подключаем маршруты
app.use('/', newsRoutes);                                                                                                       // Подключаем маршруты без префикса

// Запуск сервера
app.listen(port, () => {                                                                                                        // Запускаем сервер на указанном порту
    console.log(`Сервер запущен на http://localhost:${port}`);                                                                  // Логируем запуск сервера
});