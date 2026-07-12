import { generateCombinedBackground } from '../scripts/backgroundGenerator.js';
import {
  apiGet,
  loadT,
  getFindingT,
} from '/frontend/scripts/findings-client.js';
import { openInboxModal, initFindingsModals } from '/frontend/scripts/findings-modals.js';

async function renderInboxPage() {
  generateCombinedBackground();
  await loadT();
  const t = (key, vars) => getFindingT(`finding.${key}`, vars);

  const titleEl = document.getElementById('findings-inbox-title');
  const hintEl = document.getElementById('findings-inbox-hint');
  const listEl = document.getElementById('findings-inbox-list');

  if (titleEl) titleEl.textContent = t('inboxTitle');
  document.title = `${t('inboxTitle')} — Serpmonn`;
  if (hintEl) hintEl.textContent = t('inboxHint');

  await initFindingsModals();
  if (listEl) {
    listEl.innerHTML = `<p class="plan-hint">${t('inboxLoading')}</p>`;
  }
  openInboxModal();
}

document.addEventListener('DOMContentLoaded', renderInboxPage);
