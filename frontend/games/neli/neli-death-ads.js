import { showGameFullscreenAd } from '/frontend/scripts/mail-ads-config.js';

function isNeliWebAdsAllowed() {
  try {
    if (window.__SPN_VK_MINI__ || window.__SPN_ANDROID_APP__) return false;
    if (document.documentElement?.classList?.contains('vk-mini-embed')) return false;
    if (document.documentElement?.classList?.contains('vk-mini-root')) return false;
    if (document.body?.classList?.contains('vk-mini-embed')) return false;
    if (document.body?.classList?.contains('vk-mini-app')) return false;
    if (document.body?.classList?.contains('android-app')) return false;
    if (/(?:^|[?&])(vk_mini=1|app=1)(?:&|$)/.test(window.location.search)) return false;
    if (/vk_app_id=\d+/.test(window.location.search)) return false;
  } catch (_) { /* ignore */ }
  return true;
}

window.neliShowDeathFullscreenAd = function (options = {}) {
  if (!isNeliWebAdsAllowed()) return;
  showGameFullscreenAd({
    continueLabel: options.continueLabel,
    onClose: options.onClose
  });
};
