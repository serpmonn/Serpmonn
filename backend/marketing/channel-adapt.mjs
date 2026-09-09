/**
 * Адаптация master-креатива под каналы (нативные версии, не копипаст).
 */

import { stripHashtags, withTrailingHashtags, pickHashtags } from './content-adapters.mjs';
import { isVkChannelId } from './channels/vk.mjs';

function withUtm(ctaUrl, channelId, digestDate) {
  const raw = String(ctaUrl || '').trim();
  if (!raw) return '';
  try {
    const u = new URL(raw, 'https://serpmonn.ru');
    if (!u.searchParams.get('utm_source')) {
      u.searchParams.set('utm_source', String(channelId || 'social'));
    } else {
      u.searchParams.set('utm_source', String(channelId || u.searchParams.get('utm_source')));
    }
    if (!u.searchParams.get('utm_medium')) u.searchParams.set('utm_medium', 'social');
    const camp = digestDate
      ? `reach_${String(digestDate).replace(/-/g, '')}`
      : (u.searchParams.get('utm_campaign') || 'promocodes_brand');
    u.searchParams.set('utm_campaign', camp);
    return u.toString();
  } catch {
    return raw;
  }
}

function firstHook(body, title) {
  const lines = String(body || '')
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  return lines[0] || String(title || '').trim() || 'Serpmonn';
}

/** @returns {Record<string, { title: string, body: string, cta_url: string, checklist?: string[] }>} */
export function adaptContentForChannels(master, channelIds, { digestDate } = {}) {
  const title = stripHashtags(master.title || '');
  const bodyRaw = stripHashtags(master.body || '');
  const baseCta = String(master.cta_url || '').trim();
  const out = {};

  for (const cid of channelIds || []) {
    const id = String(cid);
    const cta = withUtm(baseCta, id, digestDate);

    if (isVkChannelId(id)) {
      // Ссылку в body не дублируем: в VK она один раз добавится из cta_url при wall.post
      const tags = master.meta?.hashtags || pickHashtags(`${digestDate || ''}-${title}-${id}`);
      const body = withTrailingHashtags(bodyRaw, tags);
      out[id] = { title, body, cta_url: cta };
      continue;
    }

    if (id === 'telegram') {
      const hook = firstHook(bodyRaw, title);
      const rest = bodyRaw
        .split(/\n+/)
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(1, 4)
        .join('\n');
      let body = [hook, rest, cta].filter(Boolean).join('\n\n').slice(0, 900);
      out.telegram = {
        title: title.slice(0, 120),
        body,
        cta_url: cta
      };
      continue;
    }

    if (id === 'dzen') {
      const lead = firstHook(bodyRaw, title);
      const body = [
        lead,
        '',
        bodyRaw || 'Актуальные промокоды и скидки — в одном разделе Serpmonn.',
        '',
        'Почему это удобно: одна страница вместо десятка вкладок.',
        cta ? `Подробнее: ${cta}` : ''
      ]
        .filter((x) => x != null)
        .join('\n')
        .trim();
      out.dzen = {
        title: title.slice(0, 80) || 'Промокоды Serpmonn',
        body,
        cta_url: cta,
        checklist: [
          'Создай черновик в Дзен (статья или пост)',
          'Вставь SEO-заголовок и лид из превью',
          'Загрузи обложку (картинка из публикации)',
          'Добавь ссылку на Serpmonn в конце',
          'Опубликуй и вставь URL обратно в админку'
        ]
      };
      continue;
    }

    if (id === 'manual' || id === 'ok' || id === 'rutube') {
      out[id] = {
        title,
        body: [bodyRaw, cta].filter(Boolean).join('\n\n'),
        cta_url: cta,
        checklist: [
          `Скопируй текст для ${id}`,
          'Опубликуй на площадке',
          'Верни ссылку и охват в отчёт'
        ]
      };
      continue;
    }

    // youtube / default
    out[id] = {
      title,
      body: [bodyRaw, cta].filter(Boolean).join('\n\n'),
      cta_url: cta
    };
  }

  return out;
}

/** Берёт адаптированный payload для канала или master. */
export function payloadForChannel(item, channelId) {
  const adaptations = item?.meta?.channelAdaptations || {};
  const adapted = adaptations[channelId];
  if (!adapted) {
    return {
      title: item.title,
      body: item.body,
      cta_url: item.cta_url,
      media_path: item.media_path,
      format: item.format,
      publish_at: item.publish_at,
      id: item.id,
      meta: item.meta
    };
  }
  return {
    ...item,
    title: adapted.title || item.title,
    body: adapted.body || item.body,
    cta_url: adapted.cta_url || item.cta_url,
    checklist: adapted.checklist || null
  };
}
