import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

const SUPPORTED_LOCALES = ['ru', 'en'];
const DEFAULT_LOCALE = 'en';

// Кэш: грузим JSON один раз при старте
const cache = {};
for (const loc of SUPPORTED_LOCALES) {
  cache[loc] = require(
    path.resolve(__dirname, '../../shared/i18n', `${loc}.json`)
  );
}

/**
 * Определяет локаль из запроса.
 * Приоритет: X-User-Lang header → body.lang → Accept-Language → default
 */
export function resolveLocale(req) {
  const candidates = [
    req.headers['x-user-lang'],
    req.body?.lang,
    (req.headers['accept-language'] || '').split(',')[0].trim().slice(0, 2),
  ];

  for (const c of candidates) {
    if (!c) continue;
    const normalized = c.toLowerCase().slice(0, 2);
    if (SUPPORTED_LOCALES.includes(normalized)) return normalized;
  }

  return DEFAULT_LOCALE;
}

/**
 * Возвращает { locale, t } для использования в роутере.
 * t — объект с переводами, всегда полный (фолбэк на en).
 */
export function getBackendMessages(req) {
  const locale = resolveLocale(req);
  const t = cache[locale] ?? cache[DEFAULT_LOCALE];
  return { locale, t };
}