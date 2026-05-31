import dotenv from 'dotenv';
import express from 'express';
import paseto from 'paseto';

import { getBackendMessages } from '../utils/i18n.mjs';
import { query as dbQuery } from '../database/config.mjs';
import { fetchSearxViaCurl } from '../utils/fetchSearxViaCurl.js';

dotenv.config({ path: '/var/www/serpmonn.ru/backend/.env' });

const router = express.Router();
const { V2 } = paseto;

const secretKey = process.env.SECRET_KEY;
const SEARXNG_URL = process.env.SEARXNG_URL || 'http://serpmonn.ru';

const PRO_MONTHLY_LIMIT = 2000;
const GUEST_DAILY_LIMIT = 5;
const USER_DAILY_LIMIT = 15;

const usageStore = new Map();
const idempotencyStore = new Map();
const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000;

const OLLAMA_URL = 'http://127.0.0.1:11434/api/chat';
const OLLAMA_MAIN_MODEL = 'serpmonn-ai-search:latest';
const OLLAMA_FAST_MODEL = 'serpmonn-ai-fast:latest';

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

function extractHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

async function callOllama(model, query, webContext) {
  const body = {
    model,
    messages: [
      {
        role: 'system',
        content:
          'You are Serpmonn search assistant. ' +
          'You are given web search results text. ' +
          'Your task is to answer the user question using only that data. ' +
          'Reply only in the same language as the user question. ' +
          'Reply in 1-2 short sentences. ' +
          'Use facts only, without introductions. ' +
          'If the answer is not present in the data, reply: "No information found in the provided data."',
      },
      {
        role: 'user',
        content: `ДАННЫЕ ИЗ СЕТИ:\n${webContext}\n\nВОПРОС: ${query}`,
      },
    ],
    stream: false,
    options: {
      temperature: 0,
      num_predict: 98,
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

async function getAiAnswerFromLocalModels(query, webContext) {
  try {
    const answer = await callOllama(OLLAMA_MAIN_MODEL, query, webContext);
    return { answer, model: OLLAMA_MAIN_MODEL, usedBackup: false };
  } catch (e) {
    console.error('[AI] Ошибка основной модели:', e.message);
  }

  try {
    const answer = await callOllama(OLLAMA_FAST_MODEL, query, webContext);
    return { answer, model: OLLAMA_FAST_MODEL, usedBackup: true };
  } catch (e) {
    console.error('[AI] Ошибка backup-модели:', e.message);
  }

  throw new Error('Обе локальные модели Ollama недоступны');
}

async function attachUserIfToken(req, res, next) {
  const token = req.cookies.token;
  if (!token) {
    req.user = null;
    return next();
  }

  if (!secretKey) {
    console.error('SECRET_KEY не задан в ai-search-unified');
    req.user = null;
    return next();
  }

  try {
    const payload = await V2.verify(token, secretKey);
    req.user = payload;
  } catch (e) {
    console.warn('Недействительный токен:', e.message);
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

function checkAndIncrementUsage(identity) {
  const today = getTodayKey();
  const key = `${identity.id}:${today}`;
  const entry = usageStore.get(key) || { requests: 0 };

  const limit = identity.type === 'guest' ? GUEST_DAILY_LIMIT : USER_DAILY_LIMIT;

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

  if (!rows || rows.length === 0) {
    return { plan: 'free', proUntil: null };
  }

  return {
    plan: rows[0].plan || 'free',
    proUntil: rows[0].pro_until,
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

async function enforceLogicalSearchLimit(req, identity, t) {
  if (identity.type === 'guest') {
    const usage = checkAndIncrementUsage(identity);

    if (!usage.ok) {
      const isVkAgent = req.headers['x-client'] === 'vk-agent';

      if (isVkAgent) {
        return {
          ok: false,
          status: 403,
          payload: {
            error: t.guestLimitVk,
            needAuth: true,
            limit: usage.limit,
            used: usage.used,
          },
        };
      }

      return {
        ok: false,
        status: 403,
        payload: {
          error: t.guestLimit,
          needAuth: true,
          limit: usage.limit,
          used: usage.used,
        },
      };
    }

    return { ok: true, usage };
  }

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
        return {
          ok: false,
          status: 403,
          payload: {
            error: t.proLimit,
            needAuth: false,
            limit: proUsage.limit,
            used: proUsage.used,
          },
        };
      }

      return { ok: true, usage: proUsage, plan: 'pro' };
    }

    const usage = checkAndIncrementUsage(identity);

    if (!usage.ok) {
      return {
        ok: false,
        status: 403,
        payload: {
          error: t.freeLimit,
          needAuth: false,
          limit: usage.limit,
          used: usage.used,
        },
      };
    }

    return { ok: true, usage, plan: 'free' };
  }

  return { ok: true };
}

async function webSearchWithSearxng(query, t) {
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
        .map((r) => `${t.searchContextSource}: ${r.title}\n${t.searchContextSnippet}: ${r.content}`)
        .join('\n\n')
      : t.searchNoData;

    const sources = results.map((r) => ({
      title: r.title,
      link: r.url,
    }));

    return { webContext, sources };
  } catch (e) {
    console.error('Ошибка при обращении к SearXNG (general):', e);
    return {
      webContext: t.searchNoData,
      sources: [],
    };
  }
}

async function imageSearchWithSearxng(query, t) {
  try {
    const data = await fetchSearxViaCurl(query, 'images');

    const images = (data.results || [])
      .slice(0, 24)
      .map((item) => ({
        title: item.title || t.imageFallbackTitle.replace('{query}', query),
        thumbnailUrl: item.img_src || item.thumbnail || '',
        imageUrl: item.img_src || item.url || '',
        sourceUrl: item.url || '',
        sourceName: extractHostname(item.url || ''),
      }))
      .filter((img) => img.imageUrl);

    return images;
  } catch (e) {
    console.error('Ошибка при обращении к SearXNG (images):', e);
    return [];
  }
}

async function videoSearchWithSearxng(query, t) {
  try {
    const data = await fetchSearxViaCurl(query, 'videos');

    const videos = (data.results || [])
      .slice(0, 18)
      .map((item) => ({
        title: item.title || t.videoFallbackTitle.replace('{query}', query),
        thumbnailUrl: item.thumbnail || item.img_src || '',
        videoUrl: item.url || '',
        sourceUrl: item.url || '',
        sourceName: extractHostname(item.url || ''),
        duration: item.duration || '',
      }))
      .filter((v) => v.videoUrl);

    return videos;
  } catch (e) {
    console.error('Ошибка при обращении к SearXNG (videos):', e);
    return [];
  }
}

router.post(
  '/ai-search',
  attachUserIfToken,
  async (req, res) => {
    console.log('IN /ai-search, body =', req.body);
    const reqStart = process.hrtime.bigint();
    const { locale, t } = getBackendMessages(req);

    try {
      const q = (req.body?.q || '').trim();
      const include = req.body?.include || {};
      const mode = req.body?.mode || 'text';

      const wantText = include.text !== false;
      const wantImages = include.images === true;
      const wantVideos = include.videos === true;

      if (!q) {
        return res.status(400).json({ error: t.queryEmpty });
      }

      const identity = getUserIdentity(req);

      const idempotencyKey =
        req.headers['x-idempotency-key'] ||
        req.body?.requestId ||
        null;

      if (idempotencyKey) {
        const cacheKey = `${identity.id}:${idempotencyKey}`;
        const cached = idempotencyStore.get(cacheKey);

        if (cached && Date.now() - cached.createdAt < IDEMPOTENCY_TTL_MS) {
          return res.json(cached.response);
        }
      }

      const limitCheck = await enforceLogicalSearchLimit(req, identity, t);
      if (!limitCheck.ok) {
        return res.status(limitCheck.status).json(limitCheck.payload);
      }

      console.log(`${nowMSK()} | /ai-search | locale=${locale} | query="${q}" | mode=${mode}`);
      console.log(
        `${nowMSK()} | include: text=${wantText}, images=${wantImages}, videos=${wantVideos}`
      );

      const tasks = [];

      if (wantText) {
        tasks.push(
          (async () => {
            const searxStart = process.hrtime.bigint();
            const { webContext, sources } = await webSearchWithSearxng(q, t);
            const searxEnd = process.hrtime.bigint();

            const modelStart = process.hrtime.bigint();
            let aiResult;
            try {
              aiResult = await getAiAnswerFromLocalModels(q, webContext);
            } catch (e) {
              const publicError = new Error(t.aiUnavailable);
              publicError.isPublic = true;
              publicError.status = 502;
              throw publicError;
            }
            const modelEnd = process.hrtime.bigint();

            return {
              type: 'text',
              answer: aiResult.answer || t.noModelText,
              model: aiResult.model,
              usedBackup: aiResult.usedBackup,
              usedWebSearch: true,
              sources,
              timings: {
                searxMs: Number(searxEnd - searxStart) / 1e6,
                modelMs: Number(modelEnd - modelStart) / 1e6,
              },
            };
          })()
        );
      }

      if (wantImages) {
        tasks.push(
          (async () => {
            const start = process.hrtime.bigint();
            const images = await imageSearchWithSearxng(q, t);
            const end = process.hrtime.bigint();

            return {
              type: 'images',
              images,
              timings: {
                imagesMs: Number(end - start) / 1e6,
              },
            };
          })()
        );
      }

      if (wantVideos) {
        tasks.push(
          (async () => {
            const start = process.hrtime.bigint();
            const videos = await videoSearchWithSearxng(q, t);
            const end = process.hrtime.bigint();

            return {
              type: 'videos',
              videos,
              timings: {
                videosMs: Number(end - start) / 1e6,
              },
            };
          })()
        );
      }

      const settled = await Promise.allSettled(tasks);

      const responsePayload = {
        query: q,
        mode,
        answer: null,
        images: [],
        videos: [],
        sources: [],
        usedWebSearch: false,
        model: null,
        usedBackup: false,
        partialFailures: [],
        timestamp: new Date().toISOString(),
      };

      for (const item of settled) {
        if (item.status === 'fulfilled') {
          const value = item.value;

          if (value.type === 'text') {
            responsePayload.answer = value.answer;
            responsePayload.sources = value.sources || [];
            responsePayload.usedWebSearch = value.usedWebSearch;
            responsePayload.model = value.model;
            responsePayload.usedBackup = value.usedBackup;
          }

          if (value.type === 'images') {
            responsePayload.images = value.images || [];
          }

          if (value.type === 'videos') {
            responsePayload.videos = value.videos || [];
          }
        } else {
          responsePayload.partialFailures.push(
            item.reason?.message || t.unknownTaskError
          );
        }
      }

      const textFailure = settled.find(
        item =>
          item.status === 'rejected' &&
          item.reason?.isPublic === true
      );

      if (wantText && textFailure && !responsePayload.answer) {
        return res.status(textFailure.reason.status || 502).json({
          error: textFailure.reason.message || t.aiUnavailable,
          images: Array.isArray(responsePayload.images) ? responsePayload.images : [],
          videos: Array.isArray(responsePayload.videos) ? responsePayload.videos : [],
          sources: [],
          usedWebSearch: false,
          model: null,
          usedBackup: false,
          partialFailures: responsePayload.partialFailures,
          timestamp: new Date().toISOString(),
        });
      }

      const reqEnd = process.hrtime.bigint();
      const totalMs = Number(reqEnd - reqStart) / 1e6;

      console.log(`${nowMSK()} | /ai-search | total=${totalMs.toFixed(0)}ms`);
      console.log(
        `${nowMSK()} | /ai-search | answer="${(responsePayload.answer || '').slice(0, 200).replace(/\s+/g, ' ')}..."`
      );
      console.log(
        `${nowMSK()} | /ai-search | images=${responsePayload.images.length}, videos=${responsePayload.videos.length}, sources=${responsePayload.sources.length}`
      );

      if (idempotencyKey) {
        const cacheKey = `${identity.id}:${idempotencyKey}`;
        idempotencyStore.set(cacheKey, {
          response: responsePayload,
          createdAt: Date.now(),
        });
      }

      return res.json(responsePayload);
    } catch (error) {
      console.error('💥 Ошибка в /ai-search:', error);

      if (error?.isPublic) {
        return res.status(error.status || 400).json({
          error: error.message || t.internalError,
        });
      }

      return res.status(500).json({ error: t.internalError });
    }
  }
);

export default router;