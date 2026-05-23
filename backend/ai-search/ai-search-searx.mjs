// ai-search-searx.mjs

import dotenv from 'dotenv';
import crypto from 'crypto';
import https from 'node:https';
import express from 'express';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import paseto from 'paseto';

import { query as dbQuery } from '../database/config.mjs';
import { fetchSearxViaCurl } from '../utils/fetchSearxViaCurl.js';

dotenv.config({ path: '/var/www/serpmonn.ru/backend/.env' });

const { V2 } = paseto;
const secretKey = process.env.SECRET_KEY;
const PRO_MONTHLY_LIMIT = 2000;
const idempotencyStore = new Map();
const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000; // 5 минут

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

const aiSearchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  keyGenerator: (req) => req.ip,
});

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================================

function nowMSK() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const msk = new Date(utc + 3 * 60 * 60 * 1000);
  return msk.toISOString().replace('T', ' ').slice(0, 19) + ' MSK';
}

function getMonthKey() {
  return new Date().toISOString().slice(0, 7);
}

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

// ============================================================================
// ОЛЛАМА: ЛОКАЛЬНЫЕ LLM‑ПРОВАЙДЕРЫ
// ============================================================================

const OLLAMA_URL = 'http://127.0.0.1:11434/api/chat';
const OLLAMA_MAIN_MODEL = 'serpmonn-ai-fast:latest';   // Gemma‑2 2.6B Q4_0 — теперь основная
const OLLAMA_FAST_MODEL = 'serpmonn-ai-search:latest'; // Phi‑3 3.8B Q4_0 — теперь backup, в дальнейшем для улучшения ИИ-ответов в реальном времени

async function callOllama(model, query, webContext) {
  const body = {
    model,
    messages: [
      {
        role: 'system',
        content:
        'Ты — поисковый агент Serpmonn. Тебе ДАН ТЕКСТ из интернета (результаты поиска). ' +
        'Твоя задача: вытащить из этого текста ответ на вопрос пользователя. ' +
        'Отвечай ТОЛЬКО на языке на котором написан вопрос пользователя.. ' +
        'Отвечай в 1–2 коротких предложениях. ' +
        'Давай только факты, без вступлений. ' +
        'Если в данных нет ответа — напиши: "Нет информации в найденных данных".',
      },
      {
        role: 'user',
        content: `ДАННЫЕ ИЗ СЕТИ:\n${webContext}\n\nВОПРОС: ${query}`,
      },
    ],
    stream: false,
    options: {
      temperature: 0,
      num_predict: 98, // ограничиваем длину ответа
      top_k: 40,
      top_p: 0.9,
    },
  };

  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const raw = await res.text();

  if (!res.ok) {
    console.error(`[Ollama] HTTP error ${res.status}:`, raw);
    throw new Error(`Ollama HTTP ${res.status}`);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error('[Ollama] JSON parse error:', e.message, 'raw:', raw.slice(0, 500));
    throw new Error('Ollama JSON parse error');
  }

  const answer =
    data.message?.content ||
    data.choices?.[0]?.message?.content ||
    '';

  if (!answer) {
    console.error('[Ollama] Empty content in response:', data);
    throw new Error('Ollama empty content');
  }

  return answer;
}

// сначала основная модель, затем backup
async function getAiAnswerFromLocalModels(query, webContext) {
  try {
    const answer = await callOllama(OLLAMA_MAIN_MODEL, query, webContext);
    return { answer, model: OLLAMA_MAIN_MODEL, usedBackup: false };
  } catch (e) {
    console.error('[AI] Ошибка основной модели (serpmonn-ai-search):', e.message);
  }

  try {
    const answer = await callOllama(OLLAMA_FAST_MODEL, query, webContext);
    return { answer, model: OLLAMA_FAST_MODEL, usedBackup: true };
  } catch (e) {
    console.error('[AI] Ошибка backup‑модели (serpmonn-ai-fast):', e.message);
  }

  throw new Error('Обе локальные модели Ollama недоступны');
}

// ============================================================================
// АВТОРИЗАЦИЯ & ПОЛЬЗОВАТЕЛЬ
// ============================================================================

async function attachUserIfToken(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    req.user = null;
    return next();
  }

  if (!secretKey) {
    console.error('SECRET_KEY не задан в ai-search-searx');
    req.user = null;
    return next();
  }

  try {
    const payload = await V2.verify(token, secretKey);
    req.user = payload;
  } catch (e) {
    console.warn('Недействительный токен на ai-search-searx:', e.message);
    req.user = null;
  }

  next();
}

function getUserIdentity(req) {
  if (req.user && req.user.id) {
    return { id: `user:${req.user.id}`, type: 'user' };
  }

  const vkClient = req.headers['x-client'];
  const vkUserId = req.headers['x-vk-user'];

  if (vkClient === 'vk-agent' && vkUserId) {
    return { id: `vk-user:${vkUserId}`, type: 'guest' };
  }

  return { id: `guest:${req.ip}`, type: 'guest' };
}

// ============================================================================
// ЛИМИТЫ (память + БД)
// ============================================================================

const usageStore = new Map();
const GUEST_DAILY_LIMIT = 5;
const USER_DAILY_LIMIT = 15;

function checkAndIncrementUsage(identity) {
  const today = getTodayKey();
  const key = `${identity.id}:${today}`;
  const entry = usageStore.get(key) || { requests: 0 };

  const limit =
    identity.type === 'guest' ? GUEST_DAILY_LIMIT : USER_DAILY_LIMIT;

  if (entry.requests >= limit) {
    return { ok: false, limit, used: entry.requests };
  }

  entry.requests += 1;
  usageStore.set(key, entry);
  return { ok: true, limit, used: entry.requests };
}

async function getUserPlan(userId) {
  const sql = 'SELECT plan, pro_until FROM users WHERE id = ? LIMIT 1';
  const rows = await dbQuery(sql, [userId]);
  if (!rows || rows.length === 0) return { plan: 'free', proUntil: null };

  const row = rows[0];
  return {
    plan: row.plan || 'free',
    proUntil: row.pro_until,
  };
}

async function checkAndIncrementProMonthly(userId) {
  const monthKey = getMonthKey();

  const selectSql =
    'SELECT requests FROM ai_usage_monthly WHERE user_id = ? AND month_key = ? LIMIT 1';
  const rows = await dbQuery(selectSql, [userId, monthKey]);

  let used = 0;
  if (!rows || rows.length === 0) {
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

// ============================================================================
// ВЕБ‑ПОИСК ЧЕРЕЗ SEARXNG
// ============================================================================

async function webSearchWithSearxng(query) {
  try {
    const data = await fetchSearxViaCurl(query, 'general');

    const results = (data.results || [])
      .map((item) => ({
        title: item.title || '',
        content: item.content || item.summary || '',
        url: item.url || '',
      }))
      .slice(0, 4);

    const webContext = results.length
      ? results
          .map(
            (r) =>
              `Сайт: ${r.title || ''}\nИнфо: ${r.content || ''}`
          )
          .join('\n\n')
      : 'Актуальные данные не найдены.';

    const sources = results.map((r) => ({
      title: r.title || '',
      link: r.url || '',
    }));

    return { webContext, sources };
  } catch (e) {
    console.error('Ошибка при обращении к SearXNG (general):', e);
    return {
      webContext: 'Актуальные данные не найдены.',
      sources: [],
    };
  }
}

// ============================================================================
// МАРШРУТ /ai-search-searx
// ============================================================================

const router = express.Router();

router.post(
  '/ai-search-searx',
  aiSearchLimiter,
  attachUserIfToken,
  async (req, res) => {
    const reqStart = process.hrtime.bigint(); // начало запроса

    try {
      const query = (req.body.q || '').trim();
      if (!query) {
        return res.status(400).json({ error: 'Запрос пуст' });
      }

      const identity = getUserIdentity(req);

      const idempotencyKey = req.headers['x-idempotency-key'];
      if (idempotencyKey) {
        const cacheKey = `${identity.id}:${idempotencyKey}`;
        const cached = idempotencyStore.get(cacheKey);
        if (cached && Date.now() - cached.createdAt < IDEMPOTENCY_TTL_MS) {
          return res.json(cached.response);
        }
      }

      // Лимиты гостей
      if (identity.type === 'guest') {
        const usage = checkAndIncrementUsage(identity);
        if (!usage.ok) {
          const isVkAgent = req.headers['x-client'] === 'vk-agent';

          if (isVkAgent) {
            return res.status(403).json({
              error:
                'Лимит 5 запросов в день исчерпан. ' +
                'Чтобы продолжить пользоваться Serpmonn без ограничений, войдите: https://serpmonn.ru/frontend/login/login.html ' +
                'или зарегистрируйтесь: https://serpmonn.ru/frontend/register/register.html',
              needAuth: true,
              limit: usage.limit,
              used: usage.used,
            });
          }

          return res.status(403).json({
            error:
              'Лимит 5 запросов для гостей исчерпан. ' +
              'Пожалуйста, <a href="/frontend/login/login.html">войдите</a> ' +
              'или <a href="/frontend/register/register.html">зарегистрируйтесь</a>, чтобы продолжить.',
            needAuth: true,
            limit: usage.limit,
            used: usage.used,
          });
        }
      }

      // Лимиты авторизованных
      if (identity.type === 'user') {
        const userId = req.user.id;
        const planInfo = await getUserPlan(userId);
        const now = new Date();
        const isProActive =
          planInfo.plan === 'pro' &&
          planInfo.proUntil &&
          new Date(planInfo.proUntil) > now;

        if (isProActive) {
          const proUsage = await checkAndIncrementProMonthly(userId);
          if (!proUsage.ok) {
            return res.status(403).json({
              error:
                'Вы исчерпали лимит 2000 запросов в месяц по тарифу Pro. ' +
                'Лимит будет обновлён в начале следующего месяца.',
              needAuth: false,
              limit: proUsage.limit,
              used: proUsage.used,
            });
          }
        } else {
          const usage = checkAndIncrementUsage(identity);
          if (!usage.ok) {
            return res.status(403).json({
              error:
                'Лимит запросов на сегодня исчерпан. ' +
                'Вы можете перейти на <a href="/frontend/tariffs/tariffs.html">страницу тарифов</a>, ' +
                'и оформить тариф Pro (до 2000 запросов в месяц).',
              needAuth: false,
              limit: usage.limit,
              used: usage.used,
            });
          }
        }
      }

      console.log(`${nowMSK()} | Запрос: "${query}"`);

      // ---- тайминг SearXNG ----
      const searxStart = process.hrtime.bigint();
      const { webContext, sources } = await webSearchWithSearxng(query);
      const searxEnd = process.hrtime.bigint();
      const searxMs = Number(searxEnd - searxStart) / 1e6;

      // ---- тайминг моделей ----
      const modelStart = process.hrtime.bigint();
      let answer;
      let usedModel;
      let usedBackup = false;

      try {
        const aiResult = await getAiAnswerFromLocalModels(query, webContext);
        answer = aiResult.answer;
        usedModel = aiResult.model;
        usedBackup = aiResult.usedBackup;
      } catch (e) {
        console.error('AI: обе модели недоступны:', e);
        return res.status(502).json({
          error: 'Сервис ИИ временно недоступен.',
          answer: 'Сервис ИИ временно недоступен.',
        });
      }
      const modelEnd = process.hrtime.bigint();
      const modelMs = Number(modelEnd - modelStart) / 1e6;

      if (!answer) {
        answer = 'Нет текста ответа от модели.';
      }

      let userLabel = 'Неизвестный пользователь';
      if (identity.type === 'user' && req.user) {
        const parts = [];
        parts.push(`ID: ${req.user.id}`);
        if (req.user.username) parts.push(`логин: ${req.user.username}`);
        if (req.user.email) parts.push(`email: ${req.user.email}`);
        userLabel = `Авторизованный пользователь (${parts.join(', ')})`;
      } else if (identity.type === 'guest') {
        const isVkAgent = req.headers['x-client'] === 'vk-agent';
        const vkUserId = req.headers['x-vk-user'];
        if (isVkAgent && vkUserId) {
          userLabel = `VK-пользователь: ${vkUserId}`;
        } else {
          userLabel = `Гость: ${identity.id}`;
        }
      }

      const reqEnd = process.hrtime.bigint();
      const totalMs = Number(reqEnd - reqStart) / 1e6;
      const otherMs = totalMs - searxMs - modelMs;

      console.log(`${nowMSK()} | Пользователь (тип): ${userLabel}`);
      console.log(
        `${nowMSK()} | Модель: ${usedModel} (backup: ${usedBackup})`
      );
      console.log(
        `${nowMSK()} | Тайминги: total=${totalMs.toFixed(
          0
        )}ms, searx=${searxMs.toFixed(0)}ms, model=${modelMs.toFixed(
          0
        )}ms, other=${otherMs.toFixed(0)}ms`
      );
      console.log(
        `${nowMSK()} | Ответ: "${answer.slice(0, 200).replace(/\s+/g, ' ')}..."`
      );

      const responsePayload = {
        answer,
        usedWebSearch: true,
        model: usedModel,
        usedBackup,
        sources,
        timestamp: new Date().toISOString(),
      };

      if (idempotencyKey) {
        const cacheKey = `${identity.id}:${idempotencyKey}`;
        idempotencyStore.set(cacheKey, {
          response: responsePayload,
          createdAt: Date.now(),
        });
      }

      res.json(responsePayload);
    } catch (error) {
      console.error('💥 Ошибка в /ai-search-searx:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
);

export default router;