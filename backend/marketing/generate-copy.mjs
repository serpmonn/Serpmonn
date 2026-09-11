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

const GAMES_FALLBACKS = [
  {
    title: 'Игры на Serpmonn',
    body:
      'Браузерные мини-игры собраны в одном разделе Serpmonn.\nЗапуск без установки — сразу в браузере.'
  },
  {
    title: 'Досуг без скачивания',
    body:
      'В разделе игр Serpmonn доступны короткие браузерные игры.\nУдобно открыть и поиграть прямо на сайте.'
  },
  {
    title: 'Мини-игры Serpmonn',
    body:
      'Подборка браузерных игр на Serpmonn — без приложений и лишних установок.\nРаздел игр всегда под рукой.'
  }
];

const PARTNERS_FALLBACKS = [
  {
    title: 'Партнёрская сеть Serpmonn',
    body:
      'Рекламодатели размещают офферы, владельцы площадок ставят ссылки и получают оплату за заявки и продажи.\nПодключение — в партнёрской сети Serpmonn.'
  },
  {
    title: 'Оплата за результат',
    body:
      'В партнёрской сети Serpmonn деньги идут за реальные заявки и продажи, а не только за показы.\nУдобно и рекламодателям, и паблишерам.'
  },
  {
    title: 'Офферы и партнёрские ссылки',
    body:
      'Serpmonn объединяет рекламодателей и площадки в одной партнёрской сети.\nСтатистика и ссылки — в личном кабинете.'
  }
];

const NEON_FALLBACKS = [
  {
    title: 'Neon Runner на Android',
    body:
      'Бесконечный неоновый раннер Neon Runner — аркада для Android.\nСкачать APK можно на serpmonn.ru/neon-runner.'
  },
  {
    title: 'Аркада Neon Runner',
    body:
      'Neon Runner — мобильный endless runner с неоновым стилем.\nУстановка APK доступна на сайте Serpmonn.'
  },
  {
    title: 'Скачать Neon Runner',
    body:
      'Короткие забеги в неоновом мире Neon Runner.\nAPK для Android — на serpmonn.ru/neon-runner.'
  }
];

const BRAND_FALLBACKS = {
  promocodes: PROMO_FALLBACKS[0],
  honey: HONEY_FALLBACKS[0],
  games: GAMES_FALLBACKS[0],
  partners: PARTNERS_FALLBACKS[0],
  neon_runner: NEON_FALLBACKS[0],
  neli: {
    title: 'Neli на Serpmonn',
    body: 'Короткая браузерная игра Neli доступна в разделе игр Serpmonn — без установки.'
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
  games: {
    name: 'Раздел игр Serpmonn',
    lang: 'ru',
    brandOnly: true,
    brandName: 'Serpmonn',
    facts: [
      'Serpmonn — сервис с разделом браузерных мини-игр',
      'Игры запускаются в браузере без установки приложений',
      'Neli и другие игры — внутри раздела игр, не отдельные продукты рекламы',
      'Цель поста: привести на https://serpmonn.ru/games',
      'Можно: Serpmonn, игры, мини-игры, браузер, досуг, без скачивания',
      'ЗАПРЕЩЕНО: чужие игровые бренды, названия чужих игр (кроме общих слов), магазины приложений'
    ]
  },
  partners: {
    name: 'Партнёрская сеть Serpmonn',
    lang: 'ru',
    brandOnly: true,
    brandName: 'Serpmonn',
    facts: [
      'Партнёрская сеть Serpmonn: рекламодатели размещают офферы, паблишеры ставят ссылки на площадках',
      'Оплата за заявки и продажи (CPA), а не просто за показы',
      'Есть вход и регистрация, роли: рекламодатель и паблишер',
      'Цель поста: привести на https://serpmonn.ru/partners',
      'В тексте и на кадре Shorts прикрепляй/показывай ссылку serpmonn.ru/partners',
      'Можно: Serpmonn, партнёрская сеть, офферы, паблишеры, рекламодатели, конверсии, статистика',
      'ЗАПРЕЩЕНО: чужие CPA-сети по имени, обещания «гарантированного дохода», конкретные суммы выплат'
    ]
  },
  neon_runner: {
    name: 'Neon Runner — Android-игра',
    lang: 'ru',
    brandOnly: true,
    brandName: 'Serpmonn',
    facts: [
      'Neon Runner — бесплатный endless runner / аркада для Android от Serpmonn',
      'Скачивание APK: https://serpmonn.ru/neon-runner',
      'В APK встроена реклама Yandex РСЯ (interstitial / rewarded)',
      'Цель поста: привести к скачиванию APK Neon Runner',
      'Можно: Neon Runner, Android, аркада, раннер, неон, Serpmonn, APK',
      'ЗАПРЕЩЕНО: чужие игровые бренды, обещания «без рекламы», выдуманные рейтинги магазинов',
      'Не путать с браузерными играми раздела serpmonn.ru/games — это отдельное Android-приложение'
    ]
  },
  neli: {
    name: 'Neli (игра в разделе Serpmonn)',
    lang: 'ru',
    brandOnly: true,
    brandName: 'Serpmonn',
    facts: [
      'Neli — браузерная игра внутри раздела игр Serpmonn, не отдельный рекламный продукт',
      'Без установки',
      'CTA лучше вести на раздел игр: https://serpmonn.ru/games'
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
  if (
    key === 'promocodes' ||
    key === 'honey' ||
    key === 'games' ||
    key === 'partners' ||
    key === 'neon_runner'
  ) {
    const pool =
      key === 'honey'
        ? HONEY_FALLBACKS
        : key === 'games'
          ? GAMES_FALLBACKS
          : key === 'partners'
            ? PARTNERS_FALLBACKS
            : key === 'neon_runner'
              ? NEON_FALLBACKS
              : PROMO_FALLBACKS;
    let h = 0;
    const s = String(salt || Date.now());
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return pool[h % pool.length];
  }
  return BRAND_FALLBACKS[key] || BRAND_FALLBACKS.default;
}

async function recentTitles(product, { days = 14, limit = 40 } = {}) {
  try {
    const lim = Math.min(60, Math.max(1, Number(limit) || 40));
    const d = Math.min(30, Math.max(7, Number(days) || 14));
    const rows = await query(
      `SELECT title FROM marketing_queue
       WHERE product = ?
         AND title IS NOT NULL AND title <> ''
         AND created_at >= (NOW() - INTERVAL ${d} DAY)
       ORDER BY id DESC
       LIMIT ${lim}`,
      [String(product || '').slice(0, 64)]
    );
    return (rows || []).map((r) => String(r.title || '').trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function normalizeTitleKey(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Похожесть заголовков: точное совпадение или сильное пересечение слов. */
export function titlesTooSimilar(a, b) {
  const na = normalizeTitleKey(a);
  const nb = normalizeTitleKey(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.includes(nb) || nb.includes(na)) {
    const shorter = Math.min(na.length, nb.length);
    const longer = Math.max(na.length, nb.length);
    if (shorter >= 12 && shorter / longer >= 0.72) return true;
  }
  const wa = new Set(na.split(' ').filter((w) => w.length > 2));
  const wb = new Set(nb.split(' ').filter((w) => w.length > 2));
  if (wa.size < 2 || wb.size < 2) return false;
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter += 1;
  const union = wa.size + wb.size - inter;
  return union > 0 && inter / union >= 0.55;
}

function titleCollidesWithRecent(title, recent) {
  return (recent || []).some((t) => titlesTooSimilar(title, t));
}

function buildPrompt({ product, format, ctaUrl, avoidTitles }) {
  const brief = briefFor(product);
  const isVideo = format === 'video';
  const isHoney = String(product || '').toLowerCase() === 'honey';
  const isGames = String(product || '').toLowerCase() === 'games';
  const brand = brief.brandName || (isHoney ? 'VRNHoney' : 'Serpmonn');
  const avoid =
    avoidTitles?.length
      ? `Не повторяй и не перефразируй близко эти заголовки за последние 2 недели:\n- ${avoidTitles.join('\n- ')}\nСделай другой угол и другие ключевые слова.`
      : 'Сделай свежий угол, без шаблонного звучания.';

  const brandRules = brief.brandOnly
    ? isHoney
      ? `
ЖЁСТКИЕ ПРАВИЛА (бренд VRNHoney):
- Рекламируй ТОЛЬКО бренд VRNHoney и магазин vrnhoney.ru
- НЕ упоминай Serpmonn, промокоды, скидочные агрегаторы
- Можно: мёд, сорта, польза, качество, пасека, доставка, интернет-магазин
`
      : isGames
        ? `
ЖЁСТКИЕ ПРАВИЛА (раздел игр Serpmonn):
- Рекламируй ТОЛЬКО Serpmonn и раздел браузерных игр
- Цель: привести на serpmonn.ru/games
- ЗАПРЕЩЕНО: чужие игровые бренды, чужие названия игр, Steam/App Store/Google Play как CTA
- Можно: браузерные игры, мини-игры, без установки, досуг, «в одном разделе»
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
    ? 'обязательно #VRNHoney или #мёд; можно русские и английские (#honey #natural); без Serpmonn'
    : isGames
      ? 'обязательно #Serpmonn; можно русские и английские (#games #browsergames); без чужих брендов'
      : 'обязательно #Serpmonn; можно русские и английские (#promo #deals #coupons); без чужих брендов магазинов';

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
- Строго безличная форма: «в ассортименте», «предлагается», «можно выбрать», «доступно на сайте», «в разделе собраны»
- ЗАПРЕЩЕНО любое 1-е лицо: «я/мне/мой», «мы/нам/нас», «наш/наша/наше/нашем/наши», «сегодня решили», «делимся с вами»
- Пиши «в разделе собраны», НЕ «в нашем разделе»
- Без панибратского тона блогера («друзья», «ну что, погнали»)
Ограничения:
- Бренд: «${brand}»
- Пиши обычный текст ТОЛЬКО по-русски. Английские слова в обычных фразах ЗАПРЕЩЕНЫ
- На латинице допустимы только названия брендов и устоявшиеся термины (Serpmonn, VRNHoney, vrnhoney)
- title: до ${isVideo ? 48 : 90} символов, без спама эмодзи; для видео — короткая цепкая фраза (не длинное предложение)
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

/** Граница слова для кириллицы (JS \\b с Unicode ненадёжен). */
const WB = String.raw`(?<![\p{L}\p{N}_])`;
const WE = String.raw`(?![\p{L}\p{N}_])`;

/** Убираем 1-е лицо (я/мы/наш*) — строго безличный тон. */
export function sanitizeCompanyVoice(text) {
  let t = String(text || '');
  // частые конструкции целиком
  t = t.replace(
    new RegExp(`${WB}в\\s+наш(?:ем|ей|его|ему|им|ими|их|а|е|и)?\\s+разделе${WE}`, 'giu'),
    'в разделе'
  );
  t = t.replace(
    new RegExp(`${WB}наш(?:а|е|и|его|ей|ему|им|ими|их|ем)?\\s+раздел${WE}`, 'giu'),
    'раздел'
  );
  t = t.replace(
    new RegExp(`${WB}наш(?:а|е|и|его|ей|ему|им|ими|их|ем)?\\s+подборк[а-яё]*${WE}`, 'giu'),
    'подборка'
  );
  t = t.replace(
    new RegExp(`${WB}наш(?:а|е|и|его|ей|ему|им|ими|их|ем)?\\s+сервис${WE}`, 'giu'),
    'сервис'
  );
  t = t.replace(
    new RegExp(`${WB}наш(?:а|е|и|его|ей|ему|им|ими|их|ем)?\\s+сайт${WE}`, 'giu'),
    'сайт'
  );
  t = t.replace(
    new RegExp(
      `${WB}(я|меня|мне|мной|мною|мою|мой|моя|моё|мое|мои|моих|моим|моими|моём|моем)${WE}`,
      'giu'
    ),
    ''
  );
  t = t.replace(
    new RegExp(
      `${WB}(мы|нас|нам|нами|наш|наша|наше|нашего|нашей|нашему|нашим|нашими|наших|наши|нашем|нашём)${WE}`,
      'giu'
    ),
    ''
  );
  t = t.replace(
    new RegExp(
      `${WB}(лично\\s+я|сегодня\\s+(мы\\s+|я\\s+)?решил[аи]?|дел(?:юсь|имся)\\s+с\\s+вами)${WE}`,
      'giu'
    ),
    ''
  );
  // остатки глаголов 1 л. мн.ч.
  t = t.replace(new RegExp(`${WB}предлагаем${WE}`, 'giu'), 'предлагается');
  t = t.replace(new RegExp(`${WB}рекомендуем${WE}`, 'giu'), 'рекомендуется');
  t = t.replace(new RegExp(`${WB}приглашаем${WE}`, 'giu'), 'можно перейти');
  t = t.replace(new RegExp(`${WB}собрали${WE}`, 'giu'), 'собраны');
  t = t
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^[,.\s]+/gm, '')
    .trim();
  // заглавная в начале предложений
  t = t.replace(/(^|[.!?]\s+)(\p{Ll})/gu, (_, a, ch) => a + ch.toUpperCase());
  return t;
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
  const maxTitle = format === 'video' ? 48 : 120;
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
    // рус / англ буквы, цифры, _
    if (!/^#[\p{L}\p{N}_]{2,40}$/u.test(t)) continue;
    const core = t.slice(1);
    if (isHoney && /serpmonn/i.test(core)) continue;
    // чужие бренды-магазины не пускаем даже на EN
    if (/perfluence|amazon|wildberries|ozon|aliexpress|steam/i.test(core)) continue;
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
    if (!uniq.some((t) => /мёд|мед|vrnhoney|honey/i.test(t))) uniq.unshift('#VRNHoney');
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
  const avoid = avoidTitles || (await recentTitles(product, { days: 14, limit: 40 }));
  const prompt = buildPrompt({
    product,
    format,
    ctaUrl,
    avoidTitles: avoid
  });

  const engines = [];
  if (isGigaChatConfigured()) {
    engines.push({ name: 'gigachat', run: (p) => tryGigaChat(p) });
  }
  engines.push({ name: 'ollama', run: (p) => tryOllama(p) });

  let lastErr = null;
  for (const eng of engines) {
    try {
      let promptNow = prompt;
      let copy = null;
      let model = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        const out = await eng.run(promptNow);
        model = out.model;
        const parsed = extractJson(out.content);
        copy = normalizeCopy(parsed, {
          product,
          format,
          fallbackTitle: fallbackTitle || fb.title,
          fallbackBody: fallbackBody || fb.body,
          brandOnly: brief.brandOnly
        });
        if (!titleCollidesWithRecent(copy.title, avoid) || attempt === 1) break;
        promptNow = buildPrompt({
          product,
          format,
          ctaUrl,
          avoidTitles: [...avoid, copy.title]
        });
      }
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
      console.warn('[marketing] copy', eng.name, err.message);
      if (eng.name === 'gigachat') {
        noteGigaChatFailure(err);
      }
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
