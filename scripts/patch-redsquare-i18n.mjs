import fs from 'node:fs';
import path from 'node:path';
import { LOCALES, TRANSLATIONS } from './redsquare-i18n-translations.mjs';

const targetFile = path.join(process.cwd(), 'assembly', 'site', '_data', 'gameRedsquareTranslations.json');
const KEYS = [
  'pageTitle', 'metaDescription', 'ogTitle', 'ogDescription', 'twitterDescription',
  'instructionTitle', 'inst1', 'inst2', 'inst3', 'inst4', 'inst5', 'understandBtn',
  'scorePrefix', 'pause', 'resume', 'startGame', 'restart', 'home',
  'allLevelsComplete', 'modalYourScore', 'modalBestResult', 'modalOk',
];

for (const locale of LOCALES) {
  const block = TRANSLATIONS[locale]?.gameRedsquare;
  if (!block) throw new Error(`[${locale}] missing gameRedsquare`);
  for (const key of KEYS) if (!block[key]) throw new Error(`[${locale}] missing ${key}`);
}

const data = Object.fromEntries(LOCALES.map((locale) => [locale, { gameRedsquare: { ...TRANSLATIONS[locale].gameRedsquare } }]));
fs.writeFileSync(targetFile, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Wrote ${targetFile} (${LOCALES.length} locales)`);
