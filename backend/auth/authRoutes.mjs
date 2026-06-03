import express from 'express';
import { body, query, validationResult } from 'express-validator';
import {
  registerUser,
  confirmTelegram,
  confirmEmail,
  confirmToken,
  loginUser,
  logoutUser
} from './authController.mjs';
import verifyToken from './verifyToken.mjs';
import { query as dbQuery } from '../database/config.mjs';
import rateLimit from 'express-rate-limit';

const router = express.Router();

const authWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);

  if (errors.isEmpty()) {
    return next();
  }

  console.warn('[AUTH VALIDATION ERROR]', {
    path: req.originalUrl,
    method: req.method,
    query: req.query,
    body: {
      ...req.body,
      password: req.body?.password ? '[REDACTED]' : undefined
    },
    errors: errors.array()
  });

  let message = 'Некорректные данные. Попробуйте ещё раз.';

  if (req.path === '/register') {
    message = 'Проверьте правильность данных регистрации.';
  } else if (req.path === '/confirm-email') {
    message = 'Не удалось отправить письмо. Обновите страницу и попробуйте ещё раз.';
  } else if (req.path === '/confirm-telegram') {
    message = 'Не удалось подтвердить аккаунт. Начните подтверждение заново.';
  } else if (req.path === '/confirm') {
    message = 'Ссылка для подтверждения некорректна или устарела. Запросите новую ссылку.';
  } else if (req.path === '/login') {
    message = 'Неверный email или пароль.';
  } else if (req.path === '/check-confirmation') {
    message = 'Не удалось проверить статус подтверждения. Попробуйте ещё раз.';
  }

  return res.status(400).json({ message });
}

router.post(
  '/register',
  authWriteLimiter,
  [
    body('username')
      .trim()
      .notEmpty()
      .isLength({ min: 3 })
      .isAlphanumeric(),
    body('email')
      .trim()
      .notEmpty()
      .isEmail()
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .isLength({ min: 6 }),
    body('ref')
      .optional({ values: 'falsy' })
      .trim()
      .isLength({ min: 3 })
      .isAlphanumeric(),
    handleValidationErrors
  ],
  registerUser
);

router.post(
  '/confirm-email',
  authWriteLimiter,
  [
    body('email')
      .trim()
      .notEmpty()
      .isEmail()
      .normalizeEmail(),
    body('userId')
      .trim()
      .notEmpty()
      .isUUID(),
    handleValidationErrors
  ],
  confirmEmail
);

router.post(
  '/confirm-telegram',
  authWriteLimiter,
  [
    body('userId')
      .trim()
      .notEmpty()
      .isUUID(),
    body('source')
      .optional({ values: 'falsy' })
      .trim()
      .isLength({ max: 50 }),
    handleValidationErrors
  ],
  confirmTelegram
);

router.get(
  '/confirm',
  [
    query('token')
      .trim()
      .notEmpty()
      .isUUID(),
    handleValidationErrors
  ],
  confirmToken
);

router.post(
  '/login',
  authWriteLimiter,
  [
    body('email')
      .trim()
      .notEmpty()
      .isEmail()
      .normalizeEmail(),
    body('password')
      .notEmpty()
      .isLength({ min: 6 }),
    handleValidationErrors
  ],
  loginUser
);

router.post('/logout', authWriteLimiter, logoutUser);

router.get('/protected', verifyToken, (req, res) => {
  res.json({ message: 'Вы получили доступ к защищённому маршруту', user: req.user });
});

router.get(
  '/check-confirmation',
  [
    query('username')
      .trim()
      .notEmpty()
      .isLength({ min: 3 })
      .isAlphanumeric(),
    handleValidationErrors
  ],
  async (req, res) => {
    const { username } = req.query;

    try {
      const results = await dbQuery(
        'SELECT confirmed FROM users WHERE username = ?',
        [username]
      );

      if (results.length === 0) {
        return res.status(404).json({ message: 'Пользователь не найден.' });
      }

      return res.json({ confirmed: results[0].confirmed });
    } catch (error) {
      console.error('Ошибка проверки подтверждения:', error);
      return res.status(500).json({ message: 'Ошибка сервера.' });
    }
  }
);

export default router;