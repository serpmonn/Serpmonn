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
import { getBackendMessages } from '../utils/i18n.mjs';
import { setAuthCookie, clearAuthCookie } from './authCookie.mjs';

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
    const error = new Error('auth.invalidInput');
    error.status = 400;
    error.isPublic = true;
    error.i18nKey = 'auth.invalidInput';
    throw error;
  }

  return query(sql, params);
}

async function deriveUsername(email) {
  const local = String(email || '').split('@')[0].toLowerCase();
  let base = local.replace(/[^a-z0-9._+-]/g, '');
  while (base.startsWith('.')) base = base.slice(1);
  while (base.endsWith('.')) base = base.slice(0, -1);
  if (base.length < 2) base = 'user';

  let candidate = base.slice(0, 32);
  let suffix = 1;

  while (true) {
    const [exists] = await safeQuery(
      'registerUser:checkDerivedUsername',
      'SELECT id FROM users WHERE username = ?',
      [candidate]
    );
    if (!exists?.id) return candidate;
    candidate = `${base.slice(0, 28)}${suffix}`;
    suffix += 1;
  }
}

async function sendRegistrationConfirmationEmail(userId, email) {
  const confirmationToken = uuidv4();
  const tokenExpires = new Date(Date.now() + 3600000);

  await safeQuery(
    'registerUser:updateConfirmationToken',
    'UPDATE users SET confirmation_token = ?, confirmation_token_expires = ? WHERE id = ?',
    [confirmationToken, tokenExpires, userId]
  );

  const confirmLink = `https://serpmonn.ru/auth/confirm?token=${confirmationToken}`;
  await sendConfirmationEmail(email, confirmLink);
}

export const registerUser = async (req, res) => {
  const { username: usernameInput, email, password, ref } = req.body;
  const { t } = getBackendMessages(req);
  logAuthRequest(req, 'registerUser:start');

  try {
    if (!email || !password) {
      return res.status(400).json({ message: t['auth.registerDataError'] });
    }

    const username = usernameInput?.trim()
      ? usernameInput.trim()
      : await deriveUsername(email);

    const [usernameExists] = await safeQuery(
      'registerUser:checkUsername',
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (usernameExists?.id) {
      return res.status(400).json({ message: t['auth.usernameTaken'] });
    }

    const [emailExists] = await safeQuery(
      'registerUser:checkEmail',
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (emailExists?.id) {
      return res.status(400).json({ message: t['auth.emailTaken'] });
    }

    const passwordHash = await hash(password, 10);
    const userId = uuidv4();

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

        if (referrer?.id && referrer.id !== userId) {
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

    try {
      await sendRegistrationConfirmationEmail(userId, email);
    } catch (mailErr) {
      console.error('Ошибка авто-отправки письма подтверждения:', mailErr);
      return res.status(500).json({ message: t['auth.emailSendFailed'] });
    }

    return res.status(200).json({
      success: true,
      message: t['auth.emailSent'],
      userId,
      emailSent: true
    });
  } catch (error) {
    console.error('Ошибка регистрации:', error);

    if (error?.isPublic) {
      return res.status(error.status || 400).json({
        message: t[error.i18nKey] ?? t['auth.registerDataError']
      });
    }

    return res.status(500).json({ message: t['auth.serverError'] });
  }
};

export const confirmEmail = async (req, res) => {
  const { email, userId } = req.body;
  const { t } = getBackendMessages(req);
  logAuthRequest(req, 'confirmEmail:start', { userId, email: maskEmail(email) });

  try {
    const [user] = await safeQuery(
      'confirmEmail:getUser',
      'SELECT id FROM users WHERE id = ? AND email = ?',
      [userId, email]
    );

    if (!user) {
      return res.status(404).json({
        message: t['auth.userNotFound']
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
      message: t['auth.emailSent']
    });
  } catch (error) {
    console.error('Ошибка отправки email:', error);

    if (error?.isPublic) {
      return res.status(error.status || 400).json({
        message: t[error.i18nKey] ?? t['auth.emailSendFailed']
      });
    }

    return res.status(500).json({ message: t['auth.serverError'] });
  }
};

export const confirmToken = async (req, res) => {
  const { token } = req.query;
  const { t } = getBackendMessages(req);
  logAuthRequest(req, 'confirmToken:start', { token });

  try {
    const [user] = await safeQuery(
      'confirmToken:getUserByToken',
      'SELECT id, email, username, registration_points_awarded FROM users WHERE confirmation_token = ? AND confirmation_token_expires > ?',
      [token, new Date()]
    );

    if (!user) {
      return res.status(400).json({
        message: t['auth.tokenInvalid']
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

    setAuthCookie(res, authToken, 30 * 24 * 60 * 60 * 1000);

    console.log('Подтверждение: пользователь', maskEmail(user.email), 'confirmed = 1, токен создан');
    return res.redirect('https://serpmonn.ru/frontend/profile/profile.html');
  } catch (error) {
    console.error('Ошибка подтверждения:', error);

    if (error?.isPublic) {
      return res.status(error.status || 400).json({
        message: t[error.i18nKey] ?? t['auth.tokenInvalidRetry']
      });
    }

    return res.status(500).json({ message: t['auth.serverError'] });
  }
};

export const loginUser = async (req, res) => {
  const { email, password, vkMini } = req.body || {};
  const forMini = Boolean(vkMini);
  const { t } = getBackendMessages(req);
  logAuthRequest(req, 'loginUser:start', { email: maskEmail(email), forMini });

  try {
    const results = await safeQuery(
      'loginUser:getUserByEmail',
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (results.length === 0) {
      return res.status(401).json({ message: t['auth.wrongCredentials'] });
    }

    const user = results[0];
    if (!user.password_hash) {
      return res.status(401).json({ message: t['auth.wrongCredentials'] });
    }
    const isMatch = await compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: t['auth.wrongCredentials'] });
    }

    const payload = { id: user.id, username: user.username, email: user.email };
    const token = await V2.sign(payload, secretKey);

    // VK Mini App WebView: cookie только с SameSite=None
    setAuthCookie(res, token, 24 * 60 * 60 * 1000, forMini ? { sameSite: 'None' } : {});

    if (forMini) {
      return res.json({
        success: true,
        message: t['auth.loginSuccess'],
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email || null,
          photo: null
        }
      });
    }

    return res.json({ message: t['auth.loginSuccess'] });
  } catch (error) {
    console.error('Ошибка при логине:', error);

    if (error?.isPublic) {
      return res.status(error.status || 400).json({
        message: t[error.i18nKey] ?? t['auth.wrongCredentials']
      });
    }

    return res.status(500).json({ message: t['auth.loginQueryError'] });
  }
};

export const logoutUser = (req, res) => {
  const { t } = getBackendMessages(req);

  clearAuthCookie(res);

  return res.json({ message: t['auth.logoutSuccess'] });
};

export default {
  registerUser,
  confirmEmail,
  confirmToken,
  loginUser,
  logoutUser
};
