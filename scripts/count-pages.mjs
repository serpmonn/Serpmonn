// count-pages.mjs
import fs from 'fs';
import path from 'path';

// Пути
const FRONTEND_PATH = '/var/www/serpmonn.ru/frontend';
const OUTPUT_FILE = '/var/www/serpmonn.ru/assembly/site/src/about-project/page-count.json';

let count = 0;

function countHtml(dir) {
  try {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      // Игнорирование скрытых папок
      if (item.startsWith('.')) continue;
      
      const fullPath = path.join(dir, item);
      
      try {
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          // Пропуск node_modules и .git
          if (item !== 'node_modules' && item !== '.git') {
            countHtml(fullPath);
          }
        } else if (item.endsWith('.html') || item.endsWith('.htm')) {
          count++;
        }
      } catch (err) {
        // Пропускаем если нет доступа
      }
    }
  } catch (err) {
    console.log(`Не могу прочитать папку ${dir}: ${err.message}`);
  }
}

// Запуск
try {
  console.log(`🔍 Ищу HTML/HTM в папке: ${FRONTEND_PATH}`);
  
  if (!fs.existsSync(FRONTEND_PATH)) {
    console.log(`❌ Папка "${FRONTEND_PATH}" не найдена`);
    process.exit(1);
  }
  
  countHtml(FRONTEND_PATH);
  
  const result = {
    count: count,
    updated: new Date().toISOString(),
    updatedReadable: new Date().toLocaleString('ru-RU')
  };
  
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(result, null, 2));
  
  console.log(`✅ HTML/HTM страниц: ${count}`);
  console.log(`💾 Сохранено в ${OUTPUT_FILE}`);
  
} catch (error) {
  console.error('❌ Ошибка:', error.message);
  process.exit(1);
}