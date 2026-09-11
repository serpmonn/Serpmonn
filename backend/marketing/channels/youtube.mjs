/** YouTube Shorts upload via OAuth refresh token (fetch only). */

import { readFile } from 'fs/promises';
import { resolveMarketingMedia } from '../render-short.mjs';

export const id = 'youtube';
export const label = 'YouTube Shorts';
export const formats = ['video'];

function clientId() {
  return String(process.env.MARKETING_YOUTUBE_CLIENT_ID || '').trim();
}
function clientSecret() {
  return String(process.env.MARKETING_YOUTUBE_CLIENT_SECRET || '').trim();
}
function refreshToken() {
  return String(process.env.MARKETING_YOUTUBE_REFRESH_TOKEN || '').trim();
}

export function isConfigured() {
  return Boolean(clientId() && clientSecret() && refreshToken());
}

export function supports(item) {
  return String(item?.format || '') === 'video';
}

async function getAccessToken() {
  const body = new URLSearchParams({
    client_id: clientId(),
    client_secret: clientSecret(),
    refresh_token: refreshToken(),
    grant_type: 'refresh_token'
  });
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data.error_description || data.error || 'YouTube OAuth failed');
  }
  return data.access_token;
}

export async function healthCheck() {
  if (!isConfigured()) {
    return {
      ok: false,
      detail: 'Не настроен (MARKETING_YOUTUBE_*). См. youtube-oauth-setup.mjs'
    };
  }
  try {
    const access = await getAccessToken();
    const r = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
      { headers: { Authorization: `Bearer ${access}` } }
    );
    const data = await r.json();
    if (!r.ok) throw new Error(data.error?.message || `HTTP ${r.status}`);
    const ch = data.items?.[0];
    return {
      ok: true,
      detail: ch ? `${ch.snippet?.title} (${ch.id})` : 'OAuth OK'
    };
  } catch (err) {
    return { ok: false, detail: err.message || String(err) };
  }
}

/** Из URL Shorts / watch → video id */
export function parseYoutubeVideoId(url) {
  const s = String(url || '').trim();
  if (!s) return null;
  let m = s.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/i);
  if (m) return m[1];
  m = s.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/i);
  if (m) return m[1];
  m = s.match(/[?&]v=([a-zA-Z0-9_-]{6,})/i);
  if (m) return m[1];
  m = s.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/i);
  if (m) return m[1];
  return null;
}

/** Просмотры ролика (statistics.viewCount). */
export async function fetchYoutubeViewCount(externalUrl) {
  if (!isConfigured()) return null;
  const videoId = parseYoutubeVideoId(externalUrl);
  if (!videoId) return null;
  const access = await getAccessToken();
  const r = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${encodeURIComponent(videoId)}`,
    { headers: { Authorization: `Bearer ${access}` }, signal: AbortSignal.timeout(20000) }
  );
  const data = await r.json();
  if (!r.ok) throw new Error(data.error?.message || `YouTube videos ${r.status}`);
  const views = data.items?.[0]?.statistics?.viewCount;
  if (views == null) return null;
  return Number(views) || 0;
}

export async function publish(item) {
  if (!isConfigured()) {
    return { ok: false, error: 'YouTube не подключён' };
  }
  if (item.format !== 'video' || !item.media_path) {
    return { ok: false, error: 'Нужен video + media_path' };
  }
  const abs = resolveMarketingMedia(item.media_path);
  if (!abs) return { ok: false, error: 'Некорректный media_path' };

  try {
    const access = await getAccessToken();
    const title = String(item.title || 'Serpmonn').slice(0, 100);
    const description = [item.body, item.cta_url].filter(Boolean).join('\n\n').slice(0, 5000);
    const publishAt = item.publish_at ? new Date(item.publish_at) : null;
    // AI disclosure: status.containsSyntheticMedia (YouTube A/S / GenAI label)
    const status =
      publishAt && !Number.isNaN(publishAt.getTime()) && publishAt > new Date()
        ? {
            privacyStatus: 'private',
            publishAt: publishAt.toISOString(),
            selfDeclaredMadeForKids: false,
            containsSyntheticMedia: true
          }
        : {
            privacyStatus: 'public',
            selfDeclaredMadeForKids: false,
            containsSyntheticMedia: true
          };

    const meta = JSON.stringify({
      snippet: {
        title,
        description,
        categoryId: '20',
        tags: ['Serpmonn', 'Shorts', String(item.product || '')].filter(Boolean)
      },
      status
    });

    const buf = await readFile(abs);
    const boundary = 'serpmonn_yt_' + Date.now();
    const preamble = Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n` +
        `--${boundary}\r\nContent-Type: video/mp4\r\n\r\n`
    );
    const ending = Buffer.from(`\r\n--${boundary}--\r\n`);
    const body = Buffer.concat([preamble, buf, ending]);

    const res = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=multipart&part=snippet,status',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body
      }
    );
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error?.message || `YouTube ${res.status}`);
    }
    const videoId = data.id;
    return {
      ok: true,
      url: videoId ? `https://youtube.com/shorts/${videoId}` : null,
      detail: `YouTube ${videoId}`
    };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}
