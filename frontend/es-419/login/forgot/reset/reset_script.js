import { generateCombinedBackground } from '/frontend/scripts/backgroundGenerator.js';
import { buildAuthUrl, getFrontendPath, safeAssignLocation } from '../../../scripts/locale-paths.js';
import { getPageT } from '../../../scripts/i18n-loader.js';

document.addEventListener('DOMContentLoaded', async () => {
  const t = await getPageT('reset');

  generateCombinedBackground();

  const form = document.getElementById('resetForm');
  const message = document.getElementById('message');

  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  if (!token) {
    message.textContent = t('reset.invalidLink');
    message.style.color = 'red';
    form.style.display = 'none';
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const password = document.getElementById('password').value;
    const confirm = document.getElementById('confirm').value;

    if (password.length < 6) {
      message.textContent = t('reset.passwordShort');
      message.style.color = 'red';
      return;
    }

    if (password !== confirm) {
      message.textContent = t('reset.passwordMismatch');
      message.style.color = 'red';
      return;
    }

    try {
      const res = await fetch('https://serpmonn.ru/auth-api/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password })
      });

      const data = await res.json();
      message.textContent = data.message;
      message.style.color = res.ok ? 'green' : 'red';

      if (res.ok) {
        setTimeout(() => {
          safeAssignLocation(buildAuthUrl({
            tab: 'login',
            returnPath: getFrontendPath('profile/profile.html')
          }));
        }, 2000);
      }
    } catch (err) {
      message.textContent = t('reset.connectionError');
      message.style.color = 'red';
    }
  });
});
