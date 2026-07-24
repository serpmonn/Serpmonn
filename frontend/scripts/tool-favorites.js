/** Shared helpers for tool favorites / recent tools (locale-neutral href keys). */

export const TOOL_CATALOG = [
  { href: '/frontend/tools/marketing/utm-builder.html', nameKey: 'tools.utmBuilder' },
  { href: '/frontend/tools/marketing/word-counter.html', nameKey: 'tools.wordCounter' },
  { href: '/frontend/tools/security/password-generator.html', nameKey: 'tools.passwordGenerator' },
  { href: '/frontend/tools/development/json-formatter.html', nameKey: 'tools.jsonFormatter' },
  { href: '/frontend/tools/development/base64-converter.html', nameKey: 'tools.base64Converter' },
  { href: '/frontend/tools/design/color-palettes.html', nameKey: 'tools.colorPalettes' },
  { href: '/frontend/tools/design/format-converter.html', nameKey: 'tools.formatConverter' },
  { href: '/frontend/tools/engineering/unit-converter.html', nameKey: 'tools.unitConverter' },
  { href: '/frontend/tools/logistics/depreciation-calculator.html', nameKey: 'tools.depreciationCalculator' },
  { href: '/frontend/tools/logistics/fuel-calculator.html', nameKey: 'tools.fuelCalculator' },
  { href: '/frontend/tools/ecology/product-footprint-calculator.html', nameKey: 'tools.footprintCalculator' },
];

/** First path segment after /frontend/ that is a page area, not a locale code. */
const NON_LOCALE_SEGMENTS = new Set([
  'tools',
  'games',
  'profile',
  'login',
  'register',
  'news',
  'promo-codes-and-discounts',
  'tariffs',
  'privacy-policy',
  'about-project',
  'improve',
  'donate',
  'offer',
  'ad-info',
  'main.html',
  'main-mini.html',
  'mini',
  'promo',
]);

/** Legacy display titles (any locale / emoji) → neutral href */
const LEGACY_TITLE_TO_HREF = new Map([
  ['🔗 Генератор UTM‑меток', '/frontend/tools/marketing/utm-builder.html'],
  ['Генератор UTM‑меток', '/frontend/tools/marketing/utm-builder.html'],
  ['UTM-генератор', '/frontend/tools/marketing/utm-builder.html'],
  ['📝 Счётчик слов/символов', '/frontend/tools/marketing/word-counter.html'],
  ['Счётчик слов/символов', '/frontend/tools/marketing/word-counter.html'],
  ['Счётчик слов', '/frontend/tools/marketing/word-counter.html'],
  ['🔑 Генератор паролей', '/frontend/tools/security/password-generator.html'],
  ['Генератор паролей', '/frontend/tools/security/password-generator.html'],
  ['🔄 Конвертер единиц измерения', '/frontend/tools/engineering/unit-converter.html'],
  ['Конвертер единиц измерения', '/frontend/tools/engineering/unit-converter.html'],
  ['🔧 Калькулятор амортизации автомобиля', '/frontend/tools/logistics/depreciation-calculator.html'],
  ['Калькулятор амортизации автомобиля', '/frontend/tools/logistics/depreciation-calculator.html'],
  ['⛽ Калькулятор топлива', '/frontend/tools/logistics/fuel-calculator.html'],
  ['Калькулятор топлива', '/frontend/tools/logistics/fuel-calculator.html'],
  ['🌍 Калькулятор экологического следа продуктов', '/frontend/tools/ecology/product-footprint-calculator.html'],
  ['Калькулятор экологического следа продуктов', '/frontend/tools/ecology/product-footprint-calculator.html'],
]);

export function normalizeToolHref(href) {
  if (!href || typeof href !== 'string') return '';

  let path = href.trim();
  try {
    if (path.startsWith('http://') || path.startsWith('https://')) {
      path = new URL(path).pathname;
    }
  } catch {
    return '';
  }

  const match = path.match(/^\/frontend\/([^/]+)\/(.+)$/);
  if (!match) return path;

  const [, segment, rest] = match;
  if (NON_LOCALE_SEGMENTS.has(segment)) return path;

  return `/frontend/${rest}`;
}

export function resolveFavoriteEntryToHref(entry, localizedTools = []) {
  if (!entry || typeof entry !== 'string') return null;

  const trimmed = entry.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('/') || trimmed.includes('.html')) {
    const neutral = normalizeToolHref(trimmed);
    return neutral.includes('/tools/') ? neutral : null;
  }

  if (LEGACY_TITLE_TO_HREF.has(trimmed)) {
    return LEGACY_TITLE_TO_HREF.get(trimmed);
  }

  for (const item of TOOL_CATALOG) {
    const localized = localizedTools.find((t) => normalizeToolHref(t.href) === item.href);
    if (localized && trimmed === localized.name) return item.href;
  }

  return null;
}

export function migrateFavorites(rawFavorites, localizedTools = []) {
  if (!Array.isArray(rawFavorites)) return [];

  const migrated = [];
  for (const entry of rawFavorites) {
    const href = resolveFavoriteEntryToHref(entry, localizedTools);
    if (href) migrated.push(href);
  }

  return [...new Set(migrated)];
}

export function isFavoriteHref(entry, neutralHref) {
  if (!entry || !neutralHref) return false;
  return normalizeToolHref(entry) === neutralHref;
}

export function loadAndMigrateFavorites(localizedTools = []) {
  try {
    const stored = localStorage.getItem('favorites');
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    const migrated = migrateFavorites(parsed, localizedTools);
    if (JSON.stringify(migrated) !== JSON.stringify(parsed)) {
      localStorage.setItem('favorites', JSON.stringify(migrated));
    }
    return migrated;
  } catch {
    return [];
  }
}
