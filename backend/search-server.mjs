/**
 * Отдельный процесс AI/web-поиска (не блокирует auth-server).
 * Порт: AI_SEARCH_PORT (по умолчанию 3500).
 *
 * Маршруты: /ai-search, /web-search, /web-autocomplete, /ai-search/feedback,
 *           /web-search/reverse-image, /voice/*
 */
import dotenv from 'dotenv';
import { resolve } from 'path';
import cors from 'cors';
import express from 'express';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';

import aiSearchRouter from './ai-search/ai-search.mjs';
import voiceRoutes from './voice/voiceRoutes.mjs';

const nodeEnv = process.env.NODE_ENV || 'development';
const envPath =
  nodeEnv === 'production'
    ? '/var/www/serpmonn.ru/backend/.env'
    : resolve(process.cwd(), 'backend/.env');

dotenv.config({ path: envPath });

const app = express();
app.set('trust proxy', 1);
app.use(helmet());

const AUTH_PORT = process.env.AUTH_PORT || 5000;
const VITE_PORT = process.env.VITE_PORT || 5173;
const SEARCH_PORT = Number(process.env.AI_SEARCH_PORT || 3500);

app.use(
  cors({
    origin: [
      'https://serpmonn.ru',
      'https://www.serpmonn.ru',
      'https://dev.serpmonn.ru',
      `http://localhost:${VITE_PORT}`,
      `http://127.0.0.1:${VITE_PORT}`,
      `http://localhost:${AUTH_PORT}`,
      `http://127.0.0.1:${AUTH_PORT}`,
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'Accept',
      'Origin',
      'X-CSRF-Token',
      'X-Idempotency-Key',
      'X-Anon-Id',
      'X-Client',
      'X-Vk-User',
    ],
  })
);

let isShuttingDown = false;
process.on('SIGTERM', () => {
  isShuttingDown = true;
});
process.on('SIGINT', () => {
  isShuttingDown = true;
});

app.get('/health', (req, res) => {
  res.status(isShuttingDown ? 503 : 200).json({
    status: isShuttingDown ? 'shutting_down' : 'ok',
    service: 'serpmonn-search',
    port: SEARCH_PORT,
    pid: process.pid,
    uptimeSec: Math.floor(process.uptime()),
  });
});

app.use(cookieParser());

// STT: бинарное тело до express.json
app.use(
  '/voice/stt',
  express.raw({
    type: ['audio/webm', 'audio/ogg', 'audio/wav', 'audio/mpeg', 'audio/webm;codecs=opus'],
    limit: '10mb',
  })
);

// AI attachmentText до ~32k символов + запас
app.use(
  express.json({
    limit: '1mb',
    strict: true,
  })
);
app.use(
  express.urlencoded({
    extended: true,
    limit: '1mb',
    parameterLimit: 50,
  })
);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 400,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(apiLimiter);

app.use('/voice', voiceRoutes);
app.use('/', aiSearchRouter);

app.use((err, req, res, next) => {
  console.error('[search-server ERROR]', err?.stack || err);
  if (res.headersSent) return next(err);
  res.status(500).json({ status: 'error', message: 'Internal Server Error' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(SEARCH_PORT, '127.0.0.1', () => {
    console.log(`[search-server] listening on 127.0.0.1:${SEARCH_PORT}`);
  });
}

export default app;
