/** VK wall + video for Serpmonn group. */

import { readFile } from 'fs/promises';
import { basename } from 'path';
import { resolveMarketingMedia } from '../render-short.mjs';

export const id = 'vk';
export const label = 'VK';
export const formats = ['text', 'video'];

const API = 'https://api.vk.com/method';
const V = '5.199';

function token() {
  return String(process.env.MARKETING_VK_TOKEN || '').trim();
}

function groupId() {
  return String(process.env.MARKETING_VK_GROUP_ID || '').trim();
}

export function isConfigured() {
  return Boolean(token() && groupId());
}

export function supports(item) {
  const f = String(item?.format || 'text');
  return formats.includes(f);
}

async function vkCall(method, params = {}) {
  const body = new URLSearchParams({
    access_token: token(),
    v: V,
    ...Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, v == null ? '' : String(v)])
    )
  });
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const data = await res.json();
  if (data.error) {
    const e = new Error(data.error.error_msg || `VK ${method} error`);
    e.code = data.error.error_code;
    throw e;
  }
  return data.response;
}

export async function healthCheck() {
  if (!isConfigured()) {
    return { ok: false, detail: 'Не настроен (MARKETING_VK_TOKEN, MARKETING_VK_GROUP_ID)' };
  }
  try {
    const r = await vkCall('groups.getById', { group_id: groupId() });
    const g = r?.groups?.[0] || r?.[0];
    return {
      ok: true,
      detail: g ? `${g.name || g.screen_name} (#${g.id})` : `group ${groupId()}`
    };
  } catch (err) {
    return { ok: false, detail: err.message || String(err) };
  }
}

function postMessage(item) {
  const parts = [
    item.title ? String(item.title).trim() : '',
    item.body ? String(item.body).trim() : '',
    item.cta_url ? String(item.cta_url).trim() : ''
  ].filter(Boolean);
  return parts.join('\n\n').slice(0, 4000);
}

async function uploadWallPhoto(absPath) {
  const gid = groupId();
  const server = await vkCall('photos.getWallUploadServer', { group_id: gid });
  const form = new FormData();
  const buf = await readFile(absPath);
  form.append('photo', new Blob([buf]), basename(absPath));
  const up = await fetch(server.upload_url, { method: 'POST', body: form });
  const uploaded = await up.json();
  const saved = await vkCall('photos.saveWallPhoto', {
    group_id: gid,
    photo: uploaded.photo,
    server: uploaded.server,
    hash: uploaded.hash
  });
  const photo = Array.isArray(saved) ? saved[0] : saved;
  return `photo${photo.owner_id}_${photo.id}`;
}

async function uploadVideo(absPath, item) {
  const gid = groupId();
  const saved = await vkCall('video.save', {
    name: String(item.title || 'Serpmonn').slice(0, 128),
    description: postMessage(item).slice(0, 5000),
    group_id: gid,
    wallpost: 0
  });
  const form = new FormData();
  const buf = await readFile(absPath);
  form.append('video_file', new Blob([buf], { type: 'video/mp4' }), basename(absPath));
  const up = await fetch(saved.upload_url, { method: 'POST', body: form });
  const upJson = await up.json().catch(() => ({}));
  if (upJson.error_code || upJson.error) {
    throw new Error(upJson.error_msg || upJson.error || 'VK video upload failed');
  }
  const ownerId = saved.owner_id ?? -Number(gid);
  const videoId = saved.video_id;
  return `video${ownerId}_${videoId}`;
}

export async function publish(item) {
  if (!isConfigured()) {
    return { ok: false, error: 'VK не подключён' };
  }

  const gid = groupId();
  const message = postMessage(item);
  const attachments = [];

  try {
    if (item.format === 'video' && item.media_path) {
      const abs = resolveMarketingMedia(item.media_path);
      if (!abs) return { ok: false, error: 'Некорректный media_path' };
      try {
        const att = await uploadVideo(abs, item);
        attachments.push(att);
      } catch (videoErr) {
        // fallback: кадр/картинка на стену, если video API недоступен
        console.warn('[vk] video upload failed, fallback photo', videoErr.message);
        const promo = resolveMarketingMedia('assets/clips/neli-promo.png');
        if (promo) attachments.push(await uploadWallPhoto(promo));
      }
    } else if (item.media_path && /\.(png|jpe?g|webp)$/i.test(item.media_path)) {
      const abs = resolveMarketingMedia(item.media_path);
      if (abs) attachments.push(await uploadWallPhoto(abs));
    }

    const post = await vkCall('wall.post', {
      owner_id: `-${gid}`,
      from_group: 1,
      message,
      attachments: attachments.join(',') || undefined,
      guid: `mkt-${item.id || Date.now()}`
    });

    const postId = post?.post_id;
    const url = postId ? `https://vk.com/wall-${gid}_${postId}` : null;
    return { ok: true, url, detail: `VK post #${postId}` };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}
