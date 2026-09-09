/** Telegram channel: Bot API sendMessage / sendPhoto. */

import { readFile } from 'fs/promises';
import { basename } from 'path';
import { resolveMarketingMedia } from '../render-short.mjs';
import { payloadForChannel } from '../channel-adapt.mjs';

export const id = 'telegram';
export const label = 'Telegram Serpmonn';
export const formats = ['text', 'video'];

function token() {
  return String(process.env.MARKETING_TG_BOT_TOKEN || '').trim();
}

function chatId() {
  return String(process.env.MARKETING_TG_CHANNEL_ID || '').trim();
}

export function isConfigured() {
  return Boolean(token() && chatId());
}

export function supports(item) {
  const f = String(item?.format || 'text');
  return formats.includes(f);
}

export async function healthCheck() {
  if (!isConfigured()) {
    return {
      ok: false,
      detail: 'Не настроен (токен бота / канал)'
    };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token()}/getMe`, {
      signal: AbortSignal.timeout(10000)
    });
    const data = await res.json();
    if (!data.ok) {
      return { ok: false, detail: data.description || 'getMe failed' };
    }
    return {
      ok: true,
      detail: `@${data.result?.username || 'bot'} → ${chatId()}`
    };
  } catch (err) {
    return { ok: false, detail: err.message || String(err) };
  }
}

function buildCaption(item) {
  const parts = [
    item.title ? String(item.title).trim() : '',
    item.body ? String(item.body).trim() : ''
  ].filter(Boolean);
  return parts.join('\n\n').slice(0, 1024);
}

async function tgCall(method, body) {
  const res = await fetch(`https://api.telegram.org/bot${token()}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000)
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(data.description || `Telegram ${method} failed`);
  }
  return data.result;
}

function messageUrl(msg) {
  const username = String(chatId()).replace(/^@/, '');
  if (msg?.message_id && !/^-?\d+$/.test(username)) {
    return `https://t.me/${username}/${msg.message_id}`;
  }
  if (msg?.message_id && /^-100/.test(String(chatId()))) {
    const internal = String(chatId()).replace(/^-100/, '');
    return `https://t.me/c/${internal}/${msg.message_id}`;
  }
  return null;
}

/** publish_at в будущем → не шлём сейчас (отложенная отправка через refresh). */
function shouldDefer(item) {
  if (!item?.publish_at) return false;
  const raw = String(item.publish_at).trim();
  let d;
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(raw) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw)) {
    d = new Date(raw.replace(' ', 'T') + '+03:00');
  } else {
    d = new Date(raw);
  }
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() > Date.now() + 60_000;
}

export async function publish(item) {
  if (!isConfigured()) {
    return { ok: false, error: 'Telegram не подключён' };
  }

  const payload = payloadForChannel(item, 'telegram');

  if (shouldDefer(payload) || shouldDefer(item)) {
    return {
      ok: true,
      deferred: true,
      url: null,
      detail: `Отложено до ${item.publish_at} МСК — отправится при publish-due`
    };
  }

  const text = buildCaption(payload);
  const chat_id = chatId();

  try {
    let msg;
    const media = payload.media_path || item.media_path;
    if (media && /\.(png|jpe?g|webp)$/i.test(media)) {
      const abs = resolveMarketingMedia(media);
      if (abs) {
        const form = new FormData();
        form.append('chat_id', chat_id);
        form.append('caption', text.slice(0, 1024));
        form.append('parse_mode', 'HTML');
        const buf = await readFile(abs);
        form.append('photo', new Blob([buf]), basename(abs));
        const res = await fetch(
          `https://api.telegram.org/bot${token()}/sendPhoto`,
          { method: 'POST', body: form, signal: AbortSignal.timeout(90000) }
        );
        const data = await res.json();
        if (!data.ok) throw new Error(data.description || 'sendPhoto failed');
        msg = data.result;
      }
    }

    if (!msg) {
      msg = await tgCall('sendMessage', {
        chat_id,
        text: text.slice(0, 4096),
        disable_web_page_preview: false
      });
    }

    const url = messageUrl(msg);
    return {
      ok: true,
      url,
      detail: `TG message #${msg?.message_id || '?'}`
    };
  } catch (err) {
    return { ok: false, error: err.message || String(err) };
  }
}
