import dotenv from 'dotenv';
import paseto from 'paseto';

import {
  logSearchQuerySafe,
  hashGuestKey,
  normalizeAnonId,
  detectClientFromRequest,
  detectDeviceFromRequest,
} from './search-query-log.mjs';

// Same path as ai-search.mjs: env must be loaded before reading SECRET_KEY at module init
dotenv.config({ path: '/var/www/serpmonn.ru/backend/.env' });

const { V2 } = paseto;

const secretKey = process.env.SECRET_KEY;

function extractAuthToken(req) {
  const cookieToken = req.cookies?.token;
  if (cookieToken) return cookieToken;

  const header = req.headers?.authorization || req.headers?.Authorization;
  if (!header || typeof header !== 'string') return null;
  const m = header.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

async function attachUserIfToken(req, res, next) {
  const token = extractAuthToken(req);
  if (!token) {
    req.user = null;
    return next();
  }

  if (!secretKey) {
    console.error('SECRET_KEY не задан в ai-search-unified');
    req.user = null;
    return next();
  }

  try {
    const payload = await V2.verify(token, secretKey);
    req.user = payload;
  } catch (e) {
    console.warn('Недействительный токен:', e.message);
    req.user = null;
  }

  next();
}

function getUserIdentity(req) {
  if (req.user && req.user.id) {
    return { id: `user:${req.user.id}`, type: 'user' };
  }

  const vkClient = req.headers['x-client'];
  const vkUserId = req.headers['x-vk-user'];

  if (vkClient === 'vk-agent' && vkUserId) {
    return { id: `vk-user:${vkUserId}`, type: 'guest' };
  }

  return { id: `guest:${req.ip}`, type: 'guest' };
}

function searchLogIdentity(req, identity) {
  const anonId = normalizeAnonId(req.headers['x-anon-id']);
  const client = detectClientFromRequest(req);
  const device = detectDeviceFromRequest(req);

  if (identity?.type === 'user' && req.user?.id != null) {
    return {
      identityType: 'user',
      userId: String(req.user.id),
      guestKey: null,
      anonId,
      client,
      device,
    };
  }
  const raw = identity?.id || `guest:${req.ip || 'unknown'}`;
  const isVk = String(raw).startsWith('vk-user:') || client === 'vk';
  return {
    identityType: isVk ? 'vk' : 'guest',
    userId: null,
    // Prefer sticky anon cookie over IP hash
    guestKey: anonId ? hashGuestKey(`anon:${anonId}`) : hashGuestKey(raw),
    anonId,
    client,
    device,
  };
}

/** safesearch=0 только для сайта; VK Mini / RuStore — строго. */
function resolveAiSafesearch(req) {
  return detectClientFromRequest(req) === 'web' ? 0 : 2;
}

function trackSearchQuery(req, identity, fields) {
  logSearchQuerySafe({
    ...fields,
    ...searchLogIdentity(req, identity),
  });
}

export {
  secretKey,
  V2,
  extractAuthToken,
  attachUserIfToken,
  getUserIdentity,
  searchLogIdentity,
  resolveAiSafesearch,
  trackSearchQuery,
};
