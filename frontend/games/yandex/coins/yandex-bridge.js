/**
 * Yandex Games SDK bridge for Serpmonn HTML5 builds.
 * Site RSЯ / Mail ads are NOT loaded in this package.
 * Language: ysdk.environment.i18n.lang → RU/EN UI.
 */
(function () {
  'use strict';

  let ysdk = null;
  let gameplayActive = false;

  function safeCall(fn) {
    try {
      return fn();
    } catch (_) {
      return undefined;
    }
  }

  function gameplayStart() {
    if (!ysdk || gameplayActive) return;
    gameplayActive = true;
    safeCall(() => ysdk.features?.GameplayAPI?.start());
  }

  function gameplayStop() {
    if (!ysdk || !gameplayActive) return;
    gameplayActive = false;
    safeCall(() => ysdk.features?.GameplayAPI?.stop());
  }

  function showFullscreenAd(options = {}) {
    const onClose = typeof options.onClose === 'function' ? options.onClose : null;
    if (!ysdk?.adv?.showFullscreenAdv) {
      if (onClose) onClose(false);
      return;
    }
    gameplayStop();
    ysdk.adv.showFullscreenAdv({
      callbacks: {
        onOpen: () => {},
        onClose: (wasShown) => {
          if (onClose) onClose(Boolean(wasShown));
        },
        onError: () => {
          if (onClose) onClose(false);
        },
      },
    });
  }

  function applyLocale(sdk) {
    if (typeof window.resolveSerpmonnLocale !== 'function') return;
    const loc = window.resolveSerpmonnLocale(sdk);
    if (typeof window.applySerpmonnLocale === 'function') {
      window.applySerpmonnLocale(loc);
    }
  }

  window.__ygGameplayStart = gameplayStart;
  window.__ygGameplayStop = gameplayStop;
  window.showFullScreenAd = showFullscreenAd;

  async function boot() {
    try {
      if (typeof YaGames === 'undefined' || !YaGames.init) {
        console.warn('[yg] YaGames SDK missing — local draft mode');
        applyLocale(null);
        safeCall(() => window.__ygOnReady && window.__ygOnReady(null));
        return null;
      }
      ysdk = await YaGames.init();
      applyLocale(ysdk);
      safeCall(() => ysdk.features?.LoadingAPI?.ready());
      window.__yg = ysdk;
      safeCall(() => window.__ygOnReady && window.__ygOnReady(ysdk));
      return ysdk;
    } catch (err) {
      console.warn('[yg] init failed', err);
      applyLocale(null);
      safeCall(() => window.__ygOnReady && window.__ygOnReady(null));
      return null;
    }
  }

  window.__ygBoot = boot;
})();
