import { generateCombinedBackground } from '/frontend/scripts/backgroundGenerator.js';
import { getFrontendPath } from '../scripts/locale-paths.js';
import { getPageT } from '../scripts/i18n-loader.js';

const t = await getPageT('login');

document.getElementById('loginForm').addEventListener('submit', async function (event) {
  event.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const messageElement = document.getElementById('message');

  if (email.length < 1) {
    messageElement.textContent = t('login.emailEmpty');
    messageElement.style.color = 'red';
    return;
  }

  if (password.length < 6) {
    messageElement.textContent = t('login.passwordShort');
    messageElement.style.color = 'red';
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

    messageElement.textContent = data.message || t('login.error');
    messageElement.style.color = response.ok ? 'green' : 'red';

    if (response.ok) {
      setTimeout(() => {
        window.location.href = getFrontendPath('profile/profile.html');
      }, 1000);
    }
  } catch (error) {
    console.error('Login error:', error);
    messageElement.textContent = t('login.connectionError');
    messageElement.style.color = 'red';
  }
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
