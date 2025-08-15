import express from 'express';                                                                                                  // Импортируем Express для создания сервера
import bodyParser from 'body-parser';                                                                                           // Импортируем body-parser для парсинга JSON
import resetRoutes from './password-reset/password-resetRoutes.mjs';                                                            // Импортируем маршруты для сброса пароля

const app = express();                                                                                                          // Создаем экземпляр Express приложения
const PORT = 6500;                                                                                                              // Указываем порт для сервера

// Миддлвары
app.use(bodyParser.json());                                                                                                     // Включаем парсинг JSON в запросах

// Подключаем маршруты с префиксом /auth-api
app.use('/auth-api', resetRoutes);                                                                                              // Подключаем маршруты для сброса пароля

// Запуск сервера
app.listen(PORT, () => {                                                                                                        // Запускаем сервер на указанном порту
    console.log(`password-reset Server is running on http://localhost:${PORT}`);                                                // Логируем запуск сервера
});