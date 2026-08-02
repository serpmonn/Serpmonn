import { ensureMailAdsScript } from './mail-ads-loader.js';
import { pushMailAdTag } from './mail-ads-config.js';
import { isYandexPrimary, runVkFallbackForIns } from './ad-pool.js';

function isVkMiniContext() {
  try {
    if (window.__SPN_VK_MINI__) return true;
    if (document.documentElement?.classList?.contains('vk-mini-embed')) return true;
    if (/(?:^|[?&])vk_mini=1(?:&|$)/.test(window.location.search)) return true;
    if (/vk_app_id=\d+/.test(window.location.search)) return true;
    if (window.parent && window.parent !== window && window.parent.__SPN_VK_MINI__) return true;
  } catch (_) {}
  return false;
}

function isAndroidAppContext() {
  try {
    if (window.__SPN_ANDROID_APP__) return true;
    if (document.documentElement?.classList?.contains('android-app')) return true;
    if (document.body?.classList?.contains('android-app')) return true;
    if (/(?:^|[?&])app=1(?:&|$)/.test(window.location.search)) return true;
    if (window.parent && window.parent !== window && window.parent.__SPN_ANDROID_APP__) return true;
  } catch (_) {}
  return false;
}

export function initMobileAnchorAd(options = {}) {
  const anchorId = options.id || 'mobile-anchor-ad';
  const maxWidth = options.maxWidth ?? 768;

  if (isVkMiniContext() || isAndroidAppContext()) {
    const anchor = document.getElementById(anchorId);
    if (anchor) anchor.style.display = 'none';
    return;
  }

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
