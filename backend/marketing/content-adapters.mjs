/** Сбор контента для продуктов: бренд-онли промокоды + шаблоны. */

import { generateMarketingCopy } from './generate-copy.mjs';
import { generateMarketingImage } from './generate-assets.mjs';
import { applyTemplate, loadTemplate } from './templates.mjs';

const DEFAULT_PROMO_CTA = 'https://serpmonn.ru/promo';
const DEFAULT_HONEY_CTA = 'https://vrnhoney.ru';
const DEFAULT_GAMES_CTA = 'https://serpmonn.ru/games';

/** Хештеги: запасной пул — если модели мало / штамп. */
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
  '#полезное',
  '#сервис',
  '#выгода',
  '#акции',
  '#предложения',
  '#promo',
  '#deals',
  '#coupons',
  '#discounts',
  '#savings'
];

const HONEY_HASHTAG_POOL = [
  '#VRNHoney',
  '#мёд',
  '#натуральныймёд',
  '#vrnhoney',
  '#полезное',
  '#здоровье',
  '#пасека',
  '#интернетмагазин',
  '#мёдок',
  '#натуральное',
  '#доставка',
  '#honey',
  '#naturalhoney',
  '#organic'
];

const GAMES_HASHTAG_POOL = [
  '#Serpmonn',
  '#игры',
  '#браузерныеигры',
  '#онлайнигры',
  '#безскачивания',
  '#досуг',
  '#развлечения',
  '#миниигры',
  '#играй',
  '#аркада',
  '#бесплатныеигры',
  '#games',
  '#browsergames',
  '#onlinegames',
  '#minigames',
  '#freeGames'
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

/** Настоящий Fisher–Yates (+ лёгкий seed для воспроизводимости в тестах). */
function shuffleTags(list, seed) {
  const tags = [...list];
  let h = hashSalt(String(seed ?? '') + String(Date.now()) + String(Math.random()));
  for (let i = tags.length - 1; i > 0; i--) {
    h = (Math.imul(h, 1664525) + 1013904223) >>> 0;
    const j = h % (i + 1);
    [tags[i], tags[j]] = [tags[j], tags[i]];
  }
  return tags;
}

function poolForProduct(product) {
  const p = String(product || '').toLowerCase();
  if (p === 'honey') return HONEY_HASHTAG_POOL;
  if (p === 'games') return GAMES_HASHTAG_POOL;
  return HASHTAG_POOL;
}

function brandTagForProduct(product) {
  return String(product || '').toLowerCase() === 'honey' ? '#VRNHoney' : '#Serpmonn';
}

/** Уникальные теги, порядок сохраняем. */
function uniqueHashtags(tags) {
  const out = [];
  const seen = new Set();
  for (const raw of tags || []) {
    let t = String(raw || '').trim();
    if (!t) continue;
    if (!t.startsWith('#')) t = `#${t}`;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

/**
 * 3–5 хештегов: бренд обязателен, остальное из пула в случайном порядке.
 * Порядок всего набора тоже перемешивается (бренд не всегда первый).
 */
function pickHashtags(salt = '', pool = HASHTAG_POOL, alwaysTag = '#Serpmonn') {
  const source = Array.isArray(pool) && pool.length ? pool : HASHTAG_POOL;
  const always = alwaysTag || source[0];
  const rest = shuffleTags(
    source.filter((t) => t.toLowerCase() !== String(always).toLowerCase()),
    salt
  );
  const count = 3 + (hashSalt(salt + String(Math.random())) % 3); // 3..5
  const picked = uniqueHashtags([always, ...rest.slice(0, Math.max(2, count - 1))]);
  return shuffleTags(picked, `${salt}-order`).slice(0, 5);
}

/**
 * Теги от модели: если штамп/мало — пул; иначе перемешать и подмешать 1–2 из пула.
 */
function resolveHashtags({ product, modelTags, salt }) {
  const pool = poolForProduct(product);
  const brand = brandTagForProduct(product);
  const fromModel = uniqueHashtags(Array.isArray(modelTags) ? modelTags : []);
  const boring = new Set(
    [
      '#промокоды',
      '#скидки',
      '#купоны',
      '#экономия',
      '#serpmonn',
      '#игры',
      '#браузерныеигры',
      '#promo',
      '#deals',
      '#coupons',
      '#games',
      '#browsergames'
    ].map((t) => t.toLowerCase())
  );
  const modelRest = fromModel.filter((t) => t.toLowerCase() !== brand.toLowerCase());
  const tooBoring =
    modelRest.length >= 2 && modelRest.every((t) => boring.has(t.toLowerCase()));

  if (fromModel.length < 3 || tooBoring) {
    return pickHashtags(salt, pool, brand);
  }

  const extras = shuffleTags(
    pool.filter(
      (t) =>
        t.toLowerCase() !== brand.toLowerCase() &&
        !fromModel.some((m) => m.toLowerCase() === t.toLowerCase())
    ),
    `${salt}-extra`
  ).slice(0, 1 + (hashSalt(salt) % 2)); // 1–2 свежих из пула

  const mixed = uniqueHashtags([brand, ...shuffleTags(modelRest, salt), ...extras]);
  const count = Math.min(5, Math.max(3, mixed.length));
  return shuffleTags(mixed.slice(0, count), `${salt}-final`);
}

function stripHashtags(text) {
  return String(text || '')
    .replace(/(^|\s)#[\p{L}\p{N}_]+/gu, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function withTrailingHashtags(body, tags) {
  const list = uniqueHashtags(Array.isArray(tags) && tags.length ? tags : pickHashtags(body));
  const clean = stripHashtags(body);
  const line = list.join(' ');
  if (!clean) return line;
  return `${clean}\n\n${line}`;
}

export { stripHashtags, withTrailingHashtags, pickHashtags, resolveHashtags, uniqueHashtags, PROMO_HASHTAGS, HASHTAG_POOL };

/**
 * Промокоды: рекламируем Serpmonn, не чужие бренды/коды.
 * Текст: GigaChat → Ollama. Картинка (опционально): GigaChat — не для VK.
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
  const salt = `${digestDate || ''}-${slot || ''}-${gen.title || ''}-${Date.now()}`;
  const hashtags = resolveHashtags({
    product: 'promocodes',
    modelTags: gen.hashtags,
    salt
  });
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
      hashtagsSource: Array.isArray(gen.hashtags) && gen.hashtags.length >= 3 ? gen.engine : 'pool',
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
  const salt = `${digestDate || ''}-${slot || ''}-${gen.title || ''}-honey-${Date.now()}`;
  const hashtags = resolveHashtags({
    product: 'honey',
    modelTags: gen.hashtags,
    salt
  });
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
      hashtagsSource: Array.isArray(gen.hashtags) && gen.hashtags.length >= 3 ? gen.engine : 'pool',
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
 * Игры Serpmonn → https://serpmonn.ru/games
 */
export async function fromGames(campaign, { slot, digestDate, withImage = true } = {}) {
  const cta = String(campaign.cta_url || '').trim() || DEFAULT_GAMES_CTA;

  const gen = await generateMarketingCopy({
    product: 'games',
    format: 'text',
    ctaUrl: cta,
    salt: `${digestDate || ''}-${slot || ''}-games`
  });

  let media_path = null;
  let imageMeta = null;
  if (withImage) {
    imageMeta = await generateMarketingImage({
      product: 'games',
      title: gen.title
    });
    media_path = imageMeta.media_path || null;
  }

  let body = stripHashtags(gen.body);
  const salt = `${digestDate || ''}-${slot || ''}-${gen.title || ''}-games-${Date.now()}`;
  const hashtags = resolveHashtags({
    product: 'games',
    modelTags: gen.hashtags,
    salt
  });
  body = withTrailingHashtags(body, hashtags);

  return {
    product: 'games',
    format: 'text',
    title: stripHashtags(gen.title),
    body,
    cta_url: cta,
    channels: campaign.channels || ['vk', 'telegram', 'youtube'],
    media_path,
    meta: {
      campaignId: campaign.id,
      campaignSlug: campaign.slug,
      slot,
      digestDate,
      source: 'games_brand',
      brandOnly: true,
      voice: 'company_impersonal',
      hashtags,
      hashtagsSource: Array.isArray(gen.hashtags) && gen.hashtags.length >= 3 ? gen.engine : 'pool',
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
  if (campaign.source === 'games') {
    return fromGames(campaign, opts);
  }
  return fromTemplate(campaign, opts);
}
