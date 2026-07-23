/**
 * Авторизация VK Mini App → аккаунт Serpmonn (cookie + token).
 * По п. 1.2.2 правил VK Mini Apps: валидируем подпись launch params (VK_MINI_SECURE_KEY).
 * Дополнительно допускаем VKWebAppGetAuthToken → users.get.
 */
import crypto from 'crypto';
import { query } from '../database/config.mjs';
import { setAuthCookie, clearAuthCookie } from '../auth/authCookie.mjs';
import paseto from 'paseto';

const { V2 } = paseto;

const PASETO_SECRET = process.env.SECRET_KEY;
const VK_MINI_APP_ID = String(process.env.VK_MINI_APP_ID || '54486769');
const VK_MINI_SECURE_KEY = String(process.env.VK_MINI_SECURE_KEY || '').trim();
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

if (!VK_MINI_SECURE_KEY) {
  console.error(
    '[vk-mini-auth] VK_MINI_SECURE_KEY не задан. Укажите защищённый ключ из кабинета VK (Разработка → Ключи доступа). Без него проверка sign (п. 1.2.2) невозможна.'
  );
}

function toBase64Url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function encodeLaunchValue(value) {
  return encodeURIComponent(String(value ?? ''))
    .replace(/%20/g, '+')
    .replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
}

/** Проверка подписи launch params VK Mini Apps (п. 1.2.2) */
export function verifyLaunchParams(params, secureKey = VK_MINI_SECURE_KEY) {
  if (!secureKey || !params || typeof params !== 'object') return false;
  const sign = String(params.sign || '');
  if (!sign) return false;

  const pairs = Object.keys(params)
    .filter((k) => k.startsWith('vk_'))
    .sort()
    .map((k) => `${k}=${encodeLaunchValue(params[k])}`);

  const payload = pairs.join('&');
  const digest = crypto.createHmac('sha256', secureKey).update(payload).digest();
  const expected = toBase64Url(digest);

  // Fallback без encode (на случай уже закодированных значений)
  const pairsRaw = Object.keys(params)
    .filter((k) => k.startsWith('vk_'))
    .sort()
    .map((k) => `${k}=${params[k]}`);
  const expectedRaw = toBase64Url(
    crypto.createHmac('sha256', secureKey).update(pairsRaw.join('&')).digest()
  );

  try {
    const b = Buffer.from(sign);
    for (const exp of [expected, expectedRaw]) {
      const a = Buffer.from(exp);
      if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function isMiniSecureKeyConfigured() {
  return Boolean(VK_MINI_SECURE_KEY);
}

async function fetchVkUserByAccessToken(accessToken) {
  const url = new URL('https://api.vk.com/method/users.get');
  url.searchParams.set('access_token', accessToken);
  url.searchParams.set('v', '5.199');
  url.searchParams.set('fields', 'photo_100,screen_name');

  const resp = await fetch(url.toString(), { method: 'GET' });
  if (!resp.ok) {
    throw new Error(`VK API HTTP ${resp.status}`);
  }
  const data = await resp.json();
  if (data.error) {
    const msg = data.error.error_msg || 'VK API error';
    const err = new Error(msg);
    err.code = data.error.error_code;
    throw err;
  }
  const user = Array.isArray(data.response) ? data.response[0] : null;
  if (!user?.id) return null;
  return {
    vkUserId: String(user.id),
    name: [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || null,
    photo: user.photo_100 || null,
    screenName: user.screen_name || null
  };
}

export async function upsertVkUser({ vkUserId, email = null, name = null }) {
  const id = String(vkUserId);
  let user = null;

  const byVk = await query(
    'SELECT id, username, email FROM users WHERE vk_user_id = ?',
    [id]
  );
  if (byVk.length > 0) {
    user = byVk[0];
  }

  if (!user && email) {
    const byEmail = await query(
      'SELECT id, username, email FROM users WHERE email = ?',
      [email]
    );
    if (byEmail.length > 0) {
      user = byEmail[0];
      await query('UPDATE users SET vk_user_id = ? WHERE id = ?', [id, user.id]);
    }
  }

  if (!user) {
    const username = name ? String(name).slice(0, 64) : `vk_${id}`;
    const safeEmail = email || '';
    await query(
      'INSERT INTO users (id, username, email, vk_user_id, confirmed, password_hash) VALUES (UUID(), ?, ?, ?, ?, ?)',
      [username, safeEmail, id, true, '']
    );
    const rows = await query(
      'SELECT id, username, email FROM users WHERE vk_user_id = ?',
      [id]
    );
    user = rows[0];
  }

  return user;
}

export async function issueSession(res, user, { vkUserId, name = null, email = null, photo = null } = {}) {
  if (!PASETO_SECRET) {
    const err = new Error('Server misconfigured');
    err.status = 500;
    throw err;
  }

  const payload = {
    id: user.id,
    username: user.username || name || `vk_${vkUserId}`,
    email: user.email || email || null,
    vkUserId: vkUserId ? String(vkUserId) : undefined
  };

  const token = await V2.sign(payload, PASETO_SECRET);
  setAuthCookie(res, token, TOKEN_TTL_MS, { sameSite: 'None' });

  return {
    token,
    user: {
      id: user.id,
      username: payload.username,
      email: payload.email,
      vkUserId: payload.vkUserId || null,
      photo: photo || null
    }
  };
}

/** Cookie или Bearer (мини-приложение хранит token в storage) */
export async function resolveMiniUser(req) {
  if (!PASETO_SECRET) return null;
  let token = req.cookies?.token || '';
  const header = req.headers?.authorization || req.headers?.Authorization || '';
  const m = String(header).match(/^Bearer\s+(.+)$/i);
  if (m) token = m[1].trim();
  if (!token) return null;
  try {
    return await V2.verify(token, PASETO_SECRET);
  } catch {
    return null;
  }
}

/**
 * Express handler: POST /api/vk-mini-login
 * body: { launchParams? } | { accessToken? } | { accessToken, launchParams }
 */
export async function vkMiniLoginHandler(req, res, next) {
  try {
    const { launchParams, accessToken } = req.body || {};
    let profile = null;
    let signOk = false;

    if (launchParams && typeof launchParams === 'object') {
      const appId = String(launchParams.vk_app_id || '');
      if (appId && appId !== VK_MINI_APP_ID) {
        return res.status(403).json({ success: false, message: 'Unexpected vk_app_id' });
      }

      if (!VK_MINI_SECURE_KEY) {
        // Без ключа нельзя доверять sign — требуем accessToken
        if (!accessToken) {
          return res.status(503).json({
            success: false,
            message: 'VK_MINI_SECURE_KEY not configured',
            needSecureKey: true,
            needToken: true
          });
        }
      } else {
        signOk = verifyLaunchParams(launchParams);
        if (signOk && launchParams.vk_user_id) {
          profile = { vkUserId: String(launchParams.vk_user_id), name: null, photo: null };
        } else if (!accessToken) {
          return res.status(403).json({ success: false, message: 'Invalid launch sign' });
        }
      }
    }

    if (!profile && accessToken) {
      if (
        VK_MINI_SECURE_KEY &&
        launchParams &&
        typeof launchParams === 'object' &&
        launchParams.sign &&
        !verifyLaunchParams(launchParams)
      ) {
        console.warn('vk-mini-login: launch sign invalid, continuing with accessToken');
      }

      try {
        profile = await fetchVkUserByAccessToken(String(accessToken));
      } catch (e) {
        console.warn('vk-mini-login VK API failed:', e.message);
        return res.status(401).json({ success: false, message: 'Invalid VK access token' });
      }
      if (!profile) {
        return res.status(401).json({ success: false, message: 'VK user not found' });
      }
    }

    if (!profile?.vkUserId) {
      return res.status(400).json({ success: false, message: 'Missing credentials' });
    }

    const user = await upsertVkUser({
      vkUserId: profile.vkUserId,
      name: profile.name
    });

    const session = await issueSession(res, user, profile);

    return res.json({
      success: true,
      message: 'VK Mini login success',
      signVerified: Boolean(signOk || (VK_MINI_SECURE_KEY && launchParams && verifyLaunchParams(launchParams))),
      secureKeyConfigured: isMiniSecureKeyConfigured(),
      ...session
    });
  } catch (err) {
    console.error('vk-mini-login error:', err);
    if (err.status === 500) {
      return res.status(500).json({ success: false, message: err.message });
    }
    next(err);
  }
}

/**
 * POST /api/vk-mini-delete-account — удаление/анонимизация аккаунта (п. 1.1.10)
 */
export async function vkMiniDeleteAccountHandler(req, res, next) {
  try {
    const payload = await resolveMiniUser(req);
    if (!payload?.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const userId = payload.id;
    const short = String(userId).replace(/-/g, '').slice(0, 12);
    const anonEmail = `deleted+${short}@invalid.local`;
    const anonName = `deleted_${short}`;

    await query(
      `UPDATE users
       SET username = ?,
           email = ?,
           password_hash = '',
           vk_user_id = NULL,
           confirmed = 0
       WHERE id = ?`,
      [anonName, anonEmail, userId]
    );

    clearAuthCookie(res);
    return res.json({
      success: true,
      message: 'Account deleted'
    });
  } catch (err) {
    console.error('vk-mini-delete-account error:', err);
    next(err);
  }
}
