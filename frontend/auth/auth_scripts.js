import { generateCombinedBackground } from '/frontend/scripts/backgroundGenerator.js';
import { getFrontendPath, sanitizeReturnPath, safeAssignLocation } from '../scripts/locale-paths.js';
import { getPageT } from '../scripts/i18n-loader.js';

const t = await getPageT('auth');

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const urlParams = new URLSearchParams(window.location.search);
const referralUsername = urlParams.get('ref') || null;
const initialTab = urlParams.get('tab') === 'register' ? 'register' : 'login';
const safeReturnPath = sanitizeReturnPath(urlParams.get('return'));
const appMode = urlParams.get('app') === '1' || Boolean(window.__SPN_ANDROID_APP__);
const APP_AFTER_AUTH = '/frontend/app/index.html?app=1&tab=profile';

function isAndroidAppShell() {
  try {
    if (window.__SPN_ANDROID_APP__) return true;
    if (appMode) return true;
    if (window.parent && window.parent !== window && window.parent.__SPN_ANDROID_APP__) return true;
    if (window.Capacitor?.isNativePlatform?.()) return true;
  } catch (_) {}
  return false;
}

function markAndroidPostAuth() {
  try {
    sessionStorage.setItem('spn_app_post_auth', '1');
  } catch (_) {}
}

function notifyAndroidAppAuthOk() {
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'spn-app-auth-ok' }, '*');
      return true;
    }
  } catch (_) {}
  return false;
}

function withProfileTab(path) {
  const base = typeof path === 'string' && path.startsWith('/frontend/') ? path : APP_AFTER_AUTH;
  try {
    const u = new URL(base, 'https://serpmonn.ru');
    if (/\/frontend\/app\/index\.html$/i.test(u.pathname)) {
      u.searchParams.set('app', '1');
      u.searchParams.set('tab', 'profile');
      return u.pathname + u.search;
    }
  } catch (_) {}
  return APP_AFTER_AUTH;
}

function authRedirectTarget() {
  if (isAndroidAppShell()) {
    // В iframe viewer — закрываем viewer у родителя, не уходим на сайт
    if (notifyAndroidAppAuthOk()) {
      return APP_AFTER_AUTH;
    }
    return withProfileTab(sanitizeReturnPath(urlParams.get('return')) || APP_AFTER_AUTH);
  }
  return safeReturnPath || getFrontendPath('profile/profile.html');
}

function safeNavigate(url) {
  if (isAndroidAppShell()) {
    // iframe внутри app viewer — родитель закроет экран входа
    if (notifyAndroidAppAuthOk()) return;
    // полный WebView приложения — всегда на вкладку профиля
    markAndroidPostAuth();
    safeAssignLocation(withProfileTab(url));
    return;
  }
  safeAssignLocation(url);
}

const authFormsView = document.getElementById('authFormsView');
const registerSuccessView = document.getElementById('registerSuccessView');
const messageEl = document.getElementById('message');
const registerSuccessText = document.getElementById('registerSuccessText');

function showMessage(text, type = 'error') {
  if (!messageEl) return;
  messageEl.textContent = text;
  messageEl.style.color = type === 'success' ? 'green' : type === 'info' ? '#333' : 'red';
}

function activateTab(tab) {
  document.querySelectorAll('.auth-tab').forEach((btn) => {
    const isActive = btn.dataset.tab === tab;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  document.querySelectorAll('.auth-panel').forEach((panel) => {
    const isLogin = panel.id === 'panel-login';
    const isActive = (tab === 'login' && isLogin) || (tab === 'register' && !isLogin);
    panel.classList.toggle('active', isActive);
    panel.hidden = !isActive;
  });

  showMessage('');
}

document.querySelectorAll('.auth-tab').forEach((btn) => {
  btn.addEventListener('click', () => activateTab(btn.dataset.tab));
});

document.querySelectorAll('.toggle-password').forEach((btn) => {
  btn.addEventListener('click', () => {
    const field = document.getElementById(btn.dataset.target);
    if (!field) return;
    const visible = field.type === 'text';
    field.type = visible ? 'password' : 'text';
    btn.textContent = visible ? '👁' : '🙈';
  });
});

document.getElementById('loginForm').addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email) {
    showMessage(t('login.emailEmpty'));
    return;
  }
  if (password.length < 6) {
    showMessage(t('login.passwordShort'));
    return;
  }

  try {
    const response = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include'
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
      if (response.status === 429) {
        showMessage(t('auth.tooManyAttempts'));
        return;
      }
      showMessage(data.message || t('login.error'));
      return;
    }

    showMessage(data.message || t('auth.loginSuccess'), 'success');
    setTimeout(() => {
      safeNavigate(authRedirectTarget());
    }, 800);
  } catch (error) {
    console.error('Login error:', error);
    showMessage(t('login.connectionError'));
  }
});

document.getElementById('registerForm').addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = document.getElementById('registerEmail').value.trim();
  const password = document.getElementById('registerPassword').value;

  if (!email) {
    showMessage(t('login.emailEmpty'));
    return;
  }
  if (password.length < 6) {
    showMessage(t('login.passwordShort'));
    return;
  }

  try {
    const response = await fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        ref: referralUsername
      })
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
      if (response.status === 429) {
        showMessage(t('auth.tooManyAttempts'));
        return;
      }
      showMessage(data.message || t('register.error'));
      return;
    }

    authFormsView.hidden = true;
    registerSuccessView.hidden = false;

    const templateEl = document.getElementById('registerSuccessTemplate');
    const template = templateEl?.innerHTML.trim() || t('register.emailSent');
    registerSuccessText.innerHTML = template.replace('{email}', escapeHtml(email));
  } catch (error) {
    console.error('Registration error:', error);
    showMessage(t('register.serverError'));
  }
});

document.getElementById('backToLoginBtn').addEventListener('click', () => {
  registerSuccessView.hidden = true;
  authFormsView.hidden = false;
  activateTab('login');
});

function initVkIdOneTap() {
  const container = document.getElementById('VkIdSdkOneTap');
  if (!container) return;

  function startOneTap() {
    if (!('VKIDSDK' in window)) return;
    const VKID = window.VKIDSDK;

    VKID.Config.init({
      app: 54486564,
      // Для приложения — возврат в оболочку, не на главную сайта
      redirectUrl: isAndroidAppShell()
        ? 'https://serpmonn.ru/frontend/app/index.html?app=1'
        : 'https://serpmonn.ru/',
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
          borderRadius: 8,
          width: 280,
          height: 44
        }
      })
      .on(VKID.WidgetEvents.ERROR, console.error)
      .on(VKID.OneTapInternalEvents.LOGIN_SUCCESS, async (payload) => {
        try {
          const { code, device_id: deviceId } = payload;
          if (!code || !deviceId) return;

          const tokens = await VKID.Auth.exchangeCode(code, deviceId);
          const userInfo = await VKID.Auth.userInfo(tokens.access_token);

          const vkUserId = userInfo.user?.id || userInfo.user?.user_id;
          const email = userInfo.user?.email ?? null;
          const name = userInfo.user?.first_name ?? null;

          if (!vkUserId) return;

          const resp = await fetch('/api/vkid-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ vkUserId, email, name })
          });

          const data = await resp.json();
          if (data?.success) {
            safeNavigate(authRedirectTarget());
          } else {
            showMessage(t('login.error'));
          }
        } catch (e) {
          console.error('VKID flow error:', e);
          showMessage(t('login.connectionError'));
        }
      });
  }

  if ('VKIDSDK' in window) {
    startOneTap();
    return;
  }

  if (window.__VKID_LOADING) return;
  window.__VKID_LOADING = true;

  const script = document.createElement('script');
  script.src = 'https://unpkg.com/@vkid/sdk@2.6.1/dist-sdk/umd/index.js';
  script.async = true;
  script.onload = () => {
    window.__VKID_LOADING = false;
    startOneTap();
  };
  script.onerror = (e) => {
    window.__VKID_LOADING = false;
    console.error('VK ID SDK load error', e);
  };
  document.body.appendChild(script);
}

let messengerPollTimer = null;
let messengerChallengeId = null;
let messengerDeepLink = null;

function setMessengerModalOpen(open) {
  const modal = document.getElementById('messengerLoginModal');
  if (!modal) return;
  modal.hidden = !open;
  if (!open) {
    if (messengerPollTimer) {
      clearInterval(messengerPollTimer);
      messengerPollTimer = null;
    }
    messengerChallengeId = null;
    messengerDeepLink = null;
    modal.classList.remove('messenger-modal--app');
  }
}

function setMessengerStatus(text) {
  const el = document.getElementById('messengerLoginStatus');
  if (el) el.textContent = text;
}

function setMessengerAppModeUi(on) {
  const modal = document.getElementById('messengerLoginModal');
  const hint = document.getElementById('messengerLoginHint');
  const canvas = document.getElementById('messengerQrCanvas');
  const openBtn = document.getElementById('messengerOpenAppBtn');
  if (modal) modal.classList.toggle('messenger-modal--app', Boolean(on));
  if (hint) {
    hint.textContent = on
      ? 'Подтвердите вход в Серпмонн Мессенджере'
      : 'Отсканируйте QR в мессенджере';
  }
  if (canvas) canvas.hidden = Boolean(on);
  if (openBtn) openBtn.hidden = !on;
}

function openMessengerDeepLink(url) {
  const href = String(url || '').trim();
  if (!href) return false;
  try {
    const CapApp = window.Capacitor?.Plugins?.App;
    if (CapApp && typeof CapApp.openUrl === 'function') {
      CapApp.openUrl({ url: href });
      return true;
    }
  } catch (_) {}
  try {
    window.location.href = href;
    return true;
  } catch (_) {
    return false;
  }
}

async function loadQrCodeLib() {
  if (window.QRCode?.toCanvas) return window.QRCode;
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/frontend/scripts/qrcode.min.js';
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('QR library failed to load'));
    document.body.appendChild(script);
  });
  if (!window.QRCode?.toCanvas) {
    throw new Error('QR library missing toCanvas');
  }
  return window.QRCode;
}

async function renderMessengerQr(payload) {
  const canvas = document.getElementById('messengerQrCanvas');
  if (!canvas) return;
  const QRCode = await loadQrCodeLib();
  const text = JSON.stringify(payload);
  await QRCode.toCanvas(canvas, text, {
    width: 220,
    margin: 1,
    color: { dark: '#222222', light: '#ffffff' }
  });
}

async function exchangeMessengerSession(exchangeCode) {
  const resp = await fetch('/api/messenger-auth/exchange', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ exchangeCode })
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok || !data?.success) {
    throw new Error(data?.message || 'exchange failed');
  }
  return data;
}

function startMessengerPolling(challengeId) {
  if (messengerPollTimer) clearInterval(messengerPollTimer);

  messengerPollTimer = setInterval(async () => {
    if (!messengerChallengeId || messengerChallengeId !== challengeId) return;
    try {
      const resp = await fetch(
        `/api/messenger-auth/status?challengeId=${encodeURIComponent(challengeId)}`,
        { credentials: 'include' }
      );
      const data = await resp.json().catch(() => ({}));
      if (data.status === 'pending') return;
      if (data.status === 'expired' || data.status === 'missing' || data.status === 'consumed') {
        setMessengerStatus('Код истёк — закройте окно и попробуйте снова');
        clearInterval(messengerPollTimer);
        messengerPollTimer = null;
        return;
      }
      if (data.status === 'approved' && data.exchangeCode) {
        clearInterval(messengerPollTimer);
        messengerPollTimer = null;
        setMessengerStatus('Подтверждено, входим…');
        await exchangeMessengerSession(data.exchangeCode);
        safeNavigate(authRedirectTarget());
      }
    } catch (e) {
      console.error('messenger status poll error:', e);
      setMessengerStatus('Ошибка связи — подождите или попробуйте снова');
    }
  }, 1500);
}

async function startMessengerLogin() {
  const btn = document.getElementById('messengerLoginBtn');
  if (btn) btn.disabled = true;
  const inApp = isAndroidAppShell();
  setMessengerAppModeUi(inApp);
  setMessengerStatus(inApp ? 'Открываем мессенджер…' : 'Ожидаем подтверждение…');

  try {
    const resp = await fetch('/api/messenger-auth/challenge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: '{}'
    });
    const data = await resp.json().catch(() => ({}));
    if (!resp.ok || !data?.success) {
      showMessage(data?.message || t('login.error'));
      return;
    }

    messengerChallengeId = data.challengeId;
    messengerDeepLink = data.deepLink || null;
    const codeEl = document.getElementById('messengerShortCode');
    if (codeEl) codeEl.textContent = data.shortCode || '————';

    setMessengerModalOpen(true);
    startMessengerPolling(data.challengeId);

    if (inApp) {
      const opened = openMessengerDeepLink(messengerDeepLink);
      if (opened) {
        setMessengerStatus('Подтвердите вход в мессенджере…');
      } else {
        setMessengerStatus(
          'Не удалось открыть мессенджер. Установите Серпмонн Мессенджер или введите код там вручную'
        );
      }
    } else {
      try {
        await renderMessengerQr(data.qrPayload);
      } catch (qrErr) {
        console.error('messenger QR render error:', qrErr);
        setMessengerStatus('QR не загрузился — используйте код ниже');
      }
    }
  } catch (e) {
    console.error('messenger login start error:', e);
    showMessage(t('login.connectionError'));
  } finally {
    if (btn) btn.disabled = false;
  }
}

function initMessengerLogin() {
  const btn = document.getElementById('messengerLoginBtn');
  if (btn) {
    btn.addEventListener('click', () => {
      startMessengerLogin();
    });
  }

  const openBtn = document.getElementById('messengerOpenAppBtn');
  if (openBtn) {
    openBtn.addEventListener('click', () => {
      if (!messengerDeepLink) {
        setMessengerStatus('Ссылка недоступна — закройте окно и попробуйте снова');
        return;
      }
      const opened = openMessengerDeepLink(messengerDeepLink);
      setMessengerStatus(
        opened
          ? 'Подтвердите вход в мессенджере…'
          : 'Не удалось открыть мессенджер. Установите его или введите код вручную'
      );
    });
  }

  document.querySelectorAll('[data-messenger-close]').forEach((el) => {
    el.addEventListener('click', () => setMessengerModalOpen(false));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setMessengerModalOpen(false);
  });
}

function initAuthAppShell() {
  if (!isAndroidAppShell()) return;
  document.documentElement.classList.add('auth-app-shell');
  document.body.classList.add('auth-app-shell');

  // Во viewer/iframe шапка родителя уже даёт «Назад» — свою не показываем
  let embedded = false;
  try {
    embedded = Boolean(window.parent && window.parent !== window);
  } catch (_) {
    embedded = true;
  }
  if (embedded) {
    document.body.classList.add('auth-app-shell--embedded');
    const bar = document.getElementById('authAppBar');
    if (bar) bar.hidden = true;
    return;
  }

  const bar = document.getElementById('authAppBar');
  if (bar) bar.hidden = false;

  const back = document.getElementById('authAppBack');
  if (back) {
    back.addEventListener('click', () => {
      try {
        if (window.history.length > 1) {
          window.history.back();
          return;
        }
      } catch (_) {}
      safeAssignLocation('/frontend/app/index.html?app=1');
    });
  }

  document.querySelectorAll('.auth-forgot a[href*="forgot"]').forEach((a) => {
    try {
      const u = new URL(a.getAttribute('href'), location.origin);
      u.searchParams.set('app', '1');
      a.setAttribute('href', u.pathname + u.search);
    } catch (_) {}
  });
}

function bootAuthPage() {
  initAuthAppShell();
  if (!isAndroidAppShell()) {
    generateCombinedBackground();
  }
  activateTab(initialTab);
  initVkIdOneTap();
  initMessengerLogin();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootAuthPage);
} else {
  bootAuthPage();
}
