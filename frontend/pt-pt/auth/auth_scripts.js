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

function authRedirectTarget() {
  return safeReturnPath || getFrontendPath('profile/profile.html');
}

function safeNavigate(url) {
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
  }
}

function setMessengerStatus(text) {
  const el = document.getElementById('messengerLoginStatus');
  if (el) el.textContent = text;
}

async function loadQrCodeLib() {
  if (window.QRCode) return window.QRCode;
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.4/build/qrcode.min.js';
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.body.appendChild(script);
  });
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
  setMessengerStatus('Ожидаем подтверждение…');

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
    const codeEl = document.getElementById('messengerShortCode');
    if (codeEl) codeEl.textContent = data.shortCode || '————';

    await renderMessengerQr(data.qrPayload);
    setMessengerModalOpen(true);
    startMessengerPolling(data.challengeId);
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

  document.querySelectorAll('[data-messenger-close]').forEach((el) => {
    el.addEventListener('click', () => setMessengerModalOpen(false));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setMessengerModalOpen(false);
  });
}

function bootAuthPage() {
  generateCombinedBackground();
  activateTab(initialTab);
  initVkIdOneTap();
  initMessengerLogin();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootAuthPage);
} else {
  bootAuthPage();
}
