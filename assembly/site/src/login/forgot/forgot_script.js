import { t } from '/frontend/scripts/i18n-loader.js';

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('forgot-form');
    const message = document.getElementById('forgot-message');

    if (!form) return;

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const email = document.getElementById('forgot-email').value.trim();

        if (!email) {
            message.textContent = t('forgot.emailEmpty');
            message.style.color = 'red';
            return;
        }

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();
            message.textContent = data.message || t('forgot.success');
            message.style.color = response.ok ? 'green' : 'red';
        } catch (err) {
            message.textContent = t('login.connectionError');
            message.style.color = 'red';
        }
    });
});
