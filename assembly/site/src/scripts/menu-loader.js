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
    const isVkMiniEmbed =
      Boolean(window.__SPN_VK_MINI__) ||
      /(?:^|[?&])vk_mini=1(?:&|$)/.test(window.location.search) ||
      /vk_app_id=\d+/.test(window.location.search) ||
      document.body?.classList?.contains('vk-mini-app') ||
      document.body?.classList?.contains('vk-mini-embed');

    if (isVkMiniEmbed) {
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
          #menuContainer, #menuButton, .menu-container, .cookie-consent, #cookie-consent,
          .donate-button, .ad-leaderboard, .mobile-anchor-ad, .ad-container, .ad-top-banner,
          .mrg-tag, ins.mrg-tag, a[href*="donate"], a[href*="/promo"], #installAppButton {
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
            display: flex !important; flex-direction: column !important; gap: 10px !important;
            overflow: visible !important; height: auto !important;
          }
          body.vk-mini-embed .wrap > .panel:last-child {
            order: -1 !important; position: sticky !important; top: 0 !important;
            z-index: 30 !important; background: #141416 !important;
          }
          body.vk-mini-embed .controls {
            display: flex !important; flex-wrap: wrap !important; gap: 8px !important;
            justify-content: center !important; visibility: visible !important; opacity: 1 !important;
          }
          body.vk-mini-embed .btn,
          body.vk-mini-embed #btnStart,
          body.vk-mini-embed #btnReset,
          body.vk-mini-embed #btnPause,
          body.vk-mini-embed #btnNewGame,
          body.vk-mini-embed #restartBtn,
          body.vk-mini-embed #pauseBtn {
            display: inline-flex !important; visibility: visible !important; opacity: 1 !important;
            min-height: 44px !important; align-items: center !important; justify-content: center !important;
          }
          body.vk-mini-embed header h1, body.vk-mini-embed h1 {
            font-size: 1.25rem !important; line-height: 1.25 !important; margin: 0 0 6px !important;
          }
          body.vk-mini-embed .panel {
            overflow: visible !important; height: auto !important;
          }
          body.vk-mini-embed canvas {
            display: block !important; width: 100% !important; max-width: 100% !important;
            max-height: 58vh !important; height: auto !important; margin: 0 auto !important;
            touch-action: pan-y manipulation !important;
          }
          body.vk-mini-embed .game-board {
            width: min(100%, 320px) !important; height: auto !important; aspect-ratio: 1 / 1 !important;
            max-width: 100% !important; box-sizing: border-box !important;
          }
        `;
        document.head.appendChild(style);
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
