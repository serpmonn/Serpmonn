import { generateCombinedBackground } from '../scripts/backgroundGenerator.js';
import { getPageT } from '../scripts/i18n-loader.js';

// Карта всех доступных инструментов (имя должно совпадать с data-tool-name в tools.html)
const ALL_TOOLS = [
  {
    name: '🔗 Генератор UTM‑меток',
    href: '/frontend/tools/marketing/utm-builder.html',
    icon: '🔗'
  },
  {
    name: '📝 Счётчик слов/символов',
    href: '/frontend/tools/marketing/word-counter.html',
    icon: '📝'
  },
  {
    name: '🔑 Генератор паролей',
    href: '/frontend/tools/security/password-generator.html',
    icon: '🔑'
  },
  {
    name: '🔄 Конвертер единиц измерения',
    href: '/frontend/tools/engineering/unit-converter.html',
    icon: '🔄'
  },
  {
    name: '🔧 Калькулятор амортизации автомобиля',
    href: '/frontend/tools/logistics/depreciation-calculator.html',
    icon: '🔧'
  },
  {
    name: '⛽ Калькулятор топлива',
    href: '/frontend/tools/logistics/fuel-calculator.html',
    icon: '⛽'
  },
  {
    name: '🌍 Калькулятор экологического следа продуктов',
    href: '/frontend/tools/ecology/product-footprint-calculator.html',
    icon: '🌍'
  }
];

document.addEventListener('DOMContentLoaded', async () => {
  const t = await getPageT('profile');

  generateCombinedBackground();

  const pointsBalanceEl = document.getElementById('pointsBalance');
  const pointsHistoryEl = document.getElementById('pointsHistory');
  const pointsBadgeEl = document.getElementById('pointsBadge');
  const usernameField = document.getElementById('username');
  const emailField = document.getElementById('email');
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
  const referralHint = document.getElementById('referralHint');

  let isEditOpen = false;

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

    if (last === 1 && lastTwo !== 11) return 'день';
    if (last >= 2 && last <= 4 && (lastTwo < 10 || lastTwo >= 20)) return 'дня';
    return 'дней';
  }

  function setBadge(el, typeClass, text) {
    el.className = 'status-badge ' + typeClass;
    el.textContent = text;
  }

  function updateAvatarInitials(name, email) {
    const source = (name || email || '').trim();
    if (!source) {
      avatarInitials.textContent = 'U';
      return;
    }
    avatarInitials.textContent = source[0].toUpperCase();
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
    window.location.href = '../login/login.html';
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

    let favorites = [];
    try {
      const stored = localStorage.getItem('favorites');
      if (stored && typeof stored === 'string') {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) favorites = parsed;
      }
    } catch (e) {
      favorites = [];
    }

    const favoriteTools = ALL_TOOLS.filter(tool => favorites.includes(tool.name));

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
      a.href = tool.href;
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
      usernameField.textContent && usernameField.textContent !== 'Без имени'
        ? usernameField.textContent
        : '';
    const emailValue =
      emailField.textContent && emailField.textContent !== '—'
        ? emailField.textContent
        : '';

    editProfileMount.innerHTML = `
    <section class="edit-inline" aria-label="${t('profile.editSectionLabel')}">
      <form id="profileForm" class="form-card form-card--inline" novalidate>
        <div class="form-field form-field--inline">
          <label for="newUsername">${t('profile.labelName')}</label>
          <input type="text"
              id="newUsername"
              name="newUsername"
              maxlength="255"
              placeholder="${t('profile.namePlaceholder')}"
              value="${usernameValue}">
        </div>

        <div class="form-field form-field--inline">
          <label for="newEmail">${t('profile.labelEmail')}</label>
          <input type="email"
              id="newEmail"
              name="newEmail"
              placeholder="${t('profile.emailPlaceholder')}"
              value="${emailValue}">
        </div>

        <div class="form-actions form-actions--inline">
          <button type="submit" class="primary-button primary-button--inline">
            ${t('profile.save')}
          </button>
          <button type="button" id="cancelEditProfile" class="secondary-button secondary-button--inline">
            ${t('profile.cancel')}
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
    a.href = '/frontend/tariffs/tariffs.html';
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
      updateAvatarInitials(username, email);

      if (referralLinkInput) {
        if (username) {
          const baseUrl = 'https://serpmonn.ru/frontend/register/register.html';
          const url = `${baseUrl}?ref=${encodeURIComponent(username)}`;
          referralLinkInput.value = url;

          if (referralHint) {
            referralHint.textContent = t('profile.referralHint');
          }
        } else {
          referralLinkInput.value = '';
          if (referralHint) {
            referralHint.textContent = t('profile.referralHintNoName');
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
          ? new Date(data.pro_until).toLocaleDateString('ru-RU')
          : '';
        planStatusEl.textContent = until
          ? t('profile.proActiveUntil', { date: until })
          : t('profile.proActiveNoDate');
      } else {
        if (isPro && !isProActive) {
          planStatusEl.textContent = t('profile.proExpiredStatus');
        } else {
          planStatusEl.textContent = t('profile.freeStatus');
        }
      }

      if (currentPlan === 'pro' && data.quotas && data.quotas.pro_monthly) {
        const q = data.quotas.pro_monthly;

        planQuotaCounterEl.textContent = `${q.remaining}`;

        planQuotaHintEl.textContent =
          q.used === 0
            ? t('profile.proQuotaUnused')
            : t('profile.proQuotaUsed', { used: q.used });

        updatePlanQuotaBar(q.used, q.limit);
      } else if (currentPlan === 'free' && data.quotas && data.quotas.free_daily) {
        const q = data.quotas.free_daily;
        planQuotaCounterEl.textContent = `${q.used ?? 0} / ${q.limit}`;
        planQuotaHintEl.textContent = t('profile.freeQuotaHint');
        updatePlanQuotaBar(q.used ?? 0, q.limit);
      } else {
        if (currentPlan === 'pro') {
          planQuotaCounterEl.textContent = '—';
          planQuotaHintEl.textContent = t('profile.proQuotaUnavailable');
          updatePlanQuotaBar(0, 100);
        } else {
          planQuotaCounterEl.textContent = '0 / 15';
          planQuotaHintEl.textContent = t('profile.freeQuotaDefault');
          updatePlanQuotaBar(0, 15);
        }
      }

      // Fix: используем createElement + append вместо innerHTML для ссылок в planHintEl
      planHintEl.textContent = '';
      if (currentPlan === 'pro') {
        planHintEl.append(
          t('profile.proHintPrefix'),
          makeTariffsLink(t('profile.tariffsPage')),
          '.'
        );
      } else {
        if (isPro && !isProActive) {
          planHintEl.append(
            t('profile.freeAfterProHint'),
            makeTariffsLink(t('profile.tariffsPage')),
            '.'
          );
        } else {
          planHintEl.append(
            t('profile.freeHint'),
            makeTariffsLink(t('profile.tariffsPageFree')),
            '.'
          );
        }
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
      updateAvatarInitials(payload.username, payload.email);

      if (payload.username && referralLinkInput) {
        const baseUrl = 'https://serpmonn.ru/frontend/register/register.html';
        const url = `${baseUrl}?ref=${encodeURIComponent(payload.username)}`;
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
      await fetch('/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Ошибка выхода:', error);
    } finally {
      localStorage.removeItem('serp_tools_recent');
      window.location.href = '/';
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

    pointsBadgeEl.addEventListener('click', async (event) => {
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
              ? new Date(item.createdAt).toLocaleString('ru-RU')
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

  logoutButton.addEventListener('click', () => {
    logout();
  });

  managePlanButton.addEventListener('click', () => {
    window.location.href = '/frontend/tariffs/tariffs.html';
  });

  /* ==== НЕДАВНИЕ ИНСТРУМЕНТЫ ==== */

  (function trackRecentTools() {
    const STORAGE_KEY = 'serp_tools_recent';
    const container = document.getElementById('recentTools');
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
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = item.href;
        a.textContent = item.title;
        li.appendChild(a);
        ul.appendChild(li);
      });
      wrap.appendChild(ul);
      container.appendChild(wrap);
    }

    function attachTracking(selector) {
      document.querySelectorAll(selector).forEach((a) => {
        a.addEventListener('click', () => {
          const arr = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
          arr.unshift({
            title: a.textContent.trim().slice(0, 80),
            href: a.getAttribute('href')
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

  /* ==== ИНИЦИАЛИЗАЦИЯ ==== */

  getProfile();
  loadPoints();
  renderFavoriteTools();
  updateReferralCounter();
});
