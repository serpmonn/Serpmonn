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
`;

let viewerBootToken = 0;
let viewerHistoryPushed = false;
let closingViewerFromHistory = false;

function isViewerOpen() {
  return Boolean(viewer && !viewer.hidden);
}

function openViewer(url, title) {
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
      `<script>window.__SPN_ANDROID_APP__=true;document.documentElement.classList.add("android-app");</script>`;
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
  const navigate = opts.navigate || 'viewer'; // viewer | embed
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

    const bindKey = navigate === 'embed' ? 'spnAppEmbedNavBound' : 'spnAppNavBound';
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
            if (navigate === 'embed' && profileEmbed) {
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
      if (isViewerOpen()) {
        closeViewer({ fromHistory: true });
      }
      // На вкладках приложения системный Back не уводит в пустой WebView
    });
  }
} catch (_) {}

function showScreen(name) {
  screens.forEach((s) => {
    const on = s.dataset.screen === name;
    s.hidden = !on;
    s.classList.toggle('is-active', on);
  });
  tabs.forEach((t) => t.classList.toggle('is-active', t.dataset.tab === name));
  subtitleEl.textContent = TITLES[name] || '';
  document.documentElement.classList.toggle('spn-profile-tab', name === 'profile');
  if (name === 'news' && !newsLoaded) loadNews();
  if ((name === 'tools' || name === 'games') && !catalogLoaded) loadCatalog();
  if (name === 'profile') refreshProfile();
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
    showGuestProfile();
    showScreen('profile');
  }
});

/* —— Search —— */
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const searchStatus = document.getElementById('searchStatus');
const searchAnswer = document.getElementById('searchAnswer');
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

const ATTACHMENT_MAX_BYTES = 100 * 1024;
let searchAttachment = null;

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function toast(msg) {
  searchStatus.hidden = false;
  searchStatus.textContent = msg;
}

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
          } else if (kind === 'text_delta' && ev.chunk) {
            answer += ev.chunk;
            searchAnswer.textContent = answer;
            searchStatus.hidden = true;
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
            searchStatus.hidden = true;
          } else if (kind === 'images') {
            renderImages(ev.images);
          } else if (kind === 'videos') {
            renderVideos(ev.videos);
          } else if (kind === 'error') {
            throw new Error(ev.error || ev.message || 'Ошибка поиска');
          } else if (kind === 'done') {
            if (model || ev.model) {
              searchMeta.hidden = false;
              searchMeta.textContent = `Модель: ${model || ev.model}`;
            }
          }
        }
      }
      searchStatus.hidden = true;
      if (!answer) {
        searchStatus.hidden = false;
        searchStatus.textContent = 'Пустой ответ. Попробуйте другой запрос.';
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
  } catch (err) {
    searchStatus.hidden = false;
    searchStatus.textContent = err?.message || 'Не удалось выполнить поиск.';
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
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'spn-cardbtn';
    b.innerHTML = `<strong>${escapeHtml(t.title)}</strong><span>${escapeHtml(t.description || '')}</span>`;
    b.addEventListener('click', () => openViewer(t.href, t.title));
    toolsList.appendChild(b);
  }

  for (const g of catalog.gamesOwn || []) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'spn-cardbtn';
    b.innerHTML = `<strong>${escapeHtml(g.name)}</strong><span>${escapeHtml(g.platform || 'Веб')}</span>`;
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
const PROFILE_URL = '/frontend/profile/profile.html';
let profileEmbedLoaded = false;

function clearProfileEmbed() {
  profileEmbedLoaded = false;
  if (!profileEmbed) return;
  profileEmbed.hidden = true;
  try { profileEmbed.removeAttribute('srcdoc'); } catch (_) {}
  try { profileEmbed.removeAttribute('src'); } catch (_) {}
}

async function loadProfileEmbed() {
  if (!profileEmbed) return;
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
    `<script>window.__SPN_ANDROID_APP__=true;document.documentElement.classList.add("android-app");</script>`;
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
    // Полный профиль прямо во вкладке
    if (!profileEmbedLoaded) {
      await loadProfileEmbed();
    }
  } catch (_) {
    showGuestProfile();
  }
}

function showGuestProfile() {
  profileGuest.hidden = false;
  profileUser.hidden = true;
  clearProfileEmbed();
}

// Выход только из полного профиля (postMessage) или устаревший #logoutBtn
document.addEventListener('click', (e) => {
  const logout = e.target.closest && e.target.closest('#logoutBtn');
  if (!logout) return;
  e.preventDefault();
  e.stopPropagation();
  showGuestProfile();
  fetch('/auth/logout', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  }).catch(() => {}).finally(() => refreshProfile());
});

window.addEventListener('message', (ev) => {
  if (!ev || !ev.data) return;
  if (ev.data.type === 'spn-app-logged-out') {
    showGuestProfile();
    showScreen('profile');
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
