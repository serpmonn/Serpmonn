const DEFAULT_LOCALE = 'en';
let messages = {};
let currentLocale = DEFAULT_LOCALE;

function getCurrentLocale() {
  return (document.documentElement.lang || DEFAULT_LOCALE).trim();
}

async function loadJson(url) {
  const res = await fetch(url, { credentials: 'same-origin' });
  if (!res.ok) {
    throw new Error(`Failed to load ${url}: ${res.status}`);
  }
  return res.json();
}

export async function loadMessages() {
  currentLocale = getCurrentLocale();

  const [base, localeSpecific] = await Promise.all([
    loadJson('/shared/i18n/en.base.json'),
    currentLocale === DEFAULT_LOCALE
      ? loadJson('/shared/i18n/en.json').catch(() => ({}))
      : loadJson(`/shared/i18n/${currentLocale}.json`).catch(() => ({}))
  ]);

  messages = {
    ...base,
    ...localeSpecific
  };

  return messages;
}

export function getMessages() {
  return messages;
}

export function t(key, vars = {}) {
  let value = messages[key] ?? key;
  for (const [name, val] of Object.entries(vars)) {
    value = value.replaceAll(`{${name}}`, String(val));
  }
  return value;
}