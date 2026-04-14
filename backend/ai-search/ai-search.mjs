import dotenv from 'dotenv';
import crypto from 'crypto';
import https from 'node:https';
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import paseto from 'paseto';
import { query as dbQuery } from '../database/config.mjs';

dotenv.config({ path: '/var/www/serpmonn.ru/backend/.env' });

const { V2 } = paseto;
const secretKey = process.env.SECRET_KEY;
const PRO_MONTHLY_LIMIT = 2000;

const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

const app = express();
app.use(cookieParser());
// Константы GigaChat
const GIGA_AUTH_URL = 'https://ngw.devices.sberbank.ru:9443/api/v2/oauth';
const GIGA_API_URL = 'https://gigachat.devices.sberbank.ru/api/v1/chat/completions';
const CLIENT_SECRET = process.env.GIGACHAT_CREDENTIALS;                                                                                                                                                                                       // Ваша строка авторизации
const SERPER_API_KEY = process.env.SERPER_API_KEY;
const usageStore = new Map();                                                                                                                                                                                                                 // Простое хранилище лимитов в памяти
const GUEST_DAILY_LIMIT = 5;                                                                                                                                                                                                                  // гость
const USER_DAILY_LIMIT = 15;                                                                                                                                                                                                                  // авторизованный (бесплатный)
// Переменные для хранения токена
let accessToken = null;
let tokenExpiresAt = 0;

function getMonthKey() {
  return new Date().toISOString().slice(0, 7);                                                                                                                                                                                                // Возвращает строку вида '2026-02' для текущего месяца
}

async function getUserPlan(userId) {
  const sql = 'SELECT plan, pro_until FROM users WHERE id = ? LIMIT 1';
  const rows = await dbQuery(sql, [userId]);
  if (!rows || rows.length === 0) return { plan: 'free', proUntil: null };

  const row = rows[0];
  return {
    plan: row.plan || 'free',
    proUntil: row.pro_until                                                                                                                                                                                                                    // в mysql2 это будет JS Date или строка, нам достаточно сравнения
  };
}

async function checkAndIncrementProMonthly(userId) {
  const monthKey = getMonthKey();

  // читаем текущий usage
  const selectSql =
    'SELECT requests FROM ai_usage_monthly WHERE user_id = ? AND month_key = ? LIMIT 1';
  const rows = await dbQuery(selectSql, [userId, monthKey]);

  let used = 0;
  if (!rows || rows.length === 0) {
    // создаём запись с requests = 1
    const insertSql =
      'INSERT INTO ai_usage_monthly (user_id, month_key, requests) VALUES (?, ?, 1)';
    await dbQuery(insertSql, [userId, monthKey]);
    used = 1;
  } else {
    used = rows[0].requests;
    if (used >= PRO_MONTHLY_LIMIT) {
      return { ok: false, used, limit: PRO_MONTHLY_LIMIT };
    }
    const updateSql =
      'UPDATE ai_usage_monthly SET requests = requests + 1 WHERE user_id = ? AND month_key = ?';
    await dbQuery(updateSql, [userId, monthKey]);
    used += 1;
  }

  return { ok: true, used, limit: PRO_MONTHLY_LIMIT };
}

async function attachUserIfToken(req, res, next) {
  const token = req.cookies.token;                                                                                                                                                                                                              // тот же cookie, что ставит auth-сервер
  if (!token) {
    req.user = null;
    return next();
  }

  if (!secretKey) {
    console.error('SECRET_KEY не задан в ai-search');
    req.user = null;
    return next();
  }

  try {
    const payload = await V2.verify(token, secretKey);
    // payload: { id, username, email }
    req.user = payload;
  } catch (e) {
    console.warn('Недействительный токен на ai-search:', e.message);
    req.user = null;
  }

  next();
}

function getUserIdentity(req) {                                                                                                                                                                                                                 // Определяет, гость это или авторизованный
  // 1. Обычный авторизованный пользователь с сайта serpmonn.ru
  if (req.user && req.user.id) {
    return { id: `user:${req.user.id}`, type: 'user' };                                                                                                                                                                                         // У тебя здесь уже есть авторизация -> берём id пользователя
  }

  // 2. Специальный режим для ВК-агента: считаем по VK user id
  const vkClient = req.headers['x-client'];
  const vkUserId = req.headers['x-vk-user'];

  if (vkClient === 'vk-agent' && vkUserId) {
    // гостевой тариф, но ключ — vk-user:<id>
    return { id: `vk-user:${vkUserId}`, type: 'guest' };
  }

  // 3. Остальные гости (браузер без куки) — по IP, как было
  return { id: `guest:${req.ip}`, type: 'guest' };                                                                                                                                                                                              // Иначе — гость. Для простоты считает по IP.
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function checkAndIncrementUsage(identity) {                                                                                                                                                                                                     // Проверка лимита и инкремент
  const today = getTodayKey();
  const key = `${identity.id}:${today}`;
  const entry = usageStore.get(key) || { requests: 0 };

  const limit = identity.type === 'guest'
    ? GUEST_DAILY_LIMIT
    : USER_DAILY_LIMIT;

  if (entry.requests >= limit) {
    // лимит уже исчерпан
    return { ok: false, limit, used: entry.requests };
  }

  entry.requests += 1;
  usageStore.set(key, entry);
  return { ok: true, limit, used: entry.requests };
}

// ============================================================================
// ФУНКЦИЯ ПОЛУЧЕНИЯ ТОКЕНА
// ============================================================================
async function getGigaChatToken() {
  const now = Date.now();
  if (accessToken && now < tokenExpiresAt) return accessToken;

  console.log('🔑 Получение нового токена GigaChat...');
  
  const response = await fetch(GIGA_AUTH_URL, {
    method: 'POST',
    agent: httpsAgent,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'Authorization': `Basic ${CLIENT_SECRET}`, 
      'RqUID': crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()                                                                                                                                                            // Защита от отсутствия метода
    },
    body: new URLSearchParams({ scope: 'GIGACHAT_API_PERS' })
  });

  if (!response.ok) {
    throw new Error(`Ошибка авторизации: ${response.statusText}`);
  }

  const data = await response.json();
  accessToken = data.access_token;

  // если значение похоже на секунды — умножаем
  if (data.expires_at < 10_000_000_000) {
    tokenExpiresAt = data.expires_at * 1000;
  } else {
    tokenExpiresAt = data.expires_at;
  }
  return accessToken;
}

// ============================================================================
// MIDDLEWARE (CORS & Rate Limit)
// ============================================================================
app.use(cors({
  origin: ['https://serpmonn.ru', 'https://www.serpmonn.ru', 'http://localhost:3500'],
  credentials: true
}));
app.use(express.json());

const aiSearchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  keyGenerator: (req) => req.ip
});

app.use(attachUserIfToken);

// ============================================================================
// МАРШРУТ ИИ-ПОИСКА
// ============================================================================
app.post('/ai-search', aiSearchLimiter, async (req, res) => {
  try {
    const query = (req.body.q || '').trim();
    if (!query) return res.status(400).json({ error: 'Запрос пуст' });

    const identity = getUserIdentity(req);

        if (identity.type === 'guest') {                                                                                                                                                                        // 1) ГОСТЬ: только суточный лимит 5 (как сейчас)
          const usage = checkAndIncrementUsage(identity);

          if (!usage.ok) {
            const isVkAgent = req.headers['x-client'] === 'vk-agent';

            if (isVkAgent) {
              // Чистый текст для ВК, без HTML
              return res.status(403).json({
                error:
                  'Лимит 5 запросов в день исчерпан. ' +
                  'Чтобы продолжить пользоваться Serpmonn без ограничений, войдите: https://serpmonn.ru/frontend/login/login.html ' +
                  'или зарегистрируйтесь: https://serpmonn.ru/frontend/register/register.html',
                needAuth: true,
                limit: usage.limit,
                used: usage.used
              });
            }


            return res.status(403).json({
              error:
                'Лимит 5 запросов для гостей исчерпан. ' +
                'Пожалуйста, <a href="/frontend/login/login.html">войдите</a> ' +
                'или <a href="/frontend/register/register.html">зарегистрируйтесь</a>, чтобы продолжить.',
              needAuth: true,
              limit: usage.limit,
              used: usage.used
            });
          }
        }

    if (identity.type === 'user') {                                                                                                                                                                               // 2) АВТОРИЗОВАННЫЙ: free или pro
      const userId = req.user.id;

      // читаем план
      const planInfo = await getUserPlan(userId);
      const now = new Date();
      const isProActive =
        planInfo.plan === 'pro' &&
        planInfo.proUntil &&
        new Date(planInfo.proUntil) > now;

      if (isProActive) {
        // Pro: месячный лимит 2000
        const proUsage = await checkAndIncrementProMonthly(userId);
        if (!proUsage.ok) {
          return res.status(403).json({
            error:
              'Вы исчерпали лимит 2000 запросов в месяц по тарифу Pro. ' +
              'Лимит будет обновлён в начале следующего месяца.',
            needAuth: false,
            limit: proUsage.limit,
            used: proUsage.used
          });
        }
        // суточный лимит можно не применять
      } else {

        const usage = checkAndIncrementUsage(identity);                                                                                                                                           // Free‑юзер: суточный лимит 15

        if (!usage.ok) {
          return res.status(403).json({
            error:
            'Лимит запросов на сегодня исчерпан. ' +
            'Вы можете перейти на <a href="/frontend/tariffs/tariffs.html">страницу тарифов</a>, ' +
            'и оформить тариф Pro (до 2000 запросов в месяц).',
            needAuth: false,
            limit: usage.limit,
            used: usage.used
          });
        }
      }
    }

    console.log('🚀 Начинаю поиск через Serper:', query);

    // 1. ПОИСК В GOOGLE (Через Serper)
    const searchResponse = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ q: query, gl: 'ru', hl: 'ru' })
    });

    const searchData = await searchResponse.json();
    
    // Собираем контекст из топ-4 результатов
    const webContext = searchData.organic
      ? searchData.organic.slice(0, 4).map(s => `Сайт: ${s.title}\nИнфо: ${s.snippet}`).join('\n\n')
      : "Актуальные данные не найдены.";

    console.log('DEBUG WebContext:', webContext);

    // Извлекаем чистые ссылки для фронтенда
    const sources = searchData.organic 
      ? searchData.organic.slice(0, 4).map(s => ({
          title: s.title,
          link: s.link
        }))
      : [];

    // 2. ЗАПРОС В GIGACHAT-2-MAX
    const token = await getGigaChatToken();
    const payload = {
      model: 'GigaChat-2-Max',
      messages: [
        {
          role: 'system',
          content: 'Ты — поисковый агент. Тебе ДАН ТЕКСТ из интернета. Твоя задача: вытащить из этого текста ответ на вопрос пользователя. Если в тексте есть цифры или факты — используй их.'
        },
        {
          role: 'user',
          content: `ДАННЫЕ ИЗ СЕТИ:\n${webContext}\n\nВОПРОС: ${query}`
        }
      ],
      temperature: 0
    };

    const gigaRes = await fetch(GIGA_API_URL, {
      method: 'POST',
      agent: httpsAgent,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await gigaRes.json();

    if (!gigaRes.ok || !data.choices?.length) {
      console.error('GigaChat API error:', gigaRes.status, JSON.stringify(data));
      return res.status(502).json({
        error: 'Ошибка при обращении к GigaChat. Попробуйте позже.',
        answer: 'Сервис ИИ временно недоступен.'
      });
    }

    res.json({
      answer: data.choices[0].message?.content || 'Нет текста ответа от модели.',
      usedWebSearch: true,
      model: 'GigaChat-2-Max',
      sources: sources,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Ошибка:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const PORT = process.env.AI_SEARCH_PORT || 3500;
app.listen(PORT, () => console.log(`🚀 GigaChat Search Server on port ${PORT}`));