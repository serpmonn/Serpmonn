/** Картинки для маркетинговых постов (GigaChat / Kandinsky). */

import { readdir } from 'fs/promises';
import { mkdir, writeFile } from 'fs/promises';
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

function imagePromptForProduct(product, title) {
  const p = String(product || '').toLowerCase();
  if (p === 'promocodes') {
    return (
      'Нарисуй яркую рекламную иллюстрацию для бренда Serpmonn: ' +
      'современный минималистичный постер про раздел промокодов и скидок, ' +
      'абстрактные купоны и мягкое свечение, без текста на картинке, ' +
      'без логотипов чужих магазинов и банков, без читаемых промокодов, ' +
      'дружелюбный стиль, вертикальный формат для соцсети'
    ).slice(0, 1000);
  }
  if (p === 'honey') {
    return (
      'Нарисуй аппетитную рекламную иллюстрацию натурального мёда: ' +
      'банка с мёдом, соты, тёплый золотистый свет, уютный натюрморт, ' +
      'без текста на картинке, без чужих логотипов, вертикальный формат для VK'
    ).slice(0, 1000);
  }
  return (
    `Нарисуй рекламную иллюстрацию` +
    (title ? ` на тему «${String(title).slice(0, 80)}»` : '') +
    ', без чужих логотипов, без мелкого текста, современный стиль'
  ).slice(0, 1000);
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
  if (resolveMarketingMedia(FALLBACK_IMAGE)) return FALLBACK_IMAGE;
  if (resolveMarketingMedia('assets/clips/neli-promo.png')) {
    return 'assets/clips/neli-promo.png';
  }
  return null;
}

/**
 * @returns {Promise<{ media_path: string|null, engine: string|null, error?: string }>}
 */
export async function generateMarketingImage({ product, title } = {}) {
  const fbPath = await pickFallbackMedia(product);

  if (!isGigaChatConfigured()) {
    return {
      media_path: fbPath,
      engine: fbPath ? 'fallback' : null,
      error: 'GIGACHAT_CREDENTIALS not set'
    };
  }

  try {
    const prompt = imagePromptForProduct(product, title);
    const img = await enqueueGigaChat(
      () => generateImageWithGigaChat(prompt, { timeoutMs: 45_000 }),
      { label: 'image' }
    );
    const ext = /png/i.test(img.contentType)
      ? 'png'
      : /webp/i.test(img.contentType)
        ? 'webp'
        : 'jpg';
    const stamp = Date.now();
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
