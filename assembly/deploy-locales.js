const fs = require('fs-extra');
const path = require('path');

console.log('🔧 Скрипт замены локалей запущен...');

// Пути относительно расположения скрипта
const ROOT_PATH = path.join(__dirname, '..');
const DIST_PATH = path.join(ROOT_PATH, 'dist/frontend');
const TARGET_PATH = path.join(ROOT_PATH, 'site/frontend');

console.log('📁 Пути:');
console.log('   Исходники:', DIST_PATH);
console.log('   Цель:', TARGET_PATH);

// Проверяем существование путей
if (!fs.existsSync(DIST_PATH)) {
    console.log('❌ Папка с собранными файлами не найдена!');
    console.log('   Сначала запустите: npm run build');
    process.exit(1);
}

if (!fs.existsSync(TARGET_PATH)) {
    console.log('❌ Целевая папка не найдена!');
    process.exit(1);
}

console.log('🚀 Начинаем замену файлов локалей...');

// Русский язык
try {
    const ruSource = path.join(DIST_PATH, 'main.html');
    const ruTarget = path.join(TARGET_PATH, 'main.html');
    
    if (fs.existsSync(ruSource)) {
        fs.copySync(ruSource, ruTarget, { overwrite: true });
        console.log('✓ Заменен русский (main.html)');
    } else {
        console.log('✗ Файл не найден: русский (main.html)');
    }
} catch (error) {
    console.log('❌ Ошибка при замене русского:', error.message);
}

// Все остальные языки
const locales = ['en', 'ar', 'az', 'be', 'bg', 'bn', 'cs', 'da', 'de', 'el', 'es', 'es-419', 'fa', 'fi', 'fil', 'fr', 'he', 'hi', 'hu', 'hy', 'id', 'it', 'ja', 'ka', 'kk', 'ko', 'ms', 'nb', 'nl', 'pl', 'pt-br', 'pt-pt', 'ro', 'sr', 'sv', 'th', 'tr', 'ur', 'uz', 'vi', 'zh-cn', 'ps', 'sd', 'ug', 'dv', 'ks', 'ku-Arab', 'yi'];

let successCount = 0;
let errorCount = 0;

locales.forEach(locale => {
    try {
        const source = path.join(DIST_PATH, locale, 'index.html');
        const target = path.join(TARGET_PATH, locale, 'index.html');
        
        if (fs.existsSync(source)) {
            // Создаем директорию если не существует
            fs.ensureDirSync(path.dirname(target));
            // Заменяем файл
            fs.copySync(source, target, { overwrite: true });
            console.log(`✓ Заменен ${locale}`);
            successCount++;
        } else {
            console.log(`✗ Файл не найден для ${locale}`);
            errorCount++;
        }
    } catch (error) {
        console.log(`❌ Ошибка при замене ${locale}:`, error.message);
        errorCount++;
    }
});

console.log('\n📊 Итоги замены:');
console.log(`   ✅ Успешно: ${successCount}`);
console.log(`   ❌ Ошибки: ${errorCount}`);
console.log(`   📁 Всего языков: ${locales.length + 1}`);
console.log('🎉 Замена файлов завершена!');