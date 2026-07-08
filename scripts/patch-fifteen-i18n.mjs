import fs from 'node:fs';
import path from 'node:path';
import { LOCALES, TRANSLATIONS } from './fifteen-i18n-translations.mjs';

const targetFile = path.join(process.cwd(), 'assembly', 'site', '_data', 'gameFifteenTranslations.json');

const KEYS = [
  'pageTitle', 'metaDescription', 'ogTitle', 'ogDescription', 'twitterDescription',
  'mainTitle', 'gamesAlt', 'boardAria', 'hint',
  'movesLabel', 'timeLabel', 'bestLabel', 'timeSuffix',
  'btnNewGame', 'btnReset', 'solvedTitle', 'solvedText',
  'howToTitle', 'instructionsDesktop', 'instructionsMobile', 'gotIt', 'continueAd',
];

for (const locale of LOCALES) {
  const block = TRANSLATIONS[locale]?.gameFifteen;
  if (!block) throw new Error(`[${locale}] missing gameFifteen`);
  for (const key of KEYS) {
    if (!block[key]) throw new Error(`[${locale}] missing gameFifteen.${key}`);
  }
}

const data = {};
for (const locale of LOCALES) {
  data[locale] = { gameFifteen: { ...TRANSLATIONS[locale].gameFifteen } };
}

fs.writeFileSync(targetFile, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Wrote ${targetFile} (${LOCALES.length} locales, ${KEYS.length} keys each)`);
