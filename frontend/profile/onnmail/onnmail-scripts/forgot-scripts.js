import { getFrontendPath, getCurrentReturnPath, redirectToAuth } from '../../../scripts/locale-paths.js';
import { getPageT } from '../../../scripts/i18n-loader.js';
import { csrfHeaders } from '../../../scripts/csrf.js';

let t = (key) => key;

async function safeJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  t = await getPageT('onnmail');

  const statusMessage = document.getElementById('statusMessage');
  const form = document.getElementById('forgotMailboxForm');
  const needLinkBox = document.getElementById('needLinkBox');
  const needCreateBox = document.getElementById('needCreateBox');

  document.getElementById('formTitle').textContent = t('onnmail.forgotTitle');
  document.getElementById('formHint').textContent = t('onnmail.forgotHint');
  document.getElementById('accountPassword').placeholder = t('onnmail.accountPasswordPlaceholder');
  document.getElementById('newPassword').placeholder = t('onnmail.newPasswordPlaceholder');
  document.getElementById('newPasswordConfirm').placeholder = t('onnmail.passwordConfirmPlaceholder');
  document.getElementById('submitBtn').textContent = t('onnmail.savePassword');
  document.getElementById('backToMail').textContent = t('onnmail.backToMail');
  document.getElementById('toProfile').textContent = t('onnmail.goProfile');
  document.getElementById('needLinkText').textContent = t('onnmail.needLinkText');
  document.getElementById('goProfileLinkBtn').textContent = t('onnmail.goProfile');
  document.getElementById('needCreateText').textContent = t('onnmail.needCreateText');
  document.getElementById('goCreateBtn').textContent = t('onnmail.goCreate');

  const profilePath = getFrontendPath('profile/profile.html');
  const createPath = getFrontendPath('profile/onnmail/onnmail.html');
  document.getElementById('toProfile').href = profilePath;
  document.getElementById('goProfileLinkBtn').addEventListener('click', () => {
    window.location.href = profilePath;
  });
  document.getElementById('goCreateBtn').addEventListener('click', () => {
    window.location.href = createPath;
  });

  let profile;
  try {
    const response = await fetch('/profile/info', { credentials: 'include' });
    profile = await safeJson(response);
    if (response.status === 401) {
      statusMessage.textContent = t('onnmail.loginRequired');
      redirectToAuth({ tab: 'login', returnPath: getCurrentReturnPath() });
      return;
    }
    if (!response.ok) {
      statusMessage.textContent = profile?.message || t('onnmail.loadError');
      return;
    }
  } catch (error) {
    console.error(error);
    statusMessage.textContent = t('onnmail.loadError');
    return;
  }

  if (!profile.mailbox_created) {
    needCreateBox.style.display = 'block';
    return;
  }

  if (!profile.mailbox_email) {
    needLinkBox.style.display = 'block';
    return;
  }

  document.getElementById('mailboxEmail').textContent = profile.mailbox_email;
  form.style.display = 'block';

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const messageEl = document.getElementById('formMessage');
    messageEl.textContent = '';
    messageEl.style.color = 'red';

    const accountPassword = document.getElementById('accountPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const newPasswordConfirm = document.getElementById('newPasswordConfirm').value;

    if (newPassword.length < 8) {
      messageEl.textContent = t('onnmail.passwordMin8');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      messageEl.textContent = t('onnmail.passwordMismatch');
      return;
    }

    try {
      const response = await fetch('/mail-api/change-password', {
        method: 'POST',
        headers: await csrfHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ accountPassword, newPassword, newPasswordConfirm })
      });
      const data = await safeJson(response);
      if (!response.ok) {
        messageEl.textContent = data?.message || t('onnmail.changeFailed');
        return;
      }
      messageEl.style.color = '#2e7d32';
      messageEl.textContent = data?.message || t('onnmail.changeSuccess');
      form.reset();
      document.getElementById('mailboxEmail').textContent = profile.mailbox_email;
    } catch (error) {
      console.error(error);
      messageEl.textContent = t('onnmail.changeFailed');
    }
  });
});
