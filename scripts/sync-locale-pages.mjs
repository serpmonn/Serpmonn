#!/usr/bin/env node
// Аудит и создание недостающих страниц локалей на основе RU-версий для news/tools/games
import fs from 'node:fs';
import path from 'node:path';

const FRONTEND_DIR = path.join(process.cwd(), 'frontend');
const LANGS_FILE = path.join(FRONTEND_DIR, 'i18n', 'languages.json');
const SECTIONS = ['news', 'tools', 'games'];
const BASE = 'https://www.serpmonn.ru';

function read(file){ try { return fs.readFileSync(file, 'utf8'); } catch { return null; } }
function write(file, txt){ fs.writeFileSync(file, txt, 'utf8'); }

function loadLangs(){
  const raw = read(LANGS_FILE);
  if (!raw) throw new Error('languages.json не найден');
  const arr = JSON.parse(raw);
  const codes = arr.map(x=>x.code);
  const rtl = new Map(arr.map(x => [x.code, Boolean(x.rtl)]));
  return { codes, rtl };
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

function upsertAttr(htmlOpenTag, name, value){
  const re = new RegExp(`(\\s${name}=\")[^\"]*(\")`, 'i');
  if (re.test(htmlOpenTag)) return htmlOpenTag.replace(re, `$1${value}$2`);
  return htmlOpenTag.replace(/>$/, ` ${name}=\"${value}\">`);
}

function normalizeContentForLang(src, lang, isRtl, targetUrl){
  // <html ...> lang/dir
  const m = src.match(/<html\b[^>]*>/i);
  if (m){
    const orig = m[0];
    let upd = orig;
    upd = upsertAttr(upd, 'lang', lang);
    upd = upsertAttr(upd, 'dir', isRtl ? 'rtl' : 'ltr');
    src = src.replace(orig, upd);
  }
  // <meta http-equiv="Content-Language">
  if (/<head\b[^>]*>/i.test(src)){
    if (!/<meta[^>]*http-equiv=["']Content-Language["'][^>]*>/i.test(src)){
      src = src.replace(/<head\b[^>]*>/i, match => match + `\n<meta http-equiv=\"Content-Language\" content=\"${lang}\">`);
    } else {
      src = src.replace(/(<meta[^>]*http-equiv=["']Content-Language["'][^>]*content=")[^"]*("[^>]*>)/i, `$1${lang}$2`);
    }
  }
  // Обновить og:url
  if (targetUrl){
    if (/<meta\s+property=["']og:url["'][^>]*>/i.test(src)){
      src = src.replace(/(<meta\s+property=["']og:url["'][^>]*content=")[^"]*("[^>]*>)/i, `$1${targetUrl}$2`);
    } else if (/<head\b[^>]*>/i.test(src)){
      src = src.replace(/<head\b[^>]*>/i, match => match + `\n<meta property=\"og:url\" content=\"${targetUrl}\" />`);
    }
    // Обновить canonical
    if (/<link\s+rel=["']canonical["'][^>]*>/i.test(src)){
      src = src.replace(/(<link\s+rel=["']canonical["'][^>]*href=")[^"]*("[^>]*>)/i, `$1${targetUrl}$2`);
    } else if (/<head\b[^>]*>/i.test(src)){
      src = src.replace(/<head\b[^>]*>/i, match => match + `\n<link rel=\"canonical\" href=\"${targetUrl}\">`);
    }
  }
  return src;
}

function toHreflangCode(lang){
  if (lang === 'pt-br') return 'pt-BR';
  if (lang === 'pt-pt') return 'pt-PT';
  return lang;
}

function main(){
  const { codes, rtl } = loadLangs();
  const ruBases = [];
  for (const section of SECTIONS){
    const dir = path.join(FRONTEND_DIR, section);
    if (fs.existsSync(dir)){
      for (const file of walk(dir)){
        ruBases.push(file);
      }
    }
  }
  let created = 0;
  const report = [];
  for (const ruFile of ruBases){
    const relFromFrontend = path.relative(FRONTEND_DIR, ruFile).replace(/\\/g,'/'); // e.g. tools/logistics/x.html
    for (const code of codes){
      if (code === 'ru') continue; // RU — базовая
      const target = path.join(FRONTEND_DIR, code, relFromFrontend);
      if (fs.existsSync(target)) continue;
      // Создаём директорию
      fs.mkdirSync(path.dirname(target), { recursive: true });
      const src = read(ruFile);
      if (!src) continue;
      const targetUrl = `${BASE}/frontend/${code}/${relFromFrontend}`;
      const prepared = normalizeContentForLang(src, toHreflangCode(code), Boolean(rtl.get(code)), targetUrl);
      write(target, prepared);
      created += 1;
      report.push(`${code}: ${relFromFrontend}`);
    }
  }
  console.log(`Найдено RU-страниц: ${ruBases.length}`);
  console.log(`Создано новых страниц: ${created}`);
  if (report.length){
    console.log('Созданные страницы (первые 50):');
    for (const r of report.slice(0,50)) console.log('- ' + r);
    if (report.length > 50) console.log(`... и ещё ${report.length-50}`);
  }
}

try { main(); } catch (e) { console.error('Ошибка:', e.message); process.exit(1); }

