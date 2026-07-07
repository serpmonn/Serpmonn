import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const DEFAULT_LOCALE = 'en';

// Динамически загружаем все локали из shared/i18n/
const i18nDir = path.resolve(__dirname, '../../shared/i18n');
const SUPPORTED_LOCALES = fs
  .readdirSync(i18nDir)
  .filter(f => f.endsWith('.json') && !f.includes('base'))
  .map(f => f.replace('.json', ''));

// Кэш: грузим JSON один раз при старте
const cache = {};
for (const loc of SUPPORTED_LOCALES) {
  cache[loc] = require(path.resolve(i18nDir, `${loc}.json`));
}

// en.base.json как фолбэк для английского (содержит полный набор ключей)
const enBase = require(path.resolve(i18nDir, 'en.base.json'));
cache['en'] = Object.keys(cache['en'] || {}).length > 0 ? cache['en'] : enBase;

/**
 * Определяет локаль из запроса.
 * Приоритет: X-User-Lang header → body.lang → Accept-Language → default
 */
export function resolveLocale(req) {
  const candidates = [
    req.headers['x-user-lang'],
    req.body?.lang,
    (req.headers['accept-language'] || '').split(',')[0].trim().split(';')[0],
  ];

  for (const c of candidates) {
    if (!c) continue;
    const normalized = c.toLowerCase().trim();
    if (SUPPORTED_LOCALES.includes(normalized)) return normalized;
    const short = normalized.slice(0, 2);
    if (SUPPORTED_LOCALES.includes(short)) return short;
  }

  return DEFAULT_LOCALE;
}

/**
 * Возвращает { locale, t } для использования в роутере.
 * t — объект с переводами, фолбэк на en.base.json.
 */
export function getBackendMessages(req) {
  const locale = resolveLocale(req);
  const t = { ...enBase, ...(cache[locale] ?? {}) };
  return { locale, t };
}
