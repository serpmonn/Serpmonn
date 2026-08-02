const MAIL_ADS_SRC = 'https://ad.mail.ru/static/ads-async.js';

function isVkMiniContext() {
  try {
    if (window.__SPN_VK_MINI__) return true;
    if (document.documentElement.classList.contains('vk-mini-embed')) return true;
    if (document.documentElement.classList.contains('vk-mini-root')) return true;
    if (document.body?.classList?.contains('vk-mini-embed')) return true;
    if (document.body?.classList?.contains('vk-mini-app')) return true;
    if (/(?:^|[?&])vk_mini=1(?:&|$)/.test(window.location.search)) return true;
    if (/vk_app_id=\d+/.test(window.location.search)) return true;
    if (window.parent && window.parent !== window && window.parent.__SPN_VK_MINI__) return true;
    return false;
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
