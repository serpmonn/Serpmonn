import dotenv from 'dotenv';
dotenv.config({ path: '/var/www/serpmonn.ru/.env' });

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import fetch from 'node-fetch';

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
    origin: [
        'https://serpmonn.ru',
        'https://www.serpmonn.ru',
        'http://localhost:6000'
    ],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Rate Limiting
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Слишком много запросов, попробуйте позже'
});

// Маршрут регистрации
app.post('/api/register', apiLimiter, async (req, res) => {
    try {
        const { username, emailLocalPart, password } = req.body;

        // Валидация
        if (!username || !emailLocalPart || !password) {
            return res.status(400).json({ 
                message: 'Все поля обязательны для заполнения' 
            });
        }

        // Создание почтового ящика в Mailcow
        const mailboxData = {
            active: "1",
            domain: "onnmail.ru",
            local_part: emailLocalPart,
            name: username,
            password: password,
            password2: password,
            quota: "1024"
        };

        const mailcowResponse = await fetch('https://mail.serpmonn.ru/api/v1/add/mailbox', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': process.env.MAILCOW_API_KEY
            },
            body: JSON.stringify(mailboxData)
        });

        if (!mailcowResponse.ok) {
            const error = await mailcowResponse.json();
            throw new Error(error.msg || 'Ошибка при создании почтового ящика');
        }

        res.status(201).json({ success: true });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Запуск сервера
const PORT = 6000;
app.listen(PORT, () => {
    console.log(`Mail API запущен на порту ${PORT}`);
});