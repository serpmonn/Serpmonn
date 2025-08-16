const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;

// MIME типы для файлов
const mimeTypes = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    
    let filePath = req.url === '/' ? '/personalization-demo.html' : req.url;
    filePath = path.join(__dirname, filePath);
    
    // Проверяем существование файла
    if (!fs.existsSync(filePath)) {
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.end('<h1>404 - Файл не найден</h1>');
        return;
    }
    
    // Определяем MIME тип
    const extname = path.extname(filePath);
    const contentType = mimeTypes[extname] || 'application/octet-stream';
    
    // Читаем файл
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(500, { 'Content-Type': 'text/html' });
            res.end('<h1>500 - Ошибка сервера</h1>');
            return;
        }
        
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content);
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Сервер запущен на http://localhost:${PORT}`);
    console.log(`📱 Демо персонализации: http://localhost:${PORT}/personalization-demo.html`);
    console.log(`🏠 Главная страница: http://localhost:${PORT}/main.html`);
    console.log(`\n💡 Для остановки сервера нажмите Ctrl+C`);
});

// Обработка остановки сервера
process.on('SIGINT', () => {
    console.log('\n👋 Сервер остановлен');
    process.exit(0);
});