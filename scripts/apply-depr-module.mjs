#!/usr/bin/env node
// Заменяет инлайновый скрипт на подключение общего модуля калькулятора во всех локалях
import fs from 'node:fs';
import path from 'node:path';

const FRONTEND_DIR = path.join(process.cwd(), 'frontend');

function read(f){ try { return fs.readFileSync(f,'utf8'); } catch { return null; } }
function write(f, s){ fs.writeFileSync(f, s, 'utf8'); }

function walk(dir){ const out=[]; const st=[dir]; while(st.length){ const cur=st.pop(); let s; try{s=fs.statSync(cur);}catch{continue;} if(s.isDirectory()){ for(const e of fs.readdirSync(cur)){ if(e.startsWith('.')) continue; st.push(path.join(cur,e)); } } else if(s.isFile() && cur.endsWith('depreciation-calculator.html')) out.push(cur); } return out; }

function processFile(file){
  let src = read(file); if (!src) return false;
  const before = src;
  // Удалить большой инлайновый <script> с логикой (между <script> и </script> перед mobile-enhancements)
  src = src.replace(/\n\s*<script>([\s\S]*?)<\/script>\s*\n\s*<script src=\"\/frontend\/scripts\/mobile-enhancements\.js\" defer><\/script>/i,
    '\n    <script type="module" src="/frontend/scripts/tools/depreciation-calculator.js" defer></script>\n      <script src="/frontend/scripts/mobile-enhancements.js" defer></script>');
  // Если модуль не вставился, принудительно добавить перед закрывающим body
  if (!/tools\/depreciation-calculator\.js/.test(src)){
    src = src.replace(/<\/body>/i, '    <script type="module" src="/frontend/scripts/tools/depreciation-calculator.js" defer></script>\n      <script src="/frontend/scripts/mobile-enhancements.js" defer></script>\n</body>');
  }
  if (src !== before){ write(file, src); return true; }
  return false;
}

function main(){
  const files = walk(FRONTEND_DIR);
  let changed = 0;
  for (const f of files){ if (processFile(f)) changed++; }
  console.log(`Обработано файлов калькулятора: ${files.length}`);
  console.log(`Изменено файлов: ${changed}`);
}

try { main(); } catch (e) { console.error('Ошибка:', e.message); process.exit(1); }

