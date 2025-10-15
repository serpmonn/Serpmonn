#!/usr/bin/env node
// Нормализация локализации HTML: <html lang>, dir, и <meta http-equiv="Content-Language">
import fs from 'node:fs';
import path from 'node:path';

const FRONTEND_DIR = path.join(process.cwd(), 'frontend');
const LANGS_FILE = path.join(FRONTEND_DIR, 'i18n', 'languages.json');

function readTextFileSync(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function collectFilesRecursive(startDir, extension) {
  const files = [];
  const stack = [startDir];
  while (stack.length) {
    const current = stack.pop();
    let stat;
    try { stat = fs.statSync(current); } catch { continue; }
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(current)) {
        if (entry.startsWith('.')) continue;
        stack.push(path.join(current, entry));
      }
    } else if (stat.isFile() && current.toLowerCase().endsWith(extension)) {
      files.push(current);
    }
  }
  return files;
}

function loadLanguages() {
  const raw = readTextFileSync(LANGS_FILE);
  if (!raw) throw new Error(`Не найден файл языков: ${LANGS_FILE}`);
  const list = JSON.parse(raw);
  const codes = new Set(list.map(l => l.code));
  const rtlMap = new Map(list.map(l => [l.code, Boolean(l.rtl)]));
  return { codes, rtlMap };
}

function determineLangCode(filePath, languageCodes) {
  const rel = path.relative(FRONTEND_DIR, filePath);
  const parts = rel.split(path.sep);
  if (parts.length > 1) {
    const maybeLang = parts[0];
    if (languageCodes.has(maybeLang)) return maybeLang;
  }
  return 'ru';
}

function upsertHtmlAttribute(htmlOpenTag, attrName, attrValue) {
  const attrRegex = new RegExp(`(\\s${attrName}=\")[^\"]*(\")`, 'i');
  if (attrRegex.test(htmlOpenTag)) {
    return htmlOpenTag.replace(attrRegex, `$1${attrValue}$2`);
  }
  return htmlOpenTag.replace(/>$/, ` ${attrName}=\"${attrValue}\">`);
}

function normalizeHtml(content, langCode, isRtl) {
  const htmlMatch = content.match(/<html\b[^>]*>/i);
  if (!htmlMatch) return { changed: false, result: content };
  const originalHtml = htmlMatch[0];
  let updatedHtml = originalHtml;
  updatedHtml = upsertHtmlAttribute(updatedHtml, 'lang', langCode);
  updatedHtml = upsertHtmlAttribute(updatedHtml, 'dir', isRtl ? 'rtl' : 'ltr');
  let changed = updatedHtml !== originalHtml;
  let updated = content.replace(originalHtml, updatedHtml);

  const headMatch = updated.match(/<head\b[^>]*>/i);
  if (headMatch) {
    const hasMeta = /<meta[^>]*http-equiv=["']Content-Language["'][^>]*>/i.test(updated);
    if (!hasMeta) {
      const insertion = `\n<meta http-equiv=\"Content-Language\" content=\"${langCode}\">`;
      const before = updated;
      updated = before.replace(headMatch[0], headMatch[0] + insertion);
      if (updated !== before) changed = true;
    } else {
      const before = updated;
      updated = before.replace(/(<meta[^>]*http-equiv=["']Content-Language["'][^>]*content=")[^"]*("[^>]*>)/i, `$1${langCode}$2`);
      if (updated !== before) changed = true;
    }
  }
  return { changed, result: updated };
}

function main() {
  if (!fs.existsSync(FRONTEND_DIR)) {
    console.error(`Каталог не найден: ${FRONTEND_DIR}`);
    process.exit(1);
  }
  const { codes, rtlMap } = loadLanguages();
  const htmlFiles = collectFilesRecursive(FRONTEND_DIR, '.html');
  let changedCount = 0;
  let inspected = 0;
  const mismatches = [];
  for (const filePath of htmlFiles) {
    inspected += 1;
    const lang = determineLangCode(filePath, codes);
    const isRtl = Boolean(rtlMap.get(lang));
    const source = readTextFileSync(filePath);
    if (!source) continue;
    const currentLangMatch = source.match(/<html\b[^>]*\blang=\"([^\"]+)\"/i);
    const currentLang = currentLangMatch ? currentLangMatch[1] : null;
    if (currentLang && currentLang !== lang) {
      mismatches.push({ filePath, expected: lang, actual: currentLang });
    }
    const { changed, result } = normalizeHtml(source, lang, isRtl);
    if (changed) {
      fs.writeFileSync(filePath, result, 'utf8');
      changedCount += 1;
    }
  }
  console.log(`Проверено файлов: ${inspected}`);
  console.log(`Изменено файлов: ${changedCount}`);
  if (mismatches.length) {
    console.log('Исправленные несоответствия <html lang> (первые 50):');
    for (const m of mismatches.slice(0, 50)) {
      console.log(`- ${m.filePath}: ${m.actual} -> ${m.expected}`);
    }
    if (mismatches.length > 50) console.log(`... и ещё ${mismatches.length - 50} файлов`);
  }
}

try {
  main();
} catch (err) {
  console.error('Ошибка нормализации i18n:', err && err.message ? err.message : err);
  process.exit(1);
}

