import { isSafeFrontendPath, safeAssignLocation, safeSetHref } from './safe-frontend-nav.js';

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
  const path = String(relativePath || '').replace(/^\//, '').replace(/[^a-zA-Z0-9._\-\/]/g, '');
  if (locale === 'ru') {
    return `/frontend/${path}`;
  }
  const safeLocale = String(locale).replace(/[^a-z0-9\-]/g, '');
  return `/frontend/${safeLocale}/${path}`;
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
  if (!isSafeFrontendPath(path.split('?')[0].split('#')[0])) return null;

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

  if (tab === 'login' || tab === 'register') params.set('tab', tab);

  const safeReturn = sanitizeReturnPath(returnPath ?? getCurrentReturnPath());
  if (safeReturn) params.set('return', safeReturn);

  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
}

export function redirectToAuth(options = {}) {
  safeAssignLocation(buildAuthUrl(options));
}

export { isSafeFrontendPath, safeAssignLocation, safeSetHref };
