#!/usr/bin/env node
// Синхронизация общих подключений CSS/JS из актуальной версии во все локали
import fs from 'node:fs';
import path from 'node:path';

const FRONTEND_DIR = path.join(process.cwd(), 'frontend');

function read(file){ try { return fs.readFileSync(file,'utf8'); } catch { return null; } }
function write(file, txt){ fs.writeFileSync(file, txt, 'utf8'); }

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

function ensureInHead(content, snippet){
  const headMatch = content.match(/<head\b[^>]*>/i);
  if (!headMatch) return content;
  if (content.includes(snippet)) return content; // уже есть
  return content.replace(headMatch[0], headMatch[0] + '\n' + snippet);
}

function ensureBeforeBodyEnd(content, snippet){
  if (content.includes(snippet)) return content;
  return content.replace(/<\/body>/i, snippet + '\n</body>');
}

function dedupe(content, pattern){
  const matches = content.match(new RegExp(pattern,'ig')) || [];
  if (matches.length <= 1) return content;
  // оставить одно вхождение (первое), остальные удалить
  let seen = false;
  return content.replace(new RegExp(pattern,'ig'), (m) => {
    if (seen) return '';
    seen = true;
    return m;
  });
}

function replaceOutdatedIncludes(content){
  // Разные варианты старых путей для loader'а меню
  content = content.replace(/\/<script[^>]*src=["'][^"']*menuLoader\.js[^>]*><\/script>/ig,
                            '<script type="module" src="/frontend/scripts/menu-loader.js" defer></script>');
  content = content.replace(/\/<script[^>]*src=["'][^"']*menu_loader\.js[^>]*><\/script>/ig,
                            '<script type="module" src="/frontend/scripts/menu-loader.js" defer></script>');
  content = content.replace(/\/<script[^>]*src=["'][^"']*menu-loader-old\.js[^>]*><\/script>/ig,
                            '<script type="module" src="/frontend/scripts/menu-loader.js" defer></script>');
  return content;
}

function syncFile(file){
  let src = read(file);
  if (!src) return false;

  const before = src;

  // 1) Заменить устаревшие подключения на актуальный loader
  src = replaceOutdatedIncludes(src);

  // 2) Гарантировать наличие базового CSS
  src = ensureInHead(src, '<link rel="stylesheet" href="/frontend/styles/styles.css">');

  // 3) Гарантировать наличие menu-loader.js (type=module, defer)
  src = ensureInHead(src, '<script type="module" src="/frontend/scripts/menu-loader.js" defer></script>');

  // 4) Гарантировать наличие mobile-enhancements.js перед </body>
  src = ensureBeforeBodyEnd(src, '    <script src="/frontend/scripts/mobile-enhancements.js" defer></script>');

  // 5) Дедупликация повторов
  src = dedupe(src, '<link\\s+rel=\\"stylesheet\\"\\s+href=\\"/frontend/styles/styles\\.css\\">');
  src = dedupe(src, '<script[^>]*menu-loader\\.js[^>]*><\\/script>');
  src = dedupe(src, '<script[^>]*mobile-enhancements\\.js[^>]*><\\/script>');

  if (src !== before){
    write(file, src);
    return true;
  }
  return false;
}

function main(){
  const files = walk(FRONTEND_DIR);
  let changed = 0;
  for (const f of files){
    // Пропустим шаблоны меню, там свой набор стилей
    if (/\/menu\.html$/i.test(f)) continue;
    if (syncFile(f)) changed += 1;
  }
  console.log(`Обработано файлов: ${files.length}`);
  console.log(`Изменено файлов: ${changed}`);
}

try { main(); } catch (e) { console.error('Ошибка:', e.message); process.exit(1); }

