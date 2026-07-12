import { getPageT } from './i18n-loader.js';
import { flyFindingToMenu } from './finding-fly-animation.js';

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
  const path = `${getLocalePrefix()}/find/view.html?id=${encodeURIComponent(publicId)}`;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }
  return path;
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

async function apiPatch(path, body) {
  const res = await fetch(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function getSaveModal() {
  return document.getElementById('finding-save-modal');
}

function closeOverlayModal(modal) {
  if (!modal) return;
  modal.removeAttribute('data-open');
  setTimeout(() => {
    modal.style.display = 'none';
  }, 150);
}

function openOverlayModal(modal, focusSelector) {
  if (!modal) return;
  modal.style.display = 'flex';
  modal.setAttribute('data-open', 'true');
  modal.querySelector(focusSelector)?.focus();
}

function closeSaveModal() {
  closeOverlayModal(getSaveModal());
}

function openSaveModal() {
  openOverlayModal(getSaveModal(), '.finding-save-dialog');
}

export async function copyTextToClipboard(text) {
  const value = String(text || '');
  if (!value) return false;

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    /* fallback below */
  }

  try {
    const tmp = document.createElement('textarea');
    tmp.value = value;
    tmp.setAttribute('readonly', '');
    tmp.style.position = 'fixed';
    tmp.style.left = '-9999px';
    tmp.style.top = '0';
    document.body.appendChild(tmp);
    tmp.focus();
    tmp.select();
    tmp.setSelectionRange(0, value.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(tmp);
    return ok;
  } catch {
    return false;
  }
}

function ensureToastElement() {
  let el = document.getElementById('ai-share-toast');
  if (el) return el;
  el = document.createElement('div');
  el.id = 'ai-share-toast';
  el.className = 'ai-share-toast';
  el.style.display = 'none';
  document.body.appendChild(el);
  return el;
}

export function showToast(message) {
  if (!message) return;
  const el = ensureToastElement();
  el.textContent = message;
  el.hidden = false;
  el.style.display = 'block';
  el.classList.add('visible');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    el.classList.remove('visible');
    clearTimeout(showToast._hideTimer);
    showToast._hideTimer = setTimeout(() => {
      el.style.display = 'none';
      el.hidden = true;
    }, 200);
  }, 2200);
}

function localizeSaveModal(modal) {
  const titleEl = modal.querySelector('#finding-save-title');
  const savePrivateBtn = modal.querySelector('[data-finding-action="save-private"]');
  const shareOpenBtn = modal.querySelector('[data-finding-action="share-open"]');
  const cancelBtn = modal.querySelector('[data-finding-action="cancel"]');

  if (titleEl) titleEl.textContent = tk('saveLabel');
  if (savePrivateBtn) {
    savePrivateBtn.textContent = tk('saveToProfile');
    savePrivateBtn.title = tk('saveToProfileHint');
  }
  if (shareOpenBtn) {
    shareOpenBtn.textContent = tk('shareMenuTitle');
    shareOpenBtn.title = tk('saveHint');
  }
  if (cancelBtn) cancelBtn.textContent = tk('cancelLabel');
}

async function savePendingFinding(pendingContext, visibility = 'private') {
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

  return { ok: true, publicId: data.publicId, visibility: data.visibility };
}

export async function initFindingsSave(getContext) {
  await loadT();

  const saveBtn = document.querySelector('.ai-action-btn[data-ai-action="save-finding"]');
  if (!saveBtn || saveBtn.dataset.initialized) return;
  saveBtn.dataset.initialized = 'true';

  const saveModal = getSaveModal();
  if (!saveModal) return;

  const saveBackdrop = saveModal.querySelector('.ai-share-backdrop');
  const saveCloseBtn = saveModal.querySelector('.finding-save-close');
  const saveCancelBtn = saveModal.querySelector('[data-finding-action="cancel"]');
  const savePrivateBtn = saveModal.querySelector('[data-finding-action="save-private"]');
  const shareOpenBtn = saveModal.querySelector('[data-finding-action="share-open"]');

  let pendingContext = null;

  const closeSave = () => {
    closeSaveModal();
    pendingContext = null;
  };

  saveBackdrop?.addEventListener('click', closeSave);
  saveCloseBtn?.addEventListener('click', closeSave);
  saveCancelBtn?.addEventListener('click', closeSave);

  saveBtn.title = tk('saveLabel');
  saveBtn.setAttribute('aria-label', tk('saveLabel'));
  localizeSaveModal(saveModal);

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
    localizeSaveModal(saveModal);
    openSaveModal();
  });

  async function finishSave(visibility, toastKey, triggerBtn) {
    if (!pendingContext) return;
    if (savePrivateBtn) savePrivateBtn.disabled = true;
    if (shareOpenBtn) shareOpenBtn.disabled = true;
    const result = await savePendingFinding(pendingContext, visibility);
    if (savePrivateBtn) savePrivateBtn.disabled = false;
    if (shareOpenBtn) shareOpenBtn.disabled = false;
    if (!result.ok) return;

    closeSaveModal();
    await flyFindingToMenu(triggerBtn || saveModal.querySelector('.finding-save-dialog'));
    showToast(tk(toastKey));
    pendingContext = null;
  }

  savePrivateBtn?.addEventListener('click', () => finishSave('private', 'savedToast', savePrivateBtn));

  shareOpenBtn?.addEventListener('click', async () => {
    if (!pendingContext) return;

    const query = pendingContext.query || '';
    if (savePrivateBtn) savePrivateBtn.disabled = true;
    shareOpenBtn.disabled = true;

    const result = await savePendingFinding(pendingContext, 'private');
    if (savePrivateBtn) savePrivateBtn.disabled = false;
    shareOpenBtn.disabled = false;
    if (!result.ok) return;

    closeSaveModal();
    pendingContext = null;

    const { openShareMenuModal, initFindingsModals } = await import('./findings-modals.js');
    await initFindingsModals();

    openShareMenuModal({
      publicId: result.publicId,
      isOwner: true,
      visibility: result.visibility || 'private',
      query,
      onPublished: async () => {
        await flyFindingToMenu(shareOpenBtn || saveModal.querySelector('.finding-save-dialog'));
      },
    });
  });
}

export { apiGet, apiPost, apiDelete, apiPatch };
