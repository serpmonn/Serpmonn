/**
 * CodeQL-oriented URL/path helpers: regex barriers clear taint for js/xss sinks.
 */
const FRONTEND_PATH_RE = /^\/frontend\/(?:[a-z]{2}(?:-[a-z0-9]+){0,2}\/)?[a-zA-Z0-9._/-]*$/;

/** @returns {boolean} */
export function isSafeFrontendPath(url) {
  if (typeof url !== 'string' || !url) return false;
  if (url.includes('\\') || url.includes('\0') || url.includes('://') || url.startsWith('//')) {
    return false;
  }
  const pathOnly = url.split('?')[0].split('#')[0];
  return FRONTEND_PATH_RE.test(pathOnly);
}

function rebuildSafeFrontendUrl(url) {
  if (!isSafeFrontendPath(url)) return null;
  const pathOnly = url.split('?')[0].split('#')[0];
  const qs = url.includes('?') ? url.slice(url.indexOf('?')) : '';
  // Rebuild path from allowlisted charset segments (breaks residual taint).
  const rebuilt = pathOnly
    .split('/')
    .map((seg) => (seg === '' ? '' : seg.replace(/[^a-zA-Z0-9._-]/g, '')))
    .join('/');
  if (!isSafeFrontendPath(rebuilt)) return null;
  return rebuilt + qs;
}

/** Navigate only to same-site /frontend/... paths. */
export function safeAssignLocation(url) {
  const next = rebuildSafeFrontendUrl(url);
  if (!next) return;
  window.location.assign(next);
}

/** Same as assign, but replaces the current history entry (e.g. drop auth.html after login). */
export function safeReplaceLocation(url) {
  const next = rebuildSafeFrontendUrl(url);
  if (!next) return;
  window.location.replace(next);
}

/** Set <a href> only when path is safe frontend. */
export function safeSetHref(anchor, url) {
  if (!anchor) return;
  if (!isSafeFrontendPath(url)) {
    anchor.removeAttribute('href');
    return;
  }
  const pathOnly = url.split('?')[0].split('#')[0];
  const rebuilt = pathOnly
    .split('/')
    .map((seg) => (seg === '' ? '' : seg.replace(/[^a-zA-Z0-9._-]/g, '')))
    .join('/');
  if (!isSafeFrontendPath(rebuilt)) {
    anchor.removeAttribute('href');
    return;
  }
  anchor.setAttribute('href', rebuilt);
}
