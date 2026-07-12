#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { brToPtPt } from './pt-pt-eu.mjs';

const scriptsDir = '/var/www/serpmonn.ru/scripts';
const files = fs.readdirSync(scriptsDir).filter((f) => f.endsWith('-i18n-translations.mjs'));

for (const file of files) {
  const mod = await import(path.join(scriptsDir, file));
  if (!mod.TRANSLATIONS?.['pt-br'] || !mod.TRANSLATIONS?.['pt-pt']) continue;
  mod.TRANSLATIONS['pt-pt'] = brToPtPt(structuredClone(mod.TRANSLATIONS['pt-br']));
  const out = `export const LOCALES = ${JSON.stringify(mod.LOCALES)};\n\nexport const TRANSLATIONS = ${JSON.stringify(mod.TRANSLATIONS, null, 2)};\n`;
  fs.writeFileSync(path.join(scriptsDir, file), out);
  console.log(`Fixed pt-pt in ${file}`);
}
