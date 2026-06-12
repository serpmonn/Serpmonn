import dotenv from 'dotenv';
import { fetchSearxViaCurl } from '../utils/fetchSearxViaCurl.js';
import { query as dbQuery } from '../database/config.mjs';

dotenv.config({ path: '/var/www/serpmonn.ru/backend/.env' });

const OLLAMA_URL = 'http://127.0.0.1:11434/api/chat';
const OLLAMA_MAIN_MODEL = 'serpmonn-ai-search:latest';
const OLLAMA_FAST_MODEL = 'serpmonn-ai-fast:latest';

// Темы для глобальной новостной ленты
const NEWS_TOPICS = [
  { key: 'tech',     label: 'Технологии', query: 'technology news today' },
  { key: 'ai',       label: 'ИИ',         query: 'artificial intelligence news today' },
  { key: 'science',  label: 'Наука',      query: 'science discoveries news today' },
  { key: 'world',    label: 'Мир',        query: 'world news today' },
  { key: 'russia',   label: 'Россия',     query: 'Россия новости сегодня' },
  { key: 'space',    label: 'Космос',     query: 'space exploration news today' },
  { key: 'business', label: 'Бизнес',     query: 'global economy business news today' },
  { key: 'games',    label: 'Игры',       query: 'gaming news today' },
  { key: 'health',   label: 'Здоровье',   query: 'health medicine news today' },
  { key: 'sports',   label: 'Спорт',      query: 'sports news today' },
];

// In-memory кэш — пользователи читают отсюда, нулевая нагрузка на БД
let newsCache = new Map(); // topic_key → [{ id, title, body, cover_url, sources, generated_at }]
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

// Загружаем кэш из БД (при старте сервера и после каждой генерации)
export async function refreshCache() {
  try {
    const rows = await dbQuery(
      `SELECT id, topic_key, title, body, cover_url, sources, generated_at
       FROM news_feed
       ORDER BY generated_at DESC
       LIMIT 300`
    );

    const grouped = new Map();
    for (const row of rows) {
      if (!grouped.has(row.topic_key)) grouped.set(row.topic_key, []);
      grouped.get(row.topic_key).push({
        ...row,
        sources: typeof row.sources === 'string' ? JSON.parse(row.sources) : row.sources,
      });
    }

    newsCache = grouped;
    cacheUpdatedAt = new Date();
    console.log(`[News] Кэш обновлён: ${rows.length} новостей по ${grouped.size} темам`);
  } catch (e) {
    console.error('[News] Ошибка обновления кэша:', e.message);
  }
}

// Вызов Ollama для генерации новостной заметки
async function callOllamaForNews(webContext, topicLabel) {
  const body = {
    model: OLLAMA_MAIN_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'Ты редактор новостей. На основе предоставленных данных напиши короткую новостную заметку. ' +
          'Ответь ТОЛЬКО валидным JSON без лишнего текста, в формате: ' +
          '{"title":"заголовок до 12 слов","body":"2-3 предложения с фактами"}. ' +
          'Только факты. Без вводных слов. Язык — русский.',
      },
      {
        role: 'user',
        content: `ТЕМА: ${topicLabel}\n\nДАННЫЕ ИЗ СЕТИ:\n${webContext}`,
      },
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

  // Вырезаем JSON из ответа (на случай если модель добавила текст вокруг)
  const match = raw.match(/\{[\s\S]*?\}/);
  if (!match) throw new Error('Ollama не вернул JSON');

  return JSON.parse(match[0]);
}

// Резервный вызов на быстрой модели
async function callOllamaFast(webContext, topicLabel) {
  const body = {
    model: OLLAMA_FAST_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'Ты редактор новостей. Ответь ТОЛЬКО JSON: {"title":"...","body":"..."}. Язык — русский.',
      },
      {
        role: 'user',
        content: `ТЕМА: ${topicLabel}\nДАННЫЕ:\n${webContext}`,
      },
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

// Генерация одной новости по теме
async function generateOneNews(topic) {
  // 1. Ищем новости через SearXNG (категория news)
  const data = await fetchSearxViaCurl(topic.query, 'news');
  const results = (data.results || []).slice(0, 5);

  if (!results.length) {
    console.warn(`[News] SearXNG вернул пустой результат для темы: ${topic.key}`);
    return null;
  }

  // 2. Картинка — берём первую img_src из результатов
  const cover_url = results.find(r => r.img_src)?.img_src || null;

  // 3. Источники для отображения
  const sources = results
    .filter(r => r.url)
    .slice(0, 4)
    .map(r => ({
      title: r.title || new URL(r.url).hostname.replace('www.', ''),
      url: r.url,
    }));

  // 4. Контекст для Ollama
  const webContext = results
    .map(r => `Заголовок: ${r.title}\nТекст: ${r.content || r.summary || ''}`.trim())
    .join('\n\n');

  // 5. Генерируем новость через Ollama (основная → резервная)
  let newsItem;
  try {
    newsItem = await callOllamaForNews(webContext, topic.label);
  } catch (e) {
    console.warn(`[News] Основная модель упала (${topic.key}): ${e.message}, пробуем fast...`);
    try {
      newsItem = await callOllamaFast(webContext, topic.label);
    } catch (e2) {
      console.error(`[News] Обе модели упали для темы ${topic.key}:`, e2.message);
      return null;
    }
  }

  if (!newsItem?.title || !newsItem?.body) {
    console.warn(`[News] Пустой результат от модели для темы ${topic.key}`);
    return null;
  }

  return {
    topic_key: topic.key,
    title: newsItem.title,
    body: newsItem.body,
    cover_url,
    sources: JSON.stringify(sources),
  };
}

// Основная функция генерации — вызывается по крону
export async function generateAllNews() {
  console.log('[News] Начинаем генерацию новостей...');
  const start = Date.now();

  // Удаляем старые новости (старше 3 дней)
  try {
    await dbQuery('DELETE FROM news_feed WHERE generated_at < NOW() - INTERVAL 3 DAY');
  } catch (e) {
    console.warn('[News] Ошибка очистки старых новостей:', e.message);
  }

  // Генерируем по одной теме (не параллельно — щадим сервер и Ollama)
  let successCount = 0;
  for (const topic of NEWS_TOPICS) {
    try {
      const item = await generateOneNews(topic);
      if (!item) continue;

      await dbQuery(
        `INSERT INTO news_feed (topic_key, title, body, cover_url, sources, generated_at)
         VALUES (?, ?, ?, ?, ?, NOW())`,
        [item.topic_key, item.title, item.body, item.cover_url, item.sources]
      );

      successCount++;
      console.log(`[News] ✓ ${topic.key}: ${item.title.slice(0, 60)}`);
    } catch (e) {
      console.error(`[News] Ошибка сохранения новости (${topic.key}):`, e.message);
    }

    // Пауза между темами — не перегружаем Ollama
    await new Promise(r => setTimeout(r, 1500));
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`[News] Генерация завершена: ${successCount}/${NEWS_TOPICS.length} новостей за ${elapsed}s`);

  // Обновляем кэш в памяти
  await refreshCache();
}
