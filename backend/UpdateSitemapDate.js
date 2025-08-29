const fs = require('fs');
const { JSDOM } = require('jsdom');
const { format } = require('date-fns');

// Путь файлу sitemap
const sitemapPath = '/var/www/serpmonn.ru/sitemap/sitemap.xml';

// Чтение существующего файла sitemap
fs.readFile(sitemapPath, 'utf8', (err, data) => {
  if (err) {
    console.error('Ошибка чтения файла:', err);
    return;
  }

  // Парсинг XML
  const dom = new JSDOM(data, { contentType: 'text/xml' });
  const document = dom.window.document;

  // Текущая дата
  const currentDate = format(new Date(), 'yyyy-MM-dd');

  // Обновление даты в каждом элементе <lastmod>
  const urls = document.querySelectorAll('url > lastmod');
  urls.forEach(lastmod => {
    lastmod.textContent = currentDate;
  });

  // Сохранение обновленного файла sitemap
  fs.writeFile(sitemapPath, dom.serialize(), 'utf8', err => {
    if (err) {
      console.error('Ошибка записи файла:', err);
      return;
    }
    console.log(`Дата обновлена на ${currentDate}`);
  });
});
