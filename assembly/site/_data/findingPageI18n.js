const fs = require('node:fs');
const path = require('node:path');

const dataDir = __dirname;
const root = path.join(dataDir, '../../..');

const i18nDir = path.join(root, 'shared', 'i18n');
const baseFile = path.join(i18nDir, 'en.base.json');
const localesFile = path.join(dataDir, 'locales.json');

const PAGE_KEYS = [
  'finding.saveLabel',
  'finding.feedTitle',
  'finding.pageTitle',
  'finding.myFindingsTitle',
  'finding.inboxTitle',
  'finding.noFindings',
];

const base = JSON.parse(fs.readFileSync(baseFile, 'utf8'));
const locales = JSON.parse(fs.readFileSync(localesFile, 'utf8'));
const out = {};

for (const locale of locales) {
  const filePath = path.join(i18nDir, `${locale}.json`);
  let data = {};
  try {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    data = {};
  }

  out[locale] = {};
  for (const key of PAGE_KEYS) {
    const short = key.replace(/^finding\./, '');
    out[locale][short] = data[key] || base[key] || '';
  }
}

module.exports = out;
