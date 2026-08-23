/**
 * Отдельный процесс агентов + gateway (не блокирует auth-server).
 * Порт: AGENTS_PORT (по умолчанию 3510).
 *
 * Маршруты: /api/agents/*, /gateway/*
 */
import dotenv from 'dotenv';
import { resolve } from 'path';
import cors from 'cors';
import express from 'express';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { doubleCsrf } from 'csrf-csrf';

import verifyToken from './auth/verifyToken.mjs';
import agentsRouter from './agents/agents.routes.mjs';
import subscriptionsRouter from './agents/subscriptions.routes.mjs';
import logsRouter from './agents/logs.routes.mjs';
import gatewayRouter from './gateway/gateway.routes.mjs';

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
const AGENTS_PORT = Number(process.env.AGENTS_PORT || 3510);

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
      'X-Buyer-Token',
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
    service: 'serpmonn-agents',
    port: AGENTS_PORT,
    pid: process.pid,
    uptimeSec: Math.floor(process.uptime()),
  });
});

app.use(cookieParser());
app.use(express.json({ limit: '1mb', strict: true }));
app.use(express.urlencoded({ extended: true, limit: '1mb', parameterLimit: 50 }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 400,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(apiLimiter);

const csrfTools = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET,
  getSessionIdentifier: (req) => `${req.ip || 'unknown-ip'}:${req.get('user-agent') || 'unknown-ua'}`,
  cookieName: '__Host-psifi.x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
});

const { doubleCsrfProtection, invalidCsrfTokenError } = csrfTools;

const AGENTS_CSRF_EXEMPT_IDS = new Set([
  'subscription-webhook',
  'event',
  'payouts',
  'marketplace',
  'my-subscriptions',
  'earnings',
]);

function needsAgentsCsrf(req) {
  const p = req.path;
  if (req.method === 'POST' && (p === '/api/agents' || p === '/api/agents/')) return true;
  if (req.method === 'POST' && p === '/api/agents/payouts') return true;
  if (req.method === 'POST' && /^\/api\/agents\/[^/]+\/(publish|subscribe)$/.test(p)) return true;
  if (req.method === 'DELETE' && /^\/api\/agents\/[^/]+$/.test(p)) {
    const id = p.slice('/api/agents/'.length);
    return !AGENTS_CSRF_EXEMPT_IDS.has(id);
  }
  return false;
}

function csrfIfRequired(req, res, next) {
  if (needsAgentsCsrf(req)) {
    return doubleCsrfProtection(req, res, next);
  }
  return next();
}

app.use(csrfIfRequired);

// Cookie-auth для /api/agents, кроме публичных
app.use('/api', (req, res, next) => {
  if (
    req.path === '/agents/marketplace' ||
    req.path === '/agents/event' ||
    req.path === '/agents/subscription-webhook' ||
    /^\/agents\/[^/]+\/log$/.test(req.path)
  ) {
    return next();
  }
  if (!req.path.startsWith('/agents')) return next();
  return verifyToken(req, res, next);
});

app.use('/api/agents', agentsRouter);
app.use('/api/agents', subscriptionsRouter);
app.use('/api/agents', logsRouter);

// Gateway: Bearer / X-Buyer-Token, без cookie CSRF
app.use(
  '/gateway',
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type', 'X-Buyer-Token'],
  })
);
app.use('/gateway', gatewayRouter);

app.use((err, req, res, next) => {
  if (err === invalidCsrfTokenError || err?.code === 'INVALID_CSRF_TOKEN') {
    return res.status(403).json({ status: 'error', message: 'Invalid CSRF token' });
  }
  console.error('[agents-server ERROR]', err?.stack || err);
  if (res.headersSent) return next(err);
  res.status(500).json({ status: 'error', message: 'Internal Server Error' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(AGENTS_PORT, '127.0.0.1', () => {
    console.log(`[agents-server] listening on 127.0.0.1:${AGENTS_PORT}`);
  });
}

export default app;
