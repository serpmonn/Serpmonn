import { generateCombinedBackground } from '../scripts/backgroundGenerator.js';

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

document.addEventListener('DOMContentLoaded', () => {
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
    closeBtn.setAttribute('aria-label', 'Закрыть уведомление');
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
    <section class="edit-inline" aria-label="Редактирование данных">
      <form id="profileForm" class="form-card form-card--inline" novalidate>
        <div class="form-field form-field--inline">
          <label for="newUsername">Имя</label>
          <input type="text"
              id="newUsername"
              name="newUsername"
              maxlength="255"
              placeholder="Введите новое имя"
              value="${usernameValue}">
        </div>

        <div class="form-field form-field--inline">
          <label for="newEmail">Email</label>
          <input type="email"
              id="newEmail"
              name="newEmail"
              placeholder="Введите новый email"
              value="${emailValue}">
        </div>

        <div class="form-actions form-actions--inline">
          <button type="submit" class="primary-button primary-button--inline">
            Сохранить
          </button>
          <button type="button" id="cancelEditProfile" class="secondary-button secondary-button--inline">
            Отмена
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
        setGlobalMessage('Нет изменений для сохранения.', 'error');
        return;
      }

      if (payload.email && !payload.email.includes('@')) {
        newEmailError.textContent = 'Введите корректный email.';
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
        setGlobalMessage(data?.message || 'Не удалось загрузить профиль.', 'error');
        if (response.status === 401) handleUnauthorized();
        return;
      }

      const username = data.username || '';
      const email = data.email || '';

      usernameField.textContent = username || 'Без имени';
      emailField.textContent = email || '—';
      updateAvatarInitials(username, email);

      if (referralLinkInput) {
        if (username) {
          const baseUrl = 'https://serpmonn.ru/frontend/register/register.html';
          const url = `${baseUrl}?ref=${encodeURIComponent(username)}`;
          referralLinkInput.value = url;

          if (referralHint) {
            referralHint.textContent =
              'Скопируйте ссылку и отправьте другу. За регистрацию по ней вы оба получите бонусные баллы.';
          }
        } else {
          referralLinkInput.value = '';
          if (referralHint) {
            referralHint.textContent =
              'Чтобы получить реферальную ссылку, укажите имя в профиле.';
          }
        }
      }

      if (!data.confirmed) {
        setBadge(accountStatusBadge, 'status-badge--unconfirmed', 'Email не подтверждён');
      } else {
        setBadge(accountStatusBadge, 'status-badge--ok', 'Аккаунт подтверждён');
      }

      const plan = data.plan || 'free';
      const isPro = plan === 'pro';
      const isProActive = !!data.is_pro_active;

      const isCurrentPro = isPro && isProActive;
      const currentPlan = isCurrentPro ? 'pro' : 'free';

      if (currentPlan === 'pro') {
        planNameEl.textContent = 'Pro';
        setBadge(planBadge, 'status-badge--pro', 'Pro активен');
      } else {
        planNameEl.textContent = 'Free';

        if (isPro && !isProActive) {
          setBadge(planBadge, 'status-badge--pro-expired', 'Pro истёк, активен Free');
        } else {
          setBadge(planBadge, 'status-badge--free', 'Free');
        }
      }

      if (currentPlan === 'pro') {
        const until = data.pro_until
          ? new Date(data.pro_until).toLocaleDateString('ru-RU')
          : '';
        planStatusEl.textContent = until
          ? `Подписка Pro активна до ${until}.`
          : 'Подписка Pro активна.';
      } else {
        if (isPro && !isProActive) {
          planStatusEl.textContent =
            'Ранее вы использовали тариф Pro, но срок его действия закончился. Сейчас действует бесплатный тариф Free.';
        } else {
          planStatusEl.textContent =
            'Сейчас действует бесплатный тариф Free с ограничением по числу запросов.';
        }
      }

      if (currentPlan === 'pro' && data.quotas && data.quotas.pro_monthly) {
        const q = data.quotas.pro_monthly;

        planQuotaCounterEl.textContent = `${q.remaining}`;

        planQuotaHintEl.textContent =
          q.used === 0
            ? 'Подписка Pro активна, вы ещё не использовали запросы по Pro.'
            : `Вы уже использовали ${q.used} запросов по Pro.`;

        updatePlanQuotaBar(q.used, q.limit);
      } else if (currentPlan === 'free' && data.quotas && data.quotas.free_daily) {
        const q = data.quotas.free_daily;
        planQuotaCounterEl.textContent = `${q.used ?? 0} / ${q.limit}`;
        planQuotaHintEl.textContent = 'Счётчик обновляется ежедневно.';
        updatePlanQuotaBar(q.used ?? 0, q.limit);
      } else {
        if (currentPlan === 'pro') {
          planQuotaCounterEl.textContent = '—';
          planQuotaHintEl.textContent = 'Подписка Pro активна. Информация об оставшихся запросах временно недоступна.';
          updatePlanQuotaBar(0, 100);
        } else {
          planQuotaCounterEl.textContent = '0 / 15';
          planQuotaHintEl.textContent =
            'Для авторизованных пользователей доступно до 15 запросов в день.';
          updatePlanQuotaBar(0, 15);
        }
      }

      // Fix: используем createElement + append вместо innerHTML для ссылок в planHintEl
      planHintEl.textContent = '';
      if (currentPlan === 'pro') {
        planHintEl.append(
          'После окончания срока вы автоматически перейдёте на бесплатный тариф Free. Подробнее — на ',
          makeTariffsLink('странице тарифов'),
          '.'
        );
      } else {
        if (isPro && !isProActive) {
          planHintEl.append(
            'Вы сейчас на бесплатном тарифе Free. Ранее вы использовали Pro — подробнее о продлении на ',
            makeTariffsLink('странице тарифов'),
            '.'
          );
        } else {
          planHintEl.append(
            'Вы используете бесплатный тариф Free. Подробнее о возможностях Pro — ',
            makeTariffsLink('на странице тарифов'),
            '.'
          );
        }
      }

      if (aiAccessBlock && aiAccessHint) {
        if (currentPlan === 'pro') {
          aiAccessBlock.style.display = 'block';
          aiAccessHint.textContent = 'У вас активен тариф Pro. Нажмите, чтобы открыть AI-сервис.';
        } else {
          aiAccessBlock.style.display = 'none';
        }
      }

    } catch (error) {
      console.error('Ошибка получения профиля:', error);
      setGlobalMessage('Ошибка загрузки данных профиля. Попробуйте снова.', 'error');
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
        return 'Бонус за регистрацию';

      case 'registration_backfill':
        return 'Бонус за подтверждение';

      case 'registration':
        if (item.meta?.via === 'telegram') return 'Подтверждение через Telegram';
        if (item.meta?.via === 'email') return 'Подтверждение email';
        return 'Подтверждение аккаунта';

      case 'invite_basic':
        return 'Бонус за приглашение друга';
      case 'invite_qualified':
        return 'Бонус за активного друга';

      case 'referral_referrer':
        return 'Бонус за приглашённого друга (старый тариф)';

      case 'referral_referee':
        return 'Бонус за регистрацию по приглашению';

      case 'withdraw_request':
        if (item.meta?.via === 'pro_exchange') {
          return 'Обмен баллов на дни Pro';
        }
        return 'Заявка на вывод баллов';

      case 'withdraw_paid':
        if (item.meta?.via === 'pro_exchange') {
          return 'Подписка Pro активирована за баллы';
        }
        return 'Выплата по заявке на вывод';

      case 'withdraw_rollback':
        return 'Возврат баллов за отменённый вывод';

      case 'admin_adjust':
      case 'manual':
        return 'Ручная операция с баллами';

      default:
        return 'Операция с баллами';
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
          ? `Приглашено друзей: ${referralCount}`
          : 'Вы ещё не приглашали друзей.';
    } catch (error) {
      console.error('Ошибка обновления счётчика рефералов:', error);
      referralCounterEl.textContent = 'Вы ещё не приглашали друзей.';
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
        setGlobalMessage(data?.message || 'Ошибка доступа к почте.', 'error');
        if (response.status === 401) handleUnauthorized();
        return;
      }

      window.location.href = './onnmail/onnmail.html';
    } catch (error) {
      console.error('Ошибка проверки статуса:', error);
      setGlobalMessage('Ошибка проверки статуса. Попробуйте снова.', 'error');
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
        setGlobalMessage(data?.message || 'Не удалось сохранить изменения.', 'error');
        return;
      }

      setGlobalMessage(data?.message || 'Данные профиля обновлены.', 'success');

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
      setGlobalMessage('Произошла ошибка при обновлении данных.', 'error');
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
        setGlobalMessage('Введите корректное количество дней Pro.', 'error');
        return;
      }

      const POINTS_PER_PRO_DAY = 500;
      const needPoints = days * POINTS_PER_PRO_DAY;

      const ok = window.confirm(
        `Вы хотите обменять ${needPoints} баллов на ${days} дней Pro?\n` +
        'Баллы будут списаны, а срок действия Pro увеличится.'
      );
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
            data?.message || 'Не удалось обменять баллы на Pro.',
            'error'
          );
          return;
        }

        const dayWord = getDayWord(days);

        setGlobalMessage(
          data?.message || `Подписка Pro продлена на ${days} ${dayWord}.`,
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
        setGlobalMessage('Ошибка обмена баллов. Попробуйте позже.', 'error');
      }
    });
  }

  if (pointsBadgeEl && pointsHistoryEl) {
    pointsBadgeEl.style.cursor = 'pointer';
    pointsBadgeEl.title = 'Показать историю баллов';

    pointsBadgeEl.addEventListener('click', async (event) => {
      event.stopPropagation();

      if (!pointsHistoryLoaded) {
        const history = await loadPointsHistory();

        pointsHistoryEl.innerHTML = '';

        if (!history.length) {
          const empty = document.createElement('p');
          empty.className = 'points-history-empty';
          empty.textContent = 'Пока нет операций с баллами.';
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
        setGlobalMessage('Реферальная ссылка ещё не сгенерирована.', 'error');
        return;
      }

      try {
        await navigator.clipboard.writeText(value);
        setGlobalMessage('Реферальная ссылка скопирована в буфер обмена.', 'success');
      } catch (e) {
        console.error('Ошибка копирования ссылки:', e);
        referralLinkInput.focus();
        referralLinkInput.select();
        setGlobalMessage('Ссылка выделена, нажмите Ctrl+C для копирования.', 'error');
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
      title.textContent = 'Недавно использованные инструменты';
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
