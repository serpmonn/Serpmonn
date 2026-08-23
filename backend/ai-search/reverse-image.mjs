/**
 * Reverse image search: TinEye (SearXNG / official API) → Yandex CBIR → SauceNAO.
 * Фото временно кладётся в публичный каталог для движков, которым нужен URL.
 */

import { randomUUID } from 'crypto';
import { mkdir, writeFile, unlink, readdir, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { fetchSearxViaCurl } from '../utils/fetchSearxViaCurl.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '../..');
const TMP_DIR = join(PROJECT_ROOT, 'frontend/tmp-reverse');
const PUBLIC_BASE = String(
  process.env.REVERSE_IMAGE_PUBLIC_BASE || 'https://serpmonn.ru/frontend/tmp-reverse'
).replace(/\/$/, '');

const MAX_BYTES = Number(process.env.REVERSE_IMAGE_MAX_BYTES) || 2 * 1024 * 1024;
const TTL_MS = Number(process.env.REVERSE_IMAGE_TTL_MS) || 15 * 60 * 1000;
const TINEYE_API_KEY = String(process.env.TINEYE_API_KEY || '').trim();
const TINEYE_API_USER = String(process.env.TINEYE_API_USER || '').trim();

const MIME_EXT = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif'
};

export function isAllowedReverseImageMime(mime) {
  return Boolean(MIME_EXT[String(mime || '').toLowerCase()]);
}

async function ensureTmpDir() {
  await mkdir(TMP_DIR, { recursive: true });
}

/** Удаляет файлы старше TTL (best-effort). */
export async function cleanupExpiredReverseImages() {
  try {
    await ensureTmpDir();
    const names = await readdir(TMP_DIR);
    const now = Date.now();
    await Promise.all(
      names.map(async (name) => {
        if (name === '.gitkeep' || name === '.gitignore') return;
        const abs = join(TMP_DIR, name);
        try {
          const st = await stat(abs);
          if (now - st.mtimeMs > TTL_MS) await unlink(abs);
        } catch {
          /* ignore */
        }
      })
    );
  } catch (err) {
    console.warn('[reverse-image] cleanup', err.message);
  }
}

/**
 * @param {Buffer} buffer
 * @param {string} mime
 * @returns {Promise<{ absPath: string, publicUrl: string, fileName: string }>}
 */
export async function storeReverseImage(buffer, mime) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    const err = new Error('empty image');
    err.status = 400;
    throw err;
  }
  if (buffer.length > MAX_BYTES) {
    const err = new Error('image too large');
    err.status = 413;
    throw err;
  }
  const ext = MIME_EXT[String(mime || '').toLowerCase()];
  if (!ext) {
    const err = new Error('unsupported image type');
    err.status = 415;
    throw err;
  }

  await ensureTmpDir();
  await cleanupExpiredReverseImages();

  const fileName = `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
  const absPath = join(TMP_DIR, fileName);
  await writeFile(absPath, buffer);
  return {
    absPath,
    fileName,
    publicUrl: `${PUBLIC_BASE}/${fileName}`
  };
}

export async function removeReverseImage(absPath) {
  if (!absPath) return;
  try {
    await unlink(absPath);
  } catch {
    /* ignore */
  }
}

function hostnameOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function normalizeMatch(item = {}) {
  const url = String(item.url || '').trim();
  const imageUrl = String(item.imageUrl || item.img_src || item.thumbnail || '').trim();
  const thumbnail = String(item.thumbnail || item.imageUrl || imageUrl).trim();
  if (!url && !imageUrl) return null;
  return {
    title: String(item.title || item.source || item.hostname || 'Image match').trim(),
    url: url || imageUrl,
    content: String(item.content || item.source || '').trim(),
    thumbnail,
    imageUrl: imageUrl || thumbnail,
    engine: String(item.engine || '').trim(),
    hostname: item.hostname || hostnameOf(url || imageUrl),
    score: item.score
  };
}

/**
 * @param {string} imageUrl публичный HTTPS URL картинки
 */
export async function reverseImageViaSearx(imageUrl) {
  const url = String(imageUrl || '').trim();
  if (!/^https?:\/\//i.test(url)) {
    const err = new Error('invalid image url');
    err.status = 400;
    throw err;
  }

  const raw = await fetchSearxViaCurl(url, 'general', {
    engines: 'tineye',
    safesearch: 0
  });

  const unresponsive = Array.isArray(raw?.unresponsive_engines)
    ? raw.unresponsive_engines
    : [];
  const tineyeFailed = unresponsive.some((entry) => {
    const name = Array.isArray(entry) ? entry[0] : entry;
    return String(name || '').toLowerCase() === 'tineye';
  });

  // Важно: при падении TinEye SearXNG может вернуть текстовую выдачу других движков по URL —
  // такие результаты для reverse image непригодны.
  const results = (Array.isArray(raw?.results) ? raw.results : [])
    .filter((item) => String(item.engine || '').toLowerCase() === 'tineye')
    .map((item) =>
      normalizeMatch({
        title: item.title || item.source || item.hostname,
        url: item.url,
        content: item.content || item.source,
        thumbnail: item.thumbnail || item.thumbnail_src || item.img_src,
        imageUrl: item.img_src || item.thumbnail_src || item.thumbnail,
        engine: item.engine || 'tineye'
      })
    )
    .filter(Boolean);

  if (tineyeFailed && results.length === 0) {
    return {
      results: [],
      raw,
      imageUrl: url,
      engine: 'tineye',
      unresponsive,
      error: true,
      reason: 'tineye_unresponsive'
    };
  }

  return { results, raw, imageUrl: url, engine: 'tineye', unresponsive };
}

/**
 * Official TinEye REST API (needs TINEYE_API_USER + TINEYE_API_KEY).
 * @param {Buffer} buffer
 * @param {string} mime
 */
export async function reverseImageViaTinEyeApi(buffer, mime) {
  if (!TINEYE_API_KEY || !TINEYE_API_USER) {
    return { results: [], engine: 'tineye-api', skipped: true };
  }

  const form = new FormData();
  const ext = MIME_EXT[String(mime || '').toLowerCase()] || '.jpg';
  form.append('image', new Blob([buffer], { type: mime || 'image/jpeg' }), `upload${ext}`);

  const auth = Buffer.from(`${TINEYE_API_USER}:${TINEYE_API_KEY}`).toString('base64');
  const res = await fetch('https://api.tineye.com/rest/search/', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}` },
    body: form,
    signal: AbortSignal.timeout(25000)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.warn('[reverse-image] tineye-api', res.status, data?.messages || data);
    return { results: [], engine: 'tineye-api', raw: data, error: true };
  }

  const matches = Array.isArray(data?.results?.matches) ? data.results.matches : [];
  const results = matches
    .flatMap((match) => {
      const backlinks = Array.isArray(match?.backlinks) ? match.backlinks : [];
      if (!backlinks.length) {
        return [
          normalizeMatch({
            title: match.domain || 'TinEye match',
            url: match.image_url,
            imageUrl: match.image_url,
            thumbnail: match.image_url,
            content: match.domain || '',
            engine: 'tineye-api',
            score: match.score
          })
        ];
      }
      return backlinks.map((bl) =>
        normalizeMatch({
          title: bl.url || match.domain || 'TinEye match',
          url: bl.backlink || bl.url || match.image_url,
          imageUrl: bl.url || match.image_url,
          thumbnail: match.image_url,
          content: match.domain || '',
          engine: 'tineye-api',
          score: match.score
        })
      );
    })
    .filter(Boolean);

  return { results, engine: 'tineye-api', raw: data };
}

/**
 * Yandex Images CBIR by public image URL.
 * @param {string} imageUrl
 */
export async function reverseImageViaYandex(imageUrl) {
  const url = String(imageUrl || '').trim();
  if (!/^https?:\/\//i.test(url)) {
    return { results: [], engine: 'yandex', skipped: true };
  }

  const ua =
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

  // Probe whether Yandex can fetch the image
  try {
    const probe = await fetch(
      `https://yandex.ru/images-apphost/image-download?url=${encodeURIComponent(url)}`,
      {
        headers: { Accept: 'application/json', 'User-Agent': ua },
        signal: AbortSignal.timeout(15000)
      }
    );
    const probeText = await probe.text();
    if (!probe.ok || /Can't download image/i.test(probeText)) {
      return {
        results: [],
        engine: 'yandex',
        error: true,
        reason: 'download_failed',
        raw: probeText.slice(0, 200)
      };
    }
  } catch (err) {
    return { results: [], engine: 'yandex', error: true, reason: err.message };
  }

  const pageRes = await fetch(
    `https://yandex.ru/images/search?rpt=imageview&url=${encodeURIComponent(url)}`,
    {
      headers: {
        'User-Agent': ua,
        'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8',
        Accept: 'text/html'
      },
      signal: AbortSignal.timeout(25000),
      redirect: 'follow'
    }
  );
  const html = await pageRes.text();
  if (!pageRes.ok || /CbirLayoutTemplate_empty/i.test(html)) {
    return { results: [], engine: 'yandex', error: true, reason: 'empty_page' };
  }

  const results = parseYandexCbirSites(html);
  return { results, engine: 'yandex', raw: { count: results.length } };
}

function parseYandexCbirSites(html) {
  const results = [];
  const re = /<li class="CbirSites-Item">(.*?)<\/li>/gs;
  let m;
  while ((m = re.exec(html))) {
    const block = m[1];
    const titleLink = block.match(/CbirSites-ItemTitle[^>]*href="(https?:\/\/[^"]+)"/i);
    const domainLink = block.match(
      /CbirSites-ItemDomain[^>]*href="(https?:\/\/[^"]+)"[^>]*>(.*?)<\/a>/is
    );
    const titleHtml = block.match(/CbirSites-ItemTitle[^>]*>(.*?)<\/(?:a|div|span)/is);
    const descHtml = block.match(/CbirSites-ItemDescription[^>]*>(.*?)<\/div>/is);
    const thumb = block.match(/(?:src|data-src)="(https:\/\/[^"]+)"/i);

    const clean = (s) =>
      String(s || '')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim();

    const item = normalizeMatch({
      title: clean(titleHtml?.[1]) || clean(domainLink?.[2]) || 'Yandex match',
      url: decodeHtml(titleLink?.[1] || domainLink?.[1] || ''),
      content: clean(descHtml?.[1]),
      thumbnail: decodeHtml(thumb?.[1] || ''),
      imageUrl: decodeHtml(thumb?.[1] || ''),
      engine: 'yandex'
    });
    if (item) results.push(item);
  }
  return results;
}

function decodeHtml(s) {
  return String(s || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/**
 * SauceNAO HTML search (works without API key; anime/art-heavy index).
 * Also returns temporary hosted URL when present — Yandex often can fetch it
 * even when serpmonn.ru itself is unreachable for their crawler.
 * @param {Buffer} buffer
 * @param {string} mime
 */
export async function reverseImageViaSauceNao(buffer, mime) {
  const form = new FormData();
  const ext = MIME_EXT[String(mime || '').toLowerCase()] || '.jpg';
  form.append('file', new Blob([buffer], { type: mime || 'image/jpeg' }), `upload${ext}`);

  const res = await fetch('https://saucenao.com/search.php', {
    method: 'POST',
    body: form,
    headers: {
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
    },
    signal: AbortSignal.timeout(60000),
    redirect: 'follow'
  });

  const html = await res.text();
  if (!res.ok) {
    return { results: [], engine: 'saucenao', error: true, status: res.status };
  }

  const results = parseSauceNaoHtml(html);
  const hostedUrlMatch = html.match(
    /https:\/\/saucenao\.com\/userdata\/[A-Za-z0-9._-]+\.(?:jpg|jpeg|png|gif|webp)/i
  );
  return {
    results,
    engine: 'saucenao',
    hostedUrl: hostedUrlMatch ? hostedUrlMatch[0] : null,
    raw: { count: results.length }
  };
}

function parseSauceNaoHtml(html) {
  const results = [];
  const chunks = String(html || '').split('class="result"');
  for (let i = 1; i < chunks.length; i++) {
    const block = chunks[i].slice(0, 8000);
    const sim = block.match(/resultsimilarityinfo">([\d.]+)%/);
    const score = sim ? Number(sim[1]) : null;
    // Skip weak matches
    if (score != null && score < 50) continue;

    const title = block.match(/resulttitle">([\s\S]*?)<\/div>/i);
    const cleanTitle = String(title?.[1] || '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const links = [
      ...block.matchAll(/href="(https?:\/\/(?!saucenao\.com)[^"]+)"/gi)
    ].map((x) => x[1]);
    const pageUrl =
      links.find(
        (u) =>
          !/lens\.google|iqdb\.org|tineye\.com|trace\.moe|ascii2d|yandex\.(com|ru)\/images/i.test(
            u
          )
      ) || links[0];

    const thumb = block.match(/src="(https?:\/\/[^"]+)"/i);

    const item = normalizeMatch({
      title: cleanTitle || 'SauceNAO match',
      url: pageUrl,
      content: score != null ? `similarity ${score}%` : '',
      thumbnail: thumb?.[1] || '',
      imageUrl: thumb?.[1] || '',
      engine: 'saucenao',
      score
    });
    if (item) results.push(item);
  }
  return results;
}

/**
 * Orchestrates engines. Prefers TinEye, then SauceNAO (+ Yandex via hosted URL).
 * @param {{ buffer: Buffer, mime: string, publicUrl: string }} input
 */
export async function reverseImageSearch(input) {
  const { buffer, mime, publicUrl } = input;
  const attempts = [];

  if (TINEYE_API_KEY && TINEYE_API_USER) {
    try {
      const api = await reverseImageViaTinEyeApi(buffer, mime);
      attempts.push({ engine: api.engine, count: api.results.length });
      if (api.results.length) {
        return { results: api.results, engine: api.engine, attempts, imageUrl: publicUrl };
      }
    } catch (err) {
      attempts.push({ engine: 'tineye-api', error: err.message });
    }
  }

  try {
    const searx = await reverseImageViaSearx(publicUrl);
    attempts.push({
      engine: 'tineye',
      count: searx.results.length,
      unresponsive: searx.unresponsive
    });
    if (searx.results.length) {
      return { results: searx.results, engine: 'tineye', attempts, imageUrl: publicUrl };
    }
  } catch (err) {
    attempts.push({ engine: 'tineye', error: err.message });
  }

  // Прямой Yandex по URL serpmonn.ru (нужен рабочий IPv6/доступ с их краулера)
  try {
    const yandex = await reverseImageViaYandex(publicUrl);
    attempts.push({
      engine: 'yandex',
      count: yandex.results.length,
      reason: yandex.reason
    });
    if (yandex.results.length) {
      return { results: yandex.results, engine: 'yandex', attempts, imageUrl: publicUrl };
    }
  } catch (err) {
    attempts.push({ engine: 'yandex', error: err.message });
  }

  try {
    const sauce = await reverseImageViaSauceNao(buffer, mime);
    attempts.push({ engine: 'saucenao', count: sauce.results.length });

    // Запасной путь: Яндекс через временный URL SauceNAO
    if (sauce.hostedUrl) {
      try {
        const yandexViaHost = await reverseImageViaYandex(sauce.hostedUrl);
        attempts.push({
          engine: 'yandex-via-host',
          count: yandexViaHost.results.length,
          reason: yandexViaHost.reason
        });
        if (yandexViaHost.results.length) {
          const merged = dedupeResults([...yandexViaHost.results, ...sauce.results]);
          return {
            results: merged,
            engine: 'yandex',
            attempts,
            imageUrl: publicUrl
          };
        }
      } catch (err) {
        attempts.push({ engine: 'yandex-via-host', error: err.message });
      }
    }

    if (sauce.results.length) {
      return { results: sauce.results, engine: 'saucenao', attempts, imageUrl: publicUrl };
    }
  } catch (err) {
    attempts.push({ engine: 'saucenao', error: err.message });
  }

  return { results: [], engine: null, attempts, imageUrl: publicUrl };
}

function dedupeResults(items) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    if (!item) continue;
    const key = String(item.url || item.imageUrl || '').toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export { MAX_BYTES, TMP_DIR, MIME_EXT };
