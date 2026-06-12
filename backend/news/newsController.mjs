import paseto from 'paseto';
import dotenv from 'dotenv';
import { query as dbQuery } from '../database/config.mjs';
import {
  getNewsCache,
  getCacheUpdatedAt,
  getAllTopics,
  refreshCache,
  generateAllNews,
} from './news-generator.mjs';

dotenv.config({ path: '/var/www/serpmonn.ru/backend/.env' });
const { V2 } = paseto;
const secretKey = process.env.SECRET_KEY;

// Извлекаем user_id из куки (или null для гостя)
async function getUserIdFromReq(req) {
  const token = req.cookies?.token;
  if (!token || !secretKey) return null;
  try {
    const payload = await V2.verify(token, secretKey);
    return payload?.id || null;
  } catch {
    return null;
  }
}

// Дефолтные предпочтения (для гостей и новых пользователей)
const DEFAULT_WEIGHTS = {
  world: 1.0,
  tech: 1.0,
  ai: 1.0,
  science: 1.0,
  russia: 1.0,
  space: 1.0,
  business: 1.0,
  games: 1.0,
  health: 1.0,
  sports: 1.0,
};

// Получаем веса тем пользователя из БД
async function getUserWeights(userId) {
  if (!userId) return DEFAULT_WEIGHTS;

  try {
    const rows = await dbQuery(
      'SELECT topic_key, weight FROM user_news_prefs WHERE user_id = ?',
      [userId]
    );

    if (!rows.length) return DEFAULT_WEIGHTS;

    const weights = { ...DEFAULT_WEIGHTS };
    for (const row of rows) {
      weights[row.topic_key] = row.weight;
    }
    return weights;
  } catch (e) {
    console.error('[News] Ошибка получения предпочтений:', e.message);
    return DEFAULT_WEIGHTS;
  }
}

// Собираем персонализированную ленту из кэша
function buildFeed(weights, topicFilter) {
  const cache = getNewsCache();
  const feed = [];

  for (const [topicKey, items] of cache.entries()) {
    // Если задан фильтр по теме — берём только её
    if (topicFilter && topicFilter !== topicKey) continue;

    const weight = weights[topicKey] || 1.0;
    // Чем выше вес — тем больше новостей из этой темы показываем
    const count = Math.max(1, Math.round(3 * weight));

    for (const item of items.slice(0, count)) {
      feed.push({ ...item, weight });
    }
  }

  // Сортируем: сначала любимые темы, внутри — по дате
  feed.sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    return new Date(b.generated_at) - new Date(a.generated_at);
  });

  // Убираем вспомогательное поле weight из ответа
  return feed.map(({ weight, ...item }) => item);
}

// GET /news — получить ленту новостей
export async function getNews(req, res) {
  try {
    const userId = await getUserIdFromReq(req);
    const topicFilter = req.query.topic || null;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    const weights = await getUserWeights(userId);
    const feed = buildFeed(weights, topicFilter).slice(0, limit);

    return res.json({
      news: feed,
      topics: getAllTopics(),
      updatedAt: getCacheUpdatedAt(),
    });
  } catch (e) {
    console.error('[News] Ошибка getNews:', e.message);
    return res.status(500).json({ error: 'Ошибка загрузки новостей' });
  }
}

// GET /news/topics — список всех тем с метками
export async function getTopics(req, res) {
  return res.json({ topics: getAllTopics() });
}

// GET /news/prefs — предпочтения пользователя
export async function getPrefs(req, res) {
  const userId = await getUserIdFromReq(req);
  if (!userId) return res.json({ prefs: DEFAULT_WEIGHTS });

  const weights = await getUserWeights(userId);
  return res.json({ prefs: weights });
}

// POST /news/prefs — сохранить выбранные темы
export async function savePrefs(req, res) {
  const userId = await getUserIdFromReq(req);
  if (!userId) return res.status(401).json({ error: 'Требуется авторизация' });

  const { topics } = req.body; // массив выбранных topic_key
  if (!Array.isArray(topics)) return res.status(400).json({ error: 'topics должен быть массивом' });

  try {
    // Удаляем старые предпочтения и вставляем новые
    await dbQuery('DELETE FROM user_news_prefs WHERE user_id = ?', [userId]);

    if (topics.length) {
      const allTopicKeys = getAllTopics().map(t => t.key);
      const validTopics = topics.filter(t => allTopicKeys.includes(t));

      for (const topicKey of validTopics) {
        await dbQuery(
          'INSERT INTO user_news_prefs (user_id, topic_key, weight) VALUES (?, ?, 1.0)',
          [userId, topicKey]
        );
      }
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error('[News] Ошибка savePrefs:', e.message);
    return res.status(500).json({ error: 'Ошибка сохранения' });
  }
}

// POST /news/click — трекинг клика, повышаем вес темы
export async function trackClick(req, res) {
  const userId = await getUserIdFromReq(req);
  if (!userId) return res.sendStatus(204); // гостей не трекаем

  const { topicKey } = req.body;
  const allTopicKeys = getAllTopics().map(t => t.key);
  if (!topicKey || !allTopicKeys.includes(topicKey)) return res.sendStatus(204);

  try {
    await dbQuery(
      `INSERT INTO user_news_prefs (user_id, topic_key, weight)
       VALUES (?, ?, 1.1)
       ON DUPLICATE KEY UPDATE weight = LEAST(weight * 1.1, 5.0)`,
      [userId, topicKey]
    );
    return res.sendStatus(204);
  } catch (e) {
    console.error('[News] Ошибка trackClick:', e.message);
    return res.sendStatus(204);
  }
}

// POST /news/generate — ручной запуск генерации (только для разработки/тестирования)
export async function triggerGenerate(req, res) {
  // Простая защита — только с локального адреса
  const ip = req.ip || req.connection?.remoteAddress || '';
  if (!ip.includes('127.0.0.1') && !ip.includes('::1')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  res.json({ ok: true, message: 'Генерация запущена в фоне' });
  generateAllNews().catch(e => console.error('[News] Ошибка ручной генерации:', e.message));
}
