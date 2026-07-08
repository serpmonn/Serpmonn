import fs from 'node:fs';
import path from 'node:path';
import { LOCALES, TRANSLATIONS } from './snake-i18n-translations.mjs';

const root = process.cwd();
const targetFile = path.join(root, 'assembly', 'site', '_data', 'gameSnakeTranslations.json');

const GAME_SNAKE_KEYS = [
  'pageTitle',
  'metaDescription',
  'ogTitle',
  'ogDescription',
  'twitterDescription',
  'mainTitle',
  'gamesAlt',
  'canvasAria',
  'hint',
  'statsTitle',
  'scoreLabel',
  'bestLabel',
  'speedLabel',
  'fieldSizeLabel',
  'fieldSizeValue',
  'btnStart',
  'btnPause',
  'btnReset',
  'mobileControlsAria',
  'howToTitle',
  'instructionsDesktop',
  'instructionsMobile',
  'gotIt',
  'gameOver',
  'pressRToRestart',
];

function validateTranslations() {
  const missingLocales = LOCALES.filter((locale) => !TRANSLATIONS[locale]);
  if (missingLocales.length > 0) {
    throw new Error(`Missing translations for locales: ${missingLocales.join(', ')}`);
  }

  const extraLocales = Object.keys(TRANSLATIONS).filter((locale) => !LOCALES.includes(locale));
  if (extraLocales.length > 0) {
    throw new Error(`Translations exist for unknown locales: ${extraLocales.join(', ')}`);
  }

  for (const locale of LOCALES) {
    const block = TRANSLATIONS[locale]?.gameSnake;
    if (!block) {
      throw new Error(`[${locale}] missing gameSnake block`);
    }
    for (const key of GAME_SNAKE_KEYS) {
      if (!block[key]) {
        throw new Error(`[${locale}] missing gameSnake.${key}`);
      }
    }
    if (block.fieldSizeValue !== '24×24') {
      throw new Error(`[${locale}] fieldSizeValue must be "24×24"`);
    }
  }
}

function main() {
  validateTranslations();

  const data = {};
  for (const locale of LOCALES) {
    data[locale] = { gameSnake: { ...TRANSLATIONS[locale].gameSnake } };
    console.log(`[${locale}] validated (${GAME_SNAKE_KEYS.length} keys)`);
  }

  const output = `${JSON.stringify(data, null, 2)}\n`;
  fs.writeFileSync(targetFile, output, 'utf8');

  try {
    JSON.parse(fs.readFileSync(targetFile, 'utf8'));
  } catch (err) {
    console.error(`Invalid JSON after write: ${err.message}`);
    process.exit(1);
  }

  console.log('\nSummary:');
  console.log(`- Target: ${targetFile}`);
  console.log(`- Locales written: ${LOCALES.length}`);
  console.log(`- gameSnake keys per locale: ${GAME_SNAKE_KEYS.length}`);
  console.log(`- JSON validation: OK`);
}

main();
