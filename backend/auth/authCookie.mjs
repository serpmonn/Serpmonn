export const AUTH_COOKIE_NAME = 'token';

const BASE_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'Lax',
  path: '/'
};

export const AUTH_COOKIE_DOMAIN = '.serpmonn.ru';

export function getAuthCookieOptions(maxAge, overrides = {}) {
  const sameSite = overrides.sameSite || BASE_COOKIE_OPTIONS.sameSite;
  return {
    ...BASE_COOKIE_OPTIONS,
    domain: AUTH_COOKIE_DOMAIN,
    maxAge,
    ...overrides,
    // SameSite=None требует Secure (уже true)
    sameSite
  };
}

export function setAuthCookie(res, token, maxAge, overrides = {}) {
  res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions(maxAge, overrides));
}

/** Clear domain and legacy host-only cookies. */
export function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE_NAME, {
    ...BASE_COOKIE_OPTIONS,
    domain: AUTH_COOKIE_DOMAIN
  });
  res.clearCookie(AUTH_COOKIE_NAME, BASE_COOKIE_OPTIONS);
}
