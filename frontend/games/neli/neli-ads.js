(function () {
  const layer = document.getElementById('neli-ad-layer');
  if (!layer) return;

  const rails = {
    root: document.getElementById('neli-ad-rails'),
    top: layer.querySelector('.neli-ad-rail--top'),
    left: layer.querySelector('.neli-ad-rail--left'),
    right: layer.querySelector('.neli-ad-rail--right')
  };

  const surround = {
    root: document.getElementById('neli-ad-surround'),
    top: layer.querySelector('.neli-ad-surround--top'),
    bottom: layer.querySelector('.neli-ad-surround--bottom'),
    left: layer.querySelector('.neli-ad-surround--left'),
    right: layer.querySelector('.neli-ad-surround--right')
  };

  const GAP = 10;
  const SIDE_MIN = 720;
  const UI_IDS = ['screen-title', 'screen-menu', 'screen-msg', 'screen-dialogue', 'hud', 'touch-ui'];

  function viewportW() {
    return window.visualViewport?.width || window.innerWidth;
  }

  function isMobileNarrow() {
    return viewportW() < SIDE_MIN;
  }

  function canUseSideSlots() {
    return viewportW() >= SIDE_MIN;
  }

  function isNoAdsContext() {
    try {
      if (window.__SPN_VK_MINI__ || window.__SPN_ANDROID_APP__) return true;
      if (document.documentElement?.classList?.contains('vk-mini-embed')) return true;
      if (document.documentElement?.classList?.contains('vk-mini-root')) return true;
      if (document.body?.classList?.contains('vk-mini-embed')) return true;
      if (document.body?.classList?.contains('vk-mini-app')) return true;
      if (document.body?.classList?.contains('android-app')) return true;
      if (/(?:^|[?&])(vk_mini=1|app=1)(?:&|$)/.test(window.location.search)) return true;
      if (/vk_app_id=\d+/.test(window.location.search)) return true;
    } catch (_) { /* ignore */ }
    return false;
  }

  function rectsOverlap(a, b, pad = 0) {
    if (!a || !b || a.width === 0 || b.width === 0) return false;
    return !(a.right + pad <= b.left
      || a.left - pad >= b.right
      || a.bottom + pad <= b.top
      || a.top - pad >= b.bottom);
  }

  function getUiRects() {
    const rects = [];
    UI_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (el && !el.hidden) rects.push(el.getBoundingClientRect());
    });
    ['menuCorner', 'menuButton', 'activityBellBtn'].forEach((id) => {
      const el = document.getElementById(id);
      if (!el || el.hidden) return;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) rects.push(r);
    });
    return rects;
  }

  function slotFits(el, extraForbidden = []) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    const vw = window.visualViewport?.width || window.innerWidth;
    const vh = window.visualViewport?.height || window.innerHeight;
    if (r.left < 4 || r.top < 4 || r.right > vw - 4 || r.bottom > vh - 4) return false;
    const forbidden = getUiRects().concat(extraForbidden);
    return !forbidden.some((f) => rectsOverlap(r, f, GAP));
  }

  function hideEl(el) {
    if (el) el.hidden = true;
  }

  function placeEl(el, x, y, transform) {
    if (!el) return;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.transform = transform;
    el.hidden = false;
  }

  function tryPlace(el, x, y, transform, extraForbidden = []) {
    if (!el) return;
    placeEl(el, x, y, transform);
    if (!slotFits(el, extraForbidden)) hideEl(el);
  }

  function getSurroundAnchor() {
    const title = document.getElementById('screen-title');
    const menu = document.getElementById('screen-menu');
    const msg = document.getElementById('screen-msg');
    if (title && !title.hidden) return title;
    if (menu && !menu.hidden) return menu;
    if (msg && !msg.hidden) return msg;
    return null;
  }

  function isRailsPhase() {
    const title = document.getElementById('screen-title');
    const hud = document.getElementById('hud');
    const menu = document.getElementById('screen-menu');
    const msg = document.getElementById('screen-msg');
    if (title && !title.hidden) return false;
    if (menu && !menu.hidden) return false;
    if (msg && !msg.hidden) return false;
    return hud && !hud.hidden;
  }

  function hideAllAds() {
    hideEl(rails.root);
    hideEl(rails.top);
    hideEl(rails.left);
    hideEl(rails.right);
    hideEl(surround.root);
    hideEl(surround.top);
    hideEl(surround.bottom);
    hideEl(surround.left);
    hideEl(surround.right);
  }

  function layoutSurround(anchor, topBottomOnly) {
    if (!anchor || !surround.root) {
      hideEl(surround.root);
      return;
    }

    surround.root.hidden = false;
    const rect = anchor.getBoundingClientRect();
    const block = [rect];

    tryPlace(
      surround.top,
      rect.left + rect.width / 2,
      rect.top - GAP,
      'translate(-50%, -100%)',
      block
    );
    tryPlace(
      surround.bottom,
      rect.left + rect.width / 2,
      rect.bottom + GAP,
      'translate(-50%, 0)',
      block
    );

    if (topBottomOnly) {
      hideEl(surround.left);
      hideEl(surround.right);
      return;
    }

    if (canUseSideSlots()) {
      tryPlace(
        surround.left,
        rect.left - GAP,
        rect.top + rect.height / 2,
        'translate(-100%, -50%)',
        block
      );
      tryPlace(
        surround.right,
        rect.right + GAP,
        rect.top + rect.height / 2,
        'translate(0, -50%)',
        block
      );
    } else {
      hideEl(surround.left);
      hideEl(surround.right);
    }
  }

  function layoutRails() {
    if (!isRailsPhase() || !rails.root) {
      hideEl(rails.root);
      return;
    }

    rails.root.hidden = false;
    const vh = window.visualViewport?.height || window.innerHeight;
    const vw = viewportW();

    hideEl(rails.top);
    tryPlace(rails.left, GAP, vh / 2, 'translate(0, -50%)');
    tryPlace(rails.right, vw - GAP, vh / 2, 'translate(-100%, -50%)');
  }

  function layoutMobilePauseBar() {
    const menu = document.getElementById('screen-menu');
    if (!menu || menu.hidden || !surround.root) {
      return false;
    }

    surround.root.hidden = false;
    layer.classList.add('is-surround');
    hideEl(surround.left);
    hideEl(surround.right);

    const vw = viewportW();
    const vh = window.visualViewport?.height || window.innerHeight;
    const menuRect = menu.getBoundingClientRect();

    hideEl(surround.top);
    hideEl(surround.bottom);

    tryPlace(surround.top, vw / 2, GAP, 'translate(-50%, 0)');
    if (!surround.top.hidden) {
      return true;
    }

    tryPlace(surround.bottom, vw / 2, vh - GAP, 'translate(-50%, -100%)');
    if (!surround.bottom.hidden) {
      return true;
    }

    // fallback: opposite side of pause panel
    if (menuRect.top > vh / 2) {
      tryPlace(surround.top, vw / 2, GAP, 'translate(-50%, 0)', []);
    } else {
      tryPlace(surround.bottom, vw / 2, vh - GAP, 'translate(-50%, -100%)', []);
    }

    return !surround.top.hidden || !surround.bottom.hidden;
  }

  function scheduleAdMount() {
    requestAnimationFrame(() => {
      if (layer.hidden || isNoAdsContext()) return;
      import('/frontend/scripts/ad-pool.js')
        .then(({ runVkFallbackForIns }) => {
          layer.querySelectorAll('.neli-ad-slot:not([hidden]) ins.mrg-tag').forEach((ins) => {
            const container = ins.closest('.ad-container');
            if (!container) return;
            if (ins.__adPoolHandled && container.style.display === 'none') {
              delete ins.__adPoolHandled;
              delete container.__adFillResolved;
              delete container.__yandexRendered;
              delete container.__adFillWatching;
              ins.style.display = 'inline-block';
              container.style.display = '';
              container.querySelectorAll('.yandex-rtb-slot').forEach((node) => node.remove());
            }
            if (!ins.__adPoolHandled) {
              runVkFallbackForIns(ins);
            }
          });
        })
        .catch(() => {});
    });
  }

  function syncLayout() {
    if (isNoAdsContext()) {
      layer.hidden = true;
      layer.classList.remove('is-surround');
      layer.setAttribute('aria-hidden', 'true');
      hideAllAds();
      return;
    }

    if (isMobileNarrow()) {
      const title = document.getElementById('screen-title');
      const menu = document.getElementById('screen-menu');
      const msg = document.getElementById('screen-msg');
      const titleOpen = title && !title.hidden;
      const menuOpen = menu && !menu.hidden;
      const gameoverOpen = msg && !msg.hidden && msg.classList.contains('panel--gameover');

      hideEl(rails.root);
      hideEl(rails.top);
      hideEl(rails.left);
      hideEl(rails.right);

      let showLayer = false;

      if (titleOpen) {
        layer.classList.add('is-surround');
        layoutSurround(title, true);
        showLayer = true;
      } else if (menuOpen) {
        showLayer = layoutMobilePauseBar();
        if (!showLayer) layer.classList.remove('is-surround');
      } else if (gameoverOpen) {
        layer.classList.add('is-surround');
        layoutSurround(msg, true);
        showLayer = true;
      } else {
        layer.classList.remove('is-surround');
        hideEl(surround.root);
        hideEl(surround.top);
        hideEl(surround.bottom);
        hideEl(surround.left);
        hideEl(surround.right);
      }

      layer.hidden = !showLayer;
      layer.setAttribute('aria-hidden', showLayer ? 'false' : 'true');
      if (showLayer) scheduleAdMount();
      return;
    }

    layer.hidden = false;
    layer.setAttribute('aria-hidden', 'false');

    const anchor = getSurroundAnchor();
    if (anchor) {
      layer.classList.add('is-surround');
      layoutSurround(anchor, false);
      hideEl(rails.root);
      hideEl(rails.top);
      hideEl(rails.left);
      hideEl(rails.right);
    } else {
      layer.classList.remove('is-surround');
      hideEl(surround.root);
      hideEl(surround.top);
      hideEl(surround.bottom);
      hideEl(surround.left);
      hideEl(surround.right);
      layoutRails();
    }
    scheduleAdMount();
  }

  function refresh() {
    requestAnimationFrame(syncLayout);
  }

  window.neliRefreshOverlayAds = refresh;

  window.addEventListener('resize', refresh, { passive: true });
  window.visualViewport?.addEventListener('resize', refresh, { passive: true });
  document.addEventListener('DOMContentLoaded', refresh);
  refresh();
})();
