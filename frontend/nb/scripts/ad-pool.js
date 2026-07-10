import slotsData from './mail-ad-slots.json' with { type: 'json' };
import { ensureMailAdsScript, pushMailAdTag } from './mail-ads-loader.js';
import { ensureYandexAdsScript, onYandexReady } from './yandex-ads-loader.js';

const POOL_ENABLED = slotsData.pool?.enabled !== false;
const FALLBACK_MS = slotsData.pool?.fallbackTimeoutMs ?? 2500;
const MOBILE_MAX_WIDTH = slotsData.pool?.mobileMaxWidth ?? 768;

let yandexBannerSeq = 0;
let yandexFloorRequested = false;

function isMobileViewport() {
  return (window.innerWidth || document.documentElement.clientWidth) <= MOBILE_MAX_WIDTH;
}

export function hasAdFill(element) {
  if (!element) {
    return false;
  }

  return !!(
    element.querySelector('iframe') ||
    element.querySelector('img[src*="yandex"]') ||
    element.offsetHeight > 50
  );
}

export function getSlotKeyFromIns(ins) {
  const slotId = ins.getAttribute('data-ad-slot');
  if (!slotId) {
    return null;
  }

  for (const [key, slot] of Object.entries(slotsData.slots)) {
    if (slot.id === slotId) {
      return key;
    }
  }

  return null;
}

function hidePromoAdContainer(el) {
  if (!el) {
    return;
  }
  el.classList.add('is-collapsed');
  el.remove();
}

function hideElement(el) {
  if (!el) {
    return;
  }

  if (el.classList.contains('promo-ad-inline')) {
    hidePromoAdContainer(el);
    return;
  }

  el.style.display = 'none';
}

function revealAdContainer(container) {
  if (!container?.classList?.contains('promo-ad-inline')) {
    return;
  }

  container.classList.remove('is-collapsed');
  container.classList.add('ad-loading');
}

function getAdContainer(ins) {
  return ins.closest(
    '.ad-top-banner,.ad-banner,.ad-container,.ad-leaderboard,.promo-ad-inline'
  ) || ins.parentElement;
}

function markAdContainerLoaded(container) {
  if (!container) {
    return;
  }

  if (container.classList.contains('promo-ad-inline')) {
    const slot = container.querySelector('.promo-ad-inline__slot');
    if (slot) {
      slot.style.position = '';
      slot.style.left = '';
      slot.style.width = '';
      slot.style.height = '';
    }
    container.classList.remove('ad-loading', 'is-collapsed');
    container.classList.add('ad-loaded');
  }
}

function watchAdContainerFill(container, timeoutMs = 6500) {
  if (!container) {
    return;
  }

  const started = Date.now();

  const tick = () => {
    if (hasAdFill(container)) {
      markAdContainerLoaded(container);
      return;
    }

    if (Date.now() - started >= timeoutMs) {
      hideElement(container);
      return;
    }

    setTimeout(tick, 300);
  };

  tick();
}

export function renderYandexBanner(slotKey, container) {
  const cfg = slotsData.slots[slotKey]?.yandex;
  if (!cfg?.blockId || !container) {
    return false;
  }

  if (cfg.mobileOnly && !isMobileViewport()) {
    return false;
  }

  const renderToId = `yandex_rtb_${cfg.blockId.replace(/-/g, '_')}_${++yandexBannerSeq}`;
  const target = document.createElement('div');
  target.id = renderToId;
  target.className = 'yandex-rtb-slot';
  container.appendChild(target);

  ensureYandexAdsScript();
  onYandexReady(() => {
    try {
      window.Ya.Context.AdvManager.render({
        blockId: cfg.blockId,
        renderTo: renderToId
      });
    } catch (_) {}
  });

  return true;
}

export function renderYandexFloorAd() {
  const cfg = slotsData.slots.mobileAnchor?.yandex;
  if (!cfg?.blockId || yandexFloorRequested || !isMobileViewport()) {
    return false;
  }

  yandexFloorRequested = true;
  ensureYandexAdsScript();
  onYandexReady(() => {
    try {
      window.Ya.Context.AdvManager.render({
        blockId: cfg.blockId,
        type: cfg.type || 'floorAd',
        platform: cfg.platform || 'touch'
      });
    } catch (_) {}
  });

  return true;
}

export function renderYandexFullscreen(options = {}) {
  const cfg = slotsData.slots.fullscreen?.yandex;
  if (!cfg?.blockId) {
    return false;
  }

  if (cfg.mobileOnly && !isMobileViewport()) {
    return false;
  }

  ensureYandexAdsScript();
  onYandexReady(() => {
    try {
      const params = {
        blockId: cfg.blockId,
        type: cfg.type || 'fullscreen',
        platform: cfg.platform || 'touch'
      };

      if (typeof options.onClose === 'function') {
        params.onClose = options.onClose;
      }

      window.Ya.Context.AdvManager.render(params);
    } catch (_) {
      if (typeof options.onClose === 'function') {
        options.onClose();
      }
    }
  });

  return true;
}

export function waitForFill(ins, timeoutMs = FALLBACK_MS) {
  return new Promise((resolve) => {
    const started = Date.now();

    const tick = () => {
      if (hasAdFill(ins)) {
        resolve(true);
        return;
      }

      if (Date.now() - started >= timeoutMs) {
        resolve(false);
        return;
      }

      setTimeout(tick, 250);
    };

    pushMailAdTag();
    setTimeout(tick, 400);
  });
}

async function legacyNoFillHide(ins) {
  ensureMailAdsScript();
  const container = getAdContainer(ins);
  revealAdContainer(container);
  const filled = await waitForFill(ins);

  if (filled) {
    markAdContainerLoaded(container);
    return;
  }

  hideElement(container);
}

export async function runVkFallbackForIns(ins, options = {}) {
  if (!ins || ins.__adPoolHandled) {
    return;
  }

  ins.__adPoolHandled = true;

  const slotKey = options.slotKey || getSlotKeyFromIns(ins);
  if (!slotKey) {
    return;
  }

  const container = getAdContainer(ins);
  revealAdContainer(container);

  const yandexCfg = slotsData.slots[slotKey]?.yandex;
  if (!POOL_ENABLED || !yandexCfg?.blockId) {
    await legacyNoFillHide(ins);
    return;
  }

  ensureMailAdsScript();
  const filled = await waitForFill(ins, options.timeoutMs ?? FALLBACK_MS);

  if (filled) {
    markAdContainerLoaded(container);
    return;
  }

  if (slotKey === 'top' || slotKey === 'promoInfeed') {
    hideElement(ins);
    if (renderYandexBanner(slotKey, container)) {
      watchAdContainerFill(container, 5000);
    } else {
      hideElement(container);
    }
    return;
  }

  if (slotKey === 'mobileAnchor') {
    hideElement(ins.closest('#mobile-anchor-ad'));
    renderYandexFloorAd();
    return;
  }

  hideElement(container);
}

export function initAdSlotObserver() {
  document.querySelectorAll('ins.mrg-tag').forEach((ins) => {
    runVkFallbackForIns(ins);
  });

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes?.forEach((node) => {
        if (node.nodeType !== 1) {
          return;
        }

        if (node.matches?.('ins.mrg-tag')) {
          runVkFallbackForIns(node);
        }

        node.querySelectorAll?.('ins.mrg-tag').forEach(runVkFallbackForIns);
      });
    });
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
}

export { slotsData as AD_POOL_SLOTS, POOL_ENABLED };
