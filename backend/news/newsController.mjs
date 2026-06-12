import paseto from 'paseto';
import dotenv from 'dotenv';
import { query as dbQuery } from '../database/config.mjs';
import {
  getNewsCache,
  getCacheUpdatedAt,
  getAllTopics,
  refreshCache,
  generateAllNews,
  resolveLang,
  FALLBACK_LANG,
} from './news-generator.mjs';

dotenv.config({ path: '/var/www/serpmonn.ru/backend/.env' });
const { V2 } = paseto;
const secretKey = process.env.SECRET_KEY;

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

const DEFAULT_WEIGHTS = {
  world: 1.0, tech: 1.0, ai: 1.0, science: 1.0, russia: 1.0,
  space: 1.0, business: 1.0, games: 1.0, health: 1.0, sports: 1.0,
};

async function getUserWeights(userId) {
  if (!userId) return DEFAULT_WEIGHTS;
  try {
    const rows = await dbQuery(
      'SELECT topic_key, weight FROM user_news_prefs WHERE user_id = ?',
      [userId]
    );
    if (!rows.length) return DEFAULT_WEIGHTS;
    const weights = { ...DEFAULT_WEIGHTS };
    for (const row of rows) weights[row.topic_key] = row.weight;
    return weights;
  } catch (e) {
    console.error('[News] Ошибка получения предпочтений:', e.message);
    return DEFAULT_WEIGHTS;
  }
}

// Собираем персонализированную ленту из кэша с учётом языка
function buildFeed(weights, topicFilter, lang) {
  const cache = getNewsCache();
  const feed = [];

  for (const topicKey of Object.keys(DEFAULT_WEIGHTS)) {
    if (topicFilter && topicFilter !== topicKey) continue;

    // Пробуем запрошенный язык → fallback на en
    const cacheKey = `${topicKey}:${lang}`;
    const fallbackKey = `${topicKey}:${FALLBACK_LANG}`;
    const items = cache.get(cacheKey) || cache.get(fallbackKey) || [];

    const weight = weights[topicKey] || 1.0;
    const count = Math.max(1, Math.round(3 * weight));

    for (const item of items.slice(0, count)) {
      feed.push({ ...item, weight });
    }
  }

  feed.sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
    return new Date(b.generated_at) - new Date(a.generated_at);
  });

  return feed.map(({ weight, ...item }) => item);
}

// GET /news — получить ленту новостей
export async function getNews(req, res) {
  try {
    const userId = await getUserIdFromReq(req);
    const topicFilter = req.query.topic || null;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    // Язык берём из query-параметра который фронт передаёт сам из getCurrentLocale()
    const rawLang = req.query.lang || FALLBACK_LANG;
    const lang = resolveLang(rawLang);

    const weights = await getUserWeights(userId);
    const feed = buildFeed(weights, topicFilter, lang).slice(0, limit);

    return res.json({
      news: feed,
      topics: getAllTopics(),
      lang,
      updatedAt: getCacheUpdatedAt(),
    });
  } catch (e) {
    console.error('[News] Ошибка getNews:', e.message);
    return res.status(500).json({ error: 'Ошибка загрузки новостей' });
  }
}

export async function getTopics(req, res) {
  return res.json({ topics: getAllTopics() });
}

export async function getPrefs(req, res) {
  const userId = await getUserIdFromReq(req);
  if (!userId) return res.json({ prefs: DEFAULT_WEIGHTS });
  const weights = await getUserWeights(userId);
  return res.json({ prefs: weights });
}

export async function savePrefs(req, res) {
  const userId = await getUserIdFromReq(req);
  if (!userId) return res.status(401).json({ error: 'Требуется авторизация' });

  const { topics } = req.body;
  if (!Array.isArray(topics)) return res.status(400).json({ error: 'topics должен быть массивом' });

  try {
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

export async function trackClick(req, res) {
  const userId = await getUserIdFromReq(req);
  if (!userId) return res.sendStatus(204);

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

export async function triggerGenerate(req, res) {
  const ip = req.ip || req.connection?.remoteAddress || '';
  if (!ip.includes('127.0.0.1') && !ip.includes('::1')) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json({ ok: true, message: 'Генерация запущена в фоне' });
  generateAllNews().catch(e => console.error('[News] Ошибка ручной генерации:', e.message));
}
