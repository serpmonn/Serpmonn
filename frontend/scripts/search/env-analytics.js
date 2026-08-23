const SPN_ANON_COOKIE = 'spn_anon_id';
const SPN_ANON_MAX_AGE = 60 * 60 * 24 * 400;

function spnReadCookie(name) {
  try {
    const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return m ? decodeURIComponent(m[1]) : '';
  } catch (_) {
    return '';
  }
}

function spnWriteCookie(name, value, maxAgeSec) {
  try {
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSec}; SameSite=Lax${secure}`;
  } catch (_) {}
}

function spnEnsureAnonId() {
  let id = spnReadCookie(SPN_ANON_COOKIE);
  if (!id || id.length < 8 || id.length > 64) {
    id = (typeof crypto !== 'undefined' && crypto.randomUUID)
      ? crypto.randomUUID()
      : `a${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
    spnWriteCookie(SPN_ANON_COOKIE, id, SPN_ANON_MAX_AGE);
  }
  return id;
}

function getSearchAnalyticsHeaders() {
  let client = 'web';
  try {
    if (window.__SPN_VK_MINI__ || document.documentElement?.classList?.contains('vk-mini-embed')) {
      client = 'vk';
    } else if (
      window.__SPN_ANDROID_APP__ ||
      document.documentElement?.classList?.contains('android-app') ||
      /(?:^|[?&])app=1(?:&|$)/.test(location.search || '')
    ) {
      client = 'android';
    }
  } catch (_) {}

  let device = 'desktop';
  try {
    if (window.matchMedia?.('(pointer: coarse)').matches || window.matchMedia?.('(max-width: 768px)').matches) {
      device = 'mobile';
    } else if (/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '')) {
      device = 'mobile';
    }
  } catch (_) {}

  const headers = {
    'X-Spn-Client': client,
    'X-Spn-Device': device,
    'X-Anon-Id': spnEnsureAnonId(),
  };
  if (client === 'vk') headers['X-Client'] = 'vk-agent';
  return headers;
}


function getEnv() {
  const ua = navigator.userAgent || '';

  const isStandalonePWA =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  const params = new URLSearchParams(window.location.search);
  const envParam = params.get('env') || '';

  const host = location.hostname;
  if (
    envParam === 'vk_mini' ||
    params.has('vk_app_id') ||
    params.get('vk_mini') === '1' ||
    Boolean(window.__SPN_VK_MINI__) ||
    host === 'vk.com' ||
    host.endsWith('.vk.com')
  ) {
    return 'vk_mini';
  }
  if (envParam === 'twa') return 'twa';
  if (isStandalonePWA) return 'pwa';

  return 'web';
}

function shouldShowCookieBanner() {
  if (window.__SPN_VK_MINI__) return false;
  if (/(?:^|[?&])vk_mini=1(?:&|$)/.test(window.location.search)) return false;
  if (/vk_app_id=\d+/.test(window.location.search)) return false;
  if (document.body?.classList?.contains('vk-mini-app') || document.body?.classList?.contains('vk-mini-embed')) {
    return false;
  }
  return getEnv() === 'web';
}

function generateIdempotencyKey() {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}

function getCurrentLocale() {
  return (document.documentElement.lang || 'en').toLowerCase();
}

function getCurrentLanguageTag() {
  const locale = getCurrentLocale();

  if (locale === 'zh-cn') return 'zh-CN';
  if (locale === 'pt-br') return 'pt-BR';
  if (locale === 'pt-pt') return 'pt-PT';
  if (locale === 'ku-arab') return 'ku-Arab';

  return locale;
}

function getQueryFromUrl() {
  return (new URLSearchParams(window.location.search).get('q') || '').trim();
}

/** Эвристика 18+-запроса: блюр превью картинок/видео до явного «Показать». */
const ADULT_QUERY_RE =
  /(?:^|[^a-zа-яё0-9])(?:18\+|nsfw|xxx|porn|porno|pornography|hentai|onlyfans|xvideos|pornhub|xnxx|xhamster|brazzers|redtube|youporn|stripchat|chaturbate|camsoda|nude|nudes|naked|erotic|erotica|adult\s*video|sex\s*tape|milf|anal|blowjob|handjob|cumshot|lesbian\s*sex|gay\s*porn)(?:[^a-zа-яё0-9]|$)|(?:^|[^a-zа-яё0-9])(?:порн(?:о|уха|ухи)?|эроти(?:ка|к|ческий|ческие)?|хентай|онлифанс|интим(?:ные|ный|а)?|секс(?:уальн(?:ый|ая|ое|ые))?|голы(?:е|й|ая|х)|стриптиз|эскорт|милф|фетиш|бдсм|bdsm)(?:[^a-zа-яё0-9]|$)/i;

function isAdultQuery(query) {
  const q = String(query || '').trim();
  if (q.length < 3) return false;
  return ADULT_QUERY_RE.test(q);
}

function getActiveSearchQuery() {
  return (
    document.querySelector('#ai-search-form input[name="q"]')?.value.trim() ||
    getQueryFromUrl() ||
    ''
  );
}

export {
  getSearchAnalyticsHeaders,
  getEnv,
  shouldShowCookieBanner,
  generateIdempotencyKey,
  getCurrentLocale,
  getCurrentLanguageTag,
  getQueryFromUrl,
  isAdultQuery,
  getActiveSearchQuery
};
