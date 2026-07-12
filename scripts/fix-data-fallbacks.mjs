#!/usr/bin/env node
/**
 * Fix pt-pt (EU Portuguese from pt-br) and replace en-identical locale blocks with fallback donors.
 */
import fs from 'fs';
import path from 'path';
import { brToPtPt, resolveDonor } from './pt-pt-eu.mjs';

const dataDir = '/var/www/serpmonn.ru/assembly/site/_data';
const skip = new Set(['locales.json', 'rtlLocales.json']);
const files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.json') && !skip.has(f));

let ptPtFixed = 0;
let enFallbackFixed = 0;

for (const file of files) {
  const filePath = path.join(dataDir, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let changed = false;

  if (data['pt-br']) {
    const next = brToPtPt(structuredClone(data['pt-br']));
    if (!data['pt-pt'] || JSON.stringify(data['pt-pt']) !== JSON.stringify(next)) {
      data['pt-pt'] = next;
      ptPtFixed++;
      changed = true;
    }
  }

  if (data.en) {
    const enBlock = data.en;
    for (const locale of Object.keys(data)) {
      if (locale === 'en' || locale === 'ru') continue;
      if (JSON.stringify(data[locale]) !== JSON.stringify(enBlock)) continue;
      const donor = resolveDonor(data, locale, enBlock);
      if (donor) {
        data[locale] = locale === 'pt-pt' ? brToPtPt(donor) : donor;
        enFallbackFixed++;
        changed = true;
      }
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
  }
}

console.log(`pt-pt updated in ${ptPtFixed} files`);
console.log(`en-fallback replaced in ${enFallbackFixed} locale blocks`);
