import {
  apiGet,
  apiPost,
  apiPostForm,
  apiPatch,
  buildFindingViewUrl,
  buildAuthUrl,
  loadT,
  getFindingT,
  showToast,
  copyTextToClipboard,
} from './findings-client.js?v=41';
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
  downloadDmMedia,
} from './dm-chat.js?v=45';
import { applyShareIconButton, updateLikeControl, updateCommentControl, applyCopyIconButton, applySaveIconButton, renderViewsControl, FINDING_COPY_ICON, FINDING_SHARE_ICON, FINDING_LIKE_ICON } from './finding-icons.js';
import { closeMenu } from './menu.js';

let initialized = false;
const ACTIVITY_INTRO_KEY = 'spn_activity_intro_seen';
let onInboxRead = null;
let onNotificationsRead = null;

const feedState = { mode: 'all', q: '', offset: 0, items: [], hasMore: false };
const inboxState = {
  view: 'dialogs',
  username: null,
  peerId: null,
  peerAvatarUrl: null,
  conversations: [],
  messages: [],
  pendingFinding: null,
  pendingPhoto: null,
  pendingAudio: null,
  newDialogOpen: false,
  voiceRecording: null,
};

function dmPeerKey() {
  return inboxState.peerId || inboxState.username || '';
}

function sameThreadPeer(peer) {
  const key = String(peer || '');
  if (!key) return false;
  return key === String(inboxState.peerId || '') || key === String(inboxState.username || '');
}

function isNestedAppIframe() {
  try {
    return isAppShell() && window.parent && window.parent !== window;
  } catch {
    return false;
  }
}

function revokePendingPhoto() {
  const previewUrl = inboxState.pendingPhoto?.previewUrl;
  if (previewUrl && previewUrl.startsWith('blob:')) {
    try { URL.revokeObjectURL(previewUrl); } catch { /* ignore */ }
  }
  inboxState.pendingPhoto = null;
}

function revokePendingAudio() {
  inboxState.pendingAudio = null;
}

function probeAudioFileDuration(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      const duration = Number(audio.duration);
      try { URL.revokeObjectURL(url); } catch { /* ignore */ }
      resolve(Number.isFinite(duration) && duration > 0 ? Math.round(duration) : 0);
    };
    audio.onerror = () => {
      try { URL.revokeObjectURL(url); } catch { /* ignore */ }
      resolve(0);
    };
    audio.src = url;
  });
}

function stopVoiceRecording({ discard = false } = {}) {
  const rec = inboxState.voiceRecording;
  if (!rec) return;
  try {
    if (rec.timerId) clearInterval(rec.timerId);
  } catch { /* ignore */ }
  rec.discard = discard;
  try {
    if (rec.mediaRecorder && rec.mediaRecorder.state !== 'inactive') {
      rec.mediaRecorder.stop();
      return;
    }
  } catch { /* ignore */ }
  try {
    rec.stream?.getTracks?.().forEach((track) => track.stop());
  } catch { /* ignore */ }
  inboxState.voiceRecording = null;
}
const activityState = { tab: 'inbox', unreadDm: 0, unreadNotifications: 0 };
let threadPollTimer = 0;
let shareSendContext = null;
let shareMenuContext = null;
let modalStackZ = 100000;

function tk(key, vars) {
  return getFindingT(`finding.${key}`, vars);
}

function isAppShell() {
  try {
    return Boolean(window.__SPN_ANDROID_APP__);
  } catch {
    return false;
  }
}

function openPanel(modal, opts = {}) {
  if (!modal) return;

  if (isAppShell() && opts.inlineHost) {
    const host = typeof opts.inlineHost === 'string'
      ? document.querySelector(opts.inlineHost)
      : opts.inlineHost;
      if (host) {
      modal.classList.add('finding-panel-modal--inline');
      if (!host.contains(modal)) {
        host.innerHTML = '';
        host.appendChild(modal);
      }
      modal.style.removeProperty('display');
      modal.style.display = 'flex';
      modal.style.zIndex = '';
      requestAnimationFrame(() => {
        modal.setAttribute('data-open', 'true');
      });
      return;
    }
  }

  modal.classList.remove('finding-panel-modal--inline');
  modalStackZ += 1;
  modal.style.zIndex = String(modalStackZ);
  modal.style.removeProperty('display');
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
  if (modal && !modal.querySelector('[data-inbox-peer-avatar]')) {
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
          <button type="button" class="finding-activity-back" data-inbox-back hidden aria-label="">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
          <span class="finding-activity-peer-avatar" data-inbox-peer-avatar hidden aria-hidden="true"></span>
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
        <div class="finding-dm-compose-wrap" data-inbox-compose-wrap hidden></div>
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
    stopThreadPoll();
    inboxState.view = 'dialogs';
    inboxState.username = null;
    inboxState.peerId = null;
    inboxState.peerAvatarUrl = null;
    inboxState.pendingFinding = null;
    revokePendingPhoto();
    inboxState.newDialogOpen = false;
    loadActivityInto(modal);
    notifyAppInboxState();
  });

  modal.querySelectorAll('[data-activity-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      const nextTab = tab.dataset.activityTab;
      if (!nextTab || nextTab === activityState.tab) return;
      activityState.tab = nextTab;
      inboxState.view = 'dialogs';
      inboxState.username = null;
      inboxState.peerId = null;
      inboxState.peerAvatarUrl = null;
      inboxState.pendingFinding = null;
      revokePendingPhoto();
      inboxState.newDialogOpen = false;
      stopThreadPoll();
      loadActivityInto(modal);
      notifyAppInboxState();
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
  notifyAppUnread();
}

function setActivityPanels(modal) {
  const messagesOnly = modal.classList.contains('finding-activity--messages-only');
  const inThread = activityState.tab === 'inbox' && inboxState.view === 'thread';
  const inInboxDialogs = activityState.tab === 'inbox' && inboxState.view === 'dialogs';
  const tabsEl = modal.querySelector('[data-activity-tabs]');
  const activityTitleEl = modal.querySelector('[data-activity-title]');
  const threadTitleEl = modal.querySelector('[data-inbox-thread-title]');
  const backBtn = modal.querySelector('[data-inbox-back]');
  const peerAvatarEl = modal.querySelector('[data-inbox-peer-avatar]');
  const writeBtn = modal.querySelector('[data-inbox-new-open]');

  modal.classList.toggle('finding-activity--thread', inThread);

  if (tabsEl) tabsEl.hidden = inThread || messagesOnly;

  if (activityTitleEl) {
    activityTitleEl.hidden = inThread;
    activityTitleEl.textContent = messagesOnly ? tk('inboxTitle') : tk('activityTitle');
  }

  if (threadTitleEl) {
    threadTitleEl.hidden = !inThread;
    if (inThread && inboxState.username) {
      threadTitleEl.textContent = `@${inboxState.username}`;
    }
  }

  if (backBtn) {
    backBtn.hidden = !inThread;
    backBtn.setAttribute('aria-label', tk('inboxBack'));
    backBtn.title = tk('inboxBack');
    if (inThread && !backBtn.querySelector('svg')) {
      backBtn.innerHTML =
        '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>';
    }
  }

  if (peerAvatarEl) {
    peerAvatarEl.hidden = !inThread;
    if (inThread) {
      const letter = String(inboxState.username || '?').replace(/^@/, '').charAt(0).toUpperCase() || '?';
      const url = typeof inboxState.peerAvatarUrl === 'string' && inboxState.peerAvatarUrl.startsWith('/uploads/avatars/')
        ? inboxState.peerAvatarUrl
        : '';
      peerAvatarEl.innerHTML = url
        ? `<img src="${url.replace(/"/g, '&quot;')}" alt="" width="32" height="32" loading="lazy" decoding="async" data-fallback="${letter}" onerror="this.onerror=null;this.replaceWith(document.createTextNode(this.dataset.fallback||'?'));">`
        : letter;
    } else {
      peerAvatarEl.innerHTML = '';
    }
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

  const messagesOnly = modal.classList.contains('finding-activity--messages-only');
  const inThread = activityState.tab === 'inbox' && inboxState.view === 'thread';
  let seen = false;
  try {
    seen = localStorage.getItem(ACTIVITY_INTRO_KEY) === '1';
  } catch {
    seen = true;
  }

  introEl.hidden = seen || inThread || messagesOnly || isAppShell();
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

async function startInboxThread(modal, username, extra = {}) {
  const peer = normalizeDmUsername(username);
  const peerId = String(extra.peerId || '').trim();
  const keys = [...new Set([peerId, peer].filter(Boolean))];
  if (!keys.length) return;

  let ok = false;
  let status = 0;
  let data = {};
  for (const key of keys) {
    const result = await apiGet(`/api/dm/conversations/${encodeURIComponent(key)}/messages`);
    status = result.status;
    if (status === 401) return authRedirect();
    if (result.ok) {
      ok = true;
      data = result.data || {};
      break;
    }
  }
  if (!ok) {
    if (status === 404) showToast(tk('userNotFound'));
    else showToast(tk('loadFailed'));
    return;
  }

  inboxState.newDialogOpen = false;
  inboxState.view = 'thread';
  inboxState.username = data?.peerUsername || peer;
  inboxState.peerId = data?.peerId || peerId || '';
  inboxState.peerAvatarUrl = data?.peerAvatarUrl
    || extra.peerAvatarUrl
    || inboxState.peerAvatarUrl
    || null;

  notifyAppInboxState();
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
            `<li><button type="button" class="finding-dm-new-suggest__item" data-inbox-new-pick="${escapeHtml(user.username)}" data-inbox-new-pick-id="${escapeHtml(user.id || '')}">@${escapeHtml(user.username)}</button></li>`
        )
        .join('');
      suggest.querySelectorAll('[data-inbox-new-pick]').forEach((btn) => {
        btn.addEventListener('click', () => startInboxThread(modal, btn.dataset.inboxNewPick, { peerId: btn.dataset.inboxNewPickId }));
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

export async function openActivityModal(tab = 'inbox', opts = {}) {
  await loadT();
  const messagesOnly = Boolean(opts.messagesOnly) || (isAppShell() && tab !== 'notifications');
  activityState.tab = (!messagesOnly && tab === 'notifications') ? 'notifications' : 'inbox';
  if (activityState.tab === 'inbox') {
    inboxState.view = 'dialogs';
    inboxState.username = null;
    inboxState.peerId = null;
    inboxState.peerAvatarUrl = null;
    inboxState.conversations = [];
    inboxState.messages = [];
    inboxState.pendingFinding = null;
    revokePendingPhoto();
    inboxState.newDialogOpen = false;
  }
  const modal = ensureActivityModal();
  modal.classList.toggle('finding-activity--messages-only', messagesOnly);
  openPanel(modal, {
    inlineHost: isAppShell() ? '#findings-inbox-list' : null,
  });
  await loadActivityInto(modal);
  const openPeerId = String(opts.openPeerId || '').trim();
  const openUsername = normalizeDmUsername(opts.openUsername || opts.username || '');
  if ((openPeerId || openUsername) && activityState.tab === 'inbox') {
    await startInboxThread(modal, openUsername, { peerId: openPeerId });
  }
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

async function syncFeedGuestTabs(modal) {
  if (!modal) return;
  const followingTab = modal.querySelector('[data-feed-mode="following"]');
  if (!followingTab) return;
  let loggedIn = false;
  try {
    const auth = await apiGet('/auth/protected');
    loggedIn = Boolean(auth?.ok);
  } catch (_) {
    loggedIn = false;
  }
  followingTab.hidden = !loggedIn;
  if (!loggedIn && feedState.mode === 'following') {
    feedState.mode = 'all';
    modal.querySelectorAll('.finding-feed-tab').forEach((t) => {
      t.classList.toggle('finding-feed-tab--active', t.dataset.feedMode === 'all');
    });
  }
  const tabsWrap = modal.querySelector('.finding-feed-tabs');
  if (tabsWrap) tabsWrap.classList.toggle('finding-feed-tabs--guest', !loggedIn);
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
    notifyAppSound('send');
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
    wrap.innerHTML = renderChatComposeBar(
      (key, vars) => tk(key, vars),
      inboxState.pendingFinding,
      inboxState.pendingPhoto,
      inboxState.pendingAudio,
      inboxState.voiceRecording
        ? { active: true, elapsedSec: inboxState.voiceRecording.elapsedSec || 0 }
        : null
    );
    wrap.dataset.boundUsername = '';
  } else {
    inboxState.pendingFinding = null;
    revokePendingPhoto();
    revokePendingAudio();
    stopVoiceRecording({ discard: true });
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

function ensureMediaDownloadHandlers(modal) {
  if (!modal || modal.dataset.mediaDownloadBound) return;
  modal.dataset.mediaDownloadBound = '1';
  modal.addEventListener('click', async (event) => {
    const btn = event.target.closest('[data-action="download-media"]');
    if (!btn) return;
    event.preventDefault();
    event.stopPropagation();
    const url = btn.getAttribute('data-media-url') || '';
    const name = btn.getAttribute('data-media-name') || 'download';
    if (!url) return;
    if (btn.disabled) return;
    btn.disabled = true;
    btn.classList.add('is-busy');
    try {
      const ok = await downloadDmMedia(url, name);
      if (!ok) showToast(tk('dmDownloadFailed'));
    } finally {
      btn.disabled = false;
      btn.classList.remove('is-busy');
    }
  });
}

function bindChatThread(modal, username) {
  ensureMediaDownloadHandlers(modal);
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

  const attachWrap = wrap.querySelector('.finding-dm-compose__attach-wrap');
  const attachToggle = wrap.querySelector('[data-inbox-compose-attach-toggle]');
  const attachMenu = wrap.querySelector('[data-inbox-compose-attach-menu]');
  const photoInput = wrap.querySelector('[data-inbox-compose-photo-input]');
  const audioInput = wrap.querySelector('[data-inbox-compose-audio-input]');
  const voiceBtn = wrap.querySelector('[data-inbox-compose-voice]');

  const closeAttachMenu = () => {
    if (!attachMenu || attachMenu.hidden) return;
    attachMenu.hidden = true;
    attachToggle?.setAttribute('aria-expanded', 'false');
  };

  const refreshCompose = () => {
    setInboxComposeVisible(modal, true);
    bindChatThread(modal, username);
  };

  const sendVoiceBlob = async (blob, mimeType, durationSec) => {
    if (!blob || !blob.size) return;
    const sendBtn = modal.querySelector('[data-inbox-compose-send]');
    if (sendBtn) sendBtn.disabled = true;
    const formData = new FormData();
    const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'm4a' : 'webm';
    formData.append('audio', blob, `voice.${ext}`);
    formData.append('audioDurationSec', String(Math.max(1, Math.round(durationSec || 1))));
    const path = `/api/dm/conversations/${encodeURIComponent(dmPeerKey() || username)}/messages`;
    const result = await apiPostForm(path, formData);
    if (sendBtn) sendBtn.disabled = false;
    if (result.status === 401) return authRedirect();
    if (!result.ok) {
      const err = result.data?.error;
      if (err === 'audio_too_large' || err === 'file_too_large') showToast(t('dmAudioTooLarge'));
      else if (err === 'invalid_audio_type') showToast(t('dmAudioInvalid'));
      else showToast(t('dmSendFailed'));
      notifyAppSound('error');
      return;
    }
    await loadInboxInto(modal);
    bindChatThread(modal, username);
    onInboxRead?.();
    notifyAppSound('send');
  };

  const startVoiceRecording = async () => {
    if (inboxState.voiceRecording?.active) return;
    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      showToast(t('dmAudioUnsupported'));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          channelCount: 1,
        },
      });
      // Android WebView: getUserMedia often hides system nav — ask native shell to restore
      try {
        if (typeof window.spnRestoreAndroidNav === 'function') {
          window.spnRestoreAndroidNav();
        } else if (typeof window.SpnAndroid?.restoreSystemBars === 'function') {
          window.SpnAndroid.restoreSystemBars();
        }
      } catch { /* ignore */ }
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
          ? 'audio/ogg;codecs=opus'
          : MediaRecorder.isTypeSupported('audio/webm')
            ? 'audio/webm'
            : '';
      const mediaRecorder = mimeType
        ? new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 48000 })
        : new MediaRecorder(stream);
      const chunks = [];
      const startedAt = Date.now();
      const state = {
        active: true,
        discard: false,
        mediaRecorder,
        stream,
        chunks,
        startedAt,
        elapsedSec: 0,
        timerId: 0,
        mimeType: mediaRecorder.mimeType || mimeType || 'audio/webm',
      };
      inboxState.voiceRecording = state;

      mediaRecorder.addEventListener('dataavailable', (event) => {
        if (event.data?.size) chunks.push(event.data);
      });
      mediaRecorder.addEventListener('stop', async () => {
        try {
          stream.getTracks().forEach((track) => track.stop());
        } catch { /* ignore */ }
        const discard = Boolean(state.discard);
        const durationSec = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
        inboxState.voiceRecording = null;
        refreshCompose();
        if (discard || !chunks.length) return;
        const blob = new Blob(chunks, { type: state.mimeType || 'audio/webm' });
        if (blob.size < 200) {
          showToast(t('dmAudioTooShort'));
          return;
        }
        if (blob.size > 16 * 1024 * 1024) {
          showToast(t('dmAudioTooLarge'));
          return;
        }
        await sendVoiceBlob(blob, state.mimeType || 'audio/webm', durationSec);
      });

      mediaRecorder.start(250);
      notifyAppSound('record');
      state.timerId = setInterval(() => {
        if (!inboxState.voiceRecording) return;
        const elapsed = Math.floor((Date.now() - startedAt) / 1000);
        inboxState.voiceRecording.elapsedSec = elapsed;
        const timeEl = modal.querySelector('[data-inbox-compose-recording-time]');
        if (timeEl) {
          const m = Math.floor(elapsed / 60);
          const s = elapsed % 60;
          timeEl.textContent = `${m}:${String(s).padStart(2, '0')}`;
        }
        if (elapsed >= 120) {
          stopVoiceRecording({ discard: false });
        }
      }, 250);
      refreshCompose();
    } catch (err) {
      console.error('[dm] voice record', err);
      const name = String(err?.name || '');
      const msg = String(err?.message || '');
      if (name === 'NotAllowedError' || /permission|denied|not allowed/i.test(msg)) {
        showToast(t('dmAudioPermission'));
      } else if (name === 'NotFoundError') {
        showToast(t('dmAudioUnsupported'));
      } else {
        showToast(t('dmAudioPermission'));
      }
    }
  };

  attachToggle?.addEventListener('click', (event) => {
    event.stopPropagation();
    if (!attachMenu) return;
    const nextHidden = !attachMenu.hidden;
    attachMenu.hidden = nextHidden;
    attachToggle.setAttribute('aria-expanded', nextHidden ? 'false' : 'true');
  });

  wrap.querySelector('[data-inbox-compose-attach]')?.addEventListener('click', () => {
    closeAttachMenu();
    openDmFindingPicker((finding) => {
      inboxState.pendingFinding = finding;
      setInboxComposeVisible(modal, true);
      bindChatThread(modal, username);
      modal.querySelector('[data-inbox-compose-input]')?.focus();
    });
  });

  wrap.querySelector('[data-inbox-compose-photo]')?.addEventListener('click', () => {
    closeAttachMenu();
    photoInput?.click();
  });

  wrap.querySelector('[data-inbox-compose-audio-file]')?.addEventListener('click', () => {
    closeAttachMenu();
    audioInput?.click();
  });

  photoInput?.addEventListener('change', () => {
    const file = photoInput.files?.[0];
    photoInput.value = '';
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (file.type && !allowed.includes(file.type) && !file.type.startsWith('image/')) {
      showToast(t('dmPhotoInvalid'));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      showToast(t('dmPhotoTooLarge'));
      return;
    }
    revokePendingPhoto();
    revokePendingAudio();
    inboxState.pendingPhoto = {
      file,
      name: file.name || 'photo.jpg',
      previewUrl: URL.createObjectURL(file),
    };
    setInboxComposeVisible(modal, true);
    bindChatThread(modal, username);
    modal.querySelector('[data-inbox-compose-input]')?.focus();
  });

  audioInput?.addEventListener('change', async () => {
    const file = audioInput.files?.[0];
    audioInput.value = '';
    if (!file) return;
    const allowed = [
      'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/x-wav',
    ];
    const mime = String(file.type || '').toLowerCase();
    const baseMime = mime.split(';')[0].trim();
    if (mime && !allowed.includes(mime) && !allowed.includes(baseMime) && !mime.startsWith('audio/')) {
      showToast(t('dmAudioInvalid'));
      return;
    }
    if (file.size > 16 * 1024 * 1024) {
      showToast(t('dmAudioTooLarge'));
      return;
    }
    revokePendingPhoto();
    revokePendingAudio();
    let durationSec = 0;
    try {
      durationSec = await probeAudioFileDuration(file);
    } catch { /* ignore */ }
    inboxState.pendingAudio = { file, name: file.name || t('dmAudioFileAttachment'), durationSec };
    setInboxComposeVisible(modal, true);
    bindChatThread(modal, username);
    modal.querySelector('[data-inbox-compose-input]')?.focus();
  });

  wrap.querySelector('[data-inbox-compose-clear-photo]')?.addEventListener('click', () => {
    revokePendingPhoto();
    setInboxComposeVisible(modal, true);
    bindChatThread(modal, username);
  });

  wrap.querySelector('[data-inbox-compose-clear-audio]')?.addEventListener('click', () => {
    revokePendingAudio();
    setInboxComposeVisible(modal, true);
    bindChatThread(modal, username);
  });

  wrap.querySelector('[data-inbox-compose-clear]')?.addEventListener('click', () => {
    inboxState.pendingFinding = null;
    setInboxComposeVisible(modal, true);
    bindChatThread(modal, username);
  });

  voiceBtn?.addEventListener('click', () => {
    closeAttachMenu();
    if (inboxState.voiceRecording?.active) {
      stopVoiceRecording({ discard: false });
      return;
    }
    revokePendingAudio();
    startVoiceRecording();
  });

  wrap.querySelector('[data-inbox-compose-voice-cancel]')?.addEventListener('click', () => {
    stopVoiceRecording({ discard: true });
    refreshCompose();
  });

  const COMPOSE_MIN_H = 44;
  const COMPOSE_MAX_H = 120;
  const fitComposeInput = (el) => {
    if (!el) return;
    el.style.height = `${COMPOSE_MIN_H}px`;
    const next = Math.min(COMPOSE_MAX_H, Math.max(COMPOSE_MIN_H, el.scrollHeight));
    el.style.height = `${next}px`;
  };
  input?.addEventListener('input', () => fitComposeInput(input));
  fitComposeInput(input);

  composeForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (inboxState.voiceRecording?.active) return;
    const body = String(input?.value || '').trim();
    const findingPublicId = inboxState.pendingFinding?.publicId || '';
    const photoFile = inboxState.pendingPhoto?.file || null;
    const audioFile = inboxState.pendingAudio?.file || null;
    if (!body && !findingPublicId && !photoFile && !audioFile) return;

    const sendBtn = composeForm.querySelector('[data-inbox-compose-send]');
    if (sendBtn) sendBtn.disabled = true;

    const path = `/api/dm/conversations/${encodeURIComponent(dmPeerKey() || username)}/messages`;
    let result;
    if (photoFile || audioFile) {
      const formData = new FormData();
      if (body) formData.append('body', body);
      if (findingPublicId) formData.append('findingPublicId', findingPublicId);
      if (photoFile) formData.append('photo', photoFile);
      if (audioFile) {
        formData.append('audio', audioFile);
        const durationSec = Number(inboxState.pendingAudio?.durationSec) || 0;
        if (durationSec > 0) {
          formData.append('audioDurationSec', String(Math.min(120, durationSec)));
        }
      }
      result = await apiPostForm(path, formData);
    } else {
      const payload = {};
      if (body) payload.body = body;
      if (findingPublicId) payload.findingPublicId = findingPublicId;
      result = await apiPost(path, payload);
    }

    if (sendBtn) sendBtn.disabled = false;
    if (result.status === 401) return authRedirect();
    if (!result.ok) {
      const err = result.data?.error;
      if (err === 'photo_too_large') showToast(t('dmPhotoTooLarge'));
      else if (err === 'audio_too_large' || (err === 'file_too_large' && audioFile)) showToast(t('dmAudioTooLarge'));
      else if (err === 'file_too_large') showToast(t('dmPhotoTooLarge'));
      else if (err === 'invalid_photo_type') showToast(t('dmPhotoInvalid'));
      else if (err === 'invalid_audio_type') showToast(t('dmAudioInvalid'));
      else showToast(t('dmSendFailed'));
      notifyAppSound('error');
      return;
    }

    if (input) {
      input.value = '';
      fitComposeInput(input);
    }
    inboxState.pendingFinding = null;
    revokePendingPhoto();
    revokePendingAudio();
    setInboxComposeVisible(modal, true);
    await loadInboxInto(modal);
    bindChatThread(modal, username);
    onInboxRead?.();
    notifyAppSound('send');
  });
}

function notifyAppSound(sound) {
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'spn-app-sound', sound }, '*');
    } else {
      window.spnSound?.play(sound);
    }
  } catch {
    /* ignore */
  }
}

function notifyAppUnread() {
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'spn-app-unread',
        dm: Number(activityState.unreadDm) || 0,
        feed: Number(activityState.unreadNotifications) || 0,
      }, '*');
    }
  } catch {
    /* ignore */
  }
}

function stopThreadPoll() {
  if (threadPollTimer) {
    clearInterval(threadPollTimer);
    threadPollTimer = 0;
  }
}

function messagesFingerprint(messages) {
  if (!messages?.length) return '0';
  const last = messages[messages.length - 1];
  const readSig = messages
    .filter((m) => m.isMine)
    .map((m) => `${m.id}:${m.readAt || ''}`)
    .join(',');
  return `${messages.length}:${last.id}:${readSig}`;
}

function isInboxNearBottom(modal) {
  const listEl = modal?.querySelector('[data-inbox-list]');
  if (!listEl) return true;
  return listEl.scrollHeight - listEl.scrollTop - listEl.clientHeight < 96;
}

function scrollInboxToLatest(modal) {
  const listEl = modal?.querySelector('[data-inbox-list]');
  if (!listEl) return;
  const go = () => {
    listEl.scrollTop = listEl.scrollHeight;
    const thread = listEl.querySelector('.finding-dm-thread');
    if (thread) thread.scrollTop = thread.scrollHeight;
  };
  go();
  requestAnimationFrame(go);
  setTimeout(go, 50);
}

function notifyAppInboxState() {
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'spn-inbox-state',
        view: inboxState.view || 'dialogs',
        username: inboxState.username || null,
        peerId: inboxState.peerId || null,
      }, '*');
    }
  } catch {
    /* ignore */
  }
}

function applyThreadMessages(modal, peer, messages) {
  if (inboxState.view !== 'thread' || !sameThreadPeer(peer)) return;
  const list = messages || [];
  if (messagesFingerprint(list) === messagesFingerprint(inboxState.messages)) return;
  const lastIncoming = list.length && !list[list.length - 1].isMine;
  const stickToBottom = isInboxNearBottom(modal) || lastIncoming;
  inboxState.messages = list;
  const listEl = modal.querySelector('[data-inbox-list]');
  if (!listEl) return;
  listEl.innerHTML = renderChatThread(list, (key, vars) => tk(key, vars));
  bindChatThread(modal, dmPeerKey());
  if (stickToBottom) scrollInboxToLatest(modal);
  onInboxRead?.();
  void updateActivityTabBadges(modal);
}

async function pollThreadMessages(modal, peer) {
  const key = dmPeerKey();
  if (inboxState.view !== 'thread' || !key || (peer && !sameThreadPeer(peer))) {
    stopThreadPoll();
    return;
  }
  const { ok, data } = await apiGet(
    `/api/dm/conversations/${encodeURIComponent(key)}/messages`
  );
  if (!ok || inboxState.view !== 'thread' || key !== dmPeerKey()) return;
  if (data?.peerId) inboxState.peerId = data.peerId;
  if (data?.peerUsername) inboxState.username = data.peerUsername;
  applyThreadMessages(modal, key, data.messages || []);
}

function startInboxLiveUpdates(modal) {
  stopThreadPoll();
  if (!modal) return;
  notifyAppInboxState();
  if (isNestedAppIframe()) return;
  const tick = () => {
    if (inboxState.view === 'thread' && dmPeerKey()) {
      void pollThreadMessages(modal, dmPeerKey());
    } else if (inboxState.view === 'dialogs' && activityState.tab === 'inbox') {
      void pollDialogList(modal);
    }
  };
  threadPollTimer = setInterval(tick, 5000);
  tick();
}

export function stopInboxLiveUpdates() {
  stopThreadPoll();
}

function conversationsFingerprint(conversations) {
  return (conversations || [])
    .map((c) => `${c.peerId || c.peerUsername}:${c.unreadCount}:${c.updatedAt || ''}:${c.lastMessage?.body || ''}:${c.lastMessage?.hasPhoto ? 1 : 0}`)
    .join('|');
}

function bindDialogList(modal, conversations) {
  const listEl = modal.querySelector('[data-inbox-list]');
  const t = (key, vars) => tk(key, vars);
  if (!listEl) return;
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
    el.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const avatar = el.getAttribute('data-inbox-avatar') || '';
      if (avatar) inboxState.peerAvatarUrl = avatar;
      startInboxThread(modal, el.dataset.inboxUsername, {
        peerId: el.getAttribute('data-inbox-peer-id') || el.dataset.inboxPeerId,
        peerAvatarUrl: avatar || null,
      });
    });
    el.style.cursor = 'pointer';
  });
  updateNewDialogToolbar(modal);
}

async function pollDialogList(modal) {
  if (inboxState.view !== 'dialogs' || activityState.tab !== 'inbox') return;
  const { ok, data } = await apiGet('/api/dm/conversations');
  if (!ok || inboxState.view !== 'dialogs') return;
  const conversations = data.conversations || [];
  if (conversationsFingerprint(conversations) === conversationsFingerprint(inboxState.conversations)) {
    return;
  }
  inboxState.conversations = conversations;
  bindDialogList(modal, conversations);
  await updateActivityTabBadges(modal);
}

async function loadInboxInto(modal) {
  const listEl = modal.querySelector('[data-inbox-list]');
  const t = (key, vars) => tk(key, vars);

  if (!listEl) return;

  setActivityPanels(modal);

  if (inboxState.view === 'thread' && dmPeerKey()) {
    setInboxComposeVisible(modal, true);

    listEl.classList.add('findings-inbox-list--loading');
    listEl.setAttribute('aria-busy', 'true');
    listEl.innerHTML = renderInboxSkeleton(2);

    const { ok, status, data } = await apiGet(
      `/api/dm/conversations/${encodeURIComponent(dmPeerKey())}/messages`
    );
    listEl.classList.remove('findings-inbox-list--loading');
    listEl.setAttribute('aria-busy', 'false');

    if (status === 401) {
      listEl.innerHTML = `<p class="finding-empty finding-inbox-empty">${escapeHtml(t('loginRequired'))}</p>`;
      setInboxComposeVisible(modal, false);
      return;
    }
    if (!ok && status !== 304) {
      inboxState.view = 'dialogs';
      inboxState.username = null;
    inboxState.peerId = null;
      notifyAppInboxState();
      return loadActivityInto(modal);
    }
    if (!ok) {
      startInboxLiveUpdates(modal);
      notifyAppInboxState();
      return;
    }

    const messages = data.messages || [];
    if (data?.peerId) inboxState.peerId = data.peerId;
    if (data?.peerUsername) inboxState.username = data.peerUsername;
    if (data?.peerAvatarUrl) inboxState.peerAvatarUrl = data.peerAvatarUrl;
    inboxState.messages = messages;
    listEl.innerHTML = renderChatThread(messages, t);
    bindChatThread(modal, dmPeerKey());
    onInboxRead?.();
    await updateActivityTabBadges(modal);
    startInboxLiveUpdates(modal);
    notifyAppInboxState();
    scrollInboxToLatest(modal);
    setActivityPanels(modal);
    return;
  }

  stopThreadPoll();
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
  bindDialogList(modal, conversations);
  startInboxLiveUpdates(modal);
  notifyAppInboxState();
}

async function loadFeedInto(modal, { reset = true } = {}) {
  const titleEl = modal.querySelector('#finding-feed-modal-title');
  const hintEl = modal.querySelector('#finding-feed-modal-hint');
  const listEl = modal.querySelector('#finding-feed-modal-list');
  const loadMoreBtn = modal.querySelector('#finding-feed-load-more');
  const searchEl = modal.querySelector('#finding-feed-search');

  await syncFeedGuestTabs(modal);

  if (titleEl) titleEl.textContent = tk('feedTitle');
  if (hintEl) {
    hintEl.textContent = feedState.mode === 'following' ? tk('feedHintFollowing') : tk('feedHint');
    hintEl.hidden = isAppShell() || false;
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
  openPanel(modal, {
    inlineHost: isAppShell() ? '#findings-feed-list' : null,
  });
  await syncFeedGuestTabs(modal);
  await loadFeedInto(modal, { reset: true });
}

export async function openInboxModal(opts = {}) {
  await openActivityModal('inbox', { messagesOnly: true, ...opts });
}

export async function openFindingModal(publicId, options = {}) {
  if (!publicId || !String(publicId).startsWith('fnd_')) return;

  if (isNestedAppIframe()) {
    try {
      window.parent.postMessage({ type: 'spn-app-open-finding', publicId, options }, '*');
      return;
    } catch (_) {}
  }

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

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    const modal = document.getElementById('finding-activity-modal');
    if (!modal) return;
    if (inboxState.view === 'thread' && dmPeerKey()) {
      void pollThreadMessages(modal, dmPeerKey());
    } else if (inboxState.view === 'dialogs' && activityState.tab === 'inbox') {
      void pollDialogList(modal);
    }
  });

  window.addEventListener('message', (event) => {
    const type = event.data?.type;
    if (type !== 'spn-inbox-refresh' && type !== 'spn-inbox-messages' && type !== 'spn-inbox-conversations') {
      return;
    }
    const modal = document.getElementById('finding-activity-modal');
    if (!modal) return;
    if (type === 'spn-inbox-messages') {
      const peer = String(event.data.peerId || event.data.username || '');
      if (peer) applyThreadMessages(modal, peer, event.data.messages || []);
      return;
    }
    if (type === 'spn-inbox-conversations') {
      if (inboxState.view !== 'dialogs') return;
      const conversations = event.data.conversations || [];
      if (conversationsFingerprint(conversations) === conversationsFingerprint(inboxState.conversations)) {
        return;
      }
      inboxState.conversations = conversations;
      bindDialogList(modal, conversations);
      void updateActivityTabBadges(modal);
      return;
    }
    if (inboxState.view === 'thread' && dmPeerKey()) {
      void pollThreadMessages(modal, dmPeerKey());
    } else if (activityState.tab === 'inbox') {
      void pollDialogList(modal);
    }
  });

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
