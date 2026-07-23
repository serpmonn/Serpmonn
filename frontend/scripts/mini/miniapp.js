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
  const viewerTitle = document.getElementById('vk-mini-viewer-title');
  const viewerBack = document.getElementById('vk-mini-viewer-back');
  const onboarding = document.getElementById('vk-mini-onboarding');
  let viewerFrame = document.getElementById('vk-mini-viewer-frame');
  let viewerOpenUrl = '';
  let viewerHistoryPushed = false;

  function getVkBridge() {
    return window.vkBridge || window.bridge || null;
  }

  function setVkSwipeHistory(enabled) {
    const bridge = getVkBridge();
    if (!bridge || typeof bridge.send !== 'function') return;
    // history:false — отключает системный свайп «назад» в клиенте VK
    bridge.send('VKWebAppSetSwipeSettings', { history: Boolean(enabled) }).catch(() => {});
  }

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
      const url = new URL(window.location.href);
      url.hash = name;
      history.replaceState(null, '', url.pathname + url.search + url.hash);
    } catch (_) {}
  }

  function bindViewerFrameLoad(frame) {
    frame.addEventListener('load', () => {
      try {
        const href = frame.contentWindow && frame.contentWindow.location.href;
        if (!href || href === 'about:blank') {
          // Свайп «назад» внутри iframe → пустой экран: закрываем viewer
          if (viewer && viewer.classList.contains('is-open')) {
            closeViewer({ fromBlank: true });
          }
          return;
        }
        hardenIframeDocument(frame.contentDocument);
      } catch (err) {
        // cross-origin — ок
        console.warn('vk-mini iframe harden failed', err);
      }
    });
  }

  function resetViewerFrame() {
    if (!viewerFrame || !viewerFrame.parentNode) return viewerFrame;
    const neo = document.createElement('iframe');
    neo.id = 'vk-mini-viewer-frame';
    neo.title = viewerFrame.title || 'Содержимое';
    neo.setAttribute('referrerpolicy', 'same-origin');
    viewerFrame.replaceWith(neo);
    viewerFrame = neo;
    bindViewerFrameLoad(viewerFrame);
    return viewerFrame;
  }

  function isGameUrl(href) {
    try {
      const u = new URL(href, location.origin);
      return /\/frontend\/(?:[a-z0-9-]+\/)?games\//i.test(u.pathname);
    } catch {
      return /\/games\//i.test(String(href || ''));
    }
  }

  function openViewer(href, title) {
    if (!viewer) return;
    viewerTitle.textContent = title || '';
    viewerOpenUrl = withMiniParam(href);
    viewer.classList.toggle('is-game', isGameUrl(href));
    resetViewerFrame();
    viewerFrame.src = viewerOpenUrl;
    viewer.classList.add('is-open');
    viewer.setAttribute('aria-hidden', 'false');
    setVkSwipeHistory(false);
    // Не пушим history — свайп вправо иначе уходит на пустой экран
    viewerHistoryPushed = false;
  }

  function closeViewer(opts) {
    if (!viewer) return;
    viewer.classList.remove('is-open');
    viewer.classList.remove('is-game');
    viewer.setAttribute('aria-hidden', 'true');
    viewerOpenUrl = '';
    if (viewerFrame) {
      try {
        viewerFrame.removeAttribute('src');
      } catch (_) {}
    }
    viewerHistoryPushed = false;
    setVkSwipeHistory(true);
  }

  function hardenIframeDocument(doc) {
    if (!doc || !doc.documentElement) return;
    doc.documentElement.classList.add('vk-mini-embed');
    if (doc.body) doc.body.classList.add('vk-mini-embed');
    try {
      doc.defaultView.__SPN_VK_MINI__ = true;
    } catch (_) {}

    // Гарантируем mobile viewport внутри iframe
    let vp = doc.querySelector('meta[name="viewport"]');
    if (!vp) {
      vp = doc.createElement('meta');
      vp.setAttribute('name', 'viewport');
      doc.head.appendChild(vp);
    }
    vp.setAttribute(
      'content',
      'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
    );

    // Рекламные скрипты/теги — вырезаем (п. правил каталога / без сторонней рекламы)
    try {
      doc.querySelectorAll(
        'script[src*="ad.mail.ru"], script[src*="ads-async"], script[src*="yandex.ru/ads"], script[src*="an.yandex.ru"], .mrg-tag, ins.mrg-tag, #game-ad-overlay, .ad-leaderboard, .mobile-anchor-ad, .ad-container, .ad-top-banner'
      ).forEach((el) => el.remove());
    } catch (_) {}

    const style = doc.createElement('style');
    style.setAttribute('data-vk-mini-embed', '1');
    style.textContent = `
      /* Прокрутка внутри iframe: html скроллит, body растёт по контенту */
      html.vk-mini-embed {
        width: 100% !important;
        max-width: 100% !important;
        height: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow-x: hidden !important;
        overflow-y: scroll !important;
        -webkit-overflow-scrolling: touch !important;
        overscroll-behavior-y: contain !important;
        touch-action: pan-y manipulation !important;
        -webkit-text-size-adjust: 100% !important;
      }
      body.vk-mini-embed {
        width: 100% !important;
        max-width: 100% !important;
        height: auto !important;
        min-height: 100% !important;
        max-height: none !important;
        margin: 0 !important;
        padding: 0 0 28px !important;
        overflow: visible !important;
        touch-action: pan-y manipulation !important;
        -webkit-text-size-adjust: 100% !important;
      }
      #menuContainer, #menuButton, .menu-container, .cookie-consent, #cookie-consent,
      .donate-button, .ad-leaderboard, .mobile-anchor-ad, .ad-container, .ad-top-banner,
      .mrg-tag, ins.mrg-tag, [id*="mail-ad"], [class*="mail-ad"], #game-ad-overlay,
      a[href*="donate"], a[href*="/promo"], #installAppButton,
      .accessibility-widget, #a11y-widget { display:none !important; }

      /* Игры: одна колонка, без огромных полей */
      body.vk-mini-embed .page,
      body.vk-mini-embed .container,
      body.vk-mini-embed .game-wrapper,
      body.vk-mini-embed .main-content {
        max-width: 100% !important;
        width: 100% !important;
        margin: 0 auto !important;
        padding: 8px !important;
        box-sizing: border-box !important;
        overflow: visible !important;
        height: auto !important;
        max-height: none !important;
      }
      body.vk-mini-embed .wrap {
        display: flex !important;
        flex-direction: column !important;
        gap: 10px !important;
        width: 100% !important;
        overflow: visible !important;
        height: auto !important;
      }
      /* Панель со Старт/Заново — сверху, чтобы не уезжала под canvas */
      body.vk-mini-embed .wrap > .panel:last-child {
        order: -1 !important;
        position: sticky !important;
        top: 0 !important;
        z-index: 30 !important;
        background: #141416 !important;
      }
      /* Кнопки Старт/Заново/пауза обязаны быть видны (раньше их скрывали) */
      body.vk-mini-embed .controls {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 8px !important;
        justify-content: center !important;
        margin: 8px 0 !important;
        visibility: visible !important;
        opacity: 1 !important;
      }
      body.vk-mini-embed .btn,
      body.vk-mini-embed button.btn,
      body.vk-mini-embed #btnStart,
      body.vk-mini-embed #btnReset,
      body.vk-mini-embed #btnPause,
      body.vk-mini-embed #btnNewGame,
      body.vk-mini-embed #restartBtn,
      body.vk-mini-embed #pauseBtn,
      body.vk-mini-embed #leaderboardBtn {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        visibility: visible !important;
        opacity: 1 !important;
        min-height: 44px !important;
        z-index: 5 !important;
      }
      body.vk-mini-embed header {
        flex-wrap: wrap !important;
        gap: 6px !important;
        margin: 4px 0 8px !important;
      }
      body.vk-mini-embed header h1,
      body.vk-mini-embed h1 {
        font-size: 1.25rem !important;
        line-height: 1.25 !important;
        margin: 0 0 6px !important;
      }
      body.vk-mini-embed .panel {
        width: 100% !important;
        max-width: 100% !important;
        box-sizing: border-box !important;
        overflow: visible !important;
        height: auto !important;
      }
      body.vk-mini-embed canvas {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        max-height: 58vh !important;
        height: auto !important;
        margin: 0 auto !important;
        /* pan-y — чтобы жест вниз листал страницу, а не «залипал» на canvas */
        touch-action: pan-y manipulation !important;
      }
      body.vk-mini-embed .game-board,
      body.vk-mini-embed .game-container,
      body.vk-mini-embed .board {
        max-width: 100% !important;
        box-sizing: border-box !important;
      }
      body.vk-mini-embed .game-board {
        width: min(100%, 320px) !important;
        height: auto !important;
        aspect-ratio: 1 / 1 !important;
      }
      body.vk-mini-embed .score-container {
        gap: 10px !important;
        flex-wrap: wrap !important;
      }
      body.vk-mini-embed .score,
      body.vk-mini-embed .best {
        min-width: 0 !important;
        padding: 8px 12px !important;
      }
    `;
    // не дублировать при повторной загрузке
    const old = doc.head.querySelector('style[data-vk-mini-embed]');
    if (old) old.remove();
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

    // Дать canvas-играм пересчитать размер после того, как iframe реально растянулся
    try {
      const win = doc.defaultView;
      if (win) {
        requestAnimationFrame(() => {
          try {
            win.dispatchEvent(new Event('resize'));
          } catch (_) {}
        });
        setTimeout(() => {
          try {
            win.dispatchEvent(new Event('resize'));
          } catch (_) {}
        }, 120);
      }
    } catch (_) {}
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
    document.querySelectorAll('[data-open-url]').forEach((el) => {
      if (el.dataset.vkOpenBound) return;
      el.dataset.vkOpenBound = '1';
      el.addEventListener('click', (e) => {
        e.preventDefault();
        openViewer(el.getAttribute('data-open-url'), el.getAttribute('data-open-title') || el.textContent.trim());
      });
    });
  }

  function initViewer() {
    if (viewerBack) {
      viewerBack.addEventListener('click', () => closeViewer());
    }
    if (viewerFrame) {
      bindViewerFrameLoad(viewerFrame);
    }
    window.addEventListener('popstate', () => {
      if (viewer && viewer.classList.contains('is-open')) {
        closeViewer({ fromPopstate: true });
      }
    });
    window.addEventListener('message', (event) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || data.type !== 'spn-vk-mini-close-viewer') return;
      closeViewer();
    });
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
    const panel = onboarding.querySelector('.vk-mini-onboarding__panel');
    const consentCheck = document.getElementById('vk-mini-consent-check');
    const consentError = document.getElementById('vk-mini-consent-error');
    const legalCopy = (cfg.legal) || {};
    let idx = 0;
    let touchX = null;

    const hasConsent = () => Boolean(consentCheck && consentCheck.checked);

    const render = () => {
      slides.forEach((s, i) => {
        s.hidden = i !== idx;
      });
      dots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
      if (btnNext) {
        const last = idx >= slides.length - 1;
        btnNext.textContent = last
          ? (cfg.onboarding && cfg.onboarding.done) || 'Начать'
          : (cfg.onboarding && cfg.onboarding.next) || 'Далее';
      }
      if (consentError) consentError.hidden = true;
    };

    const finish = () => {
      if (!hasConsent()) {
        if (consentError) {
          consentError.hidden = false;
          consentError.textContent = legalCopy.consentRequired || 'Чтобы продолжить, отметьте согласие';
        }
        if (consentCheck) consentCheck.focus();
        // На последнем слайде, если согласие не дано
        idx = slides.length - 1;
        render();
        return false;
      }
      try {
        localStorage.setItem(storageKey, '1');
      } catch (_) {}
      onboarding.classList.remove('is-open');
      onboarding.setAttribute('aria-hidden', 'true');
      return true;
    };

    const goNext = () => {
      if (idx >= slides.length - 1) finish();
      else {
        idx += 1;
        render();
      }
    };

    const goPrev = () => {
      if (idx <= 0) return;
      idx -= 1;
      render();
    };

    if (btnNext) btnNext.addEventListener('click', goNext);
    if (btnSkip) {
      btnSkip.addEventListener('click', () => {
        idx = slides.length - 1;
        render();
        finish();
      });
    }
    if (consentCheck) {
      consentCheck.addEventListener('change', () => {
        if (consentError) consentError.hidden = true;
      });
    }

    const swipeTarget = panel || onboarding;
    swipeTarget.addEventListener(
      'touchstart',
      (e) => {
        if (!e.touches || !e.touches[0]) return;
        touchX = e.touches[0].clientX;
      },
      { passive: true }
    );
    swipeTarget.addEventListener(
      'touchend',
      (e) => {
        if (touchX == null || !e.changedTouches || !e.changedTouches[0]) return;
        const dx = e.changedTouches[0].clientX - touchX;
        touchX = null;
        if (Math.abs(dx) < 48) return;
        if (dx < 0) goNext();
        else goPrev();
      },
      { passive: true }
    );

    render();
    onboarding.classList.add('is-open');
    onboarding.setAttribute('aria-hidden', 'false');
  }

  const TOKEN_KEY = 'spn_vk_mini_token';
  const USER_KEY = 'spn_vk_mini_user';
  const authRoot = document.getElementById('vk-mini-auth');
  const authLoginBtn = document.getElementById('vk-mini-auth-login');
  const authLogoutBtn = document.getElementById('vk-mini-auth-logout');
  const authDeleteBtn = document.getElementById('vk-mini-auth-delete');
  const authStatus = document.getElementById('vk-mini-auth-status');
  const authLabel = document.getElementById('vk-mini-auth-label');
  const authPhoto = document.getElementById('vk-mini-auth-photo');
  const authHint = document.getElementById('vk-mini-auth-hint');
  const profileName = document.getElementById('vk-mini-profile-name');
  const profileText = document.getElementById('vk-mini-profile-text');
  const limitRoot = document.getElementById('vk-mini-limit');
  const limitTitle = document.getElementById('vk-mini-limit-title');
  const limitText = document.getElementById('vk-mini-limit-text');
  const limitActions = document.getElementById('vk-mini-limit-actions');
  const limitClose = document.getElementById('vk-mini-limit-close');
  const authCopy = (cfg.auth) || {};
  const profileCopy = (cfg.profile) || {};
  const limitCopy = (cfg.limit) || {};
  const DEFAULT_AVATAR = '/frontend/images/serpmonn.ico?v=3';

  function getStoredToken() {
    try {
      return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || '';
    } catch {
      return '';
    }
  }

  function getStoredUser() {
    try {
      const raw = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function persistSession(token, user) {
    try {
      if (token) {
        sessionStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(TOKEN_KEY, token);
      }
      if (user) {
        const raw = JSON.stringify(user);
        sessionStorage.setItem(USER_KEY, raw);
        localStorage.setItem(USER_KEY, raw);
      }
    } catch (_) {}
    window.__SPN_VK_MINI_TOKEN__ = token || '';
    window.__SPN_VK_MINI_USER__ = user || null;
  }

  function prettyAuthName(user) {
    if (!user) return '';
    const raw = String(user.username || user.name || '').trim();
    // Не показываем технические vk_123456
    if (!raw || /^vk_\d+$/i.test(raw)) {
      return '';
    }
    return raw.split(/\s+/)[0];
  }

  function clearSession() {
    try {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch (_) {}
    window.__SPN_VK_MINI_TOKEN__ = '';
    window.__SPN_VK_MINI_USER__ = null;
  }

  function renderAuthUi(user) {
    if (!authRoot) return;
    const loggedIn = Boolean(user && (user.id || user.vkUserId));
    authRoot.dataset.state = loggedIn ? 'user' : 'guest';

    if (authLoginBtn) authLoginBtn.hidden = loggedIn;
    if (authLogoutBtn) authLogoutBtn.hidden = !loggedIn;
    if (authDeleteBtn) authDeleteBtn.hidden = !loggedIn;

    const serpBlock = document.getElementById('vk-mini-auth-serp');
    if (serpBlock) serpBlock.hidden = loggedIn;

    if (authHint) {
      authHint.hidden = false;
      authHint.textContent = loggedIn
        ? (profileCopy.quotaUser || authCopy.userQuota || 'Лимит: 15 запросов в день')
        : (profileCopy.quotaGuest || authCopy.guestQuota || 'Лимит: 5 запросов в день');
    }

    if (profileName) {
      if (loggedIn) {
        profileName.textContent =
          prettyAuthName(user) || authCopy.loggedIn || profileCopy.guestName || 'Вы вошли';
      } else {
        profileName.textContent = profileCopy.guestName || 'Гость';
      }
    }

    if (profileText) {
      profileText.textContent = loggedIn
        ? (profileCopy.userText || 'До 15 запросов к ИИ в день')
        : (profileCopy.guestText || 'Войдите через VK или аккаунт Серпмонн, чтобы получить до 15 запросов в день');
    }

    if (authLabel) {
      const first = prettyAuthName(user);
      authLabel.textContent = loggedIn
        ? (first
            ? `${first} · ${authCopy.userQuota || '15 запросов в день'}`
            : (authCopy.statusUser || 'Вы вошли · 15/день'))
        : (authCopy.statusGuest || 'Гость · 5/день');
    }

    if (authPhoto) {
      if (loggedIn && user.photo) {
        authPhoto.src = user.photo;
      } else {
        authPhoto.src = DEFAULT_AVATAR;
      }
      authPhoto.hidden = false;
    }

    if (authStatus) authStatus.hidden = true;
  }

  async function logoutFromVk() {
    if (authLogoutBtn) {
      authLogoutBtn.disabled = true;
      authLogoutBtn.textContent = profileCopy.loggingOut || 'Выходим…';
    }
    try {
      await fetch('/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (_) {}
    clearSession();
    renderAuthUi(null);
    if (authLogoutBtn) {
      authLogoutBtn.disabled = false;
      authLogoutBtn.textContent = profileCopy.logout || 'Выйти';
    }
  }

  async function deleteAccountFromMini() {
    const confirmText =
      profileCopy.deleteConfirm ||
      'Удалить аккаунт Серпмонн и связанные данные? Это действие нельзя отменить.';
    if (!window.confirm(confirmText)) return;

    const token = getStoredToken();
    if (authDeleteBtn) {
      authDeleteBtn.disabled = true;
      authDeleteBtn.textContent = profileCopy.deletingAccount || 'Удаляем…';
    }
    try {
      const headers = { Accept: 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const resp = await fetch('/api/vk-mini-delete-account', {
        method: 'POST',
        credentials: 'include',
        headers
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data.success) {
        window.alert?.(profileCopy.deleteFailed || 'Не удалось удалить аккаунт. Попробуйте ещё раз');
        return;
      }
      clearSession();
      renderAuthUi(null);
      window.alert?.(profileCopy.deleteOk || 'Аккаунт удалён');
    } catch (_) {
      window.alert?.(profileCopy.deleteFailed || 'Не удалось удалить аккаунт. Попробуйте ещё раз');
    } finally {
      if (authDeleteBtn) {
        authDeleteBtn.disabled = false;
        authDeleteBtn.textContent = profileCopy.deleteAccount || 'Удалить аккаунт';
      }
    }
  }

  async function enrichUserFromBridge(user) {
    if (!user) return user;
    if (user.photo && prettyAuthName(user)) return user;
    const bridge = getVkBridge();
    if (!bridge || typeof bridge.send !== 'function') return user;
    try {
      const info = await bridge.send('VKWebAppGetUserInfo');
      if (!info) return user;
      const name = [info.first_name, info.last_name].filter(Boolean).join(' ').trim();
      const next = {
        ...user,
        username: prettyAuthName({ username: user.username }) ? user.username : (name || user.username),
        photo: user.photo || info.photo_100 || info.photo_200 || null
      };
      persistSession(getStoredToken(), next);
      return next;
    } catch (_) {
      return user;
    }
  }

  function collectLaunchParams() {
    const out = {};
    try {
      const search = new URLSearchParams(window.location.search);
      search.forEach((v, k) => {
        if (k.startsWith('vk_') || k === 'sign') out[k] = v;
      });
    } catch (_) {}

    // VK часто кладёт параметры в hash: #vk_... или ? в hash
    try {
      const hash = (window.location.hash || '').replace(/^#/, '');
      if (hash) {
        const q = hash.includes('=') ? hash : '';
        const sp = new URLSearchParams(q.startsWith('?') ? q.slice(1) : q);
        sp.forEach((v, k) => {
          if (k.startsWith('vk_') || k === 'sign') out[k] = v;
        });
      }
    } catch (_) {}

    return out;
  }

  async function getBridgeLaunchParams() {
    const bridge = getVkBridge();
    if (!bridge || typeof bridge.send !== 'function') return null;
    try {
      const data = await bridge.send('VKWebAppGetLaunchParams');
      if (data && typeof data === 'object') return data;
    } catch (_) {}
    return null;
  }

  async function getVkAccessToken() {
    const bridge = getVkBridge();
    if (!bridge || typeof bridge.send !== 'function') return null;
    const appId = Number(cfg.appId) || 54486769;
    try {
      const data = await bridge.send('VKWebAppGetAuthToken', {
        app_id: appId,
        scope: ''
      });
      return data && data.access_token ? data.access_token : null;
    } catch (err) {
      console.warn('VKWebAppGetAuthToken failed', err);
      return null;
    }
  }

  async function postMiniLogin(body) {
    const resp = await fetch('/api/vk-mini-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body)
    });
    const data = await resp.json().catch(() => null);
    return { ok: resp.ok, data };
  }

  function setSerpLoginError(message) {
    const el = document.getElementById('vk-mini-serp-login-error');
    if (!el) return;
    if (message) {
      el.hidden = false;
      el.textContent = message;
    } else {
      el.hidden = true;
      el.textContent = '';
    }
  }

  async function loginWithSerpmonn({ email, password } = {}) {
    const submitBtn = document.getElementById('vk-mini-serp-login-submit');
    const emailInput = document.getElementById('vk-mini-serp-email');
    const passwordInput = document.getElementById('vk-mini-serp-password');
    const mail = String(email || emailInput?.value || '').trim();
    const pass = String(password || passwordInput?.value || '');

    setSerpLoginError('');

    if (!mail || !pass || pass.length < 6) {
      setSerpLoginError(authCopy.loginFailed || 'Не удалось войти. Проверьте email и пароль');
      return false;
    }

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = authCopy.loggingIn || 'Входим…';
    }

    try {
      const resp = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: mail, password: pass, vkMini: true })
      });
      const data = await resp.json().catch(() => null);
      if (!resp.ok || !data?.success || !data?.token) {
        setSerpLoginError(
          (data && data.message) || authCopy.loginFailed || 'Не удалось войти. Проверьте email и пароль'
        );
        return false;
      }

      persistSession(data.token, data.user);
      renderAuthUi(data.user);
      if (passwordInput) passwordInput.value = '';
      return true;
    } catch (err) {
      console.warn('serpmonn mini login failed', err);
      setSerpLoginError(authCopy.loginFailed || 'Не удалось войти. Попробуйте ещё раз');
      return false;
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = authCopy.submitSerpmonn || 'Войти';
      }
    }
  }

  async function loginWithVk({ interactive } = { interactive: false }) {
    if (authLoginBtn && interactive) {
      authLoginBtn.disabled = true;
      authLoginBtn.textContent = authCopy.loggingIn || 'Входим…';
    }

    try {
      let launchParams = collectLaunchParams();
      const bridgeParams = await getBridgeLaunchParams();
      if (bridgeParams) {
        launchParams = { ...launchParams, ...bridgeParams };
      }

      // 1) Пробуем по launch params (если бэкенд примет подпись)
      if (launchParams.vk_user_id && launchParams.sign) {
        const first = await postMiniLogin({ launchParams });
        if (first.ok && first.data?.success && first.data.token) {
          let user = first.data.user;
          persistSession(first.data.token, user);
          user = await enrichUserFromBridge(user);
          renderAuthUi(user);
          return true;
        }
      }

      // 2) access_token через Bridge (основной путь)
      const accessToken = await getVkAccessToken();
      if (!accessToken) {
        if (interactive) {
          window.alert?.(authCopy.loginFailed || 'Не удалось войти. Попробуйте ещё раз');
        }
        return false;
      }

      const second = await postMiniLogin({
        accessToken,
        launchParams: Object.keys(launchParams).length ? launchParams : undefined
      });

      if (second.ok && second.data?.success && second.data.token) {
        let user = second.data.user;
        persistSession(second.data.token, user);
        user = await enrichUserFromBridge(user);
        renderAuthUi(user);
        return true;
      }

      if (interactive) {
        window.alert?.(authCopy.loginFailed || 'Не удалось войти. Попробуйте ещё раз');
      }
      return false;
    } catch (err) {
      console.warn('vk mini login failed', err);
      if (interactive) {
        window.alert?.(authCopy.loginFailed || 'Не удалось войти. Попробуйте ещё раз');
      }
      return false;
    } finally {
      if (authLoginBtn) {
        authLoginBtn.disabled = false;
        authLoginBtn.textContent = authCopy.login || 'Войти через VK';
      }
    }
  }

  function closeLimit() {
    if (!limitRoot) return;
    limitRoot.classList.remove('is-open');
    limitRoot.setAttribute('aria-hidden', 'true');
  }

  function showLimit(payload = {}) {
    if (!limitRoot || !limitActions) return;
    const needAuth = payload.needAuth === true || !getStoredUser();
    const title = needAuth
      ? (limitCopy.guestTitle || 'Лимит на сегодня закончился')
      : (limitCopy.userTitle || 'Лимит на сегодня закончился');
    const text = needAuth
      ? (limitCopy.guestText || 'Войдите через VK — будет до 15 запросов в день.')
      : (limitCopy.userText || 'Завтра снова будет до 15 запросов.');

    if (limitTitle) limitTitle.textContent = title;
    // Для мягкого экрана предпочитаем наш текст; API-error — fallback
    if (limitText) {
      limitText.textContent = text;
    }

    limitActions.innerHTML = '';

    if (needAuth) {
      const loginBtn = document.createElement('button');
      loginBtn.type = 'button';
      loginBtn.className = 'is-primary';
      loginBtn.textContent = authCopy.login || 'Войти через VK';
      loginBtn.addEventListener('click', async () => {
        const ok = await loginWithVk({ interactive: true });
        if (ok) closeLimit();
      });
      limitActions.appendChild(loginBtn);

      const serpBtn = document.createElement('button');
      serpBtn.type = 'button';
      serpBtn.textContent = authCopy.loginSerpmonn || limitCopy.goProfile || 'Войти через Серпмонн';
      serpBtn.addEventListener('click', () => {
        closeLimit();
        showScreen('profile');
        const emailInput = document.getElementById('vk-mini-serp-email');
        if (emailInput) {
          try { emailInput.focus(); } catch (_) {}
        }
      });
      limitActions.appendChild(serpBtn);
    }

    [
      ['news', limitCopy.goNews || 'Новости'],
      ['tools', limitCopy.goTools || 'Инструменты'],
      ['games', limitCopy.goGames || 'Игры']
    ].forEach(([screen, label]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'is-nav';
      btn.textContent = label;
      btn.addEventListener('click', () => {
        closeLimit();
        showScreen(screen);
      });
      limitActions.appendChild(btn);
    });

    limitRoot.classList.add('is-open');
    limitRoot.setAttribute('aria-hidden', 'false');
  }

  function initAuth() {
    const cachedUser = getStoredUser();
    const cachedToken = getStoredToken();
    if (cachedToken) window.__SPN_VK_MINI_TOKEN__ = cachedToken;
    if (cachedUser) {
      window.__SPN_VK_MINI_USER__ = cachedUser;
      renderAuthUi(cachedUser);
      enrichUserFromBridge(cachedUser).then((u) => renderAuthUi(u));
    } else {
      renderAuthUi(null);
    }

    if (authLoginBtn) {
      authLoginBtn.addEventListener('click', () => loginWithVk({ interactive: true }));
    }
    if (authLogoutBtn) {
      authLogoutBtn.addEventListener('click', () => logoutFromVk());
    }
    if (authDeleteBtn) {
      authDeleteBtn.addEventListener('click', () => deleteAccountFromMini());
    }

    const serpForm = document.getElementById('vk-mini-serp-login-form');
    if (serpForm) {
      serpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await loginWithSerpmonn();
      });
    }

    if (limitClose) {
      limitClose.addEventListener('click', closeLimit);
    }
    if (limitRoot) {
      limitRoot.addEventListener('click', (e) => {
        if (e.target === limitRoot) closeLimit();
      });
    }

    // Тихий вход: если уже есть токен — не дёргаем VK снова
    if (cachedToken && cachedUser) return;

    loginWithVk({ interactive: false }).then((ok) => {
      if (!ok && !getStoredUser()) renderAuthUi(null);
    });
  }

  function initBridge() {
    const bridge = getVkBridge();
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

      // Картинки ответа: открываем через VK, без увода на сторонний сайт
      if (a.classList.contains('ai-image-card')) {
        e.preventDefault();
        e.stopPropagation();
        const urls = Array.from(document.querySelectorAll('.ai-image-card'))
          .map((el) => el.getAttribute('href'))
          .filter((u) => u && /^https?:/i.test(u));
        const start = Math.max(0, urls.indexOf(a.getAttribute('href')));
        const bridge = window.vkBridge || window.bridge;
        if (bridge && urls.length) {
          bridge
            .send('VKWebAppShowImages', { images: urls, start_index: start })
            .catch(() => {});
        }
        return;
      }

      const href = a.getAttribute('href') || '';

      // Лента новостей на экране поиска — открываем через VK Bridge
      if (a.closest('#news-block') && isExternalUrl(href)) {
        e.preventDefault();
        e.stopPropagation();
        const bridge = getVkBridge();
        if (bridge && typeof bridge.send === 'function') {
          bridge.send('VKWebAppOpenURL', { url: href }).catch(() => {
            bridge.send('VKWebAppOpenLink', { url: href }).catch(() => {});
          });
        }
        return;
      }

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
  initAuth();

  window.spnVkMiniOpen = openViewer;
  window.spnVkMiniClose = closeViewer;
  window.spnVkMiniShowLimit = showLimit;
  window.spnVkMiniLogin = () => loginWithVk({ interactive: true });
  window.spnVkMiniGetToken = getStoredToken;
})();
