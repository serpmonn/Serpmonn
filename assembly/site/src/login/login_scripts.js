import { generateCombinedBackground } from '/frontend/scripts/backgroundGenerator.js';
import { t } from '/frontend/scripts/i18n-loader.js';

document.addEventListener('DOMContentLoaded', function () {
    generateCombinedBackground();

    const form = document.getElementById('login-form');
    const messageElement = document.getElementById('login-message');

    if (!form) return;

    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();

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
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                window.location.href = data.redirect || '/';
            } else {
                messageElement.textContent = data.message || t('login.error');
                messageElement.style.color = 'red';
            }
        } catch (err) {
            messageElement.textContent = t('login.connectionError');
            messageElement.style.color = 'red';
        }
    });
});
