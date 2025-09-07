import express from 'express';
import { query } from '../database/config.mjs';
import verifyToken from '../auth/verifyToken.mjs';
import paseto from 'paseto';

const { V2 } = paseto;

// Продовые эндпоинты лайков с MySQL хранилищем и реальной аутентификацией
const router = express.Router();

const AUTH_WEIGHT = Number(process.env.AUTH_LIKE_WEIGHT || process.env.DEV_AUTH_LIKE_WEIGHT || 3);

// Опциональная проверка JWT токена (не блокирует запрос, если токена нет)
async function optionalVerifyToken(req, res, next) {
  const token = req.cookies.token;
  console.log('[likes] DEBUG: token present:', Boolean(token), 'cookies:', Object.keys(req.cookies || {}));
  
  if (!token) {
    console.log('[likes] DEBUG: no token, setting req.user = null');
    req.user = null;
    return next();
  }

  const secretKey = process.env.SECRET_KEY;
  if (!secretKey) {
    console.log('[likes] DEBUG: no secret key');
    req.user = null;
    return next();
  }

  try {
    const payload = await V2.verify(token, secretKey);
    req.user = payload;
    console.log('[likes] DEBUG: verified user:', payload?.id || payload?.sub || payload?.userId || payload?.username || 'unknown');
  } catch (error) {
    console.log('[likes] DEBUG: invalid token:', error.message);
    req.user = null;
  }
  
  next();
}

function normalizeUrl(raw) {
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    const u = new URL(decoded);
    ['gclid','fbclid','yclid','msclkid'].forEach(p => u.searchParams.delete(p));
    return u.toString();
  } catch {
    return String(raw);
  }
}

async function getCounts(url) {
  try {
    const results = await query(
      'SELECT like_type, COUNT(*) as count FROM likes WHERE url = ? GROUP BY like_type',
      [url]
    );
    
    let guest = 0, auth = 0;
    results.forEach(row => {
      if (row.like_type === 'guest') guest = row.count;
      if (row.like_type === 'auth') auth = row.count;
    });
    
    return { guest, auth, total: guest + auth };
  } catch (error) {
    console.error('Ошибка получения счётчиков лайков:', error);
    return { guest: 0, auth: 0, total: 0 };
  }
}

async function hasUserLiked(url, userId) {
  if (!userId) return false;
  try {
    const results = await query(
      'SELECT 1 FROM likes WHERE url = ? AND user_id = ? AND like_type = "auth" LIMIT 1',
      [url, userId]
    );
    return results.length > 0;
  } catch (error) {
    console.error('Ошибка проверки лайка пользователя:', error);
    return false;
  }
}

// GET /api/likes?url=...
router.get('/', async (req, res) => {
  try {
    const norm = normalizeUrl(req.query.url);
    if (!norm) return res.status(400).json({ status: 'error', message: 'Missing url' });
    
    const counts = await getCounts(norm);
    res.json({ status: 'ok', counts, weight_auth: AUTH_WEIGHT });
  } catch (error) {
    console.error('Ошибка GET /api/likes:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

// POST /api/likes  accepts url; user from JWT token (optional for guest likes)
router.post('/', optionalVerifyToken, async (req, res) => {
  try {
    const norm = normalizeUrl(req.body.url || req.query.url);
    if (!norm) return res.status(400).json({ status: 'error', message: 'Missing url' });

    // Получаем user_id из JWT токена (если пользователь авторизован)
    let userKey = '';
    if (req.user && req.user.id) {
      userKey = req.user.id;
    } else {
      // Fallback для dev-тестирования через заголовки
      userKey = String(
        req.headers['x-user-id'] || req.headers['x-dev-user-id'] || req.body.user || req.query.user || ''
      ).trim();
    }

    if (userKey) {
      // Проверяем, не лайкал ли уже этот пользователь
      const alreadyLiked = await hasUserLiked(norm, userKey);
      if (alreadyLiked) {
        const counts = await getCounts(norm);
        return res.json({ status: 'ok', accepted: false, type: 'auth', counts, liked_by_you: true });
      }

      // Добавляем авторизованный лайк
      await query(
        'INSERT INTO likes (url, user_id, like_type) VALUES (?, ?, "auth")',
        [norm, userKey]
      );
      
      const counts = await getCounts(norm);
      return res.json({ status: 'ok', accepted: true, type: 'auth', counts, liked_by_you: true });
    }

    // Гостевой лайк (без user_id)
    await query(
      'INSERT INTO likes (url, user_id, like_type) VALUES (?, NULL, "guest")',
      [norm]
    );
    
    const counts = await getCounts(norm);
    return res.json({ status: 'ok', accepted: true, type: 'guest', counts, liked_by_you: true });
  } catch (error) {
    console.error('Ошибка POST /api/likes:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
});

export default router;

