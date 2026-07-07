const SITE_ORIGIN = 'https://serpmonn.ru';

export function getCurrentLocale() {
  try {
    const fromStorage = localStorage.getItem('spn_lang');
    if (fromStorage) return fromStorage.trim().toLowerCase();
  } catch (_) {}
  return (document.documentElement.lang || 'ru').trim().toLowerCase();
}

/** Path under /frontend/, with locale segment for non-ru (e.g. login/login.html). */
export function getFrontendPath(relativePath) {
  const locale = getCurrentLocale();
  const path = relativePath.replace(/^\//, '');
  if (locale === 'ru') {
    return `/frontend/${path}`;
  }
  return `/frontend/${locale}/${path}`;
}

export function getFrontendUrl(relativePath) {
  return `${SITE_ORIGIN}${getFrontendPath(relativePath)}`;
}
