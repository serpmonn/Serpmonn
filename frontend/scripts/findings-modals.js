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
import { renderFindingListCard } from './finding-list-card.js';
import {
  renderDmDialogCard,
  renderChatThread,
  renderChatComposeBar,
  renderDmFindingPickerList,
  renderNotificationItem,
  renderActivityEmpty,
} from './dm-chat.js';
import { applyShareIconButton, updateLikeControl, updateCommentControl, applyCopyIconButton, applySaveIconButton, renderViewsControl, FINDING_COPY_ICON, FINDING_SHARE_ICON, FINDING_LIKE_ICON } from './finding-icons.js';
import { closeMenu } from './menu.js';

let initialized = false;
const ACTIVITY_INTRO_KEY = 'spn_activity_intro_seen';
let onInboxRead = null;
let onNotificationsRead = null;

const feedState = { mode: 'all', q: '', offset: 0, items: [], hasMore: false };
const inboxState = { view: 'dialogs', username: null, conversations: [], messages: [], pendingFinding: null, newDialogOpen: false };
const activityState = { tab: 'inbox', unreadDm: 0, unreadNotifications: 0 };
let shareSendContext = null;
let shareMenuContext = null;
let modalStackZ = 100000;

function tk(key, vars) {
  return getFindingT(`finding.${key}`, vars);
}

function isAndroidAppShell() {
  try {
    if (window.__SPN_ANDROID_APP__) return true;
  } catch (_) {}
  return Boolean(document.documentElement?.classList?.contains('android-app'));
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

/** RuStore: лента/входящие — в странице подложки, не fixed-модалка поверх */
function mountPanelInline(modal, host) {
  if (!modal || !host) return;
  modal.classList.add('finding-panel-modal--inline');
  modal.setAttribute('role', 'region');
  modal.removeAttribute('aria-modal');
  const backdrop = modal.querySelector('.ai-share-backdrop');
  if (backdrop) {
    backdrop.hidden = true;
    backdrop.style.display = 'none';
  }
  modal.querySelectorAll('.finding-panel-close, .ai-share-close, .finding-activity-close').forEach((el) => {
    el.hidden = true;
  });
  if (modal.parentElement !== host) {
    host.innerHTML = '';
    host.appendChild(modal);
  }
  modal.style.display = 'block';
  modal.style.position = 'static';
  modal.style.zIndex = '1';
  requestAnimationFrame(() => {
    modal.setAttribute('data-open', 'true');
  });
  try {
    modal.querySelector('.finding-panel-dialog, .ai-share-dialog')?.focus?.({ preventScroll: true });
  } catch (_) {}
}

function presentPanel(modal, inlineHostId) {
  if (isAndroidAppShell() && inlineHostId) {
    const host = document.getElementById(inlineHostId);
    if (host) {
      mountPanelInline(modal, host);
      return;
    }
  }
  openPanel(modal);
}

function closePanel(modal) {
  if (!modal) return;
  // Inline-панель в подложке приложения нельзя «закрыть» — иначе лента/входящие пустеют
  if (modal.classList.contains('finding-panel-modal--inline')) return;
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

function ensureActivityModal() {
  let modal = document.getElementById('finding-activity-modal');
  if (modal && !modal.querySelector('[data-activity-title]')) {
    modal.remove();
    modal = null;
  }
  if (modal && !modal.querySelector('[data-activity-intro]')) {
    modal.remove();
    modal = null;
  }
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'finding-activity-modal';
  modal.className = 'ai-share-modal finding-panel-modal';
  modal.style.display = 'none';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.innerHTML = `
    <div class="ai-share-backdrop"></div>
    <div class="ai-share-dialog finding-panel-dialog finding-inbox-dialog finding-activity-dialog" tabindex="-1">
      <header class="finding-activity-header">
        <div class="finding-activity-header__main">
          <button type="button" class="finding-activity-back" data-inbox-back hidden aria-label=""></button>
          <h2 class="finding-panel-title finding-activity-title" data-activity-title></h2>
          <h2 class="finding-panel-title finding-activity-thread-title" data-inbox-thread-title hidden></h2>
        </div>
        <div class="finding-activity-header__actions">
          <button type="button" class="finding-activity-write" data-inbox-new-open hidden></button>
          <button type="button" class="finding-activity-close finding-panel-close" aria-label="×"><span aria-hidden="true">&times;</span></button>
        </div>
      </header>
      <div class="finding-activity-toolbar" data-activity-tabs>
        <div class="finding-activity-tabs finding-feed-tabs" role="tablist">
          <button type="button" class="finding-feed-tab finding-activity-tab finding-feed-tab--active" data-activity-tab="inbox" role="tab"></button>
          <button type="button" class="finding-feed-tab finding-activity-tab" data-activity-tab="notifications" role="tab"></button>
        </div>
      </div>
      <div class="finding-activity-intro" data-activity-intro hidden>
        <p class="finding-activity-intro__text" data-activity-intro-text></p>
        <button type="button" class="finding-activity-intro__dismiss" data-activity-intro-dismiss aria-label="×"><span aria-hidden="true">&times;</span></button>
      </div>
      <div class="finding-dm-new-toolbar" data-inbox-new-toolbar hidden>
        <div class="finding-dm-new-form" data-inbox-new-form>
          <input type="text" class="finding-dm-new-input" data-inbox-new-input autocomplete="off" spellcheck="false" />
          <div class="finding-dm-new-form__actions">
            <button type="button" class="primary-button finding-dm-new-submit" data-inbox-new-submit></button>
            <button type="button" class="finding-dm-new-cancel" data-inbox-new-cancel></button>
          </div>
          <ul class="finding-dm-new-suggest" data-inbox-new-suggest hidden></ul>
        </div>
      </div>
      <section class="finding-activity-panel finding-dm-panel" data-activity-panel="inbox">
        <div class="finding-panel-body finding-dm-body" data-inbox-list aria-live="polite"></div>
        <div data-inbox-compose-wrap hidden></div>
      </section>
      <section class="finding-activity-panel" data-activity-panel="notifications" hidden>
        <div class="finding-panel-body" data-notifications-list aria-live="polite"></div>
      </section>
    </div>
  `;
  document.body.appendChild(modal);
  bindPanelClose(modal);
  bindNewDialogToolbar(modal);
  bindActivityIntro(modal);

  modal.querySelector('[data-inbox-back]')?.addEventListener('click', () => {
    inboxState.view = 'dialogs';
    inboxState.username = null;
    inboxState.pendingFinding = null;
    inboxState.newDialogOpen = false;
    loadActivityInto(modal);
  });

  modal.querySelectorAll('[data-activity-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      const nextTab = tab.dataset.activityTab;
      if (!nextTab || nextTab === activityState.tab) return;
      activityState.tab = nextTab;
      inboxState.view = 'dialogs';
      inboxState.username = null;
      inboxState.pendingFinding = null;
      inboxState.newDialogOpen = false;
      loadActivityInto(modal);
    });
  });

  return modal;
}

function localizeActivityTabs(modal) {
  modal.querySelectorAll('[data-activity-tab]').forEach((tab) => {
    const isInbox = tab.dataset.activityTab === 'inbox';
    const title = isInbox ? tk('inboxTitle') : tk('notificationsTitle');
    const count = isInbox ? activityState.unreadDm : activityState.unreadNotifications;
    const badge =
      count > 0
        ? `<span class="finding-activity-tab-badge">${count > 99 ? '99+' : count}</span>`
        : '';
    tab.innerHTML = `<span class="finding-activity-tab-label">${escapeHtml(title)}</span>${badge}`;
  });
}

async function updateActivityTabBadges(modal) {
  const [dmResp, notifResp] = await Promise.all([
    apiGet('/api/dm/unread-count'),
    apiGet('/api/findings/notifications/unread-count'),
  ]);
  activityState.unreadDm = dmResp.ok ? Number(dmResp.data?.count) || 0 : 0;
  activityState.unreadNotifications = notifResp.ok ? Number(notifResp.data?.count) || 0 : 0;
  if (modal) localizeActivityTabs(modal);
}

function setActivityPanels(modal) {
  const inThread = activityState.tab === 'inbox' && inboxState.view === 'thread';
  const inInboxDialogs = activityState.tab === 'inbox' && inboxState.view === 'dialogs';
  const tabsEl = modal.querySelector('[data-activity-tabs]');
  const activityTitleEl = modal.querySelector('[data-activity-title]');
  const threadTitleEl = modal.querySelector('[data-inbox-thread-title]');
  const backBtn = modal.querySelector('[data-inbox-back]');
  const writeBtn = modal.querySelector('[data-inbox-new-open]');

  if (tabsEl) tabsEl.hidden = inThread;

  if (activityTitleEl) {
    activityTitleEl.hidden = inThread;
    activityTitleEl.textContent = tk('activityTitle');
  }

  if (threadTitleEl) {
    threadTitleEl.hidden = !inThread;
    if (inThread && inboxState.username) {
      threadTitleEl.textContent = tk('byUser', { user: inboxState.username });
    }
  }

  if (backBtn) {
    backBtn.hidden = !inThread;
    backBtn.setAttribute('aria-label', tk('inboxBack'));
    backBtn.title = tk('inboxBack');
  }

  if (writeBtn) {
    writeBtn.hidden = !inInboxDialogs || inboxState.newDialogOpen;
    writeBtn.textContent = tk('dmNewMessage');
  }

  modal.querySelectorAll('[data-activity-panel]').forEach((panel) => {
    const isActive = panel.dataset.activityPanel === activityState.tab;
    panel.hidden = !isActive;
  });

  modal.querySelectorAll('[data-activity-tab]').forEach((tab) => {
    tab.classList.toggle('finding-feed-tab--active', tab.dataset.activityTab === activityState.tab);
    tab.setAttribute('aria-selected', tab.dataset.activityTab === activityState.tab ? 'true' : 'false');
  });

  updateNewDialogToolbar(modal);
  updateActivityIntro(modal);
}

function updateActivityIntro(modal) {
  const introEl = modal?.querySelector('[data-activity-intro]');
  if (!introEl) return;

  const inThread = activityState.tab === 'inbox' && inboxState.view === 'thread';
  let seen = false;
  try {
    seen = localStorage.getItem(ACTIVITY_INTRO_KEY) === '1';
  } catch {
    seen = true;
  }

  introEl.hidden = seen || inThread;
  const textEl = introEl.querySelector('[data-activity-intro-text]');
  if (textEl) textEl.textContent = tk('activityIntro');
}

function dismissActivityIntro(modal) {
  try {
    localStorage.setItem(ACTIVITY_INTRO_KEY, '1');
  } catch {
    /* ignore */
  }
  updateActivityIntro(modal);
}

function bindActivityIntro(modal) {
  if (!modal || modal.dataset.introBound) return;
  modal.dataset.introBound = '1';
  modal.querySelector('[data-activity-intro-dismiss]')?.addEventListener('click', () => {
    dismissActivityIntro(modal);
  });
}

function bindActivityEmptyActions(modal, listEl) {
  listEl?.querySelectorAll('[data-activity-empty-action="write"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      inboxState.newDialogOpen = true;
      updateNewDialogToolbar(modal);
      setActivityPanels(modal);
      modal.querySelector('[data-inbox-new-input]')?.focus();
    });
  });
}

function normalizeDmUsername(raw) {
  return String(raw || '').trim().replace(/^@+/, '');
}

function updateNewDialogToolbar(modal) {
  const toolbar = modal?.querySelector('[data-inbox-new-toolbar]');
  const input = modal?.querySelector('[data-inbox-new-input]');
  const submit = modal?.querySelector('[data-inbox-new-submit]');
  const cancel = modal?.querySelector('[data-inbox-new-cancel]');
  const writeBtn = modal?.querySelector('[data-inbox-new-open]');
  const t = (key) => tk(key);

  const showForm =
    activityState.tab === 'inbox' && inboxState.view === 'dialogs' && inboxState.newDialogOpen;

  if (toolbar) toolbar.hidden = !showForm;
  if (writeBtn) writeBtn.hidden = !(activityState.tab === 'inbox' && inboxState.view === 'dialogs') || inboxState.newDialogOpen;

  if (!showForm) return;

  if (input) input.placeholder = t('dmNewMessagePlaceholder');
  if (submit) submit.textContent = t('dmNewMessageOpen');
  if (cancel) cancel.textContent = t('cancelLabel');
}

async function startInboxThread(modal, username) {
  const peer = normalizeDmUsername(username);
  if (!peer) return;

  const { ok, status } = await apiGet(`/api/dm/conversations/${encodeURIComponent(peer)}/messages`);
  if (status === 401) return authRedirect();
  if (!ok) {
    if (status === 404) showToast(tk('userNotFound'));
    else showToast(tk('loadFailed'));
    return;
  }

  inboxState.newDialogOpen = false;
  inboxState.view = 'thread';
  inboxState.username = peer;

  const input = modal.querySelector('[data-inbox-new-input]');
  const suggest = modal.querySelector('[data-inbox-new-suggest]');
  if (input) input.value = '';
  if (suggest) {
    suggest.hidden = true;
    suggest.innerHTML = '';
  }

  await loadActivityInto(modal);
}

function bindNewDialogToolbar(modal) {
  if (!modal || modal.dataset.newDialogBound) return;
  modal.dataset.newDialogBound = '1';

  const openBtn = modal.querySelector('[data-inbox-new-open]');
  const input = modal.querySelector('[data-inbox-new-input]');
  const submit = modal.querySelector('[data-inbox-new-submit]');
  const cancel = modal.querySelector('[data-inbox-new-cancel]');
  const suggest = modal.querySelector('[data-inbox-new-suggest]');
  let lookupTimer = null;

  openBtn?.addEventListener('click', () => {
    inboxState.newDialogOpen = true;
    updateNewDialogToolbar(modal);
    input?.focus();
  });

  cancel?.addEventListener('click', () => {
    inboxState.newDialogOpen = false;
    if (input) input.value = '';
    if (suggest) {
      suggest.hidden = true;
      suggest.innerHTML = '';
    }
    updateNewDialogToolbar(modal);
  });

  const tryStart = () => startInboxThread(modal, input?.value || '');

  submit?.addEventListener('click', tryStart);
  input?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      tryStart();
    }
  });

  input?.addEventListener('input', () => {
    clearTimeout(lookupTimer);
    const q = normalizeDmUsername(input?.value || '');
    if (!suggest) return;
    if (q.length < 2) {
      suggest.hidden = true;
      suggest.innerHTML = '';
      return;
    }
    lookupTimer = setTimeout(async () => {
      const { ok, data } = await apiGet(
        `/api/findings/users/lookup?username=${encodeURIComponent(q)}`
      );
      if (!ok) return;
      const users = data.users || [];
      if (!users.length) {
        suggest.hidden = true;
        suggest.innerHTML = '';
        return;
      }
      suggest.hidden = false;
      suggest.innerHTML = users
        .map(
          (user) =>
            `<li><button type="button" class="finding-dm-new-suggest__item" data-inbox-new-pick="${escapeHtml(user.username)}">@${escapeHtml(user.username)}</button></li>`
        )
        .join('');
      suggest.querySelectorAll('[data-inbox-new-pick]').forEach((btn) => {
        btn.addEventListener('click', () => startInboxThread(modal, btn.dataset.inboxNewPick));
      });
    }, 250);
  });
}

async function loadActivityInto(modal) {
  await updateActivityTabBadges(modal);
  setActivityPanels(modal);
  if (activityState.tab === 'inbox') {
    await loadInboxInto(modal);
  } else {
    await loadNotificationsInto(modal);
  }
}

export async function openActivityModal(tab = 'inbox') {
  await loadT();
  activityState.tab = tab === 'notifications' ? 'notifications' : 'inbox';
  if (activityState.tab === 'inbox') {
    inboxState.view = 'dialogs';
    inboxState.username = null;
    inboxState.conversations = [];
    inboxState.messages = [];
    inboxState.pendingFinding = null;
    inboxState.newDialogOpen = false;
  }
  const modal = ensureActivityModal();
  presentPanel(modal, 'findings-inbox-list');
  await loadActivityInto(modal);
}

function ensureInboxModal() {
  return ensureActivityModal();
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
  return ensureActivityModal();
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
          <div id="finding-modal-views" class="finding-view-views" role="group"></div>
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
    const ctx = shareMenuContext;
    closePanel(modal);
    if (ctx?.pendingSave?.onCancel) {
      ctx.pendingSave.onCancel();
    }
    shareMenuContext = null;
  };
  modal.querySelector('.ai-share-backdrop')?.addEventListener('click', closeMenuModal);
  modal.querySelector('.finding-share-menu-close')?.addEventListener('click', closeMenuModal);
  modal.querySelector('#finding-share-menu-cancel')?.addEventListener('click', closeMenuModal);

  modal.querySelector('#finding-share-menu-friend')?.addEventListener('click', () => {
    const ctx = shareMenuContext;
    if (!ctx) return;
    closePanel(modal);
    if (ctx.pendingSave) {
      openShareSendModal({
        pendingSave: ctx.pendingSave,
        query: ctx.query || '',
        replyToUsername: ctx.replyToUsername || null,
        onComplete: ctx.onComplete,
      });
    } else if (ctx.publicId) {
      openShareSendModal({ publicId: ctx.publicId, replyToUsername: ctx.replyToUsername || null });
    }
    shareMenuContext = null;
  });

  modal.querySelector('#finding-share-menu-feed')?.addEventListener('click', async () => {
    const ctx = shareMenuContext;
    if (!ctx) return;

    const label = ctx.query || tk('pageTitle');
    if (!window.confirm(tk('publishConfirm', { query: label }))) return;

    const feedBtn = modal.querySelector('#finding-share-menu-feed');
    feedBtn.disabled = true;

    let publicId = ctx.publicId;
    if (!publicId && ctx.pendingSave) {
      const saved = await ctx.pendingSave.save('public');
      feedBtn.disabled = false;
      if (!saved?.ok) return;
      publicId = saved.publicId;
      closePanel(modal);
      showToast(tk('publishedToast'));
      ctx.onComplete?.(saved);
      shareMenuContext = null;
      return;
    }

    if (!publicId || !ctx.isOwner) {
      feedBtn.disabled = false;
      return;
    }

    const { ok } = await apiPatch(`/api/findings/${encodeURIComponent(publicId)}`, {
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

function localizeShareMenuModal(modal, { isOwner = false, visibility = 'private', pendingSave = null } = {}) {
  const titleEl = modal.querySelector('#finding-share-menu-title');
  const friendBtn = modal.querySelector('#finding-share-menu-friend');
  const feedBtn = modal.querySelector('#finding-share-menu-feed');
  const cancelBtn = modal.querySelector('#finding-share-menu-cancel');

  if (titleEl) titleEl.textContent = tk('shareMenuTitle');
  if (friendBtn) friendBtn.textContent = tk('sendToFriend');
  if (feedBtn) {
    const showFeed = pendingSave || (isOwner && visibility !== 'public');
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
  pendingSave = null,
  onComplete = null,
} = {}) {
  if (!publicId && !pendingSave) return;
  shareMenuContext = {
    publicId: publicId || null,
    isOwner: pendingSave ? true : isOwner,
    visibility,
    query,
    replyToUsername,
    onPublished,
    pendingSave,
    onComplete,
  };
  const modal = ensureShareMenuModal();
  localizeShareMenuModal(modal, { isOwner: shareMenuContext.isOwner, visibility, pendingSave });
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

  const closeSend = () => {
    const ctx = shareSendContext;
    closePanel(modal);
    if (ctx?.pendingSave) {
      openShareMenuModal({
        query: ctx.query || '',
        pendingSave: ctx.pendingSave,
        onComplete: ctx.onComplete,
      });
    }
    shareSendContext = null;
  };
  modal.querySelector('.ai-share-backdrop')?.addEventListener('click', closeSend);
  modal.querySelector('.finding-share-send-close')?.addEventListener('click', closeSend);
  modal.querySelector('#finding-share-send-cancel')?.addEventListener('click', closeSend);

  modal.querySelector('#finding-share-send-submit')?.addEventListener('click', async () => {
    const ctx = shareSendContext;
    if (!ctx) return;

    const usernameEl = modal.querySelector('#finding-share-send-username');
    const messageEl = modal.querySelector('#finding-share-send-message');
    const submitBtn = modal.querySelector('#finding-share-send-submit');
    const toUsername = (usernameEl?.value || '').trim().replace(/^@/, '');
    if (!toUsername) {
      usernameEl?.focus();
      return;
    }

    submitBtn.disabled = true;

    let publicId = ctx.publicId;
    if (!publicId && ctx.pendingSave) {
      const saved = await ctx.pendingSave.save('private');
      if (!saved?.ok) {
        submitBtn.disabled = false;
        return;
      }
      publicId = saved.publicId;
    }

    if (!publicId) {
      submitBtn.disabled = false;
      return;
    }

    const { ok, status, data } = await apiPost(
      `/api/findings/${encodeURIComponent(publicId)}/share`,
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
    ctx.onComplete?.({ ok: true, publicId });
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

export function openShareSendModal({
  publicId = null,
  replyToUsername = null,
  pendingSave = null,
  query = '',
  onComplete = null,
} = {}) {
  if (!publicId && !pendingSave) return;
  shareSendContext = { publicId, replyToUsername, pendingSave, onComplete, query };
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

function setInboxComposeVisible(modal, visible) {
  const wrap = modal.querySelector('[data-inbox-compose-wrap]');
  if (!wrap) return;
  wrap.hidden = !visible;
  if (visible) {
    wrap.innerHTML = renderChatComposeBar((key, vars) => tk(key, vars), inboxState.pendingFinding);
    wrap.dataset.boundUsername = '';
  } else {
    inboxState.pendingFinding = null;
  }
}

function ensureDmFindingPickerModal() {
  let modal = document.getElementById('finding-dm-picker-modal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'finding-dm-picker-modal';
  modal.className = 'ai-share-modal finding-panel-modal';
  modal.style.display = 'none';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.innerHTML = `
    <div class="ai-share-backdrop"></div>
    <div class="ai-share-dialog finding-panel-dialog finding-dm-picker-dialog" tabindex="-1">
      <button type="button" class="ai-share-close finding-panel-close" aria-label="×">&times;</button>
      <h2 class="finding-panel-title" data-dm-picker-title></h2>
      <p class="finding-panel-hint" data-dm-picker-hint></p>
      <div class="finding-panel-body" data-dm-picker-list aria-live="polite"></div>
      <button type="button" class="finding-save-cancel-btn finding-save-cancel-btn--full" data-dm-picker-cancel></button>
    </div>
  `;
  document.body.appendChild(modal);
  bindPanelClose(modal);
  modal.querySelector('[data-dm-picker-cancel]')?.addEventListener('click', () => closePanel(modal));
  return modal;
}

let dmPickerOnSelect = null;

async function openDmFindingPicker(onSelect) {
  dmPickerOnSelect = onSelect;
  const modal = ensureDmFindingPickerModal();
  const t = (key, vars) => tk(key, vars);
  modal.querySelector('[data-dm-picker-title]').textContent = t('dmPickFindingTitle');
  modal.querySelector('[data-dm-picker-hint]').textContent = t('dmPickFindingHint');
  modal.querySelector('[data-dm-picker-cancel]').textContent = t('cancelLabel');
  const listEl = modal.querySelector('[data-dm-picker-list]');
  listEl.innerHTML = `<p class="plan-hint">${escapeHtml(t('inboxLoading'))}</p>`;
  openPanel(modal);

  const { ok, data } = await apiGet('/api/findings/mine/list');
  if (!ok) {
    listEl.innerHTML = `<p class="finding-empty">${escapeHtml(t('loginRequired'))}</p>`;
    return;
  }

  const items = data.items || [];
  listEl.innerHTML = renderDmFindingPickerList(items, t);
  listEl.querySelectorAll('[data-dm-pick-finding]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const publicId = btn.dataset.dmPickFinding;
      const item = items.find((row) => row.public_id === publicId);
      if (!item) return;
      closePanel(modal);
      dmPickerOnSelect?.({ publicId: item.public_id, query: item.query_text });
      dmPickerOnSelect = null;
    });
  });
}

function bindChatThread(modal, username) {
  const listEl = modal.querySelector('[data-inbox-list]');
  const wrap = modal.querySelector('[data-inbox-compose-wrap]');
  const composeForm = modal.querySelector('[data-inbox-compose]');
  const input = modal.querySelector('[data-inbox-compose-input]');
  const t = (key, vars) => tk(key, vars);

  listEl?.querySelectorAll('[data-action="open-finding"]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.stopPropagation();
      const publicId = btn.dataset.publicId;
      if (publicId) openFindingModal(publicId);
    });
  });

  if (!wrap || wrap.dataset.boundUsername === username) return;
  wrap.dataset.boundUsername = username;

  wrap.querySelector('[data-inbox-compose-attach]')?.addEventListener('click', () => {
    openDmFindingPicker((finding) => {
      inboxState.pendingFinding = finding;
      setInboxComposeVisible(modal, true);
      bindChatThread(modal, username);
      modal.querySelector('[data-inbox-compose-input]')?.focus();
    });
  });

  wrap.querySelector('[data-inbox-compose-clear]')?.addEventListener('click', () => {
    inboxState.pendingFinding = null;
    setInboxComposeVisible(modal, true);
    bindChatThread(modal, username);
  });

  composeForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = String(input?.value || '').trim();
    const findingPublicId = inboxState.pendingFinding?.publicId || '';
    if (!body && !findingPublicId) return;

    const sendBtn = composeForm.querySelector('[data-inbox-compose-send]');
    if (sendBtn) sendBtn.disabled = true;

    const payload = {};
    if (body) payload.body = body;
    if (findingPublicId) payload.findingPublicId = findingPublicId;

    const { ok, status } = await apiPost(
      `/api/dm/conversations/${encodeURIComponent(username)}/messages`,
      payload
    );

    if (sendBtn) sendBtn.disabled = false;
    if (status === 401) return authRedirect();
    if (!ok) {
      showToast(t('dmSendFailed'));
      return;
    }

    if (input) input.value = '';
    inboxState.pendingFinding = null;
    setInboxComposeVisible(modal, true);
    await loadInboxInto(modal);
    bindChatThread(modal, username);
    onInboxRead?.();
  });
}

async function loadInboxInto(modal) {
  const listEl = modal.querySelector('[data-inbox-list]');
  const t = (key, vars) => tk(key, vars);

  if (!listEl) return;

  setActivityPanels(modal);

  if (inboxState.view === 'thread' && inboxState.username) {
    setInboxComposeVisible(modal, true);

    listEl.classList.add('findings-inbox-list--loading');
    listEl.setAttribute('aria-busy', 'true');
    listEl.innerHTML = renderInboxSkeleton(2);

    const { ok, status, data } = await apiGet(
      `/api/dm/conversations/${encodeURIComponent(inboxState.username)}/messages`
    );
    listEl.classList.remove('findings-inbox-list--loading');
    listEl.setAttribute('aria-busy', 'false');

    if (status === 401) {
      listEl.innerHTML = `<p class="finding-empty finding-inbox-empty">${escapeHtml(t('loginRequired'))}</p>`;
      setInboxComposeVisible(modal, false);
      return;
    }
    if (!ok) {
      inboxState.view = 'dialogs';
      inboxState.username = null;
      return loadActivityInto(modal);
    }

    const messages = data.messages || [];
    inboxState.messages = messages;
    listEl.innerHTML = renderChatThread(messages, t);
    bindChatThread(modal, inboxState.username);
    onInboxRead?.();
    await updateActivityTabBadges(modal);

    const thread = listEl.querySelector('.finding-dm-thread');
    if (thread) thread.scrollTop = thread.scrollHeight;
    return;
  }

  setInboxComposeVisible(modal, false);
  const composeForm = modal.querySelector('[data-inbox-compose]');
  if (composeForm) composeForm.dataset.boundUsername = '';

  listEl.classList.add('findings-inbox-list--loading');
  listEl.setAttribute('aria-busy', 'true');
  listEl.innerHTML = renderInboxSkeleton(3);

  const { ok, data } = await apiGet('/api/dm/conversations');
  listEl.classList.remove('findings-inbox-list--loading');
  listEl.setAttribute('aria-busy', 'false');

  if (!ok) {
    listEl.innerHTML = `<p class="finding-empty finding-inbox-empty">${escapeHtml(t('loginRequired'))}</p>`;
    return;
  }

  const conversations = data.conversations || [];
  inboxState.conversations = conversations;

  if (!conversations.length) {
    listEl.innerHTML = renderActivityEmpty('inbox', t);
    bindActivityEmptyActions(modal, listEl);
    updateNewDialogToolbar(modal);
    return;
  }

  listEl.innerHTML = `<div class="finding-dm-dialog-list">${conversations
    .map((conv, index) => renderDmDialogCard(conv, t, index))
    .join('')}</div>`;

  listEl.querySelectorAll('[data-inbox-username]').forEach((el) => {
    el.addEventListener('click', () => {
      startInboxThread(modal, el.dataset.inboxUsername);
    });
    el.style.cursor = 'pointer';
  });

  updateNewDialogToolbar(modal);
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
  const listEl = modal.querySelector('[data-notifications-list]');

  if (!listEl) return;

  listEl.innerHTML = renderInboxSkeleton(2);
  const { ok, data } = await apiGet('/api/findings/notifications/list');

  if (!ok) {
    listEl.innerHTML = `<p class="finding-empty">${escapeHtml(tk('loginRequired'))}</p>`;
    return;
  }

  await apiPost('/api/findings/notifications/read-all', {});
  onNotificationsRead?.();
  await updateActivityTabBadges(modal);

  const items = data.items || [];
  if (!items.length) {
    listEl.innerHTML = renderActivityEmpty('notifications', (key, vars) => tk(key, vars));
    return;
  }

  listEl.innerHTML = `<div class="finding-activity-event-list">${items
    .map((item, index) => renderNotificationItem(item, (key, vars) => tk(key, vars), index))
    .join('')}</div>`;

  listEl.querySelectorAll('.finding-activity-event').forEach((el) => {
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
  await openActivityModal('notifications');
}

export async function openFeedModal() {
  await loadT();
  feedState.mode = 'all';
  feedState.q = '';
  feedState.offset = 0;
  const modal = ensureFeedModal();
  presentPanel(modal, 'findings-feed-list');
  await loadFeedInto(modal, { reset: true });
}

export async function openInboxModal() {
  await openActivityModal('inbox');
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
  ['finding-inbox-modal', 'finding-notifications-modal'].forEach((id) => {
    document.getElementById(id)?.remove();
  });
  ensureActivityModal();
  ensureViewModal();
  ensureFeedModal();
  ensureAuthorModal();

  document.addEventListener('click', (event) => {
    const feedTrigger = event.target.closest('[data-finding-open-feed]');
    if (feedTrigger) {
      event.preventDefault();
      closeMenu();
      openFeedModal();
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
      'finding-activity-modal',
      'finding-view-modal',
      'finding-feed-modal',
      'finding-author-modal',
    ].forEach((id) => {
      const m = document.getElementById(id);
      if (m?.getAttribute('data-open') === 'true') closePanel(m);
    });
  });
}
