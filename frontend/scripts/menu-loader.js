// Исправленный импорт
import { initMenu } from './menu.js';
import '/frontend/scripts/accessibility.js';
import { applyGeoFilter } from '/frontend/scripts/geo-filter.js';
import { t, loadMessages } from './i18n-loader.js';
import { initFindingsModals, openActivityModal } from '/frontend/scripts/findings-modals.js';

// Немедленно применяем сохранённые настройки доступности
(function applySavedAccessibility() {
  const saved = localStorage.getItem('spn_a11y_settings');
  if (saved) {
    try {
      const settings = JSON.parse(saved);
      Object.keys(settings).forEach(key => {
        if (settings[key]) {
          document.documentElement.classList.add(`a11y-${key}`);
        }
      });
    } catch (e) {
      console.warn('Failed to apply saved accessibility settings:', e);
    }
  }
})();


function parentFlag(name) {
  try {
    return Boolean(window.parent && window.parent !== window && window.parent[name]);
  } catch (_) {
    return false;
  }
}

function isCapacitorNative() {
  try {
    return (
      Boolean(window.Capacitor) &&
      typeof window.Capacitor.isNativePlatform === 'function' &&
      window.Capacitor.isNativePlatform()
    );
  } catch (_) {
    return false;
  }
}

function detectAndroidAppEmbed() {
  return (
    Boolean(window.__SPN_ANDROID_APP__) ||
    parentFlag('__SPN_ANDROID_APP__') ||
    isCapacitorNative() ||
    /(?:^|[?&])app=1(?:&|$)/.test(window.location.search || '') ||
    document.documentElement?.classList?.contains('android-app') ||
    document.body?.classList?.contains('android-app')
  );
}

const ANDROID_EMBED_HIDE_CSS = `
  html.android-app #menuCorner, html.android-app #menuContainer, html.android-app #menuButton,
  html.android-app .menu-corner, html.android-app .menu-container, html.android-app .menu-button,
  html.android-app .menu-activity-bell, html.android-app #activityBellBtn,
  html.android-app #cookie-consent, html.android-app .cookie-consent, html.android-app #installAppButton,
  html.android-app .mobile-anchor-ad, html.android-app .ad-leaderboard, html.android-app .ad-container, html.android-app .ad-top-banner,
  html.android-app .kb-subscribe__link[href*="rss.xml"],
  html.android-app .kb-subscribe__link[href*="t.me"],
  html.android-app a[href*="t.me"],
  html.android-app a.tg-btn, html.android-app .tg-btn,
  html.android-app a.share-btn.telegram, html.android-app .share-btn.telegram,
  html.android-app button[onclick*="telegram"], html.android-app button[onclick*="Telegram"],
  html.android-app .rss-btn, html.android-app .rss-section,
  html.android-app #kb-sn-tg, html.android-app #kb-sn-max, html.android-app #kb-sn-ok,
  body.android-app #menuCorner, body.android-app #menuContainer, body.android-app #menuButton,
  body.android-app .menu-corner, body.android-app .menu-container, body.android-app .menu-button,
  body.android-app .menu-activity-bell, body.android-app #activityBellBtn,
  body.android-app #cookie-consent, body.android-app .cookie-consent, body.android-app #installAppButton,
  body.android-app .mobile-anchor-ad, body.android-app .ad-leaderboard, body.android-app .ad-container, body.android-app .ad-top-banner,
  body.android-app .kb-subscribe__link[href*="rss.xml"],
  body.android-app .kb-subscribe__link[href*="t.me"],
  body.android-app a[href*="t.me"],
  body.android-app a.tg-btn, body.android-app .tg-btn,
  body.android-app a.share-btn.telegram, body.android-app .share-btn.telegram,
  body.android-app button[onclick*="telegram"], body.android-app button[onclick*="Telegram"],
  body.android-app .rss-btn, body.android-app .rss-section,
  body.android-app #kb-sn-tg, body.android-app #kb-sn-max, body.android-app #kb-sn-ok {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }
  html.android-app, body.android-app {
    overscroll-behavior-x: none !important;
  }
  /* RuStore: без денежной покупки Pro и без входа на ai.serpmonn.ru; обмен баллов на дни оставляем */
  html.android-app #managePlanButton,
  html.android-app #buy-pro-btn,
  html.android-app .cta-row,
  html.android-app #aiAccessBlock,
  html.android-app #openAiService,
  html.android-app a[href*="/tariffs/"],
  html.android-app a[href*="ai.serpmonn.ru"],
  body.android-app #managePlanButton,
  body.android-app #buy-pro-btn,
  body.android-app .cta-row,
  body.android-app #aiAccessBlock,
  body.android-app #openAiService,
  body.android-app a[href*="/tariffs/"],
  body.android-app a[href*="ai.serpmonn.ru"],
  html.android-app .profile-panel-block--logout,
  html.android-app #logoutButton,
  body.android-app .profile-panel-block--logout,
  body.android-app #logoutButton {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }
`;

function applyAndroidAppEmbed() {
  window.__SPN_ANDROID_APP__ = true;
  document.documentElement.classList.add('android-app');
  if (document.body) document.body.classList.add('android-app');
  if (!document.getElementById('spn-android-app-css')) {
    const style = document.createElement('style');
    style.id = 'spn-android-app-css';
    style.textContent = ANDROID_EMBED_HIDE_CSS;
    (document.head || document.documentElement).appendChild(style);
  }
  try {
    const mc = document.getElementById('menuContainer');
    if (mc) {
      mc.innerHTML = '';
      mc.setAttribute('hidden', '');
      mc.style.cssText = 'display:none!important';
    }
  } catch (_) {}
}

// RuStore / Capacitor: не грузим меню и колокольчик
if (detectAndroidAppEmbed()) {
  applyAndroidAppEmbed();
} else {
// Загружаем меню ПЕРВЫМ делом (с учётом языка)
const spnLang = (localStorage.getItem('spn_lang') || (document.documentElement.lang || 'ru')).toLowerCase();
const langToDir = {
  'en': 'en', 'es': 'es', 'pt-br': 'pt-br', 'hi': 'hi', 'ar': 'ar', 'id': 'id',
  'zh-cn': 'zh-cn', 'ja': 'ja', 'ko': 'ko', 'vi': 'vi', 'tr': 'tr',
  'de': 'de', 'fr': 'fr', 'it': 'it', 'pl': 'pl', 'nl': 'nl',
  'kk': 'kk', 'he': 'he', 'fa': 'fa', 'bn': 'bn', 'ur': 'ur',
  'ms': 'ms', 'fil': 'fil', 'th': 'th',
  'ro': 'ro', 'cs': 'cs', 'hu': 'hu', 'bg': 'bg', 'el': 'el', 'sr': 'sr',
  'ka': 'ka', 'hy': 'hy', 'be': 'be', 'uz': 'uz', 'az': 'az',
  'sv': 'sv', 'da': 'da', 'nb': 'nb', 'fi': 'fi',
  'pt-pt': 'pt-pt', 'es-419': 'es-419',
  'ps': 'ps', 'sd': 'sd', 'ug': 'ug', 'dv': 'dv', 'ks': 'ks',
  'ku-arab': 'ku-arab', 'yi': 'yi'
};
const resolvedDir = langToDir[spnLang];
const primaryMenuPath = resolvedDir ? `/frontend/${resolvedDir}/menu.html` : '/frontend/menu.html';

function hideCurrentPageMenuLinks() {
  try {
    let currentPath = window.location.pathname.replace(/\/+$/, '');

    const isVkMiniForHide = /vk_app_id=\d+/.test(window.location.search);
    if (isVkMiniForHide && (currentPath === '' || currentPath === '/')) {
      const mainLink = document.querySelector('.menu-container a[data-route="home"]');
      if (mainLink) {
        currentPath = (mainLink.getAttribute('href') || '').replace(/\/+$/, '');
      }
    }

    document.querySelectorAll('.menu-container a[href]').forEach((link) => {
      const href = (link.getAttribute('href') || '').replace(/\/+$/, '');
      if (href === currentPath) {
        link.style.display = 'none';
      }
    });
  } catch (e) {
    console.warn('hide-menu error', e);
  }
}

fetch(primaryMenuPath)
  .then(r => r.ok ? r : fetch('/frontend/menu.html'))
  .then(response => {
    if (!response.ok) throw new Error('Меню не найдено');
    return response.text();
  })
  .then(html => {
    // VK Mini App / embed: не подключаем полное меню сайта
    let parentIsMini = false;
    try {
      parentIsMini = Boolean(window.parent && window.parent !== window && window.parent.__SPN_VK_MINI__);
    } catch (_) {
      parentIsMini = false;
    }
    const isVkMiniEmbed =
      Boolean(window.__SPN_VK_MINI__) ||
      parentIsMini ||
      /(?:^|[?&])vk_mini=1(?:&|$)/.test(window.location.search) ||
      /vk_app_id=\d+/.test(window.location.search) ||
      document.body?.classList?.contains('vk-mini-app') ||
      document.body?.classList?.contains('vk-mini-embed');

    // Late guard (на случай если detect на старте промахнулся)
    if (detectAndroidAppEmbed()) {
      applyAndroidAppEmbed();
      return;
    }

    if (isVkMiniEmbed) {
      window.__SPN_VK_MINI__ = true;
      document.documentElement.classList.add('vk-mini-embed');
      document.body.classList.add('vk-mini-embed');
      if (!document.getElementById('vk-mini-embed-css')) {
        const style = document.createElement('style');
        style.id = 'vk-mini-embed-css';
        style.textContent = `
          html.vk-mini-embed {
            width: 100% !important; max-width: 100% !important;
            height: 100% !important; margin: 0 !important; padding: 0 !important;
            overflow-x: hidden !important; overflow-y: scroll !important;
            -webkit-overflow-scrolling: touch !important;
            touch-action: pan-y manipulation !important;
            -webkit-text-size-adjust: 100% !important;
          }
          body.vk-mini-embed {
            width: 100% !important; max-width: 100% !important;
            height: auto !important; min-height: 100% !important; max-height: none !important;
            margin: 0 !important; padding: 0 0 28px !important;
            overflow: visible !important;
            touch-action: pan-y manipulation !important;
          }
          #menuContainer, #menuButton, .menu-container, .menu-activity-bell, #activityBellBtn,
          .cookie-consent, #cookie-consent,
          .donate-button, .ad-leaderboard, .mobile-anchor-ad, .ad-container, .ad-top-banner,
          .mrg-tag, ins.mrg-tag, a[href*="donate"], a[href*="/promo"], #installAppButton,
          .social-subscribe, .tg-btn, .vk-btn, .social-share, .share-btn, .share-buttons,
          .vk-mini-hide,
          a[href*="t.me/serpmonn"], a[href*="vk.com/serpmonn_site"],
          a[href*="t.me/share"], a[href*="vk.com/share"] {
            display: none !important;
          }
          body.vk-mini-embed .page,
          body.vk-mini-embed .container {
            max-width: 100% !important; width: 100% !important;
            margin: 0 auto !important; padding: 8px !important;
            box-sizing: border-box !important;
            overflow: visible !important; height: auto !important;
          }
          body.vk-mini-embed .wrap {
            display: flex !important; flex-direction: column !important; gap: 6px !important;
            overflow: visible !important; height: auto !important;
          }
          body.vk-mini-embed .wrap > .panel:last-child {
            order: -1 !important; position: static !important;
            z-index: 30 !important; background: #141416 !important;
            padding: 6px 8px !important; flex: 0 0 auto !important;
            display: grid !important; grid-template-columns: repeat(4, 1fr) !important;
            gap: 4px !important; align-items: stretch !important;
          }
          body.vk-mini-embed .wrap > .panel:last-child > h2 { display: none !important; }
          body.vk-mini-embed .wrap > .panel:last-child > .stats { display: contents !important; }
          body.vk-mini-embed .wrap > .panel:last-child > div:not(.stats):not(.controls) {
            grid-column: 1 / -1 !important; margin: 0 !important;
            display: flex !important; gap: 6px !important; justify-content: center !important;
          }
          body.vk-mini-embed .stat {
            padding: 4px !important; font-size: 0.7rem !important; line-height: 1.2 !important;
          }
          body.vk-mini-embed .stat b { font-size: 0.85rem !important; }
          body.vk-mini-embed .controls { display: none !important; }
          body.vk-mini-embed .btn,
          body.vk-mini-embed #btnStart,
          body.vk-mini-embed #btnReset,
          body.vk-mini-embed #btnPause,
          body.vk-mini-embed #btnNewGame,
          body.vk-mini-embed #restartBtn,
          body.vk-mini-embed #pauseBtn {
            display: inline-flex !important; visibility: visible !important; opacity: 1 !important;
            min-height: 36px !important; padding: 6px 10px !important;
            align-items: center !important; justify-content: center !important;
          }
          body.vk-mini-embed header { margin: 2px 0 4px !important; gap: 6px !important; }
          body.vk-mini-embed header img { width: 22px !important; height: 22px !important; }
          body.vk-mini-embed header h1, body.vk-mini-embed h1 {
            font-size: 1.1rem !important; line-height: 1.2 !important; margin: 0 !important;
          }
          body.vk-mini-embed .hint { display: none !important; }
          html.vk-mini-embed:has(.game-board),
          body.vk-mini-embed:has(.game-board) {
            background: #faf8ef !important; color: #776e65 !important;
          }
          body.vk-mini-embed:has(.game-board) h1,
          body.vk-mini-embed:has(.game-board) header h1 {
            color: #3d3a36 !important; font-weight: 700 !important;
          }
          html.vk-mini-embed:has(canvas),
          body.vk-mini-embed:has(canvas) {
            overflow: hidden !important; height: 100% !important; max-height: 100% !important;
            overscroll-behavior: none !important; touch-action: manipulation !important;
            display: flex !important; flex-direction: column !important;
          }
          body.vk-mini-embed:has(canvas) {
            min-height: 0 !important; padding-bottom: 4px !important;
          }
          body.vk-mini-embed:has(canvas) .page {
            display: flex !important; flex-direction: column !important;
            flex: 1 1 auto !important; min-height: 0 !important; overflow: hidden !important;
            padding: 4px 6px !important;
          }
          body.vk-mini-embed:has(canvas) .wrap {
            flex: 1 1 auto !important; min-height: 0 !important; overflow: hidden !important; gap: 4px !important;
          }
          body.vk-mini-embed .panel {
            overflow: visible !important; height: auto !important;
          }
          body.vk-mini-embed:has(canvas) .wrap > .panel:first-child {
            flex: 1 1 auto !important; min-height: 0 !important; overflow: hidden !important;
            padding: 4px !important; display: flex !important; flex-direction: column !important;
            align-items: center !important; justify-content: center !important;
          }
          body.vk-mini-embed canvas {
            display: block !important;
            width: min(100%, calc(100dvh - 110px)) !important;
            max-width: 100% !important;
            max-height: calc(100dvh - 110px) !important;
            height: auto !important; aspect-ratio: 1 / 1 !important;
            margin: 0 auto !important; touch-action: none !important;
          }
          body.vk-mini-embed .game-board {
            width: min(100%, 320px) !important; height: auto !important; aspect-ratio: 1 / 1 !important;
            max-width: 100% !important; box-sizing: border-box !important;
          }
        `;
        document.head.appendChild(style);
        if (document.querySelector('canvas') && !document.documentElement.dataset.vkMiniCanvasTouch) {
          document.documentElement.dataset.vkMiniCanvasTouch = '1';
          document.addEventListener(
            'touchmove',
            (e) => {
              if (e.target && e.target.closest && e.target.closest('canvas')) {
                e.preventDefault();
              }
            },
            { passive: false, capture: true }
          );
        }
      }
      // cookies / donate / install не трогаем — просто не грузим меню
      return;
    }

    document.body.insertAdjacentHTML('afterbegin', html);

    // Модифицируем ссылки в меню под текущий язык
    try {
      const currentLang = spnLang;
      const supported = new Set(Object.keys(langToDir));
      const container = document.getElementById('menuContainer');
      const anchors = container ? Array.from(container.querySelectorAll('a[href]')) : [];
      anchors.forEach(a => {
        const href = a.getAttribute('href');
        if (!href || href.startsWith('#') || /^(https?:|mailto:|javascript:|data:|vbscript:)/i.test(href.trim())) return;
        if (!href.startsWith('/frontend/')) return;
        const url = new URL(href, location.origin);
        const parts = url.pathname.split('/').filter(Boolean);
        const idx = parts.indexOf('frontend');
        if (idx === -1) return;
        const after = parts.slice(idx + 1);
        const hasLang = after[0] && supported.has(after[0]);
        const rest = hasLang ? after.slice(1) : after;
        let newParts;
        if (currentLang === 'ru') {
          if (rest.length === 0 || (rest.length === 1 && /^(index\.html)?$/.test(rest[0]))) {
            a.setAttribute('href', '/frontend/main.html');
            return;
          }
          newParts = ['frontend', ...rest];
        } else {
          if (rest.length === 0 || (rest.length === 1 && /^(index\.html)?$/.test(rest[0]))) {
            newParts = ['frontend', currentLang, 'index.html'];
          } else {
            newParts = ['frontend', currentLang, ...rest];
          }
        }
        const nextHref = '/' + newParts.join('/');
        // Только относительные /frontend/... пути (без scrub сегментов — иначе ломаются URL)
        if (/^\/frontend\/[a-zA-Z0-9./_-]+$/.test(nextHref)) {
          a.setAttribute('href', nextHref);
        }
      });
    } catch {}

    hideCurrentPageMenuLinks();

    // ===== ТОЛЬКО ДЛЯ VK Mini App: клики по data-route =====
    const isVkMiniApp = /vk_app_id=\d+/.test(window.location.search);

    if (isVkMiniApp) {
      console.log('VK MINI HANDLER ENABLED');

      document.addEventListener('click', function (e) {
        const link = e.target.closest('.menu-container a[data-route]');
        if (!link) return;

        const href = link.getAttribute('href') || '';

        // Внешние ссылки и target=_blank не трогаем
        if (href.startsWith('http://') || href.startsWith('https://') || link.target === '_blank') {
          console.log('VK MINI: external or _blank, skip', href);
          return;
        }

        e.preventDefault();

        console.log('VK MINI NAVIGATE', {
          route: link.getAttribute('data-route'),
          href
        });

        // Пока просто переходим по href внутри того же WebView
        window.location.href = href;
      });
    }
    // ===== конец блока VK Mini =====

    initMenu();

    // === Одноразовая подсказка для кнопки меню ===
    (function () {
      const COOKIE_NAME = 'spn_menu_hint_shown';

      function getCookie(name) {
        const m = document.cookie.match(
          new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)')
        );
        return m ? decodeURIComponent(m[1]) : undefined;
      }

      function setCookie(name, value, days) {
        let expires = '';
        if (days) {
          const d = new Date();
          d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
          expires = '; expires=' + d.toUTCString();
        }
        document.cookie =
          name + '=' + encodeURIComponent(value) + expires + '; path=/; SameSite=Lax';
      }

      // Уже показывали — выходим
      if (getCookie(COOKIE_NAME) === '1') return;

      // Ждём, пока меню добавится в DOM
      setTimeout(async () => {
        await loadMessages();

        const menuButton = document.getElementById('menuButton');
        if (!menuButton) return;

        const rect = menuButton.getBoundingClientRect();
        if (!rect.width && !rect.height) return;

        const overlay = document.createElement('div');
        overlay.className = 'spn-menu-overlay';

        const hole = document.createElement('div');
        hole.className = 'spn-menu-overlay__hole';

        const padding = 8;
        const holeLeft = rect.left - padding;
        const holeTop = rect.top - padding;
        const holeWidth = rect.width + padding * 2;
        const holeHeight = rect.height + padding * 2;

        hole.style.left = holeLeft + 'px';
        hole.style.top = holeTop + 'px';
        hole.style.width = holeWidth + 'px';
        hole.style.height = holeHeight + 'px';

        const hint = document.createElement('div');
        hint.className = 'spn-menu-overlay__hint';

        const text = t('menu.hint');

        // Текстовый блок под кнопкой
        const textDiv = document.createElement('div');
        textDiv.textContent = text;
        textDiv.style.textAlign = 'center';

        hint.appendChild(textDiv);

        // Располагаем текст ПОД кнопкой
        const hintTop = holeTop + holeHeight + 16;
        let hintLeft = holeLeft + holeWidth / 2 - 130;
        hintLeft = Math.max(8, Math.min(hintLeft, window.innerWidth - 268));

        hint.style.top = hintTop + 'px';
        hint.style.left = hintLeft + 'px';

        // === Стрелка, реально указывающая на кнопку ===
        const arrow = document.createElement('div');
        arrow.className = 'spn-menu-overlay__arrow';

        // Точка старта стрелки (верхний центр текста)
        const textCenterX = hintLeft + 130;
        const textTopY = hintTop;

        // Точка цели — центр дырки/кнопки
        const targetX = holeLeft + holeWidth / 2;
        const targetY = holeTop + holeHeight / 2;

        // Вектор
        const dx = targetX - textCenterX;
        const dy = targetY - textTopY;

        // Длина стрелки (максимум 70px)
        const dist = Math.min(Math.sqrt(dx * dx + dy * dy), 70);

        const angle = Math.atan2(dy, dx) * 180 / Math.PI;

        arrow.style.left = textCenterX + 'px';
        arrow.style.top = textTopY + 'px';
        arrow.style.width = dist + 'px';
        arrow.style.transform = `rotate(${angle}deg)`;

        overlay.appendChild(hole);
        overlay.appendChild(hint);
        overlay.appendChild(arrow);
        document.body.appendChild(overlay);

        function closeOverlay() {
          setCookie(COOKIE_NAME, '1', 365);
          overlay.remove();
          document.removeEventListener('click', onAnyClick, true);
        }

        function onAnyClick() {
          closeOverlay();
        }

        document.addEventListener('click', onAnyClick, true);
      }, 300);
    })();
    // === Конец подсказки ===

    // Apply GEO filtering after menu init
    try { applyGeoFilter(); } catch {}

    async function updateAuthMenuState() {
      const authBlock = document.getElementById('auth-block');
      const profileBlock = document.getElementById('profile-block');
      const activityBell = document.getElementById('activityBellBtn');
      if (!authBlock && !profileBlock && !activityBell) return;

      try {
        const resp = await fetch('/auth/protected', { credentials: 'include' });
        const isLoggedIn = resp.ok;

        if (authBlock) {
          authBlock.hidden = isLoggedIn;
          authBlock.style.display = isLoggedIn ? 'none' : '';
        }
        if (profileBlock) {
          profileBlock.hidden = !isLoggedIn;
          profileBlock.style.display = isLoggedIn ? '' : 'none';
        }
        if (activityBell) {
          activityBell.hidden = !isLoggedIn;
          activityBell.style.display = isLoggedIn ? '' : 'none';
        }
        if (isLoggedIn) {
          refreshUnreadUi();
        } else {
          updateActivityBellBadge(0);
        }
      } catch (e) {
        console.warn('auth menu state check failed', e);
        if (profileBlock) {
          profileBlock.hidden = true;
          profileBlock.style.display = 'none';
        }
        if (activityBell) {
          activityBell.hidden = true;
          activityBell.style.display = 'none';
        }
      }

      hideCurrentPageMenuLinks();
    }

    function updateActivityBellBadge(totalCount) {
      const bell = document.getElementById('activityBellBtn');
      const badge = document.getElementById('activityBellBadge');
      if (!bell || !badge) return;

      const count = Number(totalCount) || 0;
      if (count > 0) {
        badge.hidden = false;
        badge.textContent = count > 99 ? '99+' : String(count);
        bell.setAttribute('aria-label', `${bell.getAttribute('data-label-base') || 'Activity'} (${count})`);
      } else {
        badge.hidden = true;
        badge.textContent = '';
        const base = bell.getAttribute('data-label-base');
        if (base) bell.setAttribute('aria-label', base);
      }
    }

    async function updateMenuUnreadIndicator() {
      let total = 0;
      try {
        const [inboxResp, notifResp] = await Promise.all([
          fetch('/api/dm/unread-count', { credentials: 'include' }),
          fetch('/api/findings/notifications/unread-count', { credentials: 'include' }),
        ]);
        if (inboxResp.ok) {
          const data = await inboxResp.json();
          total += Number(data?.count) || 0;
        }
        if (notifResp.ok) {
          const data = await notifResp.json();
          total += Number(data?.count) || 0;
        }
      } catch {
        /* ignore */
      }

      updateActivityBellBadge(total);
    }

    async function refreshUnreadUi() {
      await updateMenuUnreadIndicator();
    }

    function initActivityBell() {
      const bell = document.getElementById('activityBellBtn');
      if (!bell || bell.dataset.initialized) return;
      bell.dataset.initialized = 'true';

      const baseLabel = bell.getAttribute('aria-label') || 'Activity';
      bell.setAttribute('data-label-base', baseLabel);

      bell.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const { closeMenu } = await import('./menu.js');
        closeMenu();
        try {
          const resp = await fetch('/auth/protected', { credentials: 'include' });
          if (!resp.ok) return;
          await openActivityModal('inbox');
        } catch {
          /* ignore */
        }
      });
    }

    updateAuthMenuState();
    initActivityBell();

    initFindingsModals({
      onInboxRead: refreshUnreadUi,
      onNotificationsRead: refreshUnreadUi,
    });

    // ========== ЗАГРУЖАЕМ СКРИПТ СЕЛЕКТОРА ЯЗЫКА ==========
    const script = document.createElement('script');

    const scriptPath = resolvedDir ?
      `/frontend/${resolvedDir}/scripts/language-selector.js` :
      '/frontend/scripts/language-selector.js';

    script.src = scriptPath;
    script.onerror = (e) => {
      console.error('❌ Ошибка загрузки скрипта селектора:', e);
      if (resolvedDir) {
        const fallbackScript = document.createElement('script');
        fallbackScript.src = '/frontend/scripts/language-selector.js';
        document.body.appendChild(fallbackScript);
      }
    };

    document.body.appendChild(script);
    // ========== КОНЕЦ ЗАГРУЗКИ СКРИПТА ==========

    // Инициализируем доступность ПОСЛЕ загрузки меню
    setTimeout(() => {
      if (window.initA11y) {
        window.initA11y();
      }
    }, 100);
  })
  .catch(err => console.error('Ошибка загрузки меню:', err));
}

