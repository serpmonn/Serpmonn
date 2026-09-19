import { spawn } from 'child_process';
import { mkdir, readFile, access, writeFile, unlink, readdir } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { constants as fsConstants } from 'fs';
import { randomBytes } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const MARKETING_ROOT = __dirname;
export const OUT_DIR = join(__dirname, 'out');
export const BRAND_DIR = join(__dirname, 'brand');
export const CLIPS_DIR = join(__dirname, 'assets', 'clips');
export const AUDIO_DIR = join(__dirname, 'assets', 'audio');

const AUDIO_BED_BY_PRODUCT = {
  games: 'games',
  neon_runner: 'neon_runner',
  serphold: 'serphold',
  promocodes: 'promocodes',
  partners: 'partners',
  honey: 'honey'
};

/** Счётчик ротации bed-вариантов по продукту (в рамках процесса). */
const bedRotateIdx = new Map();

async function exists(p) {
  try {
    await access(p, fsConstants.R_OK);
    return true;
  } catch {
    return false;
  }
}

function run(cmd, args) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    child.stderr.on('data', (d) => {
      err += d.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${cmd} exited ${code}: ${err.slice(-800)}`));
    });
  });
}

function escapeDrawtextPath(p) {
  return String(p || '')
    .replace(/\\/g, '/')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'");
}

function escapeDrawtext(s) {
  return String(s || '')
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/%/g, '\\%');
}

/** Короткий экранный хук: максимум ~2 строки, без канцелярита. */
export function formatOnScreenTitle(title, { lineLen = 20, maxLines = 2, lang = 'ru' } = {}) {
  let t = String(title || '')
    .replace(/\s+/g, ' ')
    .replace(/[….]+$/g, '')
    .replace(/^["«]+|["»]+$/g, '')
    .trim();
  if (!t) t = 'Serpmonn';

  // Берём более «хуковую» часть: после двоеточия / тире, если она короткая
  const splitHook = t.split(/\s*[:—–]\s*/);
  if (splitHook.length >= 2) {
    const left = splitHook[0].trim();
    const right = splitHook.slice(1).join(' ').trim();
    if (right.length >= 8 && right.length <= 42) t = right;
    else if (left.length >= 8 && left.length <= 42) t = left;
  }

  t = t.replace(/\s*[—–-]\s*Serpmonn\s*$/i, '').trim();
  if (t.length > 42) {
    const cut = t.slice(0, 42);
    const neat = cut.replace(/\s+\S*$/, '').trim();
    t = neat.length >= 12 ? `${neat}…` : `${cut.trim()}…`;
  }

  const locale = lang === 'en' ? 'en-US' : 'ru-RU';
  t = t.charAt(0).toLocaleUpperCase(locale) + t.slice(1);

  const words = t.split(' ').filter(Boolean);
  const lines = [];
  let cur = '';
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= lineLen) {
      cur = next;
      continue;
    }
    if (cur) lines.push(cur);
    if (lines.length >= maxLines - 1) {
      const rest = words.slice(i).join(' ');
      if (rest.length <= lineLen) cur = rest;
      else {
        const soft = rest.slice(0, lineLen).replace(/\s+\S*$/, '').trim();
        cur = `${soft.length >= 8 ? soft : rest.slice(0, lineLen - 1)}…`;
      }
      lines.push(cur);
      cur = '';
      break;
    }
    cur = w.length > lineLen ? `${w.slice(0, lineLen - 1)}…` : w;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, maxLines).join('\n');
}

function ctaLabel(ctaUrl) {
  const raw = String(ctaUrl || '').trim();
  if (!raw) return '';
  try {
    const u = new URL(raw, 'https://serpmonn.ru');
    const host = u.host.replace(/^www\./i, '');
    const path = u.pathname.replace(/\/$/, '') || '';
    const short = `${host}${path}`.slice(0, 36);
    return short;
  } catch {
    return raw.replace(/^https?:\/\//i, '').slice(0, 36);
  }
}

async function buildCaptionOverlay({ title, titleSecondary = '', ctaUrl, lang = 'ru' }) {
  const bilingual = Boolean(String(titleSecondary || '').trim());
  const onScreen = formatOnScreenTitle(title, {
    lineLen: bilingual ? 24 : 22,
    maxLines: 2,
    lang: bilingual ? 'en' : lang
  });
  let onScreen2 = '';
  if (bilingual) {
    onScreen2 = formatOnScreenTitle(titleSecondary, {
      lineLen: 26,
      maxLines: 2,
      lang: 'ru'
    });
    // одинаковый текст — не дублируем
    if (onScreen2.replace(/\s+/g, ' ').toLowerCase() === onScreen.replace(/\s+/g, ' ').toLowerCase()) {
      onScreen2 = '';
    }
  }
  const cta = ctaLabel(ctaUrl);
  const out = join(OUT_DIR, `_captions-${randomBytes(6).toString('hex')}.png`);
  const script = join(MARKETING_ROOT, 'caption_overlay.py');
  const args = [
    script,
    '--title',
    onScreen.replace(/\n/g, ' '),
    '--cta',
    cta,
    '--out',
    out
  ];
  if (onScreen2) args.push('--title2', onScreen2.replace(/\n/g, ' '));
  await run('python3', args);
  return {
    path: out,
    onScreenTitle: onScreen2 ? `${onScreen}\n${onScreen2}` : onScreen
  };
}

export async function loadBrand() {
  const raw = await readFile(join(BRAND_DIR, 'brand.json'), 'utf8');
  return JSON.parse(raw);
}

async function resolveBrandLogo(brand) {
  const candidates = [
    brand?.logoFile,
    ...(Array.isArray(brand?.logoFallbacks) ? brand.logoFallbacks : []),
    'logos/serpmonn-3d-logo-realistic.png',
    'logos/serpmonn-3d-logo-realistic-gloss.png',
    'logos/logo.png'
  ].filter(Boolean);
  for (const name of candidates) {
    const abs = join(BRAND_DIR, String(name));
    if (await exists(abs)) return abs;
  }
  return join(BRAND_DIR, 'logos/logo.png');
}

/**
 * Похожие пулы для лёгкого overlap (~20% чужой bed).
 * honey почти изолирован (только default).
 */
const AUDIO_OVERLAP = {
  games: ['neon_runner', 'default'],
  neon_runner: ['games', 'default'],
  serphold: ['default'],
  promocodes: ['partners', 'default'],
  partners: ['promocodes', 'default'],
  honey: ['default'],
  default: ['games', 'promocodes']
};

function hashSalt(salt) {
  let h = 0;
  const s = String(salt ?? '');
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) >>> 0;
  return h;
}

/**
 * Bed по продукту: варианты `games-1.mp3` … чередуются.
 * ~20% — bed из похожего пула (overlap).
 * @param {string} product
 * @param {{ salt?: string|number, overlapChance?: number }} [opts]
 */
export async function resolveAudioBed(product, { salt, overlapChance = 0.2 } = {}) {
  const key = AUDIO_BED_BY_PRODUCT[String(product || '').toLowerCase()] || 'default';

  async function listVariants(base) {
    let names = [];
    try {
      names = await readdir(AUDIO_DIR);
    } catch {
      return [];
    }
    const numbered = names
      .filter((n) => new RegExp(`^${base}-\\d+\\.(mp3|wav|m4a|aac)$`, 'i').test(n))
      .sort((a, b) => {
        const na = Number((a.match(/-(\d+)\./) || [])[1] || 0);
        const nb = Number((b.match(/-(\d+)\./) || [])[1] || 0);
        return na - nb;
      });
    if (numbered.length) return numbered.map((n) => join(AUDIO_DIR, n));
    for (const ext of ['mp3', 'wav', 'm4a', 'aac']) {
      const abs = join(AUDIO_DIR, `${base}.${ext}`);
      if (await exists(abs)) return [abs];
    }
    return [];
  }

  const h = salt != null && String(salt).length ? hashSalt(salt) : Date.now() >>> 0;
  const chance = Math.min(0.5, Math.max(0, Number(overlapChance) || 0));
  // отдельный микс для решения overlap, чтобы не коррелировать с выбором файла
  const overlapRoll = Math.imul(h ^ 0x9e3779b9, 2654435761) >>> 0;
  const useOverlap = chance > 0 && overlapRoll % 1000 < Math.round(chance * 1000);

  let poolKey = key;
  if (useOverlap) {
    const neighbors = (AUDIO_OVERLAP[key] || []).filter(Boolean);
    if (neighbors.length) {
      poolKey = neighbors[h % neighbors.length];
    }
  }

  let variants = await listVariants(poolKey);
  if (!variants.length && poolKey !== key) {
    variants = await listVariants(key);
  }
  if (!variants.length && key !== 'default') {
    variants = await listVariants('default');
  }
  if (!variants.length) return null;

  let idx;
  if (salt != null && String(salt).length) {
    idx = Math.floor(h / 1000) % variants.length;
  } else {
    const rotKey = `${key}>${poolKey}`;
    const cur = bedRotateIdx.get(rotKey) || 0;
    idx = cur % variants.length;
    bedRotateIdx.set(rotKey, cur + 1);
  }
  return variants[idx];
}

/** blur + fit + лёгкий Ken Burns → именованный выход. */
function buildSceneChain(inputIdx, tag, w, h, frames, fps) {
  const bg = `bg${tag}`;
  const fg = `fg${tag}`;
  const scene = `sc${tag}`;
  return [
    `[${inputIdx}:v]scale=${w}:${h}:force_original_aspect_ratio=increase,` +
      `crop=${w}:${h},gblur=sigma=28,eq=brightness=-0.12:saturation=0.85,setsar=1[${bg}]`,
    `[${inputIdx}:v]scale=${w}:${h}:force_original_aspect_ratio=decrease,` +
      `pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=0x00000000,setsar=1,format=rgba[${fg}]`,
    `[${bg}][${fg}]overlay=(W-w)/2:(H-h)/2,format=yuv420p[${scene}]`,
    `[${scene}]zoompan=z='min(1.0+0.00035*on,1.06)':` +
      `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':` +
      `d=${frames}:s=${w}x${h}:fps=${fps},format=yuv420p[${tag}]`
  ].join(';');
}

/**
 * Рендер вертикального Shorts (1080×1920):
 * 1–2 картинки (xfade) + лого + подписи + bed по продукту.
 * @returns {{ mediaPath: string, absPath: string, durationSec: number, onScreenTitle: string, stillCount: number, audioBed: string|null }}
 */
export async function renderShort({
  product = 'neli',
  title = 'Serpmonn',
  titleSecondary = '',
  subtitle = '',
  ctaUrl = '',
  sourceImage,
  sourceImages,
  durationSec,
  lang = 'ru',
  withAudio = true,
  audioSalt = ''
} = {}) {
  await mkdir(OUT_DIR, { recursive: true });
  const brand = await loadBrand();
  const w = brand.width || 1080;
  const h = brand.height || 1920;
  const dur = Number(durationSec) || brand.durationSec || 12;
  const fps = brand.fps || 30;
  const logo = await resolveBrandLogo(brand);
  const logoScale = Number(brand.logoWidth) || 180;
  const audioBed = withAudio
    ? await resolveAudioBed(product, {
        salt: audioSalt || `${product}-${title}-${Date.now()}`
      })
    : null;

  const stillAbsList = [];
  const fromArr = Array.isArray(sourceImages) ? sourceImages : [];
  for (const p of fromArr) {
    if (p && (await exists(p))) stillAbsList.push(p);
  }
  if (!stillAbsList.length && sourceImage && (await exists(sourceImage))) {
    stillAbsList.push(sourceImage);
  }
  if (!stillAbsList.length) {
    const candidates = [
      join(CLIPS_DIR, `${product}-promo.png`),
      join(CLIPS_DIR, `${product}-promo.jpg`),
      join(CLIPS_DIR, 'neli-promo.png'),
      logo
    ];
    for (const c of candidates) {
      if (await exists(c)) {
        stillAbsList.push(c);
        break;
      }
    }
  }
  if (!stillAbsList.length) {
    throw new Error('Нет исходного клипа/картинки для рендера');
  }

  // Два одинаковых файла → один кадр (бессмысленный xfade)
  const uniqueStills = [...new Set(stillAbsList)].slice(0, 2);
  const dual = uniqueStills.length >= 2;

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const rel = `out/renders/${product}-${stamp}.mp4`;
  const abs = join(MARKETING_ROOT, rel);
  await mkdir(join(MARKETING_ROOT, 'out/renders'), { recursive: true });

  const caption = await buildCaptionOverlay({
    title,
    titleSecondary,
    ctaUrl,
    lang
  });
  const frames = Math.max(1, Math.round(dur * fps));
  const fadeDur = Math.min(1.0, Math.max(0.5, dur * 0.08));
  const fadeOffset = Math.max(0.5, dur / 2 - fadeDur / 2);

  const logoIdx = dual ? 2 : 1;
  const capIdx = dual ? 3 : 2;
  const audioIdx = dual ? 4 : 3;
  const parts = [];

  if (dual) {
    parts.push(buildSceneChain(0, 'movedA', w, h, frames, fps));
    parts.push(buildSceneChain(1, 'movedB', w, h, frames, fps));
    parts.push(
      `[movedA][movedB]xfade=transition=fade:duration=${fadeDur}:offset=${fadeOffset},` +
        `format=yuv420p[moved]`
    );
  } else {
    parts.push(buildSceneChain(0, 'moved', w, h, frames, fps));
  }

  // Круглая маска логотипа сверху
  parts.push(
    `[${logoIdx}:v]scale=${logoScale}:${logoScale}:force_original_aspect_ratio=increase,` +
      `crop=${logoScale}:${logoScale},format=rgba,` +
      `geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':` +
      `a='if(lte(hypot(X-W/2\\,Y-H/2)\\,min(W\\,H)/2-1)\\,255\\,0)'[lg]`
  );
  parts.push(`[moved][lg]overlay=x=(W-w)/2:y=72[withlogo]`);
  // Подписи: готовый PNG-оверлей (типографика Pillow)
  parts.push(
    `[${capIdx}:v]format=rgba[cap]`,
    `[withlogo][cap]overlay=0:0:format=auto,format=yuv420p[vout]`
  );

  const fadeOutStart = Math.max(0.2, dur - 0.5);
  if (audioBed) {
    parts.push(
      `[${audioIdx}:a]atrim=0:${dur},asetpts=PTS-STARTPTS,` +
        `afade=t=in:st=0:d=0.35,afade=t=out:st=${fadeOutStart}:d=0.45,` +
        `volume=0.32[aout]`
    );
  }

  const args = ['-y'];
  for (const still of uniqueStills) {
    args.push('-loop', '1', '-t', String(dur), '-i', still);
  }
  args.push('-loop', '1', '-t', String(dur), '-i', logo);
  args.push('-loop', '1', '-t', String(dur), '-i', caption.path);
  if (audioBed) {
    args.push('-stream_loop', '-1', '-t', String(dur), '-i', audioBed);
  }
  args.push('-filter_complex', parts.join(';'), '-map', '[vout]');
  if (audioBed) {
    args.push('-map', '[aout]', '-c:a', 'aac', '-b:a', '128k');
  } else {
    args.push('-an');
  }
  args.push(
    '-c:v',
    'libx264',
    '-pix_fmt',
    'yuv420p',
    '-r',
    String(fps),
    '-t',
    String(dur),
    '-movflags',
    '+faststart',
    abs
  );

  try {
    await run('ffmpeg', args);
  } finally {
    try {
      await unlink(caption.path);
    } catch {
      /* ignore */
    }
  }

  return {
    mediaPath: rel,
    absPath: abs,
    durationSec: dur,
    onScreenTitle: caption.onScreenTitle,
    stillCount: uniqueStills.length,
    audioBed: audioBed ? audioBed.replace(MARKETING_ROOT + '/', '') : null
  };
}

/** Безопасный resolve пути внутри marketing/ */
export function resolveMarketingMedia(relPath) {
  const cleaned = String(relPath || '').replace(/^\/+/, '');
  if (!cleaned || cleaned.includes('..')) return null;
  const abs = resolve(MARKETING_ROOT, cleaned);
  if (!abs.startsWith(MARKETING_ROOT + '/') && abs !== MARKETING_ROOT) return null;
  return abs;
}
