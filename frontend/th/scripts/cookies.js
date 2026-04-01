import { shouldShowCookieBanner } from './scripts.js';

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
  if (!shouldShowCookieBanner()) return;                                                                                                                                                                      // только web (ПК + моб. браузер)

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