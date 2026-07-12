import { getPageT } from './i18n-loader.js';

let t = (key, vars = {}) => key;

function tk(key, vars = {}) {
  return getFindingT(`finding.${key}`, vars);
}

export function getFindingT(key, vars = {}) {
  return t(key, vars);
}

export async function loadT() {
  t = await getPageT('finding');
}

function getLocalePrefix() {
  const lang = document.documentElement.lang || 'ru';
  return lang === 'ru' ? '/frontend' : `/frontend/${lang}`;
}

export function buildFindingViewUrl(publicId) {
  return `${getLocalePrefix()}/find/view.html?id=${encodeURIComponent(publicId)}`;
}

export function buildInboxUrl() {
  return `${getLocalePrefix()}/findings/inbox.html`;
}

export function buildFeedUrl() {
  return `${getLocalePrefix()}/findings/feed.html`;
}

export function buildAuthUrl(returnPath) {
  const prefix = getLocalePrefix();
  const ret = encodeURIComponent(returnPath || window.location.pathname + window.location.search);
  return `${prefix}/auth/auth.html?tab=login&return=${ret}`;
}

export function buildFindingSnapshot(ctx) {
  return {
    answer: {
      text: ctx.answer || '',
      usedWebSearch: ctx.usedWebSearch === true,
      answerEmpty: ctx.answerEmpty === true,
    },
    sources: Array.isArray(ctx.sources) ? ctx.sources.slice(0, 12) : [],
    media: {
      images: Array.isArray(ctx.images) ? ctx.images.slice(0, 6) : [],
      videos: Array.isArray(ctx.videos) ? ctx.videos.slice(0, 6) : [],
    },
    timings: ctx.timings || null,
    savedAt: new Date().toISOString(),
  };
}

async function apiPost(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function apiGet(path) {
  const res = await fetch(path, { credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function apiDelete(path) {
  const res = await fetch(path, { method: 'DELETE', credentials: 'include' });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function getModal() {
  return document.getElementById('finding-save-modal');
}

function closeModal() {
  const modal = getModal();
  if (!modal) return;
  modal.removeAttribute('data-open');
  setTimeout(() => {
    modal.style.display = 'none';
  }, 150);
}

function openModal() {
  const modal = getModal();
  if (!modal) return;
  modal.style.display = 'flex';
  modal.setAttribute('data-open', 'true');
  modal.querySelector('.finding-save-dialog')?.focus();
}

export function showToast(message) {
  const el = document.getElementById('ai-share-toast');
  if (!el) {
    window.alert(message);
    return;
  }
  el.textContent = message;
  el.hidden = false;
  el.classList.add('is-visible');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    el.hidden = true;
    el.classList.remove('is-visible');
  }, 3200);
}

function resetShareForm(modal) {
  const shareForm = modal.querySelector('#finding-save-share-form');
  const shareUsername = modal.querySelector('#finding-save-share-username');
  const shareMessage = modal.querySelector('#finding-save-share-message');
  if (shareForm) shareForm.hidden = true;
  if (shareUsername) shareUsername.value = '';
  if (shareMessage) shareMessage.value = '';
}

function localizeModal(modal) {
  modal.querySelectorAll('[data-finding-i18n]').forEach((el) => {
    const key = el.dataset.findingI18n;
    if (key) el.textContent = tk(key);
  });
  const titleEl = modal.querySelector('#finding-save-title');
  const saveBtn = modal.querySelector('[data-finding-action="save"]');
  const cancelBtn = modal.querySelector('[data-finding-action="cancel"]');
  const shareToggleBtn = modal.querySelector('[data-finding-action="share-toggle"]');
  const shareSendBtn = modal.querySelector('[data-finding-action="share-send"]');
  const shareUsername = modal.querySelector('#finding-save-share-username');
  const shareMessage = modal.querySelector('#finding-save-share-message');

  if (titleEl) titleEl.textContent = tk('saveLabel');
  if (saveBtn) saveBtn.textContent = tk('saveLabel');
  if (cancelBtn) cancelBtn.textContent = tk('cancelLabel');
  if (shareToggleBtn) shareToggleBtn.textContent = tk('sendToFriend');
  if (shareSendBtn) shareSendBtn.textContent = tk('sendToUser');
  if (shareUsername) shareUsername.placeholder = tk('usernamePlaceholder');
  if (shareMessage) shareMessage.placeholder = tk('messagePlaceholder');
}

async function savePendingFinding(modal, pendingContext) {
  const visibility =
    modal.querySelector('input[name="finding-visibility"]:checked')?.value || 'private';

  const snapshot = buildFindingSnapshot(pendingContext);
  const { ok, status, data } = await apiPost('/api/findings', {
    query: pendingContext.query || '',
    locale: document.documentElement.lang || 'ru',
    visibility,
    snapshot,
  });

  if (!ok) {
    if (status === 401) {
      window.location.href = buildAuthUrl(window.location.pathname + window.location.search);
      return { ok: false };
    }
    showToast(tk('saveFailed'));
    return { ok: false };
  }

  return { ok: true, publicId: data.publicId };
}

export async function initFindingsSave(getContext) {
  await loadT();

  const saveBtn = document.querySelector('.ai-action-btn[data-ai-action="save-finding"]');
  if (!saveBtn || saveBtn.dataset.initialized) return;
  saveBtn.dataset.initialized = 'true';

  const modal = getModal();
  if (!modal) return;

  const backdrop = modal.querySelector('.ai-share-backdrop');
  const closeBtn = modal.querySelector('.finding-save-close');
  const cancelBtn = modal.querySelector('[data-finding-action="cancel"]');
  const confirmSaveBtn = modal.querySelector('[data-finding-action="save"]');
  const shareToggleBtn = modal.querySelector('[data-finding-action="share-toggle"]');
  const shareSendBtn = modal.querySelector('[data-finding-action="share-send"]');
  const shareForm = modal.querySelector('#finding-save-share-form');
  const shareUsername = modal.querySelector('#finding-save-share-username');
  const shareMessage = modal.querySelector('#finding-save-share-message');

  let pendingContext = null;

  const close = () => {
    closeModal();
    pendingContext = null;
    resetShareForm(modal);
  };

  backdrop?.addEventListener('click', close);
  closeBtn?.addEventListener('click', close);
  cancelBtn?.addEventListener('click', close);

  saveBtn.title = tk('saveLabel');
  saveBtn.setAttribute('aria-label', tk('saveLabel'));
  localizeModal(modal);

  shareToggleBtn?.addEventListener('click', () => {
    if (!shareForm) return;
    const nextOpen = shareForm.hidden;
    shareForm.hidden = !nextOpen;
    if (nextOpen) shareUsername?.focus();
  });

  saveBtn.addEventListener('click', async () => {
    const ctx = getContext();
    if (!ctx.answer && ctx.answerEmpty) {
      showToast(tk('emptyAnswer'));
      return;
    }

    const authCheck = await apiGet('/auth/protected');
    if (!authCheck.ok) {
      window.location.href = buildAuthUrl(window.location.pathname + window.location.search);
      return;
    }

    pendingContext = ctx;
    resetShareForm(modal);
    localizeModal(modal);
    openModal();
  });

  confirmSaveBtn?.addEventListener('click', async () => {
    if (!pendingContext) return;
    confirmSaveBtn.disabled = true;
    const result = await savePendingFinding(modal, pendingContext);
    confirmSaveBtn.disabled = false;
    if (!result.ok) return;

    showToast(tk('savedToast'));
    close();
  });

  shareSendBtn?.addEventListener('click', async () => {
    if (!pendingContext) return;
    const toUsername = (shareUsername?.value || '').trim().replace(/^@/, '');
    if (!toUsername) {
      shareUsername?.focus();
      return;
    }

    shareSendBtn.disabled = true;
    const saved = await savePendingFinding(modal, pendingContext);
    if (!saved.ok) {
      shareSendBtn.disabled = false;
      return;
    }

    const { ok, status, data } = await apiPost(
      `/api/findings/${encodeURIComponent(saved.publicId)}/share`,
      {
        toUsername,
        message: (shareMessage?.value || '').trim(),
      }
    );
    shareSendBtn.disabled = false;

    if (!ok) {
      if (status === 401) {
        window.location.href = buildAuthUrl(window.location.pathname + window.location.search);
        return;
      }
      const err = data?.error;
      if (err === 'user_not_found') showToast(tk('userNotFound'));
      else if (err === 'self_share') showToast(tk('selfShare'));
      else showToast(tk('shareFailed'));
      return;
    }

    showToast(tk('shareSent', { username: data?.toUsername || toUsername }));
    close();
  });
}

export { apiGet, apiPost, apiDelete };
