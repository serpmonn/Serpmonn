import dotenv from 'dotenv';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const isProduction = process.env.NODE_ENV === 'production';
const envPath = isProduction
  ? '/var/www/serpmonn.ru/backend/.env'
  : resolve(process.cwd(), 'backend/.env');

dotenv.config({ path: envPath });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const LEADERBOARD_PORT = process.env.LEADERBOARD_PORT;
const VITE_PORT = process.env.VITE_PORT;

import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import {
  ensureLeaderboardTables,
  addLeaderboardScore,
  getLeaderboardPage,
  normalizeGameId,
} from './leaderboard.model.mjs';

const app = express();
const port = process.env.LEADERBOARD_PORT;
const bannedWordsFilePath = join(__dirname, 'bannedWords.json');

app.set('trust proxy', 1);

const corsOptions = {
  origin: [
    'https://serpmonn.ru',
    'https://www.serpmonn.ru',
    `http://localhost:${VITE_PORT}`,
    `http://127.0.0.1:${VITE_PORT}`,
    `http://localhost:${LEADERBOARD_PORT}`,
    `http://127.0.0.1:${LEADERBOARD_PORT}`,
  ],
  optionsSuccessStatus: 200,
};

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    req.headers['x-forwarded-for'] ||
    req.ip ||
    (req.connection && req.connection.remoteAddress) ||
    'unknown',
});
app.use(apiLimiter);

app.use(express.json());
app.use(cors(corsOptions));

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) =>
    req.headers['x-forwarded-for'] ||
    req.ip ||
    (req.connection && req.connection.remoteAddress) ||
    'unknown',
});

app.post('/add-score', writeLimiter, async (req, res) => {
  try {
    const { nickname, score, gameId } = req.body || {};
    await addLeaderboardScore({ nickname, score, gameId });
    res.sendStatus(200);
  } catch (err) {
    console.error('Error adding score:', err?.message || err);
    res.sendStatus(500);
  }
});

app.get('/leaderboard', async (req, res) => {
  try {
    const page = req.query.page;
    const limit = req.query.limit;
    const gameId = normalizeGameId(req.query.gameId);
    const rows = await getLeaderboardPage({ gameId, page, limit });
    res.json(rows);
  } catch (err) {
    console.error('Error reading leaderboard:', err?.message || err);
    res.status(500).json([]);
  }
});

app.get('/proxy/bannedWords', (req, res) => {
  res.sendFile(bannedWordsFilePath);
});

ensureLeaderboardTables()
  .then(() => {
    app.listen(port, '127.0.0.1', () => {
      console.log(`Leaderboard server running at http://127.0.0.1:${port} (MySQL)`);
    });
  })
  .catch((err) => {
    console.error('Failed to init leaderboard tables:', err);
    process.exit(1);
  });
