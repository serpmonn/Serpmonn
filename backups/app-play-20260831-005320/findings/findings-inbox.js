import { generateCombinedBackground } from '../scripts/backgroundGenerator.js';
import {
  apiGet,
  loadT,
  getFindingT,
} from '/frontend/scripts/findings-client.js?v=37';
import { openInboxModal, initFindingsModals } from '/frontend/scripts/findings-modals.js?v=37';

function pendingInboxPeer() {
  try {
    if (window.__SPN_OPEN_DM__) return String(window.__SPN_OPEN_DM__).replace(/^@+/, '');
    const own = new URLSearchParams(location.search).get('dm');
    if (own) return own.replace(/^@+/, '');
    if (window.parent && window.parent !== window) {
      const parentDm = new URLSearchParams(window.parent.location.search).get('dm');
      if (parentDm) return parentDm.replace(/^@+/, '');
    }
  } catch {
    /* ignore */
  }
  return '';
}

async function renderInboxPage() {
  if (!window.__SPN_ANDROID_APP__) generateCombinedBackground();
  await loadT();
  const t = (key, vars) => getFindingT(`finding.${key}`, vars);

  const titleEl = document.getElementById('findings-inbox-title');
  const hintEl = document.getElementById('findings-inbox-hint');
  const listEl = document.getElementById('findings-inbox-list');

  if (titleEl) titleEl.textContent = t('inboxTitle');
  document.title = `${t('inboxTitle')} — Serpmonn`;
  if (hintEl) hintEl.textContent = '';

  await initFindingsModals();
  if (listEl) {
    listEl.innerHTML = `<p class="plan-hint">${t('inboxLoading')}</p>`;
  }
  await openInboxModal({ openUsername: pendingInboxPeer() });
}

document.addEventListener('DOMContentLoaded', renderInboxPage);
