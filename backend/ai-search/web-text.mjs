function extractHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** OpenAIRE и др. иногда отдают UTF-8 как Latin-1 («Ð°Ð±…»). */
function fixUtf8Mojibake(text) {
  const s = String(text || '');
  if (!/[ÐÑÃÂ]/.test(s)) return s;
  // Continuation-байты иногда сплющены в обычный пробел:
  //   D0 A0 = «р»; D1 85 = «х» (раньше ошибочно ставили D1 A0 → «Ѡ»).
  const restored = s
    .replace(/\u00d0 /g, '\u00d0\u00a0')
    .replace(/\u00d1 /g, '\u00d1\u0085');
  try {
    let fixed = Buffer.from(restored, 'latin1')
      .toString('utf8')
      .replace(/\uFFFD/g, '');
    // Пробел после «х» часто съеден вместе с битым байтом («ударныхиспытаний»).
    fixed = fixed.replace(
      /(ных|ских|чных|жных|вших|ящих|ших|чих)(?=[а-яёА-ЯЁ])/g,
      '$1 '
    );
    const cyr = (t) => (t.match(/[а-яА-ЯёЁ]/g) || []).length;
    const junk = (t) => (t.match(/[ÐÑÃÂ]/g) || []).length;
    if (cyr(fixed) >= 2 && junk(fixed) < junk(s)) return fixed;
    if (/[а-яА-ЯёЁ]/.test(fixed) && !/[ÐÑ]/.test(fixed)) return fixed;
  } catch {
    /* keep original */
  }
  return s;
}

function stripHtmlTags(text) {
  return String(text || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanWebText(text) {
  // Сначала mojibake: \s в stripHtmlTags схлопывает U+0085/U+00A0 (байты «х»/«р»).
  return stripHtmlTags(fixUtf8Mojibake(text));
}

/** Нормализация URL для дедупа (без hash и хвостового /). */
function normalizeResultUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  try {
    const u = new URL(raw);
    u.hash = '';
    if (u.pathname.length > 1 && u.pathname.endsWith('/')) {
      u.pathname = u.pathname.slice(0, -1);
    }
    return u.href.toLowerCase();
  } catch {
    return raw.toLowerCase().replace(/\/+$/, '');
  }
}

/** Сортировка по score SearXNG + дедуп по URL. */
function rankAndDedupRawResults(raw) {
  const list = Array.isArray(raw) ? [...raw] : [];
  list.sort((a, b) => (Number(b?.score) || 0) - (Number(a?.score) || 0));
  const seen = new Set();
  const out = [];
  for (const item of list) {
    const key = normalizeResultUrl(item?.url || item?.img_src || '');
    if (key) {
      if (seen.has(key)) continue;
      seen.add(key);
    }
    out.push(item);
  }
  return out;
}

const SEARX_HARD_FAIL_MARKERS = new Set([
  'searxng-empty-response',
  'searxng-json-parse-error',
  'searxng-curl-error',
]);

function isSearxHardFailure(data) {
  const engines = Array.isArray(data?.unresponsive_engines)
    ? data.unresponsive_engines
    : [];
  return engines.some((e) => SEARX_HARD_FAIL_MARKERS.has(String(e)));
}

export {
  extractHostname,
  fixUtf8Mojibake,
  stripHtmlTags,
  cleanWebText,
  normalizeResultUrl,
  rankAndDedupRawResults,
  isSearxHardFailure,
};
