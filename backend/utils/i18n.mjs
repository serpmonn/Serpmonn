const SUPPORTED_LOCALES = new Set([
  'ru',
  'en',
  'de',
  'fr',
  'es',
  'es-419',
  'pt-br',
  'pt-pt',
  'it',
  'nl',
  'pl',
  'kk',
  'bn',
  'ur',
  'ms',
  'id',
  'ja',
  'ko',
  'vi',
  'tr',
  'sv',
  'da',
  'nb',
  'fi',
  'hi',
  'bg',
  'el',
  'sr',
  'ka',
  'hy',
  'be',
  'uz',
  'az',
  'ro',
  'cs',
  'hu',
  'th',
  'fil',
  'ar',
  'he',
  'fa',
  'ps',
  'sd',
  'ug',
  'dv',
  'ks',
  'ku-arab',
  'yi',
  'zh-cn',
]);

const FALLBACK_LOCALE = 'en';

const MESSAGES = {
  en: {
    queryEmpty: 'Query is empty.',
    guestLimitVk:
      'The daily limit of 5 requests has been reached. To continue using Serpmonn without limits, sign in: https://serpmonn.ru/frontend/login/login.html or register: https://serpmonn.ru/frontend/register/register.html',
    guestLimit:
      'The guest limit of 5 requests has been reached. Please sign in or register to continue.',
    proLimit:
      'You have reached the monthly limit of 2000 requests on the Pro plan. The limit will reset at the beginning of next month.',
    freeLimit:
      'Your request limit for today has been reached. You can open the pricing page and upgrade to Pro.',
    aiUnavailable: 'The AI service is temporarily unavailable.',
    internalError: 'Internal server error.',
    noModelText: 'No text response was returned by the model.',
    unknownTaskError: 'Unknown task error.',
  },

  ru: {
    queryEmpty: 'Запрос пуст.',
    guestLimitVk:
      'Лимит 5 запросов в день исчерпан. Чтобы продолжить пользоваться Serpmonn без ограничений, войдите: https://serpmonn.ru/frontend/login/login.html или зарегистрируйтесь: https://serpmonn.ru/frontend/register/register.html',
    guestLimit:
      'Лимит 5 запросов для гостей исчерпан. Пожалуйста, войдите или зарегистрируйтесь, чтобы продолжить.',
    proLimit:
      'Вы исчерпали лимит 2000 запросов в месяц по тарифу Pro. Лимит будет обновлён в начале следующего месяца.',
    freeLimit:
      'Лимит запросов на сегодня исчерпан. Вы можете перейти на страницу тарифов и оформить тариф Pro.',
    aiUnavailable: 'Сервис ИИ временно недоступен.',
    internalError: 'Внутренняя ошибка сервера.',
    noModelText: 'Нет текста ответа от модели.',
    unknownTaskError: 'Неизвестная ошибка задачи.',
  },
};

function normalizeLocale(input = '') {
  return String(input).trim().replace(/_/g, '-').toLowerCase();
}

function parseAcceptLanguage(header = '') {
  return String(header)
    .split(',')
    .map(part => part.split(';')[0].trim())
    .filter(Boolean)
    .map(normalizeLocale);
}

function resolveSupportedLocale(rawLocale) {
  const locale = normalizeLocale(rawLocale);
  if (!locale) return null;
  if (SUPPORTED_LOCALES.has(locale)) return locale;

  const base = locale.split('-')[0];
  if (SUPPORTED_LOCALES.has(base)) return base;

  if (base === 'zh') return 'zh-cn';
  if (base === 'pt') return 'pt-br';
  if (base === 'ku') return 'ku-arab';
  if (base === 'es') return 'es';

  return null;
}

export function detectLocale(req) {
  const bodyLang = resolveSupportedLocale(req?.body?.lang);
  if (bodyLang) return bodyLang;

  const queryLang = resolveSupportedLocale(req?.query?.lang);
  if (queryLang) return queryLang;

  const pathLang = resolveSupportedLocale(req?.headers?.['x-user-lang']);
  if (pathLang) return pathLang;

  const accepted = parseAcceptLanguage(req?.headers?.['accept-language']);
  for (const item of accepted) {
    const locale = resolveSupportedLocale(item);
    if (locale) return locale;
  }

  return FALLBACK_LOCALE;
}

export function getBackendMessages(req) {
  const locale = detectLocale(req);
  const primary = MESSAGES[locale];
  if (primary) return { locale, t: primary };

  const base = locale.split('-')[0];
  const baseDict = MESSAGES[base];
  if (baseDict) return { locale, t: baseDict };

  return { locale: FALLBACK_LOCALE, t: MESSAGES[FALLBACK_LOCALE] };
}