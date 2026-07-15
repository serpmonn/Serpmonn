import { generateCombinedBackground } from '/frontend/scripts/backgroundGenerator.js';
import { getFrontendPath, sanitizeReturnPath } from '../scripts/locale-paths.js';
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
  const target = sanitizeReturnPath(url) || (typeof url === 'string' && url.startsWith('/frontend/') ? url : null);
  if (target) window.location.assign(target);
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

function bootAuthPage() {
  generateCombinedBackground();
  activateTab(initialTab);
  initVkIdOneTap();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootAuthPage);
} else {
  bootAuthPage();
}
