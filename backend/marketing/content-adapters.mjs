/** Сбор контента для продуктов: бренд-онли промокоды + шаблоны. */

import { generateMarketingCopy } from './generate-copy.mjs';
import { generateMarketingImage } from './generate-assets.mjs';
import { applyTemplate, loadTemplate } from './templates.mjs';

const DEFAULT_PROMO_CTA = 'https://serpmonn.ru/promo';
const DEFAULT_HONEY_CTA = 'https://vrnhoney.ru';

/** Хештеги: запасной пул — только если модели не дали валидный набор. */
const HASHTAG_POOL = [
  '#Serpmonn',
  '#промокоды',
  '#скидки',
  '#купоны',
  '#экономия',
  '#выгодно',
  '#подборка',
  '#сервисы',
  '#онлайн',
  '#полезное'
];

const HONEY_HASHTAG_POOL = [
  '#VRNHoney',
  '#мёд',
  '#натуральныймёд',
  '#vrnhoney',
  '#полезное',
  '#здоровье',
  '#пасека',
  '#интернетмагазин'
];

/** @deprecated use pickHashtags — оставлен для совместимости импортов */
const PROMO_HASHTAGS = HASHTAG_POOL.slice(0, 5);

function hashSalt(s) {
  let h = 2166136261;
  const str = String(s || '');
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 3–5 хештегов в случайном порядке (детерминировано от salt). */
function pickHashtags(salt = '', pool = HASHTAG_POOL, alwaysTag = '#Serpmonn') {
  const h = hashSalt(salt || Date.now());
  const source = Array.isArray(pool) && pool.length ? pool : HASHTAG_POOL;
  const tags = [...source];
  for (let i = tags.length - 1; i > 0; i--) {
    const j = (h + i * 2654435761) % (i + 1);
    [tags[i], tags[j]] = [tags[j], tags[i]];
  }
  const always = alwaysTag || tags[0];
  const rest = tags.filter((t) => t.toLowerCase() !== String(always).toLowerCase());
  const count = 3 + (h % 3);
  const picked = always ? [always, ...rest.slice(0, Math.max(2, count - 1))] : rest.slice(0, count);
  return [...new Set(picked)].slice(0, 5);
}

function stripHashtags(text) {
  return String(text || '')
    .replace(/(^|\s)#[\p{L}\p{N}_]+/gu, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function withTrailingHashtags(body, tags) {
  const list = Array.isArray(tags) && tags.length ? tags : pickHashtags(body);
  const clean = stripHashtags(body);
  const line = list.join(' ');
  if (!clean) return line;
  return `${clean}\n\n${line}`;
}

export { stripHashtags, withTrailingHashtags, pickHashtags, PROMO_HASHTAGS, HASHTAG_POOL };

/**
 * Промокоды: рекламируем Serpmonn, не чужие бренды/коды.
 * Текст: GigaChat → Ollama. Картинка: GigaChat.
 */
export async function fromPromocodes(campaign, { slot, digestDate, withImage = true } = {}) {
  const cta = String(campaign.cta_url || '').trim() || DEFAULT_PROMO_CTA;

  const gen = await generateMarketingCopy({
    product: 'promocodes',
    format: 'text',
    ctaUrl: cta,
    salt: `${digestDate || ''}-${slot || ''}`
  });

  let media_path = null;
  let imageMeta = null;
  if (withImage) {
    imageMeta = await generateMarketingImage({
      product: 'promocodes',
      title: gen.title
    });
    media_path = imageMeta.media_path || null;
  }

  let body = stripHashtags(gen.body);
  // CTA не вшиваем в body: иначе в VK получается две ссылки (текст + cta_url)
  // Хештеги: от модели (GigaChat/Ollama) → иначе запасной пул
  const hashtags =
    Array.isArray(gen.hashtags) && gen.hashtags.length >= 3
      ? gen.hashtags
      : pickHashtags(`${digestDate || ''}-${slot || ''}-${gen.title || ''}`);
  body = withTrailingHashtags(body, hashtags);

  return {
    product: 'promocodes',
    format: 'text',
    title: stripHashtags(gen.title),
    body,
    cta_url: cta,
    channels: campaign.channels || ['vk'],
    media_path,
    meta: {
      campaignId: campaign.id,
      campaignSlug: campaign.slug,
      slot,
      digestDate,
      source: 'promocodes_brand',
      brandOnly: true,
      voice: 'company_impersonal',
      hashtags,
      hashtagsSource:
        Array.isArray(gen.hashtags) && gen.hashtags.length >= 3 ? gen.engine : 'pool',
      copyGenerated: gen.generated,
      copyModel: gen.model,
      copyEngine: gen.engine,
      copyError: gen.error || null,
      imageEngine: imageMeta?.engine || null,
      imageError: imageMeta?.error || null,
      imageFileId: imageMeta?.fileId || null
    }
  };
}

/**
 * Мёд (бренд VRNHoney / vrnhoney.ru): только площадка vk_vrnhoney.
 */
export async function fromHoney(campaign, { slot, digestDate, withImage = true } = {}) {
  const cta = String(campaign.cta_url || '').trim() || DEFAULT_HONEY_CTA;

  const gen = await generateMarketingCopy({
    product: 'honey',
    format: 'text',
    ctaUrl: cta,
    salt: `${digestDate || ''}-${slot || ''}-honey`
  });

  let media_path = null;
  let imageMeta = null;
  if (withImage) {
    imageMeta = await generateMarketingImage({
      product: 'honey',
      title: gen.title
    });
    media_path = imageMeta.media_path || null;
  }

  let body = stripHashtags(gen.body);
  // CTA только в cta_url — без дубля в тексте
  const hashtags =
    Array.isArray(gen.hashtags) && gen.hashtags.length >= 3
      ? gen.hashtags
      : pickHashtags(
        `${digestDate || ''}-${slot || ''}-${gen.title || ''}`,
        HONEY_HASHTAG_POOL,
        '#VRNHoney'
      );
  body = withTrailingHashtags(body, hashtags);

  return {
    product: 'honey',
    format: 'text',
    title: stripHashtags(gen.title),
    body,
    cta_url: cta,
    channels: ['vk_vrnhoney'],
    media_path,
    meta: {
      campaignId: campaign.id,
      campaignSlug: campaign.slug,
      slot,
      digestDate,
      source: 'honey_brand',
      brandOnly: true,
      voice: 'company_impersonal',
      lockedChannels: ['vk_vrnhoney'],
      hashtags,
      hashtagsSource:
        Array.isArray(gen.hashtags) && gen.hashtags.length >= 3 ? gen.engine : 'pool',
      copyGenerated: gen.generated,
      copyModel: gen.model,
      copyEngine: gen.engine,
      copyError: gen.error || null,
      imageEngine: imageMeta?.engine || null,
      imageError: imageMeta?.error || null,
      imageFileId: imageMeta?.fileId || null
    }
  };
}

/**
 * Контент из JSON-шаблона (+ опционально ИИ).
 */
export async function fromTemplate(campaign, { slot, digestDate, useAi = true, withImage = false } = {}) {
  const templateId = campaign.template_id || 'neli-post';
  const tpl = await loadTemplate(templateId);
  if (!tpl) {
    throw Object.assign(new Error(`Шаблон не найден: ${templateId}`), { status: 404 });
  }

  const cta = String(campaign.cta_url || tpl.cta_url || '').trim();
  let applied = applyTemplate(tpl, {
    cta_url: cta,
    channels: campaign.channels || tpl.default_channels || ['vk']
  });

  let genMeta = {
    campaignId: campaign.id,
    campaignSlug: campaign.slug,
    slot,
    digestDate,
    source: 'template',
    templateId
  };

  if (useAi) {
    const gen = await generateMarketingCopy({
      product: applied.product || tpl.product,
      format: applied.format || tpl.format,
      ctaUrl: applied.cta_url,
      fallbackTitle: applied.title,
      fallbackBody: applied.body
    });
    if (gen.generated) {
      applied = { ...applied, title: gen.title, body: gen.body };
      genMeta = {
        ...genMeta,
        copyGenerated: true,
        copyModel: gen.model,
        copyEngine: gen.engine,
        copyGeneratedAt: new Date().toISOString()
      };
    } else {
      genMeta = {
        ...genMeta,
        copyGenerated: false,
        copyError: gen.error || null
      };
    }
  }

  let media_path = null;
  if (withImage) {
    const imageMeta = await generateMarketingImage({
      product: applied.product || tpl.product,
      title: applied.title
    });
    media_path = imageMeta.media_path || null;
    genMeta = {
      ...genMeta,
      imageEngine: imageMeta.engine,
      imageError: imageMeta.error || null
    };
  }

  return {
    ...applied,
    format: applied.format === 'video' ? 'video' : 'text',
    media_path,
    channels: campaign.channels || applied.channels || ['vk'],
    meta: genMeta
  };
}

export async function buildContentForCampaign(campaign, opts = {}) {
  if (campaign.source === 'promocodes') {
    return fromPromocodes(campaign, opts);
  }
  if (campaign.source === 'honey') {
    return fromHoney(campaign, opts);
  }
  return fromTemplate(campaign, opts);
}
