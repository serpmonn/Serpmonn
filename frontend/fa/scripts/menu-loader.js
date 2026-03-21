// Исправленный импорт
import { initMenu } from './menu.js';
import '/frontend/scripts/accessibility.js';
import { applyGeoFilter } from '/frontend/scripts/geo-filter.js';

// Немедленно применяем сохранённые настройки доступности
(function applySavedAccessibility() {
  const saved = localStorage.getItem('spn_a11y_settings');
  if (saved) {
    try {
      const settings = JSON.parse(saved);
      Object.keys(settings).forEach(key => {
        if (settings[key]) {
          document.documentElement.classList.add(`a11y-${key.replace('-', '-')}`);
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
  'ku-Arab': 'ku-Arab', 'yi': 'yi'
};
const resolvedDir = langToDir[spnLang];
const primaryMenuPath = resolvedDir ? `/frontend/${resolvedDir}/menu.html` : '/frontend/menu.html';

fetch(primaryMenuPath)
  .then(r => r.ok ? r : fetch('/frontend/menu.html'))
  .then(response => {
    if (!response.ok) throw new Error('Меню не найдено');
    return response.text();
  })
  .then(html => {
    document.body.insertAdjacentHTML('afterbegin', html);

    // Модифицируем ссылки в меню под текущий язык
    try {
      const currentLang = spnLang;
      const supported = new Set(Object.keys(langToDir));
      const container = document.getElementById('menuContainer');
      const anchors = container ? Array.from(container.querySelectorAll('a[href]')) : [];
      anchors.forEach(a => {
        const href = a.getAttribute('href');
        if (!href || href.startsWith('#') || /^https?:\/\//i.test(href) || href.startsWith('mailto:') || href.startsWith('javascript:')) return;
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
        a.setAttribute('href', '/' + newParts.join('/'));
      });
    } catch {}

  // Скрываем ссылку на текущую страницу (с учётом VK Mini App)
  try {
    let currentPath = window.location.pathname.replace(/\/+$/, '');

    // В VK Mini App мы сидим на '/', но главная реально /frontend/main.html
    const isVkMiniForHide = /vk_app_id=\d+/.test(window.location.search);
    if (isVkMiniForHide && (currentPath === '' || currentPath === '/')) {
      const mainLink = document.querySelector('.menu-container a[data-route="home"]');
      if (mainLink) {
        currentPath = (mainLink.getAttribute('href') || '').replace(/\/+$/, '');
      }
    }

    const links = document.querySelectorAll('.menu-container a[href]');
    links.forEach(link => {
      const href = (link.getAttribute('href') || '').replace(/\/+$/, '');
      if (href === currentPath) {
        link.style.display = 'none';
      }
    });
  } catch (e) {
    console.warn('hide-menu error', e);
  }

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

    // Apply GEO filtering after menu init
    try { applyGeoFilter(); } catch {}

    /// === VK ID OneTap ===
  (function initVkIdOneTap() {
    const container = document.getElementById('VkIdSdkOneTap');
    if (!container) return;

    function startOneTap() {
      if (!('VKIDSDK' in window)) return;
      const VKID = window.VKIDSDK;

      VKID.Config.init({
        app: 54486564,
        redirectUrl: 'https://serpmonn.ru/',
        responseMode: VKID.ConfigResponseMode.Callback,
        source: VKID.ConfigSource.LOWCODE,
        scope: 'vkid.personal_info email'
      });

      const oneTap = new VKID.OneTap();

      oneTap
        .render({
          container,
          showAlternativeLogin: true,
          styles: {
            borderRadius: 50,
            width: 32,
            height: 32
          }
        })
        .on(VKID.WidgetEvents.ERROR, console.error)
        .on(VKID.OneTapInternalEvents.LOGIN_SUCCESS, async payload => {
          try {
            console.log('VKID LOGIN_SUCCESS payload:', payload);
            const { code, device_id: deviceId } = payload;
            if (!code || !deviceId) {
              console.error('VKID: no code or device_id in payload');
              return;
            }

            // 1. Обмен кода на токены через SDK (PKCE внутри SDK)
            const tokens = await VKID.Auth.exchangeCode(code, deviceId);
            // tokens.access_token, tokens.id_token и пр.

            // 2. Получаем инфу о пользователе
            const userInfo = await VKID.Auth.userInfo(tokens.access_token);
            // userInfo.user.id, userInfo.user.email, userInfo.user.first_name и т.д.

            const vkUserId = userInfo.user?.id || userInfo.user?.user_id;
            const email = userInfo.user?.email ?? null;
            const name = userInfo.user?.first_name ?? null;

            if (!vkUserId) {
              console.error('VKID: user.id not found in userInfo', userInfo);
              return;
            }

            // 3. Отправляем минимальный набор данных на свой бэк
              const resp = await fetch('/api/vkid-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ vkUserId, email, name })
              });

              const data = await resp.json();
              console.log('VKID backend login:', data);

              if (data && data.success) {
                // редиректим туда же, куда после обычной авторизации
                window.location.href = '/frontend/profile/profile.html';
              } else {
                console.error('VKID login failed:', data);
                // тут при желании можно показать юзеру ошибку
              }
            } catch (e) {
              console.error('VKID OneTap flow error:', e);
            }
          });
    }

    if ('VKIDSDK' in window) {
      startOneTap();
      return;
    }

    if (!window.__VKID_LOADING) {
      window.__VKID_LOADING = true;
      const s = document.createElement('script');
      s.src = 'https://unpkg.com/@vkid/sdk@2.6.1/dist-sdk/umd/index.js';
      s.async = true;
      s.onload = () => {
        window.__VKID_LOADING = false;
        startOneTap();
      };
      s.onerror = e => {
        window.__VKID_LOADING = false;
        console.error('VK ID SDK load error', e);
      };
      document.body.appendChild(s);
    }
  })();

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