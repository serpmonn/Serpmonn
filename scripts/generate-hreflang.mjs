#!/usr/bin/env node
// Генерация link rel="alternate" hreflang для всех локалей на страницах index.html и некоторых ключевых страницах
import fs from 'node:fs';
import path from 'node:path';

const FRONTEND_DIR = path.join(process.cwd(), 'frontend');
const LANGS_FILE = path.join(FRONTEND_DIR, 'i18n', 'languages.json');
const BASE_HOST = 'https://www.serpmonn.ru';

function readText(file){ try { return fs.readFileSync(file,'utf8'); } catch { return null; } }
function writeText(file, txt){ fs.writeFileSync(file, txt, 'utf8'); }

function loadLangs(){
  const raw = readText(LANGS_FILE);
  if (!raw) throw new Error('languages.json не найден');
  const arr = JSON.parse(raw);
  return arr.map(x=>x.code);
}

function collectIndexCandidates(langCodes){
  const files = [];
  // RU главная
  const ruMain = path.join(FRONTEND_DIR, 'main.html');
  if (fs.existsSync(ruMain)) files.push({ lang:'ru', file: ruMain, url:`${BASE_HOST}/` });
  // index.html во всех локалях
  for (const code of langCodes) {
    const f = path.join(FRONTEND_DIR, code, 'index.html');
    if (fs.existsSync(f)) files.push({ lang: code, file: f, url: `${BASE_HOST}/frontend/${code}/` });
  }
  return files;
}

function buildHreflangBlock(pages){
  const lines = [];
  // ru и x-default
  const ruUrl = pages.find(p=>p.lang==='ru')?.url || `${BASE_HOST}/`;
  lines.push(`<link rel="alternate" href="${ruUrl}" hreflang="ru" />`);
  for (const p of pages.filter(p=>p.lang!=='ru')){
    const code = p.lang === 'pt-br' ? 'pt-BR' : p.lang === 'pt-pt' ? 'pt-PT' : p.lang;
    lines.push(`<link rel="alternate" href="${p.url}" hreflang="${code}" />`);
  }
  lines.push(`<link rel="alternate" href="${ruUrl}" hreflang="x-default" />`);
  return lines.join('\n');
}

function upsertAfterHead(content, block){
  const head = content.match(/<head\b[^>]*>/i);
  if (!head) return content;
  // Удалим старые rel=alternate, чтобы не дублировать
  let updated = content.replace(/\n?\s*<link[^>]*rel=["']alternate["'][^>]*>\s*/ig,'\n');
  return updated.replace(head[0], head[0] + '\n' + block + '\n');
}

function main(){
  const langs = loadLangs();
  const pages = collectIndexCandidates(langs);
  const block = buildHreflangBlock(pages);
  let changed = 0;
  for (const p of pages){
    const src = readText(p.file);
    if (!src) continue;
    const next = upsertAfterHead(src, block);
    if (next !== src){ writeText(p.file, next); changed++; }
  }
  console.log(`hreflang сгенерирован для ${changed} страниц`);
}

try { main(); } catch(e){ console.error('Ошибка генерации hreflang:', e.message); process.exit(1); }

