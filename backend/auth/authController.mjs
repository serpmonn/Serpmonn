import dotenv from 'dotenv';
import { resolve } from 'path';

const isProduction = process.env.NODE_ENV === 'production';
const envPath = isProduction
  ? '/var/www/serpmonn.ru/backend/.env'
  : resolve(process.cwd(), 'backend/.env');

dotenv.config({ path: envPath });

import bcrypt from 'bcryptjs';
import paseto from 'paseto';
import { query } from '../database/config.mjs';
import { v4 as uuidv4 } from 'uuid';
import { sendConfirmationEmail } from '../utils/mailer.mjs';
import { awardPoints } from '../points/pointsService.js';
import { checkAndRewardQualifiedReferral } from '../points/referralService.mjs';

const { V2 } = paseto;
const { hash, compare } = bcrypt;
const secretKey = process.env.SECRET_KEY;

function maskEmail(email) {
  if (!email || typeof email !== 'string') return null;
  const [name, domain] = email.split('@');
  if (!name || !domain) return email;
  return `${name.slice(0, 2)}***@${domain}`;
}

function logAuthRequest(req, label, extra = {}) {
  console.log(`[AUTH] ${label}`, {
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    referer: req.headers.referer || null,
    userAgent: req.headers['user-agent'] || null,
    body: {
      ...req.body,
      password: req.body?.password ? '[REDACTED]' : undefined,
      email: req.body?.email ? maskEmail(req.body.email) : undefined
    },
    query: req.query,
    ...extra
  });
}

function assertNoUndefinedParams(label, params) {
  const badIndexes = params
    .map((value, index) => (value === undefined ? index : -1))
    .filter(index => index !== -1);

  if (badIndexes.length > 0) {
    console.error(`[AUTH SQL PARAM ERROR] ${label}`, {
      badIndexes,
      params
    });
    return false;
  }

  return true;
}

function safeQuery(label, sql, params) {
  if (!assertNoUndefinedParams(label, params)) {
    const error = new Error('Некорректные входные данные.');
    error.status = 400;
    error.isPublic = true;
    throw error;
  }

  return query(sql, params);
}

export const registerUser = async (req, res) => {
  const { username, email, password, ref } = req.body;
  logAuthRequest(req, 'registerUser:start');

  try {
    const [usernameExists] = await safeQuery(
      'registerUser:checkUsername',
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (usernameExists && usernameExists.id) {
      return res.status(400).json({ message: 'Имя пользователя уже используется!' });
    }

    const [emailExists] = await safeQuery(
      'registerUser:checkEmail',
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (emailExists && emailExists.id) {
      return res.status(400).json({ message: 'Email уже используется!' });
    }

    const passwordHash = await hash(password, 10);
    const userId = uuidv4();
    const telegramConfirmLink = `https://t.me/SerpmonnConfirmBot?startapp=${userId}`;

    await safeQuery(
      'registerUser:insertUser',
      'INSERT INTO users (id, username, email, password_hash, confirmed) VALUES (?, ?, ?, ?, ?)',
      [userId, username, email, passwordHash, false]
    );

    const REGISTRATION_BASE_BONUS = 50;
    await awardPoints(
      userId,
      REGISTRATION_BASE_BONUS,
      'registration_signup',
      { via: 'signup' }
    );

    if (ref) {
      try {
        const [referrer] = await safeQuery(
          'registerUser:findReferrer',
          'SELECT id FROM users WHERE username = ?',
          [ref]
        );

        if (referrer && referrer.id && referrer.id !== userId) {
          const [freshUser] = await safeQuery(
            'registerUser:getFreshUser',
            'SELECT referred_by FROM users WHERE id = ?',
            [userId]
          );

          if (freshUser && !freshUser.referred_by) {
            const BASIC_REFERRER_BONUS = 200;
            const REFEREE_BONUS = 150;

            await safeQuery(
              'registerUser:updateReferredBy',
              'UPDATE users SET referred_by = ? WHERE id = ?',
              [referrer.id, userId]
            );

            await awardPoints(
              referrer.id,
              BASIC_REFERRER_BONUS,
              'invite_basic',
              { referee_id: userId, via: 'signup' }
            );

            await awardPoints(
              userId,
              REFEREE_BONUS,
              'referral_referee',
              { referrer_id: referrer.id, via: 'signup' }
            );
          }
        }
      } catch (refErr) {
        console.error('Ошибка обработки рефералки при регистрации:', refErr);
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Регистрация успешна! Выберите способ подтверждения.',
      userId,
      confirmLink: telegramConfirmLink
    });
  } catch (error) {
    console.error('Ошибка регистрации:', error);

    if (error?.isPublic) {
      return res.status(error.status || 400).json({
        message: 'Проверьте правильность данных регистрации.'
      });
    }

    return res.status(500).json({ message: 'Ошибка сервера.' });
  }
};

export const confirmTelegram = async (req, res) => {
  const { userId, source } = req.body;
  logAuthRequest(req, 'confirmTelegram:start', { source });

  try {
    const [user] = await safeQuery(
      'confirmTelegram:getUser',
      'SELECT id, username, email, confirmed, registration_points_awarded FROM users WHERE id = ?',
      [userId]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Пользователь не найден. Пройдите регистрацию заново.'
      });
    }

    if (user.confirmed) {
      if (!user.registration_points_awarded) {
        const REGISTRATION_BONUS = 200;
        await awardPoints(user.id, REGISTRATION_BONUS, 'registration', { via: 'telegram' });
        await safeQuery(
          'confirmTelegram:setRegistrationAwardedAlreadyConfirmed',
          'UPDATE users SET registration_points_awarded = 1 WHERE id = ?',
          [user.id]
        );
      }

      await checkAndRewardQualifiedReferral(user.id);

      return res.json({
        success: true,
        message: `Аккаунт ${user.username} уже был подтвержден ранее`
      });
    }

    await safeQuery(
      'confirmTelegram:setConfirmed',
      'UPDATE users SET confirmed = ? WHERE id = ?',
      [true, user.id]
    );

    if (!user.registration_points_awarded) {
      const REGISTRATION_BONUS = 200;
      await awardPoints(user.id, REGISTRATION_BONUS, 'registration', { via: 'telegram' });
      await safeQuery(
        'confirmTelegram:setRegistrationAwarded',
        'UPDATE users SET registration_points_awarded = 1 WHERE id = ?',
        [user.id]
      );
    }

    await checkAndRewardQualifiedReferral(user.id);

    return res.json({
      success: true,
      message: `Аккаунт ${user.username} успешно подтвержден!`
    });
  } catch (error) {
    console.error('❌ Ошибка при подтверждении через Telegram:', error);

    if (error?.isPublic) {
      return res.status(error.status || 400).json({
        success: false,
        message: 'Не удалось подтвердить аккаунт. Начните подтверждение заново.'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Произошла техническая ошибка. Попробуйте позже.'
    });
  }
};

export const confirmEmail = async (req, res) => {
  const { email, userId } = req.body;
  logAuthRequest(req, 'confirmEmail:start', { userId, email: maskEmail(email) });

  try {
    const [user] = await safeQuery(
      'confirmEmail:getUser',
      'SELECT id FROM users WHERE id = ? AND email = ?',
      [userId, email]
    );

    if (!user) {
      return res.status(404).json({
        message: 'Пользователь не найден. Пройдите регистрацию заново.'
      });
    }

    const confirmationToken = uuidv4();
    const tokenExpires = new Date(Date.now() + 3600000);

    await safeQuery(
      'confirmEmail:updateConfirmationToken',
      'UPDATE users SET confirmation_token = ?, confirmation_token_expires = ? WHERE id = ?',
      [confirmationToken, tokenExpires, userId]
    );

    const confirmLink = `https://serpmonn.ru/auth/confirm?token=${confirmationToken}`;
    await sendConfirmationEmail(email, confirmLink);

    return res.json({
      success: true,
      message: 'Письмо с подтверждением отправлено.'
    });
  } catch (error) {
    console.error('Ошибка отправки email:', error);

    if (error?.isPublic) {
      return res.status(error.status || 400).json({
        message: 'Не удалось отправить письмо. Обновите страницу и попробуйте ещё раз.'
      });
    }

    return res.status(500).json({ message: 'Ошибка сервера.' });
  }
};

export const confirmToken = async (req, res) => {
  const { token } = req.query;
  logAuthRequest(req, 'confirmToken:start', { token });

  try {
    const [user] = await safeQuery(
      'confirmToken:getUserByToken',
      'SELECT id, email, username, registration_points_awarded FROM users WHERE confirmation_token = ? AND confirmation_token_expires > ?',
      [token, new Date()]
    );

    if (!user) {
      return res.status(400).json({
        message: 'Ссылка для подтверждения недействительна или уже устарела.'
      });
    }

    await safeQuery(
      'confirmToken:confirmUser',
      'UPDATE users SET confirmed = ?, confirmation_token = NULL, confirmation_token_expires = NULL WHERE id = ?',
      [true, user.id]
    );

    if (!user.registration_points_awarded) {
      const REGISTRATION_BONUS = 200;
      await awardPoints(user.id, REGISTRATION_BONUS, 'registration', { via: 'email' });
      await safeQuery(
        'confirmToken:setRegistrationAwarded',
        'UPDATE users SET registration_points_awarded = 1 WHERE id = ?',
        [user.id]
      );
    }

    await checkAndRewardQualifiedReferral(user.id);

    const payload = {
      id: user.id,
      email: user.email,
      username: user.username || user.email
    };

    const authToken = await V2.sign(payload, secretKey);

    res.cookie('token', authToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      domain: '.serpmonn.ru'
    });

    console.log('Подтверждение: пользователь', user.email, 'confirmed = 1, токен создан');
    return res.redirect('https://serpmonn.ru/frontend/profile/profile.html');
  } catch (error) {
    console.error('Ошибка подтверждения:', error);

    if (error?.isPublic) {
      return res.status(error.status || 400).json({
        message: 'Ссылка для подтверждения некорректна или устарела. Запросите новую ссылку.'
      });
    }

    return res.status(500).json({ message: 'Ошибка сервера.' });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  logAuthRequest(req, 'loginUser:start', { email: maskEmail(email) });

  try {
    const results = await safeQuery(
      'loginUser:getUserByEmail',
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (results.length === 0) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    const user = results[0];
    const isMatch = await compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: 'Неверный email или пароль' });
    }

    const payload = { id: user.id, username: user.username, email: user.email };
    const token = await V2.sign(payload, secretKey);

    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'Lax',
      maxAge: 24 * 60 * 60 * 1000,
      domain: '.serpmonn.ru'
    });

    return res.json({ message: 'Вход выполнен успешно' });
  } catch (error) {
    console.error('Ошибка при логине:', error);

    if (error?.isPublic) {
      return res.status(error.status || 400).json({
        message: 'Неверный email или пароль'
      });
    }

    return res.status(500).json({ message: 'Ошибка при выполнении запроса' });
  }
};

export const logoutUser = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax'
  });

  return res.json({ message: 'Выход выполнен успешно' });
};

export default {
  registerUser,
  confirmTelegram,
  confirmEmail,
  confirmToken,
  loginUser,
  logoutUser
};