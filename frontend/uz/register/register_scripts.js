import { generateCombinedBackground } from '/frontend/scripts/backgroundGenerator.js';
import { getPageT } from '../scripts/i18n-loader.js';

const t = await getPageT('register');

const urlParams = new URLSearchParams(window.location.search);
const referralUsername = urlParams.get('ref') || null;

document.getElementById('registerForm').addEventListener('submit', async function (event) {
  event.preventDefault();

  const username = document.getElementById('username').value;
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    const response = await fetch('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        email,
        password,
        ref: referralUsername
      }),
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (response.ok) {
      const userId = data.userId;
      sessionStorage.setItem('pendingUserId', userId);
      const telegramConfirmLink = data.confirmLink;
      document.getElementById('telegramConfirmLink').href = telegramConfirmLink;
      document.getElementById('confirmPopup').style.display = 'block';
    } else {
      document.getElementById('message').textContent = data.message || t('register.error');
      return;
    }
  } catch (error) {
    console.error('Registration error:', error);
    document.getElementById('message').textContent = t('register.serverError');
  }
});

document.getElementById('telegramConfirmLink').addEventListener('click', function (e) {
  e.preventDefault();

  const userId = sessionStorage.getItem('pendingUserId');
  if (!userId) {
    alert(t('register.userIdNotFound'));
    return;
  }

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  let telegramLink;

  if (isMobile) {
    telegramLink = `tg://resolve?domain=SerpmonnConfirmBot&start=${userId}`;
  } else {
    telegramLink = `https://www.serpmonn.ru/frontend/telegram-app/confirm.html?startapp=${userId}`;
  }

  if (isMobile) {
    window.location.href = telegramLink;

    setTimeout(() => {
      const webFallbackLink = `https://t.me/SerpmonnConfirmBot?startapp=${userId}`;
      window.open(webFallbackLink, '_blank');
    }, 1000);

    document.getElementById('message').textContent = t('register.telegramMobileHint');
  } else {
    window.open(telegramLink, '_blank');

    document.getElementById('message').innerHTML = `
      <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 10px 0;">
        <strong>${t('register.telegramDesktopTitle')}</strong>
        <p>${t('register.telegramDesktopHint')} <a href="${telegramLink}" target="_blank">${t('register.telegramDesktopLink')}</a></p>
        <p>${t('register.telegramDesktopReturn')}</p>
      </div>
    `;
  }

  document.getElementById('confirmPopup').style.display = 'none';
});

document.getElementById('emailConfirmButton').addEventListener('click', async () => {
  const email = document.getElementById('email').value;
  const userId = sessionStorage.getItem('pendingUserId');
  const button = document.getElementById('emailConfirmButton');

  button.disabled = true;

  try {
    const response = await fetch('/auth/confirm-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, userId }),
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (response.ok) {
      document.getElementById('message').textContent = t('register.emailSent');
      document.getElementById('confirmPopup').style.display = 'none';
      sessionStorage.removeItem('pendingUserId');
    } else {
      document.getElementById('message').textContent = data.message || t('register.emailError');
    }
  } catch (error) {
    console.error('Email confirmation error:', error);
    document.getElementById('message').textContent = t('register.serverError');
  } finally {
    button.disabled = false;
  }
});

document.getElementById('closePopup').addEventListener('click', function () {
  document.getElementById('confirmPopup').style.display = 'none';
});

document.addEventListener('DOMContentLoaded', () => {
  generateCombinedBackground();

  const passwordField = document.getElementById('password');
  const togglePassword = document.getElementById('togglePassword');

  if (togglePassword && passwordField) {
    togglePassword.addEventListener('click', () => {
      const isPasswordVisible = passwordField.type === 'text';
      passwordField.type = isPasswordVisible ? 'password' : 'text';
      togglePassword.textContent = isPasswordVisible ? '👁' : '🙈';
    });
  }
});
