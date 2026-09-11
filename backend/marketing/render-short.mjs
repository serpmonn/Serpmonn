import { spawn } from 'child_process';
import { mkdir, readFile, access, writeFile, unlink } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { constants as fsConstants } from 'fs';
import { randomBytes } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const MARKETING_ROOT = __dirname;
export const OUT_DIR = join(__dirname, 'out');
export const BRAND_DIR = join(__dirname, 'brand');
export const CLIPS_DIR = join(__dirname, 'assets', 'clips');

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

/** Короткий заголовок для кадра: 1–2 строки, без обрезки посередине слова. */
export function formatOnScreenTitle(title, { lineLen = 22, maxLines = 2 } = {}) {
  let t = String(title || '')
    .replace(/\s+/g, ' ')
    .replace(/[….]+$/g, '')
    .trim();
  if (!t) t = 'Serpmonn';

  const words = t.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= lineLen) {
      cur = next;
      continue;
    }
    if (cur) lines.push(cur);
    cur = w.length > lineLen ? `${w.slice(0, lineLen - 1)}…` : w;
    if (lines.length >= maxLines - 1) {
      // добиваем последнюю строку остатком, если влезает
      const rest = words.slice(words.indexOf(w)).join(' ');
      if (rest.length <= lineLen) cur = rest;
      else cur = `${rest.slice(0, lineLen - 1).replace(/\s+\S*$/, '').trim()}…`;
      break;
    }
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

export async function loadBrand() {
  const raw = await readFile(join(BRAND_DIR, 'brand.json'), 'utf8');
  return JSON.parse(raw);
}

async function resolveBrandLogo(brand) {
  const candidates = [
    brand?.logoFile,
    ...(Array.isArray(brand?.logoFallbacks) ? brand.logoFallbacks : []),
    'serpmonn-3d-logo-realistic.png',
    'serpmonn-3d-logo-realistic-gloss.png',
    'logo.png'
  ].filter(Boolean);
  for (const name of candidates) {
    const abs = join(BRAND_DIR, String(name));
    if (await exists(abs)) return abs;
  }
  return join(BRAND_DIR, 'logo.png');
}

/**
 * Рендер вертикального Shorts (1080×1920):
 * blur-фон (без жёсткого кропа смысла) + картинка целиком по центру + нижняя плашка + текст.
 * @returns {{ mediaPath: string, absPath: string, durationSec: number }}
 */
export async function renderShort({
  product = 'neli',
  title = 'Serpmonn',
  subtitle = '',
  ctaUrl = '',
  sourceImage,
  durationSec
} = {}) {
  await mkdir(OUT_DIR, { recursive: true });
  const brand = await loadBrand();
  const w = brand.width || 1080;
  const h = brand.height || 1920;
  const dur = Number(durationSec) || brand.durationSec || 12;
  const fps = brand.fps || 30;
  const font =
    brand.fontFile || '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
  const fontReg =
    brand.fontRegular || '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
  const logo = await resolveBrandLogo(brand);
  const logoScale = Number(brand.logoWidth) || 180;
  const accent = String(brand.accent || '#f47059').replace('#', '');

  let src = sourceImage;
  if (!src) {
    const candidates = [
      join(CLIPS_DIR, `${product}-promo.png`),
      join(CLIPS_DIR, `${product}-promo.jpg`),
      join(CLIPS_DIR, 'neli-promo.png'),
      logo
    ];
    for (const c of candidates) {
      if (await exists(c)) {
        src = c;
        break;
      }
    }
  }
  if (!src || !(await exists(src))) {
    throw new Error('Нет исходного клипа/картинки для рендера');
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const rel = `out/${product}-${stamp}.mp4`;
  const abs = join(MARKETING_ROOT, rel);

  const onScreen = formatOnScreenTitle(title, { lineLen: 24, maxLines: 2 });
  const titleFile = join(OUT_DIR, `_title-${randomBytes(6).toString('hex')}.txt`);
  await writeFile(titleFile, onScreen, 'utf8');

  const brandLine = escapeDrawtext(
    String(subtitle || brand.name || 'Serpmonn').slice(0, 24)
  );
  const cta = escapeDrawtext(ctaLabel(ctaUrl));
  const titlePath = escapeDrawtextPath(titleFile);

  // 1) blur cover как атмосфера  2) fit (вся картинка видна)  3) лёгкий zoom
  // 4) затемнение низа  5) лого  6) текст
  const frames = Math.max(1, Math.round(dur * fps));
  const filter = [
    // blurred full-bleed background
    `[0:v]scale=${w}:${h}:force_original_aspect_ratio=increase,` +
      `crop=${w}:${h},gblur=sigma=28,eq=brightness=-0.12:saturation=0.85,setsar=1[bg]`,
    // foreground: whole image visible (letter/pillar box onto transparent then overlay)
    `[0:v]scale=${w}:${h}:force_original_aspect_ratio=decrease,` +
      `pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2:color=0x00000000,setsar=1,format=rgba[fg]`,
    `[bg][fg]overlay=(W-w)/2:(H-h)/2,format=yuv420p[scene]`,
    // gentle Ken Burns without aggressive crop (zoom ≤ 1.06)
    `[scene]zoompan=z='min(1.0+0.00035*on,1.06)':` +
      `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':` +
      `d=${frames}:s=${w}x${h}:fps=${fps},format=yuv420p[moved]`,
    // bottom readable panel
    `[moved]drawbox=x=0:y=ih*0.62:w=iw:h=ih*0.38:color=black@0.62:t=fill[panel]`,
    // logo
    `[1:v]scale=${logoScale}:-1,format=rgba[lg]`,
    `[panel][lg]overlay=x=(W-w)/2:y=72[withlogo]`,
    // title (wrapped via textfile)
    `[withlogo]drawtext=fontfile=${font}:textfile='${titlePath}':` +
      `fontsize=48:line_spacing=12:fontcolor=white:borderw=0:` +
      `x=(w-text_w)/2:y=h*0.68:` +
      `box=1:boxcolor=black@0.0[t1]`,
    // brand
    `[t1]drawtext=fontfile=${fontReg}:text='${brandLine}':` +
      `fontsize=30:fontcolor=0x${accent}:x=(w-text_w)/2:y=h*0.82[t2]`,
    // CTA
    cta
      ? `[t2]drawtext=fontfile=${fontReg}:text='${cta}':` +
        `fontsize=26:fontcolor=white@0.92:x=(w-text_w)/2:y=h*0.88[vout]`
      : `[t2]copy[vout]`
  ].join(';');

  const args = [
    '-y',
    '-loop',
    '1',
    '-t',
    String(dur),
    '-i',
    src,
    '-loop',
    '1',
    '-t',
    String(dur),
    '-i',
    logo,
    '-filter_complex',
    filter,
    '-map',
    '[vout]',
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
  ];

  try {
    await run('ffmpeg', args);
  } finally {
    try {
      await unlink(titleFile);
    } catch {
      /* ignore */
    }
  }

  return { mediaPath: rel, absPath: abs, durationSec: dur, onScreenTitle: onScreen };
}

/** Безопасный resolve пути внутри marketing/ */
export function resolveMarketingMedia(relPath) {
  const cleaned = String(relPath || '').replace(/^\/+/, '');
  if (!cleaned || cleaned.includes('..')) return null;
  const abs = resolve(MARKETING_ROOT, cleaned);
  if (!abs.startsWith(MARKETING_ROOT + '/') && abs !== MARKETING_ROOT) return null;
  return abs;
}
