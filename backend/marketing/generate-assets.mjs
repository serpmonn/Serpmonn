/** Картинки для маркетинговых постов (GigaChat / Kandinsky). */

import { readdirSync } from 'fs';
import { readdir, mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import {
  generateImageWithGigaChat,
  isGigaChatConfigured
} from '../ai-search/gigachat-client.mjs';
import {
  enqueueGigaChat
} from './gigachat-guard.mjs';
import { MARKETING_ROOT, resolveMarketingMedia } from './render-short.mjs';

const FALLBACK_IMAGE = 'brand/logo.png';

/** Статичные brand-кадры (последний рубеж). */
const STILL_POOL = [
  'brand/serpmonn-ads-banner-v2.png',
  'brand/serpmonn-ads-3d-mockup.png',
  'brand/serpmonn-ads-3d-logo.png',
  'brand/serpmonn-3d-logo-realistic.png',
  'brand/serpmonn-3d-logo-standing.png',
  'brand/serpmonn-ads-avatar-800.png',
  'brand/serpmonn-banner.png',
  'assets/clips/neli-promo.png',
  FALLBACK_IMAGE
];

/** CC0-сток по продукту: assets/stills/{product}/01.jpg … */
export function productStillPool(product = '') {
  const p = String(product || '').toLowerCase() || 'default';
  const dir = join(MARKETING_ROOT, 'assets/stills', p);
  try {
    return readdirSync(dir)
      .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
      .sort()
      .map((f) => `assets/stills/${p}/${f}`);
  } catch {
    if (p === 'default') return [];
    return productStillPool('default');
  }
}

/**
 * Следующий ещё не использованный still (относительный путь).
 * Порядок: CC0-сток продукта → brand-пул.
 * @param {string[]} exclude
 * @param {string} [product]
 */
export function pickAlternateStill(exclude = [], product = '') {
  const skip = new Set((exclude || []).map(String).filter(Boolean));
  const p = String(product || '').toLowerCase();
  const pool = [
    ...productStillPool(p),
    ...STILL_POOL
  ];
  if (p === 'neon_runner' || p === 'serphold' || p === 'games') {
    pool.push('brand/serpmonn-ads-3d-mockup.png', 'brand/serpmonn-ads-banner-v2.png');
  }
  if (p === 'partners') {
    pool.push('brand/serpmonn-ads-banner-compose.png');
  }
  for (const rel of pool) {
    if (skip.has(rel)) continue;
    if (resolveMarketingMedia(rel)) return rel;
  }
  return null;
}

/** Случайный CC0 still продукта (или null). */
export function pickProductStill(product = '', exclude = []) {
  const skip = new Set((exclude || []).map(String).filter(Boolean));
  const pool = productStillPool(product).filter(
    (rel) => !skip.has(rel) && resolveMarketingMedia(rel)
  );
  if (!pool.length) return null;
  const i = Math.floor(Math.random() * pool.length);
  return pool[i];
}

function imagePromptForProduct(product, title, variant = 0) {
  const p = String(product || '').toLowerCase();
  const v = Number(variant) || 0;
  let base;
  if (p === 'promocodes') {
    base =
      'Нарисуй яркую рекламную иллюстрацию для бренда Serpmonn: ' +
      'современный минималистичный постер про раздел промокодов и скидок, ' +
      'абстрактные купоны и мягкое свечение, без текста на картинке, ' +
      'без логотипов чужих магазинов и банков, без читаемых промокодов, ' +
      'дружелюбный стиль, вертикальный формат для соцсети';
  } else if (p === 'honey') {
    base =
      'Нарисуй аппетитную рекламную иллюстрацию натурального мёда: ' +
      'банка с мёдом, соты, тёплый золотистый свет, уютный натюрморт, ' +
      'без текста на картинке, без чужих логотипов, вертикальный формат для VK';
  } else if (p === 'games') {
    base =
      'Нарисуй яркую иллюстрацию браузерных мини-игр бренда Serpmonn: ' +
      'игровой контроллер, цветные аркадные элементы, современный минимализм, ' +
      'без текста на картинке, без чужих логотипов и персонажей, вертикальный формат для Shorts';
  } else if (p === 'partners') {
    base =
      'Нарисуй современную рекламную иллюстрацию партнёрской сети Serpmonn: ' +
      'абстрактная сеть связей, рукопожатие или узлы графа, деловой минимализм, ' +
      'без текста на картинке, без чужих логотипов, вертикальный формат для соцсети';
  } else if (p === 'neon_runner') {
    base =
      'Нарисуй яркую иллюстрацию мобильной аркады Neon Runner: ' +
      'неоновый бесконечный раннер, силуэт бегущего персонажа, киберпанк свечение, ' +
      'тёмный фон с розово-голубыми неоновыми линиями, без текста на картинке, ' +
      'без чужих логотипов, вертикальный формат для Shorts';
  } else if (p === 'serphold') {
    base =
      'Нарисуй иллюстрацию мобильной tower defense игры Serphold: ' +
      'крепость, извилистая дорога, лучники и маги на траве, тёплые коричнево-зелёные тона, ' +
      'фэнтези-минимализм, без текста на картинке, без чужих логотипов, вертикальный формат для Shorts';
  } else {
    base =
      `Нарисуй рекламную иллюстрацию` +
      (title ? ` на тему «${String(title).slice(0, 80)}»` : '') +
      ', без чужих логотипов, без мелкого текста, современный стиль';
  }

  if (v === 1) {
    base +=
      '. Второй кадр для видео: другой ракурс и другая композиция, более контрастные цвета, ' +
      'новая сцена — не повторяй первый кадр';
  } else if (v >= 2) {
    base += `. Вариация №${v + 1}: свежий угол и палитра, без повторения предыдущих кадров`;
  }
  return base.slice(0, 1000);
}

async function latestGeneratedPostImage(product) {
  try {
    const dir = join(MARKETING_ROOT, 'out/posts');
    const files = await readdir(dir);
    const prefix = String(product || 'post').slice(0, 32);
    const matched = files
      .filter((f) => f.startsWith(prefix) && /\.(png|jpe?g|webp)$/i.test(f))
      .sort()
      .reverse();
    if (!matched.length) return null;
    const rel = `out/posts/${matched[0]}`;
    return resolveMarketingMedia(rel) ? rel : null;
  } catch {
    return null;
  }
}

async function pickFallbackMedia(product) {
  const recent = await latestGeneratedPostImage(product);
  if (recent) return recent;
  const stock = pickProductStill(product);
  if (stock) return stock;
  if (resolveMarketingMedia(FALLBACK_IMAGE)) return FALLBACK_IMAGE;
  if (resolveMarketingMedia('assets/clips/neli-promo.png')) {
    return 'assets/clips/neli-promo.png';
  }
  return null;
}

/**
 * @returns {Promise<{ media_path: string|null, engine: string|null, error?: string, fileId?: string }>}
 */
export async function generateMarketingImage({ product, title, variant = 0 } = {}) {
  let fbPath = await pickFallbackMedia(product);
  if (Number(variant) > 0 && fbPath) {
    const alt = pickAlternateStill([fbPath], product);
    if (alt) fbPath = alt;
  }

  if (!isGigaChatConfigured()) {
    return {
      media_path: fbPath,
      engine: fbPath ? 'fallback' : null,
      error: 'GIGACHAT_CREDENTIALS not set'
    };
  }

  try {
    const prompt = imagePromptForProduct(product, title, variant);
    const img = await enqueueGigaChat(
      () => generateImageWithGigaChat(prompt, { timeoutMs: 120_000 }),
      { label: `image-v${variant}` }
    );
    const ext = /png/i.test(img.contentType)
      ? 'png'
      : /webp/i.test(img.contentType)
        ? 'webp'
        : 'jpg';
    const stamp = `${Date.now()}-v${Number(variant) || 0}`;
    const rel = `out/posts/${String(product || 'post').slice(0, 32)}-${stamp}.${ext}`;
    const abs = join(MARKETING_ROOT, rel);
    await mkdir(join(MARKETING_ROOT, 'out/posts'), { recursive: true });
    await writeFile(abs, img.buffer);
    return {
      media_path: rel,
      engine: 'gigachat',
      fileId: img.fileId
    };
  } catch (err) {
    console.warn('[marketing] image', err.message);
    return {
      media_path: fbPath,
      engine: fbPath ? 'fallback' : null,
      error: err.message || String(err)
    };
  }
}

/**
 * Несколько кадров для Shorts (по умолчанию 2).
 * @returns {Promise<{ media_paths: string[], items: object[], engine: string|null }>}
 */
export async function generateMarketingImages({ product, title, count = 2 } = {}) {
  const n = Math.min(4, Math.max(1, Number(count) || 2));
  const items = [];
  const media_paths = [];
  for (let i = 0; i < n; i++) {
    const one = await generateMarketingImage({ product, title, variant: i });
    items.push(one);
    if (one.media_path && !media_paths.includes(one.media_path)) {
      media_paths.push(one.media_path);
    }
  }
  // Гарантируем ≥2 разных кадра для Shorts
  while (media_paths.length < n) {
    const alt = pickAlternateStill(media_paths, product);
    if (!alt) break;
    media_paths.push(alt);
  }
  if (!media_paths.length && items[0]?.media_path) {
    media_paths.push(items[0].media_path);
  }
  return {
    media_paths,
    items,
    engine: items.find((x) => x.engine === 'gigachat')?.engine || items[0]?.engine || null
  };
}
