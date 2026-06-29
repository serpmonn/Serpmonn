import dotenv from 'dotenv';
import { resolve } from 'path';

const isProduction = process.env.NODE_ENV === 'production';
const envPath = isProduction
  ? '/var/www/serpmonn.ru/backend/.env'
  : resolve(process.cwd(), 'backend/.env');

dotenv.config({ path: envPath });

import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';
import adminRoutes from './adminRoutes.mjs';

const app = express();
app.set('trust proxy', 1);

app.use(helmet());
app.use(cookieParser()); // codeql[js/missing-token-validation] — CSRF защищён JSON-only middleware ниже
app.use(express.json({ limit: '10kb', strict: true }));
app.use(express.urlencoded({ extended: true, limit: '10kb', parameterLimit: 10 }));

// CORS: доступ только с админ-панели
app.use(cors({
    origin: [
        'https://serpmonn.ru',
        'https://www.serpmonn.ru',
        `http://localhost:${process.env.VITE_PORT}`,
        `http://127.0.0.1:${process.env.VITE_PORT}`
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept']
}));

const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 60,
    standardHeaders: true,
    legacyHeaders: false
});
app.use(adminLimiter);

// CSRF-защита: только JSON-запросы для мутирующих методов (HTML-формы не могут подделаться)
app.use((req, res, next) => {
    const mutating = ['POST', 'PUT', 'DELETE', 'PATCH'];
    if (mutating.includes(req.method)) {
        const ct = req.headers['content-type'] || '';
        if (!ct.includes('application/json')) {
            return res.status(415).json({ message: 'Unsupported Media Type' });
        }
    }
    next();
});

app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'serpmonn-admin', uptimeSec: Math.floor(process.uptime()) });
});

app.use('/api/admin', adminRoutes);

app.use((err, req, res, next) => {
    console.error('[admin-server ERROR]', err.stack);
    res.status(500).json({ status: 'error', message: 'Internal Server Error' });
});

const PORT = process.env.ADMIN_PORT;

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`[admin-server] работает на порту ${PORT}`);
    });
}

export default app;
