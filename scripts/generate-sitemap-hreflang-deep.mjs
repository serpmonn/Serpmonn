#!/usr/bin/env node
// Генерация sitemap-hreflang.xml - ПРОСТОЙ ВАРИАНТ
import fs from 'node:fs';
import path from 'node:path';

const PROJECT_ROOT = process.cwd();
const FRONTEND_DIR = path.join(PROJECT_ROOT, '..', 'frontend');
const SITEMAPS_DIR = path.join(PROJECT_ROOT, '..', 'sitemaps');
const LANGS_FILE = path.join(PROJECT_ROOT, '..', 'assembly', 'site', '_data', 'locales.json');
const BASE = 'https://www.serpmonn.ru';

// 1. Загружаем языки
function loadLangs() {
  const raw = fs.readFileSync(LANGS_FILE, 'utf8');
  const data = JSON.parse(raw);
  return Array.isArray(data) && typeof data[0] === 'string' 
    ? data 
    : data.map(x => x.code);
}

// 2. Ищем ВСЕ HTML файлы в frontend
function findAllHtmlFiles(rootDir) {
  const files = [];
  const stack = [rootDir];
  
  while (stack.length) {
    const current = stack.pop();
    
    try {
      const stat = fs.statSync(current);
      
      if (stat.isDirectory()) {
        const entries = fs.readdirSync(current);
        for (const entry of entries) {
          if (entry.startsWith('.')) continue; // Пропускаем скрытые файлы
          stack.push(path.join(current, entry));
        }
      } else if (stat.isFile() && current.toLowerCase().endsWith('.html')) {
        files.push(current);
      }
    } catch (err) {
      // Игнорируем ошибки доступа
      continue;
    }
  }
  
  return files;
}

// 3. Группируем файлы по "логическим" страницам
function groupPagesByBaseName(allFiles, langs) {
  const pageGroups = new Map(); // baseName -> Map(lang -> url)
  
  for (const file of allFiles) {
    // Относительный путь от FRONTEND_DIR
    const relPath = path.relative(FRONTEND_DIR, file).replace(/\\/g, '/');
    
    // Определяем язык и базовое имя
    const parts = relPath.split('/');
    let lang = 'ru'; // По умолчанию русский
    let basePath = relPath;
    
    // Если первый элемент - код языка
    if (langs.includes(parts[0]) && parts.length > 1) {
      lang = parts[0];
      basePath = parts.slice(1).join('/'); // Убираем язык из пути
    }
    
    // Группируем по базовому пути
    if (!pageGroups.has(basePath)) {
      pageGroups.set(basePath, new Map());
    }
    
    const url = `${BASE}/frontend/${relPath}`;
    pageGroups.get(basePath).set(lang, url);
  }
  
  return pageGroups;
}

// 4. Генерируем XML
function generateXml(pageGroups) {
  const urls = [];
  
  for (const [basePath, langMap] of pageGroups) {
    const entries = Array.from(langMap.entries());
    
    // Русская версия как основная (если есть)
    const ruEntry = entries.find(([lang]) => lang === 'ru');
    const ruUrl = ruEntry ? ruEntry[1] : entries[0][1]; // Или первая попавшаяся
    const loc = ruUrl;
    
    if (!loc) continue;
    
    const links = [];
    
    // Добавляем все языковые версии
    for (const [lang, href] of entries) {
      const hreflang = lang === 'pt-br' ? 'pt-BR' : 
                      lang === 'pt-pt' ? 'pt-PT' : 
                      lang === 'zh-cn' ? 'zh-CN' : 
                      lang;
      links.push(`<xhtml:link rel="alternate" hreflang="${hreflang}" href="${href}"/>`);
    }
    
    // Если есть русская версия - добавляем x-default
    if (ruEntry) {
      links.push(`<xhtml:link rel="alternate" hreflang="x-default" href="${ruUrl}"/>`);
    }
    
    urls.push(`  <url>\n    <loc>${loc}</loc>\n${links.map(l => '    ' + l).join('\n')}\n  </url>`);
  }
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" 
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>`;
}

// 5. Главная функция
function main() {
  console.log('=== Простой генератор hreflang sitemap ===');
  console.log(`Ищем HTML файлы в: ${FRONTEND_DIR}`);
  
  // Создаем папку если нужно
  if (!fs.existsSync(SITEMAPS_DIR)) {
    fs.mkdirSync(SITEMAPS_DIR, { recursive: true });
  }
  
  try {
    // Загружаем языки
    const langs = loadLangs();
    console.log(`Загружено языков: ${langs.length}`);
    
    // Ищем ВСЕ HTML файлы
    console.log('Поиск всех HTML файлов...');
    const allHtmlFiles = findAllHtmlFiles(FRONTEND_DIR);
    console.log(`Найдено HTML файлов: ${allHtmlFiles.length}`);
    
    // Группируем по страницам
    console.log('Группировка файлов по страницам...');
    const pageGroups = groupPagesByBaseName(allHtmlFiles, langs);
    console.log(`Сгруппировано страниц: ${pageGroups.size}`);
    
    // Генерируем XML
    const xml = generateXml(pageGroups);
    const outPath = path.join(SITEMAPS_DIR, 'sitemap-hreflang.xml');
    
    fs.writeFileSync(outPath, xml, 'utf8');
    
    // Статистика
    let totalLinks = 0;
    let maxLangs = 0;
    let minLangs = Infinity;
    
    for (const [, langMap] of pageGroups) {
      const count = langMap.size;
      totalLinks += count;
      if (count > maxLangs) maxLangs = count;
      if (count < minLangs) minLangs = count;
    }
    
    console.log('\n✅ ГОТОВО!');
    console.log(`📊 Статистика:`);
    console.log(`   Файл: ${outPath}`);
    console.log(`   Всего HTML файлов: ${allHtmlFiles.length}`);
    console.log(`   Уникальных страниц: ${pageGroups.size}`);
    console.log(`   Всего языковых ссылок: ${totalLinks}`);
    console.log(`   Макс языков на страницу: ${maxLangs}`);
    console.log(`   Мин языков на страницу: ${minLangs}`);
    
    // Примеры для проверки
    console.log(`\n📋 Примеры найденных страниц (первые 10):`);
    let count = 0;
    for (const [basePath, langMap] of pageGroups) {
      if (count++ < 10) {
        const langs = Array.from(langMap.keys()).join(', ');
        console.log(`   ${basePath} [${langs}]`);
      }
    }
    
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Запуск
main();