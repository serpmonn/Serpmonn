import { ensureMailAdsScript } from './mail-ads-loader.js';
import { pushMailAdTag } from './mail-ads-config.js';
import { isYandexPrimary, runVkFallbackForIns } from './ad-pool.js';

export function initMobileAnchorAd(options = {}) {
  const anchorId = options.id || 'mobile-anchor-ad';
  const maxWidth = options.maxWidth ?? 768;

  if (localStorage.getItem('anchor_closed') === '1') {
    return;
  }

  const anchor = document.getElementById(anchorId);
  if (!anchor) {
    return;
  }

  const ins = anchor.querySelector('ins.mrg-tag');

  // Floor Ad is managed by Yandex UI — skip the sticky Mail bar wait path.
  if (isYandexPrimary()) {
    if (ins) {
      runVkFallbackForIns(ins, { slotKey: 'mobileAnchor' });
    }
    return;
  }

  const syncVisibility = () => {
    if (localStorage.getItem('anchor_closed') === '1') {
      anchor.style.display = 'none';
      return;
    }

    const width = window.innerWidth || document.documentElement.clientWidth;
    let visible = width <= maxWidth;

    if (visible && window.visualViewport) {
      const keyboardOpen = window.visualViewport.height < window.innerHeight * 0.8;
      if (keyboardOpen) {
        visible = false;
      }
    }

    anchor.style.display = visible ? 'flex' : 'none';
  };

  syncVisibility();
  window.addEventListener('resize', syncVisibility);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', syncVisibility);
  }

  ensureMailAdsScript();
  pushMailAdTag();

  if (ins) {
    runVkFallbackForIns(ins, { slotKey: 'mobileAnchor' });
  }
}

if (typeof window !== 'undefined') {
  window.initMobileAnchorAd = initMobileAnchorAd;
}
