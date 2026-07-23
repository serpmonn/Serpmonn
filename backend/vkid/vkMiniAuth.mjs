/**
 * Авторизация VK Mini App → аккаунт Serpmonn (cookie + token).
 * Доверяем только:
 *  1) подписи launch params (VK_MINI_SECURE_KEY), или
 *  2) access_token через VK API users.get
 */
import crypto from 'crypto';
import { query } from '../database/config.mjs';
import { setAuthCookie } from '../auth/authCookie.mjs';
import paseto from 'paseto';

const { V2 } = paseto;

const PASETO_SECRET = process.env.SECRET_KEY;
const VK_MINI_APP_ID = String(process.env.VK_MINI_APP_ID || '54486769');
const VK_MINI_SECURE_KEY = process.env.VK_MINI_SECURE_KEY || '';
const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

function toBase64Url(buf) {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

/** Проверка подписи launch params VK Mini Apps */
export function verifyLaunchParams(params, secureKey = VK_MINI_SECURE_KEY) {
  if (!secureKey || !params || typeof params !== 'object') return false;
  const sign = String(params.sign || '');
  if (!sign) return false;

  const pairs = Object.keys(params)
    .filter((k) => k.startsWith('vk_'))
    .sort()
    .map((k) => `${k}=${params[k]}`);

  const payload = pairs.join('&');
  const digest = crypto.createHmac('sha256', secureKey).update(payload).digest();
  const expected = toBase64Url(digest);

  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(sign);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
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
    vkUserId: String(vkUserId)
  };

  const token = await V2.sign(payload, PASETO_SECRET);
  // SameSite=None — cookie доступна в WebView/iframe VK Mini App
  setAuthCookie(res, token, TOKEN_TTL_MS, { sameSite: 'None' });

  return {
    token,
    user: {
      id: user.id,
      username: payload.username,
      email: payload.email,
      vkUserId: payload.vkUserId,
      photo: photo || null
    }
  };
}

/**
 * Express handler: POST /api/vk-mini-login
 * body: { launchParams? } | { accessToken? } | { accessToken, launchParams }
 */
export async function vkMiniLoginHandler(req, res, next) {
  try {
    const { launchParams, accessToken } = req.body || {};
    let profile = null;

    if (launchParams && typeof launchParams === 'object') {
      const appId = String(launchParams.vk_app_id || '');
      if (appId && appId !== VK_MINI_APP_ID) {
        return res.status(403).json({ success: false, message: 'Unexpected vk_app_id' });
      }
      if (VK_MINI_SECURE_KEY && verifyLaunchParams(launchParams)) {
        const vkUserId = launchParams.vk_user_id;
        if (!vkUserId) {
          return res.status(400).json({ success: false, message: 'Missing vk_user_id' });
        }
        profile = { vkUserId: String(vkUserId), name: null, photo: null };
      } else if (VK_MINI_SECURE_KEY) {
        // Ключ задан, но подпись неверна — не доверяем params
        if (!accessToken) {
          return res.status(403).json({ success: false, message: 'Invalid launch sign' });
        }
      } else if (!accessToken && launchParams.vk_user_id) {
        // Без secure key нельзя доверять голым params
        return res.status(400).json({
          success: false,
          message: 'accessToken required',
          needToken: true
        });
      }
    }

    if (!profile && accessToken) {
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
