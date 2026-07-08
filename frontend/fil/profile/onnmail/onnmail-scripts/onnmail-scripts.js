import { getFrontendPath } from '../../../scripts/locale-paths.js';
import { getPageT } from '../../../scripts/i18n-loader.js';

const registerForm = document.getElementById('registerForm');
const statusMessage = document.getElementById('statusMessage');
let csrfToken = '';
let t = (key) => key;

const checkUserStatus = async () => {
    try {
        const response = await fetch('https://serpmonn.ru/profile/get', {
            credentials: 'include'
        });

        if (!response.ok) {
            const data = await response.json();
            if (response.status === 401) {
                statusMessage.textContent = data.message || t('onnmail.loginRequired');
                window.location.href = getFrontendPath('login/login.html');
                return false;
            }
            if (response.status === 403) {
                statusMessage.textContent = data.message || t('onnmail.accessDenied');
                return false;
            }
            throw new Error('unauthorized');
        }
        const data = await response.json();
        if (!data.confirmed) {
            statusMessage.textContent = t('onnmail.confirmFirst');
            return false;
        }
        if (data.mailbox_created) {
            statusMessage.textContent = t('onnmail.alreadyCreated');
            return false;
        }
        registerForm.style.display = 'block';
        return true;
    } catch (error) {
        console.error('Onnmail status check error:', error);
        statusMessage.textContent = t('onnmail.loadError');
        return false;
    }
};

const handleRegister = async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const emailLocalPart = document.getElementById('emailLocalPart').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    const passwordConfirm = document.getElementById('passwordConfirm').value;
    const messageEl = document.getElementById('registerMessage');

    messageEl.textContent = '';

    if (password !== passwordConfirm) {
        messageEl.textContent = t('onnmail.passwordMismatch');
        return;
    }
    if (!emailLocalPart || !username || !password) {
        messageEl.textContent = t('onnmail.fillAllFields');
        return;
    }
    if (!/^[a-z0-9._%+-]+$/.test(emailLocalPart)) {
        messageEl.textContent = t('onnmail.invalidLogin');
        return;
    }
    if (password.length < 8) {
        messageEl.textContent = t('onnmail.passwordMin8');
        return;
    }

    try {
        const response = await fetch('https://serpmonn.ru/mail-api/create-mailbox', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrfToken
            },
            credentials: 'include',
            body: JSON.stringify({ username, emailLocalPart, password })
        });

        const data = await response.json();

        if (!response.ok) {
            messageEl.textContent = data.message || t('onnmail.registerError');
            messageEl.style.color = 'red';
            return;
        }

        window.location.href = 'https://serpmonn.ru/mail/';
    } catch (error) {
        console.error('Onnmail registration error:', error);
        messageEl.textContent = error.message?.includes('already exists')
            ? t('onnmail.mailboxExists')
            : (error.message || t('onnmail.registerError'));
        messageEl.style.color = 'red';
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    t = await getPageT('onnmail');
    const canRegister = await checkUserStatus();
    if (canRegister) {
        registerForm.addEventListener('submit', handleRegister);
    }
});
