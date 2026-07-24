window.__SPN_ANDROID_APP__ = true;
document.documentElement.classList.add('android-app');
document.body?.classList.add('android-app');

const TITLES = {
  search: 'Поиск',
  news: 'Новости',
  tools: 'Инструменты',
  games: 'Игры',
  profile: 'Профиль',
};

const subtitleEl = document.getElementById('spnSubtitle');
const screens = Array.from(document.querySelectorAll('.spn-screen'));
const tabs = Array.from(document.querySelectorAll('.spn-tab'));

const viewer = document.getElementById('viewer');
const viewerFrame = document.getElementById('viewerFrame');
const viewerTitle = document.getElementById('viewerTitle');
const viewerBack = document.getElementById('viewerBack');

let catalog = { tools: [], gamesOwn: [], gamesPartner: [], links: {} };
let newsLoaded = false;
let catalogLoaded = false;

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
  /* Лента / входящие / профиль — единые отступы внутри белой рамки, без «попапа» */
  html, body {
    height: 100% !important;
    min-height: 100% !important;
    background: #f7f7f8 !important;
  }
  .page-wrapper {
    min-height: 100% !important;
    padding: 12px 14px 20px !important;
    background: #f7f7f8 !important;
  }
  .page-wrapper > .container {
    max-width: none !important;
    width: 100% !important;
    margin: 0 !important;
    padding: 14px 14px 16px !important;
  }
  /* Лента/входящие: без лишней «карточки» поверх контейнера, отступы уже у .container */
  .finding-inbox-card.card,
  .card.finding-inbox-card {
    box-shadow: none !important;
    border: none !important;
    border-radius: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    background: transparent !important;
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

function isViewerOpen() {
  return Boolean(viewer && !viewer.hidden);
}

function openViewer(url, title) {
  // Лента / входящие — только в подложке профиля, не viewer-popup
  if (/\/findings\/(feed|inbox)\.html/i.test(String(url || ''))) {
    showScreen('profile');
    openProfileSubpage(url, title || 'Серпмонн');
    return;
  }
  const href = withAppParam(url);
  viewerTitle.textContent = title || 'Серпмонн';
  viewer.hidden = false;
  viewer.setAttribute('aria-hidden', 'false');
  if (!viewerHistoryPushed) {
    try {
      history.pushState({ spnViewer: 1 }, '');
      viewerHistoryPushed = true;
    } catch (_) {}
  }
  loadViewerHtml(href);
}

async function loadViewerHtml(href) {
  const token = ++viewerBootToken;
  viewerFrame.classList.add('is-booting');
  try {
    const abs = new URL(href, location.origin);
    const res = await fetch(abs.pathname + abs.search, {
      credentials: 'include',
      cache: 'no-cache',
    });
    if (!res.ok) throw new Error('viewer ' + res.status);
    let html = await res.text();
    if (token !== viewerBootToken) return;

    const baseHref = abs.origin + abs.pathname.replace(/[^/]*$/, '');
    const early =
      `<base href="${baseHref}">` +
      `<style id="spn-android-app-css">${VIEWER_HIDE_MENU_CSS}</style>` +
      ANDROID_BOOT_SCRIPT;
    if (/<head[^>]*>/i.test(html)) {
      html = html.replace(/<head([^>]*)>/i, `<head$1>${early}`);
    } else {
      html = `<!DOCTYPE html><html class="android-app"><head>${early}</head><body class="android-app">${html}</body></html>`;
    }

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

    let style = doc.getElementById('spn-android-app-css');
    if (!style) {
      style = doc.createElement('style');
      style.id = 'spn-android-app-css';
      (doc.head || doc.documentElement).appendChild(style);
    }
    style.textContent = VIEWER_HIDE_MENU_CSS;

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
            const next = u.pathname + u.search + u.hash;
            // Покупки Pro в приложении отключены
            if (/\/tariffs\//i.test(u.pathname)) {
              return;
            }
            // После выхода / ссылок «на главную» не уводим из оболочки приложения
            if (/\/main\.html$/i.test(u.pathname) || u.pathname === '/' || u.pathname === '/frontend/') {
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
const newsChips = Array.from(document.querySelectorAll('[data-news-chip]'));
let newsChip = 'feed';
let kbViewerOpen = false;

function setNewsChip(name, { openKb } = { openKb: true }) {
  newsChip = name === 'kb' ? 'kb' : 'feed';
  newsChips.forEach((chip) => {
    const on = chip.dataset.newsChip === newsChip;
    chip.classList.toggle('is-active', on);
    chip.setAttribute('aria-selected', on ? 'true' : 'false');
  });
  if (newsChip === 'kb' && openKb) {
    kbViewerOpen = true;
    openViewer(KB_URL, 'База знаний');
  }
}

function closeViewer(opts = {}) {
  const fromHistory = Boolean(opts.fromHistory);
  viewerBootToken += 1;
  viewer.hidden = true;
  viewer.setAttribute('aria-hidden', 'true');
  viewerFrame.classList.remove('is-booting');
  try { viewerFrame.removeAttribute('srcdoc'); } catch (_) {}
  try { viewerFrame.removeAttribute('src'); } catch (_) {}
  if (kbViewerOpen) {
    kbViewerOpen = false;
    setNewsChip('feed', { openKb: false });
  }
  if (viewerHistoryPushed) {
    viewerHistoryPushed = false;
    if (!fromHistory && !closingViewerFromHistory) {
      closingViewerFromHistory = true;
      try { history.back(); } catch (_) {}
      closingViewerFromHistory = false;
    }
  }
  // После auth/профиля во viewer — обновить состояние вкладки
  try { refreshProfile(); } catch (_) {}
}

window.addEventListener('popstate', () => {
  if (closingViewerFromHistory) return;
  if (isViewerOpen()) {
    closeViewer({ fromHistory: true });
  }
});

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
        return;
      }
      if (isViewerOpen()) {
        closeViewer({ fromHistory: true });
        return;
      }
      if (profileSubpageOpen) {
        closeProfileSubpage();
      }
      // На вкладках приложения системный Back не уводит в пустой WebView
    });
  }
} catch (_) {}

function showScreen(name) {
  if (name !== 'profile' && isFullscreenOpen()) {
    closeFullscreenPage();
  }
  screens.forEach((s) => {
    const on = s.dataset.screen === name;
    s.hidden = !on;
    s.classList.toggle('is-active', on);
  });
  tabs.forEach((t) => t.classList.toggle('is-active', t.dataset.tab === name));
  if (name !== 'profile' || !profileSubpageOpen) {
    subtitleEl.textContent = TITLES[name] || '';
  }
  document.documentElement.classList.toggle('spn-profile-tab', name === 'profile');
  syncProfileEmbedMode();
  if (name === 'news' && !newsLoaded) loadNews();
  if ((name === 'tools' || name === 'games') && !catalogLoaded) loadCatalog();
  if (name === 'profile') {
    if (profileSubpageOpen && !isFullscreenOpen()) closeProfileSubpage();
    else if (!profileSubpageOpen) refreshProfile();
  }
}

tabs.forEach((t) => t.addEventListener('click', () => showScreen(t.dataset.tab)));
viewerBack.addEventListener('click', closeViewer);

newsChips.forEach((chip) => {
  chip.addEventListener('click', () => {
    const next = chip.dataset.newsChip;
    if (next === 'kb') setNewsChip('kb');
    else setNewsChip('feed', { openKb: false });
  });
});

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-open]');
  if (!btn) return;
  e.preventDefault();
  openViewer(btn.getAttribute('data-open'), btn.textContent.trim());
});

window.addEventListener('message', (ev) => {
  if (!ev || !ev.data) return;
  if (ev.data.type === 'spn-app-close-viewer') closeViewer();
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
        kbViewerOpen = false;
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
    const res = await fetch('/csrf-token', { credentials: 'include' });
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
    showToast('Нет ответа для сохранения');
    return;
  }
  const auth = await fetch('/auth/protected', { credentials: 'include' });
  if (!auth.ok) {
    closeFindingSaveModal();
    openViewer('/frontend/auth/auth.html', 'Вход');
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
        locale: 'ru',
        visibility: 'private',
        snapshot,
      }),
    });
    if (!res.ok) throw new Error('save');
    closeFindingSaveModal();
    profileEmbedLoaded = false;
    showToast('Находка сохранена');
  } catch (_) {
    showToast('Не удалось сохранить');
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
        showToast('Нет текста для копирования');
        return;
      }
      try {
        await navigator.clipboard.writeText(answer);
        showToast('Скопировано');
      } catch (_) {
        showToast('Не удалось скопировать');
      }
      return;
    }

    if (action === 'share') {
      if (!answer && !query) {
        showToast('Нет текста');
        return;
      }
      const shareText = [query && `Запрос: ${query}`, answer, 'https://serpmonn.ru'].filter(Boolean).join('\n\n');
      try {
        if (navigator.share) {
          await navigator.share({ title: query ? `Серпмонн: ${query}` : 'Серпмонн', text: shareText });
        } else {
          await navigator.clipboard.writeText(shareText);
          showToast('Текст скопирован для отправки');
        }
      } catch (err) {
        if (err && err.name === 'AbortError') return;
        showToast('Не удалось поделиться');
      }
      return;
    }

    if (action === 'save-finding') {
      if (!answer) {
        showToast('Нет ответа для сохранения');
        return;
      }
      const auth = await fetch('/auth/protected', { credentials: 'include' });
      if (!auth.ok) {
        openViewer('/frontend/auth/auth.html', 'Вход');
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
          headers: { 'Content-Type': 'application/json', 'X-User-Lang': 'ru' },
          body: JSON.stringify({
            rating: action,
            query,
            answer,
            usedWebSearch: true,
            locale: 'ru',
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
    searchInput.placeholder = 'Распознаём речь…';
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
      toast('Речь не распознана');
      searchInput.placeholder = 'Задайте вопрос…';
      return;
    }
    searchInput.value = text;
    searchInput.placeholder = 'Задайте вопрос…';
    searchStatus.hidden = true;
    await new Promise((r) => setTimeout(r, 400));
    searchForm.requestSubmit();
  } catch (err) {
    toast(err?.message || 'Ошибка распознавания речи');
    searchInput.placeholder = 'Задайте вопрос…';
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
      resetVoiceUi('Задайте вопрос…');
      stream.getTracks().forEach((t) => t.stop());
      if (!audioChunks.length) {
        toast('Пустая запись');
        return;
      }
      const audioBlob = new Blob(audioChunks, { type: mimeType });
      await sendAudioForRecognition(audioBlob, mimeType);
    };

    mediaRecorder.onerror = () => {
      toast('Ошибка записи');
      resetVoiceUi('Задайте вопрос…');
      stream.getTracks().forEach((t) => t.stop());
    };

    mediaRecorder.start();
    isRecording = true;
    voiceBtn.classList.add('is-listening');
    voiceStatus.hidden = false;
    searchInput.value = '';
    searchInput.placeholder = 'Говорите…';

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
    resetVoiceUi('Задайте вопрос…');
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
  searchSourcesSummary.textContent = `Источники (${items.length})`;
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
    const title = (video.title || video.sourceName || 'Видео').trim();
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
    searchInput.value = 'Что в этом файле?';
  }
  const query = (searchInput.value || '').trim();
  if (!query) return;

  searchStatus.hidden = false;
  searchStatus.textContent = 'Ищем ответ…';
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
    lang: 'ru',
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
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/x-ndjson',
        'X-Idempotency-Key': uuid(),
        'X-User-Lang': 'ru',
      },
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
            searchStatus.textContent = 'Генерируем ответ…';
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
              searchMeta.textContent = `Модель: ${model || ev.model}`;
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
        searchStatus.textContent = 'Пустой ответ. Попробуйте другой запрос.';
      } else {
        setLastSearch({ answer, sources });
        showSearchActions();
      }
      return;
    }

    const data = await res.json();
    searchStatus.hidden = true;
    searchAnswer.hidden = false;
    searchAnswer.textContent = data.answer || 'Пустой ответ.';
    searchMeta.hidden = false;
    searchMeta.textContent = data.model ? `Модель: ${data.model}` : '';
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
    searchStatus.textContent = err?.message || 'Не удалось выполнить поиск.';
    hideSearchActions();
  }
});

/* —— News —— */
async function loadNews() {
  const list = document.getElementById('newsList');
  const empty = document.getElementById('newsEmpty');
  list.innerHTML = '<p class="spn-muted">Загрузка…</p>';
  try {
    const res = await fetch('/news?locale=ru&limit=20', { credentials: 'include' });
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
      const title = n.title || 'Новость';
      const snip = n.snippet || n.description || '';
      btn.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(snip)}</span>`;
      const href = n.url || (Array.isArray(n.sources) && n.sources[0]) || '/frontend/news/news.html';
      btn.addEventListener('click', () => openViewer(href, title));
      list.appendChild(btn);
    }
  } catch (err) {
    list.innerHTML = `<p class="spn-error">${escapeHtml(err?.message || 'Ошибка загрузки')}</p>`;
  }
}

/* —— Catalog —— */
async function loadCatalog() {
  try {
    const res = await fetch('/frontend/app/catalog.json?v=1', { credentials: 'same-origin' });
    catalog = await res.json();
    catalogLoaded = true;
  } catch (_) {
    catalog = { tools: [], gamesOwn: [], gamesPartner: [] };
  }
  renderCatalog();
}

function renderCatalog() {
  const toolsList = document.getElementById('toolsList');
  const ownList = document.getElementById('gamesOwnList');
  toolsList.innerHTML = '';
  ownList.innerHTML = '';

  for (const t of catalog.tools || []) {
    const wrap = document.createElement('div');
    wrap.className = 'spn-toolcard';
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'spn-cardbtn';
    b.innerHTML = `<strong>${escapeHtml(t.title)}</strong><span>${escapeHtml(t.description || '')}</span>`;
    b.addEventListener('click', () => openViewer(t.href, t.title));
    const fav = document.createElement('button');
    fav.type = 'button';
    fav.className = 'spn-favbtn' + (isToolFavorite(t.href) ? ' is-on' : '');
    fav.setAttribute('aria-label', 'В избранное: ' + (t.title || ''));
    fav.setAttribute('aria-pressed', isToolFavorite(t.href) ? 'true' : 'false');
    fav.innerHTML = STAR_SVG;
    fav.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const on = toggleToolFavorite(t.href);
      fav.classList.toggle('is-on', on);
      fav.setAttribute('aria-pressed', on ? 'true' : 'false');
      showToast(on ? 'В избранном профиля' : 'Убрано из избранного');
    });
    wrap.appendChild(b);
    wrap.appendChild(fav);
    toolsList.appendChild(wrap);
  }

  for (const g of catalog.gamesOwn || []) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'spn-cardbtn';
    b.innerHTML = `<strong>${escapeHtml(g.name)}</strong>`;
    b.addEventListener('click', () => openViewer(g.href, g.name));
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
const profileQuickLinks = document.getElementById('profileQuickLinks');
const profileMore = document.getElementById('profileMore');
const profileLogoutBtn = document.getElementById('profileLogoutBtn');
const PROFILE_URL = '/frontend/profile/profile.html';
let profileEmbedLoaded = false;
let profileSubpageOpen = false;

function clearProfileEmbed() {
  profileEmbedLoaded = false;
  profileSubpageOpen = false;
  if (profileUser) profileUser.classList.remove('is-subpage');
  if (profileBackBtn) profileBackBtn.hidden = true;
  if (profileQuickLinks) profileQuickLinks.hidden = false;
  if (profileLogoutBtn) profileLogoutBtn.hidden = false;
  if (profileMore) {
    profileMore.hidden = false;
    try { profileMore.open = false; } catch (_) {}
  }
  try { closeFullscreenPage(); } catch (_) {}
  if (!profileEmbed) return;
  profileEmbed.hidden = true;
  try { profileEmbed.removeAttribute('srcdoc'); } catch (_) {}
  try { profileEmbed.removeAttribute('src'); } catch (_) {}
}

function setProfileSubpageUi(on, title) {
  profileSubpageOpen = Boolean(on);
  if (profileUser) profileUser.classList.toggle('is-subpage', profileSubpageOpen);
  if (profileBackBtn) profileBackBtn.hidden = !profileSubpageOpen;
  if (profileQuickLinks) profileQuickLinks.hidden = profileSubpageOpen;
  if (profileLogoutBtn) profileLogoutBtn.hidden = profileSubpageOpen;
  if (profileMore) profileMore.hidden = profileSubpageOpen;
  if (profileBar) profileBar.hidden = false;
  if (profileSubpageOpen) {
    subtitleEl.textContent = title || 'Профиль';
  } else {
    subtitleEl.textContent = TITLES.profile || 'Профиль';
    if (profileLogoutBtn) profileLogoutBtn.hidden = false;
    if (profileQuickLinks) profileQuickLinks.hidden = false;
  }
}

async function openProfileSubpage(url, title) {
  if (!profileEmbed) return;
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

async function openFullscreenPage(url, title) {
  if (!profileFullscreen || !fullscreenFrame) return;
  profileSubpageOpen = true;
  setProfileSubpageUi(true, title);
  fullscreenTitle.textContent = title || 'Серпмонн';
  subtitleEl.textContent = title || 'Профиль';
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
  });
}

async function loadProfileEmbed() {
  if (!profileEmbed) return;
  setProfileSubpageUi(false);
  profileEmbed.hidden = false;
  profileEmbed.classList.add('is-booting');
  try {
    await loadViewerHtmlInto(profileEmbed, withAppParam(PROFILE_URL));
    profileEmbedLoaded = true;
  } catch (err) {
    console.warn('profile embed failed', err);
    profileEmbed.removeAttribute('srcdoc');
    profileEmbed.src = withAppParam(PROFILE_URL);
    profileEmbedLoaded = true;
  }
}

/** Загрузка HTML во iframe (как viewer), без открытия #viewer */
async function loadViewerHtmlInto(frame, href) {
  const abs = new URL(href, location.origin);
  const res = await fetch(abs.pathname + abs.search, {
    credentials: 'include',
    cache: 'no-cache',
  });
  if (!res.ok) throw new Error('embed ' + res.status);
  let html = await res.text();
  const baseHref = abs.origin + abs.pathname.replace(/[^/]*$/, '');
  const early =
    `<base href="${baseHref}">` +
    `<style id="spn-android-app-css">${VIEWER_HIDE_MENU_CSS}</style>` +
    ANDROID_BOOT_SCRIPT;
  if (/<head[^>]*>/i.test(html)) {
    html = html.replace(/<head([^>]*)>/i, `<head$1>${early}`);
  } else {
    html = `<!DOCTYPE html><html class="android-app"><head>${early}</head><body class="android-app">${html}</body></html>`;
  }
  try { frame.removeAttribute('src'); } catch (_) {}
  frame.srcdoc = html;
}

if (profileEmbed) {
  profileEmbed.addEventListener('load', () => {
    try {
      const doc = profileEmbed.contentDocument;
      if (doc) hardenViewerDoc(doc, { navigate: 'embed' });
    } catch (_) {}
    profileEmbed.classList.remove('is-booting');
  });
}

async function refreshProfile() {
  try {
    const res = await fetch('/auth/protected', { credentials: 'include' });
    if (!res.ok) throw new Error('guest');
    await res.json();
    profileGuest.hidden = true;
    profileUser.hidden = false;
    syncProfileEmbedMode();
    // Полный профиль прямо во вкладке (не сбрасываем открытую ленту/входящие)
    if (!profileEmbedLoaded) {
      await loadProfileEmbed();
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

document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-profile-page]');
  if (!btn) return;
  e.preventDefault();
  const url = btn.getAttribute('data-profile-page');
  if (!url) return;
  const title = btn.getAttribute('data-title') || btn.textContent.trim();
  openProfileSubpage(url, title);
});

function showGuestProfile() {
  profileGuest.hidden = false;
  profileUser.hidden = true;
  clearProfileEmbed();
  syncProfileEmbedMode();
}

function syncProfileEmbedMode() {
  const onProfile = document.documentElement.classList.contains('spn-profile-tab');
  const embedOn = Boolean(profileUser && !profileUser.hidden);
  document.documentElement.classList.toggle('spn-profile-embed-mode', onProfile && embedOn);
}

async function logoutFromApp() {
  showGuestProfile();
  showScreen('profile');
  try {
    const headers = { 'Content-Type': 'application/json' };
    try {
      Object.assign(headers, await getCsrfHeaders());
    } catch (_) {}
    await fetch('/auth/logout', {
      method: 'POST',
      credentials: 'include',
      headers,
      body: '{}',
    });
  } catch (_) {}
  refreshProfile();
}

if (profileLogoutBtn) {
  profileLogoutBtn.addEventListener('click', (e) => {
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
        kbViewerOpen = false;
      } catch (_) {}
    }
  }
});

// После входа на полном экране auth — обновляем вкладку профиля
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') refreshProfile();
});

/* —— Boot —— */
loadCatalog();
showScreen('search');

// Deep-link ?tab=
const tab = new URLSearchParams(location.search).get('tab');
if (tab && TITLES[tab]) showScreen(tab);
