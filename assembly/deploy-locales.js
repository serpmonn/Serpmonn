// deploy-locales.js
const fs = require('fs');
const path = require('path');

console.log('🔧 Умный скрипт синхронизации локалей запущен...');

const DIST_PATH = path.join(__dirname, 'dist/frontend');
const TARGET_PATH = '/var/www/serpmonn.ru/frontend';
const LOCALES_FILE = path.join(__dirname, 'site/_data/locales.json');

console.log('📁 Пути:');
console.log('   Источник (новое):', DIST_PATH);
console.log('   Цель (рабочий сайт):', TARGET_PATH);
console.log('   Файл локалей:', LOCALES_FILE);

// Загружаем локали из JSON файла
let locales = [];
try {
    const localesData = JSON.parse(fs.readFileSync(LOCALES_FILE, 'utf8'));
    locales = localesData.filter(locale => locale !== 'ru'); // исключаем русский
    console.log(`📁 Загружено ${locales.length} локалей из locales.json`);
} catch (error) {
    console.log('❌ Ошибка загрузки locales.json:', error.message);
    console.log('⚠️  Используем fallback список локалей');
    // Fallback на случай ошибки
    locales = ['en', 'ar', 'az', 'be', 'bg', 'bn', 'cs', 'da', 'de', 'el', 'es', 'es-419', 'fa', 'fi', 'fil', 'fr', 'he', 'hi', 'hu', 'hy', 'id', 'it', 'ja', 'ka', 'kk', 'ko', 'ms', 'nb', 'nl', 'pl', 'pt-br', 'pt-pt', 'ro', 'sr', 'sv', 'th', 'tr', 'ur', 'uz', 'vi', 'zh-cn', 'ps', 'sd', 'ug', 'dv', 'ks', 'ku-Arab', 'yi'];
}

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

console.log('🚀 Начинаем умную синхронизацию...');

// Функция для создания директорий
function ensureDirSync(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`   📁 Создана папка: ${path.relative(TARGET_PATH, dir)}`);
    }
}

// Функция для копирования файлов с проверкой
function smartCopy(source, target, overwrite = false) {
    ensureDirSync(path.dirname(target));
    
    const fileExists = fs.existsSync(target);
    
    if (!fileExists) {
        // Файла нет - копируем
        fs.copyFileSync(source, target);
        return 'added';
    } else if (overwrite) {
        // Файл есть, но разрешено перезаписывать (для HTML)
        fs.copyFileSync(source, target);
        return 'updated';
    } else {
        // Файл есть и перезаписывать нельзя - пропускаем
        return 'skipped';
    }
}

// Функция для синхронизации папки
function syncFolder(sourceFolder, targetFolder, overwriteRules = {}) {
    if (!fs.existsSync(sourceFolder)) return { added: 0, updated: 0, skipped: 0 };
    
    const items = fs.readdirSync(sourceFolder);
    let stats = { added: 0, updated: 0, skipped: 0 };
    
    for (const item of items) {
        const sourcePath = path.join(sourceFolder, item);
        const targetPath = path.join(targetFolder, item);
        
        // Пропускаем служебные папки
        if (item === '_includes' || item === '_data') continue;
        
        const stat = fs.statSync(sourcePath);
        
        if (stat.isDirectory()) {
            // Рекурсивно синхронизируем подпапки
            const subStats = syncFolder(sourcePath, targetPath, overwriteRules);
            stats.added += subStats.added;
            stats.updated += subStats.updated;
            stats.skipped += subStats.skipped;
        } else {
            // Определяем правило перезаписи для файла
            const ext = path.extname(item).toLowerCase();
            const overwrite = overwriteRules[ext] || false;
            
            const result = smartCopy(sourcePath, targetPath, overwrite);
            stats[result]++;
            
            if (result === 'added') {
                console.log(`   ➕ Добавлен: ${path.relative(TARGET_PATH, targetPath)}`);
            } else if (result === 'updated') {
                console.log(`   🔄 Обновлен: ${path.relative(TARGET_PATH, targetPath)}`);
            }
        }
    }
    
    return stats;
}

// Правила перезаписи: какие файлы можно перезаписывать
const OVERWRITE_RULES = {
    '.html': true,    // HTML файлы всегда обновляем
    '.htm': true
    // Остальные файлы (.css, .js, .png и т.д.) - только добавляем если их нет
};

let totalStats = { added: 0, updated: 0, skipped: 0 };

console.log('\n📋 Синхронизация корневой папки (русский):');
const rootStats = syncFolder(DIST_PATH, TARGET_PATH, OVERWRITE_RULES);
totalStats.added += rootStats.added;
totalStats.updated += rootStats.updated;
totalStats.skipped += rootStats.skipped;

// Синхронизация всех языковых папок из locales.json
console.log('\n🌍 Синхронизация языковых папок:');
for (const locale of locales) {
    const sourceLocalePath = path.join(DIST_PATH, locale);
    const targetLocalePath = path.join(TARGET_PATH, locale);
    
    if (fs.existsSync(sourceLocalePath)) {
        console.log(`\n   📁 Язык: ${locale}`);
        const localeStats = syncFolder(sourceLocalePath, targetLocalePath, OVERWRITE_RULES);
        totalStats.added += localeStats.added;
        totalStats.updated += localeStats.updated;
        totalStats.skipped += localeStats.skipped;
    } else {
        console.log(`   ⚠️  Папка не найдена в сборке: ${locale}`);
    }
}

console.log('\n📊 Итоги синхронизации:');
console.log(`   ➕ Добавлено файлов: ${totalStats.added}`);
console.log(`   🔄 Обновлено HTML: ${totalStats.updated}`);
console.log(`   ⏭️  Пропущено (уже есть): ${totalStats.skipped}`);
console.log(`   🌍 Всего языков: ${locales.length + 1} (из locales.json)`);
console.log('🎉 Умная синхронизация завершена!');