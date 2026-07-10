const fs = require('fs');
const path = require('path');

const promoI18nDir = path.join(__dirname, '../../../shared/i18n');
const localesPath = path.join(__dirname, 'locales.json');

function extractPromoKeys(data) {
  return Object.fromEntries(
    Object.entries(data).filter(([key]) => key.startsWith('promo.'))
  );
}

function loadPromoMessagesForLocale(locale) {
  const basePath = path.join(promoI18nDir, 'en.base.json');
  const base = fs.existsSync(basePath)
    ? extractPromoKeys(JSON.parse(fs.readFileSync(basePath, 'utf8')))
    : {};

  const localePath = path.join(promoI18nDir, `${locale}.json`);
  const localeData = fs.existsSync(localePath)
    ? extractPromoKeys(JSON.parse(fs.readFileSync(localePath, 'utf8')))
    : {};

  return { ...base, ...localeData };
}

let cachedAllPromoI18n = null;

function loadAllPromoI18n() {
  if (cachedAllPromoI18n) {
    return cachedAllPromoI18n;
  }

  const locales = JSON.parse(fs.readFileSync(localesPath, 'utf8'));
  cachedAllPromoI18n = {};
  for (const locale of locales) {
    cachedAllPromoI18n[locale] = loadPromoMessagesForLocale(locale);
  }
  return cachedAllPromoI18n;
}

function promoTr(messages, key, replacements) {
  let text = messages?.[key] || key;
  if (replacements && typeof replacements === 'object') {
    for (const [name, val] of Object.entries(replacements)) {
      text = String(text).replace(`{${name}}`, String(val));
    }
  }
  return text;
}

function resolvePromoTr(key, locale, replacements) {
  const promoI18n = loadAllPromoI18n();
  const messages = promoI18n[locale] || promoI18n.en || promoI18n.ru || {};
  return promoTr(messages, key, replacements);
}

function formatPromoDateForLocale(value, locale) {
  if (!value) {
    return '';
  }
  const raw = String(value);
  const date = raw.match(/^\d{4}-\d{2}-\d{2}$/)
    ? new Date(`${raw}T23:59:59`)
    : new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const localeMap = {
    'zh-cn': 'zh-CN',
    'pt-br': 'pt-BR',
    'pt-pt': 'pt-PT',
    'ku-arab': 'ku-Arab'
  };
  const dateLocale = localeMap[locale] || locale || 'ru';
  return date.toLocaleDateString(dateLocale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

module.exports = {
  loadPromoMessagesForLocale,
  loadAllPromoI18n,
  promoTr,
  resolvePromoTr,
  formatPromoDateForLocale
};
