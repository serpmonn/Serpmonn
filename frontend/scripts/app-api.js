/** Absolute API URLs in Capacitor / app shell (avoids bad relative fetch targets). */
const APP_ORIGIN = 'https://serpmonn.ru';

function isSerpmonnHost(hostname) {
  const h = String(hostname || '').toLowerCase();
  return h === 'serpmonn.ru' || h === 'www.serpmonn.ru' || h === 'dev.serpmonn.ru' || h.endsWith('.serpmonn.ru');
}

export function isAppShell() {
  try {
    if (window.__SPN_ANDROID_APP__) return true;
    if (document.documentElement.classList.contains('android-app')) return true;
    if (new URLSearchParams(window.location.search).get('app') === '1') return true;
    if (window.Capacitor?.isNativePlatform?.()) return true;
    if (window.parent && window.parent !== window) {
      try {
        if (window.parent.__SPN_ANDROID_APP__) return true;
      } catch (_) {}
    }
  } catch (_) {}
  return false;
}

function shellHostname() {
  try {
    if (location.hostname) return location.hostname;
  } catch (_) {}
  // srcdoc / about:blank inherit the parent WebView host (dev or prod), not serpmonn.ru hardcoded.
  try {
    if (window.parent && window.parent !== window && window.parent.location?.hostname) {
      return window.parent.location.hostname;
    }
  } catch (_) {}
  return '';
}

export function apiUrl(path) {
  const p = String(path || '');
  if (/^https?:\/\//i.test(p)) return p;
  if (isAppShell()) {
    // Already on site/dev host → same-origin (nginx proxies /api,/auth). Avoids CORS from Dev APK.
    // about:srcdoc has empty hostname — must NOT fall through to production APP_ORIGIN,
    // or CSRF cookie/token are issued for serpmonn.ru while POST stays on dev.
    try {
      if (isSerpmonnHost(shellHostname())) return p;
    } catch (_) {}
    try {
      if (!location.hostname || location.protocol === 'about:') return p;
    } catch (_) {}
    return new URL(p, APP_ORIGIN).href;
  }
  return p;
}

export function appFetch(path, options) {
  return fetch(apiUrl(path), options);
}
