window.__SPN_ANDROID_APP__ = true;
document.documentElement.classList.add('android-app');
document.body?.classList.add('android-app');

const SPN_APP_ORIGIN = 'https://serpmonn.ru';
function isSerpmonnHost(hostname) {
  const h = String(hostname || '').toLowerCase();
  return h === 'serpmonn.ru' || h === 'www.serpmonn.ru' || h === 'dev.serpmonn.ru' || h.endsWith('.serpmonn.ru');
}
function spnApiUrl(path) {
  const p = String(path || '');
  if (/^https?:\/\//i.test(p)) return p;
  // On prod/dev host use same-origin so Dev APK auth/API isn't blocked by CORS
  try {
    if (isSerpmonnHost(location.hostname)) return p;
  } catch (_) {}
  return new URL(p, SPN_APP_ORIGIN).href;
}
function spnFetch(path, options) {
  return fetch(spnApiUrl(path), options);
}

const SPN_LOCALE_KEY = 'spn-app-locale';
const I18N = {
  ru: {
    brand: 'Серпмонн',
    search: 'Поиск',
    news: 'Новости',
    tools: 'Инструменты',
    games: 'Игры',
    profile: 'Профиль',
    askPlaceholder: 'Задайте вопрос…',
    find: 'Найти',
    attachLabel: 'Прикрепить .txt',
    attachTitle: 'Прикрепить текстовый файл',
    voiceLabel: 'Голосовой ввод',
    voiceTitle: 'Голосовой ввод',
    voiceRecording: 'Идёт запись… нажмите микрофон ещё раз, чтобы остановить',
    images: 'Картинки',
    videos: 'Видео',
    sources: 'Источники',
    newsSection: 'Раздел новостей',
    feed: 'Лента',
    kb: 'База знаний',
    newsEmpty: 'Пока нет новостей.',
    kbEmpty: 'Пока нет статей.',
    profileGuestTitle: 'Профиль',
    profileGuestText: 'Войдите через аккаунт Серпмонн, чтобы открыть план, баллы и находки.',
    loginRegister: 'Войти / регистрация',
    more: 'Ещё',
    policy: 'Политика',
    offer: 'Соглашение',
    donate: 'Поддержать проект',
    help: 'Помощь',
    helpBack: '← Настройки',
    helpIntro: 'Вопросы по аккаунту, приложению и сервису. Ответ придёт на указанный email.',
    helpFormTitle: 'Написать в поддержку',
    helpTopic: 'Тема',
    helpTopicBug: 'Ошибка / не работает',
    helpTopicAccount: 'Аккаунт / вход',
    helpTopicApp: 'Приложение',
    helpTopicOther: 'Другое',
    helpEmail: 'Email для ответа',
    helpMessage: 'Сообщение',
    helpMessagePh: 'Опишите проблему…',
    helpSend: 'Отправить',
    helpSending: 'Отправляем…',
    helpSent: 'Сообщение отправлено. Ответ придёт на указанный email.',
    helpSendFail: 'Не удалось отправить. Напишите на support@serpmonn.ru',
    helpFaqQ1: 'Как войти в аккаунт?',
    helpFaqA1: 'Откройте вкладку «Профиль» и нажмите «Войти / регистрация». Можно через Серпмонн Мессенджер, VK ID или email.',
    helpFaqQ2: 'Не открывается инструмент или игра',
    helpFaqA2: 'Проверьте интернет и обновите экран. Если не помогло — опишите, что именно не грузится, в форме ниже.',
    helpFaqQ3: 'Где база знаний и новости?',
    helpFaqA3: 'Вкладка «Новости»: лента и база знаний. Статьи открываются из списка.',
    helpFaqQ4: 'Это не донат?',
    helpFaqA4: 'Нет. «Помощь» — обращение в поддержку. «Поддержать проект» — добровольный донат.',
    about: 'О проекте',
    backProfile: '← Профиль',
    findingsFeed: 'Лента находок',
    findingsInbox: 'Сообщения',
    messages: 'Сообщения',
    logout: 'Выйти',
    sections: 'Разделы',
    section: 'Раздел',
    content: 'Контент',
    back: 'Назад',
    saveFinding: 'Сохранить находку',
    saveFindingHint: 'Находка появится в профиле во вкладке «Находки».',
    toProfile: 'В профиль',
    cancel: 'Отмена',
    copyAnswer: 'Копировать ответ',
    shareAnswer: 'Поделиться ответом',
    likeAnswer: 'Ответ помог',
    dislikeAnswer: 'Ответ не помог',
    searching: 'Ищем ответ…',
    generating: 'Генерируем ответ…',
    emptyAnswer: 'Пустой ответ. Попробуйте другой запрос.',
    searchFailed: 'Не удалось выполнить поиск.',
    model: 'Модель',
    loading: 'Загрузка…',
    loadError: 'Ошибка загрузки',
    newsItem: 'Новость',
    video: 'Видео',
    login: 'Вход',
    loggedIn: 'Вы вошли',
    noAnswerSave: 'Нет ответа для сохранения',
    findingSaved: 'Находка сохранена',
    findingSaveFail: 'Не удалось сохранить',
    noCopy: 'Нет текста для копирования',
    copied: 'Скопировано',
    copyFail: 'Не удалось скопировать',
    noText: 'Нет текста',
    shareCopied: 'Текст скопирован для отправки',
    shareFail: 'Не удалось поделиться',
    shareQuery: 'Запрос',
    fileQuery: 'Что в этом файле?',
    recognizing: 'Распознаём речь…',
    speaking: 'Говорите…',
    voiceError: 'Ошибка распознавания речи',
    recordError: 'Ошибка записи',
    favOn: 'В избранном профиля',
    favOff: 'Убрано из избранного',
    langGroup: 'Язык',
    settingsTitle: 'Настройки',
    languageLabel: 'Язык',
    settingsBack: '← Назад',
    pushLabel: 'Уведомления',
    pushEnable: 'Включить',
    pushOn: 'Включены',
    pushDenied: 'Разрешите уведомления в настройках телефона',
    pushNeedLogin: 'Сначала войдите в аккаунт',
    pushFailed: 'Не удалось включить уведомления',
  },
  en: {
    brand: 'Serpmonn',
    search: 'Search',
    news: 'News',
    tools: 'Tools',
    games: 'Games',
    profile: 'Profile',
    askPlaceholder: 'Ask a question…',
    find: 'Search',
    attachLabel: 'Attach .txt',
    attachTitle: 'Attach a text file',
    voiceLabel: 'Voice input',
    voiceTitle: 'Voice input',
    voiceRecording: 'Recording… tap the mic again to stop',
    images: 'Images',
    videos: 'Videos',
    sources: 'Sources',
    newsSection: 'News section',
    feed: 'Feed',
    kb: 'Knowledge base',
    newsEmpty: 'No news yet.',
    kbEmpty: 'No articles yet.',
    profileGuestTitle: 'Profile',
    profileGuestText: 'Sign in with your Serpmonn account to open plan, points and findings.',
    loginRegister: 'Sign in / register',
    more: 'More',
    policy: 'Privacy',
    offer: 'Terms',
    donate: 'Support the project',
    help: 'Help',
    helpBack: '← Settings',
    helpIntro: 'Questions about your account, the app, or the service. A reply will be sent to the email provided.',
    helpFormTitle: 'Contact support',
    helpTopic: 'Topic',
    helpTopicBug: 'Bug / something broken',
    helpTopicAccount: 'Account / sign-in',
    helpTopicApp: 'App',
    helpTopicOther: 'Other',
    helpEmail: 'Reply email',
    helpMessage: 'Message',
    helpMessagePh: 'Describe the issue…',
    helpSend: 'Send',
    helpSending: 'Sending…',
    helpSent: 'Message sent. A reply will be sent to the email provided.',
    helpSendFail: 'Couldn’t send. Email support@serpmonn.ru',
    helpFaqQ1: 'How do I sign in?',
    helpFaqA1: 'Open the Profile tab and tap Sign in / register. You can use Serpmonn Messenger, VK ID, or email.',
    helpFaqQ2: 'A tool or game won’t open',
    helpFaqA2: 'Check your connection and refresh. If it still fails, describe what doesn’t load in the form below.',
    helpFaqQ3: 'Where are the knowledge base and news?',
    helpFaqA3: 'News tab: feed and knowledge base. Articles open from the list.',
    helpFaqQ4: 'Is this a donation?',
    helpFaqA4: 'No. Help is customer support. “Support the project” is an optional donation.',
    about: 'About',
    backProfile: '← Profile',
    findingsFeed: 'Findings feed',
    findingsInbox: 'Messages',
    messages: 'Messages',
    logout: 'Log out',
    sections: 'Sections',
    section: 'Section',
    content: 'Content',
    back: 'Back',
    saveFinding: 'Save finding',
    saveFindingHint: 'The finding will appear in your profile under Findings.',
    toProfile: 'To profile',
    cancel: 'Cancel',
    copyAnswer: 'Copy answer',
    shareAnswer: 'Share answer',
    likeAnswer: 'Helpful',
    dislikeAnswer: 'Not helpful',
    searching: 'Searching…',
    generating: 'Generating answer…',
    emptyAnswer: 'Empty answer. Try another query.',
    searchFailed: 'Search failed.',
    model: 'Model',
    loading: 'Loading…',
    loadError: 'Failed to load',
    newsItem: 'News',
    video: 'Video',
    login: 'Sign in',
    loggedIn: 'Signed in',
    noAnswerSave: 'Nothing to save',
    findingSaved: 'Finding saved',
    findingSaveFail: 'Could not save',
    noCopy: 'Nothing to copy',
    copied: 'Copied',
    copyFail: 'Could not copy',
    noText: 'No text',
    shareCopied: 'Copied for sharing',
    shareFail: 'Could not share',
    shareQuery: 'Query',
    fileQuery: 'What is in this file?',
    recognizing: 'Recognizing speech…',
    speaking: 'Speak…',
    voiceError: 'Speech recognition error',
    recordError: 'Recording error',
    favOn: 'Saved to profile favorites',
    favOff: 'Removed from favorites',
    langGroup: 'Language',
    settingsTitle: 'Settings',
    languageLabel: 'Language',
    settingsBack: '← Back',
    pushLabel: 'Notifications',
    pushEnable: 'Enable',
    pushOn: 'On',
    pushDenied: 'Allow notifications in phone settings',
    pushNeedLogin: 'Sign in first',
    pushFailed: 'Could not enable notifications',
  },
};

function resolveInitialLocale() {
  try {
    if (window.__SPN_APP_LOCALE__ === 'en' || window.__SPN_APP_LOCALE__ === 'ru') {
      return window.__SPN_APP_LOCALE__;
    }
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'en' || q === 'ru') return q;
    const saved = localStorage.getItem(SPN_LOCALE_KEY);
    if (saved === 'en' || saved === 'ru') return saved;
    const nav = String(navigator.language || '').toLowerCase();
    return nav.startsWith('en') ? 'en' : 'ru';
  } catch (_) {
    return 'ru';
  }
}

let appLocale = resolveInitialLocale();

function getLocale() {
  return appLocale === 'en' ? 'en' : 'ru';
}

function t(key) {
  const pack = I18N[getLocale()] || I18N.ru;
  return pack[key] || I18N.ru[key] || key;
}

function getTitles() {
  return {
    feed: t('findingsFeed'),
    search: t('search'),
    inbox: t('findingsInbox'),
    news: t('news'),
    tools: t('tools'),
    games: t('games'),
    profile: t('profile'),
  };
}

/** Map /frontend/... <-> /frontend/en/... for app content paths. */
function localizeFrontendPath(input) {
  if (!input) return input;
  let raw = String(input);
  let hash = '';
  let search = '';
  try {
    const u = new URL(raw, location.origin);
    if (u.origin === location.origin) {
      raw = u.pathname;
      search = u.search || '';
      hash = u.hash || '';
    }
  } catch (_) {}

  let path = raw;
  if (!path.startsWith('/frontend/')) {
    return input;
  }
  // Keep the app shell itself on the RU path (single shell).
  if (/^\/frontend\/app(\/|$)/i.test(path)) {
    return path + search + hash;
  }

  const isEnPath = /^\/frontend\/en(\/|$)/i.test(path);
  if (getLocale() === 'en') {
    if (!isEnPath) path = path.replace(/^\/frontend\//i, '/frontend/en/');
  } else if (isEnPath) {
    path = path.replace(/^\/frontend\/en\//i, '/frontend/');
  }
  return path + search + hash;
}

function withLocalizedAppParam(url) {
  return withAppParam(localizeFrontendPath(url));
}

function setLocale(next, { persist = true, reloadContent = true } = {}) {
  const loc = next === 'en' ? 'en' : 'ru';
  if (loc === appLocale && document.documentElement.lang === loc) {
    applyChromeI18n();
    return;
  }
  appLocale = loc;
  window.__SPN_APP_LOCALE__ = loc;
  document.documentElement.lang = loc;
  if (persist) {
    try { localStorage.setItem(SPN_LOCALE_KEY, loc); } catch (_) {}
    // Profile / site i18n read this key (not spn-app-locale)
    try { localStorage.setItem('spn_lang', loc); } catch (_) {}
  }
  try {
    const u = new URL(location.href);
    u.searchParams.set('lang', loc);
    history.replaceState(null, '', u.pathname + u.search + u.hash);
  } catch (_) {}
  applyChromeI18n();
  if (reloadContent) {
    try { clearViewerHtmlCache(); } catch (_) {}
    newsLoaded = false;
    kbItemsCache = null;
    kbListLocale = null;
    kbIndexPromise = null;
    if (document.querySelector('.spn-screen.is-active[data-screen="news"]')) {
      if (newsChip === 'kb') loadKbList();
      else loadNews();
    }
    if (catalogLoaded) {
      renderCatalog();
      scheduleViewerPrefetchFromCatalog();
    }
    // Always invalidate profile iframe; reload immediately if user panel is open
    try {
      profileLocaleApplied = null;
      profileEmbedLoaded = false;
      if (typeof reloadProfileForLocale === 'function') {
        reloadProfileForLocale({ force: true });
      }
    } catch (err) {
      console.warn('profile locale reload failed', err);
    }
    try {
      if (typeof reloadAuthViewerForLocale === 'function') {
        reloadAuthViewerForLocale();
      }
    } catch (_) {}
  }
}

function applyChromeI18n() {
  const titles = getTitles();
  document.title = t('brand');

  tabs.forEach((tab) => {
    const name = tab.dataset.tab;
    if (titles[name]) {
      tab.setAttribute('aria-label', titles[name]);
      tab.title = titles[name];
    }
  });

  screens.forEach((s) => {
    const name = s.dataset.screen;
    if (titles[name]) s.setAttribute('aria-label', titles[name]);
  });

  const searchInputEl = document.getElementById('searchInput');
  if (searchInputEl && !searchInputEl.dataset.voiceBusy) {
    searchInputEl.placeholder = t('askPlaceholder');
  }
  const findBtn = document.querySelector('#searchForm .spn-btn');
  if (findBtn) findBtn.textContent = t('find');

  const attachBtn = document.getElementById('attachBtn');
  if (attachBtn) {
    attachBtn.setAttribute('aria-label', t('attachLabel'));
    attachBtn.title = t('attachTitle');
  }
  const voiceBtn = document.getElementById('voiceBtn');
  if (voiceBtn) {
    voiceBtn.setAttribute('aria-label', t('voiceLabel'));
    voiceBtn.title = t('voiceTitle');
  }
  const voiceStatus = document.getElementById('voiceStatus');
  if (voiceStatus && voiceStatus.hidden) voiceStatus.textContent = t('voiceRecording');

  const imgTitle = document.querySelector('#searchImages .spn-media__title');
  if (imgTitle) imgTitle.textContent = t('images');
  const vidTitle = document.querySelector('#searchVideos .spn-media__title');
  if (vidTitle) vidTitle.textContent = t('videos');
  const sourcesSummary = document.getElementById('searchSourcesSummary');
  if (sourcesSummary && !sourcesSummary.dataset.count) {
    sourcesSummary.textContent = t('sources');
  }

  const newsChipsWrap = document.querySelector('.spn-chips[aria-label]');
  if (newsChipsWrap) newsChipsWrap.setAttribute('aria-label', t('newsSection'));
  document.querySelectorAll('[data-news-chip]').forEach((chip) => {
    if (chip.dataset.newsChip === 'feed') chip.textContent = t('feed');
    if (chip.dataset.newsChip === 'kb') chip.textContent = t('kb');
  });
  const newsEmpty = document.getElementById('newsEmpty');
  if (newsEmpty) newsEmpty.textContent = t('newsEmpty');
  const kbEmpty = document.getElementById('kbEmpty');
  if (kbEmpty) kbEmpty.textContent = t('kbEmpty');

  const guestH2 = document.getElementById('profileScreenTitle');
  if (guestH2) guestH2.textContent = t('profileGuestTitle');
  const guestP = document.querySelector('#profileGuest > .spn-muted');
  if (guestP) guestP.textContent = t('profileGuestText');
  const loginBtn = document.querySelector('#profileGuest [data-open*="auth"]');
  if (loginBtn) loginBtn.textContent = t('loginRegister');

  const settingsTitleEl = document.getElementById('settingsPanelTitle');
  if (settingsTitleEl) settingsTitleEl.textContent = t('settingsTitle');
  const settingsLangLabel = document.getElementById('settingsLangLabel');
  if (settingsLangLabel) settingsLangLabel.textContent = t('languageLabel');
  const settingsOpenBtn = document.getElementById('settingsOpenBtn');
  if (settingsOpenBtn) {
    settingsOpenBtn.setAttribute('aria-label', t('settingsTitle'));
    settingsOpenBtn.title = t('settingsTitle');
  }
  const settingsBackBtn = document.getElementById('settingsBackBtn');
  if (settingsBackBtn) settingsBackBtn.textContent = t('settingsBack');
  const pushLabel = document.getElementById('spnPushLabel');
  if (pushLabel) pushLabel.textContent = t('pushLabel');
  try { syncPushSettingsUi(); } catch (_) {}

  document.querySelectorAll('[data-open*="privacy-policy"]').forEach((el) => { el.textContent = t('policy'); });
  document.querySelectorAll('[data-open*="offer"]').forEach((el) => { el.textContent = t('offer'); });
  document.querySelectorAll('[data-open*="donate"]').forEach((el) => { el.textContent = t('donate'); });
  document.querySelectorAll('[data-open*="about-project"]').forEach((el) => { el.textContent = t('about'); });
  const helpOpenBtn = document.getElementById('helpOpenBtn');
  if (helpOpenBtn) helpOpenBtn.textContent = t('help');
  const helpPanelTitle = document.getElementById('helpPanelTitle');
  if (helpPanelTitle) helpPanelTitle.textContent = t('help');
  const helpBackBtn = document.getElementById('helpBackBtn');
  if (helpBackBtn) helpBackBtn.textContent = t('helpBack');
  const helpIntro = document.getElementById('helpIntro');
  if (helpIntro) helpIntro.textContent = t('helpIntro');
  const helpFormTitle = document.getElementById('helpFormTitle');
  if (helpFormTitle) helpFormTitle.textContent = t('helpFormTitle');
  const helpTopicLabel = document.querySelector('label[for="helpTopic"]');
  if (helpTopicLabel) helpTopicLabel.textContent = t('helpTopic');
  const helpEmailLabel = document.querySelector('label[for="helpEmail"]');
  if (helpEmailLabel) helpEmailLabel.textContent = t('helpEmail');
  const helpMessageLabel = document.querySelector('label[for="helpMessage"]');
  if (helpMessageLabel) helpMessageLabel.textContent = t('helpMessage');
  const helpMessage = document.getElementById('helpMessage');
  if (helpMessage) helpMessage.placeholder = t('helpMessagePh');
  const helpSubmitBtn = document.getElementById('helpSubmitBtn');
  if (helpSubmitBtn && !helpSubmitBtn.disabled) helpSubmitBtn.textContent = t('helpSend');
  const helpTopic = document.getElementById('helpTopic');
  if (helpTopic) {
    const opts = {
      bug: t('helpTopicBug'),
      account: t('helpTopicAccount'),
      app: t('helpTopicApp'),
      other: t('helpTopicOther'),
    };
    [...helpTopic.options].forEach((o) => {
      if (opts[o.value]) o.textContent = opts[o.value];
    });
  }
  const faqMap = {
    q1: 'helpFaqQ1', a1: 'helpFaqA1',
    q2: 'helpFaqQ2', a2: 'helpFaqA2',
    q3: 'helpFaqQ3', a3: 'helpFaqA3',
    q4: 'helpFaqQ4', a4: 'helpFaqA4',
  };
  document.querySelectorAll('[data-help-faq]').forEach((el) => {
    const key = faqMap[el.getAttribute('data-help-faq')];
    if (key) el.textContent = t(key);
  });

  const profileBackBtn = document.getElementById('profileBackBtn');
  if (profileBackBtn) profileBackBtn.textContent = t('backProfile');
  const fullscreenBack = document.getElementById('fullscreenBack');
  if (fullscreenBack) fullscreenBack.textContent = t('backProfile');
  const logoutBtn = document.getElementById('settingsLogoutBtn');
  if (logoutBtn) logoutBtn.textContent = t('logout');

  const tabsNav = document.querySelector('.spn-tabs');
  if (tabsNav) tabsNav.setAttribute('aria-label', t('sections'));
  const tabLabelKeys = {
    feed: 'findingsFeed',
    search: 'search',
    inbox: 'findingsInbox',
    news: 'news',
    tools: 'tools',
    games: 'games',
    profile: 'profile',
  };
  document.querySelectorAll('.spn-tab').forEach((tab) => {
    const key = tabLabelKeys[tab.dataset.tab];
    if (!key) return;
    const label = t(key);
    tab.setAttribute('aria-label', label);
    tab.title = label;
  });
  const viewerBackBtn = document.getElementById('viewerBack');
  if (viewerBackBtn) {
    viewerBackBtn.setAttribute('aria-label', t('back'));
    viewerBackBtn.title = t('back');
  }
  const viewerFrameEl = document.getElementById('viewerFrame');
  if (viewerFrameEl) viewerFrameEl.title = t('content');
  const fullscreenFrameEl = document.getElementById('fullscreenFrame');
  if (fullscreenFrameEl) fullscreenFrameEl.title = t('section');
  const profileEmbedEl = document.getElementById('profileEmbed');
  if (profileEmbedEl) profileEmbedEl.title = t('profile');

  const findingTitle = document.getElementById('findingSaveTitle');
  if (findingTitle) findingTitle.textContent = t('saveFinding');
  const findingHint = document.querySelector('#findingSaveModal .spn-muted');
  if (findingHint) findingHint.textContent = t('saveFindingHint');
  const savePrivate = document.querySelector('[data-finding-action="save-private"]');
  if (savePrivate) savePrivate.textContent = t('toProfile');
  document.querySelectorAll('#findingSaveModal [data-finding-close].spn-btn').forEach((el) => {
    el.textContent = t('cancel');
  });

  document.querySelectorAll('#searchActions [data-ai-action]').forEach((btn) => {
    const action = btn.getAttribute('data-ai-action');
    const map = {
      copy: 'copyAnswer',
      share: 'shareAnswer',
      'save-finding': 'saveFinding',
      like: 'likeAnswer',
      dislike: 'dislikeAnswer',
    };
    const k = map[action];
    if (!k) return;
    btn.title = t(k);
    btn.setAttribute('aria-label', t(k));
  });

  document.querySelectorAll('.spn-lang__btn').forEach((btn) => {
    const on = btn.getAttribute('data-lang') === getLocale();
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  document.querySelectorAll('.spn-lang').forEach((langGroup) => {
    langGroup.setAttribute('aria-label', t('langGroup'));
  });
}

const screens = Array.from(document.querySelectorAll('.spn-screen'));
const tabs = Array.from(document.querySelectorAll('.spn-tab'));
/** @deprecated use getTitles() — kept for older call sites during migration */
const TITLES = new Proxy({}, {
  get(_t, prop) {
    return getTitles()[prop];
  },
});

const viewer = document.getElementById('viewer');
const viewerFrame = document.getElementById('viewerFrame');
const viewerTitle = document.getElementById('viewerTitle');
const viewerBack = document.getElementById('viewerBack');

let catalog = { tools: [], gamesOwn: [], gamesPartner: [], links: {} };
let newsLoaded = false;
let catalogLoaded = false;
let viewerIsGame = false;
let viewerGameTrapActive = false;

function withAppParam(url) {
  try {
    const u = new URL(url, location.origin);
    if (u.origin === location.origin) {
      u.searchParams.set('app', '1');
      return u.pathname + u.search + u.hash;
    }
    return u.href;
  } catch {
    return url;
  }
}

function isGameUrl(href) {
  try {
    const u = new URL(href, location.origin);
    return /\/frontend\/(?:[a-z0-9-]+\/)?games\//i.test(u.pathname);
  } catch {
    return /\/games\//i.test(String(href || ''));
  }
}

const VIEWER_HIDE_MENU_CSS = `
  #menuCorner, #menuContainer, #menuButton,
  .menu-corner, .menu-container, .menu-button,
  .menu-activity-bell, #activityBellBtn,
  #cookie-consent, .cookie-consent, #installAppButton,
  .mobile-anchor-ad, .ad-leaderboard, .ad-container, .ad-top-banner,
  .kb-subscribe__link[href*="rss.xml"],
  .kb-subscribe__link[href*="t.me"],
  a[href*="t.me"],
  a.tg-btn, .tg-btn,
  a.share-btn.telegram, .share-btn.telegram,
  button[onclick*="telegram"], button[onclick*="Telegram"],
  .rss-btn, .rss-section,
  #kb-sn-tg, #kb-sn-max, #kb-sn-ok {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }
  html, body {
    overscroll-behavior-x: none !important;
  }
  /* Инструменты: доп. воздух внизу скролла (основной запас — padding у .spn-viewer) */
  body.android-app.spn-tool,
  body.android-app.fuel-calculator-page,
  body.android-app.depreciation-calculator,
  body.android-app.product-calculator {
    padding-bottom: 28px !important;
    box-sizing: border-box !important;
  }
  /* Все 4 вкладки профиля в одну строку без горизонтального скролла */
  .profile-tabs {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    overflow: hidden !important;
    gap: 4px !important;
    margin: 0 !important;
    padding: 2px 0 4px !important;
  }
  .profile-tabs__btn {
    flex: none !important;
    width: auto !important;
    min-width: 0 !important;
    max-width: none !important;
    padding: 8px 4px !important;
    font-size: 11px !important;
    line-height: 1.2 !important;
    white-space: normal !important;
    text-align: center !important;
    border-radius: 8px !important;
  }
  /* RuStore: без денежной покупки Pro и без входа на ai.serpmonn.ru; обмен баллов на дни оставляем */
  #managePlanButton,
  #buy-pro-btn,
  .cta-row,
  #aiAccessBlock,
  #openAiService,
  a[href*="/tariffs/"],
  a[href*="ai.serpmonn.ru"] {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }
  /* Режим «Выдача» в RuStore-приложении ещё не подключён — шкалу квоты скрываем */
  .plan-quota--web,
  #webQuotaCounter,
  #webQuotaBarFill,
  #webQuotaHint {
    display: none !important;
    visibility: hidden !important;
    height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
    pointer-events: none !important;
  }
  .plan-quotas--dashboard {
    grid-template-columns: 1fr !important;
  }

  /* Выход — в шапке приложения, не внизу вкладки */
  .profile-panel-block--logout,
  #logoutButton {
    display: none !important;
    visibility: hidden !important;
    pointer-events: none !important;
  }
  /* История баллов — прокрутка внутри попапа */
  .points-history {
    max-height: min(280px, 45vh) !important;
    overflow-y: auto !important;
    -webkit-overflow-scrolling: touch !important;
    overscroll-behavior: contain !important;
  }
  /* Таблица лидеров — тёмная тема в WebView (как VK Mini App) */
  html.android-app:has(body.leaderboard-page),
  body.android-app.leaderboard-page {
    background: #0c0f14 !important;
    color: #e8edf4 !important;
  }
  body.android-app.leaderboard-page h1,
  body.android-app.leaderboard-page h2 {
    color: #e8edf4 !important;
  }

  /* Лента / входящие / профиль — единые отступы внутри белой рамки, без «попапа» */
  html, body {
    height: 100% !important;
    min-height: 100% !important;
    background: #f7f7f8 !important;
    /* Android WebView: жёлто-оранжевые квадраты при тапе */
    -webkit-tap-highlight-color: transparent !important;
  }
  /* Игры (кроме 2048): тёмный фон — иначе светлый текст на #f7f7f8 нечитаем */
  html.android-app:has(.wrap),
  html.android-app:has(.game-shell),
  html.android-app:has(.typing-wrap),
  html.android-app:has(.rat-game),
  html.android-app:has(body.rs-page),
  html.android-app:has(body.rs2-page),
  html.android-app:has(body.rat-page),
  body.android-app.rs-page,
  body.android-app.rs2-page,
  body.android-app.rat-page,
  body.android-app:has(.wrap),
  body.android-app:has(.game-shell),
  body.android-app:has(.typing-wrap),
  body.android-app:has(.rat-game) {
    background: #0e1116 !important;
    color: #e8eaed !important;
  }
  html.android-app:has(.wrap) h1,
  html.android-app:has(.game-shell) h1,
  html.android-app:has(.typing-wrap) h1,
  html.android-app:has(.rat-game) h1,
  body.android-app.rs-page h1,
  body.android-app.rs2-page h1,
  body.android-app.rat-page h1,
  body.android-app:has(.wrap) h1,
  body.android-app:has(.game-shell) h1 {
    color: #f3f0ea !important;
  }
  /* 2048 — светлая тема как на сайте */
  html.android-app:has(.game-board),
  body.android-app:has(.game-board) {
    background: #faf8ef !important;
    color: #3d3a36 !important;
  }
  html.android-app:has(.game-board) h1,
  body.android-app:has(.game-board) h1,
  body.android-app:has(.game-board) header h1 {
    color: #3d3a36 !important;
  }
  /* Тёмные игры: не давать button:hover (#f0f0f0) залипать после тапа */
  html.android-app:has(.wrap) .btn,
  html.android-app:has(.wrap) .btn:hover,
  html.android-app:has(.wrap) .btn:focus,
  html.android-app:has(.wrap) .btn:active,
  html.android-app:has(.wrap) button.btn,
  html.android-app:has(.wrap) button.btn:hover,
  html.android-app:has(.wrap) button.btn:focus,
  html.android-app:has(.wrap) button.btn:active,
  body.android-app:has(.wrap) .btn,
  body.android-app:has(.wrap) .btn:hover,
  body.android-app:has(.wrap) .btn:focus,
  body.android-app:has(.wrap) .btn:active {
    background: #16202a !important;
    border: 1px solid #243241 !important;
    color: #eee !important;
    outline: none !important;
    -webkit-tap-highlight-color: transparent !important;
  }
  html.android-app:has(.wrap) .btn.primary,
  html.android-app:has(.wrap) .btn.primary:hover,
  html.android-app:has(.wrap) .btn.primary:focus,
  html.android-app:has(.wrap) .btn.primary:active,
  html.android-app:has(.wrap) .primary.btn,
  html.android-app:has(.wrap) button.btn.primary,
  html.android-app:has(.wrap) button.primary,
  body.android-app:has(.wrap) .btn.primary,
  body.android-app:has(.wrap) .btn.primary:hover,
  body.android-app:has(.wrap) .btn.primary:focus,
  body.android-app:has(.wrap) .btn.primary:active,
  body.android-app:has(.wrap) button.primary {
    background: linear-gradient(90deg, #dc3545, #c82333) !important;
    border: none !important;
    color: #fff !important;
  }
  /* redsquare / redsquare2 action buttons */
  html.android-app:has(.game-shell) .action-start,
  html.android-app:has(.game-shell) .action-start:hover,
  html.android-app:has(.game-shell) .action-start:focus,
  html.android-app:has(.game-shell) .action-start:active,
  body.android-app:has(.game-shell) .action-start,
  body.android-app:has(.game-shell) .action-start:hover,
  body.android-app:has(.game-shell) .action-start:focus,
  body.android-app:has(.game-shell) .action-start:active {
    background: #f47059 !important;
    border-color: #ff9b88 !important;
    color: #fff !important;
  }
  html.android-app:has(.game-shell) .action-restart,
  html.android-app:has(.game-shell) .action-restart:hover,
  html.android-app:has(.game-shell) .action-restart:focus,
  html.android-app:has(.game-shell) .action-restart:active,
  body.android-app:has(.game-shell) .action-restart,
  body.android-app:has(.game-shell) .action-restart:hover,
  body.android-app:has(.game-shell) .action-restart:focus,
  body.android-app:has(.game-shell) .action-restart:active {
    background: #3dba7a !important;
    color: #fff !important;
  }
  html.android-app:has(.game-shell) .action-pause,
  html.android-app:has(.game-shell) .action-pause:hover,
  html.android-app:has(.game-shell) .action-pause:focus,
  html.android-app:has(.game-shell) .action-pause:active,
  body.android-app:has(.game-shell) .action-pause,
  body.android-app:has(.game-shell) .action-pause:hover,
  body.android-app:has(.game-shell) .action-pause:focus,
  body.android-app:has(.game-shell) .action-pause:active {
    background: #e0a24a !important;
    color: #1a1408 !important;
  }
  html.android-app:has(.game-shell) .action-sound,
  html.android-app:has(.game-shell) .action-sound:hover,
  html.android-app:has(.game-shell) .action-home,
  html.android-app:has(.game-shell) .action-home:hover,
  body.android-app:has(.game-shell) .action-sound,
  body.android-app:has(.game-shell) .action-sound:hover,
  body.android-app:has(.game-shell) .action-home,
  body.android-app:has(.game-shell) .action-home:hover {
    background: transparent !important;
    color: #f3f0ea !important;
    border-color: #35485f !important;
  }
  /* Брендовый canvas (#f47059) в оболочке выглядит как оранжевые пятна/квадраты */
  #serpmonn-bg-canvas {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }
  .page-wrapper {
    min-height: 100% !important;
    padding: 8px 10px 16px !important;
    background: #f7f7f8 !important;
    box-shadow: none !important;
    border: none !important;
  }
  .page-wrapper > .container,
  .page-wrapper .container {
    max-width: none !important;
    width: 100% !important;
    margin: 0 !important;
    margin-bottom: 0 !important;
    padding: 0 !important;
    background: transparent !important;
    box-shadow: none !important;
    border: none !important;
    border-radius: 0 !important;
    animation: none !important;
  }
  /* Лента/входящие: без лишней «карточки» поверх контейнера */
  .finding-inbox-card.card,
  .card.finding-inbox-card,
  section.card {
    box-shadow: none !important;
    border: none !important;
    border-radius: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    background: transparent !important;
    outline: none !important;
  }
  /* Карточки ленты/входящих — без оранжевой подсветки тапа/фокуса */
  * {
    -webkit-tap-highlight-color: transparent !important;
  }
  .finding-list-card,
  .finding-inbox-item,
  .finding-activity-event,
  .finding-list-card--clickable,
  .finding-feed-tab,
  .finding-activity-tab,
  button,
  a {
    -webkit-tap-highlight-color: transparent !important;
    outline: none !important;
  }
  .finding-list-card,
  .finding-inbox-item,
  .finding-activity-event {
    background: #fff !important;
    background-clip: padding-box !important;
    border: 1px solid #e5e7eb !important;
    box-shadow: none !important;
  }
  .finding-list-card:focus,
  .finding-list-card:focus-visible,
  .finding-list-card:active,
  .finding-list-card:hover,
  .finding-inbox-item:focus,
  .finding-inbox-item:focus-visible,
  .finding-inbox-item:active,
  .finding-inbox-item:hover {
    outline: none !important;
    box-shadow: none !important;
    border-color: #e5e7eb !important;
  }
  .finding-list-card--unread,
  .finding-inbox-item--unread {
    border-color: #e5e7eb !important;
    background: #fff !important;
  }
  /* Заголовок уже в шапке приложения / «← Профиль» */
  #findings-feed-title,
  #findings-inbox-title,
  .finding-inbox-card > h1 {
    display: none !important;
  }
  #findings-feed-hint:empty,
  #findings-inbox-hint:empty {
    display: none !important;
  }
  /* Панель ленты/входящих — inline в #findings-*-list, не fixed overlay */
  .finding-panel-modal--inline {
    position: static !important;
    inset: auto !important;
    display: block !important;
    z-index: auto !important;
    width: 100% !important;
    height: auto !important;
    align-items: stretch !important;
    justify-content: flex-start !important;
    background: transparent !important;
  }
  .finding-panel-modal--inline .ai-share-backdrop {
    display: none !important;
  }
  .finding-panel-modal--inline .finding-panel-close,
  .finding-panel-modal--inline .ai-share-close,
  .finding-panel-modal--inline .finding-activity-close {
    display: none !important;
  }
  .finding-panel-modal--inline .finding-panel-dialog,
  .finding-panel-modal--inline .ai-share-dialog {
    position: static !important;
    width: 100% !important;
    max-width: none !important;
    max-height: none !important;
    margin: 0 !important;
    border-radius: 0 !important;
    border: none !important;
    box-shadow: none !important;
    transform: none !important;
    opacity: 1 !important;
    padding: 0 !important;
    background: transparent !important;
    overflow: visible !important;
  }
  .finding-panel-modal--inline .finding-feed-toolbar,
  .finding-panel-modal--inline .finding-activity-toolbar,
  .finding-panel-modal--inline .finding-activity-header {
    margin-left: 0 !important;
    margin-right: 0 !important;
  }
  .finding-panel-modal--inline .finding-panel-title,
  .finding-panel-modal--inline .finding-activity-title {
    padding-right: 0 !important;
  }
  .finding-panel-modal--inline .finding-panel-body {
    max-height: none !important;
    overflow: visible !important;
    flex: none !important;
  }
  /* Лента в приложении: без дублирующего заголовка модалки */
  .finding-panel-modal--inline#finding-feed-modal .finding-panel-title {
    display: none !important;
  }
  /* Сообщения: только диалоги, без вкладки уведомлений */
  .finding-activity--messages-only [data-activity-tabs] {
    display: none !important;
  }
  .finding-activity--messages-only [data-activity-panel="notifications"] {
    display: none !important;
  }
  .finding-activity--messages-only [data-activity-intro] {
    display: none !important;
  }
`;

/** Только страница сообщений — не инжектить в профиль и остальные iframe */
const INBOX_APP_CSS = `
  html:has(#finding-activity-modal.finding-panel-modal--inline),
  body:has(#finding-activity-modal.finding-panel-modal--inline) {
    height: 100% !important;
    overflow: hidden !important;
  }
  body:has(#finding-activity-modal.finding-panel-modal--inline) .page-wrapper {
    height: 100% !important;
    min-height: 100% !important;
    padding: 0 !important;
    display: flex !important;
    flex-direction: column !important;
  }
  body:has(#finding-activity-modal.finding-panel-modal--inline) .page-wrapper > .container,
  body:has(#finding-activity-modal.finding-panel-modal--inline) .finding-inbox-card,
  body:has(#finding-activity-modal.finding-panel-modal--inline) #findings-inbox-list {
    flex: 1 1 auto !important;
    min-height: 0 !important;
    height: auto !important;
    display: flex !important;
    flex-direction: column !important;
  }
  .finding-panel-modal--inline#finding-activity-modal {
    flex: 1 1 auto !important;
    height: 100% !important;
    min-height: 0 !important;
    display: flex !important;
    flex-direction: column !important;
  }
  .finding-panel-modal--inline#finding-activity-modal .finding-activity-dialog {
    flex: 1 1 auto !important;
    min-height: 0 !important;
    height: 100% !important;
    max-height: none !important;
    display: flex !important;
    flex-direction: column !important;
    overflow: hidden !important;
  }
  .finding-panel-modal--inline#finding-activity-modal .finding-activity-header,
  .finding-panel-modal--inline#finding-activity-modal .finding-activity-toolbar,
  .finding-panel-modal--inline#finding-activity-modal .finding-dm-new-toolbar {
    flex-shrink: 0 !important;
  }
  .finding-panel-modal--inline#finding-activity-modal .finding-dm-panel {
    flex: 1 1 auto !important;
    min-height: 0 !important;
    display: flex !important;
    flex-direction: column !important;
  }
  .finding-panel-modal--inline#finding-activity-modal .finding-dm-body,
  .finding-panel-modal--inline#finding-activity-modal .finding-panel-body.finding-dm-body {
    flex: 1 1 auto !important;
    min-height: 0 !important;
    overflow-y: auto !important;
    -webkit-overflow-scrolling: touch !important;
  }
  .finding-panel-modal--inline#finding-activity-modal .finding-dm-thread {
    max-height: none !important;
    overflow: visible !important;
  }
  .finding-panel-modal--inline#finding-activity-modal .finding-dm-compose-wrap,
  .finding-panel-modal--inline#finding-activity-modal [data-inbox-compose-wrap] {
    flex-shrink: 0 !important;
    margin-top: auto !important;
    padding: 8px 10px 10px !important;
    background: #fff !important;
    border-top: 1px solid #e5e7eb !important;
  }
  .finding-panel-modal--inline#finding-activity-modal .finding-dm-compose {
    margin-top: 0 !important;
    padding-top: 0 !important;
    border-top: none !important;
  }
  .finding-panel-modal--inline#finding-activity-modal .finding-dm-compose__row {
    align-items: center !important;
  }
  .finding-panel-modal--inline#finding-activity-modal .finding-dm-compose__input {
    min-height: 44px !important;
    max-height: 120px !important;
    box-sizing: border-box !important;
    padding: 11px 12px !important;
    line-height: 20px !important;
    resize: none !important;
    overflow-y: auto !important;
    -webkit-appearance: none !important;
    appearance: none !important;
  }
  .finding-dm-photo {
    display: block;
    margin: 0 0 6px;
    border-radius: 10px;
    overflow: hidden;
    line-height: 0;
  }
  .finding-dm-photo img {
    display: block;
    width: 100%;
    max-width: 240px;
    max-height: 240px;
    object-fit: cover;
  }
  .finding-dm-compose__pending-thumb {
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 8px;
    object-fit: cover;
  }
  .finding-dm-compose__attach-wrap {
    position: relative;
    flex-shrink: 0;
  }
  .finding-dm-attach-menu {
    position: absolute;
    left: 0;
    bottom: calc(100% + 6px);
    z-index: 4;
    min-width: 168px;
    padding: 6px;
    border-radius: 12px;
    border: 1px solid #e5e7eb;
    background: #fff;
    box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
  }
  .finding-dm-attach-menu__item {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 10px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: #111827;
    font-size: 14px;
    text-align: left;
    cursor: pointer;
  }
`;

let viewerBootToken = 0;
let viewerHistoryPushed = false;
let closingViewerFromHistory = false;

/** Инъекция в iframe: флаг приложения + блок ухода на main.html после logout */
const ANDROID_BOOT_SCRIPT =
  `<script>(function(){` +
  `window.__SPN_ANDROID_APP__=true;` +
  `document.documentElement.classList.add("android-app");` +
  `try{var A=Location.prototype.assign;` +
  `Location.prototype.assign=function(u){` +
  `try{var s=String(u||"");` +
  `if(/\\/main\\.html/i.test(s)||s==="/"||s==="/frontend/"){` +
  `try{window.parent&&window.parent!==window&&window.parent.postMessage({type:"spn-app-logged-out"},"*");}catch(e){}` +
  `return;}}catch(e){}` +
  `return A.apply(this,arguments);};}catch(e){}` +
  `})();</script>`;

/** В играх: свайп/history.back внутри не должен закрывать viewer */
const ANDROID_GAME_LOCK_SCRIPT =
  `<script>(function(){` +
  `window.__SPN_ANDROID_APP__=true;` +
  `window.__SPN_ANDROID_GAME__=true;` +
  `document.documentElement.classList.add("android-app");` +
  `try{` +
  `var HP=History.prototype;` +
  `HP.back=function(){};` +
  `var _go=HP.go;` +
  `HP.go=function(n){if(typeof n==="number"&&n<0)return;return _go.apply(this,arguments);};` +
  `}catch(e){}` +
  `window.addEventListener("spn:swipe-right",function(e){` +
  `try{e.stopImmediatePropagation();}catch(_){}` +
  `try{e.preventDefault();}catch(_){}` +
  `},true);` +
  `})();</script>`;

function isViewerOpen() {
  return Boolean(viewer && !viewer.hidden);
}

function isGameViewerActive() {
  return Boolean(
    isViewerOpen() &&
      (viewerIsGame || (viewer && viewer.classList.contains('is-game')))
  );
}

function armGameHistoryTrap() {
  try {
    history.pushState({ spnViewerGame: 1 }, '');
    viewerGameTrapActive = true;
  } catch (_) {
    viewerGameTrapActive = false;
  }
}

function openAppAuth(title, opts = {}) {
  const returnTab = opts.returnTab || 'profile';
  const returnTo = encodeURIComponent(
    `/frontend/app/index.html?app=1&tab=${encodeURIComponent(returnTab)}&lang=${getLocale()}`
  );
  const authUrl = withLocalizedAppParam(`/frontend/auth/auth.html?app=1&return=${returnTo}`);
  // Stay inside app shell (profile / viewer), not a full site navigation.
  openViewer(authUrl, title || t('login'));
}

function reloadAuthViewerForLocale() {
  if (!viewer || viewer.hidden || !viewerFrame) return;
  let href = '';
  try { href = String(viewerFrame.getAttribute('src') || viewerFrame.src || ''); } catch (_) {}
  if (!/\/auth\//i.test(href)) return;
  openAppAuth(t('login'));
}

/** In-memory HTML cache for static viewer pages (games, KB, tools). */
const viewerHtmlCache = new Map();
const VIEWER_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const VIEWER_CACHE_MAX = 48;
let viewerPrefetchStarted = false;

function viewerCacheKey(href) {
  try {
    const u = new URL(href, location.origin);
    return u.pathname + u.search;
  } catch (_) {
    return String(href || '');
  }
}

function isViewerCacheable(href) {
  // Personalized / auth pages must always be fresh
  return !/\/(auth|profile|mail|findings)\//i.test(String(href || ''));
}

function clearViewerHtmlCache() {
  viewerHtmlCache.clear();
  viewerPrefetchStarted = false;
}

function rememberViewerHtml(key, html) {
  viewerHtmlCache.set(key, { html, at: Date.now() });
  if (viewerHtmlCache.size <= VIEWER_CACHE_MAX) return;
  let oldestKey = null;
  let oldestAt = Infinity;
  for (const [k, v] of viewerHtmlCache) {
    if (v.at < oldestAt) {
      oldestAt = v.at;
      oldestKey = k;
    }
  }
  if (oldestKey) viewerHtmlCache.delete(oldestKey);
}

async function fetchViewerRawHtml(href) {
  const key = viewerCacheKey(href);
  if (isViewerCacheable(href)) {
    const hit = viewerHtmlCache.get(key);
    if (hit && Date.now() - hit.at < VIEWER_CACHE_TTL_MS) return hit.html;
  }
  const abs = new URL(href, location.origin);
  const res = await fetch(abs.pathname + abs.search, {
    credentials: 'include',
    cache: isViewerCacheable(href) ? 'force-cache' : 'no-cache',
  });
  if (!res.ok) throw new Error('viewer ' + res.status);
  const html = await res.text();
  if (isViewerCacheable(href)) rememberViewerHtml(key, html);
  return html;
}

function isKnowledgeBaseUrl(href) {
  return /\/knowledge-base\//i.test(String(href || ''));
}

function isToolUrl(href) {
  return /\/tools\//i.test(String(href || ''));
}

/** Shared chrome strip for KB / tools / games inside the app viewer (site pages untouched). */
function stripViewerSiteChrome(html) {
  let out = String(html || '');
  out = out.replace(/<script\b[^>]*>[\s\S]*?(?:mc\.yandex|metrika|ym\s*\()[\s\S]*?<\/script>/gi, '');
  out = out.replace(/<noscript\b[^>]*>[\s\S]*?(?:mc\.yandex|metrika)[\s\S]*?<\/noscript>/gi, '');
  out = out.replace(/<link\b[^>]*href=["'][^"']*styles\/(?:styles|menu|accessibility|ad-top-banner)\.css[^"']*["'][^>]*>/gi, '');
  out = out.replace(/<script\b[^>]*src=["'][^"']*(?:backgroundGenerator|mobile-enhancements|menu-loader|menu\.js|knowledge-base\.js|ad-slot-init|mobile-anchor-ad)[^"']*["'][^>]*>\s*<\/script>/gi, '');
  out = out.replace(/<script\b[^>]*src=["']https?:\/\/ad\.mail\.ru[^"']*["'][^>]*>\s*<\/script>/gi, '');
  // Game interstitial ad helpers (Mail.ru) — not needed in the app shell
  out = out.replace(/<script\b[^>]*src=["'][^"']*-ads\.js[^"']*["'][^>]*>\s*<\/script>/gi, '');
  // Only inline modules (no src=) that boot the mobile anchor ad
  out = out.replace(/<script\b(?![^>]*\bsrc=)[^>]*type=["']module["'][^>]*>[\s\S]*?mobile-anchor-ad\.js[\s\S]*?<\/script>/gi, '');
  out = out.replace(/<link\b[^>]*hreflang=["'][^"']+["'][^>]*>/gi, '');
  out = out.replace(/<div\b[^>]*id=["']menuContainer["'][^>]*>[\s\S]*?<\/div>/gi, '');
  out = out.replace(/<div\b[^>]*class=["'][^"']*ad-top-banner[^"']*["'][^>]*>[\s\S]*?<\/div>/gi, '');
  out = out.replace(/<div\b[^>]*id=["']mobile-anchor-ad["'][^>]*>[\s\S]*?<\/div>/gi, '');
  return out;
}

/** Strip heavy site chrome from KB pages so the viewer boots faster. */
function slimKnowledgeBaseHtml(html) {
  let out = stripViewerSiteChrome(html);
  const lean =
    '<style id="spn-kb-lean">' +
    'html,body{margin:0;padding:0;background:#f7f7f8;color:#1a1a1a;font:16px/1.55 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}' +
    'img,video,iframe{max-width:100%;height:auto}' +
    '.container,.news-container,.article-container,.content-wrapper{max-width:720px;margin:0 auto;padding:12px 16px 32px}' +
    'h1,h2,h3{line-height:1.25}' +
    'a{color:#0b57d0}' +
    '</style>';
  if (/<\/head>/i.test(out)) {
    out = out.replace(/<\/head>/i, `${lean}</head>`);
  } else {
    out = lean + out;
  }
  return out;
}

/** Strip heavy site chrome from tool pages; keep tools-shell / tool-specific CSS. */
function slimToolHtml(html) {
  let out = stripViewerSiteChrome(html);
  // Prefer dedicated shell over the 150KB site bundle (already removed above).
  if (!/styles\/tools\/tools-shell\.css/i.test(out) && !/styles\/tools\/(?:fuel|depreciation|product-footprint)/i.test(out)) {
    out = out.replace(
      /<\/head>/i,
      '<link rel="stylesheet" href="/frontend/styles/tools/tools-shell.css?v=3"></head>'
    );
  }
  const lean =
    '<style id="spn-tool-lean">' +
    'html,body{margin:0;padding:0;background:#f7f7f8;color:#1a1a1a}' +
    'body.spn-tool,body.android-app.spn-tool{padding-bottom:28px!important;box-sizing:border-box!important}' +
    '</style>';
  if (/<\/head>/i.test(out)) {
    out = out.replace(/<\/head>/i, `${lean}</head>`);
  } else {
    out = lean + out;
  }
  return out;
}

/** Strip heavy site chrome from games; keep game CSS/JS only. */
function slimGameHtml(html) {
  let out = stripViewerSiteChrome(html);
  const lean =
    '<style id="spn-game-lean">' +
    'html,body{margin:0;padding:0;box-sizing:border-box}' +
    '*,*::before,*::after{box-sizing:border-box}' +
    '</style>';
  if (/<\/head>/i.test(out)) {
    out = out.replace(/<\/head>/i, `${lean}</head>`);
  } else {
    out = lean + out;
  }
  return out;
}

function appCssForHref(href) {
  const extra = /\/findings\/inbox\.html/i.test(String(href || '')) ? INBOX_APP_CSS : '';
  return VIEWER_HIDE_MENU_CSS + extra;
}

function wrapViewerHtml(href, html, { withGameLock = false } = {}) {
  if (isKnowledgeBaseUrl(href)) {
    html = slimKnowledgeBaseHtml(html);
  } else if (isToolUrl(href)) {
    html = slimToolHtml(html);
  } else if (isGameUrl(href)) {
    html = slimGameHtml(html);
  }
  const abs = new URL(href, location.origin);
  const baseHref = abs.origin + abs.pathname.replace(/[^/]*$/, '');
  const gameLock = withGameLock && isGameUrl(href) ? ANDROID_GAME_LOCK_SCRIPT : '';
  const openDm = String(abs.searchParams.get('dm') || '')
    .trim()
    .replace(/^@+/, '')
    .replace(/[^\p{L}\p{N}._-]/gu, '')
    .slice(0, 64);
  const dmScript = openDm
    ? `<script>window.__SPN_OPEN_DM__=${JSON.stringify(openDm)};</script>`
    : '';
  const early =
    `<base href="${baseHref}">` +
    `<style id="spn-android-app-css">${appCssForHref(href)}</style>` +
    ANDROID_BOOT_SCRIPT +
    dmScript +
    gameLock;
  if (/<head[^>]*>/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${early}`);
  }
  return `<!DOCTYPE html><html class="android-app"><head>${early}</head><body class="android-app">${html}</body></html>`;
}

function warmSharedViewerAssets() {
  const assets = [
    '/frontend/styles/base.css',
    '/frontend/styles/tools/tools-shell.css?v=3',
    '/frontend/styles/tools/new-tools.css?v=2',
  ];
  for (const href of assets) {
    try {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.as = 'style';
      link.href = href;
      document.head.appendChild(link);
    } catch (_) {}
  }
}

async function prefetchViewerUrl(url) {
  try {
    const href = withAppParam(localizeFrontendPath(url));
    if (!isViewerCacheable(href)) return;
    await fetchViewerRawHtml(href);
  } catch (_) {}
}

function scheduleViewerPrefetchFromCatalog() {
  if (viewerPrefetchStarted || !catalogLoaded) return;
  viewerPrefetchStarted = true;
  const urls = [];
  const kb = catalog?.links?.knowledgeBase || KB_URL;
  if (kb) urls.push(kb);
  for (const tool of catalog.tools || []) {
    if (tool?.href) urls.push(tool.href);
  }
  for (const g of catalog.gamesOwn || []) {
    if (g?.href) urls.push(g.href);
  }
  const run = () => {
    warmSharedViewerAssets();
    try { ensureKbIndex(); } catch (_) {}
    let i = 0;
    const next = () => {
      if (i >= urls.length) return;
      const u = urls[i++];
      prefetchViewerUrl(u).finally(() => setTimeout(next, 120));
    };
    next();
  };
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run, { timeout: 3500 });
  } else {
    setTimeout(run, 900);
  }
}

function openViewer(url, title) {
  const localizedUrl = localizeFrontendPath(url);
  // Лента / сообщения — отдельные вкладки приложения
  if (/\/findings\/feed\.html/i.test(String(localizedUrl || ''))) {
    activateServiceTab('feed');
    return;
  }
  if (/\/findings\/inbox\.html/i.test(String(localizedUrl || ''))) {
    activateServiceTab('inbox');
    return;
  }
  const href = withAppParam(localizedUrl);
  viewerIsGame = isGameUrl(href);
  const viewerIsGameLight = viewerIsGame && /\/2048\//i.test(href);
  viewerTitle.textContent = title || t('brand');
  viewer.hidden = false;
  viewer.setAttribute('aria-hidden', 'false');
  viewer.classList.toggle('is-game', viewerIsGame);
  viewer.classList.toggle('is-game-light', viewerIsGameLight);
  if (viewerIsGame) {
    // Ловушка в history: первый свайп/Back попадает сюда, а не закрывает игру
    armGameHistoryTrap();
  } else if (!viewerHistoryPushed) {
    try {
      history.pushState({ spnViewer: 1 }, '');
      viewerHistoryPushed = true;
    } catch (_) {}
  }
  // VK ID / OAuth не работают в srcdoc (домен about:srcdoc ≠ serpmonn.ru)
  if (/\/auth\/|vkid|oauth|\/mail\//i.test(String(localizedUrl || ''))) {
    const token = ++viewerBootToken;
    viewerFrame.classList.add('is-booting');
    try { viewerFrame.removeAttribute('srcdoc'); } catch (_) {}
    viewerFrame.src = href;
    return;
  }
  loadViewerHtml(href);
}

async function loadViewerHtml(href) {
  const token = ++viewerBootToken;
  viewerFrame.classList.add('is-booting');
  try {
    const raw = await fetchViewerRawHtml(href);
    if (token !== viewerBootToken) return;
    const html = wrapViewerHtml(href, raw, { withGameLock: true });
    try { viewerFrame.removeAttribute('src'); } catch (_) {}
    viewerFrame.srcdoc = html;
  } catch (err) {
    console.warn('viewer srcdoc failed, fallback src', err);
    if (token !== viewerBootToken) return;
    try { viewerFrame.removeAttribute('srcdoc'); } catch (_) {}
    viewerFrame.src = href;
  }
}

function hardenViewerDoc(doc, opts = {}) {
  if (!doc || !doc.documentElement) return;
  const navigate = opts.navigate || 'viewer'; // viewer | embed | fullscreen
  try {
    doc.documentElement.classList.add('android-app');
    if (doc.body) doc.body.classList.add('android-app');
    try { doc.defaultView.__SPN_ANDROID_APP__ = true; } catch (_) {}
    if (isGameViewerActive()) {
      try { doc.defaultView.__SPN_ANDROID_GAME__ = true; } catch (_) {}
      try {
        const HP = doc.defaultView.History?.prototype;
        if (HP && !doc.documentElement.dataset.spnGameHistLock) {
          doc.documentElement.dataset.spnGameHistLock = '1';
          HP.back = function () {};
          const _go = HP.go.bind(doc.defaultView.history);
          HP.go = function (n) {
            if (typeof n === 'number' && n < 0) return;
            return _go(n);
          };
          doc.defaultView.addEventListener(
            'spn:swipe-right',
            (e) => {
              try { e.stopImmediatePropagation(); } catch (_) {}
            },
            true
          );
        }
      } catch (_) {}
    }

    let style = doc.getElementById('spn-android-app-css');
    if (!style) {
      style = doc.createElement('style');
      style.id = 'spn-android-app-css';
      (doc.head || doc.documentElement).appendChild(style);
    }
    let pageHref = '';
    try { pageHref = String(doc.defaultView?.location?.href || ''); } catch (_) {}
    style.textContent = appCssForHref(pageHref);

    const mc = doc.getElementById('menuContainer');
    if (mc) {
      mc.innerHTML = '';
      mc.setAttribute('hidden', '');
      mc.style.cssText = 'display:none!important';
    }

    const bindKey =
      navigate === 'embed' ? 'spnAppEmbedNavBound' :
      navigate === 'fullscreen' ? 'spnAppFsNavBound' : 'spnAppNavBound';
    if (!doc.documentElement.dataset[bindKey]) {
      doc.documentElement.dataset[bindKey] = '1';
      doc.addEventListener(
        'click',
        (e) => {
          const a = e.target.closest && e.target.closest('a[href]');
          if (!a) return;
          const href = a.getAttribute('href') || '';
          if (!href || href.startsWith('#') || href.startsWith('javascript:')) return;

          if (/t\.me|telegram\.me|telegram\.org/i.test(href)) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }

          try {
            const u = new URL(href, location.origin);
            if (u.origin !== location.origin) {
              e.preventDefault();
              e.stopPropagation();
              return;
            }
            e.preventDefault();
            e.stopPropagation();
            u.searchParams.set('app', '1');
            const next = withAppParam(localizeFrontendPath(u.pathname + u.search + u.hash));
            // Покупки Pro в приложении отключены
            if (/\/tariffs\//i.test(u.pathname)) {
              return;
            }
            // После выхода / ссылок «на главную» не уводим из оболочки приложения
            if (/\/main\.html$/i.test(u.pathname) || u.pathname === '/' || u.pathname === '/frontend/' || /^\/frontend\/en\/?$/i.test(u.pathname)) {
              if (navigate === 'embed' || navigate === 'fullscreen') {
                try {
                  window.parent.postMessage({ type: 'spn-app-logged-out' }, '*');
                } catch (_) {}
                return;
              }
              try { closeViewer({ fromHistory: true }); } catch (_) {}
              showScreen('profile');
              showGuestProfile();
              return;
            }
            if (navigate === 'fullscreen' && fullscreenFrame) {
              loadViewerHtmlInto(fullscreenFrame, next).catch(() => {
                fullscreenFrame.src = next;
              });
            } else if (navigate === 'embed' && profileEmbed) {
              loadViewerHtmlInto(profileEmbed, next).catch(() => {
                profileEmbed.src = next;
              });
            } else {
              loadViewerHtml(next);
            }
          } catch (_) {}
        },
        true
      );
    }
  } catch (err) {
    console.warn('spn app viewer harden failed', err);
  }
}

function onViewerLoad() {
  try {
    const doc = viewerFrame.contentDocument;
    if (doc) hardenViewerDoc(doc);
  } catch (_) {}
  viewerFrame.classList.remove('is-booting');
}

viewerFrame.addEventListener('load', onViewerLoad);

const KB_URL = '/frontend/knowledge-base/knowledge-base.html';
function kbUrl() {
  return localizeFrontendPath(KB_URL);
}
const newsChips = Array.from(document.querySelectorAll('[data-news-chip]'));
let newsChip = 'feed';
let kbItemsCache = null;
let kbListLocale = null;
let kbIndexPromise = null;

function setNewsChip(name) {
  newsChip = name === 'kb' ? 'kb' : 'feed';
  newsChips.forEach((chip) => {
    const on = chip.dataset.newsChip === newsChip;
    chip.classList.toggle('is-active', on);
    chip.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  const feedPanel = document.getElementById('newsFeed');
  const kbPanel = document.getElementById('kbPanel');
  if (feedPanel) feedPanel.hidden = newsChip !== 'feed';
  if (kbPanel) kbPanel.hidden = newsChip !== 'kb';
  if (newsChip === 'kb') loadKbList();
}

function parseKbItemsFromHtml(raw) {
  const doc = new DOMParser().parseFromString(raw, 'text/html');
  const items = [];
  doc.querySelectorAll('.news-card').forEach((card) => {
    const title = card.querySelector('.news-card-title')?.textContent?.trim() || '';
    const excerpt = card.querySelector('.news-card-excerpt')?.textContent?.trim() || '';
    const category = card.querySelector('.news-card-category')?.textContent?.trim() || '';
    const date = card.querySelector('.news-card-date')?.textContent?.trim() || '';
    const href = card.querySelector('a.news-card-link')?.getAttribute('href') || '';
    if (title && href) items.push({ title, excerpt, category, date, href });
  });
  return items;
}

async function ensureKbIndex() {
  if (kbItemsCache && kbListLocale === getLocale()) return kbItemsCache;
  if (kbIndexPromise) return kbIndexPromise;
  kbIndexPromise = (async () => {
    const raw = await fetchViewerRawHtml(withAppParam(kbUrl()));
    kbItemsCache = parseKbItemsFromHtml(raw);
    kbListLocale = getLocale();
    return kbItemsCache;
  })().finally(() => {
    kbIndexPromise = null;
  });
  return kbIndexPromise;
}

function renderKbItems(items) {
  const list = document.getElementById('kbList');
  const empty = document.getElementById('kbEmpty');
  if (!list) return;
  list.innerHTML = '';
  if (!items.length) {
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;
  for (const n of items) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'spn-item';
    const meta = [n.category, n.date].filter(Boolean).join(' · ');
    const snip = n.excerpt || meta;
    btn.innerHTML =
      `<strong>${escapeHtml(n.title)}</strong>` +
      (snip ? `<span>${escapeHtml(snip)}</span>` : '') +
      (meta && n.excerpt ? `<span class="spn-item__meta">${escapeHtml(meta)}</span>` : '');
    btn.addEventListener('click', () => openViewer(n.href, n.title));
    list.appendChild(btn);
  }
}

async function loadKbList() {
  const list = document.getElementById('kbList');
  const empty = document.getElementById('kbEmpty');
  if (!list) return;
  if (kbItemsCache && kbListLocale === getLocale()) {
    renderKbItems(kbItemsCache);
    return;
  }
  list.innerHTML = `<p class="spn-muted">${t('loading')}</p>`;
  if (empty) empty.hidden = true;
  try {
    const items = await ensureKbIndex();
    renderKbItems(items || []);
  } catch (err) {
    list.innerHTML = `<p class="spn-error">${escapeHtml(err?.message || t('loadError'))}</p>`;
  }
}

function closeViewer(opts = {}) {
  const fromHistory = Boolean(opts.fromHistory);
  const hadGameTrap = viewerGameTrapActive;
  viewerBootToken += 1;
  viewer.hidden = true;
  viewer.setAttribute('aria-hidden', 'true');
  viewer.classList.remove('is-game');
  viewer.classList.remove('is-game-light');
  viewerIsGame = false;
  viewerGameTrapActive = false;
  viewerFrame.classList.remove('is-booting');
  try { viewerFrame.removeAttribute('srcdoc'); } catch (_) {}
  try { viewerFrame.removeAttribute('src'); } catch (_) {}
  if ((viewerHistoryPushed || hadGameTrap) && !fromHistory && !closingViewerFromHistory) {
    viewerHistoryPushed = false;
    closingViewerFromHistory = true;
    try { history.back(); } catch (_) {}
    closingViewerFromHistory = false;
  } else {
    viewerHistoryPushed = false;
  }
  // После auth/профиля во viewer — обновить состояние вкладки
  try { refreshProfile(); } catch (_) {}
}

window.addEventListener('popstate', () => {
  if (closingViewerFromHistory) return;
  if (isGameViewerActive()) {
    // Свайп/Back: не закрываем игру, возвращаем ловушку в стек
    armGameHistoryTrap();
    return;
  }
  if (isViewerOpen()) {
    closeViewer({ fromHistory: true });
  }
});

function profileEmbedEditOpen() {
  try {
    if (!profileEmbed || profileEmbed.hidden) return false;
    const doc = profileEmbed.contentDocument;
    return Boolean(doc?.getElementById('profileForm'));
  } catch (_) {
    return false;
  }
}

function cancelProfileEmbedEdit() {
  try {
    if (!profileEmbedEditOpen()) return false;
    profileEmbed.contentWindow?.dispatchEvent(new Event('spn:cancel-profile-edit'));
    return true;
  } catch (_) {
    return false;
  }
}

try {
  const CapApp = window.Capacitor?.Plugins?.App;
  if (CapApp && typeof CapApp.addListener === 'function') {
    CapApp.addListener('backButton', () => {
      if (findingSaveModal && !findingSaveModal.hidden) {
        closeFindingSaveModal();
        return;
      }
      if (isFullscreenOpen()) {
        closeProfileSubpage();
        if (activeAppTab === 'feed' || activeAppTab === 'inbox') {
          showScreen('profile');
        }
        return;
      }
      if (isGameViewerActive()) {
        // Свайп/системный Back на играх — только UI «Назад»
        armGameHistoryTrap();
        return;
      }
      if (isViewerOpen()) {
        closeViewer({ fromHistory: true });
        return;
      }
      if (cancelProfileEmbedEdit()) {
        return;
      }
      if (profileSubpageOpen) {
        closeProfileSubpage();
      }
      // На вкладках приложения системный Back не уводит в пустой WebView
    });
  }
} catch (_) {}

/* Блокируем edge-swipe «назад» по области viewer, пока открыта игра */
(function bindGameEdgeSwipeLock() {
  if (!viewer) return;
  let startX = 0;
  let startY = 0;
  let tracking = false;

  viewer.addEventListener(
    'touchstart',
    (e) => {
      if (!isGameViewerActive()) return;
      const t = e.changedTouches?.[0] || e.touches?.[0];
      if (!t) return;
      startX = t.clientX;
      startY = t.clientY;
      tracking = startX <= 40;
    },
    { passive: true, capture: true }
  );

  viewer.addEventListener(
    'touchmove',
    (e) => {
      if (!tracking || !isGameViewerActive()) return;
      const t = e.touches?.[0];
      if (!t) return;
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (dx > 8 && Math.abs(dx) > Math.abs(dy)) {
        try { e.preventDefault(); } catch (_) {}
      }
    },
    { passive: false, capture: true }
  );

  viewer.addEventListener(
    'touchend',
    () => {
      tracking = false;
    },
    { passive: true, capture: true }
  );
})();

let serviceTabSeq = 0;
let activeAppTab = 'profile';

function applyMainScreen(name) {
  screens.forEach((s) => {
    const on = s.dataset.screen === name;
    s.hidden = !on;
    s.classList.toggle('is-active', on);
  });
  tabs.forEach((t) => t.classList.toggle('is-active', t.dataset.tab === name));
  document.documentElement.classList.toggle('spn-profile-tab', name === 'profile');
  syncProfileEmbedMode();
  activeAppTab = name;
}

function showScreen(name) {
  // Любое переключение вкладки отменяет отложенное открытие ленты/сообщений
  serviceTabSeq += 1;

  if (name === 'feed' || name === 'inbox') {
    activateServiceTab(name);
    return;
  }

  if (isFullscreenOpen()) {
    closeFullscreenPage();
  }
  // При смене основных вкладок закрываем viewer (auth / статья), иначе экран «залипает»
  if (isViewerOpen()) {
    try { closeViewer({ fromHistory: true }); } catch (_) {}
  }
  if (name !== 'profile') {
    try { closeSettingsPanel(); } catch (_) {}
  }

  applyMainScreen(name);

  if (name === 'news' && !newsLoaded) loadNews();
  if ((name === 'tools' || name === 'games') && !catalogLoaded) loadCatalog();
  if (name === 'profile') {
    if (profileSubpageOpen && !isFullscreenOpen()) closeProfileSubpage();
    else if (!profileSubpageOpen) {
      if (profileUser && !profileUser.hidden && profileLocaleApplied !== getLocale()) {
        profileEmbedLoaded = false;
        loadProfileEmbed();
      } else {
        refreshProfile();
      }
    }
  }
}

async function activateServiceTab(name) {
  const kind = name === 'inbox' ? 'inbox' : 'feed';
  const seq = ++serviceTabSeq;

  tabs.forEach((t) => t.classList.toggle('is-active', t.dataset.tab === kind));
  document.documentElement.classList.remove('spn-profile-tab');
  syncProfileEmbedMode();
  try { closeSettingsPanel(); } catch (_) {}
  if (isViewerOpen()) {
    try { closeViewer({ fromHistory: true }); } catch (_) {}
  }

  const loggedIn = await isLoggedIn();
  if (seq !== serviceTabSeq) return;

  if (!loggedIn) {
    // Без сессии — на профиль с кнопкой входа, без принудительного экрана auth
    applyMainScreen('profile');
    if (isFullscreenOpen()) closeFullscreenPage();
    try { refreshProfile(); } catch (_) {}
    return;
  }

  if (!catalogLoaded) {
    try { await loadCatalog(); } catch (_) {}
  }
  if (seq !== serviceTabSeq) return;

  activeAppTab = kind;
  if (kind === 'inbox') {
    let inboxHref = catalog?.links?.findingsInbox || '/frontend/findings/inbox.html';
    const dmPeer = pendingInboxPeer();
    if (dmPeer) {
      try {
        const u = new URL(inboxHref, location.origin);
        u.searchParams.set('dm', dmPeer);
        inboxHref = u.pathname + u.search;
      } catch (_) {}
    }
    await openFullscreenPage(
      inboxHref,
      t('findingsInbox'),
      { hideBar: true }
    );
  } else {
    await openFullscreenPage(
      catalog?.links?.findingsFeed || '/frontend/findings/feed.html',
      t('findingsFeed'),
      { hideBar: true }
    );
  }
  if (seq !== serviceTabSeq) {
    try { closeFullscreenPage(); } catch (_) {}
  }
}

tabs.forEach((t) => t.addEventListener('click', () => showScreen(t.dataset.tab)));
viewerBack.addEventListener('click', closeViewer);

newsChips.forEach((chip) => {
  chip.addEventListener('click', () => {
    const next = chip.dataset.newsChip;
    if (next === 'kb') setNewsChip('kb');
    else setNewsChip('feed');
  });
});

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-open]');
  if (!btn) return;
  e.preventDefault();
  const href = btn.getAttribute('data-open') || '';
  try { closeSettingsPanel(); } catch (_) {}
  if (/\/auth\//i.test(href)) {
    openAppAuth(btn.textContent.trim() || t('login'));
    return;
  }
  openViewer(href, btn.textContent.trim());
});

window.addEventListener('message', (ev) => {
  if (!ev || !ev.data) return;
  if (ev.data.type === 'spn-app-close-viewer') closeViewer();
  if (ev.data.type === 'spn-app-auth-ok') {
    try { closeViewer(); } catch (_) {}
    showScreen('profile');
    refreshProfile();
    toast(t('loggedIn'));
    return;
  }
  if (ev.data.type === 'spn-app-need-auth') {
    try { clearProfileEmbed(); } catch (_) {}
    showGuestProfile();
    // Не открываем auth поверх поиска/новостей и не уводим с текущей вкладки:
    // гость видит кнопку «Войти» на профиле, когда сам туда зайдёт.
    return;
  }
  if (ev.data.type === 'spn-app-logged-out') {
    try { clearProfileEmbed(); } catch (_) {}
    showGuestProfile();
    showScreen('profile');
    if (isViewerOpen()) {
      try {
        viewerBootToken += 1;
        viewer.hidden = true;
        viewer.setAttribute('aria-hidden', 'true');
        viewerFrame.classList.remove('is-booting');
        try { viewerFrame.removeAttribute('srcdoc'); } catch (_) {}
        try { viewerFrame.removeAttribute('src'); } catch (_) {}
        viewerHistoryPushed = false;
      } catch (_) {}
    }
  }
});

/* —— Search —— */
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const searchStatus = document.getElementById('searchStatus');
const searchAnswer = document.getElementById('searchAnswer');
const searchActions = document.getElementById('searchActions');
const searchMeta = document.getElementById('searchMeta');
const searchSources = document.getElementById('searchSources');
const searchSourcesSummary = document.getElementById('searchSourcesSummary');
const searchSourcesList = document.getElementById('searchSourcesList');
const searchImages = document.getElementById('searchImages');
const searchImagesGrid = document.getElementById('searchImagesGrid');
const searchVideos = document.getElementById('searchVideos');
const searchVideosGrid = document.getElementById('searchVideosGrid');
const attachBtn = document.getElementById('attachBtn');
const attachInput = document.getElementById('attachInput');
const attachPreview = document.getElementById('attachPreview');
const voiceBtn = document.getElementById('voiceBtn');
const voiceStatus = document.getElementById('voiceStatus');
const findingSaveModal = document.getElementById('findingSaveModal');
const spnToast = document.getElementById('spnToast');

const ATTACHMENT_MAX_BYTES = 100 * 1024;
let searchAttachment = null;
let lastSearchContext = { query: '', answer: '', sources: [], images: [], videos: [] };
let feedbackLocked = false;
let csrfCached = '';
let toastTimer = 0;

const STAR_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.4 5.5L20 10l-4.5 3.8L17 20l-5-3-5 3 1.5-6.2L4 10l5.6-1.5z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/** Клиент android → бэкенд ставит safesearch=2 для ИИ (на сайте = 0). */
function getAppSearchHeaders(extra = {}) {
  let anonId = '';
  try {
    const m = document.cookie.match(/(?:^|; )spn_anon_id=([^;]*)/);
    anonId = m ? decodeURIComponent(m[1]) : '';
  } catch (_) {}
  if (!anonId || anonId.length < 8) {
    anonId = uuid();
    try {
      const secure = location.protocol === 'https:' ? '; Secure' : '';
      document.cookie = `spn_anon_id=${encodeURIComponent(anonId)}; Path=/; Max-Age=${60 * 60 * 24 * 400}; SameSite=Lax${secure}`;
    } catch (_) {}
  }
  return {
    'X-Spn-Client': 'android',
    'X-Spn-Device': 'mobile',
    'X-Anon-Id': anonId,
    ...extra,
  };
}

function showToast(msg) {
  if (!spnToast) {
    searchStatus.hidden = false;
    searchStatus.textContent = msg;
    return;
  }
  spnToast.textContent = msg;
  spnToast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { spnToast.hidden = true; }, 2200);
}

function toast(msg) {
  showToast(msg);
}

function hideSearchActions() {
  if (searchActions) searchActions.hidden = true;
  feedbackLocked = false;
  document.querySelectorAll('#searchActions .spn-actbtn').forEach((b) => b.classList.remove('is-active'));
}

function showSearchActions() {
  if (searchActions) searchActions.hidden = false;
}

function setLastSearch(partial) {
  lastSearchContext = { ...lastSearchContext, ...partial };
}

async function getCsrfHeaders(extra = {}) {
  if (!csrfCached) {
    const res = await spnFetch('/csrf-token', { credentials: 'include' });
    if (!res.ok) throw new Error('csrf');
    const data = await res.json();
    csrfCached = String(data?.csrfToken || '');
  }
  return { ...extra, 'X-CSRF-Token': csrfCached };
}

function loadFavoriteHrefs() {
  try {
    const raw = JSON.parse(localStorage.getItem('favorites') || '[]');
    if (!Array.isArray(raw)) return [];
    return raw
      .map((e) => (typeof e === 'string' ? e.trim() : ''))
      .filter((e) => e.includes('/tools/'));
  } catch (_) {
    return [];
  }
}

function isToolFavorite(href) {
  const key = String(href || '');
  return loadFavoriteHrefs().some((e) => e === key || e.endsWith(key) || key.endsWith(e));
}

function toggleToolFavorite(href) {
  const key = String(href || '');
  if (!key) return false;
  let list = loadFavoriteHrefs();
  const on = isToolFavorite(key);
  if (on) {
    list = list.filter((e) => e !== key && !e.endsWith(key) && !key.endsWith(e));
  } else {
    list.push(key);
  }
  try {
    localStorage.setItem('favorites', JSON.stringify([...new Set(list)]));
  } catch (_) {}
  // Чтобы профиль подхватил избранное при следующем открытии
  profileEmbedLoaded = false;
  return !on;
}

function openFindingSaveModal() {
  if (!findingSaveModal) return;
  findingSaveModal.hidden = false;
  findingSaveModal.setAttribute('aria-hidden', 'false');
}

function closeFindingSaveModal() {
  if (!findingSaveModal) return;
  findingSaveModal.hidden = true;
  findingSaveModal.setAttribute('aria-hidden', 'true');
}

async function saveFindingPrivate() {
  const ctx = lastSearchContext;
  if (!ctx.answer) {
    showToast(t('noAnswerSave'));
    return;
  }
  const auth = await spnFetch('/auth/protected', { credentials: 'include' });
  if (!auth.ok) {
    closeFindingSaveModal();
    openAppAuth(t('login'));
    return;
  }
  const snapshot = {
    answer: { text: ctx.answer || '', usedWebSearch: true, answerEmpty: false },
    sources: Array.isArray(ctx.sources) ? ctx.sources.slice(0, 12) : [],
    media: {
      images: Array.isArray(ctx.images) ? ctx.images.slice(0, 6) : [],
      videos: Array.isArray(ctx.videos) ? ctx.videos.slice(0, 6) : [],
    },
    timings: null,
    savedAt: new Date().toISOString(),
  };
  try {
    const res = await fetch('/api/findings', {
      method: 'POST',
      credentials: 'include',
      headers: await getCsrfHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        query: ctx.query || '',
        locale: getLocale(),
        visibility: 'private',
        snapshot,
      }),
    });
    if (!res.ok) throw new Error('save');
    closeFindingSaveModal();
    profileEmbedLoaded = false;
    showToast(t('findingSaved'));
  } catch (_) {
    showToast(t('findingSaveFail'));
  }
}

function setupSearchActionButtons() {
  if (!searchActions || searchActions.dataset.bound) return;
  searchActions.dataset.bound = '1';

  searchActions.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-ai-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-ai-action');
    const answer = lastSearchContext.answer || searchAnswer.textContent || '';
    const query = lastSearchContext.query || (searchInput.value || '').trim();

    if (action === 'copy') {
      if (!answer) {
        showToast(t('noCopy'));
        return;
      }
      try {
        await navigator.clipboard.writeText(answer);
        showToast(t('copied'));
      } catch (_) {
        showToast(t('copyFail'));
      }
      return;
    }

    if (action === 'share') {
      if (!answer && !query) {
        showToast(t('noText'));
        return;
      }
      const shareText = [query && `${t('shareQuery')}: ${query}`, answer, 'https://serpmonn.ru'].filter(Boolean).join('\n\n');
      try {
        if (navigator.share) {
          await navigator.share({ title: query ? `${t('brand')}: ${query}` : t('brand'), text: shareText });
        } else {
          await navigator.clipboard.writeText(shareText);
          showToast(t('shareCopied'));
        }
      } catch (err) {
        if (err && err.name === 'AbortError') return;
        showToast(t('shareFail'));
      }
      return;
    }

    if (action === 'save-finding') {
      if (!answer) {
        showToast(t('noAnswerSave'));
        return;
      }
      const auth = await spnFetch('/auth/protected', { credentials: 'include' });
      if (!auth.ok) {
        openAppAuth(t('login'));
        return;
      }
      openFindingSaveModal();
      return;
    }

    if (action === 'like' || action === 'dislike') {
      if (feedbackLocked || !answer) return;
      feedbackLocked = true;
      document.querySelectorAll('#searchActions .spn-actbtn--like, #searchActions .spn-actbtn--dislike')
        .forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      try {
        await fetch('/ai-search/feedback', {
          method: 'POST',
          credentials: 'include',
          headers: getAppSearchHeaders({
            'Content-Type': 'application/json',
            'X-User-Lang': getLocale(),
          }),
          body: JSON.stringify({
            rating: action,
            query,
            answer,
            usedWebSearch: true,
            locale: getLocale(),
          }),
        });
      } catch (_) {
        feedbackLocked = false;
        btn.classList.remove('is-active');
      }
    }
  });

  if (findingSaveModal) {
    findingSaveModal.addEventListener('click', (e) => {
      if (e.target.closest('[data-finding-close]')) {
        closeFindingSaveModal();
        return;
      }
      if (e.target.closest('[data-finding-action="save-private"]')) {
        saveFindingPrivate();
      }
    });
  }
}

setupSearchActionButtons();

function renderAttachmentPreview() {
  if (!searchAttachment) {
    attachPreview.hidden = true;
    attachPreview.innerHTML = '';
    attachBtn?.classList.remove('has-file');
    return;
  }
  attachBtn?.classList.add('has-file');
  attachPreview.hidden = false;
  attachPreview.innerHTML = `
    <span class="spn-attach__chip">
      <span class="spn-attach__name">${escapeHtml(searchAttachment.name)}</span>
      <button type="button" class="spn-attach__remove" aria-label="Убрать файл">&times;</button>
    </span>
  `;
  attachPreview.querySelector('.spn-attach__remove')?.addEventListener('click', () => {
    searchAttachment = null;
    renderAttachmentPreview();
  });
}

attachBtn?.addEventListener('click', () => attachInput?.click());
attachInput?.addEventListener('change', async () => {
  const file = attachInput.files?.[0];
  attachInput.value = '';
  if (!file) return;
  const isTxt =
    /\.txt$/i.test(file.name) ||
    file.type === 'text/plain' ||
    file.type === '';
  if (!isTxt) {
    toast('Можно прикрепить только .txt');
    return;
  }
  if (file.size > ATTACHMENT_MAX_BYTES) {
    toast('Файл слишком большой (макс. 100 КБ)');
    return;
  }
  try {
    const text = await file.text();
    if (!text.trim()) {
      toast('Файл пустой');
      return;
    }
    searchAttachment = { name: file.name, text };
    renderAttachmentPreview();
    searchStatus.hidden = true;
  } catch (_) {
    toast('Не удалось прочитать файл');
  }
});

/* —— Voice —— */
let mediaRecorder = null;
let audioChunks = [];
let isRecording = false;

function resetVoiceUi(placeholder) {
  isRecording = false;
  voiceBtn?.classList.remove('is-listening');
  if (voiceStatus) voiceStatus.hidden = true;
  if (searchInput && placeholder) searchInput.placeholder = placeholder;
}

async function sendAudioForRecognition(audioBlob, mimeType) {
  try {
    searchInput.placeholder = t('recognizing');
    const response = await fetch('/voice/stt', {
      method: 'POST',
      headers: { 'Content-Type': mimeType },
      body: audioBlob,
    });
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Ошибка ${response.status}`);
    }
    const data = await response.json();
    const text = (data.text || '').trim();
    if (!text) {
      toast(getLocale() === 'en' ? 'Speech not recognized' : 'Речь не распознана');
      searchInput.placeholder = t('askPlaceholder');
      return;
    }
    searchInput.value = text;
    searchInput.placeholder = t('askPlaceholder');
    searchStatus.hidden = true;
    await new Promise((r) => setTimeout(r, 400));
    searchForm.requestSubmit();
  } catch (err) {
    toast(err?.message || t('voiceError'));
    searchInput.placeholder = t('askPlaceholder');
  }
}

voiceBtn?.addEventListener('click', async () => {
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    toast('Микрофон не поддерживается на этом устройстве');
    return;
  }

  if (isRecording) {
    if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
        ? 'audio/ogg;codecs=opus'
        : 'audio/webm';

    mediaRecorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 128000 });
    audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      resetVoiceUi(t('askPlaceholder'));
      stream.getTracks().forEach((t) => t.stop());
      if (!audioChunks.length) {
        toast('Пустая запись');
        return;
      }
      const audioBlob = new Blob(audioChunks, { type: mimeType });
      await sendAudioForRecognition(audioBlob, mimeType);
    };

    mediaRecorder.onerror = () => {
      toast(t('recordError'));
      resetVoiceUi(t('askPlaceholder'));
      stream.getTracks().forEach((t) => t.stop());
    };

    mediaRecorder.start();
    isRecording = true;
    voiceBtn.classList.add('is-listening');
    voiceStatus.hidden = false;
    searchInput.value = '';
    searchInput.placeholder = t('speaking');

    const autoStop = setTimeout(() => {
      if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
    }, 30000);
    mediaRecorder.addEventListener('stop', () => clearTimeout(autoStop), { once: true });
  } catch (error) {
    let msg = 'Нет доступа к микрофону';
    if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError') {
      msg = 'Разрешите доступ к микрофону в настройках';
    } else if (error?.name === 'NotFoundError') {
      msg = 'Микрофон не найден';
    } else if (error?.name === 'NotReadableError') {
      msg = 'Микрофон занят';
    }
    toast(msg);
    resetVoiceUi(t('askPlaceholder'));
  }
});

function sourceHost(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

function safeHttpUrl(url) {
  try {
    const u = new URL(String(url || ''), location.origin);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
  } catch (_) {}
  return '';
}

function normalizeSources(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  const seen = new Set();
  for (const s of list) {
    const link = safeHttpUrl(s && (s.link || s.url || s.href));
    if (!link || seen.has(link)) continue;
    seen.add(link);
    out.push({
      title: (s.title || s.name || sourceHost(link) || 'Источник').trim(),
      link,
    });
  }
  return out;
}

function renderSources(sources) {
  const items = normalizeSources(sources);
  searchSourcesList.innerHTML = '';
  if (!items.length) {
    searchSources.hidden = true;
    searchSources.open = false;
    return;
  }
  searchSourcesSummary.dataset.count = String(items.length);
  searchSourcesSummary.textContent = `${t('sources')} (${items.length})`;
  for (const s of items) {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    const host = sourceHost(s.link);
    btn.innerHTML = `<strong>${escapeHtml(s.title)}</strong><span>${escapeHtml(host || s.link)}</span>`;
    btn.addEventListener('click', () => openViewer(s.link, s.title));
    li.appendChild(btn);
    searchSourcesList.appendChild(li);
  }
  searchSources.hidden = false;
  searchSources.open = false;
}

function clearMedia() {
  searchImagesGrid.innerHTML = '';
  searchVideosGrid.innerHTML = '';
  searchImages.hidden = true;
  searchVideos.hidden = true;
}

function renderImages(images) {
  searchImagesGrid.innerHTML = '';
  const list = Array.isArray(images) ? images.slice(0, 6) : [];
  if (!list.length) {
    searchImages.hidden = true;
    return;
  }
  for (const img of list) {
    const thumb = safeHttpUrl(img.thumbnailUrl || img.imageUrl);
    const openUrl = safeHttpUrl(img.imageUrl || img.sourceUrl || thumb);
    if (!thumb && !openUrl) continue;
    const title = (img.title || img.sourceName || 'Картинка').trim();
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'spn-media__card';
    btn.innerHTML = `
      <div class="spn-media__thumb">${thumb ? `<img src="${escapeHtml(thumb)}" alt="" loading="lazy">` : ''}</div>
      <div class="spn-media__label">${escapeHtml(title)}</div>
    `;
    btn.addEventListener('click', () => openViewer(openUrl || thumb, title));
    searchImagesGrid.appendChild(btn);
  }
  searchImages.hidden = searchImagesGrid.children.length === 0;
}

function renderVideos(videos) {
  searchVideosGrid.innerHTML = '';
  const list = Array.isArray(videos) ? videos.slice(0, 6) : [];
  if (!list.length) {
    searchVideos.hidden = true;
    return;
  }
  for (const video of list) {
    const thumb = safeHttpUrl(video.thumbnailUrl);
    const openUrl = safeHttpUrl(video.videoUrl || video.sourceUrl);
    if (!openUrl && !thumb) continue;
    const title = (video.title || video.sourceName || t('video')).trim();
    const duration = video.duration ? String(video.duration) : '';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'spn-media__card';
    btn.innerHTML = `
      <div class="spn-media__thumb">
        ${thumb ? `<img src="${escapeHtml(thumb)}" alt="" loading="lazy">` : ''}
        ${duration ? `<div class="spn-media__duration">${escapeHtml(duration)}</div>` : ''}
      </div>
      <div class="spn-media__label">${escapeHtml(title)}</div>
    `;
    btn.addEventListener('click', () => openViewer(openUrl || thumb, title));
    searchVideosGrid.appendChild(btn);
  }
  searchVideos.hidden = searchVideosGrid.children.length === 0;
}

searchForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const q = (searchInput.value || '').trim();
  if (!q && !searchAttachment?.text) return;
  if (!q && searchAttachment?.text) {
    searchInput.value = t('fileQuery');
  }
  const query = (searchInput.value || '').trim();
  if (!query) return;

  searchStatus.hidden = false;
  searchStatus.textContent = t('searching');
  searchAnswer.hidden = true;
  searchAnswer.textContent = '';
  searchMeta.hidden = true;
  hideSearchActions();
  setLastSearch({ query, answer: '', sources: [], images: [], videos: [] });
  renderSources([]);
  clearMedia();

  const body = {
    q: query,
    include: { text: true, images: true, videos: true },
    mode: 'full',
    lang: getLocale(),
    stream: true,
  };
  if (searchAttachment?.text) {
    body.attachmentText = searchAttachment.text;
    body.attachmentName = searchAttachment.name;
  }

  try {
    const res = await fetch('/ai-search', {
      method: 'POST',
      credentials: 'include',
      headers: getAppSearchHeaders({
        'Content-Type': 'application/json',
        Accept: 'application/x-ndjson',
        'X-Idempotency-Key': uuid(),
        'X-User-Lang': getLocale(),
      }),
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(errText || `Ошибка ${res.status}`);
    }

    const ctype = res.headers.get('content-type') || '';
    if (ctype.includes('ndjson') && res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let answer = '';
      let model = '';
      let sources = [];
      searchAnswer.hidden = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          const raw = line.trim();
          if (!raw) continue;
          let ev;
          try { ev = JSON.parse(raw); } catch { continue; }
          // Backend NDJSON uses `event` (site scripts.js); keep `type` as fallback.
          const kind = ev.event || ev.type;
          if (kind === 'status' && ev.phase === 'generating') {
            searchStatus.textContent = t('generating');
          } else if (kind === 'text_start' && Array.isArray(ev.sources)) {
            sources = ev.sources;
            renderSources(sources);
            setLastSearch({ sources });
          } else if (kind === 'text_delta' && ev.chunk) {
            answer += ev.chunk;
            searchAnswer.textContent = answer;
            searchStatus.hidden = true;
            setLastSearch({ answer });
          } else if (kind === 'text_done') {
            if (ev.answer) {
              answer = ev.answer;
              searchAnswer.textContent = answer;
            }
            if (ev.model) model = ev.model;
            if (Array.isArray(ev.sources) && ev.sources.length) {
              sources = ev.sources;
              renderSources(sources);
            }
            setLastSearch({ answer, sources });
            searchStatus.hidden = true;
            if (answer) showSearchActions();
          } else if (kind === 'images') {
            renderImages(ev.images);
            setLastSearch({ images: ev.images || [] });
          } else if (kind === 'videos') {
            renderVideos(ev.videos);
            setLastSearch({ videos: ev.videos || [] });
          } else if (kind === 'error') {
            throw new Error(ev.error || ev.message || 'Ошибка поиска');
          } else if (kind === 'done') {
            if (model || ev.model) {
              searchMeta.hidden = false;
              searchMeta.textContent = `${t('model')}: ${model || ev.model}`;
            }
            if (answer) {
              setLastSearch({ answer, sources });
              showSearchActions();
            }
          }
        }
      }
      searchStatus.hidden = true;
      if (!answer) {
        searchStatus.hidden = false;
        searchStatus.textContent = t('emptyAnswer');
      } else {
        setLastSearch({ answer, sources });
        showSearchActions();
      }
      return;
    }

    const data = await res.json();
    searchStatus.hidden = true;
    searchAnswer.hidden = false;
    searchAnswer.textContent = data.answer || t('emptyAnswer');
    searchMeta.hidden = false;
    searchMeta.textContent = data.model ? `${t('model')}: ${data.model}` : '';
    renderSources(data.sources || []);
    renderImages(data.images || []);
    renderVideos(data.videos || []);
    setLastSearch({
      answer: data.answer || '',
      sources: data.sources || [],
      images: data.images || [],
      videos: data.videos || [],
    });
    if (data.answer) showSearchActions();
  } catch (err) {
    searchStatus.hidden = false;
    searchStatus.textContent = err?.message || t('searchFailed');
    hideSearchActions();
  }
});

/* —— News —— */
async function loadNews() {
  const list = document.getElementById('newsList');
  const empty = document.getElementById('newsEmpty');
  list.innerHTML = `<p class="spn-muted">${t('loading')}</p>`;
  try {
    const res = await fetch(`/news?locale=${encodeURIComponent(getLocale())}&limit=20`, { credentials: 'include' });
    if (!res.ok) throw new Error('news ' + res.status);
    const data = await res.json();
    const items = data.news || [];
    newsLoaded = true;
    list.innerHTML = '';
    if (!items.length) {
      empty.hidden = false;
      return;
    }
    empty.hidden = true;
    for (const n of items) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'spn-item';
      const title = n.title || t('newsItem');
      const snip = n.snippet || n.description || '';
      btn.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(snip)}</span>`;
      const href = n.url || (Array.isArray(n.sources) && n.sources[0]) || kbUrl();
      btn.addEventListener('click', () => openViewer(href, title));
      list.appendChild(btn);
    }
  } catch (err) {
    list.innerHTML = `<p class="spn-error">${escapeHtml(err?.message || t('loadError'))}</p>`;
  }
}

/* —— Catalog —— */
async function loadCatalog() {
  try {
    const res = await fetch('/frontend/app/catalog.json?v=4', { credentials: 'same-origin' });
    catalog = await res.json();
    catalogLoaded = true;
  } catch (_) {
    catalog = { tools: [], gamesOwn: [], gamesPartner: [] };
  }
  renderCatalog();
  scheduleViewerPrefetchFromCatalog();
}

function catalogToolLabel(item) {
  if (getLocale() === 'en') {
    return {
      title: item.titleEn || item.title || '',
      description: item.descriptionEn || item.description || '',
    };
  }
  return {
    title: item.title || '',
    description: item.description || '',
  };
}

function catalogGameLabel(item) {
  if (getLocale() === 'en') {
    return item.nameEn || item.name || '';
  }
  return item.name || '';
}

function renderCatalog() {
  const toolsList = document.getElementById('toolsList');
  const ownList = document.getElementById('gamesOwnList');
  toolsList.innerHTML = '';
  ownList.innerHTML = '';

  for (const tool of catalog.tools || []) {
    const label = catalogToolLabel(tool);
    const wrap = document.createElement('div');
    wrap.className = 'spn-toolcard';
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'spn-cardbtn';
    b.innerHTML = `<strong>${escapeHtml(label.title)}</strong><span>${escapeHtml(label.description)}</span>`;
    b.addEventListener('click', () => openViewer(tool.href, label.title));
    const fav = document.createElement('button');
    fav.type = 'button';
    fav.className = 'spn-favbtn' + (isToolFavorite(tool.href) ? ' is-on' : '');
    fav.setAttribute('aria-label', (getLocale() === 'en' ? 'Favorite: ' : 'В избранное: ') + (label.title || ''));
    fav.setAttribute('aria-pressed', isToolFavorite(tool.href) ? 'true' : 'false');
    fav.innerHTML = STAR_SVG;
    fav.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const on = toggleToolFavorite(tool.href);
      fav.classList.toggle('is-on', on);
      fav.setAttribute('aria-pressed', on ? 'true' : 'false');
      showToast(on ? t('favOn') : t('favOff'));
    });
    wrap.appendChild(b);
    wrap.appendChild(fav);
    toolsList.appendChild(wrap);
  }

  for (const g of catalog.gamesOwn || []) {
    const name = catalogGameLabel(g);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'spn-cardbtn';
    b.innerHTML = `<strong>${escapeHtml(name)}</strong>`;
    b.addEventListener('click', () => openViewer(g.href, name));
    ownList.appendChild(b);
  }
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* —— Profile —— */
const profileGuest = document.getElementById('profileGuest');
const profileUser = document.getElementById('profileUser');
const profileEmbed = document.getElementById('profileEmbed');
const profileBackBtn = document.getElementById('profileBackBtn');
const profileBar = document.getElementById('profileBar');
const settingsLogoutBtn = document.getElementById('settingsLogoutBtn');
const settingsLogoutWrap = document.getElementById('settingsLogoutWrap');
const PROFILE_URL = '/frontend/profile/profile.html';
function profileUrl() {
  const path = localizeFrontendPath(PROFILE_URL);
  try {
    const u = new URL(path, location.origin);
    u.searchParams.set('lang', getLocale());
    u.searchParams.set('_spn_lang', getLocale());
    return u.pathname + u.search;
  } catch (_) {
    return path;
  }
}
let profileEmbedLoaded = false;
let profileSubpageOpen = false;
/** Locale last successfully loaded into the profile iframe */
let profileLocaleApplied = null;

function reloadProfileForLocale({ force = false } = {}) {
  if (!profileEmbed || !profileUser || profileUser.hidden) return;
  if (!force && profileLocaleApplied === getLocale() && profileEmbedLoaded) return;
  try {
    if (profileSubpageOpen) closeProfileSubpage();
  } catch (_) {}
  const onProfile = document.querySelector('.spn-screen.is-active[data-screen="profile"]');
  if (force || onProfile) {
    loadProfileEmbed();
  }
}

function clearProfileEmbed() {
  profileEmbedLoaded = false;
  profileSubpageOpen = false;
  if (profileUser) profileUser.classList.remove('is-subpage');
  if (profileBackBtn) profileBackBtn.hidden = true;
  if (profileBar) profileBar.hidden = true;
  profileEmbed.hidden = true;
  try { profileEmbed.removeAttribute('srcdoc'); } catch (_) {}
  try { profileEmbed.removeAttribute('src'); } catch (_) {}
}

function setProfileSubpageUi(on, title) {
  profileSubpageOpen = Boolean(on);
  if (profileUser) profileUser.classList.toggle('is-subpage', profileSubpageOpen);
  if (profileBackBtn) profileBackBtn.hidden = !profileSubpageOpen;
  if (profileBar) profileBar.hidden = !profileSubpageOpen;
}

function syncSettingsLogoutVisibility() {
  const loggedIn = Boolean(profileUser && !profileUser.hidden);
  if (settingsLogoutWrap) settingsLogoutWrap.hidden = !loggedIn;
}

async function openProfileSubpage(url, title) {
  if (!profileEmbed) return;
  url = localizeFrontendPath(url);
  // Прямо в подложке профиля (iframe), без отдельного fullscreen/viewer
  try { closeFullscreenPage(); } catch (_) {}
  if (isViewerOpen()) {
    try {
      viewerBootToken += 1;
      viewer.hidden = true;
      viewer.setAttribute('aria-hidden', 'true');
      viewerFrame.classList.remove('is-booting');
      try { viewerFrame.removeAttribute('srcdoc'); } catch (_) {}
      try { viewerFrame.removeAttribute('src'); } catch (_) {}
      viewerHistoryPushed = false;
    } catch (_) {}
  }
  setProfileSubpageUi(true, title);
  profileEmbed.hidden = false;
  profileEmbed.classList.add('is-booting');
  profileEmbedLoaded = true;
  try {
    await loadViewerHtmlInto(profileEmbed, withAppParam(url));
  } catch (err) {
    console.warn('profile subpage failed', err);
    try { profileEmbed.removeAttribute('srcdoc'); } catch (_) {}
    profileEmbed.src = withAppParam(url);
  }
}

async function closeProfileSubpage() {
  if (!profileSubpageOpen && !isFullscreenOpen()) return;
  try { closeFullscreenPage(); } catch (_) {}
  setProfileSubpageUi(false);
  if (profileUser && !profileUser.hidden) {
    await loadProfileEmbed();
  }
}

const profileFullscreen = document.getElementById('profileFullscreen');
const fullscreenFrame = document.getElementById('fullscreenFrame');
const fullscreenBack = document.getElementById('fullscreenBack');
const fullscreenTitle = document.getElementById('fullscreenTitle');

function isFullscreenOpen() {
  return Boolean(profileFullscreen && !profileFullscreen.hidden);
}

async function openFullscreenPage(url, title, opts = {}) {
  if (!profileFullscreen || !fullscreenFrame) return;
  url = localizeFrontendPath(url);
  profileSubpageOpen = true;
  // Для вкладок ленты/сообщений шапка профиля не нужна — контент как отдельный раздел
  const hideBar = Boolean(opts.hideBar);
  if (!hideBar) setProfileSubpageUi(true, title);
  else {
    profileSubpageOpen = true;
    if (profileBar) profileBar.hidden = true;
  }
  fullscreenTitle.textContent = title || t('brand');
  if (fullscreenBack) {
    const activeTab = tabs.find((x) => x.classList.contains('is-active'));
    const tabName = activeTab?.dataset?.tab || '';
    fullscreenBack.textContent = (tabName === 'feed' || tabName === 'inbox')
      ? (`← ${t('back')}`)
      : t('backProfile');
  }
  profileFullscreen.classList.toggle('spn-fullscreen--nobar', hideBar);
  profileFullscreen.hidden = false;
  profileFullscreen.setAttribute('aria-hidden', 'false');
  fullscreenFrame.classList.add('is-booting');
  try {
    await loadViewerHtmlInto(fullscreenFrame, withAppParam(url));
  } catch (err) {
    console.warn('fullscreen page failed', err);
    try { fullscreenFrame.removeAttribute('srcdoc'); } catch (_) {}
    fullscreenFrame.src = withAppParam(url);
  }
}

function fullscreenFrameRemoveBoot() {
  if (fullscreenFrame) fullscreenFrame.classList.remove('is-booting');
}

function closeFullscreenPage() {
  profileSubpageOpen = false;
  setProfileSubpageUi(false);
  if (!profileFullscreen) return;
  profileFullscreen.classList.remove('spn-fullscreen--nobar');
  profileFullscreen.hidden = true;
  profileFullscreen.setAttribute('aria-hidden', 'true');
  if (fullscreenFrame) {
    fullscreenFrame.classList.remove('is-booting');
    try { fullscreenFrame.removeAttribute('srcdoc'); } catch (_) {}
    try { fullscreenFrame.removeAttribute('src'); } catch (_) {}
  }
}

if (fullscreenFrame) {
  fullscreenFrame.addEventListener('load', () => {
    try {
      const doc = fullscreenFrame.contentDocument;
      if (doc) hardenViewerDoc(doc, { navigate: 'fullscreen' });
    } catch (_) {}
    fullscreenFrameRemoveBoot();
  });
}

if (fullscreenBack) {
  fullscreenBack.addEventListener('click', () => {
    closeProfileSubpage();
    const active = tabs.find((x) => x.classList.contains('is-active'));
    if (active && (active.dataset.tab === 'feed' || active.dataset.tab === 'inbox')) {
      showScreen('profile');
    }
  });
}

function finishProfileEmbedBoot() {
  if (!profileEmbed) return;
  if (profileEmbed._spnBootWatch) {
    clearTimeout(profileEmbed._spnBootWatch);
    profileEmbed._spnBootWatch = 0;
  }
  profileEmbed.classList.remove('is-booting');
  const loadingEl = document.getElementById('profileLoading');
  if (loadingEl) loadingEl.hidden = true;
  syncProfileEmbedMode();
}

function profileEmbedLooksAlive() {
  if (!profileEmbed || profileEmbed.hidden) return false;
  try {
    const doc = profileEmbed.contentDocument;
    if (!doc || !doc.body) return false;
    const text = String(doc.body.innerText || '').replace(/\s+/g, ' ').trim();
    // nginx auth / пустая страница / about:blank
    if (text.length < 8) return false;
    if (/^401|Unauthorized|Authentication required/i.test(text)) return false;
    return true;
  } catch (_) {
    // cross-origin — считаем, что навигация пошла (src=), доверяем load
    return Boolean(profileEmbed.src && !/about:blank/i.test(profileEmbed.src));
  }
}

async function loadProfileEmbed() {
  if (!profileEmbed) return false;
  const loadingEl = document.getElementById('profileLoading');
  setProfileSubpageUi(false);
  if (loadingEl) loadingEl.hidden = false;
  // Гостя не трогаем, пока iframe реально не живой
  if (profileUser) profileUser.hidden = true;
  profileEmbed.hidden = true;
  profileEmbed.classList.add('is-booting');
  profileEmbedLoaded = false;
  syncProfileEmbedMode();

  try { profileEmbed.removeAttribute('srcdoc'); } catch (_) {}
  try { profileEmbed.removeAttribute('src'); } catch (_) {}

  const href = withAppParam(profileUrl());

  const ok = await new Promise((resolve) => {
    let settled = false;
    const done = (value) => {
      if (settled) return;
      settled = true;
      try { profileEmbed.removeEventListener('load', onLoad); } catch (_) {}
      if (profileEmbed._spnBootWatch) {
        clearTimeout(profileEmbed._spnBootWatch);
        profileEmbed._spnBootWatch = 0;
      }
      resolve(value);
    };
    const onLoad = () => {
      // Дать скриптам профиля кадр на отрисовку
      setTimeout(() => done(profileEmbedLooksAlive()), 120);
    };
    profileEmbed.addEventListener('load', onLoad);
    if (profileEmbed._spnBootWatch) clearTimeout(profileEmbed._spnBootWatch);
    profileEmbed._spnBootWatch = setTimeout(() => done(profileEmbedLooksAlive()), 10000);
    // iframe может грузиться и будучи в hidden-родителе; UI гостя остаётся на экране
    try {
      profileEmbed.hidden = false;
      profileEmbed.src = href;
    } catch (err) {
      console.warn('profile embed src failed', err);
      done(false);
    }
  });

  if (!ok) {
    console.warn('profile embed empty/failed, stay guest');
    showGuestProfile();
    return false;
  }

  profileEmbedLoaded = true;
  profileLocaleApplied = getLocale();
  if (profileGuest) profileGuest.hidden = true;
  if (profileUser) profileUser.hidden = false;
  profileEmbed.hidden = false;
  finishProfileEmbedBoot();
  try {
    const doc = profileEmbed.contentDocument;
    if (doc) hardenViewerDoc(doc, { navigate: 'embed' });
  } catch (_) {}
  syncSettingsLogoutVisibility();
  syncProfileEmbedMode();
  return true;
}

/** Загрузка HTML во iframe (как viewer), без открытия #viewer */
async function loadViewerHtmlInto(frame, href) {
  let html = wrapViewerHtml(href, await fetchViewerRawHtml(href), { withGameLock: false });
  const late = `<style id="spn-android-app-css-late">${appCssForHref(href)}</style>`;
  if (/<\/body>/i.test(html)) {
    html = html.replace(/<\/body>/i, `${late}</body>`);
  } else {
    html += late;
  }
  try { frame.removeAttribute('src'); } catch (_) {}
  frame.srcdoc = html;
}

async function refreshProfile() {
  const loadingEl = document.getElementById('profileLoading');
  try {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), 8000) : null;
    let res;
    try {
      res = await spnFetch('/auth/protected', {
        credentials: 'include',
        ...(ctrl ? { signal: ctrl.signal } : {}),
      });
    } finally {
      if (timer) clearTimeout(timer);
    }
    if (!res.ok) throw new Error('guest');
    await res.json();
    syncSettingsLogoutVisibility();
    if (!profileEmbedLoaded) {
      if (loadingEl) loadingEl.hidden = false;
      const ok = await loadProfileEmbed();
      if (!ok) return;
    } else {
      if (loadingEl) loadingEl.hidden = true;
      if (profileGuest) profileGuest.hidden = true;
      if (profileUser) profileUser.hidden = false;
      if (profileEmbed) profileEmbed.hidden = false;
      finishProfileEmbedBoot();
      syncSettingsLogoutVisibility();
      syncProfileEmbedMode();
    }
  } catch (_) {
    showGuestProfile();
  }
}

if (profileBackBtn) {
  profileBackBtn.addEventListener('click', () => {
    closeProfileSubpage();
  });
}

function showGuestProfile() {
  try { closeFullscreenPage(); } catch (_) {}
  profileSubpageOpen = false;
  profileGuest.hidden = false;
  profileUser.hidden = true;
  const loadingEl = document.getElementById('profileLoading');
  if (loadingEl) loadingEl.hidden = true;
  if (profileUser) profileUser.classList.remove('is-subpage');
  if (profileBar) profileBar.hidden = true;
  if (profileBackBtn) profileBackBtn.hidden = true;
  clearProfileEmbed();
  syncProfileEmbedMode();
  syncSettingsLogoutVisibility();
}

function syncProfileEmbedMode() {
  const onProfile = document.documentElement.classList.contains('spn-profile-tab');
  const embedReady = Boolean(
    profileUser &&
    !profileUser.hidden &&
    profileEmbed &&
    !profileEmbed.hidden &&
    profileEmbedLoaded &&
    !profileEmbed.classList.contains('is-booting')
  );
  document.documentElement.classList.toggle('spn-profile-embed-mode', onProfile && embedReady);
}

async function logoutFromApp() {
  try { closeSettingsPanel(); } catch (_) {}
  showGuestProfile();
  showScreen('profile');
  let ok = false;
  try {
    csrfCached = '';
    const headers = { 'Content-Type': 'application/json' };
    try {
      Object.assign(headers, await getCsrfHeaders());
    } catch (_) {}
    const res = await spnFetch('/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers,
      body: '{}',
    });
    ok = res.ok;
  } catch (_) {}
  // Даже при сбое CSRF/сети не возвращаем «залогинен» из stale-сессии
  if (!ok) {
    try { document.cookie = 'token=; Max-Age=0; path=/; domain=.serpmonn.ru'; } catch (_) {}
    try { document.cookie = 'token=; Max-Age=0; path=/'; } catch (_) {}
  }
  try { await refreshProfile(); } catch (_) {}
  if (profileUser && !profileUser.hidden) {
    // refresh всё ещё видит сессию — принудительно гость
    showGuestProfile();
  }
}

if (settingsLogoutBtn) {
  settingsLogoutBtn.addEventListener('click', (e) => {
    e.preventDefault();
    logoutFromApp();
  });
}

// Выход из полного профиля (postMessage) или устаревший #logoutBtn
document.addEventListener('click', (e) => {
  const logout = e.target.closest && e.target.closest('#logoutBtn');
  if (!logout) return;
  e.preventDefault();
  e.stopPropagation();
  logoutFromApp();
});

window.addEventListener('message', (ev) => {
  if (!ev || !ev.data) return;
  if (ev.data.type === 'spn-app-logged-out') {
    try { clearProfileEmbed(); } catch (_) {}
    showGuestProfile();
    showScreen('profile');
    // Не вызываем closeViewer здесь повторно, если viewer закрыт —
    // history.back() из closeViewer может увести WebView
    if (isViewerOpen()) {
      try {
        viewerBootToken += 1;
        viewer.hidden = true;
        viewer.setAttribute('aria-hidden', 'true');
        viewerFrame.classList.remove('is-booting');
        try { viewerFrame.removeAttribute('srcdoc'); } catch (_) {}
        try { viewerFrame.removeAttribute('src'); } catch (_) {}
        viewerHistoryPushed = false;
      } catch (_) {}
    }
  }
});

// После возврата в приложение обновляем профиль только на его вкладке
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (activeAppTab === 'profile' || document.documentElement.classList.contains('spn-profile-tab')) {
    refreshProfile();
  }
});

/* —— VK ID: полный OAuth-редирект в WebView (без LOGIN_SUCCESS на auth) —— */
function parseVkIdCallbackParams() {
  const hash = (location.hash || '').replace(/^#/, '');
  const hashParams = new URLSearchParams(hash);
  const queryParams = new URLSearchParams(location.search);
  let code = hashParams.get('code') || queryParams.get('code');
  let deviceId = hashParams.get('device_id') || queryParams.get('device_id');
  const payloadStr = hashParams.get('payload') || queryParams.get('payload');
  if (payloadStr && (!code || !deviceId)) {
    for (const raw of [payloadStr, (() => { try { return decodeURIComponent(payloadStr); } catch { return null; } })()]) {
      if (!raw) continue;
      try {
        const p = JSON.parse(raw);
        code = code || p.code || null;
        deviceId = deviceId || p.device_id || p.deviceId || null;
        break;
      } catch (_) {}
    }
  }
  if (code && deviceId) return { code, deviceId };
  return null;
}

function clearAuthReturnUrl(toProfile) {
  try {
    const u = new URL(location.href);
    u.hash = '';
    ['code', 'device_id', 'state', 'type', 'payload', 'error', 'error_description'].forEach((k) => {
      u.searchParams.delete(k);
    });
    u.searchParams.set('app', '1');
    if (toProfile) u.searchParams.set('tab', 'profile');
    else u.searchParams.delete('tab');
    history.replaceState({}, '', u.pathname + '?' + u.searchParams.toString());
  } catch (_) {}
}

function loadVkIdSdk() {
  if (window.VKIDSDK) return Promise.resolve(window.VKIDSDK);
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://unpkg.com/@vkid/sdk@2.6.1/dist-sdk/umd/index.js';
    s.async = true;
    s.onload = () => resolve(window.VKIDSDK);
    s.onerror = () => reject(new Error('VKID SDK load failed'));
    document.head.appendChild(s);
  });
}

async function completeVkIdFromRedirect() {
  const params = parseVkIdCallbackParams();
  if (!params) return false;
  // Сразу чистим URL, чтобы не зациклиться при reload
  clearAuthReturnUrl(true);
  try {
    const VKID = await loadVkIdSdk();
    if (!VKID?.Auth?.exchangeCode) throw new Error('no exchangeCode');
    VKID.Config.init({
      app: 54486564,
      redirectUrl: `${location.origin}/frontend/app/index.html?app=1&lang=${getLocale()}`,
      responseMode: VKID.ConfigResponseMode.Callback,
      source: VKID.ConfigSource.LOWCODE,
      scope: 'vkid.personal_info email',
    });
    const tokens = await VKID.Auth.exchangeCode(params.code, params.deviceId);
    const userInfo = await VKID.Auth.userInfo(tokens.access_token);
    const vkUserId = userInfo.user?.id || userInfo.user?.user_id;
    const email = userInfo.user?.email ?? null;
    const name = userInfo.user?.first_name ?? null;
    if (!vkUserId) throw new Error('no vkUserId');
    const resp = await spnFetch('/api/vkid-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ vkUserId, email, name }),
    });
    const data = await resp.json().catch(() => null);
    if (data?.success) return true;
    throw new Error('vkid-login failed');
  } catch (err) {
    console.error('VKID app redirect login failed:', err);
    // Код мог уже быть обменян на странице auth (LOGIN_SUCCESS) — проверим сессию
    try {
      const res = await spnFetch('/auth/protected', { credentials: 'include' });
      return res.ok;
    } catch (_) {
      return false;
    }
  }
}

/* —— Boot —— */
loadCatalog();
// Сразу гостевой UI — без пустого белого профиля, пока идёт /auth/protected
try { showGuestProfile(); } catch (_) {}
showScreen('profile');

(async function bootAppShell() {
  let wentToProfile = false;
  let toastLogin = false;
  let postAuthTab = '';
  const hadVkCallback = Boolean(parseVkIdCallbackParams());

  try {
    const vkOk = await completeVkIdFromRedirect();
    if (vkOk) {
      wentToProfile = true;
      toastLogin = true;
    } else if (hadVkCallback) {
      toast('Не удалось войти через VK. Попробуйте ещё раз');
    }
  } catch (_) {
    if (hadVkCallback) toast('Не удалось войти через VK. Попробуйте ещё раз');
  }

  try {
    if (sessionStorage.getItem('spn_app_post_auth') === '1') {
      sessionStorage.removeItem('spn_app_post_auth');
      wentToProfile = true;
      toastLogin = true;
    }
  } catch (_) {}

  const tab = new URLSearchParams(location.search).get('tab');
  // После входа можно вернуться на ленту/сообщения, иначе — профиль
  if (tab === 'feed' || tab === 'inbox') {
    postAuthTab = tab;
  } else if (pendingInboxPeer()) {
    postAuthTab = 'inbox';
  }
  if (wentToProfile && !postAuthTab) {
    showScreen('profile');
    try { await refreshProfile(); } catch (_) {}
    if (toastLogin) toast(t('loggedIn'));
  } else if (postAuthTab) {
    showScreen(postAuthTab);
    if (toastLogin) toast(t('loggedIn'));
  } else if (tab === 'profile') {
    showScreen('profile');
  } else if (tab && getTitles()[tab]) {
    showScreen(tab);
  }

  try {
    if (await isLoggedIn()) await syncPushAfterLogin();
    else syncPushSettingsUi();
  } catch (_) {
    try { syncPushSettingsUi(); } catch (__) {}
  }
})();

/* —— Сервисы: почта / входящие / лента —— */
async function isLoggedIn() {
  try {
    const res = await spnFetch('/auth/protected', { credentials: 'include' });
    return res.ok;
  } catch (_) {
    return false;
  }
}

function pendingInboxPeer() {
  try {
    return String(new URLSearchParams(location.search).get('dm') || '')
      .trim()
      .replace(/^@+/, '')
      .replace(/[^\p{L}\p{N}._-]/gu, '')
      .slice(0, 64);
  } catch (_) {
    return '';
  }
}

const PUSH_PREF_KEY = 'spn_push_pref';

function pushPrefOn() {
  try {
    return localStorage.getItem(PUSH_PREF_KEY) !== 'off';
  } catch (_) {
    return true;
  }
}

function setPushPref(on) {
  try {
    localStorage.setItem(PUSH_PREF_KEY, on ? 'on' : 'off');
  } catch (_) {}
}

function setPushSwitch(on, disabled) {
  const btn = document.getElementById('spnPushEnableBtn');
  if (!btn) return;
  btn.hidden = false;
  btn.disabled = Boolean(disabled);
  btn.setAttribute('aria-checked', on ? 'true' : 'false');
}

function syncPushSettingsUi() {
  const hint = document.getElementById('spnPushHint');
  const api = window.spnPush;
  const liveOn = Boolean(api?.isOn?.());
  const denied = api?.permission?.() === 'denied';
  const on = liveOn || (pushPrefOn() && !denied);
  setPushSwitch(on, false);
  if (hint) {
    if (denied && !liveOn) {
      hint.hidden = false;
      hint.textContent = t('pushDenied');
    } else {
      hint.hidden = true;
      hint.textContent = '';
    }
  }
}

async function syncPushAfterLogin() {
  try {
    if (!window.spnPush) return;
    if (pushPrefOn()) {
      await window.spnPush.enable();
    }
  } catch (_) {}
  syncPushSettingsUi();
}

const spnPushEnableBtn = document.getElementById('spnPushEnableBtn');
if (spnPushEnableBtn) {
  spnPushEnableBtn.addEventListener('click', async () => {
    const wantOn = spnPushEnableBtn.getAttribute('aria-checked') !== 'true';
    setPushPref(wantOn);
    try {
      const loggedIn = await isLoggedIn();
      if (!loggedIn) {
        syncPushSettingsUi();
        toast(t('pushNeedLogin'));
        openAppAuth(t('login'));
        return;
      }
      if (!wantOn) {
        await window.spnPush?.disable?.();
        syncPushSettingsUi();
        return;
      }
      setPushSwitch(true, true);
      const result = await window.spnPush?.enable();
      if (result?.ok) toast(t('pushOn'));
      else if (result?.reason === 'denied') toast(t('pushDenied'));
      else toast(t('pushFailed'));
    } catch (_) {
      toast(t('pushFailed'));
    }
    syncPushSettingsUi();
  });
}

async function openAppService(kind) {
  if (kind === 'mail') {
    const loggedIn = await isLoggedIn();
    if (!loggedIn) {
      openAppAuth(t('login'));
      return;
    }
    const mailUrl = catalog?.links?.mail || '/mail/';
    openViewer(mailUrl, 'Почта');
    return;
  }
  if (kind === 'inbox') {
    await activateServiceTab('inbox');
    return;
  }
  if (kind === 'feed') {
    await activateServiceTab('feed');
  }
}

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-service]');
  if (!btn) return;
  e.preventDefault();
  openAppService(btn.getAttribute('data-service'));
});

/* —— Онбординг —— */
const ONBOARD_KEY = 'spn_android_onboarded_v1';
const onboardRoot = document.getElementById('spnOnboarding');
const onboardSlides = Array.from(document.querySelectorAll('#spnOnboardSlides .spn-onboard__slide'));
const onboardDots = document.getElementById('spnOnboardDots');
const onboardNext = document.getElementById('spnOnboardNext');
const onboardSkip = document.getElementById('spnOnboardSkip');
let onboardIndex = 0;

function finishOnboarding() {
  try { localStorage.setItem(ONBOARD_KEY, '1'); } catch (_) {}
  if (onboardRoot) {
    onboardRoot.hidden = true;
    onboardRoot.setAttribute('aria-hidden', 'true');
  }
}

function renderOnboarding() {
  onboardSlides.forEach((slide, i) => {
    slide.hidden = i !== onboardIndex;
  });
  if (onboardDots) {
    onboardDots.innerHTML = '';
    onboardSlides.forEach((_, i) => {
      const dot = document.createElement('span');
      if (i === onboardIndex) dot.className = 'is-active';
      onboardDots.appendChild(dot);
    });
  }
  if (onboardNext) {
    onboardNext.textContent = onboardIndex >= onboardSlides.length - 1 ? 'Начать' : 'Далее';
  }
}

function openOnboarding() {
  if (!onboardRoot || !onboardSlides.length) return;
  let done = false;
  try { done = localStorage.getItem(ONBOARD_KEY) === '1'; } catch (_) {}
  if (done) return;
  onboardIndex = 0;
  renderOnboarding();
  onboardRoot.hidden = false;
  onboardRoot.setAttribute('aria-hidden', 'false');
}

onboardNext?.addEventListener('click', () => {
  if (onboardIndex >= onboardSlides.length - 1) {
    finishOnboarding();
    return;
  }
  onboardIndex += 1;
  renderOnboarding();
});
onboardSkip?.addEventListener('click', finishOnboarding);
openOnboarding();

/* —— Офлайн —— */
const offlineRoot = document.getElementById('spnOffline');
const offlineRetry = document.getElementById('spnOfflineRetry');

function setOfflineVisible(show) {
  if (!offlineRoot) return;
  offlineRoot.hidden = !show;
  offlineRoot.setAttribute('aria-hidden', show ? 'false' : 'true');
}

function syncOfflineState() {
  setOfflineVisible(!navigator.onLine);
}

offlineRetry?.addEventListener('click', () => {
  if (!navigator.onLine) {
    toast('Сети всё ещё нет');
    return;
  }
  setOfflineVisible(false);
  loadCatalog();
  newsLoaded = false;
  try { loadNews(); } catch (_) {}
  refreshProfile();
  toast('Подключение восстановлено');
});

window.addEventListener('online', syncOfflineState);
window.addEventListener('offline', syncOfflineState);
syncOfflineState();

/* —— Settings panel + EN/RU —— */
const settingsPanel = document.getElementById('settingsPanel');
const settingsOpenBtn = document.getElementById('settingsOpenBtn');
const settingsBackBtn = document.getElementById('settingsBackBtn');
const helpPanel = document.getElementById('helpPanel');
const helpOpenBtn = document.getElementById('helpOpenBtn');
const helpBackBtn = document.getElementById('helpBackBtn');
const helpForm = document.getElementById('helpForm');

function isSettingsOpen() {
  return Boolean(settingsPanel && !settingsPanel.hidden);
}

function isHelpOpen() {
  return Boolean(helpPanel && !helpPanel.hidden);
}

function openSettingsPanel() {
  if (!settingsPanel) return;
  try { closeHelpPanel({ keepSettings: true }); } catch (_) {}
  settingsPanel.hidden = false;
  settingsPanel.setAttribute('aria-hidden', 'false');
}

function closeSettingsPanel() {
  try { closeHelpPanel(); } catch (_) {}
  if (!settingsPanel || settingsPanel.hidden) return;
  settingsPanel.hidden = true;
  settingsPanel.setAttribute('aria-hidden', 'true');
}

function openHelpPanel() {
  if (!helpPanel) return;
  if (settingsPanel) {
    settingsPanel.hidden = true;
    settingsPanel.setAttribute('aria-hidden', 'true');
  }
  helpPanel.hidden = false;
  helpPanel.setAttribute('aria-hidden', 'false');
}

function closeHelpPanel(opts = {}) {
  if (!helpPanel || helpPanel.hidden) return;
  helpPanel.hidden = true;
  helpPanel.setAttribute('aria-hidden', 'true');
  if (opts.keepSettings) return;
  if (opts.backToSettings && settingsPanel) {
    settingsPanel.hidden = false;
    settingsPanel.setAttribute('aria-hidden', 'false');
  }
}

if (settingsOpenBtn) {
  settingsOpenBtn.addEventListener('click', () => openSettingsPanel());
}
if (settingsBackBtn) {
  settingsBackBtn.addEventListener('click', () => closeSettingsPanel());
}
if (helpOpenBtn) {
  helpOpenBtn.addEventListener('click', () => openHelpPanel());
}
if (helpBackBtn) {
  helpBackBtn.addEventListener('click', () => closeHelpPanel({ backToSettings: true }));
}

if (helpForm) {
  helpForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const topicEl = document.getElementById('helpTopic');
    const emailEl = document.getElementById('helpEmail');
    const messageEl = document.getElementById('helpMessage');
    const statusEl = document.getElementById('helpFormStatus');
    const submitBtn = document.getElementById('helpSubmitBtn');
    const topic = topicEl?.value || 'other';
    const email = String(emailEl?.value || '').trim();
    const description = String(messageEl?.value || '').trim();
    if (description.length < 10 || !email) return;

    const categoryByTopic = {
      bug: 'bug',
      account: 'other',
      app: 'bug',
      other: 'other',
    };
    const titleByTopic = {
      bug: t('helpTopicBug'),
      account: t('helpTopicAccount'),
      app: t('helpTopicApp'),
      other: t('helpTopicOther'),
    };
    const category = categoryByTopic[topic] || 'other';
    const title = `${titleByTopic[topic] || t('help')} — app`;

    if (statusEl) {
      statusEl.hidden = false;
      statusEl.classList.remove('is-error', 'is-ok');
      statusEl.textContent = t('helpSending');
    }
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = t('helpSending');
    }
    try {
      const res = await spnFetch('/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email,
          category,
          title,
          description,
          priority: topic === 'bug' ? 'high' : 'medium',
          language: getLocale(),
          page: 'app-help',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || 'fail');
      if (statusEl) {
        statusEl.classList.add('is-ok');
        statusEl.textContent = t('helpSent');
      }
      helpForm.reset();
      try { toast(t('helpSent')); } catch (_) {}
    } catch (err) {
      if (statusEl) {
        statusEl.classList.add('is-error');
        statusEl.textContent = t('helpSendFail');
      }
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = t('helpSend');
      }
    }
  });
}

document.querySelectorAll('.spn-lang__btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const next = btn.getAttribute('data-lang');
    if (next !== 'en' && next !== 'ru') return;
    setLocale(next);
  });
});
// Keep profile/site i18n key in sync with app locale
try {
  localStorage.setItem('spn_lang', getLocale());
} catch (_) {}
applyChromeI18n();
