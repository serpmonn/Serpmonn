import fs from 'node:fs';
import path from 'node:path';
import { TRANSLATIONS } from './depreciation-i18n-translations.mjs';

const root = process.cwd();
const localesFile = path.join(root, 'assembly', 'site', '_data', 'locales.json');
const i18nDir = path.join(root, 'shared', 'i18n');
const baseFile = path.join(i18nDir, 'en.base.json');
const PREFIX = 'depreciation.';

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    throw new Error(`${filePath}: ${err.message}`);
  }
}

function writeSortedJson(filePath, data) {
  const sorted = {};
  for (const key of Object.keys(data).sort()) {
    sorted[key] = data[key];
  }
  fs.writeFileSync(filePath, `${JSON.stringify(sorted, null, 2)}\n`, 'utf8');
}

if (!fs.existsSync(localesFile)) {
  console.error(`Missing locales file: ${localesFile}`);
  process.exit(1);
}

if (!fs.existsSync(baseFile)) {
  console.error(`Missing base i18n file: ${baseFile}`);
  process.exit(1);
}

const base = readJson(baseFile);
const SHORT_KEYS = Object.keys(base)
  .filter((key) => key.startsWith(PREFIX))
  .map((key) => key.slice(PREFIX.length))
  .sort();

if (SHORT_KEYS.length === 0) {
  console.error(`No keys with prefix "${PREFIX}" found in ${baseFile}`);
  process.exit(1);
}

const locales = readJson(localesFile);

const missingLocales = locales.filter((locale) => !TRANSLATIONS[locale]);
if (missingLocales.length > 0) {
  console.error(`Missing translations for locales: ${missingLocales.join(', ')}`);
  process.exit(1);
}

const extraLocales = Object.keys(TRANSLATIONS).filter((locale) => !locales.includes(locale));
if (extraLocales.length > 0) {
  console.error(`Translations exist for unknown locales: ${extraLocales.join(', ')}`);
  process.exit(1);
}

for (const locale of locales) {
  for (const key of SHORT_KEYS) {
    if (!TRANSLATIONS[locale][key]) {
      console.error(`[${locale}] missing key: ${key}`);
      process.exit(1);
    }
  }
}

for (const key of SHORT_KEYS) {
  const expected = base[`${PREFIX}${key}`];
  const actual = TRANSLATIONS.en[key];
  if (expected !== actual) {
    console.error(`[en] mismatch for key "${key}": en.base.json and TRANSLATIONS.en differ`);
    process.exit(1);
  }
}

let patchedCount = 0;

for (const locale of locales) {
  if (locale === 'en') {
    console.log('[en] Skipped i18n patch (keys in en.base.json)');
    continue;
  }

  const filePath = path.join(i18nDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) {
    console.error(`Missing i18n file: ${filePath}`);
    process.exit(1);
  }

  const data = readJson(filePath);
  for (const key of SHORT_KEYS) {
    data[`${PREFIX}${key}`] = TRANSLATIONS[locale][key];
  }
  writeSortedJson(filePath, data);
  patchedCount++;
  console.log(`[${locale}] Patched ${SHORT_KEYS.length} depreciation keys`);
}

console.log('\nSummary:');
console.log(`- Short keys: ${SHORT_KEYS.length}`);
console.log(`- Locales patched: ${patchedCount}`);
console.log(`- Locales skipped (en): 1`);
console.log(`- Locales covered: ${locales.join(', ')}`);
