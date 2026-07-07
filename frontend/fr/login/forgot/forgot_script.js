import { generateCombinedBackground } from '/frontend/scripts/backgroundGenerator.js';
import { getPageT } from '../../scripts/i18n-loader.js';

document.addEventListener('DOMContentLoaded', async () => {
  const t = await getPageT('forgot');

  generateCombinedBackground();

  const form = document.getElementById('forgotForm');
  const message = document.getElementById('message');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value.trim();
    if (!email) {
      message.textContent = t('forgot.emailEmpty');
      message.style.color = 'red';
      return;
    }

    try {
      const res = await fetch('https://serpmonn.ru/auth-api/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await res.json();
      message.textContent = data.message;
      message.style.color = res.ok ? 'green' : 'red';
    } catch (err) {
      message.textContent = t('forgot.connectionError');
      message.style.color = 'red';
    }
  });
});
