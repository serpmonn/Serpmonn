import {
  apiGet,
  buildFindingViewUrl,
  loadT,
  getFindingT,
  showToast,
  copyTextToClipboard,
} from '/frontend/scripts/findings-client.js';
import {
  escapeHtml,
  renderFindingContent,
} from '/frontend/scripts/finding-content-render.js';
import { applyShareIconButton, applyCopyIconButton, renderViewsControl } from '/frontend/scripts/finding-icons.js';
import { openShareMenuModal } from '/frontend/scripts/findings-modals.js';

function qs(name) {
  return new URLSearchParams(window.location.search).get(name) || '';
}

async function main() {
  await loadT();
  const t = (key, vars) => getFindingT(`finding.${key}`, vars);

  const publicId = qs('id').trim();
  const root = document.getElementById('finding-view-root');
  const imageEl = document.getElementById('ai-image-results');
  const videoEl = document.getElementById('ai-video-results');
  const searchInput = document.getElementById('finding-search-q');
  const resultContainer = document.getElementById('finding-result-container');

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

  const query = data.query || '';
  if (searchInput) searchInput.value = query;
  document.title = query ? `${query} — Serpmonn` : `${t('pageTitle')} — Serpmonn`;

  renderFindingContent({
    rootEl: root,
    imageEl,
    videoEl,
    data,
    t,
    sourcesListId: 'finding-view-sources-list',
    imagesListId: 'finding-view-images-list',
    videosListId: 'finding-view-videos-list',
  });

  const viewsEl = document.getElementById('finding-view-views');
  if (viewsEl) {
    const views = Number(data.viewsCount ?? data.views_count) || 0;
    viewsEl.innerHTML = renderViewsControl(views, { label: t('viewsLabel') });
  }

  if (resultContainer) {
    resultContainer.style.display = 'block';
    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const shareBtn = document.getElementById('finding-share-page');
  const shareToggleBtn = document.getElementById('finding-share-toggle');

  if (shareBtn) {
    const showCopy = data.visibility === 'public' || data.visibility === 'link';
    shareBtn.hidden = !showCopy;
    if (showCopy) {
      applyCopyIconButton(shareBtn, t('copyLinkPrompt'));
      shareBtn.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();
        const url = buildFindingViewUrl(publicId);
        const copied = await copyTextToClipboard(url);
        if (copied) {
          showToast(t('linkCopied'));
        } else {
          window.prompt(t('copyLinkPrompt'), url);
          showToast(t('linkCopied'));
        }
      });
    }
  }

  const canShare = data.canShare === true;
  if (shareToggleBtn) {
    shareToggleBtn.hidden = !canShare;
    applyShareIconButton(shareToggleBtn, t('shareMenuTitle'));
    shareToggleBtn.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      openShareMenuModal({
        publicId,
        isOwner: data.isOwner === true,
        visibility: data.visibility || 'private',
        query: data.query || '',
        replyToUsername: null,
        onPublished: () => {
          if (shareBtn) {
            applyCopyIconButton(shareBtn, t('copyLinkPrompt'));
            shareBtn.hidden = false;
            shareBtn.removeAttribute('aria-hidden');
          }
        },
      });
    });
  }
}

document.addEventListener('DOMContentLoaded', main);
