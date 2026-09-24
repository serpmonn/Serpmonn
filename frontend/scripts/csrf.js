/**
 * CSRF helper for cookie-authenticated mutating requests.
 * Pair with backend allowlist CSRF middleware (X-CSRF-Token).
 */

let cachedToken = '';
let cachedAt = 0;
const TTL_MS = 10 * 60 * 1000;

export async function getCsrfToken({ force = false } = {}) {
  const now = Date.now();
  if (!force && cachedToken && now - cachedAt < TTL_MS) {
    return cachedToken;
  }

  const res = await fetch('/csrf-token', { credentials: 'include' });
  if (!res.ok) {
    throw new Error('csrf_token_failed');
  }
  const data = await res.json();
  cachedToken = String(data?.csrfToken || '');
  cachedAt = now;
  if (!cachedToken) {
    throw new Error('csrf_token_empty');
  }
  return cachedToken;
}

export async function csrfHeaders(extra = {}) {
  const token = await getCsrfToken();
  return {
    ...extra,
    'X-CSRF-Token': token
  };
}
