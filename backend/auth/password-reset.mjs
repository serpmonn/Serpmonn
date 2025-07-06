import express from 'express';
import bodyParser from 'body-parser';
import authRoutes from '../routes/auth.mjs';  // импорт роутов

const app = express();
const PORT = 6500;

// Миддлвары
app.use(bodyParser.json());

// Подключаем маршруты с префиксом /auth-api
app.use('/auth-api', authRoutes);

// Запуск сервера
app.listen(PORT, () => {
    console.log(`password-reset Server is running on http://localhost:${PORT}`);
});