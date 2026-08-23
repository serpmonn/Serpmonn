import { spawn } from 'child_process';
import { mkdir, readFile, access } from 'fs/promises';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { constants as fsConstants } from 'fs';

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
    child.stderr.on('data', (d) => { err += d.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(`${cmd} exited ${code}: ${err.slice(-800)}`));
    });
  });
}

function escapeDrawtext(s) {
  return String(s || '')
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/%/g, '\\%');
}

export async function loadBrand() {
  const raw = await readFile(join(BRAND_DIR, 'brand.json'), 'utf8');
  return JSON.parse(raw);
}

/**
 * Рендер вертикального Shorts (1080×1920) из картинки/клипа + заголовок + CTA.
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
  const font = brand.fontFile || '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
  const logo = join(BRAND_DIR, 'logo.png');

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

  const titleEsc = escapeDrawtext(String(title).slice(0, 60));
  const subEsc = escapeDrawtext(String(subtitle || brand.name || 'Serpmonn').slice(0, 80));
  const ctaEsc = escapeDrawtext(String(ctaUrl || '').replace(/^https?:\/\//, '').slice(0, 70));

  // фон + ken-burns по картинке + лого + тексты
  const filter = [
    `[0:v]scale=${w}:${h}:force_original_aspect_ratio=increase,crop=${w}:${h},zoompan=z='min(zoom+0.0015,1.12)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${dur * fps}:s=${w}x${h}:fps=${fps},format=yuv420p[bg]`,
    `[1:v]scale=160:-1[lg]`,
    `[bg][lg]overlay=x=(W-w)/2:y=80[v1]`,
    `[v1]drawtext=fontfile=${font}:text='${titleEsc}':fontsize=56:fontcolor=white:borderw=3:bordercolor=black@0.6:x=(w-text_w)/2:y=h*0.62[v2]`,
    `[v2]drawtext=fontfile=${font}:text='${subEsc}':fontsize=36:fontcolor=#f47059:x=(w-text_w)/2:y=h*0.72[v3]`,
    ctaEsc
      ? `[v3]drawtext=fontfile=${font}:text='${ctaEsc}':fontsize=28:fontcolor=white@0.9:x=(w-text_w)/2:y=h*0.82[vout]`
      : `[v3]copy[vout]`
  ].join(';');

  const args = [
    '-y',
    '-loop', '1', '-t', String(dur), '-i', src,
    '-loop', '1', '-t', String(dur), '-i', logo,
    '-filter_complex', filter,
    '-map', '[vout]',
    '-c:v', 'libx264',
    '-pix_fmt', 'yuv420p',
    '-r', String(fps),
    '-t', String(dur),
    '-movflags', '+faststart',
    abs
  ];

  await run('ffmpeg', args);
  return { mediaPath: rel, absPath: abs, durationSec: dur };
}

/** Безопасный resolve пути внутри marketing/ */
export function resolveMarketingMedia(relPath) {
  const cleaned = String(relPath || '').replace(/^\/+/, '');
  if (!cleaned || cleaned.includes('..')) return null;
  const abs = resolve(MARKETING_ROOT, cleaned);
  if (!abs.startsWith(MARKETING_ROOT + '/') && abs !== MARKETING_ROOT) return null;
  return abs;
}
