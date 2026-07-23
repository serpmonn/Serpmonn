import dotenv from 'dotenv';
import express from 'express';
import paseto from 'paseto';

import { getBackendMessages } from '../utils/i18n.mjs';
import { query as dbQuery } from '../database/config.mjs';
import { fetchSearxViaCurl } from '../utils/fetchSearxViaCurl.js';
import { saveAiSearchFeedback } from './ai-feedback.model.mjs';

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
const ATTACHMENT_TEXT_MAX_CHARS = 32000;

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

function normalizeAiAnswer(answer, t) {
  const trimmed = (answer || '').trim();

  if (!trimmed || trimmed === t.noModelText) {
    return {
      text: t.emptyAnswer,
      isEmpty: true,
      reason: 'empty',
    };
  }

  const noDataRe =
    /^(no information found in the provided data\.?|нет информации[_\s-]*found[_\s-]*in[_\s-]*the[_\s-]*provided[_\s-]*data\.?|в источниках из сети не найдено информации по этой теме\.?|данные из веб-поиска не получены\.?)$/i;

  if (noDataRe.test(trimmed)) {
    return {
      text: t.noDataAnswer,
      isEmpty: true,
      reason: 'no_data',
    };
  }

  return {
    text: trimmed,
    isEmpty: false,
    reason: null,
  };
}

function normalizeQueryForHeuristics(query) {
  return String(query || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[«»""„"]/g, '"');
}

const ATTACHMENT_WEB_INTENT_PATTERNS = [
  /\b(сравни|compare|versus|vs\.?)\b/i,
  /\b(актуальн|сейчас|сегодня|currently|today|now|latest)\b/i,
  /\b(курс|цена|стоимость|rate|price|cost)\b/i,
  /\b(новост|news)\b/i,
  /\b(в\s+интернет|в\s+сети|online|internet|web)\b/i,
  /\b(правда\s+ли|это\s+правда|верно\s+ли|is\s+it\s+true)\b/i,
  /\b(закон|законодательств|legal|regulation|compliance|comply)\b/i,
  /\b(найди|поищи|search|find|lookup)\b/i,
  /\b(соответствует|соответствие)\b/i,
  /\b(судебн|практик|precedent)\b/i,
  /\b(рынок|market|бирж)\b/i,
];

const ATTACHMENT_FILE_ONLY_PATTERNS = [
  /^что\s+(тут|здесь|это)\??$/i,
  /^о\s+ч[её]м\s+(тут|здесь|это|файл|документ)\??$/i,
  /^(перескажи|кратко|резюме|summary|summarize)(\s+(файл|текст|документ|this))?\.?$/i,
  /^(что\s+)?(написано|в\s+файле|в\s+документе)\??$/i,
  /^(прочитай|проанализируй)\s+(файл|документ|текст)\??$/i,
  /^(переведи|translate)\s+(файл|текст|документ|это)\??$/i,
  /^(извлеки|выдели)\s+(главное|суть|ключевое)\??$/i,
  /^(в\s+файле|в\s+документе|по\s+файлу|по\s+документу)\b/i,
  /^(этот\s+)?(файл|документ|текст)\s+(о\s+чем|про\s+что)\??$/i,
  /\b(прикрепл[её]нн|вложенн|attached|uploaded)\s+(файл|документ|текст)\b/i,
];

function resolveAttachmentSearchMode(query) {
  const q = normalizeQueryForHeuristics(query);

  if (!q) {
    return { fileOnly: true, reason: 'empty_query' };
  }

  if (ATTACHMENT_WEB_INTENT_PATTERNS.some((pattern) => pattern.test(q))) {
    return { fileOnly: false, reason: 'web_intent' };
  }

  if (ATTACHMENT_FILE_ONLY_PATTERNS.some((pattern) => pattern.test(q))) {
    return { fileOnly: true, reason: 'document_intent' };
  }

  if (q.length <= 28) {
    return { fileOnly: true, reason: 'short_query' };
  }

  if (/\b(файл|документ|текст|document|file|attachment)\b/i.test(q)) {
    return { fileOnly: true, reason: 'document_keyword' };
  }

  return { fileOnly: false, reason: 'default_hybrid' };
}

function buildOllamaMessages(query, webContext, attachment = null, options = {}) {
  const hasAttachment = Boolean(attachment?.text);
  const fileOnly = hasAttachment && options.fileOnly === true;
  const hasWebHits = options.hasWebHits === true;

  let systemBase =
    'You are Serpmonn search assistant. ' +
    'Reply only in the same language as the user question. ' +
    'Reply in 1-2 short sentences. ' +
    'Use facts only, without introductions. ';

  if (fileOnly) {
    systemBase +=
      'You are given an attached text file. ' +
      'Answer the question using ONLY the attached file content. ' +
      'Do not use outside knowledge. ' +
      'If the answer is not in the file, reply exactly: "No information found in the provided data."';
  } else if (hasAttachment) {
    systemBase +=
      'You are given an attached text file and web search results. ' +
      'Prefer the attached file when it answers the question. ' +
      'Answer using only that data. ';
    if (hasWebHits) {
      systemBase +=
        'If sources discuss the topic but do not name one exact item, say what the sources indicate. ' +
        'Do not claim that information is missing when search results are present.';
    } else {
      systemBase +=
        'If the answer is not present in the data, reply: "No information found in the provided data."';
    }
  } else if (hasWebHits) {
    systemBase +=
      'You are given web search results text. ' +
      'Answer the user question using those results. ' +
      'Summarize the most relevant facts. ' +
      'If sources discuss the topic but do not name one exact item, say what the sources indicate. ' +
      'Do not claim that information is missing when search results are present.';
  } else {
    systemBase +=
      'You are given web search results text. ' +
      'Your task is to answer the user question using only that data. ' +
      'If the answer is not present in the data, reply: "No information found in the provided data."';
  }

  let userContent = '';

  if (hasAttachment) {
    const fileName = attachment.name || 'attachment.txt';
    userContent += `ПРИКРЕПЛЁННЫЙ ФАЙЛ (${fileName}):\n${attachment.text}\n\n`;
  }

  if (!fileOnly) {
    userContent += `ДАННЫЕ ИЗ СЕТИ:\n${webContext}\n\n`;
  }

  userContent += `ВОПРОС: ${query}`;

  return [
    { role: 'system', content: systemBase },
    { role: 'user', content: userContent },
  ];
}

function parseAttachmentInput(body, t) {
  const text = String(body?.attachmentText || '').trim();
  if (!text) return null;

  if (text.length > ATTACHMENT_TEXT_MAX_CHARS) {
    const error = new Error(t.attachmentTooLarge);
    error.status = 400;
    error.isPublic = true;
    throw error;
  }

  const name = String(body?.attachmentName || 'attachment.txt').trim().slice(0, 255);

  return {
    name: name || 'attachment.txt',
    text,
  };
}

const OLLAMA_KEEP_ALIVE = '60m';
const OLLAMA_NUM_CTX = 2048;

function buildOllamaRequestOptions() {
  return {
    temperature: 0.2,
    num_predict: 120,
    top_k: 40,
    top_p: 0.9,
    num_ctx: OLLAMA_NUM_CTX,
  };
}

async function callOllama(model, query, webContext, attachment = null, options = {}) {
  const body = {
    model,
    messages: buildOllamaMessages(query, webContext, attachment, options),
    stream: false,
    keep_alive: OLLAMA_KEEP_ALIVE,
    options: buildOllamaRequestOptions(),
  };

  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const raw = await res.text();

  if (!res.ok) {
    console.error(`[Ollama] HTTP error ${res.status}`);
    throw new Error(`Ollama HTTP ${res.status}`);
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    console.error('[Ollama] JSON parse error:', e.message);
    throw new Error('Ollama JSON parse error');
  }

  const answer =
    data.message?.content ||
    data.choices?.[0]?.message?.content ||
    '';

  if (!answer) {
    console.error('[Ollama] Empty content in response');
    throw new Error('Ollama empty content');
  }

  return answer;
}

async function streamOllama(model, query, webContext, onToken, attachment = null, options = {}) {
  const body = {
    model,
    messages: buildOllamaMessages(query, webContext, attachment, options),
    stream: true,
    keep_alive: OLLAMA_KEEP_ALIVE,
    options: buildOllamaRequestOptions(),
  };

  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error(`[Ollama] HTTP error ${res.status}`);
    throw new Error(`Ollama HTTP ${res.status}`);
  }

  if (!res.body) {
    throw new Error('Ollama streaming body is not available');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let answer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      let data;
      try {
        data = JSON.parse(trimmed);
      } catch (e) {
        console.error('[Ollama] stream JSON parse error:', e.message);
        continue;
      }

      const chunk = data.message?.content || '';
      if (chunk) {
        answer += chunk;
        onToken(chunk);
      }
    }
  }

  if (!answer) {
    console.error('[Ollama] Empty content in stream');
    throw new Error('Ollama empty content');
  }

  return answer;
}

async function getAiAnswerFromLocalModels(query, webContext, options = {}) {
  const { onToken, attachment = null, fileOnly = false, hasWebHits = false } = options;
  const modelOptions = { fileOnly, hasWebHits };

  try {
    if (onToken) {
      const answer = await streamOllama(
        OLLAMA_MAIN_MODEL,
        query,
        webContext,
        onToken,
        attachment,
        modelOptions
      );
      return { answer, model: OLLAMA_MAIN_MODEL, usedBackup: false };
    }

    const answer = await callOllama(
      OLLAMA_MAIN_MODEL,
      query,
      webContext,
      attachment,
      modelOptions
    );
    return { answer, model: OLLAMA_MAIN_MODEL, usedBackup: false };
  } catch (e) {
    console.error('[AI] Ошибка основной модели:', e.message);
  }

  try {
    if (onToken) {
      const answer = await streamOllama(
        OLLAMA_FAST_MODEL,
        query,
        webContext,
        onToken,
        attachment,
        modelOptions
      );
      return { answer, model: OLLAMA_FAST_MODEL, usedBackup: true };
    }

    const answer = await callOllama(
      OLLAMA_FAST_MODEL,
      query,
      webContext,
      attachment,
      modelOptions
    );
    return { answer, model: OLLAMA_FAST_MODEL, usedBackup: true };
  } catch (e) {
    console.error('[AI] Ошибка backup-модели:', e.message);
  }

  throw new Error('Обе локальные модели Ollama недоступны');
}

function extractAuthToken(req) {
  const cookieToken = req.cookies?.token;
  if (cookieToken) return cookieToken;

  const header = req.headers?.authorization || req.headers?.Authorization;
  if (!header || typeof header !== 'string') return null;
  const m = header.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

async function attachUserIfToken(req, res, next) {
  const token = extractAuthToken(req);
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
      .slice(0, 6);

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
    console.error('Ошибка при обращении к SearXNG (general):', e.message);
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
      .slice(0, 6)
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
    console.error('Ошибка при обращении к SearXNG (images):', e.message);
    return [];
  }
}

async function videoSearchWithSearxng(query, t) {
  try {
    const data = await fetchSearxViaCurl(query, 'videos');

    const videos = (data.results || [])
      .slice(0, 6)
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
    console.error('Ошибка при обращении к SearXNG (videos):', e.message);
    return [];
  }
}

function wantsStream(req) {
  return (
    req.body?.stream === true ||
    String(req.headers.accept || '').includes('application/x-ndjson')
  );
}

function writeNdjson(res, payload) {
  if (res.writableEnded) return;
  res.write(`${JSON.stringify(payload)}\n`);
}

function startNdjsonResponse(res) {
  res.status(200);
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }
}

function replayCachedStream(res, cachedResponse) {
  startNdjsonResponse(res);
  writeNdjson(res, { event: 'status', phase: 'searching' });

  if (cachedResponse.answer) {
    writeNdjson(res, {
      event: 'text_done',
      answer: cachedResponse.answer,
      sources: cachedResponse.sources || [],
      usedWebSearch: cachedResponse.usedWebSearch === true,
      model: cachedResponse.model || null,
      usedBackup: cachedResponse.usedBackup === true,
    });
  }

  if (Array.isArray(cachedResponse.images) && cachedResponse.images.length > 0) {
    writeNdjson(res, { event: 'images', images: cachedResponse.images });
  }

  if (Array.isArray(cachedResponse.videos) && cachedResponse.videos.length > 0) {
    writeNdjson(res, { event: 'videos', videos: cachedResponse.videos });
  }

  writeNdjson(res, {
    event: 'done',
    timings: cachedResponse.timings || null,
    partialFailures: cachedResponse.partialFailures || [],
  });

  res.end();
}

function createEmptyResponsePayload(q, mode) {
  return {
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
    timings: null,
    answerEmpty: false,
    answerEmptyReason: null,
    attachmentUsed: false,
    attachmentName: null,
  };
}

async function runTextTask(q, t, responsePayload, emit, attachment = null) {
  const hasAttachment = Boolean(attachment?.text);
  const searchMode = hasAttachment ? resolveAttachmentSearchMode(q) : { fileOnly: false, reason: 'no_attachment' };
  const fileOnly = hasAttachment && searchMode.fileOnly;
  let webContext = t.searchNoData;
  let sources = [];
  let searxMs = 0;

  if (hasAttachment) {
    console.log(`[AI] attachment mode: ${fileOnly ? 'file_only' : 'hybrid'} (${searchMode.reason}) q="${q.slice(0, 80)}"`);
  }

  if (!fileOnly) {
    const searxStart = process.hrtime.bigint();
    const searxResult = await webSearchWithSearxng(q, t);
    webContext = searxResult.webContext;
    sources = searxResult.sources;
    const searxEnd = process.hrtime.bigint();
    searxMs = Number(searxEnd - searxStart) / 1e6;
  }

  const usedWebSearch = !fileOnly;
  responsePayload.sources = sources;
  responsePayload.usedWebSearch = usedWebSearch;
  responsePayload.attachmentUsed = hasAttachment;
  responsePayload.attachmentName = attachment?.name || null;

  if (emit) {
    emit({
      event: 'text_start',
      sources,
      usedWebSearch,
      attachmentUsed: hasAttachment,
      attachmentName: responsePayload.attachmentName,
      timings: usedWebSearch ? { searx_ms: searxMs } : {},
    });
    emit({ event: 'status', phase: 'generating' });
  }

  const modelStart = process.hrtime.bigint();
  let aiResult;
  try {
    aiResult = await getAiAnswerFromLocalModels(q, webContext, {
      attachment,
      fileOnly,
      hasWebHits: sources.length > 0,
      onToken: emit
        ? (chunk) => emit({ event: 'text_delta', chunk })
        : null,
    });
  } catch (e) {
    const publicError = new Error(t.aiUnavailable);
    publicError.isPublic = true;
    publicError.status = 502;
    publicError.phase = 'text';
    throw publicError;
  }
  const modelEnd = process.hrtime.bigint();
  const modelMs = Number(modelEnd - modelStart) / 1e6;

  const normalized = normalizeAiAnswer(aiResult.answer, t);

  responsePayload.answer = normalized.text;
  responsePayload.answerEmpty = normalized.isEmpty;
  responsePayload.answerEmptyReason = normalized.reason;
  responsePayload.model = aiResult.model;
  responsePayload.usedBackup = aiResult.usedBackup;

  const textTimings = { searx_ms: searxMs, model_ms: modelMs };

  if (emit) {
    emit({
      event: 'text_done',
      answer: responsePayload.answer,
      sources: responsePayload.sources,
      usedWebSearch: responsePayload.usedWebSearch === true,
      model: responsePayload.model,
      usedBackup: responsePayload.usedBackup,
      answerEmpty: responsePayload.answerEmpty,
      answerEmptyReason: responsePayload.answerEmptyReason,
      attachmentUsed: responsePayload.attachmentUsed,
      attachmentName: responsePayload.attachmentName,
      timings: textTimings,
    });
  }

  return { type: 'text', timings: textTimings };
}

async function runImagesTask(q, t, responsePayload, emit) {
  const start = process.hrtime.bigint();
  const images = await imageSearchWithSearxng(q, t);
  const end = process.hrtime.bigint();
  const imagesMs = Number(end - start) / 1e6;

  responsePayload.images = images;

  if (emit) {
    emit({
      event: 'images',
      images,
      timings: { images_ms: imagesMs },
    });
  }

  return { type: 'images', timings: { images_ms: imagesMs } };
}

async function runVideosTask(q, t, responsePayload, emit) {
  const start = process.hrtime.bigint();
  const videos = await videoSearchWithSearxng(q, t);
  const end = process.hrtime.bigint();
  const videosMs = Number(end - start) / 1e6;

  responsePayload.videos = videos;

  if (emit) {
    emit({
      event: 'videos',
      videos,
      timings: { videos_ms: videosMs },
    });
  }

  return { type: 'videos', timings: { videos_ms: videosMs } };
}

async function executeSearchTasks({
  q,
  t,
  wantText,
  wantImages,
  wantVideos,
  responsePayload,
  emit,
  attachment = null,
}) {
  const tasks = [];
  const branchTimings = {};

  if (wantText) {
    tasks.push(
      runTextTask(q, t, responsePayload, emit, attachment).then((result) => {
        Object.assign(branchTimings, result.timings);
        return result;
      })
    );
  }

  if (wantImages) {
    tasks.push(
      runImagesTask(q, t, responsePayload, emit).then((result) => {
        Object.assign(branchTimings, result.timings);
        return result;
      })
    );
  }

  if (wantVideos) {
    tasks.push(
      runVideosTask(q, t, responsePayload, emit).then((result) => {
        Object.assign(branchTimings, result.timings);
        return result;
      })
    );
  }

  const settled = await Promise.allSettled(tasks);

  for (const item of settled) {
    if (item.status === 'rejected') {
      const reason = item.reason;
      const message = reason?.message || t.unknownTaskError;

      responsePayload.partialFailures.push(message);

      if (emit) {
        emit({
          event: 'error',
          error: reason?.isPublic ? message : t.internalError,
          phase: reason?.phase || 'unknown',
        });
      }
    }
  }

  return { settled, branchTimings };
}

async function handleStreamingSearch(req, res, ctx) {
  const {
    q,
    mode,
    wantText,
    wantImages,
    wantVideos,
    t,
    idempotencyKey,
    identity,
    reqStart,
    attachment,
  } = ctx;

  startNdjsonResponse(res);
  writeNdjson(res, { event: 'status', phase: 'searching' });

  const responsePayload = createEmptyResponsePayload(q, mode);
  const emit = (payload) => writeNdjson(res, payload);

  const { settled, branchTimings } = await executeSearchTasks({
    q,
    t,
    wantText,
    wantImages,
    wantVideos,
    responsePayload,
    emit,
    attachment,
  });

  const reqEnd = process.hrtime.bigint();
  const totalMs = Number(reqEnd - reqStart) / 1e6;
  const timings = {
    total_ms: totalMs,
    ...branchTimings,
  };

  responsePayload.timings = timings;

  writeNdjson(res, {
    event: 'done',
    timings,
    partialFailures: responsePayload.partialFailures,
  });

  console.log('/ai-search | stream | total=' + totalMs.toFixed(0) + 'ms | ok');

  if (idempotencyKey) {
    const cacheKey = `${identity.id}:${idempotencyKey}`;
    idempotencyStore.set(cacheKey, {
      response: responsePayload,
      createdAt: Date.now(),
    });
  }

  res.end();
}

router.post(
  '/ai-search',
  attachUserIfToken,
  async (req, res) => {
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

      const attachment = parseAttachmentInput(req.body, t);

      const identity = getUserIdentity(req);

      const idempotencyKey =
        req.headers['x-idempotency-key'] ||
        req.body?.requestId ||
        null;

      if (idempotencyKey) {
        const cacheKey = `${identity.id}:${idempotencyKey}`;
        const cached = idempotencyStore.get(cacheKey);

        if (cached && Date.now() - cached.createdAt < IDEMPOTENCY_TTL_MS) {
          if (wantsStream(req)) {
            return replayCachedStream(res, cached.response);
          }
          return res.json(cached.response);
        }
      }

      const limitCheck = await enforceLogicalSearchLimit(req, identity, t);
      if (!limitCheck.ok) {
        return res.status(limitCheck.status).json(limitCheck.payload);
      }

      const stream = wantsStream(req);

      if (stream) {
        return handleStreamingSearch(req, res, {
          q,
          mode,
          wantText,
          wantImages,
          wantVideos,
          t,
          idempotencyKey,
          identity,
          reqStart,
          attachment,
        });
      }

      const responsePayload = createEmptyResponsePayload(q, mode);

      const { settled, branchTimings } = await executeSearchTasks({
        q,
        t,
        wantText,
        wantImages,
        wantVideos,
        responsePayload,
        emit: null,
        attachment,
      });

      const textFailure = settled.find(
        (item) =>
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

      responsePayload.timings = {
        total_ms: totalMs,
        ...branchTimings,
      };

      console.log('/ai-search | total=' + totalMs.toFixed(0) + 'ms | ok');

      if (idempotencyKey) {
        const cacheKey = `${identity.id}:${idempotencyKey}`;
        idempotencyStore.set(cacheKey, {
          response: responsePayload,
          createdAt: Date.now(),
        });
      }

      return res.json(responsePayload);
    } catch (error) {
      console.error('💥 Ошибка в /ai-search:', error.message);

      if (error?.isPublic) {
        return res.status(error.status || 400).json({
          error: error.message || t.internalError,
        });
      }

      return res.status(500).json({ error: t.internalError });
    }
  }
);

router.post(
  '/ai-search/feedback',
  attachUserIfToken,
  async (req, res) => {
    const { locale, t } = getBackendMessages(req);

    try {
      const rating = req.body?.rating;
      const queryText = String(req.body?.query || '').trim();
      const answerText = String(req.body?.answer || '').trim();
      const usedWebSearch = req.body?.usedWebSearch === true;

      if (rating !== 'like' && rating !== 'dislike') {
        return res.status(400).json({ error: t.internalError });
      }

      if (!queryText || queryText.length > 500) {
        return res.status(400).json({ error: t.queryEmpty });
      }

      if (!answerText || answerText.length > 8000) {
        return res.status(400).json({ error: t.noModelText });
      }

      const identity = getUserIdentity(req);
      const userId = req.user?.id ? Number(req.user.id) : null;
      const guestKey = userId ? null : identity.id;

      const id = await saveAiSearchFeedback({
        rating,
        queryText,
        answerText,
        locale,
        userId: Number.isFinite(userId) ? userId : null,
        guestKey,
        usedWebSearch,
      });

      return res.json({ ok: true, id });
    } catch (error) {
      console.error('ai-search feedback error:', error.message);
      return res.status(500).json({ error: t.internalError });
    }
  }
);

async function warmupSearchModel() {
  try {
    await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OLLAMA_MAIN_MODEL,
        messages: [{ role: 'user', content: 'ok' }],
        stream: false,
        keep_alive: OLLAMA_KEEP_ALIVE,
        options: { ...buildOllamaRequestOptions(), num_predict: 1 },
      }),
    });
    console.log('[AI] search model warmed, keep_alive=' + OLLAMA_KEEP_ALIVE);
  } catch (e) {
    console.warn('[AI] warmup failed:', e.message);
  }
}

setTimeout(warmupSearchModel, 3000);

export default router;
