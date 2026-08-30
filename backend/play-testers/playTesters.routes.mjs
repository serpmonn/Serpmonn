import express from 'express';
import validator from 'validator';
import { savePlayTesterApplication } from './playTesters.model.mjs';

const router = express.Router();
const { isEmail, normalizeEmail } = validator;

router.post('/apply', async (req, res) => {
  try {
    const raw = String(req.body?.email || '').trim();
    const email = normalizeEmail(raw) || raw.toLowerCase();

    if (!email || !isEmail(email) || email.length > 255) {
      return res.status(400).json({
        success: false,
        message: 'Укажите корректный email аккаунта Google',
      });
    }

    const ip =
      (typeof req.headers['x-forwarded-for'] === 'string'
        ? req.headers['x-forwarded-for'].split(',')[0].trim()
        : null) ||
      req.ip ||
      null;

    const result = await savePlayTesterApplication({
      email,
      source: String(req.body?.source || 'serpmonn-app').slice(0, 64),
      ip,
      userAgent: req.get('user-agent') || null,
    });

    return res.json({
      success: true,
      created: result.created,
      message: result.created
        ? 'Заявка принята. После добавления в список тестировщиков придёт ответ.'
        : 'Эта почта уже есть в заявках.',
    });
  } catch (error) {
    console.error('play-testers apply error:', error.message);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.json({
        success: true,
        created: false,
        message: 'Эта почта уже есть в заявках.',
      });
    }
    return res.status(500).json({
      success: false,
      message: 'Не удалось сохранить заявку. Попробуйте позже.',
    });
  }
});

export default router;
