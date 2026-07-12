import {
  apiGet,
  apiPost,
  apiPatch,
  buildFindingViewUrl,
  buildAuthUrl,
  loadT,
  getFindingT,
  showToast,
  copyTextToClipboard,
} from './findings-client.js';
import {
  escapeHtml,
  renderFindingContent,
} from './finding-content-render.js';
import {
  renderFindingListCard,
  renderInboxDialogCard,
  groupInboxDialogs,
} from './finding-list-card.js';
import { applyShareIconButton, updateLikeControl, updateCommentControl, applyCopyIconButton, applySaveIconButton, renderViewsControl, FINDING_COPY_ICON, FINDING_SHARE_ICON, FINDING_LIKE_ICON } from './finding-icons.js';
import { closeMenu } from './menu.js';

let initialized = false;
let onInboxRead = null;
let onNotificationsRead = null;

const feedState = { mode: 'all', q: '', offset: 0, items: [], hasMore: false };
const inboxState = { view: 'dialogs', username: null, items: [] };
let shareSendContext = null;
let shareMenuContext = null;
let modalStackZ = 100000;

function tk(key, vars) {
  return getFindingT(`finding.${key}`, vars);
}

function openPanel(modal) {
  if (!modal) return;
  modalStackZ += 1;
  modal.style.zIndex = String(modalStackZ);
  modal.style.display = 'flex';
  requestAnimationFrame(() => {
    modal.setAttribute('data-open', 'true');
  });
  modal.querySelector('.finding-panel-dialog, .ai-share-dialog, .finding-save-dialog')?.focus();
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

function authRedirect() {
  window.location.href = buildAuthUrl(window.location.pathname + window.location.search);
}

function bindFindingListCards(listEl, modal, { mode = 'feed' } = {}) {
  listEl.querySelectorAll('.finding-list-card').forEach((card) => {
    const publicId = card.dataset.publicId;
    const author = card.dataset.fromUsername || card.dataset.author;
    const shareId = card.dataset.shareId;
    const fromUsername = card.dataset.fromUsername;

    card.querySelectorAll('[data-action="open"]').forEach((btn) => {
      btn.addEventListener('click', async (event) => {
        event.stopPropagation();
        if (shareId) {
          await apiPost(`/api/findings/inbox/${shareId}/read`, {});
          card.classList.remove('finding-list-card--unread');
          onInboxRead?.();
        }
        closePanel(modal);
        openFindingModal(publicId);
      });
    });

    card.querySelectorAll('[data-action="comments"]').forEach((btn) => {
      btn.addEventListener('click', (event) => {
        event.stopPropagation();
        closePanel(modal);
        openFindingModal(publicId);
      });
    });

    card.querySelector('[data-action="reply"]')?.addEventListener('click', (event) => {
      event.stopPropagation();
      closePanel(modal);
      openFindingModal(publicId, { replyToUsername: fromUsername, openShareForm: true });
    });

    card.querySelector('[data-action="author"]')?.addEventListener('click', (event) => {
      event.stopPropagation();
      if (author) openAuthorFindingsModal(author);
    });

    card.querySelectorAll('[data-action="like"], [data-action="save"], [data-action="follow"]').forEach((btn) => {
      btn.addEventListener('click', async (event) => {
        event.stopPropagation();
        const action = btn.dataset.action;
        if (action === 'like') {
          const { ok, status, data } = await apiPost(`/api/findings/${encodeURIComponent(publicId)}/like`, {});
          if (status === 401) return authRedirect();
          if (!ok) return;
          updateLikeControl(btn, { liked: data.liked === true, count: data.likesCount || 0 });
          updateCommentControl(card.querySelector('.finding-comment-control'), {
            count: data.commentsCount || 0,
          });
        } else if (action === 'save') {
          const { ok, status, data } = await apiPost(`/api/findings/${encodeURIComponent(publicId)}/save`, {});
          if (status === 401) return authRedirect();
          if (!ok) {
            if (data?.error === 'already_owner') showToast(tk('alreadyOwner'));
            else showToast(tk('saveToMineFailed'));
            return;
          }
          applySaveIconButton(btn, tk('savedToMineShort'), { active: true });
          showToast(data.alreadySaved ? tk('alreadySavedToast') : tk('savedToMineToast'));
        } else if (action === 'follow' && author) {
          const { ok, status, data } = await apiPost(
            `/api/findings/users/${encodeURIComponent(author)}/follow`,
            {}
          );
          if (status === 401) return authRedirect();
          if (!ok) return;
          const following = data.following === true;
          const followersCount = Number(data.followersCount);
          listEl.querySelectorAll('.finding-list-card').forEach((other) => {
            if ((other.dataset.author || other.dataset.fromUsername) !== author) return;
            const followBtn = other.querySelector('[data-action="follow"]');
            if (followBtn) {
              followBtn.classList.toggle('finding-list-card__follow--active', following);
              const label = following ? tk('unfollowUser') : tk('followUser');
              followBtn.title = label;
              followBtn.setAttribute('aria-label', label);
              followBtn.textContent = label;
            }
            if (Number.isFinite(followersCount)) {
              const countEl = other.querySelector('.finding-list-card__followers-count');
              if (countEl) countEl.textContent = String(followersCount);
            }
          });
          showToast(following ? tk('followingToast') : tk('unfollowedToast'));
        }
      });
    });

    if (mode === 'feed' || mode === 'author') {
      card.addEventListener('click', (event) => {
        if (event.target.closest('.finding-list-card__head, .finding-list-card__actions, button, select, a')) return;
        closePanel(modal);
        openFindingModal(publicId);
      });
      card.classList.add('finding-list-card--clickable');
    }
  });
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
      <div class="finding-inbox-toolbar">
        <button type="button" class="finding-inbox-back-btn" id="finding-inbox-back-btn" hidden></button>
        <h2 class="finding-panel-title" id="finding-inbox-modal-title"></h2>
      </div>
      <p class="finding-panel-hint" id="finding-inbox-modal-hint"></p>
      <div class="finding-panel-body" id="finding-inbox-modal-list" aria-live="polite"></div>
    </div>
  `;
  document.body.appendChild(modal);
  bindPanelClose(modal);
  modal.querySelector('#finding-inbox-back-btn')?.addEventListener('click', () => {
    inboxState.view = 'dialogs';
    inboxState.username = null;
    loadInboxInto(modal);
  });
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
      <div class="finding-feed-toolbar">
        <div class="finding-feed-tabs" role="tablist">
          <button type="button" class="finding-feed-tab finding-feed-tab--active" data-feed-mode="all" role="tab"></button>
          <button type="button" class="finding-feed-tab" data-feed-mode="following" role="tab"></button>
        </div>
        <input type="search" class="finding-feed-search" id="finding-feed-search" autocomplete="off">
      </div>
      <p class="finding-panel-hint" id="finding-feed-modal-hint"></p>
      <div class="finding-panel-body" id="finding-feed-modal-list" aria-live="polite"></div>
      <button type="button" class="finding-feed-load-more" id="finding-feed-load-more" hidden></button>
    </div>
  `;
  document.body.appendChild(modal);
  bindPanelClose(modal);

  const searchEl = modal.querySelector('#finding-feed-search');
  let searchTimer = null;
  searchEl?.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      feedState.q = searchEl.value.trim();
      loadFeedInto(modal, { reset: true });
    }, 350);
  });

  modal.querySelectorAll('[data-feed-mode]').forEach((tab) => {
    tab.addEventListener('click', async () => {
      const mode = tab.dataset.feedMode;
      if (mode === 'following') {
        const auth = await apiGet('/auth/protected');
        if (!auth.ok) {
          authRedirect();
          return;
        }
      }
      feedState.mode = mode;
      modal.querySelectorAll('.finding-feed-tab').forEach((t) => {
        t.classList.toggle('finding-feed-tab--active', t.dataset.feedMode === mode);
      });
      loadFeedInto(modal, { reset: true });
    });
  });

  modal.querySelector('#finding-feed-load-more')?.addEventListener('click', () => {
    loadFeedInto(modal, { reset: false });
  });

  return modal;
}

function ensureNotificationsModal() {
  let modal = document.getElementById('finding-notifications-modal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'finding-notifications-modal';
  modal.className = 'ai-share-modal finding-panel-modal';
  modal.style.display = 'none';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.innerHTML = `
    <div class="ai-share-backdrop"></div>
    <div class="ai-share-dialog finding-panel-dialog finding-inbox-dialog" tabindex="-1">
      <button type="button" class="ai-share-close finding-panel-close" aria-label="×">&times;</button>
      <h2 class="finding-panel-title" id="finding-notifications-modal-title"></h2>
      <div class="finding-panel-body" id="finding-notifications-modal-list" aria-live="polite"></div>
    </div>
  `;
  document.body.appendChild(modal);
  bindPanelClose(modal);
  return modal;
}

function ensureAuthorModal() {
  let modal = document.getElementById('finding-author-modal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'finding-author-modal';
  modal.className = 'ai-share-modal finding-panel-modal';
  modal.style.display = 'none';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.innerHTML = `
    <div class="ai-share-backdrop"></div>
    <div class="ai-share-dialog finding-panel-dialog finding-inbox-dialog" tabindex="-1">
      <button type="button" class="ai-share-close finding-panel-close" aria-label="×">&times;</button>
      <div class="finding-author-header">
        <h2 class="finding-panel-title" id="finding-author-modal-title"></h2>
        <button type="button" class="secondary-button secondary-button--xs" id="finding-author-follow-btn" hidden></button>
      </div>
      <div class="finding-panel-body" id="finding-author-modal-list" aria-live="polite"></div>
    </div>
  `;
  document.body.appendChild(modal);
  bindPanelClose(modal);
  return modal;
}

function ensureViewModal() {
  const VIEW_MODAL_VERSION = '5';
  let modal = document.getElementById('finding-view-modal');
  if (modal && modal.dataset.version === VIEW_MODAL_VERSION) return modal;
  if (modal) modal.remove();

  modal = document.createElement('div');
  modal.id = 'finding-view-modal';
  modal.dataset.version = VIEW_MODAL_VERSION;
  modal.className = 'ai-share-modal finding-panel-modal';
  modal.style.display = 'none';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.innerHTML = `
    <div class="ai-share-backdrop"></div>
    <div class="ai-share-dialog finding-panel-dialog finding-view-dialog" tabindex="-1">
      <button type="button" class="ai-share-close finding-panel-close finding-dismiss-btn" aria-label="×">&times;</button>
      <div class="finding-panel-body finding-view-panel-body">
        <div id="finding-modal-view-root"></div>
        <div id="finding-modal-image-results"></div>
        <div id="finding-modal-video-results"></div>
        <div class="finding-view-actions finding-view-actions--row">
          <span id="finding-modal-views" class="finding-view-views"></span>
          <button type="button" class="finding-icon-btn finding-like-control finding-view-like-btn" id="finding-modal-like-btn" hidden>
            ${FINDING_LIKE_ICON}
            <span class="finding-like-control__count">0</span>
          </button>
          <button type="button" class="finding-icon-btn finding-copy-icon-btn" id="finding-modal-copy-link" hidden aria-hidden="true">${FINDING_COPY_ICON}</button>
          <button type="button" class="finding-icon-btn finding-share-icon-btn" id="finding-modal-share-toggle" hidden aria-hidden="true">${FINDING_SHARE_ICON}</button>
        </div>
        <section class="finding-comments" id="finding-modal-comments" hidden>
          <h3 class="finding-comments-title" id="finding-modal-comments-title"></h3>
          <div class="finding-comments-list" id="finding-modal-comments-list"></div>
          <form class="finding-comment-form" id="finding-modal-comment-form">
            <textarea id="finding-modal-comment-input" rows="2" required></textarea>
            <button type="submit" class="ai-share-copy-btn" id="finding-modal-comment-submit"></button>
          </form>
        </section>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  bindPanelClose(modal);
  return modal;
}

function ensureShareMenuModal() {
  let modal = document.getElementById('finding-share-menu-modal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'finding-share-menu-modal';
  modal.className = 'ai-share-modal finding-panel-modal';
  modal.style.display = 'none';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.innerHTML = `
    <div class="ai-share-backdrop"></div>
    <div class="ai-share-dialog finding-save-dialog" tabindex="-1">
      <button type="button" class="ai-share-close finding-share-menu-close" aria-label="×">&times;</button>
      <div class="ai-share-title" id="finding-share-menu-title"></div>
      <div class="finding-share-menu-actions">
        <button type="button" class="ai-share-copy-btn" id="finding-share-menu-friend"></button>
        <button type="button" class="finding-share-toggle-btn" id="finding-share-menu-feed" hidden></button>
      </div>
      <button type="button" class="finding-save-cancel-btn finding-save-cancel-btn--full" id="finding-share-menu-cancel"></button>
    </div>
  `;
  document.body.appendChild(modal);

  const closeMenuModal = () => {
    closePanel(modal);
    shareMenuContext = null;
  };
  modal.querySelector('.ai-share-backdrop')?.addEventListener('click', closeMenuModal);
  modal.querySelector('.finding-share-menu-close')?.addEventListener('click', closeMenuModal);
  modal.querySelector('#finding-share-menu-cancel')?.addEventListener('click', closeMenuModal);

  modal.querySelector('#finding-share-menu-friend')?.addEventListener('click', () => {
    const ctx = shareMenuContext;
    if (!ctx?.publicId) return;
    closePanel(modal);
    openShareSendModal({ publicId: ctx.publicId, replyToUsername: ctx.replyToUsername || null });
    shareMenuContext = null;
  });

  modal.querySelector('#finding-share-menu-feed')?.addEventListener('click', async () => {
    const ctx = shareMenuContext;
    if (!ctx?.publicId || !ctx.isOwner) return;
    const label = ctx.query || tk('pageTitle');
    if (!window.confirm(tk('publishConfirm', { query: label }))) return;

    const feedBtn = modal.querySelector('#finding-share-menu-feed');
    feedBtn.disabled = true;
    const { ok } = await apiPatch(`/api/findings/${encodeURIComponent(ctx.publicId)}`, {
      visibility: 'public',
    });
    feedBtn.disabled = false;
    if (!ok) {
      showToast(tk('visibilityFailed'));
      return;
    }

    closePanel(modal);
    showToast(tk('publishedToast'));
    ctx.onPublished?.();
    shareMenuContext = null;
  });

  return modal;
}

function localizeShareMenuModal(modal, { isOwner = false, visibility = 'private' } = {}) {
  const titleEl = modal.querySelector('#finding-share-menu-title');
  const friendBtn = modal.querySelector('#finding-share-menu-friend');
  const feedBtn = modal.querySelector('#finding-share-menu-feed');
  const cancelBtn = modal.querySelector('#finding-share-menu-cancel');

  if (titleEl) titleEl.textContent = tk('shareMenuTitle');
  if (friendBtn) friendBtn.textContent = tk('sendToFriend');
  if (feedBtn) {
    const showFeed = isOwner && visibility !== 'public';
    feedBtn.hidden = !showFeed;
    feedBtn.textContent = tk('publishToFeed');
    feedBtn.title = tk('publishToFeedHint');
  }
  if (cancelBtn) cancelBtn.textContent = tk('cancelLabel');
}

export function openShareMenuModal({
  publicId,
  isOwner = false,
  visibility = 'private',
  query = '',
  replyToUsername = null,
  onPublished = null,
} = {}) {
  if (!publicId) return;
  shareMenuContext = { publicId, isOwner, visibility, query, replyToUsername, onPublished };
  const modal = ensureShareMenuModal();
  localizeShareMenuModal(modal, { isOwner, visibility });
  openPanel(modal);
}

function ensureShareSendModal() {
  let modal = document.getElementById('finding-share-send-modal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'finding-share-send-modal';
  modal.className = 'ai-share-modal finding-panel-modal';
  modal.style.display = 'none';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.innerHTML = `
    <div class="ai-share-backdrop"></div>
    <div class="ai-share-dialog finding-save-dialog" tabindex="-1">
      <button type="button" class="ai-share-close finding-share-send-close" aria-label="×">&times;</button>
      <div class="ai-share-title" id="finding-share-send-title"></div>
      <div class="finding-share-form finding-send-form">
        <label class="finding-share-field">
          <input type="text" id="finding-share-send-username" autocomplete="off" spellcheck="false">
        </label>
        <label class="finding-share-field">
          <textarea id="finding-share-send-message" rows="2"></textarea>
        </label>
        <button type="button" class="ai-share-copy-btn finding-share-submit-btn" id="finding-share-send-submit"></button>
      </div>
      <button type="button" class="finding-save-cancel-btn finding-save-cancel-btn--full" id="finding-share-send-cancel"></button>
    </div>
  `;
  document.body.appendChild(modal);

  const closeSend = () => closePanel(modal);
  modal.querySelector('.ai-share-backdrop')?.addEventListener('click', closeSend);
  modal.querySelector('.finding-share-send-close')?.addEventListener('click', closeSend);
  modal.querySelector('#finding-share-send-cancel')?.addEventListener('click', closeSend);

  modal.querySelector('#finding-share-send-submit')?.addEventListener('click', async () => {
    const ctx = shareSendContext;
    if (!ctx?.publicId) return;

    const usernameEl = modal.querySelector('#finding-share-send-username');
    const messageEl = modal.querySelector('#finding-share-send-message');
    const submitBtn = modal.querySelector('#finding-share-send-submit');
    const toUsername = (usernameEl?.value || '').trim().replace(/^@/, '');
    if (!toUsername) {
      usernameEl?.focus();
      return;
    }

    submitBtn.disabled = true;
    const { ok, status, data } = await apiPost(
      `/api/findings/${encodeURIComponent(ctx.publicId)}/share`,
      {
        toUsername,
        message: (messageEl?.value || '').trim(),
      }
    );
    submitBtn.disabled = false;

    if (!ok) {
      if (status === 401) return authRedirect();
      const err = data?.error;
      if (err === 'user_not_found') showToast(tk('userNotFound'));
      else if (err === 'self_share') showToast(tk('selfShare'));
      else showToast(tk('shareFailed'));
      return;
    }

    closePanel(modal);
    const toastKey = ctx.replyToUsername ? 'replySent' : 'shareSent';
    showToast(tk(toastKey, { username: data?.toUsername || toUsername }));
    shareSendContext = null;
  });

  return modal;
}

function localizeShareSendModal(modal, { replyToUsername = null } = {}) {
  const t = (key, vars) => tk(key, vars);
  const titleEl = modal.querySelector('#finding-share-send-title');
  const submitBtn = modal.querySelector('#finding-share-send-submit');
  const cancelBtn = modal.querySelector('#finding-share-send-cancel');
  const usernameEl = modal.querySelector('#finding-share-send-username');
  const messageEl = modal.querySelector('#finding-share-send-message');

  if (titleEl) titleEl.textContent = t('sendToFriend');
  if (submitBtn) submitBtn.textContent = replyToUsername ? t('replySend') : t('sendToUser');
  if (cancelBtn) cancelBtn.textContent = t('cancelLabel');
  if (usernameEl) {
    usernameEl.placeholder = t('usernamePlaceholder');
    usernameEl.value = replyToUsername ? replyToUsername.replace(/^@/, '') : '';
  }
  if (messageEl) {
    messageEl.placeholder = t('messagePlaceholder');
    messageEl.value = '';
  }
}

export function openShareSendModal({ publicId, replyToUsername = null }) {
  if (!publicId) return;
  shareSendContext = { publicId, replyToUsername };
  const modal = ensureShareSendModal();
  localizeShareSendModal(modal, { replyToUsername });
  openPanel(modal);
  modal.querySelector('#finding-share-send-username')?.focus();
}

function setupFindingViewActions({
  publicId,
  t,
  copyBtn,
  shareToggleBtn,
  findingData,
  replyToUsername,
  openShareForm,
  viewModal,
}) {
  const canShare = findingData?.canShare === true;
  const visibility = findingData?.visibility || 'private';
  const showCopy = visibility === 'public' || visibility === 'link';

  if (copyBtn) {
    if (showCopy) {
      applyCopyIconButton(copyBtn, t('copyLinkPrompt'));
      copyBtn.hidden = false;
      copyBtn.removeAttribute('aria-hidden');
      copyBtn.disabled = false;
      copyBtn.onclick = async (event) => {
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
      };
    } else {
      copyBtn.hidden = true;
      copyBtn.disabled = true;
      copyBtn.onclick = null;
      copyBtn.setAttribute('aria-hidden', 'true');
    }
  }

  if (shareToggleBtn) {
    if (canShare) {
      applyShareIconButton(shareToggleBtn, t('shareMenuTitle'));
      shareToggleBtn.hidden = false;
      shareToggleBtn.disabled = false;
      shareToggleBtn.removeAttribute('aria-hidden');
      shareToggleBtn.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        openShareMenuModal({
          publicId,
          isOwner: findingData?.isOwner === true,
          visibility,
          query: findingData?.query || '',
          replyToUsername: null,
          onPublished: () => {
            setupFindingViewActions({
              publicId,
              t,
              copyBtn,
              shareToggleBtn,
              findingData: { ...findingData, visibility: 'public' },
              replyToUsername,
              openShareForm: false,
              viewModal,
            });
          },
        });
      };
    } else {
      shareToggleBtn.hidden = true;
      shareToggleBtn.disabled = true;
      shareToggleBtn.onclick = null;
      shareToggleBtn.setAttribute('aria-hidden', 'true');
    }
  }

  if (openShareForm && replyToUsername) {
    openShareSendModal({ publicId, replyToUsername });
  }

  void viewModal;
}

async function loadCommentsSection(modal, publicId, t) {
  const section = modal.querySelector('#finding-modal-comments');
  const listEl = modal.querySelector('#finding-modal-comments-list');
  const titleEl = modal.querySelector('#finding-modal-comments-title');
  const form = modal.querySelector('#finding-modal-comment-form');
  const input = modal.querySelector('#finding-modal-comment-input');
  const submitBtn = modal.querySelector('#finding-modal-comment-submit');

  if (!section || !listEl) return;

  section.hidden = false;
  if (titleEl) titleEl.textContent = t('commentsTitle');
  if (input) input.placeholder = t('commentPlaceholder');
  if (submitBtn) submitBtn.textContent = t('commentSend');

  const { ok, data } = await apiGet(`/api/findings/${encodeURIComponent(publicId)}/comments`);
  const items = ok ? data.items || [] : [];

  if (!items.length) {
    listEl.innerHTML = `<p class="plan-hint">${escapeHtml(t('noComments'))}</p>`;
  } else {
    listEl.innerHTML = items
      .map(
        (c) => `
      <article class="finding-comment-item">
        <p class="finding-comment-author">${escapeHtml(tk('byUser', { user: c.author_username || '?' }))}</p>
        <p class="finding-comment-body">${escapeHtml(c.body)}</p>
        <p class="finding-comment-date">${escapeHtml(formatDate(c.created_at))}</p>
      </article>`
      )
      .join('');
  }

  if (form && !form.dataset.bound) {
    form.dataset.bound = 'true';
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const body = (input?.value || '').trim();
      if (!body) return;
      submitBtn.disabled = true;
      const { ok: posted, status, data: resp } = await apiPost(
        `/api/findings/${encodeURIComponent(publicId)}/comments`,
        { body }
      );
      submitBtn.disabled = false;
      if (status === 401) return authRedirect();
      if (!posted) {
        showToast(t('commentFailed'));
        return;
      }
      if (input) input.value = '';
      await loadCommentsSection(modal, publicId, t);
      const likeBtn = modal.querySelector('#finding-modal-like-btn');
      if (likeBtn && resp?.commentsCount != null) {
        updateLikeControl(likeBtn, {
          liked: likeBtn.classList.contains('finding-like-control--active'),
          count: resp.likesCount || 0,
        });
      }
    });
  }
}

function setupLikeButton(modal, publicId, findingData, t) {
  const likeBtn = modal.querySelector('#finding-modal-like-btn');
  if (!likeBtn) return;

  updateLikeControl(likeBtn, {
    liked: findingData.likedByMe === true,
    count: findingData.likesCount || 0,
  });
  likeBtn.dataset.likeLabel = t('likeAction');
  likeBtn.dataset.unlikeLabel = t('unlikeAction');
  likeBtn.title = findingData.likedByMe ? t('unlikeAction') : t('likeAction');
  likeBtn.setAttribute('aria-label', likeBtn.title);
  likeBtn.hidden = false;

  likeBtn.onclick = async () => {
    const { ok, status, data } = await apiPost(`/api/findings/${encodeURIComponent(publicId)}/like`, {});
    if (status === 401) return authRedirect();
    if (!ok) return;
    updateLikeControl(likeBtn, { liked: data.liked === true, count: data.likesCount || 0 });
  };
}

async function loadInboxInto(modal) {
  const titleEl = modal.querySelector('#finding-inbox-modal-title');
  const hintEl = modal.querySelector('#finding-inbox-modal-hint');
  const listEl = modal.querySelector('#finding-inbox-modal-list');
  const backBtn = modal.querySelector('#finding-inbox-back-btn');
  const t = (key, vars) => tk(key, vars);

  if (!listEl) return;

  if (inboxState.view === 'thread' && inboxState.username) {
    if (backBtn) {
      backBtn.hidden = false;
      backBtn.textContent = t('inboxBack');
    }
    if (titleEl) titleEl.textContent = t('byUser', { user: inboxState.username });
    if (hintEl) hintEl.hidden = true;

    const threadItems = inboxState.items.filter(
      (item) => (item.from_username || '?') === inboxState.username
    );
    if (!threadItems.length) {
      inboxState.view = 'dialogs';
      inboxState.username = null;
      return loadInboxInto(modal);
    }

    listEl.innerHTML = threadItems
      .map((item, index) =>
        renderFindingListCard(item, {
          mode: 'inbox',
          t,
          index,
          unread: !item.read_at,
          message: item.message || '',
          shareId: item.share_id,
          fromUsername: item.from_username || '',
        })
      )
      .join('');
    bindFindingListCards(listEl, modal, { mode: 'inbox' });
    return;
  }

  if (backBtn) backBtn.hidden = true;
  if (titleEl) titleEl.textContent = t('inboxTitle');
  if (hintEl) {
    const hint = t('inboxHint');
    hintEl.textContent = hint;
    hintEl.hidden = !hint;
  }

  listEl.classList.add('findings-inbox-list--loading');
  listEl.setAttribute('aria-busy', 'true');
  listEl.innerHTML = renderInboxSkeleton(3);

  const { ok, data } = await apiGet('/api/findings/inbox/list');
  listEl.classList.remove('findings-inbox-list--loading');
  listEl.setAttribute('aria-busy', 'false');

  if (!ok) {
    listEl.innerHTML = `<p class="finding-empty finding-inbox-empty">${escapeHtml(t('loginRequired'))}</p>`;
    return;
  }

  const items = data.items || [];
  inboxState.items = items;

  if (!items.length) {
    listEl.innerHTML = `<p class="finding-empty finding-inbox-empty">${escapeHtml(t('noInbox'))}</p>`;
    return;
  }

  const dialogs = groupInboxDialogs(items);
  listEl.innerHTML = dialogs
    .map((dialog, index) => renderInboxDialogCard(dialog, t, index))
    .join('');

  listEl.querySelectorAll('[data-inbox-username]').forEach((el) => {
    el.addEventListener('click', () => {
      inboxState.view = 'thread';
      inboxState.username = el.dataset.inboxUsername;
      loadInboxInto(modal);
    });
    el.style.cursor = 'pointer';
  });
}

async function loadFeedInto(modal, { reset = true } = {}) {
  const titleEl = modal.querySelector('#finding-feed-modal-title');
  const hintEl = modal.querySelector('#finding-feed-modal-hint');
  const listEl = modal.querySelector('#finding-feed-modal-list');
  const loadMoreBtn = modal.querySelector('#finding-feed-load-more');
  const searchEl = modal.querySelector('#finding-feed-search');

  if (titleEl) titleEl.textContent = tk('feedTitle');
  if (hintEl) {
    hintEl.textContent = feedState.mode === 'following' ? tk('feedHintFollowing') : tk('feedHint');
    hintEl.hidden = false;
  }
  modal.querySelectorAll('.finding-feed-tab').forEach((tab) => {
    tab.textContent = tab.dataset.feedMode === 'following' ? tk('feedTabFollowing') : tk('feedTabAll');
  });
  if (searchEl) {
    searchEl.placeholder = tk('feedSearchPlaceholder');
    if (searchEl.value !== feedState.q) searchEl.value = feedState.q;
  }
  if (loadMoreBtn) loadMoreBtn.textContent = tk('loadMore');

  if (!listEl) return;

  if (reset) {
    feedState.offset = 0;
    feedState.items = [];
    listEl.classList.add('findings-inbox-list--loading');
    listEl.setAttribute('aria-busy', 'true');
    listEl.innerHTML = renderInboxSkeleton(3);
  }

  const params = new URLSearchParams({
    mode: feedState.mode,
    limit: '20',
    offset: String(feedState.offset),
  });
  if (feedState.q) params.set('q', feedState.q);

  const { ok, data, status } = await apiGet(`/api/findings/feed/list?${params}`);
  listEl.classList.remove('findings-inbox-list--loading');
  listEl.setAttribute('aria-busy', 'false');

  if (status === 401) {
    listEl.innerHTML = `<p class="finding-empty finding-inbox-empty">${escapeHtml(tk('loginForFollowing'))}</p>`;
    return;
  }

  if (!ok) {
    listEl.innerHTML = `<p class="finding-empty finding-inbox-empty">${escapeHtml(tk('loadFailed'))}</p>`;
    return;
  }

  const batch = data.items || [];
  if (reset) feedState.items = batch;
  else feedState.items.push(...batch);

  feedState.offset = feedState.items.length;
  feedState.hasMore = batch.length >= 20;

  if (!feedState.items.length) {
    listEl.innerHTML = `<p class="finding-empty finding-inbox-empty">${escapeHtml(tk('noFeed'))}</p>`;
    if (loadMoreBtn) loadMoreBtn.hidden = true;
    return;
  }

  listEl.innerHTML = feedState.items
    .map((item, index) => renderFindingListCard(item, { mode: 'feed', t: (k, v) => tk(k, v), index }))
    .join('');
  bindFindingListCards(listEl, modal, { mode: 'feed' });
  if (loadMoreBtn) loadMoreBtn.hidden = !feedState.hasMore;
}

async function loadNotificationsInto(modal) {
  const titleEl = modal.querySelector('#finding-notifications-modal-title');
  const listEl = modal.querySelector('#finding-notifications-modal-list');

  if (titleEl) titleEl.textContent = tk('notificationsTitle');
  if (!listEl) return;

  listEl.innerHTML = renderInboxSkeleton(2);
  const { ok, data } = await apiGet('/api/findings/notifications/list');

  if (!ok) {
    listEl.innerHTML = `<p class="finding-empty">${escapeHtml(tk('loginRequired'))}</p>`;
    return;
  }

  await apiPost('/api/findings/notifications/read-all', {});
  onNotificationsRead?.();

  const items = data.items || [];
  if (!items.length) {
    listEl.innerHTML = `<p class="finding-empty">${escapeHtml(tk('noNotifications'))}</p>`;
    return;
  }

  listEl.innerHTML = items
    .map((item) => {
      const text =
        item.type === 'comment'
          ? tk('notificationComment', { user: item.actor_username || '?', query: item.query_text || '' })
          : tk('notificationNewFinding', { user: item.actor_username || '?', query: item.query_text || '' });
      return `
        <article class="finding-inbox-item finding-notification-item" data-public-id="${escapeHtml(item.public_id || '')}">
          <p class="finding-inbox-query">${escapeHtml(text)}</p>
          <p class="finding-inbox-date">${escapeHtml(formatDate(item.created_at))}</p>
        </article>`;
    })
    .join('');

  listEl.querySelectorAll('.finding-notification-item').forEach((el) => {
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

async function loadAuthorFindingsInto(modal, username) {
  const titleEl = modal.querySelector('#finding-author-modal-title');
  const listEl = modal.querySelector('#finding-author-modal-list');
  const followBtn = modal.querySelector('#finding-author-follow-btn');

  if (titleEl) titleEl.textContent = tk('authorFindingsTitle', { user: username });
  if (!listEl) return;

  listEl.innerHTML = renderInboxSkeleton(2);
  const { ok, data, status } = await apiGet(
    `/api/findings/users/${encodeURIComponent(username)}/findings`
  );

  if (!ok) {
    const msg = status === 404 ? tk('userNotFound') : tk('loadFailed');
    listEl.innerHTML = `<p class="finding-empty">${escapeHtml(msg)}</p>`;
    if (followBtn) followBtn.hidden = true;
    return;
  }

  if (followBtn) {
    if (data.isOwner) {
      followBtn.hidden = true;
    } else {
      followBtn.hidden = false;
      followBtn.textContent = data.following ? tk('unfollowUser') : tk('followUser');
      followBtn.classList.toggle('finding-feed-action--active', data.following === true);
      followBtn.onclick = async () => {
        const { ok: fOk, status: fStatus, data: fData } = await apiPost(
          `/api/findings/users/${encodeURIComponent(username)}/follow`,
          {}
        );
        if (fStatus === 401) return authRedirect();
        if (!fOk) return;
        followBtn.textContent = fData.following ? tk('unfollowUser') : tk('followUser');
        followBtn.classList.toggle('finding-feed-action--active', fData.following === true);
        showToast(fData.following ? tk('followingToast') : tk('unfollowedToast'));
      };
    }
  }

  const items = data.items || [];
  if (!items.length) {
    listEl.innerHTML = `<p class="finding-empty">${escapeHtml(tk('noAuthorFindings'))}</p>`;
    return;
  }

  listEl.innerHTML = items
    .map((item, index) => renderFindingListCard(item, { mode: 'author', t: (k, v) => tk(k, v), index }))
    .join('');
  bindFindingListCards(listEl, modal, { mode: 'author' });
}

export async function openAuthorFindingsModal(username) {
  if (!username) return;
  await loadT();
  const modal = ensureAuthorModal();
  openPanel(modal);
  await loadAuthorFindingsInto(modal, username.replace(/^@/, ''));
}

export async function openNotificationsModal() {
  await loadT();
  const modal = ensureNotificationsModal();
  openPanel(modal);
  await loadNotificationsInto(modal);
}

export async function openFeedModal() {
  await loadT();
  feedState.mode = 'all';
  feedState.q = '';
  feedState.offset = 0;
  const modal = ensureFeedModal();
  openPanel(modal);
  await loadFeedInto(modal, { reset: true });
}

export async function openInboxModal() {
  await loadT();
  inboxState.view = 'dialogs';
  inboxState.username = null;
  inboxState.items = [];
  const modal = ensureInboxModal();
  openPanel(modal);
  await loadInboxInto(modal);
}

export async function openFindingModal(publicId, options = {}) {
  if (!publicId || !String(publicId).startsWith('fnd_')) return;

  const { replyToUsername = null, openShareForm = false } = options;

  await loadT();
  const modal = ensureViewModal();
  const rootEl = modal.querySelector('#finding-modal-view-root');
  const imageEl = modal.querySelector('#finding-modal-image-results');
  const videoEl = modal.querySelector('#finding-modal-video-results');
  const copyBtn = modal.querySelector('#finding-modal-copy-link');
  const shareToggleBtn = modal.querySelector('#finding-modal-share-toggle');
  const likeBtn = modal.querySelector('#finding-modal-like-btn');
  const viewsEl = modal.querySelector('#finding-modal-views');
  const commentsSection = modal.querySelector('#finding-modal-comments');
  const commentForm = modal.querySelector('#finding-modal-comment-form');

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
  if (shareToggleBtn) {
    shareToggleBtn.hidden = true;
    shareToggleBtn.disabled = true;
    shareToggleBtn.onclick = null;
  }
  if (copyBtn) {
    copyBtn.hidden = true;
    copyBtn.disabled = true;
    copyBtn.onclick = null;
  }
  if (likeBtn) likeBtn.hidden = true;
  if (viewsEl) viewsEl.innerHTML = '';
  if (commentsSection) commentsSection.hidden = true;
  if (commentForm) delete commentForm.dataset.bound;

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
    imagesListId: `finding-modal-images-${publicId}`,
    videosListId: `finding-modal-videos-${publicId}`,
  });

  if (viewsEl) {
    const views = Number(data.viewsCount ?? data.views_count) || 0;
    viewsEl.innerHTML = renderViewsControl(views, { label: t('viewsLabel') });
  }

  setupFindingViewActions({
    publicId,
    t,
    copyBtn,
    shareToggleBtn,
    findingData: data,
    replyToUsername,
    openShareForm,
    viewModal: modal,
  });

  setupLikeButton(modal, publicId, data, t);
  await loadCommentsSection(modal, publicId, t);
}

export async function initFindingsModals(options = {}) {
  if (initialized) return;
  initialized = true;
  onInboxRead = options.onInboxRead || null;
  onNotificationsRead = options.onNotificationsRead || null;

  await loadT();
  ensureInboxModal();
  ensureViewModal();
  ensureFeedModal();
  ensureNotificationsModal();
  ensureAuthorModal();

  document.addEventListener('click', (event) => {
    const feedTrigger = event.target.closest('[data-finding-open-feed]');
    if (feedTrigger) {
      event.preventDefault();
      closeMenu();
      openFeedModal();
      return;
    }

    const inboxTrigger = event.target.closest('[data-finding-open-inbox]');
    if (inboxTrigger) {
      event.preventDefault();
      closeMenu();
      openInboxModal();
      return;
    }

    const notificationsTrigger = event.target.closest('[data-finding-open-notifications]');
    if (notificationsTrigger) {
      event.preventDefault();
      closeMenu();
      openNotificationsModal();
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
    [
      'finding-share-send-modal',
      'finding-share-menu-modal',
      'finding-view-modal',
      'finding-inbox-modal',
      'finding-feed-modal',
      'finding-notifications-modal',
      'finding-author-modal',
    ].forEach((id) => {
      const m = document.getElementById(id);
      if (m?.getAttribute('data-open') === 'true') closePanel(m);
    });
  });
}
