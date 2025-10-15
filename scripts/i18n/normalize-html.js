#!/usr/bin/env node
/**
 * Скрипт нормализации локализации HTML-страниц:
 * - Устанавливает корректные <html lang> по языку каталога (или 'ru' для корня frontend)
 * - Проставляет атрибут dir="rtl|ltr" согласно настройкам языка
 * - Гарантирует наличие <meta http-equiv="Content-Language" content="xx"> в <head>
 *
 * Без внешних зависимостей. Работает по всем *.html внутри каталога frontend.
 */

const fs = require('fs');
const path = require('path');

const FRONTEND_DIR = path.join(process.cwd(), 'frontend');
const LANGS_FILE = path.join(FRONTEND_DIR, 'i18n', 'languages.json');

/**
 * Безопасно читает файл и возвращает строку. В случае ошибки возвращает null.
 */
function readTextFileSync(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    return null;
  }
}

/**
 * Рекурсивно собирает список файлов с заданным расширением.
 */
function collectFilesRecursive(startDir, extension) {
  const collected = [];
  const stack = [startDir];
  while (stack.length > 0) {
    const current = stack.pop();
    let stat;
    try {
      stat = fs.statSync(current);
    } catch (err) {
      continue;
    }
    if (stat.isDirectory()) {
      const entries = fs.readdirSync(current);
      for (const entry of entries) {
        // Пропускаем скрытые каталоги и git артефакты
        if (entry.startsWith('.')) continue;
        stack.push(path.join(current, entry));
      }
    } else if (stat.isFile() && current.toLowerCase().endsWith(extension)) {
      collected.push(current);
    }
  }
  return collected;
}

/**
 * Возвращает множество языковых кодов из languages.json и карту RTL.
 */
function loadLanguages() {
  const raw = readTextFileSync(LANGS_FILE);
  if (!raw) {
    throw new Error(`Не найден файл языков: ${LANGS_FILE}`);
  }
  /** @type {{code:string, rtl?:boolean}[]} */
  const list = JSON.parse(raw);
  const codes = new Set(list.map(l => l.code));
  const rtlMap = new Map(list.map(l => [l.code, Boolean(l.rtl)]));
  return { codes, rtlMap };
}

/**
 * Определяет код языка для HTML-файла по пути.
 * Если путь начинается с frontend/<lang>/..., и <lang> присутствует в списке,
 * считаем этот язык. Иначе — 'ru' (корень фронтенда — русская локаль по умолчанию).
 */
function determineLangCode(filePath, languageCodes) {
  const rel = path.relative(FRONTEND_DIR, filePath);
  const parts = rel.split(path.sep);
  if (parts.length > 1) {
    const maybeLang = parts[0];
    if (languageCodes.has(maybeLang)) {
      return maybeLang;
    }
  }
  return 'ru';
}

/**
 * Заменяет или вставляет атрибут в открывающем теге <html ...>.
 */
function upsertHtmlAttribute(htmlTagSource, attrName, attrValue) {
  const attrRegex = new RegExp(`(\\s${attrName}=")([^"]*)(")`, 'i');
  if (attrRegex.test(htmlTagSource)) {
    return htmlTagSource.replace(attrRegex, `$1${attrValue}$3`);
  }
  // Вставляем перед закрывающей '>'
  return htmlTagSource.replace(/>$/, ` ${attrName}="${attrValue}">`);
}

/**
 * Гарантирует корректные lang/dir в теге <html> и наличие мета Content-Language в <head>.
 */
function normalizeHtml(content, langCode, isRtl) {
  // 1) Найти открывающий тег <html ...>
  const htmlTagMatch = content.match(/<html\b[^>]*>/i);
  if (!htmlTagMatch) {
    return { changed: false, result: content };
  }
  const originalHtmlTag = htmlTagMatch[0];
  let newHtmlTag = originalHtmlTag;

  // lang
  newHtmlTag = upsertHtmlAttribute(newHtmlTag, 'lang', langCode);
  // dir
  newHtmlTag = upsertHtmlAttribute(newHtmlTag, 'dir', isRtl ? 'rtl' : 'ltr');

  let changed = newHtmlTag !== originalHtmlTag;
  let updated = content.replace(originalHtmlTag, newHtmlTag);

  // 2) Добавить/обновить <meta http-equiv="Content-Language" content="xx">
  // Ищем <head ...>
  const headOpenMatch = updated.match(/<head\b[^>]*>/i);
  if (!headOpenMatch) {
    return { changed, result: updated };
  }
  const hasContentLanguageMeta = /<meta[^>]*http-equiv=["']Content-Language["'][^>]*>/i.test(updated);
  if (!hasContentLanguageMeta) {
    const insertion = `\n<meta http-equiv="Content-Language" content="${langCode}">`;
    // Вставляем сразу после <head>
    const before = updated;
    updated = before.replace(headOpenMatch[0], headOpenMatch[0] + insertion);
    if (updated !== before) {
      changed = true;
    }
  } else {
    // Обновим значение content, если уже есть такой мета-тег
    const before = updated;
    updated = before.replace(/(<meta[^>]*http-equiv=["']Content-Language["'][^>]*content=")[^"]*("[^>]*>)/i, `$1${langCode}$2`);
    if (updated !== before) {
      changed = true;
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

  let changedFiles = 0;
  let inspectedFiles = 0;
  const mismatches = [];

  for (const filePath of htmlFiles) {
    inspectedFiles += 1;
    const langCode = determineLangCode(filePath, codes);
    const isRtl = Boolean(rtlMap.get(langCode));
    const source = readTextFileSync(filePath);
    if (!source) continue;

    // Проверим текущий lang
    const currentLangMatch = source.match(/<html\b[^>]*\blang=\"([^\"]+)\"/i);
    const currentLang = currentLangMatch ? currentLangMatch[1] : null;
    if (currentLang && currentLang !== langCode) {
      mismatches.push({ filePath, expected: langCode, actual: currentLang });
    }

    const { changed, result } = normalizeHtml(source, langCode, isRtl);
    if (changed) {
      fs.writeFileSync(filePath, result, 'utf8');
      changedFiles += 1;
    }
  }

  console.log(`Проверено файлов: ${inspectedFiles}`);
  console.log(`Изменено файлов: ${changedFiles}`);
  if (mismatches.length > 0) {
    console.log('Исправленные несоответствия <html lang>:');
    for (const item of mismatches.slice(0, 50)) {
      console.log(`- ${item.filePath}: ${item.actual} -> ${item.expected}`);
    }
    if (mismatches.length > 50) {
      console.log(`... и ещё ${mismatches.length - 50} файлов`);
    }
  }
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error('Ошибка нормализации i18n:', error.message);
    process.exit(1);
  }
}

