import fs from 'node:fs';
import path from 'node:path';
import { LOCALES, TRANSLATIONS } from './minesweeper-i18n-translations.mjs';

const root = process.cwd();
const targetFile = path.join(root, 'assembly', 'site', '_data', 'gameMinesweeperTranslations.json');

const KEYS = [
  'pageTitle', 'metaDescription', 'ogTitle', 'ogDescription', 'twitterDescription',
  'mainTitle', 'gamesAlt', 'boardAria', 'hint',
  'minesLabel', 'timeLabel', 'bestLabel', 'timeSuffix', 'noRecord',
  'btnStart', 'btnReset',
  'howToTitle', 'instructionsDesktop', 'instructionsMobile', 'gotIt',
  'winMessage', 'loseMessage', 'continueAd',
];

function validate() {
  for (const locale of LOCALES) {
    const block = TRANSLATIONS[locale]?.gameMinesweeper;
    if (!block) throw new Error(`[${locale}] missing gameMinesweeper`);
    for (const key of KEYS) {
      if (!block[key]) throw new Error(`[${locale}] missing gameMinesweeper.${key}`);
    }
  }
}

validate();

const data = {};
for (const locale of LOCALES) {
  data[locale] = { gameMinesweeper: { ...TRANSLATIONS[locale].gameMinesweeper } };
}

fs.writeFileSync(targetFile, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Wrote ${targetFile} (${LOCALES.length} locales, ${KEYS.length} keys each)`);
