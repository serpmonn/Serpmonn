// backend/vkid/vkidRoutes.mjs
import express from 'express';
import rateLimit from 'express-rate-limit';
import fetch from 'node-fetch';
import paseto from 'paseto';
import { query } from '../database/config.mjs';

const { V2 } = paseto;

const router = express.Router();

const VK_APP_ID = process.env.VK_APP_ID;
const VK_CLIENT_SECRET = process.env.VK_CLIENT_SECRET;
const VK_REDIRECT_URI = 'https://serpmonn.ru/';
const PASETO_SECRET = process.env.SECRET_KEY;

const vkidLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false
});

// POST /api/vkid-login
router.post('/vkid-login', vkidLimiter, async (req, res, next) => {
  try {
    const { vkUserId, email, name } = req.body || {};

    if (!vkUserId) {
      return res.status(400).json({ message: 'Missing vkUserId' });
    }

    if (!PASETO_SECRET) {
      console.error('VKID env missing PASETO_SECRET');
      return res.status(500).json({ message: 'Server misconfigured' });
    }

    let user = null;

    // 1. Пытаемся найти по vk_user_id
    const byVk = await query(
      'SELECT id, username, email FROM users WHERE vk_user_id = ?',
      [vkUserId]
    );
    if (byVk.length > 0) {
      user = byVk[0];
    }

    // 2. Если по vk_user_id не нашли и есть email — ищем по email и привязываем
    if (!user && email) {
      const byEmail = await query(
        'SELECT id, username, email FROM users WHERE email = ?',
        [email]
      );
      if (byEmail.length > 0) {
        user = byEmail[0];
        await query(
          'UPDATE users SET vk_user_id = ? WHERE id = ?',
          [vkUserId, user.id]
        );
      }
    }

    // 3. Если вообще никого не нашли — создаём нового пользователя
    if (!user) {
      const username = `vk_${vkUserId}`;
      const safeEmail = email || '';
      const fakePasswordHash = ''; // или 'VKID' / 'social' / что-то осмысленное

      await query(
        'INSERT INTO users (id, username, email, vk_user_id, confirmed, password_hash) VALUES (UUID(), ?, ?, ?, ?, ?)',
        [username, safeEmail, vkUserId, true, fakePasswordHash]
      );

      const rows = await query(
        'SELECT id, username, email FROM users WHERE vk_user_id = ?',
        [vkUserId]
      );
      user = rows[0];
    }

    const payload = {
      id: user.id,
      username: user.username || name || `vk_${vkUserId}`,
      email: user.email || email || null,
      vkUserId
    };

    const token = await V2.sign(payload, PASETO_SECRET);

    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      domain: '.serpmonn.ru'
    });

    return res.json({
      success: true,
      message: 'VKID login success',
      user: {
        id: user.id,
        username: payload.username,
        email: payload.email,
        vkUserId
      }
    });
  } catch (err) {
    console.error('vkid-login error:', err);
    next(err);
  }
});

export default router;