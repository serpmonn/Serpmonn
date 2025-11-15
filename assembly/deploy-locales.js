// deploy-locales.js
const fs = require('fs');
const path = require('path');

console.log('🔧 Скрипт замены локалей запущен...');

// ПРАВИЛЬНЫЕ ПУТИ!
const DIST_PATH = path.join(__dirname, 'dist/frontend');              // assembly/dist/frontend/
const TARGET_PATH = '/var/www/serpmonn.ru/frontend';                // рабочие файлы

console.log('📁 Пути:');
console.log('   Исходники (новые):', DIST_PATH);
console.log('   Цель (рабочие):', TARGET_PATH);

// Проверяем существование путей
if (!fs.existsSync(DIST_PATH)) {
    console.log('❌ Папка dist/frontend/ не найдена!');
    console.log('   Сначала запустите: npm run build');
    process.exit(1);
}

if (!fs.existsSync(TARGET_PATH)) {
    console.log('❌ Целевая папка не найдена!');
    console.log('   Проверьте путь:', TARGET_PATH);
    process.exit(1);
}

console.log('🚀 Начинаем замену файлов локалей...');

// Функция для создания директорий
function ensureDirSync(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// Функция для копирования файлов
function copySync(source, target) {
    ensureDirSync(path.dirname(target));
    fs.copyFileSync(source, target);
}

// Русский язык - основные файлы
try {
    const ruFiles = [
        { source: path.join(DIST_PATH, 'main.html'), target: path.join(TARGET_PATH, 'main.html') },
        { source: path.join(DIST_PATH, 'menu.html'), target: path.join(TARGET_PATH, 'menu.html') }
    ];
    
    for (const file of ruFiles) {
        if (fs.existsSync(file.source)) {
            copySync(file.source, file.target);
            console.log(`✓ Заменен русский (${path.basename(file.source)})`);
        } else {
            console.log(`✗ Файл не найден: русский (${path.basename(file.source)})`);
        }
    }
} catch (error) {
    console.log('❌ Ошибка при замене русского:', error.message);
}

// Все остальные языки
const locales = ['en', 'ar', 'az', 'be', 'bg', 'bn', 'cs', 'da', 'de', 'el', 'es', 'es-419', 'fa', 'fi', 'fil', 'fr', 'he', 'hi', 'hu', 'hy', 'id', 'it', 'ja', 'ka', 'kk', 'ko', 'ms', 'nb', 'nl', 'pl', 'pt-br', 'pt-pt', 'ro', 'sr', 'sv', 'th', 'tr', 'ur', 'uz', 'vi', 'zh-cn', 'ps', 'sd', 'ug', 'dv', 'ks', 'ku-Arab', 'yi'];

let successCount = 0;
let errorCount = 0;

for (const locale of locales) {
    try {
        const filesToCopy = [
            { source: path.join(DIST_PATH, locale, 'index.html'), target: path.join(TARGET_PATH, locale, 'index.html') },
            { source: path.join(DIST_PATH, locale, 'menu.html'), target: path.join(TARGET_PATH, locale, 'menu.html') }
        ];
        
        let localeSuccess = 0;
        
        for (const file of filesToCopy) {
            if (fs.existsSync(file.source)) {
                copySync(file.source, file.target);
                console.log(`✓ Заменен ${locale} (${path.basename(file.source)})`);
                localeSuccess++;
            } else {
                console.log(`✗ Файл не найден для ${locale}: ${path.basename(file.source)}`);
            }
        }
        
        if (localeSuccess > 0) {
            successCount++;
        } else {
            errorCount++;
        }
        
    } catch (error) {
        console.log(`❌ Ошибка при замене ${locale}:`, error.message);
        errorCount++;
    }
}

console.log('\n📊 Итоги замены:');
console.log(`   ✅ Успешно обработано языков: ${successCount + 1}`);
console.log(`   ❌ Ошибки: ${errorCount}`);
console.log(`   📁 Всего языков: ${locales.length + 1}`);
console.log(`   📄 Файлов на язык: 2 (index.html + menu.html)`);
console.log('🎉 Замена файлов завершена!');