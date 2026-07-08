import fs from 'node:fs';
import path from 'node:path';
import { LOCALES, TRANSLATIONS } from './coins-i18n-translations.mjs';

const targetFile = path.join(process.cwd(), 'assembly', 'site', '_data', 'gameCoinsTranslations.json');
const KEYS = [
  'pageTitle', 'metaDescription', 'ogTitle', 'ogDescription', 'twitterDescription',
  'mainTitle', 'gamesAlt', 'canvasAria', 'hint',
  'coinsLabel', 'timeLabel', 'bestLabel', 'timeSuffix',
  'btnStart', 'btnReset', 'gameOver', 'pressRToRestart',
  'howToTitle', 'instructionsDesktop', 'instructionsMobile', 'gotIt', 'continueAd',
];

for (const locale of LOCALES) {
  const block = TRANSLATIONS[locale]?.gameCoins;
  if (!block) throw new Error(`[${locale}] missing gameCoins`);
  for (const key of KEYS) if (!block[key]) throw new Error(`[${locale}] missing ${key}`);
}

const data = Object.fromEntries(LOCALES.map((locale) => [locale, { gameCoins: { ...TRANSLATIONS[locale].gameCoins } }]));
fs.writeFileSync(targetFile, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Wrote ${targetFile} (${LOCALES.length} locales)`);
