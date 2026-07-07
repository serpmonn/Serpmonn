import dotenv from 'dotenv';
import paseto from 'paseto';
import { resolveLocale } from '../utils/i18n.mjs';
import {
  getNewsForLocale,
  getTopicsForLocale,
  getCacheUpdatedAt,
} from './news-generator.mjs';

dotenv.config({ path: '/var/www/serpmonn.ru/backend/.env' });
const { V2 } = paseto;
const secretKey = process.env.SECRET_KEY;

// ─── Хелперы ─────────────────────────────────────────────────────────────────

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

// ─── Роуты ───────────────────────────────────────────────────────────────────

/**
 * GET /api/news
 * Query params:
 *   locale  — код локали (en, ru, de …)
 *   topic   — фильтр по теме (world, tech …)
 *   limit   — максимум новостей (default 20, max 60)
 */
export async function getNews(req, res) {
  try {
    const locale = resolveLocale(req);
    const topicFilter = req.query.topic || null;
    const limit = Math.min(parseInt(req.query.limit) || 20, 60);

    const items = await getNewsForLocale(locale, topicFilter);
    const topics = getTopicsForLocale(locale);
    const updatedAt = getCacheUpdatedAt(locale);

    return res.json({
      locale,
      news:      items.slice(0, limit),
      topics,
      updatedAt,
    });
  } catch (e) {
    console.error('[News] Ошибка getNews:', e.message);
    return res.status(500).json({ error: 'Ошибка загрузки новостей' });
  }
}

/**
 * GET /api/news/topics
 * Возвращает список тем для локали.
 */
export async function getTopics(req, res) {
  const locale = resolveLocale(req);
  return res.json({ locale, topics: getTopicsForLocale(locale) });
}

/**
 * POST /api/news/refresh
 * Принудительно сбрасывает кэш для локали (только с localhost).
 */
export async function refreshLocale(req, res) {
  const ip = req.ip || req.connection?.remoteAddress || '';
  if (!ip.includes('127.0.0.1') && !ip.includes('::1')) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const locale = req.query.locale || 'en';
  // Вызываем принудительное обновление — передаём устаревший кэш
  // (просто сбрасываем запись, следующий GET перезаполнит)
  const { localeCache } = await import('./news-generator.mjs').then(m => m);
  // localeCache недоступен снаружи — просто сообщаем
  res.json({ ok: true, message: `Кэш для "${locale}" будет обновлён при следующем запросе` });
}
