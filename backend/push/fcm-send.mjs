import { createHash } from 'crypto';
import { readFileSync, existsSync } from 'fs';
import { GoogleAuth } from 'google-auth-library';
import {
  deleteFcmTokenByHash,
  listFcmTokensForUser,
  normalizePushApp,
} from './push.model.mjs';

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';
const GOOGLE_NO_PROXY = 'oauth2.googleapis.com,fcm.googleapis.com,googleapis.com,.googleapis.com';
const PUSH_APPS = ['prod', 'dev'];

function withoutOutboundProxy(fn) {
  const proxyKeys = [
    'HTTP_PROXY',
    'HTTPS_PROXY',
    'http_proxy',
    'https_proxy',
    'ALL_PROXY',
    'all_proxy',
  ];
  const saved = {};
  for (const key of proxyKeys) {
    if (process.env[key] !== undefined) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  }
  const prevNoProxy = process.env.NO_PROXY;
  process.env.NO_PROXY = [prevNoProxy, GOOGLE_NO_PROXY].filter(Boolean).join(',');

  return Promise.resolve()
    .then(fn)
    .finally(() => {
      for (const [key, value] of Object.entries(saved)) {
        process.env[key] = value;
      }
      if (prevNoProxy === undefined) delete process.env.NO_PROXY;
      else process.env.NO_PROXY = prevNoProxy;
    });
}

function tokenHash(token) {
  return createHash('sha256').update(String(token || ''), 'utf8').digest('hex');
}

function readJsonFile(path) {
  if (!path || !existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    console.error('[fcm] failed to read service account', path, err?.message || err);
    return null;
  }
}

function loadServiceAccountForApp(app) {
  const pushApp = normalizePushApp(app);

  if (pushApp === 'dev') {
    const inline = String(process.env.FIREBASE_DEV_SERVICE_ACCOUNT_JSON || '').trim();
    if (inline) {
      try {
        return JSON.parse(inline);
      } catch {
        console.error('[fcm] invalid FIREBASE_DEV_SERVICE_ACCOUNT_JSON, trying path fallback');
      }
    }
    const path = String(process.env.FIREBASE_DEV_SERVICE_ACCOUNT_PATH || '').trim();
    return readJsonFile(path);
  }

  const inline = String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();
  if (inline) {
    try {
      return JSON.parse(inline);
    } catch {
      console.error('[fcm] invalid FIREBASE_SERVICE_ACCOUNT_JSON, trying path fallback');
    }
  }
  const path = String(process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '').trim();
  return readJsonFile(path);
}

export function isFcmConfigured() {
  return PUSH_APPS.some((app) => Boolean(loadServiceAccountForApp(app)));
}

export function isFcmConfiguredForApp(app) {
  return Boolean(loadServiceAccountForApp(app));
}

export function getFcmStatus() {
  return {
    fcm: isFcmConfigured(),
    fcmProd: isFcmConfiguredForApp('prod'),
    fcmDev: isFcmConfiguredForApp('dev'),
  };
}

let sendQueue = Promise.resolve();

function withFcmLock(fn) {
  const run = sendQueue.then(fn, fn);
  sendQueue = run.catch(() => {});
  return run;
}

async function getAccessToken(creds) {
  return withoutOutboundProxy(async () => {
    const auth = new GoogleAuth({
      credentials: creds,
      scopes: [FCM_SCOPE],
    });
    const client = await auth.getClient();
    const token = await client.getAccessToken();
    if (!token?.token) throw new Error('fcm_access_token_empty');
    return token.token;
  });
}

function absoluteAppUrl(path, app = 'prod') {
  const pushApp = normalizePushApp(app);
  const prodOrigin = String(process.env.PUSH_APP_ORIGIN || 'https://serpmonn.ru').replace(/\/+$/, '');
  const devOrigin = String(process.env.PUSH_DEV_APP_ORIGIN || 'https://dev.serpmonn.ru').replace(/\/+$/, '');
  const base = pushApp === 'dev' ? devOrigin : prodOrigin;
  const raw = String(path || '/frontend/app/index.html?app=1&tab=inbox');
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${base}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

function buildMessage(token, payload) {
  const { title, body, tag, url, type } = payload;
  return {
    token,
    notification: { title, body },
    data: {
      title,
      body,
      tag,
      url,
      type,
    },
    android: {
      priority: 'HIGH',
      notification: {
        channel_id: 'dm_messages',
        tag,
        sound: 'default',
        icon: 'ic_stat_notification',
        color: '#C62828',
      },
    },
  };
}

async function sendOneToken(accessToken, projectId, token, payload) {
  return withoutOutboundProxy(async () => {
    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: buildMessage(token, payload) }),
      }
    );

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: true, id: data?.name || '' };
    }

    const errBody = await res.json().catch(() => ({}));
    const error = errBody?.error || {};
    const details = Array.isArray(error.details) ? error.details : [];
    const fcmDetail = details.find((item) => item?.errorCode);
    return {
      ok: false,
      code: String(error.status || error.code || res.status),
      message: String(error.message || res.statusText || 'send_failed'),
      fcmErrorCode: String(fcmDetail?.errorCode || ''),
      status: res.status,
    };
  });
}

function isInvalidToken(result) {
  const fcmCode = String(result?.fcmErrorCode || '').toUpperCase();
  if (fcmCode === 'UNREGISTERED') return true;
  const hay = `${result?.code || ''} ${result?.message || ''}`.toUpperCase();
  return hay.includes('REGISTRATION_TOKEN_NOT_REGISTERED')
    || hay.includes('INVALID_REGISTRATION_TOKEN');
}

export async function warmUpFcm() {
  if (!isFcmConfigured()) return false;
  let ok = false;
  for (const app of PUSH_APPS) {
    const creds = loadServiceAccountForApp(app);
    if (!creds) continue;
    try {
      await getAccessToken(creds);
      ok = true;
    } catch (err) {
      console.error(`[fcm] warm-up failed (${app})`, err?.message || err);
    }
  }
  return ok;
}

async function sendTokensWithCreds(userId, rows, creds, msgPayloadBase) {
  const projectId = String(creds?.project_id || '').trim();
  if (!projectId || !rows.length) return 0;

  let sent = 0;
  let accessToken;
  try {
    accessToken = await getAccessToken(creds);
  } catch (err) {
    console.error('[fcm] auth failed', userId, projectId, err?.message || err);
    return 0;
  }

  for (const row of rows) {
    const msgPayload = {
      ...msgPayloadBase,
      url: absoluteAppUrl(msgPayloadBase.urlPath, row.app),
    };
    let result = await sendOneToken(accessToken, projectId, row.token, msgPayload);

    if (!result.ok && (result.code === 'UNAUTHENTICATED' || result.status === 401)) {
      try {
        accessToken = await getAccessToken(creds);
        result = await sendOneToken(accessToken, projectId, row.token, msgPayload);
      } catch (err) {
        console.error('[fcm] auth retry failed', userId, err?.message || err);
        break;
      }
    }

    if (result.ok) {
      sent += 1;
      continue;
    }

    if (isInvalidToken(result)) {
      await deleteFcmTokenByHash(tokenHash(row.token)).catch(() => {});
      console.warn('[fcm] removed invalid token for', userId, result.fcmErrorCode || result.code);
      continue;
    }

    console.error('[fcm] send failed', userId, result.code, result.message);
  }

  return sent;
}

export async function sendFcmToUser(userId, payload) {
  if (!userId || !isFcmConfigured()) return { sent: 0 };

  const rows = await listFcmTokensForUser(userId);
  if (!rows.length) return { sent: 0 };

  const title = String(payload?.title || 'Serpmonn');
  const body = String(payload?.body || 'Новое сообщение');
  const tag = String(payload?.tag || 'dm');
  const urlPath = payload?.url;
  const type = String(payload?.type || 'dm');
  const msgPayloadBase = { title, body, tag, urlPath, type };

  return withFcmLock(async () => {
    const byApp = { prod: [], dev: [] };
    for (const row of rows) {
      const app = normalizePushApp(row.app);
      byApp[app].push({ ...row, app });
    }

    let sent = 0;
    for (const app of PUSH_APPS) {
      const group = byApp[app];
      if (!group.length) continue;
      const creds = loadServiceAccountForApp(app);
      if (!creds) {
        console.warn(`[fcm] no service account for app=${app}, skip ${group.length} tokens`);
        continue;
      }
      sent += await sendTokensWithCreds(userId, group, creds, msgPayloadBase);
    }

    if (sent === 0 && rows.length) {
      console.warn('[fcm] no deliveries for user', userId, 'tokens', rows.length);
    } else if (sent > 0) {
      console.log('[fcm] delivered', sent, 'for user', userId);
    }

    return { sent };
  });
}
