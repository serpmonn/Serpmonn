import fs from 'node:fs';
import path from 'node:path';
import { LOCALES, TRANSLATIONS } from './flappy-i18n-translations.mjs';

const targetFile = path.join(process.cwd(), 'assembly', 'site', '_data', 'gameFlappyTranslations.json');

const KEYS = [
  'pageTitle', 'metaDescription', 'ogTitle', 'ogDescription', 'twitterDescription',
  'mainTitle', 'gamesAlt', 'canvasAria', 'hint',
  'scoreLabel', 'bestLabel', 'btnStart', 'btnReset',
  'welcomeTitle', 'welcomeLine1', 'welcomeLine2', 'welcomeLine3', 'yourBest',
  'gameOver', 'yourScore', 'newRecord', 'restartLine1', 'restartLine2', 'restartLine3',
  'howToTitle', 'instructionsMobileHtml', 'instructionsDesktopHtml', 'startPlaying', 'dontShowAgain',
  'adTitle', 'continueAd', 'recordNotificationHtml',
];

for (const locale of LOCALES) {
  const block = TRANSLATIONS[locale]?.gameFlappy;
  if (!block) throw new Error(`[${locale}] missing gameFlappy`);
  for (const key of KEYS) {
    if (!block[key]) throw new Error(`[${locale}] missing gameFlappy.${key}`);
  }
  if (!Array.isArray(block.motivationalMessages) || block.motivationalMessages.length < 8) {
    throw new Error(`[${locale}] motivationalMessages must have 8 items`);
  }
}

const data = {};
for (const locale of LOCALES) {
  data[locale] = { gameFlappy: { ...TRANSLATIONS[locale].gameFlappy } };
}

fs.writeFileSync(targetFile, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Wrote ${targetFile} (${LOCALES.length} locales)`);
