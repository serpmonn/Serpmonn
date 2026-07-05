import { t } from '/frontend/scripts/i18n-loader.js';

document.addEventListener('DOMContentLoaded', function () {
    // --- Name edit ---
    const nameInput = document.getElementById('profile-name-input');
    const nameBtn = document.getElementById('profile-name-btn');
    const nameMsg = document.getElementById('profile-name-message');

    if (nameInput) {
        nameInput.setAttribute('placeholder', t('profile.namePlaceholder'));
    }

    if (nameBtn) {
        nameBtn.addEventListener('click', async function () {
            const name = nameInput ? nameInput.value.trim() : '';
            try {
                const response = await fetch('/api/profile/update-name', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name })
                });
                const data = await response.json();
                if (nameMsg) {
                    nameMsg.textContent = data.message || '';
                    nameMsg.style.color = response.ok ? 'green' : 'red';
                }
            } catch (err) {
                if (nameMsg) {
                    nameMsg.textContent = t('login.connectionError');
                    nameMsg.style.color = 'red';
                }
            }
        });
    }

    // --- Email edit ---
    const emailInput = document.getElementById('profile-email-input');
    const emailBtn = document.getElementById('profile-email-btn');
    const emailMsg = document.getElementById('profile-email-message');

    if (emailInput) {
        emailInput.setAttribute('placeholder', t('profile.emailPlaceholder'));
    }

    if (emailBtn) {
        emailBtn.addEventListener('click', async function () {
            const email = emailInput ? emailInput.value.trim() : '';
            try {
                const response = await fetch('/api/profile/update-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                const data = await response.json();
                if (emailMsg) {
                    emailMsg.textContent = data.message || '';
                    emailMsg.style.color = response.ok ? 'green' : 'red';
                }
            } catch (err) {
                if (emailMsg) {
                    emailMsg.textContent = t('login.connectionError');
                    emailMsg.style.color = 'red';
                }
            }
        });
    }
});
