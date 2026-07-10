const MAIL_ADS_SRC = 'https://ad.mail.ru/static/ads-async.js';

export function pushMailAdTag() {
  (window.MRGtag = window.MRGtag || []).push({});
}

export function ensureMailAdsScript() {
  if (window.__mailAdsRequested) {
    return;
  }

  window.__mailAdsRequested = true;

  if (document.querySelector('script[src*="ads-async.js"]')) {
    return;
  }

  const script = document.createElement('script');
  script.src = MAIL_ADS_SRC;
  script.async = true;
  document.head.appendChild(script);
}
