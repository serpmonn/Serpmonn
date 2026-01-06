#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const PROJECT_ROOT = process.cwd();
const FRONTEND_DIR = path.join(PROJECT_ROOT, 'frontend');
const OUTPUT_DIR = path.join(PROJECT_ROOT, 'sitemaps');
const SITE_BASE = 'https://www.serpmonn.ru';

// Явные исключения для папок, которые НЕ являются языковыми
const EXCLUDE_LANG_DIRS = new Set(['ad-info']);

/**
 * Returns true if the entry name looks like a language code directory
 * e.g. en, pt-pt, es-419, zh-cn
 */
function isLanguageDirName(name) {
  // Сначала проверяем явные исключения
  if (EXCLUDE_LANG_DIRS.has(name)) return false;
  
  // Затем проверяем по регулярному выражению
  return /^(?:[a-z]{2,3}|[a-z]{2}-[A-Za-z0-9]{2,})$/.test(name);
}

function fileExists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function formatDateYYYYMMDD(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function writeFileEnsured(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

const EXCLUDE_DIRS = new Set(['scripts', 'styles', 'images', 'i18n', 'pwa', 'telegram-app']);

function getAllHtmlFiles(rootDir) {
  const results = [];
  
  function scanDir(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      
      for (const ent of entries) {
        const fullPath = path.join(dir, ent.name);
        
        if (ent.isDirectory()) {
          // Пропускаем исключенные директории
          if (!EXCLUDE_DIRS.has(ent.name)) {
            scanDir(fullPath);
          }
        } else if (ent.isFile() && ent.name.toLowerCase().endsWith('.html')) {
          results.push(fullPath);
        }
      }
    } catch (err) {
      console.warn(`Cannot read directory ${dir}: ${err.message}`);
    }
  }
  
  scanDir(rootDir);
  return results;
}

function toUrl(filePath) {
  const rel = path.relative(PROJECT_ROOT, filePath).replace(/\\/g, '/');
  return rel ? `${SITE_BASE}/${rel}` : `${SITE_BASE}/`;
}

function generateSitemapForLang(langDirName) {
  const today = formatDateYYYYMMDD(new Date());
  const parts = [];
  parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  parts.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

  const langDir = path.join(FRONTEND_DIR, langDirName);
  const allFiles = getAllHtmlFiles(langDir);
  
  // Ищем index.html
  const indexFile = allFiles.find(f => path.basename(f) === 'index.html');
  
  if (indexFile) {
    const url = toUrl(indexFile);
    parts.push(
      `  <url>\n    <loc>${url}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.80</priority>\n  </url>`
    );
  }

  // Все остальные файлы
  const otherFiles = indexFile 
    ? allFiles.filter(f => f !== indexFile).sort()
    : allFiles.sort();
  
  for (const f of otherFiles) {
    const url = toUrl(f);
    const isAdInfo = /\/ad-info\//.test(f);
    const changefreq = isAdInfo ? 'monthly' : 'weekly';
    const priority = isAdInfo ? '0.60' : '0.55';
    parts.push(
      `  <url>\n    <loc>${url}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`
    );
  }

  parts.push('</urlset>');
  const outPath = path.join(OUTPUT_DIR, `sitemap-${langDirName}.xml`);
  writeFileEnsured(outPath, parts.join('\n'));
  return outPath;
}

function generateSitemapForRU() {
  const today = formatDateYYYYMMDD(new Date());
  const parts = [];
  parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  parts.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

  // Главная русская страница (frontend/main.html)
  const mainFile = path.join(FRONTEND_DIR, 'main.html');
  if (fileExists(mainFile)) {
    const url = toUrl(mainFile);
    parts.push(
      `  <url>\n    <loc>${url}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.90</priority>\n  </url>`
    );
  }

  // Все русские файлы (включая папку ru, если она есть)
  const ruDir = path.join(FRONTEND_DIR, 'ru');
  const ruFiles = [];
  
  // Файлы из корня frontend (кроме языковых папок)
  const entries = fs.readdirSync(FRONTEND_DIR, { withFileTypes: true });
  const langDirs = entries.filter(e => e.isDirectory() && isLanguageDirName(e.name)).map(e => e.name);
  
  for (const ent of entries) {
    const p = path.join(FRONTEND_DIR, ent.name);
    if (ent.isDirectory()) {
      if (!langDirs.includes(ent.name) && !EXCLUDE_DIRS.has(ent.name)) {
        ruFiles.push(...getAllHtmlFiles(p));
      }
    } else if (ent.isFile() && ent.name.toLowerCase().endsWith('.html') && ent.name !== 'main.html') {
      ruFiles.push(p);
    }
  }
  
  // Файлы из папки ru, если она существует
  if (fileExists(ruDir) && !EXCLUDE_DIRS.has('ru')) {
    ruFiles.push(...getAllHtmlFiles(ruDir));
  }
  
  // Исключаем search results
  const filteredRuFiles = ruFiles.filter((p) => !/\/search\//.test(p)).sort();
  
  for (const f of filteredRuFiles) {
    const url = toUrl(f);
    parts.push(
      `  <url>\n    <loc>${url}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.60</priority>\n  </url>`
    );
  }

  parts.push('</urlset>');
  const outPath = path.join(OUTPUT_DIR, `sitemap-ru.xml`);
  writeFileEnsured(outPath, parts.join('\n'));
  return outPath;
}

function generateHreflangSitemap(langs) {
  const today = formatDateYYYYMMDD(new Date());
  const parts = [];
  parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  parts.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">');
  
  // Включаем русский язык
  const allLangs = ['ru', ...langs];
  
  // Собираем ВСЕ HTML файлы для каждого языка
  const langToFiles = new Map();
  
  console.log('Сбор файлов для hreflang:');
  
  for (const lang of allLangs) {
    let files = [];
    
    if (lang === 'ru') {
      // Русские файлы из разных мест
      const ruFiles = [];
      
      // Из корня frontend
      const entries = fs.readdirSync(FRONTEND_DIR, { withFileTypes: true });
      for (const ent of entries) {
        const p = path.join(FRONTEND_DIR, ent.name);
        if (ent.isDirectory()) {
          if (isLanguageDirName(ent.name)) continue; // Пропускаем языковые папки
          if (!EXCLUDE_DIRS.has(ent.name)) {
            ruFiles.push(...getAllHtmlFiles(p));
          }
        } else if (ent.isFile() && ent.name.toLowerCase().endsWith('.html')) {
          ruFiles.push(p);
        }
      }
      
      // Из папки ru, если есть
      const ruDir = path.join(FRONTEND_DIR, 'ru');
      if (fileExists(ruDir)) {
        ruFiles.push(...getAllHtmlFiles(ruDir));
      }
      
      files = ruFiles;
    } else {
      // Файлы для других языков
      const langDir = path.join(FRONTEND_DIR, lang);
      if (fileExists(langDir)) {
        files = getAllHtmlFiles(langDir);
      }
    }
    
    console.log(`  ${lang}: ${files.length} файлов`);
    langToFiles.set(lang, files);
  }
  
  // Создаем карту соответствия: канонический путь -> Map(язык -> URL)
  const canonicalMap = new Map();
  
  // Сначала собираем все возможные пути
  for (const [lang, files] of langToFiles) {
    for (const file of files) {
      // Получаем относительный путь от PROJECT_ROOT
      const relPath = path.relative(PROJECT_ROOT, file).replace(/\\/g, '/');
      
      // Создаем канонический ключ (убираем frontend/ и префикс языка)
      let canonicalKey = relPath;
      
      if (canonicalKey.startsWith('frontend/')) {
        canonicalKey = canonicalKey.substring('frontend/'.length);
      }
      
      // Для не-русских языков убираем префикс языка
      if (lang !== 'ru' && canonicalKey.startsWith(lang + '/')) {
        canonicalKey = canonicalKey.substring(lang.length + 1);
      }
      
      if (!canonicalMap.has(canonicalKey)) {
        canonicalMap.set(canonicalKey, new Map());
      }
      
      const url = toUrl(file);
      canonicalMap.get(canonicalKey).set(lang, url);
    }
  }
  
  console.log(`\nНайдено уникальных страниц: ${canonicalMap.size}`);
  
  // Создаем hreflang записи
  let entryCount = 0;
  for (const [canonicalKey, langUrls] of canonicalMap) {
    // Нужна хотя бы одна ссылка
    if (langUrls.size === 0) continue;
    
    // Выбираем основную ссылку (предпочтительно русскую)
    const primaryLang = langUrls.has('ru') ? 'ru' : Array.from(langUrls.keys())[0];
    const primaryUrl = langUrls.get(primaryLang);
    
    parts.push(`  <url>`);
    parts.push(`    <loc>${primaryUrl}</loc>`);
    
    // Добавляем все языковые альтернативы
    for (const [lang, url] of langUrls) {
      const hreflang = lang === 'pt-br' ? 'pt-BR' : 
                      lang === 'pt-pt' ? 'pt-PT' : 
                      lang === 'zh-cn' ? 'zh-CN' : 
                      lang;
      parts.push(`    <xhtml:link rel="alternate" hreflang="${hreflang}" href="${url}"/>`);
    }
    
    // Добавляем x-default если есть русская версия
    if (langUrls.has('ru')) {
      parts.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${langUrls.get('ru')}"/>`);
    }
    
    parts.push(`  </url>`);
    entryCount++;
  }
  
  parts.push('</urlset>');
  const outPath = path.join(OUTPUT_DIR, 'sitemap-hreflang.xml');
  writeFileEnsured(outPath, parts.join('\n'));
  
  console.log(`\nСоздан hreflang sitemap с ${entryCount} записями`);
  return outPath;
}

function generateIndex(langs) {
  const today = formatDateYYYYMMDD(new Date());
  const parts = [];
  parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  parts.push('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  
  // RU sitemap
  parts.push(
    `  <sitemap>\n    <loc>${SITE_BASE}/sitemaps/sitemap-ru.xml</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>`
  );
  
  // Sitemaps для других языков
  for (const l of langs) {
    const loc = `${SITE_BASE}/sitemaps/sitemap-${l}.xml`;
    parts.push(
      `  <sitemap>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>`
    );
  }
  
  // Добавляем hreflang sitemap
  parts.push(
    `  <sitemap>\n    <loc>${SITE_BASE}/sitemaps/sitemap-hreflang.xml</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>`
  );
  
  parts.push('</sitemapindex>');
  const outPath = path.join(OUTPUT_DIR, 'sitemap-index.xml');
  writeFileEnsured(outPath, parts.join('\n'));
  return outPath;
}

function main() {
  console.log('=== Генерация sitemap для Serpmonn ===');
  console.log(`PROJECT_ROOT: ${PROJECT_ROOT}`);
  console.log(`FRONTEND_DIR: ${FRONTEND_DIR}`);
  
  if (!fileExists(FRONTEND_DIR)) {
    console.error(`❌ Ошибка: Не найдена директория ${FRONTEND_DIR}`);
    process.exit(1);
  }
  
  // Определяем все языковые директории
  const entries = fs.readdirSync(FRONTEND_DIR, { withFileTypes: true });
  const langs = entries
    .filter((e) => {
      if (!e.isDirectory()) return false;
      if (!isLanguageDirName(e.name)) return false;
      
      // Проверяем, есть ли в директории HTML файлы
      const langDir = path.join(FRONTEND_DIR, e.name);
      const htmlFiles = getAllHtmlFiles(langDir);
      return htmlFiles.length > 0;
    })
    .map((e) => e.name)
    .sort();

  console.log(`\nНайдено языков: ${langs.length}`);
  console.log(`Языки: ${langs.join(', ')}`);

  // Создаем папку для sitemaps
  if (!fileExists(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`Создана папка: ${OUTPUT_DIR}`);
  }

  const generated = [];
  
  // Создаем sitemap для русского языка
  console.log('\nГенерация sitemap для русского языка...');
  generated.push(generateSitemapForRU());
  
  // Создаем sitemaps для всех других языков
  for (const l of langs) {
    console.log(`Генерация sitemap для языка ${l}...`);
    const p = generateSitemapForLang(l);
    generated.push(p);
  }
  
  // Создаем hreflang sitemap
  console.log('\nГенерация hreflang sitemap...');
  generated.push(generateHreflangSitemap(langs));
  
  // Создаем индексный файл
  console.log('\nГенерация индексного файла...');
  const idx = generateIndex(langs);
  
  console.log('\n✅ Сгенерированные файлы:');
  [...generated, idx].forEach((p) => {
    console.log(`  ${path.relative(PROJECT_ROOT, p)}`);
  });
  
  console.log('\n✅ Генерация завершена!');
}

main();