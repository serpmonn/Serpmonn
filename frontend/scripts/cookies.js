function shouldShowCookieBanner() {
  if (window.__SPN_VK_MINI__) return false;
  if (/(?:^|[?&])vk_mini=1(?:&|$)/.test(window.location.search)) return false;
  if (/vk_app_id=\d+/.test(window.location.search)) return false;
  if (document.body?.classList?.contains('vk-mini-app') || document.body?.classList?.contains('vk-mini-embed')) {
    return false;
  }
  try {
    if (window.__SPN_ANDROID_APP__) return false;
    if (document.documentElement?.classList?.contains('android-app')) return false;
    if (/(?:^|[?&])app=1(?:&|$)/.test(window.location.search || '')) return false;
  } catch (_) {}
  const params = new URLSearchParams(window.location.search);
  const envParam = params.get('env') || '';
  if (envParam === 'vk_mini' || envParam === 'twa') return false;
  if (
    params.has('vk_app_id') ||
    window.location.hostname === 'vk.com' ||
    window.location.hostname.endsWith('.vk.com')
  ) {
    return false;
  }
  const isStandalonePWA =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
  if (isStandalonePWA) return false;
  return true;
}

function setCookie(name, value, days) {
  const d = new Date();
  d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = 'expires=' + d.toUTCString();
  document.cookie = name + '=' + value + ';' + expires + ';path=/;SameSite=Lax';
}

function getCookie(name) {
  const cname = name + '=';
  const decoded = decodeURIComponent(document.cookie);
  const parts = decoded.split(';');
  for (let c of parts) {
    c = c.trim();
    if (c.indexOf(cname) === 0) {
      return c.substring(cname.length);
    }
  }
  return null;
}

export function showCookieBanner() {
  if (!shouldShowCookieBanner()) return;

  const cookieConsent = document.getElementById('cookie-consent');
  const acceptBtn = document.getElementById('accept-cookies');
  const declineBtn = document.getElementById('decline-cookies');

  if (!cookieConsent || !acceptBtn || !declineBtn) return;

  const status = getCookie('cookies_accepted');
  if (status === 'true' || status === 'declined') return;

  cookieConsent.style.display = 'block';

  acceptBtn.onclick = () => {
    setCookie('cookies_accepted', 'true', 365);
    cookieConsent.style.display = 'none';
  };

  declineBtn.onclick = () => {
    setCookie('cookies_accepted', 'declined', 365);
    cookieConsent.style.display = 'none';
  };
}
