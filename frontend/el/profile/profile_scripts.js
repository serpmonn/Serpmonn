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
  const globalMessage = document.getElementById('globalMessage');

  const openEditProfileBtn = document.getElementById('openEditProfile');
  const editProfileMount = document.getElementById('editProfileMount');

  const createOnnmailButton = document.getElementById('createOnnmailButton');
  const loginOnnmailButton = document.getElementById('loginOnnmailButton');
  const logoutButton = document.getElementById('logoutButton');
  const managePlanButton = document.getElementById('managePlanButton');

  const favoriteContainer = document.getElementById('favoriteTools');
  const noFavoritesMessage = document.getElementById('noFavoritesMessage');

  let isEditOpen = false;

  /* ==== УТИЛИТЫ ==== */

  function setGlobalMessage(text, type = '') {
    globalMessage.textContent = text || '';
    globalMessage.classList.remove('success', 'error');
    if (type) globalMessage.classList.add(type);
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

    favoriteContainer.innerHTML = favoriteTools.map(tool => `
        <a class="tool-link" href="${tool.href}">
            <span class="tool-text">${tool.name}</span>
        </a>
    `).join('');
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
        planQuotaCounterEl.textContent = `${q.used} / ${q.limit}`;
        planQuotaHintEl.textContent = `Осталось ${q.remaining} запросов в этом месяце (${q.month_key}).`;
        updatePlanQuotaBar(q.used, q.limit);
      } else if (currentPlan === 'free' && data.quotas && data.quotas.free_daily) {
        const q = data.quotas.free_daily;
        planQuotaCounterEl.textContent = `${q.used ?? 0} / ${q.limit}`;
        planQuotaHintEl.textContent = 'Счётчик обновляется ежедневно.';
        updatePlanQuotaBar(q.used ?? 0, q.limit);
      } else {
        if (currentPlan === 'pro') {
          planQuotaCounterEl.textContent = '—';
          planQuotaHintEl.textContent = 'Месячный лимит Pro: до 2000 запросов.';
          updatePlanQuotaBar(0, 2000);
        } else {
          planQuotaCounterEl.textContent = '0 / 15';
          planQuotaHintEl.textContent =
            'Для авторизованных пользователей доступно до 15 запросов в день.';
          updatePlanQuotaBar(0, 15);
        }
      }

      if (currentPlan === 'pro') {
        planHintEl.innerHTML =
          'После окончания срока вы автоматически перейдёте на бесплатный тариф Free. ' +
          'Подробнее — на <a href="/frontend/tariffs/tariffs.html">странице тарифов</a>.';
      } else {
        if (isPro && !isProActive) {
          planHintEl.innerHTML =
            'Вы сейчас на бесплатном тарифе Free. Ранее вы использовали Pro — ' +
            'подробнее о продлении на <a href="/frontend/tariffs/tariffs.html">странице тарифов</a>.';
        } else {
          planHintEl.innerHTML =
            'Вы используете бесплатный тариф Free. Подробнее о возможностях Pro — ' +
            '<a href="/frontend/tariffs/tariffs.html">на странице тарифов</a>.';
        }
      }
    } catch (error) {
      console.error('Ошибка получения профиля:', error);
      setGlobalMessage('Ошибка загрузки данных профиля. Попробуйте снова.', 'error');
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

    // В профиле есть .tools-grid с "Моими инструментами" — трекаем и их
    attachTracking('.tools-grid a');
  })();

  /* ==== ИНИЦИАЛИЗАЦИЯ ==== */

  getProfile();
  renderFavoriteTools();
});