const YANDEX_ADS_SRC = 'https://yandex.ru/ads/system/context.js';

function injectYandexAdsScript() {
  if (document.querySelector('script[src*="yandex.ru/ads/system/context.js"]')) {
    return;
  }

  const script = document.createElement('script');
  script.src = YANDEX_ADS_SRC;
  script.async = true;
  document.head.appendChild(script);
}

export function ensureYandexAdsScript() {
  window.yaContextCb = window.yaContextCb || [];

  if (window.__yandexAdsRequested) {
    return;
  }

  window.__yandexAdsRequested = true;

  // Defer past LCP/INP window — context.js is heavy on mobile main thread
  const schedule = () => {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => setTimeout(injectYandexAdsScript, 1500), { timeout: 4000 });
    } else {
      setTimeout(injectYandexAdsScript, 2000);
    }
  };

  if (document.readyState === 'complete') {
    schedule();
  } else {
    window.addEventListener('load', schedule, { once: true });
  }
}

export function onYandexReady(callback) {
  window.yaContextCb = window.yaContextCb || [];
  window.yaContextCb.push(callback);
}
