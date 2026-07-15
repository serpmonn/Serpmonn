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

const FRONTEND_PREFIX = '/frontend/';

/** Allow only same-site frontend paths (blocks open redirects). */
export function sanitizeReturnPath(input) {
  if (!input || typeof input !== 'string') return null;

  let path = input.trim();
  if (!path.startsWith('/')) {
    try {
      path = decodeURIComponent(path);
    } catch {
      return null;
    }
  }

  if (!path.startsWith(FRONTEND_PREFIX)) return null;
  if (path.includes('://') || path.startsWith('//')) return null;

  const pathname = path.split('?')[0].split('#')[0];
  if (/\/auth\/auth\.html$/i.test(pathname)) return null;

  return path;
}

export function getCurrentReturnPath() {
  return window.location.pathname + window.location.search;
}

export function buildAuthUrl({ tab = null, returnPath = null } = {}) {
  const base = getFrontendPath('auth/auth.html');
  const params = new URLSearchParams();

  if (tab) params.set('tab', tab);

  const safeReturn = sanitizeReturnPath(returnPath ?? getCurrentReturnPath());
  if (safeReturn) params.set('return', safeReturn);

  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function redirectToAuth(options = {}) {
  const url = buildAuthUrl(options);
  if (typeof url === 'string' && url.startsWith('/frontend/')) {
    window.location.assign(url);
  }
}
