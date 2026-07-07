import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const DEFAULT_LOCALE = 'en';

const i18nDir = path.resolve(__dirname, '../../shared/i18n');
export const SUPPORTED_LOCALES = fs
  .readdirSync(i18nDir)
  .filter(f => f.endsWith('.json') && !f.includes('base'))
  .map(f => f.replace('.json', ''));

const cache = {};
for (const loc of SUPPORTED_LOCALES) {
  cache[loc] = require(path.resolve(i18nDir, `${loc}.json`));
}

const enBase = require(path.resolve(i18nDir, 'en.base.json'));
cache['en'] = Object.keys(cache['en'] || {}).length > 0 ? cache['en'] : enBase;

const TAG_ALIASES = {
  'zh-hans': 'zh-cn',
  'zh': 'zh-cn',
  'pt': 'pt-br',
};

/**
 * Maps a BCP47-ish tag to a supported locale id, or null.
 */
export function matchLocale(raw, supported = SUPPORTED_LOCALES) {
  if (!raw || typeof raw !== 'string') return null;

  let tag = raw.trim().toLowerCase().replace(/_/g, '-');
  if (!tag) return null;

  if (supported.includes(tag)) return tag;

  if (TAG_ALIASES[tag] && supported.includes(TAG_ALIASES[tag])) {
    return TAG_ALIASES[tag];
  }

  const primary = tag.split('-')[0];
  if (TAG_ALIASES[primary] && supported.includes(TAG_ALIASES[primary])) {
    return TAG_ALIASES[primary];
  }

  if (supported.includes(primary)) return primary;

  const compound = supported.find((loc) => loc.startsWith(`${primary}-`));
  if (compound) return compound;

  return null;
}

/**
 * Определяет локаль из запроса.
 * Приоритет: X-User-Lang → query.locale → cookie → body.lang → Accept-Language → default
 */
export function resolveLocale(req) {
  const candidates = [
    req.headers['x-user-lang'],
    req.query?.locale,
    req.cookies?.locale,
    req.body?.lang,
  ];

  const acceptLanguage = req.headers['accept-language'] || '';
  for (const part of acceptLanguage.split(',')) {
    const tag = part.split(';')[0]?.trim();
    if (tag) candidates.push(tag);
  }

  for (const candidate of candidates) {
    const matched = matchLocale(candidate, SUPPORTED_LOCALES);
    if (matched) return matched;
  }

  return DEFAULT_LOCALE;
}

export function getBackendMessages(req) {
  const locale = resolveLocale(req);
  const t = { ...enBase, ...(cache[locale] ?? {}) };
  return { locale, t };
}
