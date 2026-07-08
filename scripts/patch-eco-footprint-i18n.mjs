import fs from 'node:fs';
import path from 'node:path';
import { LOCALES, TRANSLATIONS } from './eco-footprint-i18n-translations.mjs';

const root = process.cwd();
const targetFile = path.join(root, 'assembly', 'site', '_data', 'productFootprintCalculator.json');

const PRODUCT_IDS = [
  'beef', 'lamb', 'pork', 'chicken', 'fish', 'milk', 'cheese', 'eggs', 'rice', 'wheat',
  'potatoes', 'tomatoes', 'vegetables', 'apples', 'bananas', 'fruits', 'coffee', 'chocolate',
  'nuts', 'turkey', 'duck', 'butter', 'yogurt', 'salmon', 'tuna', 'shrimp', 'cucumbers',
  'carrots', 'oranges', 'grapes', 'strawberries', 'quinoa', 'lentils', 'chickpeas', 'tea',
  'wine', 'sugar', 'bread_white', 'bread_rye', 'buckwheat', 'oats', 'pasta', 'barley', 'rye',
  'sunflower_oil', 'olive_oil', 'kefir', 'yogurt_plain', 'cottage_cheese', 'sour_cream',
  'cabbage', 'onions', 'garlic', 'beets', 'pears', 'peas', 'beans', 'kvass', 'soda', 'beer',
];

const JS_KEYS = [
  'quantityPlaceholder',
  'selectedProductsTitle',
  'remove',
  'unitLabel',
  'loading',
  'errorPrefix',
  'comparisonCurrentFootprint',
  'comparisonAlternatives',
  'comparisonSavings',
];

const RECOMMENDATION_KEYS = [
  'highImpact',
  'reduceMeat',
  'dairyAlternatives',
  'buyLocal',
  'planPurchases',
];

const ALTERNATIVE_KEYS = [
  'plant_proteins', 'legumes', 'nuts', 'poultry', 'fish', 'seaweed', 'plant_milk', 'oat_milk',
  'plant_cheese', 'tofu', 'quinoa', 'bulgur', 'buckwheat', 'oats_grain', 'barley_grain', 'rye_grain',
  'sweet_potato', 'turnip', 'seasonal_vegetables', 'local_seasonal_vegetables', 'local_seasonal_fruits',
  'local_fruits', 'tea', 'chicory', 'fruits', 'seeds', 'chicken', 'turkey', 'plant_oils', 'avocado',
  'plant_yogurt', 'kefir', 'plant_omega3', 'flax_seeds', 'other_fish', 'other_seafood',
  'canned_tomatoes', 'zucchini', 'seasonal_root_vegetables', 'beets', 'other_root_vegetables',
  'seasonal_citrus', 'seasonal_berries', 'other_grains', 'other_pseudograins', 'beans', 'peas',
  'chickpeas', 'lentils', 'plant_drinks', 'local_herbs', 'local_drinks', 'non_alcoholic_options',
  'plant_desserts', 'honey', 'stevia', 'rye_bread', 'whole_grain', 'pearl_barley', 'oatmeal',
  'millet', 'whole_grain_pasta', 'wheat', 'olive_oil', 'sunflower_oil', 'reduce_amount',
  'plain_yogurt', 'yogurt', 'reduce_fat', 'other_seasonal_vegetables', 'local_apples', 'apples',
  'herbal_teas', 'water', 'compote', 'fruit_drink', 'kvass', 'onion',
];

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    throw new Error(`${filePath}: ${err.message}`);
  }
}

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
    const data = TRANSLATIONS[locale];
    for (const key of JS_KEYS) {
      if (!data.js?.[key]) throw new Error(`[${locale}] missing js.${key}`);
    }
    if (!data.errors?.select_product_and_qty) {
      throw new Error(`[${locale}] missing errors.select_product_and_qty`);
    }
    for (const key of RECOMMENDATION_KEYS) {
      if (!data.recommendationItems?.[key]?.title || !data.recommendationItems?.[key]?.description) {
        throw new Error(`[${locale}] missing recommendationItems.${key}`);
      }
    }
    for (const key of ALTERNATIVE_KEYS) {
      if (!data.alternatives?.[key]) throw new Error(`[${locale}] missing alternatives.${key}`);
    }
    for (const productId of PRODUCT_IDS) {
      if (!data.products?.[productId]) throw new Error(`[${locale}] missing products.${productId}`);
    }
  }
}

function mergeLocale(existing, patch) {
  const merged = { ...existing };

  merged.js = { ...(existing.js || {}), ...patch.js };
  merged.errors = { ...(existing.errors || {}), select_product_and_qty: patch.errors.select_product_and_qty };
  merged.recommendationItems = { ...(existing.recommendationItems || {}), ...patch.recommendationItems };
  merged.alternatives = { ...(existing.alternatives || {}), ...patch.alternatives };
  merged.products = { ...(existing.products || {}), ...patch.products };

  return merged;
}

function main() {
  if (!fs.existsSync(targetFile)) {
    console.error(`Missing target file: ${targetFile}`);
    process.exit(1);
  }

  validateTranslations();

  const data = readJson(targetFile);
  const stats = {
    localesPatched: 0,
    jsKeysAdded: JS_KEYS.length,
    alternativesAdded: ALTERNATIVE_KEYS.length,
    recommendationItemsAdded: RECOMMENDATION_KEYS.length,
    productsAddedByLocale: {},
  };

  for (const locale of LOCALES) {
    if (!data[locale]) {
      console.error(`Locale "${locale}" not found in ${targetFile}`);
      process.exit(1);
    }

    const beforeProducts = Object.keys(data[locale].products || {}).length;
    data[locale] = mergeLocale(data[locale], TRANSLATIONS[locale]);
    const afterProducts = Object.keys(data[locale].products || {}).length;
    stats.productsAddedByLocale[locale] = afterProducts - beforeProducts;
    stats.localesPatched++;
    console.log(`[${locale}] patched (products +${stats.productsAddedByLocale[locale]})`);
  }

  const output = `${JSON.stringify(data, null, 2)}\n`;
  fs.writeFileSync(targetFile, output, 'utf8');

  try {
    JSON.parse(fs.readFileSync(targetFile, 'utf8'));
  } catch (err) {
    console.error(`Invalid JSON after patch: ${err.message}`);
    process.exit(1);
  }

  console.log('\nSummary:');
  console.log(`- Target: ${targetFile}`);
  console.log(`- Locales patched: ${stats.localesPatched}`);
  console.log(`- js keys per locale: ${stats.jsKeysAdded}`);
  console.log(`- errors.select_product_and_qty added per locale: 1`);
  console.log(`- recommendationItems per locale: ${stats.recommendationItemsAdded}`);
  console.log(`- alternatives keys per locale: ${stats.alternativesAdded}`);
  console.log(`- product IDs ensured per locale: ${PRODUCT_IDS.length}`);
  console.log(`- JSON validation: OK`);
}

main();
