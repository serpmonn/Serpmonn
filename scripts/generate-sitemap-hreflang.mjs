#!/usr/bin/env node
// Генерация sitemap-hreflang.xml со ссылками xhtml:link rel="alternate" для локализованных страниц
import fs from 'node:fs';
import path from 'node:path';

const FRONTEND_DIR = path.join(process.cwd(), 'frontend');
const SITEMAPS_DIR = path.join(process.cwd(), 'sitemaps');
const LANGS_FILE = path.join(FRONTEND_DIR, 'i18n', 'languages.json');
const BASE = 'https://www.serpmonn.ru';

function read(file){ try { return fs.readFileSync(file,'utf8'); } catch { return null; } }
function write(file, txt){ fs.writeFileSync(file, txt, 'utf8'); }

function loadLangs(){
  const raw = read(LANGS_FILE);
  if (!raw) throw new Error('languages.json не найден');
  const arr = JSON.parse(raw);
  return arr.map(x=>x.code);
}

function collectLocalizedPages(langCodes){
  // Покроем индекс локалей и ключевые разделы (index страниц): news/tools/games
  const pages = new Map(); // key: logical page id -> map(lang->url)

  // RU главная
  pages.set('home', new Map([['ru', `${BASE}/`]]));

  // Локальные индексы: /frontend/<lang>/index.html
  for (const code of langCodes){
    const p = path.join(FRONTEND_DIR, code, 'index.html');
    if (fs.existsSync(p)){
      if (!pages.has('home')) pages.set('home', new Map());
      pages.get('home').set(code, `${BASE}/frontend/${code}/`);
    }
  }

  // Разделы: news, tools, games
  const sections = ['news', 'tools', 'games'];
  for (const section of sections){
    // RU версия без префикса
    const ruIndex = path.join(FRONTEND_DIR, section, 'index.html');
    if (fs.existsSync(ruIndex)){
      pages.set(`${section}/index`, new Map([['ru', `${BASE}/frontend/${section}/index.html`]]));
    }
    for (const code of langCodes){
      const f = path.join(FRONTEND_DIR, code, section, 'index.html');
      if (fs.existsSync(f)){
        const key = `${section}/index`;
        if (!pages.has(key)) pages.set(key, new Map());
        pages.get(key).set(code, `${BASE}/frontend/${code}/${section}/index.html`);
      }
    }
  }
  return pages;
}

function formatXml(pages){
  const urls = [];
  for (const [, byLang] of pages){
    // Подготовить список всех локалей + ru
    const entries = Array.from(byLang.entries());
    // Определим ru как x-default, если присутствует
    const ruEntry = entries.find(([lang]) => lang === 'ru');
    const ruUrl = ruEntry ? ruEntry[1] : null;

    // Сформировать блок URL
    const loc = ruUrl || entries[0][1];
    const links = [];
    if (ruUrl){
      links.push(`<xhtml:link rel="alternate" hreflang="ru" href="${ruUrl}"/>`);
    }
    for (const [lang, href] of entries){
      if (lang === 'ru') continue;
      const code = lang === 'pt-br' ? 'pt-BR' : lang === 'pt-pt' ? 'pt-PT' : lang;
      links.push(`<xhtml:link rel="alternate" hreflang="${code}" href="${href}"/>`);
    }
    if (ruUrl){
      links.push(`<xhtml:link rel="alternate" hreflang="x-default" href="${ruUrl}"/>`);
    }
    urls.push(`  <url>\n    <loc>${loc}</loc>\n${links.map(l=>'    '+l).join('\n')}\n  </url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
}

function main(){
  if (!fs.existsSync(SITEMAPS_DIR)) fs.mkdirSync(SITEMAPS_DIR, { recursive: true });
  const langs = loadLangs();
  const pages = collectLocalizedPages(langs);
  const xml = formatXml(pages);
  const out = path.join(SITEMAPS_DIR, 'sitemap-hreflang.xml');
  write(out, xml);
  console.log(`Создан ${out} (${xml.length} bytes)`);
}

try { main(); } catch (e) { console.error('Ошибка:', e.message); process.exit(1); }

