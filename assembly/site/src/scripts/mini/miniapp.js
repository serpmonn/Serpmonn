/**
 * Serpmonn VK Mini App shell
 * Tabs, onboarding, in-app viewer, external-link guard
 */
(function () {
  'use strict';

  const ROOT = document.querySelector('.vk-mini-shell');
  if (!ROOT) return;

  window.__SPN_VK_MINI__ = true;

  const cfg = window.__SPN_MINI_CFG__ || {};
  const storageKey = (cfg.onboarding && cfg.onboarding.storageKey) || 'spn_vk_mini_onboarded_v1';

  const screens = ROOT.querySelectorAll('.vk-mini-screen');
  const navBtns = ROOT.querySelectorAll('.vk-mini-nav [data-screen]');
  const viewer = document.getElementById('vk-mini-viewer');
  const viewerFrame = document.getElementById('vk-mini-viewer-frame');
  const viewerTitle = document.getElementById('vk-mini-viewer-title');
  const viewerBack = document.getElementById('vk-mini-viewer-back');
  const onboarding = document.getElementById('vk-mini-onboarding');

  function isExternalUrl(href) {
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return false;
    try {
      const u = new URL(href, location.origin);
      if (u.origin === location.origin) return false;
      return true;
    } catch {
      return true;
    }
  }

  function withMiniParam(href) {
    try {
      const u = new URL(href, location.origin);
      u.searchParams.set('vk_mini', '1');
      if (!u.searchParams.has('vk_app_id') && cfg.appId) {
        u.searchParams.set('vk_app_id', String(cfg.appId));
      }
      return u.pathname + u.search + u.hash;
    } catch {
      return href;
    }
  }

  function showScreen(name) {
    screens.forEach((el) => {
      el.classList.toggle('is-active', el.dataset.screen === name);
    });
    navBtns.forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.screen === name);
    });
    try {
      history.replaceState(null, '', '#' + name);
    } catch (_) {}
  }

  function openViewer(href, title) {
    if (!viewer || !viewerFrame) return;
    viewerTitle.textContent = title || '';
    viewerFrame.src = withMiniParam(href);
    viewer.classList.add('is-open');
    viewer.setAttribute('aria-hidden', 'false');
  }

  function closeViewer() {
    if (!viewer || !viewerFrame) return;
    viewer.classList.remove('is-open');
    viewer.setAttribute('aria-hidden', 'true');
    viewerFrame.src = 'about:blank';
  }

  function hardenIframeDocument(doc) {
    if (!doc || !doc.body) return;
    doc.body.classList.add('vk-mini-embed');

    const style = doc.createElement('style');
    style.textContent = `
      #menuContainer, #menuButton, .cookie-consent, #cookie-consent,
      .donate-button, .ad-leaderboard, .mobile-anchor-ad,
      a[href*="donate"], a[href*="/promo"], #installAppButton { display:none !important; }
    `;
    doc.head.appendChild(style);

    doc.addEventListener(
      'click',
      (e) => {
        const a = e.target.closest && e.target.closest('a[href]');
        if (!a) return;
        const href = a.getAttribute('href') || '';
        if (isExternalUrl(href) || /donate|promo|telegram|t\.me|max\.ru|ok\.ru/i.test(href)) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
      true
    );
  }

  function initNav() {
    navBtns.forEach((btn) => {
      btn.addEventListener('click', () => showScreen(btn.dataset.screen));
    });

    const hash = (location.hash || '').replace(/^#/, '');
    if (hash && ROOT.querySelector(`.vk-mini-screen[data-screen="${hash}"]`)) {
      showScreen(hash);
    } else {
      showScreen('search');
    }
  }

  function initOpeners() {
    ROOT.querySelectorAll('[data-open-url]').forEach((el) => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        openViewer(el.getAttribute('data-open-url'), el.getAttribute('data-open-title') || el.textContent.trim());
      });
    });
  }

  function initViewer() {
    if (viewerBack) viewerBack.addEventListener('click', closeViewer);
    if (viewerFrame) {
      viewerFrame.addEventListener('load', () => {
        try {
          hardenIframeDocument(viewerFrame.contentDocument);
        } catch (err) {
          console.warn('vk-mini iframe harden failed', err);
        }
      });
    }
  }

  function initOnboarding() {
    if (!onboarding) return;
    let seen = false;
    try {
      seen = localStorage.getItem(storageKey) === '1';
    } catch (_) {}
    if (seen) return;

    const slides = onboarding.querySelectorAll('.vk-mini-onboarding__slide');
    const dots = onboarding.querySelectorAll('.vk-mini-onboarding__dots span');
    const btnNext = onboarding.querySelector('[data-onboard-next]');
    const btnSkip = onboarding.querySelector('[data-onboard-skip]');
    let idx = 0;

    const render = () => {
      slides.forEach((s, i) => s.hidden = i !== idx);
      dots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
      if (btnNext) {
        const last = idx >= slides.length - 1;
        btnNext.textContent = last
          ? (cfg.onboarding && cfg.onboarding.done) || 'Начать'
          : (cfg.onboarding && cfg.onboarding.next) || 'Далее';
      }
    };

    const finish = () => {
      try {
        localStorage.setItem(storageKey, '1');
      } catch (_) {}
      onboarding.classList.remove('is-open');
      onboarding.setAttribute('aria-hidden', 'true');
    };

    if (btnNext) {
      btnNext.addEventListener('click', () => {
        if (idx >= slides.length - 1) finish();
        else {
          idx += 1;
          render();
        }
      });
    }
    if (btnSkip) btnSkip.addEventListener('click', finish);

    render();
    onboarding.classList.add('is-open');
    onboarding.setAttribute('aria-hidden', 'false');
  }

  function initBridge() {
    const bridge = window.vkBridge;
    if (bridge && typeof bridge.send === 'function') {
      bridge.send('VKWebAppInit').catch(() => {});
    }
  }

  // Guard top-level external navigations inside the mini shell
  document.addEventListener(
    'click',
    (e) => {
      const a = e.target.closest && e.target.closest('a[href]');
      if (!a || a.closest('.vk-mini-viewer')) return;
      const href = a.getAttribute('href') || '';
      if (isExternalUrl(href)) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true
  );

  initBridge();
  initNav();
  initOpeners();
  initViewer();
  initOnboarding();

  window.spnVkMiniOpen = openViewer;
  window.spnVkMiniClose = closeViewer;
})();
