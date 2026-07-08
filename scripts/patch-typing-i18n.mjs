import fs from 'node:fs';
import path from 'node:path';
import { LOCALES, TRANSLATIONS } from './typing-i18n-translations.mjs';

const targetFile = path.join(process.cwd(), 'assembly', 'site', '_data', 'gameTypingTranslations.json');
const KEYS = [
  'pageTitle', 'tab15', 'tab30', 'tab60', 'tabWords',
  'statWpm', 'statAccuracy', 'statTime', 'statBest',
  'ariaTestMode', 'ariaInput', 'clickLabel', 'orLabel', 'toStart', 'restartLabel',
  'resultTitle', 'resAccuracy', 'resChars', 'resErrors', 'newRecord',
  'retryBtn', 'newTextBtn', 'historyTitle', 'wordBankRu',
];

for (const locale of LOCALES) {
  const block = TRANSLATIONS[locale]?.gameTyping;
  if (!block) throw new Error(`[${locale}] missing gameTyping`);
  for (const key of KEYS) if (block[key] === undefined) throw new Error(`[${locale}] missing ${key}`);
}

const data = Object.fromEntries(LOCALES.map((locale) => [locale, { gameTyping: { ...TRANSLATIONS[locale].gameTyping } }]));
fs.writeFileSync(targetFile, `${JSON.stringify(data, null, 2)}\n`);
console.log(`Wrote ${targetFile} (${LOCALES.length} locales)`);
