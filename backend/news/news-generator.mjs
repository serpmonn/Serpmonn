import dotenv from 'dotenv';
import { fetchSearxViaCurl } from '../utils/fetchSearxViaCurl.js';
import { query as dbQuery } from '../database/config.mjs';

dotenv.config({ path: '/var/www/serpmonn.ru/backend/.env' });

const OLLAMA_URL = 'http://127.0.0.1:11434/api/chat';
const OLLAMA_MAIN_MODEL = 'serpmonn-ai-search:latest';
const OLLAMA_FAST_MODEL = 'serpmonn-ai-fast:latest';

// Языки для которых генерируем новости заранее
export const SUPPORTED_LANGS = ['en', 'ru', 'tr', 'ar', 'es', 'de'];
export const FALLBACK_LANG = 'en';

// Промпты для каждого языка
const LANG_PROMPTS = {
  en: 'You are a news editor. Reply ONLY with valid JSON, no extra text: {"title":"headline up to 12 words","body":"2-3 sentences with facts only"}. Facts only. No filler phrases. Reply in English.',
  ru: 'Ты редактор новостей. Ответь ТОЛЬКО валидным JSON, без лишнего текста: {"title":"заголовок до 12 слов","body":"2-3 предложения с фактами"}. Только факты. Без вводных слов. Язык — русский.',
  tr: 'Bir haber editörüsün. SADECE geçerli JSON ile yanıtla, ekstra metin yok: {"title":"12 kelimeye kadar başlık","body":"2-3 cümle, sadece gerçekler"}. Sadece gerçekler. Türkçe yanıt ver.',
  ar: 'أنت محرر أخبار. أجب فقط بـ JSON صالح بدون نص إضافي: {"title":"عنوان حتى 12 كلمة","body":"2-3 جمل بالحقائق فقط"}. حقائق فقط. الرد بالعربية.',
  es: 'Eres editor de noticias. Responde SOLO con JSON válido, sin texto extra: {"title":"titular hasta 12 palabras","body":"2-3 oraciones con hechos"}. Solo hechos. Responde en español.',
  de: 'Du bist Nachrichtenredakteur. Antworte NUR mit gültigem JSON, kein Extra-Text: {"title":"Überschrift bis 12 Wörter","body":"2-3 Sätze mit Fakten"}. Nur Fakten. Antwort auf Deutsch.',
};

const LANG_FAST_PROMPTS = {
  en: 'News editor. Reply ONLY JSON: {"title":"...","body":"..."}. English.',
  ru: 'Редактор новостей. Ответь ТОЛЬКО JSON: {"title":"...","body":"..."}. Язык — русский.',
  tr: 'Haber editörü. SADECE JSON: {"title":"...","body":"..."}. Türkçe.',
  ar: 'محرر أخبار. فقط JSON: {"title":"...","body":"..."}. عربي.',
  es: 'Editor noticias. Solo JSON: {"title":"...","body":"..."}. Español.',
  de: 'Nachrichtenredakteur. Nur JSON: {"title":"...","body":"..."}. Deutsch.',
};

// Темы для глобальной новостной ленты
const NEWS_TOPICS = [
  { key: 'tech',     label: 'Technology', query: 'technology news today' },
  { key: 'ai',       label: 'AI',         query: 'artificial intelligence news today' },
  { key: 'science',  label: 'Science',    query: 'science discoveries news today' },
  { key: 'world',    label: 'World',      query: 'world news today' },
  { key: 'russia',   label: 'Russia',     query: 'Russia news today' },
  { key: 'space',    label: 'Space',      query: 'space exploration news today' },
  { key: 'business', label: 'Business',   query: 'global economy business news today' },
  { key: 'games',    label: 'Games',      query: 'gaming news today' },
  { key: 'health',   label: 'Health',     query: 'health medicine news today' },
  { key: 'sports',   label: 'Sports',     query: 'sports news today' },
];

// In-memory кэш — ключ: "topic_key:lang"
let newsCache = new Map();
let cacheUpdatedAt = null;

export function getNewsCache() {
  return newsCache;
}

export function getCacheUpdatedAt() {
  return cacheUpdatedAt;
}

export function getAllTopics() {
  return NEWS_TOPICS;
}

// Определяем эффективный язык — если не поддерживается, отдаём fallback
export function resolveLang(lang) {
  return SUPPORTED_LANGS.includes(lang) ? lang : FALLBACK_LANG;
}

// Загружаем кэш из БД
export async function refreshCache() {
  try {
    const rows = await dbQuery(
      `SELECT id, topic_key, lang, title, body, cover_url, sources, generated_at
       FROM news_feed
       ORDER BY generated_at DESC
       LIMIT 1800`
    );

    const grouped = new Map();
    for (const row of rows) {
      const cacheKey = `${row.topic_key}:${row.lang}`;
      if (!grouped.has(cacheKey)) grouped.set(cacheKey, []);
      grouped.get(cacheKey).push({
        ...row,
        sources: typeof row.sources === 'string' ? JSON.parse(row.sources) : row.sources,
      });
    }

    newsCache = grouped;
    cacheUpdatedAt = new Date();
    console.log(`[News] Кэш обновлён: ${rows.length} новостей по ${grouped.size} ключам`);
  } catch (e) {
    console.error('[News] Ошибка обновления кэша:', e.message);
  }
}

// Вызов Ollama
async function callOllamaForNews(webContext, topicLabel, lang) {
  const systemPrompt = LANG_PROMPTS[lang] || LANG_PROMPTS[FALLBACK_LANG];

  const body = {
    model: OLLAMA_MAIN_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `TOPIC: ${topicLabel}\n\nWEB DATA:\n${webContext}` },
    ],
    stream: false,
    options: { temperature: 0.3, num_predict: 220 },
  };

  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
  const data = await res.json();
  const raw = data.message?.content || '';
  const match = raw.match(/\{[\s\S]*?\}/);
  if (!match) throw new Error('Ollama не вернул JSON');
  return JSON.parse(match[0]);
}

async function callOllamaFast(webContext, topicLabel, lang) {
  const systemPrompt = LANG_FAST_PROMPTS[lang] || LANG_FAST_PROMPTS[FALLBACK_LANG];

  const body = {
    model: OLLAMA_FAST_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `TOPIC: ${topicLabel}\nDATA:\n${webContext}` },
    ],
    stream: false,
    options: { temperature: 0.3, num_predict: 220 },
  };

  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Ollama Fast HTTP ${res.status}`);
  const data = await res.json();
  const raw = data.message?.content || '';
  const match = raw.match(/\{[\s\S]*?\}/);
  if (!match) throw new Error('Ollama Fast не вернул JSON');
  return JSON.parse(match[0]);
}

// Генерация одной новости по теме и языку
async function generateOneNews(topic, lang) {
  const data = await fetchSearxViaCurl(topic.query, 'news');
  const results = (data.results || []).slice(0, 5);

  if (!results.length) {
    console.warn(`[News] SearXNG пустой результат: ${topic.key} / ${lang}`);
    return null;
  }

  const cover_url = results.find(r => r.img_src)?.img_src || null;
  const sources = results
    .filter(r => r.url)
    .slice(0, 4)
    .map(r => ({
      title: r.title || new URL(r.url).hostname.replace('www.', ''),
      url: r.url,
    }));

  const webContext = results
    .map(r => `Title: ${r.title}\nText: ${r.content || r.summary || ''}`.trim())
    .join('\n\n');

  let newsItem;
  try {
    newsItem = await callOllamaForNews(webContext, topic.label, lang);
  } catch (e) {
    console.warn(`[News] Основная модель упала (${topic.key}/${lang}): ${e.message}, пробуем fast...`);
    try {
      newsItem = await callOllamaFast(webContext, topic.label, lang);
    } catch (e2) {
      console.error(`[News] Обе модели упали для ${topic.key}/${lang}:`, e2.message);
      return null;
    }
  }

  if (!newsItem?.title || !newsItem?.body) {
    console.warn(`[News] Пустой результат от модели: ${topic.key}/${lang}`);
    return null;
  }

  return {
    topic_key: topic.key,
    lang,
    title: newsItem.title,
    body: newsItem.body,
    cover_url,
    sources: JSON.stringify(sources),
  };
}

// Основная функция генерации
export async function generateAllNews() {
  console.log('[News] Начинаем генерацию новостей...');
  const start = Date.now();

  try {
    await dbQuery('DELETE FROM news_feed WHERE generated_at < NOW() - INTERVAL 3 DAY');
  } catch (e) {
    console.warn('[News] Ошибка очистки старых новостей:', e.message);
  }

  let successCount = 0;
  const total = NEWS_TOPICS.length * SUPPORTED_LANGS.length;

  // Внешний цикл по темам, внутренний по языкам
  for (const topic of NEWS_TOPICS) {
    // SearXNG запрашиваем один раз на тему — данные одни и те же
    const data = await fetchSearxViaCurl(topic.query, 'news').catch(() => ({ results: [] }));
    const results = (data.results || []).slice(0, 5);

    if (!results.length) {
      console.warn(`[News] SearXNG пустой результат для темы: ${topic.key}`);
      continue;
    }

    const cover_url = results.find(r => r.img_src)?.img_src || null;
    const sources = results
      .filter(r => r.url)
      .slice(0, 4)
      .map(r => ({ title: r.title || new URL(r.url).hostname.replace('www.', ''), url: r.url }));
    const webContext = results
      .map(r => `Title: ${r.title}\nText: ${r.content || r.summary || ''}`.trim())
      .join('\n\n');

    for (const lang of SUPPORTED_LANGS) {
      try {
        let newsItem;
        try {
          newsItem = await callOllamaForNews(webContext, topic.label, lang);
        } catch (e) {
          console.warn(`[News] Основная модель упала (${topic.key}/${lang}): ${e.message}`);
          newsItem = await callOllamaFast(webContext, topic.label, lang);
        }

        if (!newsItem?.title || !newsItem?.body) continue;

        await dbQuery(
          `INSERT INTO news_feed (topic_key, lang, title, body, cover_url, sources, generated_at)
           VALUES (?, ?, ?, ?, ?, ?, NOW())`,
          [topic.key, lang, newsItem.title, newsItem.body, cover_url, JSON.stringify(sources)]
        );

        successCount++;
        console.log(`[News] ✓ ${topic.key}/${lang}: ${newsItem.title.slice(0, 50)}`);
      } catch (e) {
        console.error(`[News] Ошибка ${topic.key}/${lang}:`, e.message);
      }

      // Пауза между языками — щадим Ollama
      await new Promise(r => setTimeout(r, 800));
    }

    // Пауза между темами
    await new Promise(r => setTimeout(r, 1000));
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[News] Генерация завершена: ${successCount}/${total} новостей за ${elapsed}s`);

  await refreshCache();
}
