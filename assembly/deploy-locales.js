// deploy-locales.js
const fs = require('fs');
const path = require('path');

console.log('🔧 Умный скрипт синхронизации локалей запущен...');

const DIST_PATH = path.join(__dirname, 'dist/frontend');
const LOCALES_FILE = path.join(__dirname, 'site/_data/locales.json');

const DEPLOY_TARGETS = {
  prod: '/var/www/serpmonn.ru/frontend',
  dev: '/var/www/serpmonn-dev/frontend'
};

const deployTargetKey = String(process.env.DEPLOY_TARGET || 'prod').trim().toLowerCase();
const TARGET_PATH =
  process.env.DEPLOY_FRONTEND ||
  DEPLOY_TARGETS[deployTargetKey] ||
  DEPLOY_TARGETS.prod;

if (!DEPLOY_TARGETS[deployTargetKey] && !process.env.DEPLOY_FRONTEND) {
  console.log(`⚠️  Неизвестный DEPLOY_TARGET="${deployTargetKey}", используем prod`);
}

console.log('📁 Пути:');
console.log('   Источник (новое):', DIST_PATH);
console.log('   Цель (DEPLOY_TARGET=' + (process.env.DEPLOY_FRONTEND ? 'custom' : deployTargetKey) + '):', TARGET_PATH);
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
    locales = ['en', 'ar', 'az', 'be', 'bg', 'bn', 'cs', 'da', 'de', 'el', 'es', 'es-419', 'fa', 'fi', 'fil', 'fr', 'he', 'hi', 'hu', 'hy', 'id', 'it', 'ja', 'ka', 'kk', 'ko', 'ms', 'nb', 'nl', 'pl', 'pt-br', 'pt-pt', 'ro', 'sr', 'sv', 'th', 'tr', 'ur', 'uz', 'vi', 'zh-cn', 'ps', 'sd', 'ug', 'dv', 'ks', 'ku-arab', 'yi'];
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
        // Файл есть и разрешено перезаписывать
        // Сравниваем даты модификации, чтобы не обновлять без изменений
        const sourceStats = fs.statSync(source);
        const targetStats = fs.statSync(target);
        
        // Если исходный файл новее - обновляем
        if (sourceStats.mtimeMs > targetStats.mtimeMs) {
            fs.copyFileSync(source, target);
            return 'updated';
        } else {
            return 'skipped'; // Файл не изменился
        }
    } else {
        // Файл есть и перезаписывать нельзя - пропускаем
        return 'skipped';
    }
}

// Функция для синхронизации папки
// options.htmlOnly — копировать только .html/.htm (для локалей)
// options.skipDirNames — Set имён подпапок, которые пропускаем на этом уровне
function syncFolder(sourceFolder, targetFolder, overwriteRules = {}, options = {}) {
    if (!fs.existsSync(sourceFolder)) return { added: 0, updated: 0, skipped: 0 };
    
    const items = fs.readdirSync(sourceFolder);
    let stats = { added: 0, updated: 0, skipped: 0 };
    const skipDirNames = options.skipDirNames || null;
    const htmlOnly = Boolean(options.htmlOnly);
    
    for (const item of items) {
        const sourcePath = path.join(sourceFolder, item);
        const targetPath = path.join(targetFolder, item);
        
        // Пропускаем служебные папки
        if (item === '_includes' || item === '_data') continue;
        
        // Пропускаем пользовательские папки (если они есть)
        const userFolders = ['uploads', 'user-content', 'cache', 'temp'];
        if (userFolders.includes(item)) {
            console.log(`   ⏭️  Пропущена пользовательская папка: ${item}`);
            continue;
        }
        
        const stat = fs.statSync(sourcePath);
        
        if (stat.isDirectory()) {
            if (skipDirNames && skipDirNames.has(item)) {
                continue;
            }
            // Рекурсивно синхронизируем подпапки
            const subStats = syncFolder(sourcePath, targetPath, overwriteRules, options);
            stats.added += subStats.added;
            stats.updated += subStats.updated;
            stats.skipped += subStats.skipped;
        } else {
            if (htmlOnly) {
                const ext = path.extname(item).toLowerCase();
                if (ext !== '.html' && ext !== '.htm') {
                    stats.skipped++;
                    continue;
                }
            }

            // Определяем правило перезаписи для файла
            const ext = path.extname(item).toLowerCase();
            const overwrite = overwriteRules[ext] || overwriteRules['*'] || false;
            
            const result = smartCopy(sourcePath, targetPath, overwrite);
            stats[result]++;
            
            if (result === 'added') {
                console.log(`   ➕ Добавлен: ${path.relative(TARGET_PATH, targetPath)}`);
            } else if (result === 'updated') {
                console.log(`   🔄 Обновлен: ${path.relative(TARGET_PATH, targetPath)} (изменен ${new Date(stat.mtime).toLocaleString()})`);
            }
        }
    }
    
    return stats;
}

// Расширенные правила перезаписи для файлов сборки
const OVERWRITE_RULES = {
    // Веб-файлы (основной контент)
    '.html': true,
    '.htm': true,
    
    // Скрипты и стили (важно обновлять!)
    '.js': true,
    '.css': true,
    '.scss': true,
    '.sass': true,
    '.less': true,
    
    // Конфигурации и данные
    '.json': true,
    '.xml': true,
    '.yaml': true,
    '.yml': true,
    
    // Source maps для отладки
    '.map': true,
    
    // Изображения (обычно часть сборки)
    '.png': true,
    '.jpg': true,
    '.jpeg': true,
    '.gif': true,
    '.svg': true,
    '.ico': true,
    '.webp': true,
    '.avif': true,
    
    // Шрифты
    '.woff': true,
    '.woff2': true,
    '.ttf': true,
    '.eot': true,
    
    // Текстовые файлы
    '.txt': true,
    '.md': true,
    
    // Другие веб-файлы
    '.webmanifest': true,
    
    // Бинарные файлы (по желанию, обычно не меняются)
    // '.pdf': false,
    // '.zip': false,
    // '.rar': false,
};

let totalStats = { added: 0, updated: 0, skipped: 0 };

console.log('\n📋 Синхронизация корневой папки (русский + общая статика):');
const rootStats = syncFolder(DIST_PATH, TARGET_PATH, OVERWRITE_RULES, {
    // В корне локальные папки языков не трогаем этим проходом —
    // их синхронизируем отдельно и только HTML.
    skipDirNames: new Set(locales),
});
totalStats.added += rootStats.added;
totalStats.updated += rootStats.updated;
totalStats.skipped += rootStats.skipped;

// Синхронизация всех языковых папок из locales.json — только HTML.
// Статика (images/fonts/styles/scripts/…) живёт в /frontend/*, не в локалях.
console.log('\n🌍 Синхронизация языковых папок (только HTML):');
for (const locale of locales) {
    const sourceLocalePath = path.join(DIST_PATH, locale);
    const targetLocalePath = path.join(TARGET_PATH, locale);
    
    if (fs.existsSync(sourceLocalePath)) {
        console.log(`\n   📁 Язык: ${locale}`);
        const localeStats = syncFolder(sourceLocalePath, targetLocalePath, OVERWRITE_RULES, {
            htmlOnly: true,
        });
        totalStats.added += localeStats.added;
        totalStats.updated += localeStats.updated;
        totalStats.skipped += localeStats.skipped;
    } else {
        console.log(`   ⚠️  Папка не найдена в сборке: ${locale}`);
    }
}

// Удаляем устаревшую папку локали после переименования ku-Arab → ku-arab
const legacyLocalePath = path.join(TARGET_PATH, 'ku-Arab');
if (fs.existsSync(legacyLocalePath)) {
    fs.rmSync(legacyLocalePath, { recursive: true, force: true });
    console.log('\n🗑️  Удалена устаревшая папка: frontend/ku-Arab');
}

console.log('\n📊 Итоги синхронизации:');
console.log(`   ➕ Добавлено файлов: ${totalStats.added}`);
console.log(`   🔄 Обновлено файлов: ${totalStats.updated}`);
console.log(`   ⏭️  Пропущено (без изменений): ${totalStats.skipped}`);
console.log(`   🌍 Всего языков: ${locales.length + 1} (из locales.json)`);

// Проверяем, были ли реальные обновления
const totalChanged = totalStats.added + totalStats.updated;
if (totalChanged === 0) {
    console.log('\n💡 Нет изменений для развертывания.');
} else {
    console.log(`\n✅ Развернуто ${totalChanged} измененных файлов.`);
}

console.log('🎉 Умная синхронизация завершена!');

// Удаляем устаревшие дубли статики из локалей (images/fonts/styles/…)
try {
    const { spawnSync } = require('child_process');
    const cleanupScript = path.join(__dirname, '../scripts/cleanup-locale-static-assets.mjs');
    if (fs.existsSync(cleanupScript)) {
        console.log('\n🧹 Очистка дублей статики в локалях...');
        const result = spawnSync(process.execPath, [cleanupScript], {
            cwd: path.join(__dirname, '..'),
            stdio: 'inherit',
        });
        if (result.status !== 0) {
            console.log('⚠️  cleanup-locale-static-assets завершился с кодом', result.status);
        }
    }
} catch (err) {
    console.log('⚠️  Не удалось запустить cleanup-locale-static-assets:', err.message);
}
