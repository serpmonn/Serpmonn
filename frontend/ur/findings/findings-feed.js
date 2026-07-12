import { generateCombinedBackground } from '../scripts/backgroundGenerator.js';
import { loadT, getFindingT } from '/frontend/scripts/findings-client.js';
import { openFeedModal, initFindingsModals } from '/frontend/scripts/findings-modals.js';

async function renderFeedPage() {
  generateCombinedBackground();
  await loadT();
  const t = (key, vars) => getFindingT(`finding.${key}`, vars);

  const titleEl = document.getElementById('findings-feed-title');
  const hintEl = document.getElementById('findings-feed-hint');
  const listEl = document.getElementById('findings-feed-list');

  if (titleEl) titleEl.textContent = t('feedTitle');
  document.title = `${t('feedTitle')} — Serpmonn`;
  if (hintEl) hintEl.textContent = t('feedHint');

  await initFindingsModals();
  if (listEl) {
    listEl.innerHTML = `<p class="plan-hint">${t('inboxLoading')}</p>`;
  }
  openFeedModal();
}

document.addEventListener('DOMContentLoaded', renderFeedPage);
