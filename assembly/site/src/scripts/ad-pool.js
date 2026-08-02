import slotsData from './mail-ad-slots.json' with { type: 'json' };
import { ensureMailAdsScript, pushMailAdTag } from './mail-ads-loader.js';
import { ensureYandexAdsScript, onYandexReady } from './yandex-ads-loader.js';

const POOL_ENABLED = slotsData.pool?.enabled !== false;
const FALLBACK_MS = slotsData.pool?.fallbackTimeoutMs ?? 2500;
const MOBILE_MAX_WIDTH = slotsData.pool?.mobileMaxWidth ?? 768;
const POOL_PRIMARY = String(slotsData.pool?.primary || 'vk').toLowerCase() === 'yandex'
  ? 'yandex'
  : 'vk';

let yandexBannerSeq = 0;
let yandexFloorRequested = false;
let yandexTopAdRequested = false;

function isVkMiniContext() {
  try {
    if (window.__SPN_VK_MINI__) return true;
    if (document.documentElement?.classList?.contains('vk-mini-embed')) return true;
    if (document.documentElement?.classList?.contains('vk-mini-root')) return true;
    if (document.body?.classList?.contains('vk-mini-embed')) return true;
    if (document.body?.classList?.contains('vk-mini-app')) return true;
    if (/(?:^|[?&])vk_mini=1(?:&|$)/.test(window.location.search)) return true;
    if (/vk_app_id=\d+/.test(window.location.search)) return true;
    if (window.parent && window.parent !== window && window.parent.__SPN_VK_MINI__) return true;
  } catch (_) {}
  return false;
}

function isMobileViewport() {
  return (window.innerWidth || document.documentElement.clientWidth) <= MOBILE_MAX_WIDTH;
}

function documentHasTopSlotIns() {
  const topId = slotsData.slots.top?.id;
  if (!topId) {
    return false;
  }
  return Boolean(document.querySelector(`ins.mrg-tag[data-ad-slot="${topId}"]`));
}

export function isYandexPrimary() {
  return POOL_PRIMARY === 'yandex';
}

function renderYandexForSlot(slotKey, ins, container) {
  // Mobile Top Ad is sticky overlay (official type:topAd) — hide in-page top placeholders
  if (slotKey === 'top' && isMobileViewport()) {
    hideElement(ins);
    hideElement(container);
    return renderYandexTopAd();
  }

  if (slotKey === 'top' || slotKey === 'promoInfeed') {
    hideElement(ins);
    if (container?.classList?.contains('promo-ad-inline')) {
      container.classList.remove('is-collapsed');
      container.classList.add('ad-loading');
      const slot = container.querySelector('.promo-ad-inline__slot');
      if (slot) {
        slot.style.cssText = '';
      }
      container.style.cssText = '';
      container.style.display = 'block';
    }
    const mount = container?.querySelector?.('.promo-ad-inline__slot') || container;
    if (renderYandexBanner(slotKey, mount, container)) {
      watchAdContainerFill(container, 10000);
      return true;
    }
    hideElement(container);
    return false;
  }

  if (slotKey === 'mobileAnchor') {
    hideElement(ins.closest('#mobile-anchor-ad') || container);
    renderYandexFloorAd();
    return true;
  }

  hideElement(container);
  return false;
}

function isEmptyYandexStub(slot) {
  if (!slot) {
    return true;
  }
  const html = (slot.innerHTML || '').trim();
  if (!html) {
    return true;
  }
  // Unfilled CSR: tiny markup, no creative shell
  if (
    html.length < 150 &&
    !slot.querySelector('iframe, img, a, style, [data-container], yatag')
  ) {
    return true;
  }
  return false;
}

function rootHasRealCreative(root) {
  if (!root?.querySelector) {
    return false;
  }

  if (root.querySelector('iframe, video, canvas, object, embed')) {
    return true;
  }
  if (root.querySelector('img[src]')) {
    return true;
  }
  if (root.querySelector('a[href]:not([href=""]):not([href="#"])')) {
    return true;
  }
  if (root.querySelector('[data-container="outer"], yatag')) {
    return true;
  }

  const html = root.innerHTML || '';
  if (html.length > 400 && root.querySelector('style')) {
    return true;
  }

  const text = (root.innerText || '').replace(/\s+/g, ' ').trim();
  return text.length >= 20;
}

export function hasAdFill(element) {
  if (!element) {
    return false;
  }

  const yandexSlot = element.querySelector?.('.yandex-rtb-slot, [id^="yandex_rtb_"]');
  if (yandexSlot) {
    if (isEmptyYandexStub(yandexSlot)) {
      return false;
    }
    return rootHasRealCreative(yandexSlot) || (yandexSlot.innerHTML || '').length > 200;
  }

  // VK / Mail — never treat CSS min-height as fill
  return rootHasRealCreative(element);
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

  if (el.classList.contains('ad-banner') || el.classList.contains('ad-top-banner')) {
    el.classList.add('hidden');
    el.classList.remove('loading', 'ad-loaded');
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

  if (container.classList.contains('ad-banner') || container.classList.contains('ad-top-banner')) {
    container.classList.remove('loading');
    container.classList.add('ad-loaded');
    return;
  }

  if (container.classList.contains('promo-ad-inline')) {
    const slot = container.querySelector('.promo-ad-inline__slot');
    if (slot) {
      slot.style.cssText = '';
    }
    container.classList.remove('ad-loading', 'is-collapsed');
    container.classList.add('ad-loaded');
    container.style.cssText = '';
    container.style.display = 'block';
  }
}

function watchAdContainerFill(container, timeoutMs = 10000) {
  if (!container || container.__adFillWatching) {
    return;
  }
  container.__adFillWatching = true;

  const started = Date.now();

  const tick = () => {
    if (container.__adFillResolved) {
      return;
    }

    if (container.__yandexRendered) {
      resolveAdContainer(container, true);
      return;
    }

    if (hasAdFill(container)) {
      resolveAdContainer(container, true);
      return;
    }

    if (Date.now() - started >= timeoutMs) {
      if (container.__yandexRendered) {
        resolveAdContainer(container, true);
        return;
      }
      // Promo infeed: never drop a card that already looks painted; only clear empty stubs
      if (container.classList?.contains('promo-ad-inline')) {
        const slot = container.querySelector('.yandex-rtb-slot, [id^="yandex_rtb_"]');
        if (!isEmptyYandexStub(slot)) {
          resolveAdContainer(container, true);
          return;
        }
      }
      resolveAdContainer(container, false);
      return;
    }

    setTimeout(tick, 300);
  };

  tick();
}

function resolveAdContainer(container, ok) {
  if (!container || container.__adFillResolved) {
    return;
  }
  container.__adFillResolved = true;
  if (ok) {
    markAdContainerLoaded(container);
  } else {
    hideElement(container);
  }
}

export function renderYandexBanner(slotKey, container, fillRoot = null) {
  const cfg = slotsData.slots[slotKey]?.yandex;
  if (!cfg?.blockId || !container) {
    return false;
  }

  if (cfg.mobileOnly && !isMobileViewport()) {
    return false;
  }

  const resolvedRoot = fillRoot || container;
  const pageNumber = ++yandexBannerSeq;
  const renderToId = `yandex_rtb_${cfg.blockId.replace(/-/g, '_')}_${pageNumber}`;
  const target = document.createElement('div');
  target.id = renderToId;
  target.className = 'yandex-rtb-slot';
  container.appendChild(target);

  ensureYandexAdsScript();
  onYandexReady(() => {
    try {
      // Official RSЯ API:
      // - onRender → ad was drawn — KEEP (do not second-guess via DOM heuristics)
      // - 2nd callback → no fill — REMOVE
      window.Ya.Context.AdvManager.render(
        {
          blockId: cfg.blockId,
          renderTo: renderToId,
          pageNumber,
          onRender: () => {
            resolvedRoot.__yandexRendered = true;
            resolveAdContainer(resolvedRoot, true);
          }
        },
        () => {
          // no-fill can race ahead of onRender — wait briefly so a real render wins
          setTimeout(() => {
            if (resolvedRoot.__yandexRendered || resolvedRoot.__adFillResolved) {
              return;
            }
            resolveAdContainer(resolvedRoot, false);
          }, 750);
        }
      );
    } catch (_) {
      if (!resolvedRoot.__yandexRendered) {
        resolveAdContainer(resolvedRoot, false);
      }
    }
  });

  return true;
}

export function renderYandexFloorAd() {
  if (isVkMiniContext()) return false;
  const cfg = slotsData.slots.mobileAnchor?.yandex;
  // Yandex forbids Top Ad + Floor Ad on the same page — prefer Top Ad when top slot exists
  if (
    !cfg?.blockId ||
    yandexFloorRequested ||
    yandexTopAdRequested ||
    !isMobileViewport() ||
    documentHasTopSlotIns()
  ) {
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

export function renderYandexTopAd() {
  if (isVkMiniContext()) return false;
  const cfg = slotsData.slots.topMobile?.yandex;
  if (
    !cfg?.blockId ||
    yandexTopAdRequested ||
    yandexFloorRequested ||
    !isMobileViewport()
  ) {
    return false;
  }

  yandexTopAdRequested = true;
  ensureYandexAdsScript();
  onYandexReady(() => {
    try {
      // Official Top Ad snippet: blockId + type only (no renderTo / platform)
      window.Ya.Context.AdvManager.render({
        blockId: cfg.blockId,
        type: cfg.type || 'topAd'
      });
    } catch (_) {}
  });

  return true;
}

export function renderYandexFullscreen(options = {}) {
  if (isVkMiniContext()) return false;
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

  if (isVkMiniContext()) {
    const container = getAdContainer(ins);
    hideElement(ins);
    hideElement(container);
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

  // Yandex first: skip VK wait so the user is not held ~2.5s on empty Mail slots.
  if (POOL_PRIMARY === 'yandex') {
    renderYandexForSlot(slotKey, ins, container);
    return;
  }

  ensureMailAdsScript();
  const filled = await waitForFill(ins, options.timeoutMs ?? FALLBACK_MS);

  if (filled) {
    markAdContainerLoaded(container);
    return;
  }

  renderYandexForSlot(slotKey, ins, container);
}

export function initAdSlotObserver() {
  if (isVkMiniContext()) {
    document.querySelectorAll('ins.mrg-tag, .ad-top-banner, .mobile-anchor-ad, .ad-container').forEach((el) => {
      hideElement(el);
    });
    return;
  }

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

export { slotsData as AD_POOL_SLOTS, POOL_ENABLED, POOL_PRIMARY };
