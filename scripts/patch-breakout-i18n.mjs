import fs from 'node:fs';
import path from 'node:path';
import { LOCALES, TRANSLATIONS } from './breakout-i18n-translations.mjs';

const targetFile = path.join(process.cwd(), 'assembly', 'site', '_data', 'gameBreakoutTranslations.json');
const KEYS = [
  'pageTitle', 'metaDescription', 'ogTitle', 'ogDescription', 'twitterDescription',
  'mainTitle', 'gamesAlt', 'canvasAria', 'hint',
  'scoreLabel', 'livesLabel', 'bestLabel', 'btnStart', 'btnReset',
  'gameOver', 'winMessage', 'pressRToRestart',
  'howToTitle', 'instructionsDesktop', 'instructionsMobile', 'gotIt', 'continueAd',
];

for (const locale of LOCALES) {
  const block = TRANSLATIONS[locale]?.gameBreakout;
  if (!block) throw new Error(`[${locale}] missing gameBreakout`);
  for (const key of KEYS) if (!block[key]) throw new Error(`[${locale}] missing ${key}`);
}

const data = Object.fromEntries(LOCALES.map((locale) => [locale, { gameBreakout: { ...TRANSLATIONS[locale].gameBreakout } }]));
fs.writeFileSync(targetFile, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Wrote ${targetFile} (${LOCALES.length} locales)`);
