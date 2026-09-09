/**
 * Генерация рекламных текстов для автоматизации:
 * 1) GigaChat (Сбер)
 * 2) fallback — локальный Ollama (serpmonn-ai-*)
 *
 * Правило продукта «Промокоды»: только бренд Serpmonn, без чужих брендов и кодов.
 */

import { query } from '../database/config.mjs';
import {
  chatWithGigaChat,
  isGigaChatConfigured
} from '../ai-search/gigachat-client.mjs';
import {
  isGigaChatCoolingDown,
  noteGigaChatFailure,
  getGigaChatCooldownReason,
  enqueueGigaChat
} from './gigachat-guard.mjs';

const OLLAMA_URL = process.env.MARKETING_OLLAMA_URL || 'http://127.0.0.1:11434/api/chat';
const OLLAMA_MODEL =
  process.env.MARKETING_OLLAMA_MODEL || 'serpmonn-ai-fast:latest';
const OLLAMA_FALLBACK =
  process.env.MARKETING_OLLAMA_FALLBACK || 'serpmonn-ai-search:latest';
const KEEP_ALIVE = process.env.MARKETING_OLLAMA_KEEP_ALIVE || '10m';
const NUM_CTX = 2048;
const TIMEOUT_MS = Number(process.env.MARKETING_OLLAMA_TIMEOUT_MS) || 45000;

const PROMO_FALLBACKS = [
  {
    title: 'Промокоды в Serpmonn',
    body:
      'Актуальные скидки и купоны собраны в одном разделе.\nПодборка на Serpmonn помогает быстрее найти нужное предложение.'
  },
  {
    title: 'Скидки без хаоса вкладок',
    body:
      'Вместо десятков сайтов — один раздел промокодов Serpmonn.\nУдобно выбрать то, что актуально сейчас.'
  },
  {
    title: 'Подборка купонов на Serpmonn',
    body:
      'Промокоды и скидки собраны в одном месте.\nРаздел Serpmonn упрощает поиск выгодных предложений.'
  },
  {
    title: 'Экономия начинается с Serpmonn',
    body:
      'Раздел промокодов Serpmonn помогает быстрее находить выгодные предложения и экономить время на поиске.'
  }
];

const HONEY_FALLBACKS = [
  {
    title: 'Натуральный мёд VRNHoney',
    body:
      'В ассортименте VRNHoney — натуральный мёд от проверенных пасек.\nПодробности и заказ — на vrnhoney.ru.'
  },
  {
    title: 'Мёд от VRNHoney',
    body:
      'Качественный мёд для ежедневного рациона.\nВыбор сортов и доставка — в интернет-магазине vrnhoney.ru.'
  },
  {
    title: 'Польза мёда каждый день',
    body:
      'Натуральный продукт без лишнего от бренда VRNHoney.\nАктуальный ассортимент доступен на vrnhoney.ru.'
  }
];

const BRAND_FALLBACKS = {
  promocodes: PROMO_FALLBACKS[0],
  honey: HONEY_FALLBACKS[0],
  neli: {
    title: 'Neli на Serpmonn',
    body: 'Короткая браузерная игра Neli доступна без установки на Serpmonn.'
  },
  default: {
    title: 'Serpmonn',
    body: 'Поиск, инструменты, игры и полезные разделы — на Serpmonn.'
  }
};

/** Краткие брифы — факты для модели, не готовые посты. */
const PRODUCT_BRIEFS = {
  promocodes: {
    name: 'Раздел промокодов Serpmonn',
    lang: 'ru',
    brandOnly: true,
    brandName: 'Serpmonn',
    facts: [
      'Serpmonn — независимый сервис с разделом актуальных промокодов и скидок',
      'Пользователь открывает одну страницу вместо десятка сайтов',
      'Цель поста: привести человека на serpmonn.ru (раздел промокодов), а не рекламировать чужие магазины',
      'Запрещено: названия магазинов/брендов партнёров, конкретные промокоды, проценты скидок партнёров, Perfluence',
      'Можно: Serpmonn, промокоды, скидки, экономия, удобство, «в одном месте»'
    ]
  },
  honey: {
    name: 'VRNHoney — интернет-магазин мёда',
    lang: 'ru',
    brandOnly: true,
    brandName: 'VRNHoney',
    facts: [
      'Бренд VRNHoney, интернет-магазин мёда vrnhoney.ru',
      'Цель: продвижение магазина и ассортимента мёда',
      'Публикации продукта «Мёд» — только в VK-сообществе https://vk.ru/vrnhoney_ru',
      'Тема: натуральный мёд, польза, ассортимент, качество, доставка',
      'Не рекламировать Serpmonn и промокоды в этих постах',
      'CTA: https://vrnhoney.ru'
    ]
  },
  neli: {
    name: 'Neli',
    lang: 'ru',
    brandOnly: false,
    brandName: 'Serpmonn',
    facts: [
      'Браузерная игра на Serpmonn',
      'Без установки',
      'Бренд: Serpmonn'
    ]
  },
  partners: {
    name: 'Serpmonn Partners',
    lang: 'en',
    brandOnly: false,
    brandName: 'Serpmonn',
    facts: [
      'Partner / affiliate network of Serpmonn',
      'Landing: serpmonn.ru partners'
    ]
  },
  app: {
    name: 'Serpmonn',
    lang: 'ru',
    brandOnly: false,
    brandName: 'Serpmonn',
    facts: [
      'Поиск с ИИ и классическая выдача',
      'Игры, инструменты, промокоды',
      'Бренд: Serpmonn'
    ]
  }
};

function briefFor(product) {
  const key = String(product || '').toLowerCase();
  return (
    PRODUCT_BRIEFS[key] || {
      name: product || 'Serpmonn',
      lang: 'ru',
      brandOnly: false,
      facts: ['Продукт Serpmonn', 'serpmonn.ru']
    }
  );
}

function fallbackFor(product, salt = '') {
  const key = String(product || '').toLowerCase();
  if (key === 'promocodes' || key === 'honey') {
    const pool = key === 'honey' ? HONEY_FALLBACKS : PROMO_FALLBACKS;
    let h = 0;
    const s = String(salt || Date.now());
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return pool[h % pool.length];
  }
  return BRAND_FALLBACKS[key] || BRAND_FALLBACKS.default;
}

async function recentTitles(product, limit = 8) {
  try {
    const rows = await query(
      `SELECT title FROM marketing_queue
       WHERE product = ? AND title IS NOT NULL AND title <> ''
       ORDER BY id DESC LIMIT ${Math.min(20, Math.max(1, limit))}`,
      [String(product || '').slice(0, 64)]
    );
    return (rows || []).map((r) => String(r.title || '').trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function buildPrompt({ product, format, ctaUrl, avoidTitles }) {
  const brief = briefFor(product);
  const isVideo = format === 'video';
  const isHoney = String(product || '').toLowerCase() === 'honey';
  const brand = brief.brandName || (isHoney ? 'VRNHoney' : 'Serpmonn');
  const avoid =
    avoidTitles?.length
      ? `Не повторяй эти заголовки:\n- ${avoidTitles.join('\n- ')}`
      : 'Сделай свежий угол, без шаблонного звучания.';

  const brandRules = brief.brandOnly
    ? isHoney
      ? `
ЖЁСТКИЕ ПРАВИЛА (бренд VRNHoney):
- Рекламируй ТОЛЬКО бренд VRNHoney и магазин vrnhoney.ru
- НЕ упоминай Serpmonn, промокоды, скидочные агрегаторы
- Можно: мёд, сорта, польза, качество, пасека, доставка, интернет-магазин
`
      : `
ЖЁСТКИЕ ПРАВИЛА (бренд-онли реклама):
- Рекламируй ТОЛЬКО Serpmonn и его раздел промокодов
- ЗАПРЕЩЕНО: любые названия магазинов, банков, сервисов, брендов партнёров
- ЗАПРЕЩЕНО: конкретные промокоды, купоны, артикулы, «код: …», проценты чужих акций
- ЗАПРЕЩЕНО: Perfluence, партнёрские офферы по имени
- Можно говорить обобщённо: «промокоды», «скидки», «подборка», «в одном месте»
`
    : '';

  const hashtagHint = isHoney
    ? 'обязательно #VRNHoney или #мёд; остальные про мёд/магазин; можно #vrnhoney; без Serpmonn'
    : 'обязательно #Serpmonn; остальные на русском (тематика промокодов/скидок/Serpmonn); без чужих брендов';

  return `Ты корпоративный копирайтер. Пишешь посты от лица компании «${brand}» для VK.
Верни ТОЛЬКО JSON без markdown: {"title":"...","body":"...","hashtags":["#..."]}

Продукт: ${brief.name}
Язык: русский
Факты:
${brief.facts.map((f) => `- ${f}`).join('\n')}
Формат: ${isVideo ? 'подпись к короткому видео' : 'текстовый пост VK'}
CTA URL хранится отдельно (можно не дублировать в body): ${ctaUrl || 'n/a'}
${brandRules}
ГОЛОС И ТОН (обязательно):
- Текст от лица компании, не от личного блога автора
- Безличная или корпоративная форма: «в ассортименте», «предлагается», «можно выбрать», «доступно на сайте»; допустимо «мы» как компания
- ЗАПРЕЩЕНО: «я», «мне», «мой/моя», «сегодня решил», «делюсь с вами» от первого лица человека
- Без панибратского тона блогера («друзья», «ну что, погнали»)
Ограничения:
- Бренд: «${brand}»
- Пиши обычный текст ТОЛЬКО по-русски. Английские слова в обычных фразах ЗАПРЕЩЕНЫ
- На латинице допустимы только названия брендов и устоявшиеся термины (Serpmonn, VRNHoney, vrnhoney)
- title: до ${isVideo ? 70 : 90} символов, без спама эмодзи
- body: ${isVideo ? '1–3 коротких предложения, до 280 символов' : '2–5 коротких предложений/строк, до 500 символов'}
- hashtags: массив из 3–5 штук; ${hashtagHint}
- В body НЕ дублируй хештеги — только в поле hashtags
- Без выдуманной статистики
- ${avoid}`;
}

function fixBrandSpelling(text) {
  return String(text || '')
    .replace(/\bSerpenn'?s?\b/gi, 'Serpmonn')
    .replace(/\bSerpentn'?s?\b/gi, 'Serpmonn')
    .replace(/\bSerpmon\b/gi, 'Serpmonn')
    .replace(/\bSerpmonns\b/gi, 'Serpmonn');
}

/** Грубая чистка утечек чужих брендов/кодов из ответа модели. */
function sanitizeBrandOnly(text) {
  let t = String(text || '');
  t = t.replace(/\bPerfluence\b/gi, '');
  t = t.replace(/(?:промо)?код\s*[:：]?\s*[A-Za-zА-Яа-я0-9_-]{4,}/gi, '');
  t = t.replace(/\b[A-Z0-9]{6,14}\b/g, (m) => {
    if (/^SERPMONN$/i.test(m) || /^(20\d{2})$/.test(m)) return m;
    if (/[A-Z]/.test(m) && /\d/.test(m)) return '';
    return m;
  });
  return t.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

/** Латиница только для брендов/терминов; обычный английский вычищаем. */
const LATIN_ALLOW = new Set([
  'serpmonn',
  'vk',
  'ok',
  'dzen',
  'telegram',
  'youtube',
  'rutube',
  'ai',
  'api',
  'pro',
  'app',
  'url',
  'cta',
  'neli',
  'vrnhoney',
  'vrnhoney'
]);

function stripUnauthorizedEnglish(text) {
  const urls = [];
  let t = String(text || '').replace(/https?:\/\/[^\s]+/gi, (u) => {
    urls.push(u);
    return `⟦URL${urls.length - 1}⟧`;
  });
  t = t.replace(/\b[A-Za-z][A-Za-z0-9+.'’_-]*\b/g, (w) => {
    const low = w.toLowerCase();
    if (LATIN_ALLOW.has(low)) return w;
    if (/^serpmonn/i.test(w)) return w;
    if (/^vrnhoney$/i.test(w)) return w;
    return '';
  });
  t = t.replace(/⟦URL(\d+)⟧/g, (_, i) => urls[Number(i)] || '');
  return t
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Убираем личное «я/мне/мой» — корпоративный безличный тон. */
function sanitizeCompanyVoice(text) {
  let t = String(text || '');
  t = t.replace(/\b(я|меня|мне|мной|мою|мой|моя|моё|мое|мои|моих|моим|моими)\b/gi, '');
  t = t.replace(/\b(лично я|сегодня (я )?решил[аи]?|делю(?:сь|сь) с вами)\b/gi, '');
  return t.replace(/[ \t]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function extractJson(text) {
  const raw = String(text || '').trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1].trim() : raw;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('No JSON object in model output');
  return JSON.parse(candidate.slice(start, end + 1));
}

async function callOllama(model, prompt) {
  const signal = AbortSignal.timeout(TIMEOUT_MS);
  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      model,
      stream: false,
      keep_alive: KEEP_ALIVE,
      options: { temperature: 0.85, num_ctx: NUM_CTX },
      messages: [
        {
          role: 'system',
          content: 'You are a concise marketing copywriter. Output JSON only.'
        },
        { role: 'user', content: prompt }
      ]
    })
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}: ${raw.slice(0, 200)}`);
  const data = JSON.parse(raw);
  const content =
    data.message?.content ||
    data.choices?.[0]?.message?.content ||
    '';
  if (!content) throw new Error('Ollama empty content');
  return content;
}

function normalizeCopy(parsed, { product, format, fallbackTitle, fallbackBody, brandOnly }) {
  const fb = fallbackFor(product);
  let title = fixBrandSpelling(String(parsed.title || '').trim().replace(/\s+/g, ' '));
  let body = fixBrandSpelling(String(parsed.body || '').trim());
  if (brandOnly) {
    title = sanitizeBrandOnly(title);
    body = sanitizeBrandOnly(body);
  }
  title = stripUnauthorizedEnglish(title);
  body = stripUnauthorizedEnglish(body);
  title = sanitizeCompanyVoice(title);
  body = sanitizeCompanyVoice(body);
  // хештеги из body уберём — они должны быть в отдельном поле
  body = body
    .replace(/(^|\s)#[\p{L}\p{N}_]+/gu, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (!title) title = fallbackTitle || fb.title;
  if (!body) body = fallbackBody || fb.body;
  title = sanitizeCompanyVoice(title);
  body = sanitizeCompanyVoice(body);
  const maxTitle = format === 'video' ? 90 : 120;
  const maxBody = format === 'video' ? 400 : 800;
  if (title.length > maxTitle) title = title.slice(0, maxTitle - 1).trim() + '…';
  if (body.length > maxBody) body = body.slice(0, maxBody - 1).trim() + '…';

  const hashtags = normalizeHashtags(parsed.hashtags, product);
  return { title, body, hashtags };
}

/** Нормализация хештегов от модели; [] если непригодно. */
function normalizeHashtags(raw, product) {
  let list = [];
  if (Array.isArray(raw)) list = raw;
  else if (typeof raw === 'string') {
    list = raw.split(/[\s,;]+/).filter(Boolean);
  }
  const isHoney = String(product || '').toLowerCase() === 'honey';
  const out = [];
  for (const item of list) {
    let t = String(item || '').trim();
    if (!t) continue;
    if (!t.startsWith('#')) t = `#${t}`;
    t = t.replace(/\s+/g, '');
    if (!/^#[\p{L}\p{N}_]{2,40}$/u.test(t)) continue;
    const core = t.slice(1);
    if (isHoney) {
      if (/serpmonn/i.test(core)) continue;
      if (/[A-Za-z]/.test(core) && !/^(vrnhoney|vrnhoney)$/i.test(core)) continue;
    } else if (/[A-Za-z]/.test(core) && !/^Serpmonn$/i.test(core)) {
      continue;
    }
    out.push(t);
  }
  const uniq = [];
  const seen = new Set();
  for (const t of out) {
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push(t);
  }
  if (isHoney) {
    if (!uniq.some((t) => /мёд|мед|vrnhoney/i.test(t))) uniq.unshift('#VRNHoney');
  } else if (!uniq.some((t) => /^#Serpmonn$/i.test(t))) {
    uniq.unshift('#Serpmonn');
  } else {
    const rest = uniq.filter((t) => !/^#Serpmonn$/i.test(t));
    uniq.length = 0;
    uniq.push('#Serpmonn', ...rest);
  }
  if (uniq.length < 3) return [];
  return uniq.slice(0, 5);
}

async function tryGigaChat(prompt) {
  if (!isGigaChatConfigured()) {
    throw new Error('GIGACHAT_CREDENTIALS not set');
  }
  return enqueueGigaChat(async () => {
    const r = await chatWithGigaChat(
      [
        {
          role: 'system',
          content: 'Ты корпоративный копирайтер. Отвечай только валидным JSON.'
        },
        { role: 'user', content: prompt }
      ],
      { temperature: 0.75, timeoutMs: 45_000 }
    );
    return { content: r.content, model: r.model };
  }, { label: 'copy' });
}

async function tryOllama(prompt) {
  // Только основная модель — fallback часто дублирует ошибку и тянет слот на +45с
  const models = [OLLAMA_MODEL].filter(Boolean);
  if (OLLAMA_FALLBACK && OLLAMA_FALLBACK !== OLLAMA_MODEL) {
    models.push(OLLAMA_FALLBACK);
  }
  let lastErr = null;
  for (const model of models.slice(0, 1)) {
    try {
      const content = await callOllama(model, prompt);
      return { content, model: `ollama:${model}` };
    } catch (err) {
      lastErr = err;
      console.warn('[marketing] ollama', model, err.message);
    }
  }
  throw lastErr || new Error('Ollama failed');
}

/**
 * Приоритет: 1) GigaChat  2) Ollama  3) пул шаблонов.
 * @returns {{ title, body, hashtags, model, generated, engine, error? }}
 */
export async function generateMarketingCopy({
  product,
  format = 'text',
  ctaUrl = '',
  fallbackTitle = '',
  fallbackBody = '',
  avoidTitles,
  salt = ''
} = {}) {
  const brief = briefFor(product);
  const fb = fallbackFor(product, salt || `${product}-${ctaUrl}-${(avoidTitles || []).join('|')}`);
  const avoid = avoidTitles || (await recentTitles(product, 8));
  const prompt = buildPrompt({
    product,
    format,
    ctaUrl,
    avoidTitles: avoid
  });

  const engines = [];
  if (isGigaChatConfigured()) {
    engines.push({ name: 'gigachat', run: () => tryGigaChat(prompt) });
  }
  // Слабая модель — всегда после сильной
  engines.push({ name: 'ollama', run: () => tryOllama(prompt) });

  let lastErr = null;
  for (const eng of engines) {
    try {
      const { content, model } = await eng.run();
      const parsed = extractJson(content);
      const copy = normalizeCopy(parsed, {
        product,
        format,
        fallbackTitle: fallbackTitle || fb.title,
        fallbackBody: fallbackBody || fb.body,
        brandOnly: brief.brandOnly
      });
      return {
        title: copy.title,
        body: copy.body,
        hashtags: copy.hashtags || [],
        model,
        engine: eng.name,
        generated: true
      };
    } catch (err) {
      lastErr = err;
      console.warn('[marketing] generate-copy', eng.name, err.message);
    }
  }

  return {
    title: fallbackTitle || fb.title,
    body: fallbackBody || fb.body,
    hashtags: [],
    model: null,
    engine: 'template',
    generated: false,
    error:
      lastErr?.message ||
      (isGigaChatCoolingDown()
        ? `GigaChat cooldown: ${getGigaChatCooldownReason() || 'wait'}`
        : 'generation failed')
  };
}

export async function marketingOllamaHealth() {
  try {
    const base = OLLAMA_URL.replace(/\/api\/chat$/, '');
    const res = await fetch(`${base}/api/tags`, {
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}`, model: OLLAMA_MODEL };
    const data = await res.json();
    const names = (data.models || []).map((m) => m.name);
    const has =
      names.includes(OLLAMA_MODEL) ||
      names.some((n) => n.startsWith(OLLAMA_MODEL.split(':')[0]));
    return {
      ok: has,
      detail: has
        ? `модель ${OLLAMA_MODEL}`
        : `нет ${OLLAMA_MODEL}; есть: ${names.slice(0, 5).join(', ')}`,
      model: OLLAMA_MODEL,
      models: names,
      gigachat: isGigaChatConfigured()
    };
  } catch (err) {
    return {
      ok: false,
      detail: err.message || String(err),
      model: OLLAMA_MODEL,
      gigachat: isGigaChatConfigured()
    };
  }
}
