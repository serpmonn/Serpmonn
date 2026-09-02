/** Absolute API URLs in Capacitor / app shell (avoids bad relative fetch targets). */
const APP_ORIGIN = 'https://serpmonn.ru';

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

export function apiUrl(path) {
  const p = String(path || '');
  if (/^https?:\/\//i.test(p)) return p;
  if (isAppShell()) return new URL(p, APP_ORIGIN).href;
  return p;
}

export function appFetch(path, options) {
  return fetch(apiUrl(path), options);
}
