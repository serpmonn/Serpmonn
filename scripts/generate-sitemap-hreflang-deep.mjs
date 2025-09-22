#!/usr/bin/env node
// Генерация sitemap-hreflang.xml (глубинные страницы news/tools/games + главные/индексы)
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

function walk(dir){
  const out = [];
  const stack = [dir];
  while (stack.length){
    const cur = stack.pop();
    let st; try { st = fs.statSync(cur); } catch { continue; }
    if (st.isDirectory()){
      for (const e of fs.readdirSync(cur)){
        if (e.startsWith('.')) continue;
        stack.push(path.join(cur, e));
      }
    } else if (st.isFile() && cur.toLowerCase().endsWith('.html')){
      out.push(cur);
    }
  }
  return out;
}

function collectHomeAndSectionIndexes(langCodes){
  const clusters = new Map(); // key -> Map(lang -> url)
  // home
  clusters.set('home', new Map([['ru', `${BASE}/`]]));
  for (const code of langCodes){
    const p = path.join(FRONTEND_DIR, code, 'index.html');
    if (fs.existsSync(p)) clusters.get('home').set(code, `${BASE}/frontend/${code}/`);
  }
  // section indexes
  for (const section of ['news','tools','games']){
    const ruIndex = path.join(FRONTEND_DIR, section, 'index.html');
    if (fs.existsSync(ruIndex)){
      const key = `${section}/index.html`;
      clusters.set(key, new Map([['ru', `${BASE}/frontend/${section}/index.html`]]));
    }
    for (const code of langCodes){
      const p = path.join(FRONTEND_DIR, code, section, 'index.html');
      if (fs.existsSync(p)){
        const key = `${section}/index.html`;
        if (!clusters.has(key)) clusters.set(key, new Map());
        clusters.get(key).set(code, `${BASE}/frontend/${code}/${section}/index.html`);
      }
    }
  }
  return clusters;
}

function collectDeepSections(langCodes){
  const clusters = new Map(); // key (section/relPath) -> Map(lang -> url)
  const sections = ['news','tools','games'];
  for (const section of sections){
    const ruDir = path.join(FRONTEND_DIR, section);
    if (!fs.existsSync(ruDir)) continue;
    const ruFiles = walk(ruDir).filter(f => !/\/index\.html$/i.test(f));
    for (const ruFile of ruFiles){
      const relFromSection = path.relative(ruDir, ruFile).replace(/\\/g,'/');
      const key = `${section}/${relFromSection}`;
      const ruUrl = `${BASE}/frontend/${section}/${relFromSection}`;
      const map = new Map();
      map.set('ru', ruUrl);
      for (const code of langCodes){
        const localizedFile = path.join(FRONTEND_DIR, code, section, relFromSection);
        if (fs.existsSync(localizedFile)){
          map.set(code, `${BASE}/frontend/${code}/${section}/${relFromSection}`);
        }
      }
      clusters.set(key, map);
    }
  }
  return clusters;
}

function toHreflangCode(lang){
  if (lang === 'pt-br') return 'pt-BR';
  if (lang === 'pt-pt') return 'pt-PT';
  return lang;
}

function clustersToXml(clusters){
  const urls = [];
  for (const [, byLang] of clusters){
    const entries = Array.from(byLang.entries());
    const ruEntry = entries.find(([l]) => l === 'ru');
    const ruUrl = ruEntry ? ruEntry[1] : null;
    const loc = ruUrl || (entries[0] ? entries[0][1] : null);
    if (!loc) continue;
    const links = [];
    if (ruUrl) links.push(`<xhtml:link rel="alternate" hreflang="ru" href="${ruUrl}"/>`);
    for (const [lang, href] of entries){
      if (lang === 'ru') continue;
      links.push(`<xhtml:link rel="alternate" hreflang="${toHreflangCode(lang)}" href="${href}"/>`);
    }
    if (ruUrl) links.push(`<xhtml:link rel="alternate" hreflang="x-default" href="${ruUrl}"/>`);
    urls.push(`  <url>\n    <loc>${loc}</loc>\n${links.map(l=>'    '+l).join('\n')}\n  </url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls.join('\n')}\n</urlset>\n`;
}

function main(){
  if (!fs.existsSync(SITEMAPS_DIR)) fs.mkdirSync(SITEMAPS_DIR, { recursive: true });
  const langs = loadLangs();
  const clusters = new Map();
  // home + section indexes
  for (const [k,v] of collectHomeAndSectionIndexes(langs)) clusters.set(k,v);
  // deep pages
  for (const [k,v] of collectDeepSections(langs)) clusters.set(k,v);
  const xml = clustersToXml(clusters);
  const out = path.join(SITEMAPS_DIR, 'sitemap-hreflang.xml');
  write(out, xml);
  console.log(`Создан ${out}; кластеров: ${clusters.size}`);
}

try { main(); } catch (e) { console.error('Ошибка:', e.message); process.exit(1); }

