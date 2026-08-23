/**
 * Генерация рекламных текстов через локальный Ollama.
 * Шаблоны дают продукт / CTA / формат; модель пишет свежий title+body.
 */

import { query } from '../database/config.mjs';

const OLLAMA_URL = process.env.MARKETING_OLLAMA_URL || 'http://127.0.0.1:11434/api/chat';
const OLLAMA_MODEL =
  process.env.MARKETING_OLLAMA_MODEL || 'serpmonn-ai-fast:latest';
const OLLAMA_FALLBACK =
  process.env.MARKETING_OLLAMA_FALLBACK || 'serpmonn-ai-search:latest';
const KEEP_ALIVE = process.env.MARKETING_OLLAMA_KEEP_ALIVE || '10m';
const NUM_CTX = 2048;
const TIMEOUT_MS = Number(process.env.MARKETING_OLLAMA_TIMEOUT_MS) || 45000;

/** Краткие брифы по продуктам — факты, не готовые посты. */
const PRODUCT_BRIEFS = {
  neli: {
    name: 'Neli',
    lang: 'en',
    facts: [
      'Browser game on Serpmonn',
      'No install, play in the browser',
      'Short demo / puzzle vibe',
      'Brand: Serpmonn'
    ]
  },
  partners: {
    name: 'Serpmonn Partners',
    lang: 'en',
    facts: [
      'Partner / affiliate network',
      'Advertisers place CPA or promo offers',
      'Pay for confirmed conversions, not just views',
      'Postback tracking, balance top-up',
      'Publishers promote offers',
      'Landing: serpmonn.ru partners (EN)'
    ]
  },
  app: {
    name: 'Serpmonn',
    lang: 'en',
    facts: [
      'Search with AI + classic results',
      'Games, tools, promo codes',
      'Brand: Serpmonn'
    ]
  }
};

function briefFor(product) {
  const key = String(product || '').toLowerCase();
  return PRODUCT_BRIEFS[key] || {
    name: product || 'Serpmonn',
    lang: 'en',
    facts: ['Product of Serpmonn', 'serpmonn.ru']
  };
}

async function recentTitles(product, limit = 8) {
  try {
    const rows = await query(
      `SELECT title FROM marketing_queue
       WHERE product = ? AND title IS NOT NULL AND title <> ''
       ORDER BY id DESC LIMIT ${Math.min(20, Math.max(1, limit))}`,
      [String(product || '').slice(0, 64)]
    );
    return (rows || []).map((r) => String(r.title || '').trim()).filter(Boolean);
  } catch {
    return [];
  }
}

function buildPrompt({ product, format, ctaUrl, avoidTitles }) {
  const brief = briefFor(product);
  const isVideo = format === 'video';
  const avoid =
    avoidTitles?.length
      ? `Do NOT reuse these titles (write something different):\n- ${avoidTitles.join('\n- ')}`
      : 'Write a fresh angle; do not sound like a generic ad template.';

  return `You write short marketing copy for Serpmonn publications.
Return ONLY valid JSON (no markdown): {"title":"...","body":"..."}

Product: ${brief.name}
Language: ${brief.lang}
Facts:
${brief.facts.map((f) => `- ${f}`).join('\n')}
Format: ${isVideo ? 'short video caption (YouTube Shorts / VK clip)' : 'text post'}
CTA URL (include once in body if natural, else omit — URL is stored separately): ${ctaUrl || 'n/a'}

Constraints:
- Brand spelling MUST be exactly "Serpmonn" (never Serpenn, Serpentn, Serpmon, etc.)
- title: max ${isVideo ? 70 : 90} characters, punchy, no emoji spam
- body: ${isVideo ? '1–3 short sentences, max 280 chars' : '2–5 short sentences or lines, max 600 chars'}
- No Telegram, no fake discounts, no invented stats
- Mention Serpmonn once if it fits
- ${avoid}`;
}

function fixBrandSpelling(text) {
  return String(text || '')
    .replace(/\bSerpenn'?s?\b/gi, 'Serpmonn')
    .replace(/\bSerpentn'?s?\b/gi, 'Serpmonn')
    .replace(/\bSerpmon\b/gi, 'Serpmonn')
    .replace(/\bSerpmonns\b/gi, 'Serpmonn');
}

function extractJson(text) {
  const raw = String(text || '').trim();
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fence ? fence[1].trim() : raw;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('No JSON object in model output');
  return JSON.parse(candidate.slice(start, end + 1));
}

async function callOllama(model, prompt) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(OLLAMA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify({
        model,
        stream: false,
        keep_alive: KEEP_ALIVE,
        options: { temperature: 0.85, num_ctx: NUM_CTX },
        messages: [
          {
            role: 'system',
            content: 'You are a concise marketing copywriter. Output JSON only.'
          },
          { role: 'user', content: prompt }
        ]
      })
    });
    const raw = await res.text();
    if (!res.ok) throw new Error(`Ollama HTTP ${res.status}: ${raw.slice(0, 200)}`);
    const data = JSON.parse(raw);
    const content =
      data.message?.content ||
      data.choices?.[0]?.message?.content ||
      '';
    if (!content) throw new Error('Ollama empty content');
    return content;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeCopy(parsed, { format, fallbackTitle, fallbackBody }) {
  let title = fixBrandSpelling(String(parsed.title || '').trim().replace(/\s+/g, ' '));
  let body = fixBrandSpelling(String(parsed.body || '').trim());
  if (!title) title = fallbackTitle || 'Serpmonn';
  if (!body) body = fallbackBody || title;
  const maxTitle = format === 'video' ? 90 : 120;
  const maxBody = format === 'video' ? 400 : 1200;
  if (title.length > maxTitle) title = title.slice(0, maxTitle - 1).trim() + '…';
  if (body.length > maxBody) body = body.slice(0, maxBody - 1).trim() + '…';
  return { title, body };
}

/**
 * @returns {{ title: string, body: string, model: string, generated: boolean, error?: string }}
 */
export async function generateMarketingCopy({
  product,
  format = 'text',
  ctaUrl = '',
  fallbackTitle = '',
  fallbackBody = '',
  avoidTitles
} = {}) {
  const avoid =
    avoidTitles ||
    (await recentTitles(product, 8));

  const prompt = buildPrompt({
    product,
    format,
    ctaUrl,
    avoidTitles: avoid
  });

  const models = [OLLAMA_MODEL, OLLAMA_FALLBACK].filter(
    (m, i, arr) => m && arr.indexOf(m) === i
  );

  let lastErr = null;
  for (const model of models) {
    try {
      const content = await callOllama(model, prompt);
      const parsed = extractJson(content);
      const copy = normalizeCopy(parsed, {
        format,
        fallbackTitle,
        fallbackBody
      });
      return {
        ...copy,
        model,
        generated: true
      };
    } catch (err) {
      lastErr = err;
      console.warn('[marketing] generate-copy', model, err.message);
    }
  }

  return {
    title: fallbackTitle || 'Serpmonn',
    body: fallbackBody || '',
    model: null,
    generated: false,
    error: lastErr?.message || 'generation failed'
  };
}

export async function marketingOllamaHealth() {
  try {
    const base = OLLAMA_URL.replace(/\/api\/chat$/, '');
    const res = await fetch(`${base}/api/tags`, {
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}`, model: OLLAMA_MODEL };
    const data = await res.json();
    const names = (data.models || []).map((m) => m.name);
    const has = names.includes(OLLAMA_MODEL) || names.some((n) => n.startsWith(OLLAMA_MODEL.split(':')[0]));
    return {
      ok: has,
      detail: has ? `модель ${OLLAMA_MODEL}` : `нет ${OLLAMA_MODEL}; есть: ${names.slice(0, 5).join(', ')}`,
      model: OLLAMA_MODEL,
      models: names
    };
  } catch (err) {
    return { ok: false, detail: err.message || String(err), model: OLLAMA_MODEL };
  }
}
