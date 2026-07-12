import {
  apiGet,
  apiPost,
  buildFindingViewUrl,
  buildAuthUrl,
  loadT,
  getFindingT,
  showToast,
} from '/frontend/scripts/findings-client.js';
import {
  escapeHtml,
  renderSourcesBlock,
  setupSourcesToggle,
  renderImageBlock,
  renderVideoBlock,
} from '/frontend/scripts/finding-content-render.js';

function qs(name) {
  return new URLSearchParams(window.location.search).get(name) || '';
}

async function main() {
  await loadT();
  const t = (key, vars) => getFindingT(`finding.${key}`, vars);

  const publicId = qs('id').trim();
  const root = document.getElementById('finding-view-root');
  const metaEl = document.getElementById('finding-view-meta');
  const badgeEl = document.getElementById('finding-view-badge');
  const searchInput = document.getElementById('finding-search-q');
  const resultContainer = document.getElementById('finding-result-container');
  const imageEl = document.getElementById('ai-image-results');
  const videoEl = document.getElementById('ai-video-results');

  if (!publicId || !publicId.startsWith('fnd_')) {
    if (root) root.innerHTML = `<p class="finding-error">${escapeHtml(t('notFound'))}</p>`;
    return;
  }

  const { ok, status, data } = await apiGet(`/api/findings/${encodeURIComponent(publicId)}`);

  if (!ok) {
    const msg = status === 403 ? t('forbidden') : t('notFound');
    if (root) root.innerHTML = `<p class="finding-error">${escapeHtml(msg)}</p>`;
    return;
  }

  const snap = data.snapshot || {};
  const answerText = snap.answer?.text || '';
  const query = data.query || '';
  const author = data.author ? `@${data.author}` : '';
  const createdAt = data.createdAt
    ? new Date(data.createdAt).toLocaleString(document.documentElement.lang || 'ru')
    : '';

  if (searchInput) searchInput.value = query;
  document.title = query ? `${query} — Serpmonn` : `${t('pageTitle')} — Serpmonn`;

  if (badgeEl) badgeEl.textContent = t('savedFindingLabel');
  if (metaEl) {
    const parts = [];
    if (author) parts.push(`${t('authorLabel')}: ${author}`);
    if (createdAt) parts.push(createdAt);
    metaEl.textContent = parts.join(' · ');
  }

  const images = snap.media?.images || [];
  const videos = snap.media?.videos || [];
  const sources = snap.sources || [];

  if (root) {
    root.innerHTML = `
      <div class="finding-view-answer">${escapeHtml(answerText).replace(/\n/g, '<br>')}</div>
      ${renderSourcesBlock(sources, t('sourcesLabel'))}
    `;
    setupSourcesToggle(root);
  }

  renderImageBlock(imageEl, images, t('imagesLabel'));
  renderVideoBlock(videoEl, videos, t('videosLabel'));

  if (resultContainer) {
    resultContainer.style.display = 'block';
    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const shareBtn = document.getElementById('finding-share-page');
  const shareToggleBtn = document.getElementById('finding-share-toggle');
  const shareForm = document.getElementById('finding-share-form');
  const shareUsername = document.getElementById('finding-share-username');
  const shareMessage = document.getElementById('finding-share-message');
  const shareSubmitBtn = document.getElementById('finding-share-submit');

  if (shareBtn) {
    shareBtn.textContent = t('copyLinkPrompt');
    shareBtn.addEventListener('click', async () => {
      const url = buildFindingViewUrl(publicId);
      try {
        await navigator.clipboard.writeText(url);
        showToast(t('linkCopied'));
      } catch {
        window.prompt(t('copyLinkPrompt'), url);
      }
    });
  }

  const canShare = data.canShare === true;
  if (shareToggleBtn) {
    shareToggleBtn.hidden = !canShare;
    shareToggleBtn.textContent = t('sendToFriend');
    shareToggleBtn.addEventListener('click', () => {
      if (!shareForm) return;
      const nextOpen = shareForm.hidden;
      shareForm.hidden = !nextOpen;
      if (nextOpen) shareUsername?.focus();
    });
  }
  if (shareUsername) shareUsername.placeholder = t('usernamePlaceholder');
  if (shareMessage) shareMessage.placeholder = t('messagePlaceholder');
  if (shareSubmitBtn) {
    shareSubmitBtn.textContent = t('sendToUser');
    shareSubmitBtn.addEventListener('click', async () => {
      const toUsername = (shareUsername?.value || '').trim().replace(/^@/, '');
      if (!toUsername) return;

      shareSubmitBtn.disabled = true;
      const { ok, status, data: resp } = await apiPost(
        `/api/findings/${encodeURIComponent(publicId)}/share`,
        { toUsername, message: (shareMessage?.value || '').trim() }
      );
      shareSubmitBtn.disabled = false;

      if (!ok) {
        if (status === 401) {
          window.location.href = buildAuthUrl(window.location.pathname + window.location.search);
          return;
        }
        const err = resp?.error;
        if (err === 'user_not_found') showToast(t('userNotFound'));
        else if (err === 'self_share') showToast(t('selfShare'));
        else showToast(t('shareFailed'));
        return;
      }

      showToast(t('shareSent', { username: resp?.toUsername || toUsername }));
      if (shareForm) shareForm.hidden = true;
      if (shareUsername) shareUsername.value = '';
      if (shareMessage) shareMessage.value = '';
    });
  }
}

document.addEventListener('DOMContentLoaded', main);
