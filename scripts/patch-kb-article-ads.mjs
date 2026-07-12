#!/usr/bin/env node
/** Add shared ad-top-banner.css and loading class to KB article templates. */
import fs from 'fs';
import path from 'path';

const siteDir = '/var/www/serpmonn.ru/assembly/site';
const files = [
  'cookies-complete-guide.njk',
  'port-forwarding-guide.njk',
  'snippet-limits-vk-telegram-youtube-tiktok.njk',
  'indexnow-practical-guide.njk',
  'utm-complete-guide.njk',
  'web-development-guide.njk',
  'web-tech-trends-2025.njk',
  'how-to-calculate-depreciation.njk',
  'how-to-calculate-the-eco-footprint-of-products.njk',
  'updates-august-17.njk',
  'updates-aug-25-sep-15.njk',
];

const cssLink = '  <link rel="stylesheet" href="/frontend/styles/ad-top-banner.css">';

for (const file of files) {
  const filePath = path.join(siteDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  if (!content.includes('ad-top-banner.css')) {
    content = content.replace(
      /(<link rel="stylesheet" href="\/frontend\/styles\/accessibility\.css">)/,
      `$1\n${cssLink}`
    );
  }

  content = content.replace(
    /<div class="ad-top-banner ad-banner(?!\s+loading)([^"]*)">/g,
    '<div class="ad-top-banner ad-banner loading$1">'
  );
  content = content.replace(
    /<div class="ad-top-banner"(?!\s+ad-banner)([^>]*)>/g,
    '<div class="ad-top-banner ad-banner loading$1">'
  );
  content = content.replace(/\sstyle="text-align:center;margin:16px 0;"/g, '');

  // Remove inline ad-top-banner CSS blocks from article templates
  content = content.replace(/\n\s*\.ad-top-banner \{[\s\S]*?\}\n\s*@media \(max-width: 768px\) \{ \.ad-top-banner \.mrg-tag[\s\S]*?\}\n/g, '\n');
  content = content.replace(/\n\s*\.ad-top-banner \{[\s\S]*?\}\n\s*\.ad-top-banner\.hidden \{[\s\S]*?\}\n\s*\.ad-top-banner \.mrg-tag \{[\s\S]*?\}\n\s*@media \(max-width: 1199px\) \{ \.ad-top-banner \.mrg-tag[\s\S]*?\}\n\s*@media \(max-width: 768px\) \{ \.ad-top-banner \.mrg-tag[\s\S]*?\}\n/g, '\n');
  content = content.replace(/\n\s*\.ad-top-banner \.mrg-tag \{ width: 970px !important; height: 250px !important; \}[\s\S]*?@media \(max-width: 768px\) \{ \.ad-top-banner \.mrg-tag \{ width: 320px !important; height: 50px !important; \} \}\n/g, '\n');

  fs.writeFileSync(filePath, content);
  console.log(`Patched ${file}`);
}
