import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const i18nDir = path.join(root, 'shared', 'i18n');
const baseFile = path.join(i18nDir, 'en.base.json');
const localesFile = path.join(root, 'assembly', 'site', '_data', 'locales.json');

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    throw new Error(`${filePath}: ${err.message}`);
  }
}

if (!fs.existsSync(localesFile)) {
  console.error(`Missing locales file: ${localesFile}`);
  process.exit(1);
}

const locales = readJson(localesFile);

if (!fs.existsSync(baseFile)) {
  console.error(`Missing base file: ${baseFile}`);
  process.exit(1);
}

const base = readJson(baseFile);
const baseKeys = Object.keys(base).sort();
let hasErrors = false;

for (const key of baseKeys) {
  if (typeof base[key] !== 'string') {
    console.error(`[base] key "${key}" must be a string`);
    hasErrors = true;
  }
}

for (const locale of locales) {
  const filePath = path.join(i18nDir, `${locale}.json`);

  if (!fs.existsSync(filePath)) {
    console.error(`[${locale}] missing file: ${filePath}`);
    hasErrors = true;
    continue;
  }

  let data;
  try {
    data = readJson(filePath);
  } catch (err) {
    console.error(`[${locale}] invalid JSON: ${err.message}`);
    hasErrors = true;
    continue;
  }

  if (data === null || Array.isArray(data) || typeof data !== 'object') {
    console.error(`[${locale}] file must contain a JSON object`);
    hasErrors = true;
    continue;
  }

  const localeKeys = Object.keys(data).sort();
  const extraKeys = localeKeys.filter(k => !baseKeys.includes(k));
  const missingKeys = baseKeys.filter(k => !localeKeys.includes(k));

  for (const key of extraKeys) {
    console.error(`[${locale}] extra key not in base: "${key}"`);
    hasErrors = true;
  }

  for (const key of localeKeys) {
    if (typeof data[key] !== 'string') {
      console.error(`[${locale}] key "${key}" must be a string`);
      hasErrors = true;
    }
  }

  if (locale === 'en') {
    console.log('[en] OK (uses en.base.json)');
    continue;
  }

  if (missingKeys.length > 0) {
    console.error(`[${locale}] missing ${missingKeys.length} keys`);
    for (const key of missingKeys) {
      console.error(`  - ${key}`);
    }
    hasErrors = true;
  } else {
    console.log(`[${locale}] OK`);
  }
}

if (hasErrors) {
  process.exit(1);
}

console.log('Locale validation finished.');