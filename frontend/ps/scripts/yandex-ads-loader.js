const YANDEX_ADS_SRC = 'https://yandex.ru/ads/system/context.js';

export function ensureYandexAdsScript() {
  window.yaContextCb = window.yaContextCb || [];

  if (window.__yandexAdsRequested) {
    return;
  }

  window.__yandexAdsRequested = true;

  if (document.querySelector('script[src*="yandex.ru/ads/system/context.js"]')) {
    return;
  }

  const script = document.createElement('script');
  script.src = YANDEX_ADS_SRC;
  script.async = true;
  document.head.appendChild(script);
}

export function onYandexReady(callback) {
  window.yaContextCb = window.yaContextCb || [];
  window.yaContextCb.push(callback);
}
