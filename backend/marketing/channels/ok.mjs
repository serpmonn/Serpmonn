/**
 * OK.ru (Одноклассники): mediatopic.post в группу.
 * Env:
 *   MARKETING_OK_ACCESS_TOKEN
 *   MARKETING_OK_APPLICATION_KEY
 *   MARKETING_OK_APPLICATION_SECRET
 *   MARKETING_OK_GROUP_ID
 *   MARKETING_OK_SESSION_SECRET_KEY (опционально; иначе MD5(token+app_secret))
 *   MARKETING_OK_GROUP_URL (опционально, для ссылок в админке)
 */

import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import { basename } from 'path';
import { resolveMarketingMedia } from '../render-short.mjs';

const API = 'https://api.ok.ru/fb.do';

export const id = 'ok';
export const label = 'OK.ru Serpmonn';
export const formats = ['text', 'video'];

function env(name, fallback = '') {
  const v = String(process.env[name] || '').trim();
  return v || fallback;
}

function accessToken() {
  return env('MARKETING_OK_ACCESS_TOKEN');
}

function applicationKey() {
  return env('MARKETING_OK_APPLICATION_KEY');
}

function applicationSecret() {
  return env('MARKETING_OK_APPLICATION_SECRET');
}

function groupId() {
  return env('MARKETING_OK_GROUP_ID');
}

function groupUrl() {
  const custom = env('MARKETING_OK_GROUP_URL');
  if (custom) return custom;
  const gid = groupId();
  return gid ? `https://ok.ru/group/${gid}` : '';
}

/** session_secret_key = MD5(access_token + application_secret_key) */
function sessionSecretKey() {
  const explicit = env('MARKETING_OK_SESSION_SECRET_KEY');
  if (explicit) return explicit;
  const token = accessToken();
  const secret = applicationSecret();
  if (!token || !secret) return '';
  return createHash('md5').update(`${token}${secret}`, 'utf8').digest('hex');
}

export function isConfigured() {
  return Boolean(
    accessToken() && applicationKey() && applicationSecret() && groupId()
  );
}

export function supports(item) {
  const f = String(item?.format || 'text');
  return formats.includes(f);
}

function signParams(params) {
  const ssk = sessionSecretKey();
  const forSig = { ...params };
  delete forSig.access_token;
  delete forSig.session_key;
  delete forSig.sig;
  const keys = Object.keys(forSig).sort();
  let raw = '';
  for (const k of keys) {
    raw += `${k}=${forSig[k] == null ? '' : String(forSig[k])}`;
  }
  raw += ssk;
  return createHash('md5').update(raw, 'utf8').digest('hex');
}

async function okCall(method, params = {}) {
  const body = {
    method,
    application_key: applicationKey(),
    access_token: accessToken(),
    format: 'json',
    ...Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, v == null ? '' : String(v)])
    )
  };
  body.sig = signParams(body);
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
    signal: AbortSignal.timeout(60000)
  });
  const data = await res.json();
  if (data?.error_code || data?.error_msg) {
    const e = new Error(data.error_msg || `OK ${method} error ${data.error_code}`);
    e.code = data.error_code;
    e.method = method;
    throw e;
  }
  return data;
}

function postText(item) {
  const title = item.title ? String(item.title).trim() : '';
  const body = item.body ? String(item.body).trim() : '';
  const cta = item.cta_url ? String(item.cta_url).trim() : '';
  return [title, body, cta].filter(Boolean).join('\n\n').slice(0, 4000);
}

function isImagePath(p) {
  return /\.(png|jpe?g|webp|gif)$/i.test(String(p || ''));
}

async function uploadGroupPhoto(absPath) {
  const uploadInfo = await okCall('photosV2.getUploadUrl', {
    gid: groupId(),
    count: 1
  });
  const photoId = uploadInfo?.photo_ids?.[0];
  const uploadUrl = uploadInfo?.upload_url;
  if (!photoId || !uploadUrl) {
    throw new Error('OK: нет upload_url / photo_ids');
  }

  const buf = await readFile(absPath);
  const name = basename(absPath) || 'photo.jpg';
  const form = new FormData();
  form.append(
    'pic1',
    new Blob([buf], { type: 'application/octet-stream' }),
    name
  );
  const up = await fetch(uploadUrl, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(120000)
  });
  const upData = await up.json();
  const token = upData?.photos?.[photoId]?.token;
  if (!token) {
    throw new Error('OK: нет token после загрузки фото');
  }
  return token;
}

function topicUrl(topicId) {
  const gid = groupId();
  if (!topicId || !gid) return groupUrl() || null;
  return `https://ok.ru/group/${gid}/topic/${topicId}`;
}

export async function healthCheck() {
  if (!isConfigured()) {
    const missing = [
      !accessToken() ? 'access_token' : null,
      !applicationKey() ? 'application_key' : null,
      !applicationSecret() ? 'application_secret' : null,
      !groupId() ? 'group_id' : null
    ].filter(Boolean);
    return {
      ok: false,
      detail: `Не настроен (${missing.join(', ')}) · ${groupUrl() || 'https://ok.ru/group/70000055870397'}`
    };
  }
  try {
    const r = await okCall('group.getCounters', {
      group_id: groupId(),
      counterTypes: 'members'
    });
    const members = r?.counters?.members;
    const link = groupUrl();
    return {
      ok: true,
      detail: members != null
        ? `группа #${groupId()} · ${members} уч.${link ? ` · ${link}` : ''}`
        : `группа #${groupId()}${link ? ` · ${link}` : ''}`
    };
  } catch (err) {
    return { ok: false, detail: err.message || String(err) };
  }
}

export async function publish(item) {
  if (!isConfigured()) {
    return { ok: false, error: 'OK.ru: не подключён (MARKETING_OK_*)' };
  }

  const text = postText(item);
  const media = [];
  if (text) media.push({ type: 'text', text });

  const rel = String(item.media_path || '').trim();
  if (rel && isImagePath(rel)) {
    const abs = resolveMarketingMedia(rel);
    if (abs) {
      try {
        const token = await uploadGroupPhoto(abs);
        media.push({ type: 'photo', list: [{ id: token }] });
      } catch (err) {
        // Фото опционально: пост текстом всё равно уйдёт
        console.warn('[ok] photo upload failed:', err.message || err);
      }
    }
  }

  const cta = item.cta_url ? String(item.cta_url).trim() : '';
  if (cta && !text.includes(cta)) {
    media.push({ type: 'link', url: cta });
  }

  if (!media.length) {
    return { ok: false, error: 'OK.ru: пустой пост' };
  }

  const attachment = {
    media,
    onBehalfOfGroup: 'true',
    disableComments: 'false'
  };

  try {
    const topicId = await okCall('mediatopic.post', {
      type: 'GROUP_THEME',
      gid: groupId(),
      attachment: JSON.stringify(attachment)
    });
    const idStr = topicId != null ? String(topicId) : '';
    return {
      ok: true,
      url: topicUrl(idStr),
      detail: idStr ? `OK topic #${idStr}` : 'OK post ok'
    };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}
