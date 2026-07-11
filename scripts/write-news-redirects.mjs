#!/usr/bin/env node
/**
 * Writes 301-style HTML redirects from legacy /frontend/.../news/ URLs
 * to /frontend/.../knowledge-base/ after the knowledge-base migration.
 */
import fs from 'fs';
import path from 'path';

const FRONTEND = '/var/www/serpmonn.ru/frontend';
const LOCALES = JSON.parse(
  fs.readFileSync('/var/www/serpmonn.ru/assembly/site/_data/locales.json', 'utf8')
).filter((loc) => loc !== 'ru');

function redirectHtml(target) {
  const safe = target.replace(/"/g, '&quot;');
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0;url=${safe}">
  <link rel="canonical" href="${safe}">
  <script>location.replace(${JSON.stringify(target)});</script>
  <title>Переадресация</title>
</head>
<body><p><a href="${safe}">Перейти в базу знаний</a></p></body>
</html>`;
}

function writeRedirect(fromRel, toPath) {
  const file = path.join(FRONTEND, fromRel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, redirectHtml(toPath));
}

const articleSlugs = [
  'cookies-complete-guide.html',
  'port-forwarding-guide.html',
  'snippet-limits-vk-telegram-youtube-tiktok.html',
  'indexnow-practical-guide.html',
  'utm-complete-guide.html',
  'web-development-guide.html',
  'web-tech-trends-2024.html',
  'how-to-calculate-depreciation.html',
  'how-to-calculate-the-eco-footprint-of-products.html',
  'updates-august-17.html',
  'updates-aug-25-sep-15.html',
];

function migrateLocale(prefix) {
  const kbBase = prefix ? `/frontend/${prefix}/knowledge-base` : '/frontend/knowledge-base';
  const newsRel = prefix ? `${prefix}/news` : 'news';

  writeRedirect(`${newsRel}/news.html`, `${kbBase}/knowledge-base.html`);
  writeRedirect(`${newsRel}/rss.xml`, `${kbBase}/rss.xml`);

  for (const slug of articleSlugs) {
    writeRedirect(`${newsRel}/articles/${slug}`, `${kbBase}/articles/${slug}`);
  }
}

migrateLocale('');
for (const locale of LOCALES) {
  migrateLocale(locale);
}

console.log('✅ Legacy /news/ redirect stubs written');
