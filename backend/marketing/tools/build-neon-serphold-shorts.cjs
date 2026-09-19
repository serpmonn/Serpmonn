#!/usr/bin/env node
/**
 * Build EN Shorts from Neon Runner + Serphold source footage.
 * Pattern: Act1 fail → Act2 win + serpmonn captions. No CTA.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const OUT_DIR = '/var/www/serpmonn.ru/backend/marketing/out/shorts-preview';
const SHORTS_DIR = '/var/www/serpmonn.ru/backend/marketing/out/shorts';
const PUBLIC = '/var/www/serpmonn.ru/frontend/shorts-preview';
const FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
const TMP = '/tmp/apk-shorts-build';

const NEON_SRC_CANDIDATES = [
  '/tmp/phone-shorts/neon-clean.mp4',
  '/tmp/phone-shorts/neon-raw.mp4',
  '/var/www/serpmonn.ru/frontend/downloads/neon-runner/gameplay-en.mp4',
];
const SERPHOLD_SRC = '/var/www/serpmonn.ru/frontend/downloads/serphold/gameplay-en.mp4';
const NEON_AUDIO = '/var/www/serpmonn.ru/backend/marketing/assets/audio/neon_runner-15.mp3';
const SERPHOLD_AUDIO = '/var/www/serpmonn.ru/backend/marketing/assets/audio/serphold-15.mp3';

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    child.stderr.on('data', (d) => {
      err += d.toString();
    });
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} ${code}: ${err.slice(-800)}`))));
  });
}

function pickNeonSrc() {
  for (const p of NEON_SRC_CANDIDATES) {
    if (!fs.existsSync(p)) continue;
    const st = fs.statSync(p);
    if (st.size > 100000) return p;
  }
  throw new Error('No usable neon source');
}

async function probe(file) {
  const { spawnSync } = require('child_process');
  const out = spawnSync(
    'ffprobe',
    ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,duration', '-of', 'json', file],
    { encoding: 'utf8' }
  );
  const j = JSON.parse(out.stdout || '{}');
  const s = (j.streams && j.streams[0]) || {};
  return { w: Number(s.width) || 0, h: Number(s.height) || 0, dur: Number(s.duration) || 0 };
}

/** Landscape → 1080x1920 blur-fill (game strip centered). */
function toVerticalVf(srcW, srcH) {
  if (srcH >= srcW) {
    return 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black';
  }
  return [
    'split[bg][fg]',
    '[bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=18[bg2]',
    '[fg]scale=1080:-2:force_original_aspect_ratio=decrease[fg2]',
    '[bg2][fg2]overlay=(W-w)/2:(H-h)/2',
  ].join(';');
}

/** Soft blur-fill fallback (serphold) */
function toVerticalBlurFill() {
  return [
    'split[bg][fg]',
    '[bg]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,gblur=sigma=18[bg2]',
    '[fg]scale=1080:-2:force_original_aspect_ratio=decrease[fg2]',
    '[bg2][fg2]overlay=(W-w)/2:(H-h)/2',
  ].join(';');
}

async function buildNeon() {
  const src = pickNeonSrc();
  const info = await probe(src);
  console.log('neon src', src, info);
  const base = path.join(TMP, 'neon-base.mp4');
  const vf = toVerticalVf(info.w, info.h);
  const startAt = src.includes('phone-shorts') ? 3.2 : 0;
  const take = Math.min((info.dur || 12) - startAt, 16);
  await run('ffmpeg', [
    '-y', '-ss', String(startAt), '-t', String(Math.max(8, take)), '-i', src,
    '-vf', vf, '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', base,
  ]);

  const silent = path.join(TMP, 'neon-silent.mp4');
  await run('ffmpeg', [
    '-y', '-i', base,
    '-filter_complex',
    [
      `[0:v]trim=0:4.8,setpts=PTS-STARTPTS[a1]`,
      `[0:v]trim=4.6:4.75,setpts=PTS-STARTPTS,eq=brightness=-0.18:saturation=0.65[failhold]`,
      `[failhold]loop=loop=20:size=1:start=0,setpts=N/25/TB[a1f]`,
      `[0:v]trim=8:14.2,setpts=PTS-STARTPTS[a2]`,
      `[a1][a1f][a2]concat=n=3:v=1:a=0[v0]`,
      `[v0]fps=25,scale=1080:1920,` +
        `drawtext=fontfile=${FONT}:text='Run…':fontsize=64:fontcolor=white:borderw=4:bordercolor=black@0.85:x=(w-text_w)/2:y=h*0.88:enable='lt(t\\,4.5)',` +
        `drawtext=fontfile=${FONT}:text='FAIL…':fontsize=84:fontcolor=0xff5555:borderw=5:bordercolor=black@0.95:x=(w-text_w)/2:y=h*0.84:enable='between(t\\,4.5\\,6.4)',` +
        `drawtext=fontfile=${FONT}:text='Almost…':fontsize=56:fontcolor=white:borderw=4:bordercolor=black@0.9:x=(w-text_w)/2:y=h*0.90:enable='between(t\\,4.5\\,6.4)',` +
        `drawtext=fontfile=${FONT}:text='Again…':fontsize=64:fontcolor=white:borderw=4:bordercolor=black@0.85:x=(w-text_w)/2:y=h*0.88:enable='between(t\\,6.4\\,11)',` +
        `drawtext=fontfile=${FONT}:text='Cleared…':fontsize=76:fontcolor=white:borderw=5:bordercolor=black@0.9:x=(w-text_w)/2:y=h*0.86:enable='gte(t\\,11)',` +
        `drawtext=fontfile=${FONT}:text='serpmonn':fontsize=32:fontcolor=white@0.95:borderw=3:bordercolor=black@0.8:x=(w-text_w)/2:y=h*0.92:enable='gte(t\\,11)'[v]`,
    ].join(';'),
    '-map', '[v]', '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-t', '13.2', silent,
  ]);

  // Drop game-over menu + empty restart (~2.3–4.7s). Keep letterbox layout.
  const cut = path.join(TMP, 'neon-cut.mp4');
  await run('ffmpeg', [
    '-y', '-i', silent,
    '-filter_complex',
    '[0:v]trim=0:2.28,setpts=PTS-STARTPTS[v0];[0:v]trim=4.70,setpts=PTS-STARTPTS[v1];[v0][v1]concat=n=2:v=1:a=0[v]',
    '-map', '[v]', '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', cut,
  ]);

  const out = path.join(OUT_DIR, 'neon-preview-en-serpmonn.mp4');
  const ready = path.join(SHORTS_DIR, 'neon-short-serpmonn.mp4');
  const dur = 9.56;
  await run('ffmpeg', [
    '-y', '-i', cut, '-stream_loop', '-1', '-i', NEON_AUDIO,
    '-filter_complex',
    `[1:a]atrim=0:${dur},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.15,afade=t=out:st=${(dur - 0.35).toFixed(2)}:d=0.3,volume=0.34[a]`,
    '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k',
    '-shortest', '-movflags', '+faststart', out,
  ]);
  fs.mkdirSync(SHORTS_DIR, { recursive: true });
  fs.copyFileSync(out, ready);
  return out;
}

async function buildSerphold() {
  const info = await probe(SERPHOLD_SRC);
  console.log('serphold src', info);
  const base = path.join(TMP, 'serphold-base.mp4');
  await run('ffmpeg', [
    '-y', '-i', SERPHOLD_SRC,
    '-vf', toVerticalBlurFill(),
    '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', base,
  ]);

  const silent = path.join(TMP, 'serphold-silent.mp4');
  // 0.5s title menu, then mid-wave: enemies walking + towers firing (~10.2–17s)
  const dur = 7.3;
  await run('ffmpeg', [
    '-y', '-i', base,
    '-filter_complex',
    [
      `[0:v]trim=0:0.5,setpts=PTS-STARTPTS[menu]`,
      `[0:v]trim=10.2:17.0,setpts=PTS-STARTPTS[fight]`,
      `[menu][fight]concat=n=2:v=1:a=0[v0]`,
      `[v0]fps=30,scale=1080:1920,` +
        `drawtext=fontfile=${FONT}:text='Hold...':fontsize=64:fontcolor=white:borderw=4:bordercolor=black@0.85:x=(w-text_w)/2:y=h*0.88:enable='gte(t\\,0.5)'[v]`,
    ].join(';'),
    '-map', '[v]', '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-t', String(dur), silent,
  ]);

  const out = path.join(OUT_DIR, 'serphold-preview-en-serpmonn.mp4');
  const ready = path.join(SHORTS_DIR, 'serphold-short-serpmonn.mp4');
  await run('ffmpeg', [
    '-y', '-i', silent, '-stream_loop', '-1', '-i', SERPHOLD_AUDIO,
    '-filter_complex',
    `[1:a]atrim=0:${dur},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.12,afade=t=out:st=${(dur - 0.3).toFixed(2)}:d=0.25,volume=0.32[a]`,
    '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k',
    '-shortest', '-movflags', '+faststart', out,
  ]);
  fs.mkdirSync(SHORTS_DIR, { recursive: true });
  fs.copyFileSync(out, ready);
  return out;
}

async function main() {
  fs.mkdirSync(TMP, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(PUBLIC, { recursive: true });
  fs.mkdirSync(SHORTS_DIR, { recursive: true });

  const neonOnly = process.argv.includes('--neon-only');
  const serpholdOnly = process.argv.includes('--serphold-only');

  if (!serpholdOnly) {
  const neon = await buildNeon();
  fs.copyFileSync(neon, path.join(PUBLIC, path.basename(neon)));
  await run('ffmpeg', ['-y', '-ss', '0.4', '-i', neon, '-update', '1', '-frames:v', '1', path.join(OUT_DIR, 'neon-en-firstframe.jpg')]);
  await run('ffmpeg', ['-y', '-ss', '2.2', '-i', neon, '-update', '1', '-frames:v', '1', path.join(OUT_DIR, 'neon-en-fail.jpg')]);
  await run('ffmpeg', ['-y', '-ss', '8.5', '-i', neon, '-update', '1', '-frames:v', '1', path.join(OUT_DIR, 'neon-en-win.jpg')]);
  console.log('OK', neon);
  }

  if (neonOnly) return;

  const serphold = await buildSerphold();
  fs.copyFileSync(serphold, path.join(PUBLIC, path.basename(serphold)));
  await run('ffmpeg', ['-y', '-ss', '2', '-i', serphold, '-update', '1', '-frames:v', '1', path.join(OUT_DIR, 'serphold-firstframe.jpg')]);
  await run('ffmpeg', ['-y', '-ss', '7.2', '-i', serphold, '-update', '1', '-frames:v', '1', path.join(OUT_DIR, 'serphold-fail.jpg')]);
  await run('ffmpeg', ['-y', '-ss', '15.5', '-i', serphold, '-update', '1', '-frames:v', '1', path.join(OUT_DIR, 'serphold-win.jpg')]);
  console.log('OK', serphold);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
