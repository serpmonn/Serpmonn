import {
  apiGet,
  apiPost,
  buildFindingViewUrl,
  buildAuthUrl,
  loadT,
  getFindingT,
  showToast,
} from './findings-client.js';
import {
  escapeHtml,
  renderFindingContent,
} from './finding-content-render.js';

let initialized = false;
let onInboxRead = null;

function tk(key, vars) {
  return getFindingT(`finding.${key}`, vars);
}

function openPanel(modal) {
  if (!modal) return;
  modal.style.display = 'flex';
  requestAnimationFrame(() => {
    modal.setAttribute('data-open', 'true');
  });
  modal.querySelector('.finding-panel-dialog')?.focus();
}

function closePanel(modal) {
  if (!modal) return;
  modal.removeAttribute('data-open');
  setTimeout(() => {
    modal.style.display = 'none';
  }, 150);
}

function bindPanelClose(modal) {
  if (!modal || modal.dataset.boundClose) return;
  modal.dataset.boundClose = 'true';

  const close = () => closePanel(modal);
  modal.querySelector('.ai-share-backdrop')?.addEventListener('click', close);
  modal.querySelector('.finding-panel-close')?.addEventListener('click', close);
}

function ensureInboxModal() {
  let modal = document.getElementById('finding-inbox-modal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'finding-inbox-modal';
  modal.className = 'ai-share-modal finding-panel-modal';
  modal.style.display = 'none';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.innerHTML = `
    <div class="ai-share-backdrop"></div>
    <div class="ai-share-dialog finding-panel-dialog finding-inbox-dialog" tabindex="-1">
      <button type="button" class="ai-share-close finding-panel-close" aria-label="×">&times;</button>
      <h2 class="finding-panel-title" id="finding-inbox-modal-title"></h2>
      <p class="finding-panel-hint" id="finding-inbox-modal-hint"></p>
      <div class="finding-panel-body" id="finding-inbox-modal-list" aria-live="polite"></div>
    </div>
  `;
  document.body.appendChild(modal);
  bindPanelClose(modal);
  return modal;
}

function ensureViewModal() {
  let modal = document.getElementById('finding-view-modal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'finding-view-modal';
  modal.className = 'ai-share-modal finding-panel-modal';
  modal.style.display = 'none';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.innerHTML = `
    <div class="ai-share-backdrop"></div>
    <div class="ai-share-dialog finding-panel-dialog finding-view-dialog" tabindex="-1">
      <button type="button" class="ai-share-close finding-panel-close" aria-label="×">&times;</button>
      <div class="finding-panel-body finding-view-panel-body">
        <div id="finding-modal-view-root"></div>
        <div id="finding-modal-image-results"></div>
        <div id="finding-modal-video-results"></div>
        <div class="finding-view-actions finding-view-actions--row">
          <button type="button" class="ai-share-copy-btn" id="finding-modal-copy-link"></button>
          <button type="button" class="finding-share-toggle-btn" id="finding-modal-share-toggle" hidden></button>
        </div>
        <div class="finding-share-form" id="finding-modal-share-form" hidden>
          <label class="finding-share-field">
            <input type="text" id="finding-modal-share-username" autocomplete="off" spellcheck="false">
          </label>
          <label class="finding-share-field">
            <textarea id="finding-modal-share-message" rows="2"></textarea>
          </label>
          <button type="button" class="ai-share-copy-btn finding-share-submit-btn" id="finding-modal-share-submit"></button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  bindPanelClose(modal);
  return modal;
}

function ensureFeedModal() {
  let modal = document.getElementById('finding-feed-modal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'finding-feed-modal';
  modal.className = 'ai-share-modal finding-panel-modal';
  modal.style.display = 'none';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.innerHTML = `
    <div class="ai-share-backdrop"></div>
    <div class="ai-share-dialog finding-panel-dialog finding-inbox-dialog" tabindex="-1">
      <button type="button" class="ai-share-close finding-panel-close" aria-label="×">&times;</button>
      <h2 class="finding-panel-title" id="finding-feed-modal-title"></h2>
      <p class="finding-panel-hint" id="finding-feed-modal-hint"></p>
      <div class="finding-panel-body" id="finding-feed-modal-list" aria-live="polite"></div>
    </div>
  `;
  document.body.appendChild(modal);
  bindPanelClose(modal);
  return modal;
}

function renderInboxSkeleton(count = 3) {
  return Array.from({ length: count }, () => '<div class="finding-inbox-skeleton" aria-hidden="true"></div>').join('');
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString(document.documentElement.lang || 'ru');
  } catch {
    return iso || '';
  }
}

async function loadInboxInto(modal) {
  const titleEl = modal.querySelector('#finding-inbox-modal-title');
  const hintEl = modal.querySelector('#finding-inbox-modal-hint');
  const listEl = modal.querySelector('#finding-inbox-modal-list');

  if (titleEl) titleEl.textContent = tk('inboxTitle');
  if (hintEl) {
    const hint = tk('inboxHint');
    hintEl.textContent = hint;
    hintEl.hidden = !hint;
  }

  if (!listEl) return;

  listEl.classList.add('findings-inbox-list--loading');
  listEl.setAttribute('aria-busy', 'true');
  listEl.innerHTML = renderInboxSkeleton(3);

  const { ok, data } = await apiGet('/api/findings/inbox/list');
  listEl.classList.remove('findings-inbox-list--loading');
  listEl.setAttribute('aria-busy', 'false');

  if (!ok) {
    listEl.innerHTML = `<p class="finding-empty finding-inbox-empty">${escapeHtml(tk('loginRequired'))}</p>`;
    return;
  }

  const items = data.items || [];
  if (!items.length) {
    listEl.innerHTML = `<p class="finding-empty finding-inbox-empty">${escapeHtml(tk('noInbox'))}</p>`;
    return;
  }

  listEl.innerHTML = items
    .map((item, index) => {
      const unread = !item.read_at ? ' finding-inbox-item--unread' : '';
      return `
        <article class="finding-inbox-item${unread} finding-inbox-item--enter" style="--inbox-delay:${index * 60}ms" data-share-id="${escapeHtml(item.share_id)}" data-public-id="${escapeHtml(item.public_id)}">
          <p class="finding-inbox-from">${escapeHtml(tk('fromUser', { user: item.from_username || '?' }))}</p>
          <h3 class="finding-inbox-query">${escapeHtml(item.query_text || '')}</h3>
          ${item.message ? `<p class="finding-inbox-message">${escapeHtml(item.message)}</p>` : ''}
          <p class="finding-inbox-date">${escapeHtml(formatDate(item.created_at))}</p>
          <span class="secondary-button secondary-button--xs finding-inbox-open-btn">${escapeHtml(tk('viewFinding'))}</span>
        </article>
      `;
    })
    .join('');

  listEl.querySelectorAll('.finding-inbox-item').forEach((el) => {
    el.addEventListener('click', async () => {
      const publicId = el.dataset.publicId;
      const shareId = el.dataset.shareId;
      if (shareId) {
        await apiPost(`/api/findings/inbox/${shareId}/read`, {});
        el.classList.remove('finding-inbox-item--unread');
        onInboxRead?.();
      }
      if (publicId) {
        closePanel(modal);
        openFindingModal(publicId);
      }
    });
    el.style.cursor = 'pointer';
  });
}

async function loadFeedInto(modal) {
  const titleEl = modal.querySelector('#finding-feed-modal-title');
  const hintEl = modal.querySelector('#finding-feed-modal-hint');
  const listEl = modal.querySelector('#finding-feed-modal-list');

  if (titleEl) titleEl.textContent = tk('feedTitle');
  if (hintEl) {
    const hint = tk('feedHint');
    hintEl.textContent = hint;
    hintEl.hidden = !hint;
  }

  if (!listEl) return;

  listEl.classList.add('findings-inbox-list--loading');
  listEl.setAttribute('aria-busy', 'true');
  listEl.innerHTML = renderInboxSkeleton(3);

  const { ok, data } = await apiGet('/api/findings/feed/list');
  listEl.classList.remove('findings-inbox-list--loading');
  listEl.setAttribute('aria-busy', 'false');

  if (!ok) {
    listEl.innerHTML = `<p class="finding-empty finding-inbox-empty">${escapeHtml(tk('loadFailed'))}</p>`;
    return;
  }

  const items = data.items || [];
  if (!items.length) {
    listEl.innerHTML = `<p class="finding-empty finding-inbox-empty">${escapeHtml(tk('noFeed'))}</p>`;
    return;
  }

  listEl.innerHTML = items
    .map((item, index) => `
        <article class="finding-inbox-item finding-feed-item finding-inbox-item--enter" style="--inbox-delay:${index * 60}ms" data-public-id="${escapeHtml(item.public_id)}">
          <p class="finding-inbox-from">${escapeHtml(tk('byUser', { user: item.author_username || '?' }))}</p>
          <h3 class="finding-inbox-query">${escapeHtml(item.query_text || '')}</h3>
          <p class="finding-inbox-date">${escapeHtml(formatDate(item.created_at))}</p>
          <span class="secondary-button secondary-button--xs finding-inbox-open-btn">${escapeHtml(tk('viewFinding'))}</span>
        </article>
      `)
    .join('');

  listEl.querySelectorAll('.finding-feed-item').forEach((el) => {
    el.addEventListener('click', () => {
      const publicId = el.dataset.publicId;
      if (publicId) {
        closePanel(modal);
        openFindingModal(publicId);
      }
    });
    el.style.cursor = 'pointer';
  });
}

export async function openFeedModal() {
  await loadT();
  const modal = ensureFeedModal();
  openPanel(modal);
  await loadFeedInto(modal);
}

export async function openInboxModal() {
  await loadT();
  const modal = ensureInboxModal();
  openPanel(modal);
  await loadInboxInto(modal);
}

export async function openFindingModal(publicId) {
  if (!publicId || !String(publicId).startsWith('fnd_')) return;

  await loadT();
  const modal = ensureViewModal();
  const rootEl = modal.querySelector('#finding-modal-view-root');
  const imageEl = modal.querySelector('#finding-modal-image-results');
  const videoEl = modal.querySelector('#finding-modal-video-results');
  const copyBtn = modal.querySelector('#finding-modal-copy-link');
  const shareToggleBtn = modal.querySelector('#finding-modal-share-toggle');
  const shareForm = modal.querySelector('#finding-modal-share-form');
  const shareUsername = modal.querySelector('#finding-modal-share-username');
  const shareMessage = modal.querySelector('#finding-modal-share-message');
  const shareSubmitBtn = modal.querySelector('#finding-modal-share-submit');

  if (rootEl) {
    rootEl.innerHTML = `<p class="finding-loading">${escapeHtml(tk('inboxLoading'))}</p>`;
  }
  if (imageEl) {
    imageEl.innerHTML = '';
    imageEl.style.display = 'none';
  }
  if (videoEl) {
    videoEl.innerHTML = '';
    videoEl.style.display = 'none';
  }
  if (shareForm) shareForm.hidden = true;
  if (shareToggleBtn) shareToggleBtn.hidden = true;

  openPanel(modal);

  const t = (key, vars) => tk(key, vars);
  const { ok, status, data } = await apiGet(`/api/findings/${encodeURIComponent(publicId)}`);

  if (!ok) {
    const msg = status === 403 ? t('forbidden') : t('notFound');
    if (rootEl) rootEl.innerHTML = `<p class="finding-error">${escapeHtml(msg)}</p>`;
    return;
  }

  renderFindingContent({
    rootEl,
    imageEl,
    videoEl,
    data,
    t,
    sourcesListId: `finding-modal-sources-${publicId}`,
  });

  if (copyBtn) {
    copyBtn.textContent = t('copyLinkPrompt');
    copyBtn.onclick = async () => {
      const url = buildFindingViewUrl(publicId);
      try {
        await navigator.clipboard.writeText(url);
        showToast(t('linkCopied'));
      } catch {
        window.prompt(t('copyLinkPrompt'), url);
      }
    };
  }

  const canShare = data.canShare === true;
  if (shareToggleBtn) {
    shareToggleBtn.hidden = !canShare;
    shareToggleBtn.textContent = t('sendToFriend');
    shareToggleBtn.onclick = () => {
      if (!shareForm) return;
      const nextOpen = shareForm.hidden;
      shareForm.hidden = !nextOpen;
      if (nextOpen) shareUsername?.focus();
    };
  }

  if (shareUsername) {
    shareUsername.placeholder = t('usernamePlaceholder');
    shareUsername.value = '';
  }
  if (shareMessage) {
    shareMessage.placeholder = t('messagePlaceholder');
    shareMessage.value = '';
  }
  if (shareSubmitBtn) {
    shareSubmitBtn.textContent = t('sendToUser');
    shareSubmitBtn.onclick = async () => {
      const toUsername = (shareUsername?.value || '').trim().replace(/^@/, '');
      if (!toUsername) return;

      shareSubmitBtn.disabled = true;
      const { ok, status, data: resp } = await apiPost(
        `/api/findings/${encodeURIComponent(publicId)}/share`,
        {
          toUsername,
          message: (shareMessage?.value || '').trim(),
        }
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
    };
  }
}

export async function initFindingsModals(options = {}) {
  if (initialized) return;
  initialized = true;
  onInboxRead = options.onInboxRead || null;

  await loadT();
  ensureInboxModal();
  ensureViewModal();
  ensureFeedModal();

  document.addEventListener('click', (event) => {
    const feedTrigger = event.target.closest('[data-finding-open-feed]');
    if (feedTrigger) {
      event.preventDefault();
      openFeedModal();
      return;
    }

    const inboxTrigger = event.target.closest('[data-finding-open-inbox]');
    if (inboxTrigger) {
      event.preventDefault();
      openInboxModal();
      return;
    }

    const findingTrigger = event.target.closest('[data-finding-open]');
    if (findingTrigger) {
      const publicId = findingTrigger.dataset.findingOpen;
      if (publicId && publicId.startsWith('fnd_')) {
        event.preventDefault();
        openFindingModal(publicId);
      }
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const inboxModal = document.getElementById('finding-inbox-modal');
    const feedModal = document.getElementById('finding-feed-modal');
    const viewModal = document.getElementById('finding-view-modal');
    if (viewModal?.getAttribute('data-open') === 'true') {
      closePanel(viewModal);
    } else if (inboxModal?.getAttribute('data-open') === 'true') {
      closePanel(inboxModal);
    } else if (feedModal?.getAttribute('data-open') === 'true') {
      closePanel(feedModal);
    }
  });
}
