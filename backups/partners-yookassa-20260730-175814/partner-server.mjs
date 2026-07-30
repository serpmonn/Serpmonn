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
import partnersRoutes from './partnersRoutes.mjs';
import { partnerGoRoutes } from './partnerGoRoutes.mjs';
import { ensurePartnerTables } from './partnerModel.mjs';
import { releaseHeldConversions } from './partnerFinance.mjs';

const app = express();
app.set('trust proxy', 1);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cookieParser());
app.use(express.json({ limit: '32kb', strict: true }));
app.use(express.urlencoded({ extended: true, limit: '32kb', parameterLimit: 40 }));

app.use(cors({
  origin: [
    'https://serpmonn.ru',
    'https://www.serpmonn.ru',
    'https://dev.serpmonn.ru'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Accept']
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// JSON-only for cabinet mutations; postback/go remain open for advertisers
app.use((req, res, next) => {
  const mutating = ['POST', 'PUT', 'DELETE', 'PATCH'];
  if (!mutating.includes(req.method)) return next();
  if (req.path.startsWith('/api/partners/postback') || req.path.startsWith('/go')) {
    return next();
  }
  const ct = req.headers['content-type'] || '';
  if (!ct.includes('application/json')) {
    return res.status(415).json({ message: 'Unsupported Media Type' });
  }
  next();
});

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'serpmonn-partners',
    uptimeSec: Math.floor(process.uptime())
  });
});

app.use('/api/partners', partnersRoutes);
partnerGoRoutes(app);

app.use((err, _req, res, _next) => {
  console.error('[partner-server ERROR]', err.stack || err);
  res.status(500).json({ status: 'error', message: 'Internal Server Error' });
});

const PORT = Number(process.env.PARTNER_PORT || 5010);

if (process.env.NODE_ENV !== 'test') {
  ensurePartnerTables()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`[partner-server] на порту ${PORT}`);
      });
      setInterval(() => {
        releaseHeldConversions().catch((err) => {
          console.warn('[partner-server] release hold', err.message);
        });
      }, 15 * 60 * 1000);
    })
    .catch((err) => {
      console.error('[partner-server] tables failed', err);
      process.exit(1);
    });
}

export default app;
