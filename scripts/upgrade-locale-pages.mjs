#!/usr/bin/env node
// Обновление существующих локализованных страниц структурой из RU-версии, с сохранением ключевых переводов (<title>, description, первый <h1>)
import fs from 'node:fs';
import path from 'node:path';

const FRONTEND_DIR = path.join(process.cwd(), 'frontend');
const LANGS_FILE = path.join(FRONTEND_DIR, 'i18n', 'languages.json');
// По умолчанию обновляем функциональные разделы
const SECTIONS = ['tools', 'games'];
const BASE = 'https://www.serpmonn.ru';

function read(file){ try { return fs.readFileSync(file, 'utf8'); } catch { return null; } }
function write(file, txt){ fs.writeFileSync(file, txt, 'utf8'); }

function loadLangs(){
  const raw = read(LANGS_FILE);
  if (!raw) throw new Error('languages.json не найден');
  const arr = JSON.parse(raw);
  return { codes: arr.map(x=>x.code), rtl: new Map(arr.map(x=>[x.code, Boolean(x.rtl)])) };
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

function extractTitle(src){
  const m = src.match(/<title>([\s\S]*?)<\/title>/i);
  return m ? m[1] : null;
}
function setTitle(src, title){
  if (!title) return src;
  if (/<title>[\s\S]*?<\/title>/i.test(src)) return src.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}<\/title>`);
  return src;
}
function extractMetaDescription(src){
  const m = src.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["'][^>]*>/i);
  return m ? m[1] : null;
}
function setMetaDescription(src, desc){
  if (!desc) return src;
  if (/<meta\s+name=["']description["'][^>]*>/i.test(src)) {
    return src.replace(/(<meta\s+name=["']description["']\s+content=")[^"]*("[^>]*>)/i, `$1${desc}$2`);
  }
  return src;
}
function extractFirstH1(src){
  const m = src.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
  return m ? m[1] : null;
}
function setFirstH1(src, h1){
  if (!h1) return src;
  if (/<h1\b[^>]*>[\s\S]*?<\/h1>/i.test(src)) return src.replace(/(<h1\b[^>]*>)[\s\S]*?(<\/h1>)/i, `$1${h1}$2`);
  return src;
}

function toHreflangCode(lang){
  if (lang === 'pt-br') return 'pt-BR';
  if (lang === 'pt-pt') return 'pt-PT';
  return lang;
}

function normalizeForLang(ruContent, lang, isRtl, targetUrl){
  let src = ruContent;
  const m = src.match(/<html\b[^>]*>/i);
  if (m){
    const orig = m[0];
    let upd = orig;
    upd = upsertAttr(upd, 'lang', toHreflangCode(lang));
    upd = upsertAttr(upd, 'dir', isRtl ? 'rtl' : 'ltr');
    src = src.replace(orig, upd);
  }
  // Content-Language
  if (/<head\b[^>]*>/i.test(src)){
    if (!/<meta[^>]*http-equiv=["']Content-Language["'][^>]*>/i.test(src)){
      src = src.replace(/<head\b[^>]*>/i, match => match + `\n<meta http-equiv=\"Content-Language\" content=\"${toHreflangCode(lang)}\">`);
    } else {
      src = src.replace(/(<meta[^>]*http-equiv=["']Content-Language["'][^>]*content=")[^"]*("[^>]*>)/i, `$1${toHreflangCode(lang)}$2`);
    }
  }
  // canonical/og:url
  if (targetUrl){
    if (/<meta\s+property=["']og:url["'][^>]*>/i.test(src)){
      src = src.replace(/(<meta\s+property=["']og:url["'][^>]*content=")[^"]*("[^>]*>)/i, `$1${targetUrl}$2`);
    } else if (/<head\b[^>]*>/i.test(src)){
      src = src.replace(/<head\b[^>]*>/i, match => match + `\n<meta property=\"og:url\" content=\"${targetUrl}\" />`);
    }
    if (/<link\s+rel=["']canonical["'][^>]*>/i.test(src)){
      src = src.replace(/(<link\s+rel=["']canonical["'][^>]*href=")[^"]*("[^>]*>)/i, `$1${targetUrl}$2`);
    } else if (/<head\b[^>]*>/i.test(src)){
      src = src.replace(/<head\b[^>]*>/i, match => match + `\n<link rel=\"canonical\" href=\"${targetUrl}\">`);
    }
  }
  return src;
}

function main(){
  const { codes, rtl } = loadLangs();
  let upgraded = 0;
  const ruFiles = [];
  for (const section of SECTIONS){
    const dir = path.join(FRONTEND_DIR, section);
    if (!fs.existsSync(dir)) continue;
    for (const file of walk(dir)){
      ruFiles.push(file);
    }
  }
  for (const ruFile of ruFiles){
    const rel = path.relative(FRONTEND_DIR, ruFile).replace(/\\/g,'/'); // e.g. tools/logistics/...
    const ruContent = read(ruFile);
    if (!ruContent) continue;
    const ruTitle = extractTitle(ruContent);
    for (const code of codes){
      if (code === 'ru') continue;
      const targetPath = path.join(FRONTEND_DIR, code, rel);
      if (!fs.existsSync(targetPath)) continue; // пропустим — для отсутствующих есть другой скрипт
      const old = read(targetPath) || '';
      const oldTitle = extractTitle(old);
      const oldDesc = extractMetaDescription(old);
      const oldH1 = extractFirstH1(old);
      const url = `${BASE}/frontend/${code}/${rel}`;
      let next = normalizeForLang(ruContent, code, Boolean(rtl.get(code)), url);
      // Восстановим переводы, если они были
      next = setTitle(next, oldTitle || ruTitle);
      next = setMetaDescription(next, oldDesc);
      next = setFirstH1(next, oldH1);
      if (next !== old){
        write(targetPath, next);
        upgraded += 1;
      }
    }
  }
  console.log(`Обновлено локализованных страниц по структуре RU: ${upgraded}`);
}

try { main(); } catch (e) { console.error('Ошибка:', e.message); process.exit(1); }

