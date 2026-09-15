/**
 * Лёгкая маркировка рекламы до ОРД:
 * - meta.isAd → VK mark_as_ads + префикс «Реклама.» на площадках без метки
 * - meta.erid → ?erid= в CTA (или строка erid: в тексте)
 */

import { isVkChannelId } from './channels/vk.mjs';

const AD_PREFIX = 'Реклама.';

export function itemIsAd(item) {
  const meta = item?.meta;
  if (!meta || typeof meta !== 'object') return false;
  return Boolean(meta.isAd);
}

export function itemErid(item) {
  const meta = item?.meta;
  if (!meta || typeof meta !== 'object') return '';
  return String(meta.erid || '').trim();
}

export function withEridOnUrl(url, erid) {
  const raw = String(url || '').trim();
  const token = String(erid || '').trim();
  if (!raw || !token) return raw;
  try {
    const u = new URL(raw, 'https://serpmonn.ru');
    if (!u.searchParams.get('erid')) u.searchParams.set('erid', token);
    return u.toString();
  } catch {
    return raw;
  }
}

export function ensureAdTextPrefix(text) {
  const t = String(text || '');
  const trimmed = t.trim();
  if (!trimmed) return AD_PREFIX;
  if (/^реклама\b/i.test(trimmed)) return t;
  return `${AD_PREFIX}\n\n${t}`;
}

/**
 * Применяет маркировку к payload канала перед publish.
 * VK: только erid в ссылке (метка «Это реклама» через mark_as_ads).
 * Остальные: префикс «Реклама.» + erid в ссылке/тексте.
 */
export function applyAdMarking(payload, channelId) {
  if (!itemIsAd(payload)) return payload;

  const erid = itemErid(payload);
  const isVk = isVkChannelId(channelId);
  let title = payload.title;
  let body = payload.body;
  let cta = withEridOnUrl(payload.cta_url, erid);

  if (!isVk) {
    if (body && String(body).trim()) {
      body = ensureAdTextPrefix(body);
    } else if (title && String(title).trim()) {
      title = ensureAdTextPrefix(title);
    } else {
      body = AD_PREFIX;
    }
  }

  if (erid && !String(cta || '').trim()) {
    const line = `erid: ${erid}`;
    const cur = String(body || '').trim();
    if (!cur.includes(erid)) {
      body = cur ? `${cur}\n\n${line}` : line;
    }
  }

  return {
    ...payload,
    title,
    body,
    cta_url: cta || null
  };
}

/** Слияние флагов маркировки в meta (для PUT из админки). */
export function mergeAdMarkMeta(baseMeta, { isAd, erid } = {}) {
  const meta = baseMeta && typeof baseMeta === 'object' ? { ...baseMeta } : {};
  if (isAd !== undefined) meta.isAd = Boolean(isAd);
  if (erid !== undefined) {
    const t = String(erid || '').trim().slice(0, 128);
    if (t) meta.erid = t;
    else delete meta.erid;
  }
  return meta;
}
