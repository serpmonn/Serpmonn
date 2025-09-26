import express from 'express';                                                                                                  // Импортируем Express для создания сервера
import helmet from 'helmet';                                                                                                  // Импортируем helmet для безопасности заголовков
import compression from 'compression';                                                                                         // Импортируем compression для сжатия ответов
import resetRoutes from './password-reset/password-resetRoutes.mjs';                                                            // Импортируем маршруты для сброса пароля

const app = express();                                                                                                          // Создаем экземпляр Express приложения
const PORT = 6500;                                                                                                              // Указываем порт для сервера

// Миддлвары
app.use(helmet());                                                                                                              // Защита заголовков
app.use(compression({ threshold: '1kb' }));                                                                                       // Сжатие ответов
app.use(express.json({ limit: '32kb' }));                                                                                         // Включаем парсинг JSON в запросах

// Подключаем маршруты с префиксом /auth-api
app.use('/auth-api', resetRoutes);                                                                                              // Подключаем маршруты для сброса пароля

// Общий обработчик ошибок
app.use((err, req, res, next) => {
  console.error('password-reset error:', err);
  res.status(500).json({ status: 'error', message: 'Internal Server Error' });
});

// Запуск сервера
app.listen(PORT, () => {                                                                                                        // Запускаем сервер на указанном порту
    console.log(`password-reset Server is running on http://localhost:${PORT}`);                                                // Логируем запуск сервера
});