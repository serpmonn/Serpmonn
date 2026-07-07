import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const i18nDir = path.join(root, 'shared', 'i18n');
const baseFile = path.join(i18nDir, 'en.base.json');

const localesFile = path.join(root, 'assembly', 'site', '_data', 'locales.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

if (!fs.existsSync(localesFile)) {
  console.error(`Missing locales file: ${localesFile}`);
  process.exit(1);
}

const locales = readJson(localesFile);

function extractPlaceholders(value) {
  return [...value.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map(m => m[1]).sort();
}

const base = readJson(baseFile);
let hasErrors = false;

for (const locale of locales) {
  const filePath = path.join(i18nDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) continue;

  const data = readJson(filePath);

  for (const [key, translatedValue] of Object.entries(data)) {
    if (typeof translatedValue !== 'string') continue;
    if (!(key in base)) continue;

    const baseVars = extractPlaceholders(base[key]);
    const localeVars = extractPlaceholders(translatedValue);

    if (baseVars.join('|') !== localeVars.join('|')) {
      console.error(
        `[${locale}] placeholder mismatch in "${key}": base=[${baseVars.join(', ')}], locale=[${localeVars.join(', ')}]`
      );
      hasErrors = true;
    }
  }
}

if (hasErrors) {
  process.exit(1);
}

console.log('Placeholder validation finished.');