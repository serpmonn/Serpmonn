import fs from 'node:fs';
import path from 'node:path';
import { LOCALES, TRANSLATIONS } from './redsquare2-i18n-translations.mjs';

const targetFile = path.join(process.cwd(), 'assembly', 'site', '_data', 'gameRedsquare2Translations.json');
const KEYS = [
  'pageTitle', 'metaDescription', 'ogTitle', 'ogDescription', 'twitterTitle', 'twitterDescription',
  'instructionTitle', 'instControl', 'instControlText', 'instGoal', 'instGoalText',
  'instScoring', 'instScoringText', 'instMisses', 'instMissesText', 'instEnd', 'instEndText',
  'instLeaderboard', 'instLeaderboardText', 'instPause', 'instPauseText', 'understandBtn',
  'scorePrefix', 'missedPrefix', 'pause', 'resume', 'restart', 'leaderboardBtn',
  'nicknamePlaceholder', 'nicknameSubmit', 'bannedNicknameAlert',
  'scoreTableTitle', 'scoreTableMetaDescription', 'scoreTableColRank', 'scoreTableColNickname', 'scoreTableColScore',
];

for (const locale of LOCALES) {
  const block = TRANSLATIONS[locale]?.gameRedsquare2;
  if (!block) throw new Error(`[${locale}] missing gameRedsquare2`);
  for (const key of KEYS) if (!block[key]) throw new Error(`[${locale}] missing ${key}`);
}

const data = Object.fromEntries(LOCALES.map((locale) => [locale, { gameRedsquare2: { ...TRANSLATIONS[locale].gameRedsquare2 } }]));
fs.writeFileSync(targetFile, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Wrote ${targetFile} (${LOCALES.length} locales)`);
