import { generateCombinedBackground } from '../scripts/backgroundGenerator.js';
import { getPageT } from '../scripts/i18n-loader.js';
import { getFrontendPath, getFrontendUrl, redirectToAuth } from '../scripts/locale-paths.js';
import {
  apiGet,
  apiDelete,
  apiPatch,
  loadT as loadFindingT,
  getFindingT,
  showToast,
} from '../scripts/findings-client.js';
import { openFindingModal } from '../scripts/findings-modals.js';
import { renderFindingListCard } from '../scripts/finding-list-card.js';
import {
  TOOL_CATALOG,
  normalizeToolHref,
  loadAndMigrateFavorites,
  isFavoriteHref
} from '../scripts/tool-favorites.js';

function escapeHtmlAttr(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Allow only same-site /frontend/... paths (blocks javascript: / open redirects). */
function safeFrontendHref(href, fallback = '#') {
  if (!href || typeof href !== 'string') return fallback;
  const trimmed = href.trim();
  if (trimmed.startsWith('/frontend/') && !trimmed.includes('\\') && !/^[a-z]+:/i.test(trimmed.slice(1))) {
    return trimmed;
  }
  try {
    const u = new URL(trimmed, window.location.origin);
    if (u.origin === window.location.origin && u.pathname.startsWith('/frontend/')) {
      return `${u.pathname}${u.search}${u.hash}`;
    }
  } catch (_) {}
  return fallback;
}

function getLocalizedHref(href) {
  const relative = href.replace(/^\/frontend\//, '');
  return getFrontendPath(relative);
}

function buildTools(t) {
  return TOOL_CATALOG.map(tool => ({
    ...tool,
    name: t(tool.nameKey),
    neutralHref: tool.href,
    href: getLocalizedHref(tool.href)
  }));
}

function isFavoriteEntry(entry, tool) {
  return isFavoriteHref(entry, tool.neutralHref);
}

document.addEventListener('DOMContentLoaded', async () => {
  const t = await getPageT('profile');

  generateCombinedBackground();

  const pointsBalanceEl = document.getElementById('pointsBalance');
  const pointsHistoryEl = document.getElementById('pointsHistory');
  const pointsBadgeEl = document.getElementById('pointsBadge');
  const usernameField = document.getElementById('username');
  const emailField = document.getElementById('email');
  const avatarButton = document.getElementById('avatarButton');
  const avatarImage = document.getElementById('avatarImage');
  const avatarInitials = document.getElementById('avatarInitials');
  const accountStatusBadge = document.getElementById('accountStatusBadge');
  const planBadge = document.getElementById('planBadge');
  const planNameEl = document.getElementById('planName');
  const planStatusEl = document.getElementById('planStatus');
  const planQuotaCounterEl = document.getElementById('planQuotaCounter');
  const planQuotaBarFillEl = document.getElementById('planQuotaBarFill');
  const planQuotaHintEl = document.getElementById('planQuotaHint');
  const planHintEl = document.getElementById('planHint');

  const aiAccessBlock = document.getElementById('aiAccessBlock');
  const openAiServiceBtn = document.getElementById('openAiService');
  const aiAccessHint = document.getElementById('aiAccessHint');

  const openEditProfileBtn = document.getElementById('openEditProfile');
  const editProfileMount = document.getElementById('editProfileMount');

  const createOnnmailButton = document.getElementById('createOnnmailButton');
  const loginOnnmailButton = document.getElementById('loginOnnmailButton');
  const logoutButton = document.getElementById('logoutButton');
  const managePlanButton = document.getElementById('managePlanButton');

  const favoriteContainer = document.getElementById('favoriteTools');
  const noFavoritesMessage = document.getElementById('noFavoritesMessage');

  const referralLinkInput = document.getElementById('referralLink');
  const copyReferralLinkBtn = document.getElementById('copyReferralLink');

  let isEditOpen = false;
  let currentAvatarUrl = null;
  let currentDisplayName = '';
  let currentDisplayEmail = '';

  /* ==== УТИЛИТЫ ==== */

  function setGlobalMessage(text, type = '') {
    if (!text) return;

    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';

    if (type === 'success') toast.classList.add('toast--success');
    if (type === 'error') toast.classList.add('toast--error');

    const iconSpan = document.createElement('span');
    iconSpan.className = 'toast__icon';
    iconSpan.textContent = type === 'success' ? '✔' : type === 'error' ? '⚠' : 'ℹ';

    const contentSpan = document.createElement('span');
    contentSpan.className = 'toast__content';
    contentSpan.textContent = text;

    const closeBtn = document.createElement('button');
    closeBtn.className = 'toast__close';
    closeBtn.type = 'button';
    closeBtn.setAttribute('aria-label', t('profile.closeNotification'));
    closeBtn.textContent = '×';

    closeBtn.addEventListener('click', () => {
      toast.classList.remove('toast--visible');
      setTimeout(() => toast.remove(), 200);
    });

    toast.appendChild(iconSpan);
    toast.appendChild(contentSpan);
    toast.appendChild(closeBtn);

    container.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add('toast--visible');
    });

    setTimeout(() => {
      toast.classList.remove('toast--visible');
      setTimeout(() => toast.remove(), 200);
    }, 4000);
  }

  function getDayWord(n) {
    const abs = Math.abs(n);
    const last = abs % 10;
    const lastTwo = abs % 100;

    if (last === 1 && lastTwo !== 11) return t('profile.dayWord.one');
    if (last >= 2 && last <= 4 && (lastTwo < 10 || lastTwo >= 20)) return t('profile.dayWord.few');
    return t('profile.dayWord.many');
  }

  function setBadge(el, typeClass, text) {
    el.className = 'status-badge ' + typeClass;
    el.textContent = text;
  }

  function serverMessage(data, fallbackKey) {
    if (data?.messageKey) return t(data.messageKey);
    if (data?.message) return data.message;
    return t(fallbackKey);
  }

  function updateAvatarDisplay(name, email, avatarUrl = currentAvatarUrl) {
    currentDisplayName = name || '';
    currentDisplayEmail = email || '';
    currentAvatarUrl = avatarUrl || null;

    const source = (name || email || '').trim();
    const initials = source ? source[0].toUpperCase() : 'U';

    if (avatarButton) {
      avatarButton.setAttribute('aria-label', t('profile.avatarButtonAria'));
    }

    if (avatarImage && avatarInitials) {
      if (currentAvatarUrl) {
        avatarImage.src = currentAvatarUrl;
        avatarImage.alt = name || email || t('profile.avatarImageAlt');
        avatarImage.hidden = false;
        avatarInitials.hidden = true;
      } else {
        avatarImage.removeAttribute('src');
        avatarImage.hidden = true;
        avatarInitials.hidden = false;
        avatarInitials.textContent = initials;
      }
    } else if (avatarInitials) {
      avatarInitials.textContent = initials;
    }
  }

  function getAvatarInitials(name, email) {
    const source = (name || email || '').trim();
    return source ? source[0].toUpperCase() : 'U';
  }

  /* ==== АВАТАР: МОДАЛЬНОЕ ОКНО ==== */

  function getOrCreateAvatarModal() {
    let overlay = document.getElementById('avatar-modal-overlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'avatar-modal-overlay';
    overlay.className = 'avatar-modal';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', t('profile.avatarModalTitle'));

    overlay.innerHTML = `
      <div class="avatar-modal__dialog">
        <button type="button" class="avatar-modal__close" aria-label="${t('profile.avatarClose')}">&times;</button>
        <h2 class="avatar-modal__title">${t('profile.avatarModalTitle')}</h2>
        <p class="avatar-modal__hint">${t('profile.avatarModalHint')}</p>
        <div class="avatar-modal__preview" id="avatarModalPreview">
          <span id="avatarModalInitials">U</span>
          <img id="avatarModalImage" alt="" hidden>
        </div>
        <p class="avatar-modal__status" id="avatarModalStatus" aria-live="polite"></p>
        <div class="avatar-modal__actions">
          <input type="file" id="avatarFileInput" class="avatar-modal__file-input" accept="image/jpeg,image/png,image/webp">
          <button type="button" class="secondary-button" id="avatarChooseBtn">${t('profile.avatarChoose')}</button>
          <button type="button" class="secondary-button avatar-modal__delete" id="avatarDeleteBtn" hidden>${t('profile.avatarDelete')}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('.avatar-modal__close').addEventListener('click', closeAvatarModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeAvatarModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('visible')) closeAvatarModal();
    });

    const fileInput = overlay.querySelector('#avatarFileInput');
    const chooseBtn = overlay.querySelector('#avatarChooseBtn');

    chooseBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (file) uploadAvatarFile(file);
      fileInput.value = '';
    });

    overlay.querySelector('#avatarDeleteBtn').addEventListener('click', deleteAvatar);

    return overlay;
  }

  function updateAvatarModalPreview() {
    const overlay = document.getElementById('avatar-modal-overlay');
    if (!overlay) return;

    const previewImg = overlay.querySelector('#avatarModalImage');
    const previewInitials = overlay.querySelector('#avatarModalInitials');
    const deleteBtn = overlay.querySelector('#avatarDeleteBtn');
    const initials = getAvatarInitials(currentDisplayName, currentDisplayEmail);

    if (currentAvatarUrl) {
      previewImg.src = currentAvatarUrl;
      previewImg.alt = currentDisplayName || currentDisplayEmail || t('profile.avatarImageAlt');
      previewImg.hidden = false;
      previewInitials.hidden = true;
      deleteBtn.hidden = false;
    } else {
      previewImg.removeAttribute('src');
      previewImg.hidden = true;
      previewInitials.hidden = false;
      previewInitials.textContent = initials;
      deleteBtn.hidden = true;
    }
  }

  function setAvatarModalStatus(text, isError = false) {
    const status = document.getElementById('avatarModalStatus');
    if (!status) return;
    status.textContent = text || '';
    status.classList.toggle('avatar-modal__status--error', Boolean(isError));
  }

  function openAvatarModal() {
    const overlay = getOrCreateAvatarModal();
    setAvatarModalStatus('');
    updateAvatarModalPreview();
    overlay.classList.add('visible');
    overlay.querySelector('#avatarChooseBtn')?.focus();
  }

  function closeAvatarModal() {
    const overlay = document.getElementById('avatar-modal-overlay');
    if (overlay) overlay.classList.remove('visible');
    setAvatarModalStatus('');
  }

  async function uploadAvatarFile(file) {
    const maxBytes = 2 * 1024 * 1024;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowed.includes(file.type)) {
      setAvatarModalStatus(t('profile.avatarInvalidType'), true);
      return;
    }
    if (file.size > maxBytes) {
      setAvatarModalStatus(t('profile.avatarTooLarge'), true);
      return;
    }

    const chooseBtn = document.getElementById('avatarChooseBtn');
    const deleteBtn = document.getElementById('avatarDeleteBtn');
    if (chooseBtn) chooseBtn.disabled = true;
    if (deleteBtn) deleteBtn.disabled = true;
    setAvatarModalStatus(t('profile.avatarUploading'));

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/profile/avatar', {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      const data = await safeJson(response);

      if (!response.ok) {
        setAvatarModalStatus(serverMessage(data, 'profile.avatarUploadFailed'), true);
        if (response.status === 401) handleUnauthorized();
        return;
      }

      updateAvatarDisplay(currentDisplayName, currentDisplayEmail, data.avatar_url || null);
      updateAvatarModalPreview();
      setAvatarModalStatus(t('profile.avatarUploadSuccess'));
      setGlobalMessage(t('profile.avatarUploadSuccess'), 'success');
      setTimeout(closeAvatarModal, 600);
    } catch {
      setAvatarModalStatus(t('profile.avatarUploadFailed'), true);
    } finally {
      if (chooseBtn) chooseBtn.disabled = false;
      if (deleteBtn) deleteBtn.disabled = false;
    }
  }

  async function deleteAvatar() {
    const chooseBtn = document.getElementById('avatarChooseBtn');
    const deleteBtn = document.getElementById('avatarDeleteBtn');
    if (chooseBtn) chooseBtn.disabled = true;
    if (deleteBtn) deleteBtn.disabled = true;
    setAvatarModalStatus(t('profile.avatarDeleting'));

    try {
      const response = await fetch('/profile/avatar', {
        method: 'DELETE',
        credentials: 'include'
      });
      const data = await safeJson(response);

      if (!response.ok) {
        setAvatarModalStatus(serverMessage(data, 'profile.avatarDeleteFailed'), true);
        if (response.status === 401) handleUnauthorized();
        return;
      }

      updateAvatarDisplay(currentDisplayName, currentDisplayEmail, null);
      updateAvatarModalPreview();
      setAvatarModalStatus(t('profile.avatarDeleteSuccess'));
      setGlobalMessage(t('profile.avatarDeleteSuccess'), 'success');
    } catch {
      setAvatarModalStatus(t('profile.avatarDeleteFailed'), true);
    } finally {
      if (chooseBtn) chooseBtn.disabled = false;
      if (deleteBtn) deleteBtn.disabled = false;
    }
  }

  function updatePlanQuotaBar(used, limit) {
    if (!limit || limit <= 0) {
      planQuotaBarFillEl.style.width = '0%';
      return;
    }
    const percent = Math.min(100, Math.round((used / limit) * 100));
    planQuotaBarFillEl.style.width = percent + '%';
    planQuotaBarFillEl.dataset.percent = percent;
  }

  function handleUnauthorized() {
    redirectToAuth({ tab: 'login' });
  }

  async function safeJson(response) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }

  /* ==== МОИ ИНСТРУМЕНТЫ (ИЗБРАННОЕ) ==== */

  function renderFavoriteTools() {
    if (!favoriteContainer) return;

    const tools = buildTools(t);
    const favorites = loadAndMigrateFavorites(tools);
    const favoriteTools = tools.filter(tool =>
      favorites.some(entry => isFavoriteEntry(entry, tool))
    );

    if (!favoriteTools.length) {
      favoriteContainer.innerHTML = '';
      if (noFavoritesMessage) noFavoritesMessage.style.display = 'block';
      return;
    }

    if (noFavoritesMessage) noFavoritesMessage.style.display = 'none';

    // Fix: используем createElement + textContent вместо innerHTML для предотвращения XSS
    favoriteContainer.innerHTML = '';
    favoriteTools.forEach(tool => {
      const a = document.createElement('a');
      a.className = 'tool-link';
      a.href = safeFrontendHref(tool.href);
      const span = document.createElement('span');
      span.className = 'tool-text';
      span.textContent = tool.name;
      a.appendChild(span);
      favoriteContainer.appendChild(a);
    });
  }

  /* ==== РЕНДЕР ФОРМЫ РЕДАКТИРОВАНИЯ ==== */

  function renderEditForm() {
    if (!isEditOpen) {
      editProfileMount.innerHTML = '';
      return;
    }

    const usernameValue =
      usernameField.textContent && usernameField.textContent !== t('profile.noName')
        ? usernameField.textContent
        : '';
    const emailValue =
      emailField.textContent && emailField.textContent !== '—'
        ? emailField.textContent
        : '';

    editProfileMount.innerHTML = `
    <section class="edit-inline" aria-label="${escapeHtmlAttr(t('profile.editSectionLabel'))}">
      <form id="profileForm" class="form-card form-card--inline" novalidate>
        <div class="form-field form-field--inline">
          <label for="newUsername">${escapeHtmlAttr(t('profile.labelName'))}</label>
          <input type="text"
              id="newUsername"
              name="newUsername"
              maxlength="255"
              placeholder="${escapeHtmlAttr(t('profile.namePlaceholder'))}"
              value="${escapeHtmlAttr(usernameValue)}">
        </div>

        <div class="form-field form-field--inline">
          <label for="newEmail">${escapeHtmlAttr(t('profile.labelEmail'))}</label>
          <input type="email"
              id="newEmail"
              name="newEmail"
              placeholder="${escapeHtmlAttr(t('profile.emailPlaceholder'))}"
              value="${escapeHtmlAttr(emailValue)}">
        </div>

        <div class="form-actions form-actions--inline">
          <button type="submit" class="primary-button primary-button--inline">
            ${escapeHtmlAttr(t('profile.save'))}
          </button>
          <button type="button" id="cancelEditProfile" class="secondary-button secondary-button--inline">
            ${escapeHtmlAttr(t('profile.cancel'))}
          </button>
        </div>

        <p id="newUsernameError" class="field-error" aria-live="polite"></p>
        <p id="newEmailError" class="field-error" aria-live="polite"></p>
      </form>
    </section>
    `;

    const profileForm = document.getElementById('profileForm');
    const newUsernameInput = document.getElementById('newUsername');
    const newEmailInput = document.getElementById('newEmail');
    const newUsernameError = document.getElementById('newUsernameError');
    const newEmailError = document.getElementById('newEmailError');
    const cancelEditProfileBtn = document.getElementById('cancelEditProfile');

    cancelEditProfileBtn.addEventListener('click', () => {
      isEditOpen = false;
      renderEditForm();
    });

    profileForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      setGlobalMessage('');

      const newUsername = newUsernameInput.value.trim();
      const newEmail = newEmailInput.value.trim();

      newUsernameError.textContent = '';
      newEmailError.textContent = '';

      const payload = {};
      if (newUsername && newUsername !== usernameField.textContent) {
        payload.username = newUsername;
      }
      if (newEmail && newEmail !== emailField.textContent) {
        payload.email = newEmail;
      }

      if (!Object.keys(payload).length) {
        setGlobalMessage(t('profile.noChanges'), 'error');
        return;
      }

      if (payload.email && !payload.email.includes('@')) {
        newEmailError.textContent = t('profile.invalidEmail');
        return;
      }

      await updateProfile(payload);
    });

    newUsernameInput.focus();
  }

  /* ==== ВСПОМОГАТЕЛЬНАЯ ФУНКЦИЯ ДЛЯ planHintEl ==== */

  // Fix: создаём ссылку через createElement вместо innerHTML для предотвращения XSS
  function makeTariffsLink(text) {
    const a = document.createElement('a');
    a.href = getFrontendPath('tariffs/tariffs.html');
    a.textContent = text;
    return a;
  }

  /* ==== API ==== */

  async function getProfile() {
    try {
      const response = await fetch('/profile/info', {
        method: 'GET',
        credentials: 'include'
      });

      const data = await safeJson(response);

      if (!response.ok) {
        setGlobalMessage(data?.message || t('profile.loadError'), 'error');
        if (response.status === 401) handleUnauthorized();
        return;
      }

      const username = data.username || '';
      const email = data.email || '';

      usernameField.textContent = username || t('profile.noName');
      emailField.textContent = email || '—';
      updateAvatarDisplay(username, email, data.avatar_url || null);

      if (referralLinkInput) {
        if (username) {
          const url = `${getFrontendUrl('auth/auth.html')}?tab=register&ref=${encodeURIComponent(username)}`;
          referralLinkInput.value = url;
          referralLinkInput.title = t('profile.referralHint');
          if (copyReferralLinkBtn) {
            copyReferralLinkBtn.title = t('profile.referralHint');
          }
        } else {
          referralLinkInput.value = '';
          referralLinkInput.title = t('profile.referralHintNoName');
          if (copyReferralLinkBtn) {
            copyReferralLinkBtn.title = t('profile.referralHintNoName');
          }
        }
      }

      if (!data.confirmed) {
        setBadge(accountStatusBadge, 'status-badge--unconfirmed', t('profile.emailNotConfirmed'));
      } else {
        setBadge(accountStatusBadge, 'status-badge--ok', t('profile.accountConfirmed'));
      }

      const plan = data.plan || 'free';
      const isPro = plan === 'pro';
      const isProActive = !!data.is_pro_active;

      const isCurrentPro = isPro && isProActive;
      const currentPlan = isCurrentPro ? 'pro' : 'free';

      if (currentPlan === 'pro') {
        planNameEl.textContent = 'Pro';
        setBadge(planBadge, 'status-badge--pro', t('profile.proActive'));
      } else {
        planNameEl.textContent = 'Free';

        if (isPro && !isProActive) {
          setBadge(planBadge, 'status-badge--pro-expired', t('profile.proExpired'));
        } else {
          setBadge(planBadge, 'status-badge--free', 'Free');
        }
      }

      if (currentPlan === 'pro') {
        const until = data.pro_until
          ? new Date(data.pro_until).toLocaleDateString(document.documentElement.lang || 'ru')
          : '';
        planStatusEl.textContent = until
          ? t('profile.proActiveUntil', { date: until })
          : t('profile.proActiveNoDate');
        planStatusEl.hidden = false;
        if (managePlanButton) managePlanButton.title = '';
      } else {
        planStatusEl.textContent = '';
        planStatusEl.hidden = true;
        if (isPro && !isProActive) {
          if (managePlanButton) {
            managePlanButton.title = t('profile.proExpiredTooltip');
          }
        } else {
          if (managePlanButton) {
            managePlanButton.title = t('profile.freeHintTooltip');
          }
        }
      }

      if (currentPlan === 'pro' && data.quotas && data.quotas.pro_monthly) {
        const q = data.quotas.pro_monthly;

        planQuotaCounterEl.textContent = `${q.remaining}`;

        planQuotaHintEl.textContent =
          q.used === 0
            ? t('profile.proQuotaUnused')
            : t('profile.proQuotaUsed', { used: q.used });
        planQuotaHintEl.hidden = false;
        planQuotaCounterEl.title = '';

        updatePlanQuotaBar(q.used, q.limit);
      } else if (currentPlan === 'free' && data.quotas && data.quotas.free_daily) {
        const q = data.quotas.free_daily;
        planQuotaCounterEl.textContent = `${q.used ?? 0} / ${q.limit}`;
        planQuotaHintEl.textContent = '';
        planQuotaHintEl.hidden = true;
        planQuotaCounterEl.title = t('profile.freeQuotaHint');
        updatePlanQuotaBar(q.used ?? 0, q.limit);
      } else {
        if (currentPlan === 'pro') {
          planQuotaCounterEl.textContent = '—';
          planQuotaHintEl.textContent = t('profile.proQuotaUnavailable');
          planQuotaHintEl.hidden = false;
          planQuotaCounterEl.title = '';
          updatePlanQuotaBar(0, 100);
        } else {
          planQuotaCounterEl.textContent = '0 / 15';
          planQuotaHintEl.textContent = '';
          planQuotaHintEl.hidden = true;
          planQuotaCounterEl.title = t('profile.freeQuotaDefault');
          updatePlanQuotaBar(0, 15);
        }
      }

      planHintEl.textContent = '';
      planHintEl.hidden = true;
      if (currentPlan === 'pro') {
        planHintEl.hidden = false;
        planHintEl.append(
          t('profile.proHintPrefix'),
          makeTariffsLink(t('profile.tariffsPage')),
          '.'
        );
      }

      if (aiAccessBlock && aiAccessHint) {
        if (currentPlan === 'pro') {
          aiAccessBlock.style.display = 'block';
          aiAccessHint.textContent = t('profile.aiHint');
        } else {
          aiAccessBlock.style.display = 'none';
        }
      }

    } catch (error) {
      console.error('Ошибка получения профиля:', error);
      setGlobalMessage(t('profile.loadErrorRetry'), 'error');
    }
  }

  async function loadPoints() {
    if (!pointsBalanceEl) return;

    try {
      const response = await fetch('/api/me/points', {
        method: 'GET',
        credentials: 'include'
      });

      const data = await safeJson(response);

      if (!response.ok) {
        console.error('Не удалось загрузить баллы', response.status, data);
        pointsBalanceEl.textContent = '—';
        return;
      }

      const balance = typeof data?.balance === 'number' ? data.balance : 0;
      pointsBalanceEl.textContent = balance;
    } catch (error) {
      console.error('Ошибка загрузки баллов:', error);
      pointsBalanceEl.textContent = '—';
    }
  }

  /* ==== ИСТОРИЯ БАЛЛОВ ==== */

  function mapPointsReason(item) {
    switch (item.type) {
      case 'registration_backfill_50':
      case 'registration_signup':
        return t('points.registration');

      case 'registration_backfill':
        return t('points.registrationConfirm');

      case 'registration':
        if (item.meta?.via === 'telegram') return t('points.telegramConfirm');
        if (item.meta?.via === 'email') return t('points.emailConfirm');
        return t('points.accountConfirm');

      case 'invite_basic':
        return t('points.inviteBasic');
      case 'invite_qualified':
        return t('points.inviteQualified');

      case 'referral_referrer':
        return t('points.referralReferrer');

      case 'referral_referee':
        return t('points.referralReferee');

      case 'withdraw_request':
        if (item.meta?.via === 'pro_exchange') {
          return t('points.withdrawProExchange');
        }
        return t('points.withdrawRequest');

      case 'withdraw_paid':
        if (item.meta?.via === 'pro_exchange') {
          return t('points.proActivatedByPoints');
        }
        return t('points.withdrawPaid');

      case 'withdraw_rollback':
        return t('points.withdrawRollback');

      case 'admin_adjust':
      case 'manual':
        return t('points.manualAdjust');

      default:
        return t('points.genericOperation');
    }
  }

  async function loadPointsHistory() {
    try {
      const response = await fetch('/api/me/points/history', {
        method: 'GET',
        credentials: 'include'
      });

      const data = await safeJson(response);

      if (!response.ok) {
        console.error('Не удалось загрузить историю баллов', response.status, data);
        return [];
      }

      return Array.isArray(data.history) ? data.history : [];
    } catch (error) {
      console.error('Ошибка загрузки истории баллов:', error);
      return [];
    }
  }

  async function updateReferralCounter() {
    const referralCounterEl = document.getElementById('referralCounter');
    if (!referralCounterEl) return;

    try {
      const history = await loadPointsHistory();

      const referralCount = history.filter(
        item => item.type === 'invite_basic'
      ).length;

      referralCounterEl.textContent =
        referralCount > 0
          ? t('profile.referralCount', { count: referralCount })
          : t('profile.noReferrals');
    } catch (error) {
      console.error('Ошибка обновления счётчика рефералов:', error);
      referralCounterEl.textContent = t('profile.noReferrals');
    }
  }

  async function checkCreateMailboxStatus() {
    try {
      const response = await fetch('/profile/get', {
        method: 'GET',
        credentials: 'include'
      });

      const data = await safeJson(response);

      if (!response.ok) {
        setGlobalMessage(data?.message || t('profile.mailAccessError'), 'error');
        if (response.status === 401) handleUnauthorized();
        return;
      }

      window.location.href = './onnmail/onnmail.html';
    } catch (error) {
      console.error('Ошибка проверки статуса:', error);
      setGlobalMessage(t('profile.statusCheckError'), 'error');
    }
  }

  async function updateProfile(payload) {
    try {
      const response = await fetch('/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await safeJson(response);

      if (!response.ok) {
        setGlobalMessage(data?.message || t('profile.saveFailed'), 'error');
        return;
      }

      setGlobalMessage(data?.message || t('profile.saveSuccess'), 'success');

      if (payload.username) {
        usernameField.textContent = payload.username;
      }
      if (payload.email) {
        emailField.textContent = payload.email;
      }
      updateAvatarDisplay(payload.username, payload.email, currentAvatarUrl);

      if (payload.username && referralLinkInput) {
        const url = `${getFrontendUrl('auth/auth.html')}?tab=register&ref=${encodeURIComponent(payload.username)}`;
        referralLinkInput.value = url;
      }

      isEditOpen = false;
      renderEditForm();
    } catch (error) {
      console.error('Ошибка обновления профиля:', error);
      setGlobalMessage(t('profile.updateError'), 'error');
    }
  }

  async function logout() {
    try {
      const response = await fetch('/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) {
        console.error('Logout failed:', response.status);
      }
    } catch (error) {
      console.error('Ошибка выхода:', error);
    } finally {
      localStorage.removeItem('serp_tools_recent');
      window.location.assign(getFrontendPath('main.html'));
    }
  }

  /* ==== ОБРАБОТЧИКИ UI ==== */

  openEditProfileBtn.addEventListener('click', () => {
    isEditOpen = !isEditOpen;
    renderEditForm();
  });

  let pointsHistoryLoaded = false;

  const proExchangeDaysInput = document.getElementById('proExchangeDays');
  const proExchangeSubmit = document.getElementById('proExchangeSubmit');
  const proExchangeHint = document.getElementById('proExchangeHint');

  if (proExchangeDaysInput && proExchangeSubmit) {
    proExchangeSubmit.addEventListener('click', async () => {
      const raw = proExchangeDaysInput.value.trim();
      const days = parseInt(raw, 10);

      if (!Number.isFinite(days) || days <= 0) {
        setGlobalMessage(t('profile.invalidProDays'), 'error');
        return;
      }

      const POINTS_PER_PRO_DAY = 500;
      const needPoints = days * POINTS_PER_PRO_DAY;

      const ok = window.confirm(t('profile.exchangeConfirm', { points: needPoints, days }));
      if (!ok) return;

      try {
        const response = await fetch('/api/me/points/withdraw/pro', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ days })
        });

        const data = await safeJson(response);

        if (!response.ok) {
          setGlobalMessage(
            data?.message || t('profile.exchangeFailed'),
            'error'
          );
          return;
        }

        const dayWord = getDayWord(days);

        setGlobalMessage(
          data?.message || t('profile.proExtended', { days, word: dayWord }),
          'success'
        );

        loadPoints();
        getProfile();

        pointsHistoryLoaded = false;
        if (pointsHistoryEl) {
          pointsHistoryEl.innerHTML = '';
          pointsHistoryEl.style.display = 'none';
        }
      } catch (e) {
        console.error('Ошибка обмена баллов на Pro:', e);
        setGlobalMessage(t('profile.exchangeError'), 'error');
      }
    });
  }

  if (pointsBadgeEl && pointsHistoryEl) {
    pointsBadgeEl.style.cursor = 'pointer';
    pointsBadgeEl.title = t('profile.showPointsHistory');

    const togglePointsHistory = async (event) => {
      event.stopPropagation();

      if (!pointsHistoryLoaded) {
        const history = await loadPointsHistory();

        pointsHistoryEl.innerHTML = '';

        if (!history.length) {
          const empty = document.createElement('p');
          empty.className = 'points-history-empty';
          empty.textContent = t('profile.noPointsHistory');
          pointsHistoryEl.appendChild(empty);
        } else {
          const list = document.createElement('ul');
          list.className = 'points-history-list';

          history.forEach(item => {
            const li = document.createElement('li');
            li.className = 'points-history-item';

            const reason = mapPointsReason(item);
            const sign = item.amount > 0 ? '+' : '';
            const amountText = `${sign}${item.amount}`;

            const date = item.createdAt
              ? new Date(item.createdAt).toLocaleString(document.documentElement.lang || 'ru')
              : '';

            li.textContent = date
              ? `${amountText} — ${reason} (${date})`
              : `${amountText} — ${reason}`;

            list.appendChild(li);
          });

          pointsHistoryEl.appendChild(list);
        }

        pointsHistoryLoaded = true;
      }

      const isHidden =
        pointsHistoryEl.style.display === 'none' || pointsHistoryEl.style.display === '';
      pointsHistoryEl.style.display = isHidden ? 'block' : 'none';
    };

    pointsBadgeEl.addEventListener('click', togglePointsHistory);
    pointsBadgeEl.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        togglePointsHistory(event);
      }
    });
  }

  if (copyReferralLinkBtn && referralLinkInput) {
    copyReferralLinkBtn.addEventListener('click', async () => {
      const value = referralLinkInput.value.trim();
      if (!value) {
        setGlobalMessage(t('profile.referralNotReady'), 'error');
        return;
      }

      try {
        await navigator.clipboard.writeText(value);
        setGlobalMessage(t('profile.referralCopied'), 'success');
      } catch (e) {
        console.error('Ошибка копирования ссылки:', e);
        referralLinkInput.focus();
        referralLinkInput.select();
        setGlobalMessage(t('profile.referralCopyFallback'), 'error');
      }
    });
  }

  createOnnmailButton.addEventListener('click', () => {
    checkCreateMailboxStatus();
  });

  loginOnnmailButton.addEventListener('click', () => {
    window.location.href = 'https://serpmonn.ru/mail/';
  });

  if (avatarButton) {
    avatarButton.addEventListener('click', openAvatarModal);
  }

  logoutButton.addEventListener('click', () => {
    logout();
  });

  managePlanButton.addEventListener('click', () => {
    window.location.assign(getFrontendPath('tariffs/tariffs.html'));
  });

  /* ==== НЕДАВНИЕ ИНСТРУМЕНТЫ ==== */

  (function trackRecentTools() {
    const STORAGE_KEY = 'serp_tools_recent';
    const container = document.getElementById('recentTools');
    const tools = buildTools(t);
    const recent = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

    if (recent.length && container) {
      const wrap = document.createElement('div');
      wrap.className = 'recent-tools-inner';

      const title = document.createElement('p');
      title.className = 'recent-tools-title';
      title.textContent = t('profile.recentTools');
      wrap.appendChild(title);

      const ul = document.createElement('ul');
      recent.slice(0, 6).forEach((item) => {
        const neutral = normalizeToolHref(item.href || '');
        const tool = tools.find((tool) => tool.neutralHref === neutral);
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = safeFrontendHref(tool ? tool.href : (neutral || item.href || '#'));
        a.textContent = tool ? tool.name : (item.title || neutral);
        li.appendChild(a);
        ul.appendChild(li);
      });
      wrap.appendChild(ul);
      container.appendChild(wrap);
    }

    function attachTracking(selector) {
      document.querySelectorAll(selector).forEach((a) => {
        a.addEventListener('click', () => {
          const neutral = normalizeToolHref(a.getAttribute('href') || '');
          if (!neutral.includes('/tools/')) return;

          const tool = tools.find((tool) => tool.neutralHref === neutral);
          const arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
          arr.unshift({
            href: neutral,
            title: tool ? tool.name : a.textContent.trim().slice(0, 80)
          });
          const unique = arr.filter(
            (v, i, self) => self.findIndex((x) => x.href === v.href) === i
          );
          localStorage.setItem(STORAGE_KEY, JSON.stringify(unique.slice(0, 10)));
        });
      });
    }

    attachTracking('.tools-grid a');
  })();

  document.addEventListener('click', (event) => {
    if (!pointsHistoryEl) return;

    const isClickOnBadge =
      pointsBadgeEl && pointsBadgeEl.contains(event.target);
    const isClickOnHistory =
      pointsHistoryEl && pointsHistoryEl.contains(event.target);

    if (!isClickOnBadge && !isClickOnHistory) {
      pointsHistoryEl.style.display = 'none';
    }
  });

  if (openAiServiceBtn) {
    openAiServiceBtn.addEventListener('click', () => {
      window.location.href = 'https://ai.serpmonn.ru';
    });
  }

  /* ==== МОИ НАХОДКИ ==== */

  let myFindingsCache = [];
  let myFindingsFilter = 'all';

  function initProfileTabs() {
    const tabButtons = document.querySelectorAll('[data-profile-tab]');
    const panels = document.querySelectorAll('[data-profile-panel]');
    if (!tabButtons.length || !panels.length) return;

    const TAB_KEY = 'profileActiveTab';
    const allowed = new Set(['profile', 'findings', 'plan', 'tools']);

    function activate(tabId) {
      if (!allowed.has(tabId)) tabId = 'profile';

      tabButtons.forEach((btn) => {
        const active = btn.dataset.profileTab === tabId;
        btn.classList.toggle('profile-tabs__btn--active', active);
        btn.setAttribute('aria-selected', active ? 'true' : 'false');
      });

      panels.forEach((panel) => {
        const show = panel.dataset.profilePanel === tabId;
        panel.hidden = !show;
        panel.classList.toggle('profile-panel--active', show);
      });

      try {
        localStorage.setItem(TAB_KEY, tabId);
      } catch {
        /* ignore */
      }
    }

    tabButtons.forEach((btn) => {
      btn.addEventListener('click', () => activate(btn.dataset.profileTab));
    });

    const hash = (location.hash || '').replace(/^#/, '');
    let saved = '';
    try {
      saved = localStorage.getItem(TAB_KEY) || '';
    } catch {
      saved = '';
    }
    activate(allowed.has(hash) ? hash : allowed.has(saved) ? saved : 'profile');
  }

  function updateFindingsSummary(items) {
    const summaryEl = document.getElementById('myFindingsSummary');
    if (!summaryEl) return;

    const total = items.length;
    const inFeed = items.filter((item) => item.visibility === 'public').length;
    const tpl =
      document.body.dataset.findingsSummaryTpl ||
      '{total} findings · {public} in feed';

    summaryEl.textContent = tpl
      .replace('{total}', String(total))
      .replace('{public}', String(inFeed));
  }

  function renderMyFindingsList(items, ft) {
    const listEl = document.getElementById('myFindingsList');
    const emptyEl = document.getElementById('myFindingsEmpty');
    if (!listEl) return;

    updateFindingsSummary(myFindingsCache);

    const filtered =
      myFindingsFilter === 'all'
        ? items
        : items.filter((item) => (item.visibility || 'private') === myFindingsFilter);

    if (!myFindingsCache.length) {
      listEl.innerHTML = '';
      if (emptyEl) emptyEl.hidden = false;
      return;
    }

    if (emptyEl) emptyEl.hidden = true;

    if (!filtered.length) {
      listEl.innerHTML = `<p class="profile-findings-filter-empty">${ft('noFindingsFilter')}</p>`;
      return;
    }

    listEl.innerHTML = filtered
      .map((item, index) =>
        renderFindingListCard(item, { mode: 'owner', t: ft, index, profileCompact: true })
      )
      .join('');
    bindOwnerFindingCards(listEl, ft);
  }

  function initFindingsFilters(ft) {
    document.querySelectorAll('[data-findings-filter]').forEach((btn) => {
      btn.addEventListener('click', () => {
        myFindingsFilter = btn.dataset.findingsFilter || 'all';
        document.querySelectorAll('[data-findings-filter]').forEach((other) => {
          other.classList.toggle(
            'profile-filter-btn--active',
            other.dataset.findingsFilter === myFindingsFilter
          );
        });
        renderMyFindingsList(myFindingsCache, ft);
      });
    });
  }

  function bindOwnerFindingCards(listEl, ft) {
    listEl.querySelectorAll('.finding-list-card--owner').forEach((card) => {
      const publicId = card.dataset.publicId;

      card.addEventListener('click', (event) => {
        if (event.target.closest('button, select')) return;
        openFindingModal(publicId);
      });
      card.classList.add('finding-list-card--clickable');

      const visSelect = card.querySelector('[data-action="visibility"]');
      if (visSelect) {
        let previousVis = visSelect.value;
        visSelect.addEventListener('click', (event) => event.stopPropagation());
        visSelect.addEventListener('change', async () => {
          const nextVis = visSelect.value;
          if (nextVis === previousVis) return;

          const confirmKeys = {
            private: 'makePrivateConfirm',
            followers: 'followersConfirm',
            public: 'publishConfirm',
          };
          const label = card.dataset.query || ft('pageTitle');
          const confirmed = window.confirm(ft(confirmKeys[nextVis], { query: label }));
          if (!confirmed) {
            visSelect.value = previousVis;
            return;
          }

          visSelect.disabled = true;
          const { ok } = await apiPatch(
            `/api/findings/${encodeURIComponent(publicId)}`,
            { visibility: nextVis }
          );
          visSelect.disabled = false;
          if (!ok) {
            visSelect.value = previousVis;
            showToast(ft('visibilityFailed'));
            return;
          }

          previousVis = nextVis;
          card.dataset.visibility = nextVis;
          const toastKeys = {
            private: 'madePrivateToast',
            followers: 'followersToast',
            public: 'publishedToast',
          };
          showToast(ft(toastKeys[nextVis]));
        });
      }

      card.querySelector('[data-action="delete"]')?.addEventListener('click', async (event) => {
        event.stopPropagation();
        const deleteBtn = event.currentTarget;
        const label = card.dataset.query || ft('pageTitle');
        const confirmed = window.confirm(ft('deleteConfirm', { query: label }));
        if (!confirmed) return;

        deleteBtn.disabled = true;
        const { ok } = await apiDelete(`/api/findings/${encodeURIComponent(publicId)}`);
        if (ok) {
          card.remove();
          showToast(ft('deletedToast'));
          myFindingsCache = myFindingsCache.filter((item) => {
            const id = item.publicId || item.public_id;
            return id !== publicId;
          });
          if (!myFindingsCache.length) {
            renderMyFindingsList([], ft);
          } else {
            renderMyFindingsList(myFindingsCache, ft);
          }
        } else {
          deleteBtn.disabled = false;
          showToast(ft('deleteFailed'));
        }
      });
    });
  }

  async function loadMyFindings() {
    const listEl = document.getElementById('myFindingsList');
    const loadingEl = document.getElementById('myFindingsLoading');
    if (!listEl) return;

    await loadFindingT();
    const ft = (key, vars) => getFindingT(`finding.${key}`, vars);
    initFindingsFilters(ft);

    const { ok, data, status } = await apiGet('/api/findings/mine/list');
    if (loadingEl) loadingEl.remove();

    if (!ok) {
      const msg = status === 401 ? ft('loginRequired') : ft('loadFailed');
      listEl.innerHTML = `<p class="plan-hint">${msg}</p>`;
      return;
    }

    myFindingsCache = data.items || [];
    renderMyFindingsList(myFindingsCache, ft);
  }

  /* ==== ИНИЦИАЛИЗАЦИЯ ==== */

  initProfileTabs();
  getProfile();
  loadPoints();
  renderFavoriteTools();
  updateReferralCounter();
  loadMyFindings();
});
