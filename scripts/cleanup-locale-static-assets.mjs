#!/usr/bin/env node
/**
 * Удаляет дубли статики из frontend/<locale>/ —
 * ассеты отдаются только из /frontend/{images,fonts,styles,scripts,...}.
 *
 * HTML локалей сохраняется. Не-HTML файлы в подпапках локалей удаляются.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const FRONTEND = path.join(ROOT, 'frontend');
const LOCALES_FILE = path.join(ROOT, 'assembly/site/_data/locales.json');

/** Целиком удаляемые shared-каталоги (раньше копировались в каждую локаль). */
const SHARED_DIRS = [
  'images',
  'fonts',
  'styles',
  'scripts',
  'pwa',
  'downloads',
  'i18n',
];

const KEEP_EXT = new Set(['.html', '.htm']);

function loadLocales() {
  const data = JSON.parse(fs.readFileSync(LOCALES_FILE, 'utf8'));
  return data.filter((locale) => locale && locale !== 'ru');
}

function dirSizeBytes(dir) {
  let total = 0;
  if (!fs.existsSync(dir)) return 0;
  const stack = [dir];
  while (stack.length) {
    const cur = stack.pop();
    let entries;
    try {
      entries = fs.readdirSync(cur, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const ent of entries) {
      const full = path.join(cur, ent.name);
      if (ent.isDirectory()) stack.push(full);
      else if (ent.isFile()) {
        try {
          total += fs.statSync(full).size;
        } catch {
          /* ignore */
        }
      }
    }
  }
  return total;
}

function rmDir(dir) {
  if (!fs.existsSync(dir)) return 0;
  const size = dirSizeBytes(dir);
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch (err) {
    console.error(`   ⚠️  Не удалось удалить ${dir}: ${err.message}`);
    return 0;
  }
  return size;
}

/**
 * Удаляет все не-HTML файлы в dir рекурсивно; пустые папки подчищает.
 * @returns {{ bytes: number, files: number }}
 */
function pruneNonHtml(dir) {
  let bytes = 0;
  let files = 0;
  if (!fs.existsSync(dir)) return { bytes, files };

  function walk(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(current, ent.name);
      if (ent.isDirectory()) {
        walk(full);
        // удалить пустую папку
        try {
          if (fs.readdirSync(full).length === 0) fs.rmdirSync(full);
        } catch {
          /* ignore */
        }
      } else if (ent.isFile()) {
        const ext = path.extname(ent.name).toLowerCase();
        if (!KEEP_EXT.has(ext)) {
          try {
            bytes += fs.statSync(full).size;
            fs.unlinkSync(full);
            files += 1;
          } catch {
            /* ignore */
          }
        }
      }
    }
  }

  walk(dir);
  return { bytes, files };
}

function formatMb(bytes) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const dryRun = process.argv.includes('--dry-run');

console.log(dryRun
  ? '🧹 cleanup-locale-static-assets (dry-run)...'
  : '🧹 cleanup-locale-static-assets...');

const locales = loadLocales();
let freedShared = 0;
let freedPruned = 0;
let prunedFiles = 0;
let localesTouched = 0;

for (const locale of locales) {
  const localeRoot = path.join(FRONTEND, locale);
  if (!fs.existsSync(localeRoot)) continue;

  let touched = false;

  for (const name of SHARED_DIRS) {
    const target = path.join(localeRoot, name);
    if (!fs.existsSync(target)) continue;
    const size = dirSizeBytes(target);
    if (dryRun) {
      freedShared += size;
      touched = true;
      continue;
    }
    freedShared += rmDir(target);
    touched = true;
  }

  // Остальные подпапки локали: оставить только HTML (игры, auth, profile, …)
  const entries = fs.readdirSync(localeRoot, { withFileTypes: true });
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;
    if (SHARED_DIRS.includes(ent.name)) continue;
    const sub = path.join(localeRoot, ent.name);
    if (dryRun) {
      // оценка: посчитать не-html
      const stack = [sub];
      while (stack.length) {
        const cur = stack.pop();
        for (const e of fs.readdirSync(cur, { withFileTypes: true })) {
          const full = path.join(cur, e.name);
          if (e.isDirectory()) stack.push(full);
          else if (e.isFile() && !KEEP_EXT.has(path.extname(e.name).toLowerCase())) {
            try {
              freedPruned += fs.statSync(full).size;
              prunedFiles += 1;
              touched = true;
            } catch {
              /* ignore */
            }
          }
        }
      }
    } else {
      const result = pruneNonHtml(sub);
      freedPruned += result.bytes;
      prunedFiles += result.files;
      if (result.files > 0) touched = true;
    }
  }

  if (touched) localesTouched += 1;
}

console.log(`   Локалей обработано: ${localesTouched}/${locales.length}`);
console.log(`   Shared-каталоги:    ${formatMb(freedShared)}`);
console.log(`   Прочие не-HTML:     ${formatMb(freedPruned)} (${prunedFiles} файлов)`);
console.log(`   Итого освобождено:  ${formatMb(freedShared + freedPruned)}${dryRun ? ' (оценка)' : ''}`);
if (!dryRun) console.log('✅ Очистка завершена');
