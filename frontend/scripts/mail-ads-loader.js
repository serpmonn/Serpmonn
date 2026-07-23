const MAIL_ADS_SRC = 'https://ad.mail.ru/static/ads-async.js';

function isVkMiniContext() {
  try {
    return (
      Boolean(window.__SPN_VK_MINI__) ||
      document.documentElement.classList.contains('vk-mini-embed') ||
      document.documentElement.classList.contains('vk-mini-root') ||
      document.body?.classList?.contains('vk-mini-embed') ||
      document.body?.classList?.contains('vk-mini-app') ||
      /(?:^|[?&])vk_mini=1(?:&|$)/.test(window.location.search) ||
      /vk_app_id=\d+/.test(window.location.search)
    );
  } catch {
    return false;
  }
}

export function pushMailAdTag() {
  if (isVkMiniContext()) return;
  (window.MRGtag = window.MRGtag || []).push({});
}

export function ensureMailAdsScript() {
  if (isVkMiniContext()) {
    window.__mailAdsRequested = true;
    return;
  }

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
