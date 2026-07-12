import fs from 'node:fs';
import path from 'node:path';
import { LOCALES, TRANSLATIONS } from './rat-i18n-translations.mjs';

const targetFile = path.join(process.cwd(), 'assembly', 'site', '_data', 'gameRatTranslations.json');
const KEYS = [
  'pageTitle', 'eatenLabel', 'weightLabel', 'bestLabel',
  'overlayLine1', 'overlayLine2', 'bonusFoodLabel', 'overlayLine3', 'overlayGoal',
  'startBtn', 'hint', 'gameOverTitle',
];

for (const locale of LOCALES) {
  const block = TRANSLATIONS[locale]?.gameRat;
  if (!block) throw new Error(`[${locale}] missing gameRat`);
  for (const key of KEYS) if (!block[key]) throw new Error(`[${locale}] missing ${key}`);
}

const data = Object.fromEntries(LOCALES.map((locale) => [locale, { gameRat: { ...TRANSLATIONS[locale].gameRat } }]));
fs.writeFileSync(targetFile, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Wrote ${targetFile} (${LOCALES.length} locales)`);
