import { loadMessages, getMessages, t } from './i18n-loader.js';
import { showCookieBanner } from './cookies.js';
import { loadNews } from './news.js';
import { generateCombinedBackground } from './backgroundGenerator.js';
import { initAdSlotObserver } from './ad-pool.js';
import { initFindingsSave } from './findings-client.js';
import '/frontend/pwa/app.js';

// scripts.js

export function getEnv() {
  const ua = navigator.userAgent || '';

  const isStandalonePWA =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  const params = new URLSearchParams(window.location.search);
  const envParam = params.get('env') || '';

  const host = location.hostname;
  if (envParam === 'vk_mini' || host === 'vk.com' || host.endsWith('.vk.com')) return 'vk_mini';
  if (envParam === 'twa') return 'twa';
  if (isStandalonePWA) return 'pwa';

  return 'web';
}

export function shouldShowCookieBanner() {
  return getEnv() === 'web';
}

function generateIdempotencyKey() {
  if (window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}

function getCurrentLocale() {
  return (document.documentElement.lang || 'en').toLowerCase();
}

function getCurrentLanguageTag() {
  const locale = getCurrentLocale();

  if (locale === 'zh-cn') return 'zh-CN';
  if (locale === 'pt-br') return 'pt-BR';
  if (locale === 'pt-pt') return 'pt-PT';
  if (locale === 'ku-arab') return 'ku-Arab';

  return locale;
}

function getQueryFromUrl() {
  return (new URLSearchParams(window.location.search).get('q') || '').trim();
}

function buildSharePageUrl(query) {
  const url = new URL(window.location.href);
  url.hash = '';

  if (query) {
    url.searchParams.set('q', query);
  } else {
    url.searchParams.delete('q');
  }

  return url.toString();
}

const ATTACHMENT_MAX_BYTES = 100 * 1024;

let searchAttachment = null;

function initTxtAttachment() {
  const attachBtn = document.getElementById('attach-txt-btn');
  const fileInput = document.getElementById('attach-txt-input');
  if (!attachBtn || !fileInput) return;

  const messages = getMessages();
  attachBtn.title = messages.attachFileTitle;
  attachBtn.setAttribute('aria-label', messages.attachFileLabel);

  attachBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;

    const isTxt =
      /\.txt$/i.test(file.name) ||
      file.type === 'text/plain' ||
      file.type === '';

    if (!isTxt) {
      showShareToast(messages.attachmentInvalidType);
      return;
    }

    if (file.size > ATTACHMENT_MAX_BYTES) {
      showShareToast(messages.attachmentTooLarge);
      return;
    }

    try {
      const text = await file.text();
      if (!text.trim()) {
        showShareToast(messages.attachmentInvalidType);
        return;
      }

      searchAttachment = {
        name: file.name,
        text
      };
      renderAttachmentPreview();
    } catch (error) {
      console.warn('[attach] read failed:', error);
      showShareToast(messages.attachmentInvalidType);
    }
  });
}

function renderAttachmentPreview() {
  const preview = document.getElementById('search-attachment-preview');
  const attachBtn = document.getElementById('attach-txt-btn');
  const messages = getMessages();

  if (!preview) return;

  if (!searchAttachment) {
    preview.hidden = true;
    preview.innerHTML = '';
    attachBtn?.classList.remove('has-file');
    return;
  }

  attachBtn?.classList.add('has-file');
  preview.hidden = false;
  preview.innerHTML = `
    <span class="search-attachment-chip">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <path d="M14 2v6h6"/>
      </svg>
      <span class="search-attachment-name">${searchAttachment.name}</span>
      <button type="button" class="search-attachment-remove" aria-label="${messages.attachmentRemoveLabel}">&times;</button>
    </span>
  `;

  preview.querySelector('.search-attachment-remove')?.addEventListener('click', () => {
    searchAttachment = null;
    renderAttachmentPreview();
  });
}

function getSearchAttachmentPayload() {
  if (!searchAttachment?.text) {
    return {};
  }

  return {
    attachmentText: searchAttachment.text,
    attachmentName: searchAttachment.name
  };
}

function renderResultBadges(data, messages) {
  let html = '';

  if (data.attachmentUsed) {
    html += `
      <div class="ai-search-badge ai-attachment-badge">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <path d="M14 2v6h6"/>
        </svg>
        ${messages.attachmentUsed}
      </div>
    `;
  }

  if (data.usedWebSearch) {
    html += `
      <div class="ai-search-badge">
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zM9.5 14C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
        </svg>
        ${messages.webSearchUsed}
      </div>
    `;
  }

  return html;
}

function syncSearchQueryToUrl(query) {
  const nextUrl = buildSharePageUrl(query);
  const currentUrl = `${window.location.pathname}${window.location.search}`;

  if (nextUrl !== `${window.location.origin}${currentUrl}`) {
    history.replaceState(null, '', nextUrl);
  }
}

let lastShareContext = {
  query: '',
  answer: '',
  answerEmpty: false,
  usedWebSearch: false,
  sources: [],
  images: [],
  videos: [],
  timings: null
};

let feedbackLocked = false;

function setShareContext(query, answer, answerEmpty = false, usedWebSearch = false, extras = {}) {
  lastShareContext = {
    query: (query || '').trim(),
    answer: (answer || '').trim(),
    answerEmpty: !!answerEmpty,
    usedWebSearch: !!usedWebSearch,
    sources: Array.isArray(extras.sources) ? extras.sources : [],
    images: Array.isArray(extras.images) ? extras.images : lastShareContext.images,
    videos: Array.isArray(extras.videos) ? extras.videos : lastShareContext.videos,
    timings: extras.timings !== undefined ? extras.timings : lastShareContext.timings
  };
  feedbackLocked = false;
  resetFeedbackButtons();
}

function resetFeedbackButtons() {
  document.querySelectorAll('.feedback-btn').forEach((btn) => {
    btn.disabled = false;
    btn.classList.remove('is-selected');
    btn.style.background = '';
    btn.style.borderColor = '';
    btn.style.color = '';
    btn.style.opacity = '';
  });
}

function highlightFeedbackButton(btn, rating) {
  document.querySelectorAll('.feedback-btn').forEach((item) => {
    const isActive = item === btn;
    item.disabled = true;
    item.classList.toggle('is-selected', isActive);

    if (!isActive) {
      item.style.opacity = '0.45';
      return;
    }

    const isLike = rating === 'like';
    item.style.opacity = '1';
    item.style.background = isLike ? '#ecfdf5' : '#fef2f2';
    item.style.borderColor = isLike ? '#10b981' : '#ef4444';
    item.style.color = isLike ? '#047857' : '#dc2626';
  });
}

async function submitAiFeedback(rating, btn) {
  if (feedbackLocked) return;

  const { query, answer, answerEmpty } = lastShareContext;
  if (!answer && answerEmpty) return;

  feedbackLocked = true;
  highlightFeedbackButton(btn, rating);

  try {
    const response = await fetch('/ai-search/feedback', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Lang': getCurrentLocale()
      },
      credentials: 'include',
      body: JSON.stringify({
        rating,
        query: query || getQueryFromUrl(),
        answer,
        usedWebSearch: lastShareContext.usedWebSearch === true,
        locale: getCurrentLocale()
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    console.warn('[AI feedback] save failed:', error);
    feedbackLocked = false;
    resetFeedbackButtons();
  }
}

function buildSharePayload() {
  const messages = getMessages();
  const { query, answer, answerEmpty } = lastShareContext;
  const pageUrl = buildSharePageUrl(query);
  const lines = [];

  if (query) {
    lines.push(t('shareQueryLine', { query }));
  }

  if (answer) {
    lines.push(answer);
  } else if (!answerEmpty) {
    lines.push(messages.shareTitleDefault);
  }

  lines.push(pageUrl);

  const shareText = lines.join('\n\n');
  const shareTitle = query ? `Serpmonn: ${query}` : messages.shareTitleDefault;

  return {
    pageUrl,
    shareText,
    answerText: answer,
    query,
    shareTitle
  };
}

async function copyTextToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const tmp = document.createElement('textarea');
  tmp.value = text;
  document.body.appendChild(tmp);
  tmp.select();
  document.execCommand('copy');
  document.body.removeChild(tmp);
}

// ======================================================================================================================
// ГОЛОСОВОЙ ВВОД
// ======================================================================================================================
function initVoiceInput() {
  const t = getMessages();
  // Проверяем поддержку MediaRecorder API
  if (!navigator.mediaDevices || !window.MediaRecorder) {
    console.warn('[VOICE] MediaRecorder API не поддерживается');
    return;
  }

  const voiceBtn = document.getElementById('voice-input-btn');
  const searchInput = document.querySelector('#ai-search-form input[name="q"]');
  
  if (!voiceBtn || !searchInput) {
    console.warn('[VOICE] Не найдены элементы кнопки или поля ввода');
    return;
  }

  // Показываем кнопку
  voiceBtn.style.display = 'inline-flex';
  searchInput.closest('.search-input-wrapper')?.classList.add('has-voice');

  let mediaRecorder = null;
  let audioChunks = [];
  let isRecording = false;

  // Индикатор записи
  let recordingIndicator = document.querySelector('.voice-recording-indicator');
  if (!recordingIndicator) {
    recordingIndicator = document.createElement('div');
    recordingIndicator.className = 'voice-recording-indicator';
    recordingIndicator.innerHTML = `
      <div class="voice-recording-dot"></div>
      <span>${t.recording}</span>
    `;
    document.body.appendChild(recordingIndicator);
  }

  voiceBtn.addEventListener('click', async () => {
    if (isRecording) {
      // Остановка записи
      if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
      }
      return;
    }

    try {
      // Запрашиваем доступ к микрофону
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000
        } 
      });

      // Определяем поддерживаемый MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')
        ? 'audio/ogg;codecs=opus'
        : 'audio/webm';

      mediaRecorder = new MediaRecorder(stream, { 
        mimeType,
        audioBitsPerSecond: 128000
      });
      
      audioChunks = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        isRecording = false;
        voiceBtn.classList.remove('listening');
        voiceBtn.disabled = false;
        recordingIndicator.classList.remove('active');

        // Останавливаем все треки микрофона
        stream.getTracks().forEach(track => track.stop());

        if (audioChunks.length === 0) {
          showShareToast(t.zeroBytes);
          searchInput.placeholder = getMessages().askAnything;
          return;
        }

        const audioBlob = new Blob(audioChunks, { type: mimeType });

        // Отправляем на сервер для распознавания
        await sendAudioForRecognition(audioBlob, mimeType);
      };

      mediaRecorder.onerror = (event) => {
        console.error('[VOICE] Ошибка MediaRecorder:', event.error);
        showShareToast(t.audioRecordError);
        resetVoiceUI();
      };

      // Начинаем запись
      mediaRecorder.start();
      isRecording = true;
      voiceBtn.classList.add('listening');
      voiceBtn.disabled = false;
      recordingIndicator.classList.add('active');
      searchInput.value = '';
      searchInput.placeholder = t.speakNow;

      // Автоостановка через 30 секунд
      const autoStopTimeout = setTimeout(() => {
        if (mediaRecorder && mediaRecorder.state === 'recording') {
          mediaRecorder.stop();
          showShareToast(t.autoStopped);
        }
      }, 30000);

      mediaRecorder.addEventListener('stop', () => {
        clearTimeout(autoStopTimeout);
      }, { once: true });

    } catch (error) {
      console.error('[VOICE] Ошибка доступа к микрофону:', error);
      
      let errorMsg = t.micAccessFailed;
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        errorMsg = t.micDenied;
      } else if (error.name === 'NotFoundError') {
        errorMsg = t.micNotFound;
      } else if (error.name === 'NotReadableError') {
        errorMsg = t.micBusy;
      }
      
      showShareToast(errorMsg);
      resetVoiceUI();
    }
  });

  async function sendAudioForRecognition(audioBlob, mimeType) {
    try {
      searchInput.placeholder = t.recognizing;
      
      const response = await fetch('/voice/stt', {
        method: 'POST',
        headers: {
          'Content-Type': mimeType
        },
        body: audioBlob
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      const text = data.text || '';

      if (!text) {
        showShareToast(t.speechNotRecognized);
        searchInput.placeholder = getMessages().askAnything;
        return;
      }

      searchInput.value = text;
      searchInput.placeholder = t.pressEnter;
      searchInput.focus();
      
      showShareToast(`${t.recognizedPrefix}${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);
      
      // ✅ ФЛАГ: Помечаем, что это голосовой ввод
      searchInput.dataset.voiceInput = 'true';
      
      // ✅ АВТООТПРАВКА: Ждём 1 секунду, затем ОДИН РАЗ отправляем
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const form = document.getElementById('ai-search-form');
      if (form) {
        const submitEvent = new Event('submit', { 
          bubbles: true, 
          cancelable: true 
        });
        form.dispatchEvent(submitEvent);
      }

    } catch (error) {
      console.error('[VOICE] Ошибка распознавания:', error);
      showShareToast(t.speechRecognitionError);
      searchInput.placeholder = getMessages().askAnything;
    }
  }

  function resetVoiceUI() {
    isRecording = false;
    voiceBtn.classList.remove('listening');
    voiceBtn.disabled = false;
    recordingIndicator.classList.remove('active');
    searchInput.placeholder = getMessages().askAnything;
  }
}

// ======================================================================================================================
// МАРКДАУН РЕНДЕРЕР ДЛЯ КРАСИВОГО ФОРМАТИРОВАНИЯ ОТВЕТОВ ИИ
// ======================================================================================================================
function renderMarkdown(text) {
  let html = text;

  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

  // списки
  html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/^(\d+)\. (.*$)/gim, '<li>$2</li>');
  html = html.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');

  html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');
  // Markdown-ссылки → <a class="md-link">
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener" class="md-link">$1</a>'
  );
  html = html.replace(/\n/g, '<br>');

  return html;
}

function getSourceHostname(link) {
  try {
    return new URL(link).hostname.replace(/^www\./, '');
  } catch (e) {
    return '';
  }
}

function getSourceFaviconUrl(hostname, size = 32) {
  if (!hostname) return '';
  return `https://www.google.com/s2/favicons?domain=${hostname}&sz=${size}`;
}

function normalizeSourceItems(items) {
  return items
    .slice(0, 6)
    .map((item) => ({
      link: item.link || item.url || '',
      title: item.title || item.text || item.link || item.url || ''
    }))
    .filter((item) => item.link);
}

function dedupeSourcesByHostname(sources) {
  const seen = new Set();
  const unique = [];

  for (const src of sources) {
    const hostname = getSourceHostname(src.link);
    const key = hostname || src.link;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push({ ...src, hostname });
  }

  return unique;
}

function buildSourceHostnameCounts(sources) {
  const counts = new Map();

  for (const src of sources) {
    const hostname = getSourceHostname(src.link);
    const key = hostname || src.link;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return counts;
}

function renderSourcesBlock(items, messages) {
  const sources = normalizeSourceItems(items);
  if (!sources.length) return '';

  const chipSources = dedupeSourcesByHostname(sources);
  const hostnameCounts = buildSourceHostnameCounts(sources);
  const toggleLabel = `${messages.sources} (${sources.length})`;

  const chips = chipSources
    .map((src) => {
      const hostname = src.hostname || getSourceHostname(src.link);
      const favicon = getSourceFaviconUrl(hostname, 32);
      const count = hostnameCounts.get(hostname || src.link) || 1;
      const chipTitle =
        count > 1 ? `${hostname} (${count})` : src.title || hostname;

      return `
        <a href="${src.link}" target="_blank" rel="noopener" class="ai-source-chip" title="${chipTitle}">
          <img src="${favicon}" class="ai-source-chip-favicon" alt="" width="14" height="14" loading="lazy">
        </a>
      `;
    })
    .join('');

  const listItems = sources
    .map((src) => {
      const hostname = getSourceHostname(src.link);
      const favicon = getSourceFaviconUrl(hostname, 16);
      return `
        <a href="${src.link}" target="_blank" rel="noopener" class="source-item">
          <img src="${favicon}" class="source-favicon" alt="" width="16" height="16" loading="lazy">
          <span class="source-title">${src.title}</span>
          <span class="source-url">${hostname}</span>
        </a>
      `;
    })
    .join('');

  return `
    <div class="ai-sources">
      <div class="ai-sources-bar">
        <div class="ai-sources-chips">${chips}</div>
        <button type="button" class="ai-sources-toggle" aria-expanded="false" aria-controls="ai-sources-list">
          <span class="ai-sources-toggle-label">${toggleLabel}</span>
          <svg class="ai-sources-chevron" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>
          </svg>
        </button>
      </div>
      <div id="ai-sources-list" class="ai-sources-list" hidden>
        ${listItems}
      </div>
    </div>
  `;
}

function setupSourcesToggle(root = document) {
  const block = root.querySelector('.ai-sources');
  if (!block) return;

  const toggle = block.querySelector('.ai-sources-toggle');
  const list = block.querySelector('.ai-sources-list');
  if (!toggle || !list) return;

  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    const nextExpanded = !expanded;

    toggle.setAttribute('aria-expanded', nextExpanded ? 'true' : 'false');
    list.hidden = !nextExpanded;
    block.classList.toggle('is-expanded', nextExpanded);
  });
}

// ======================================================================================================================
// ПОКАЗАТЬ АНИМАЦИЮ ЗАГРУЗКИ
// ======================================================================================================================
function setResultActionsVisible(visible) {
  const footer = document.querySelector('.ai-result-footer');
  if (!footer) return;
  footer.classList.toggle('is-pending', !visible);
}

function showLoading() {
  setResultActionsVisible(false);
  resetFeedbackButtons();
  feedbackLocked = false;
  lastShareContext.sources = [];
  lastShareContext.images = [];
  lastShareContext.videos = [];
  lastShareContext.timings = null;
  const t = getMessages();
  const contentDiv = document.getElementById('ai-result-content');
  if (!contentDiv) return;

  contentDiv.innerHTML = `
    <div class="ai-loading">
      <div class="loading-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div class="loading-text">${t.loading}</div>
    </div>
  `;

  const timestampDiv = document.getElementById('ai-timestamp');
  if (timestampDiv) {
    timestampDiv.textContent = '';
  }
}

function formatTimingSeconds(ms) {
  return (ms / 1000).toFixed(1);
}

function showSearchTimings(timings) {
  const timestampDiv = document.getElementById('ai-timestamp');
  if (!timestampDiv || !timings?.total_ms) return;

  lastShareContext.timings = timings;

  const total = formatTimingSeconds(timings.total_ms);

  if (timings.searx_ms != null && timings.model_ms != null) {
    timestampDiv.textContent = t('answerTimingDetail', {
      total,
      search: formatTimingSeconds(timings.searx_ms),
      ai: formatTimingSeconds(timings.model_ms)
    });
    return;
  }

  timestampDiv.textContent = t('answerTiming', { seconds: total });
}

function hideMediaResults(type) {
  const container = document.getElementById(`ai-${type}-results`);
  if (!container) return;
  container.style.display = 'none';
  container.innerHTML = '';
}

function resolveAnswerForDisplay(data) {
  const messages = getMessages();
  const answer = (data.answer || '').trim();

  if (data.answerEmpty === true) {
    return {
      text: answer || messages.emptyAnswer,
      isEmpty: true
    };
  }

  if (!answer || answer === messages.noModelText) {
    return {
      text: messages.emptyAnswer,
      isEmpty: true
    };
  }

  if (/^no information found in the provided data\.?$/i.test(answer)) {
    return {
      text: messages.noDataAnswer,
      isEmpty: true
    };
  }

  return {
    text: answer,
    isEmpty: false
  };
}

function renderAnswerHtml(answer, isEmpty) {
  if (isEmpty) {
    return `<div class="ai-empty-answer">${answer}</div>`;
  }

  return renderMarkdown(answer);
}

function showMediaLoading(type) {
  const container = document.getElementById(`ai-${type}-results`);
  if (!container) return;

  const messages = getMessages();
  const header = type === 'images' ? messages.imagesHeader : messages.videosHeader;

  container.innerHTML = `
    <div class="ai-${type === 'images' ? 'image' : 'video'}-header">
      <span>${header}</span>
    </div>
    <div class="ai-media-loading">
      <div class="loading-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
      <div class="loading-text">${messages.mediaLoading}</div>
    </div>
  `;
  container.style.display = 'block';
}

async function consumeAiSearchStream(response, onEvent) {
  if (!response.body) {
    throw new Error('Streaming body is not available');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const processLine = line => {
    const trimmed = line.trim();
    if (!trimmed) return;
    onEvent(JSON.parse(trimmed));
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      processLine(line);
    }
  }

  if (buffer.trim()) {
    processLine(buffer);
  }
}

async function requestAiSearch({ query, idempotencyKey, locale, useStream, attachment }) {
  const hasAttachment = Boolean(attachment?.attachmentText);
  const include = {
    text: true,
    images: !hasAttachment,
    videos: !hasAttachment
  };

  const headers = {
    'Content-Type': 'application/json',
    'X-Idempotency-Key': idempotencyKey,
    'X-User-Lang': locale
  };

  if (useStream) {
    headers.Accept = 'application/x-ndjson';
  } else {
    headers.Accept = 'application/json';
  }

  const response = await fetch('/ai-search', {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify({
      q: query,
      include,
      mode: 'full',
      lang: locale,
      stream: useStream,
      ...(attachment || {})
    })
  });

  const contentType = response.headers.get('content-type') || '';

  if (!useStream || !contentType.includes('application/x-ndjson')) {
    const data = await response.json().catch(() => null);
    return { mode: 'json', response, data };
  }

  return { mode: 'stream', response };
}

function createStreamState() {
  return {
    gotText: false,
    didScroll: false,
    streamingStarted: false,
    firstTokenReceived: false,
    streamedAnswer: '',
    pendingTextStart: null,
    pendingImages: null,
    pendingVideos: null,
    imagesShown: false,
    videosShown: false
  };
}

function flushPendingMedia(state) {
  if (!state.imagesShown && state.pendingImages !== null) {
    if (state.pendingImages.length > 0) {
      showImageResults({ images: state.pendingImages });
    } else {
      hideMediaResults('images');
    }
    state.imagesShown = true;
  }

  if (state.imagesShown && !state.videosShown && state.pendingVideos !== null) {
    if (state.pendingVideos.length > 0) {
      showVideoResults({ videos: state.pendingVideos });
    } else {
      hideMediaResults('videos');
    }
    state.videosShown = true;
  }
}

function finalizePendingMedia(state) {
  if (!state.imagesShown) {
    hideMediaResults('images');
    state.imagesShown = true;
  }

  if (!state.videosShown) {
    hideMediaResults('videos');
    state.videosShown = true;
  }
}

function showStreamingTextStart(data, options = {}) {
  setResultActionsVisible(false);
  const messages = getMessages();
  const contentDiv = document.getElementById('ai-result-content');
  const container = document.getElementById('ai-result-container');
  if (!contentDiv) return;

  let html = renderResultBadges(data, messages);

  html += '<div class="ai-streaming-answer" aria-live="polite"></div>';
  contentDiv.innerHTML = html;

  if (container) {
    container.style.display = 'block';
    if (options.scroll !== false) {
      container.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }
}

function appendStreamingTextDelta(chunk, state) {
  state.streamedAnswer += chunk || '';
  const answerEl = document.querySelector('.ai-streaming-answer');
  if (answerEl) {
    answerEl.textContent = state.streamedAnswer;
  }
}

function finalizeStreamingText(event, state) {
  state.gotText = true;
  showResult(
    {
      answer: event.answer || state.streamedAnswer || '',
      usedWebSearch: event.usedWebSearch === true,
      sources: Array.isArray(event.sources) ? event.sources : [],
      answerEmpty: event.answerEmpty === true,
      attachmentUsed: event.attachmentUsed === true,
      attachmentName: event.attachmentName || null
    },
    { scroll: !state.didScroll }
  );
  state.didScroll = true;
  flushPendingMedia(state);
}

function handleAiSearchStreamEvent(event, state) {
  if (event.event === 'text_start') {
    state.streamingStarted = true;
    state.pendingTextStart = {
      usedWebSearch: event.usedWebSearch === true,
      sources: Array.isArray(event.sources) ? event.sources : [],
      attachmentUsed: event.attachmentUsed === true,
      attachmentName: event.attachmentName || null
    };
    return;
  }

  if (event.event === 'text_delta') {
    if (!state.firstTokenReceived) {
      state.firstTokenReceived = true;
      showStreamingTextStart(state.pendingTextStart || { usedWebSearch: true }, { scroll: !state.didScroll });
      state.didScroll = true;
      state.streamedAnswer = event.chunk || '';
      const answerEl = document.querySelector('.ai-streaming-answer');
      if (answerEl) {
        answerEl.textContent = state.streamedAnswer;
      }
      return;
    }

    appendStreamingTextDelta(event.chunk, state);
    return;
  }

  if (event.event === 'text_done') {
    if (state.streamingStarted) {
      finalizeStreamingText(event, state);
    } else {
      state.gotText = true;
      showResult(
        {
          answer: event.answer || '',
          usedWebSearch: event.usedWebSearch === true,
          sources: Array.isArray(event.sources) ? event.sources : [],
          answerEmpty: event.answerEmpty === true
        },
        { scroll: !state.didScroll }
      );
      state.didScroll = true;
      flushPendingMedia(state);
    }
    return;
  }

  if (event.event === 'error' && event.phase === 'text') {
    showResult({ error: event.error || getMessages().networkError }, { scroll: !state.didScroll });
    state.didScroll = true;
    return;
  }

  if (event.event === 'images') {
    state.pendingImages = Array.isArray(event.images) ? event.images : [];
    flushPendingMedia(state);
    return;
  }

  if (event.event === 'videos') {
    state.pendingVideos = Array.isArray(event.videos) ? event.videos : [];
    flushPendingMedia(state);
    return;
  }

  if (event.event === 'done') {
    flushPendingMedia(state);
    finalizePendingMedia(state);
    showSearchTimings(event.timings);
  }
}

// ======================================================================================================================
// ПОКАЗАТЬ РЕЗУЛЬТАТ ОТВЕТА ИИ
// ======================================================================================================================
function showResult(data, options = {}) {
  const t = getMessages();
  const contentDiv = document.getElementById('ai-result-content');
  const container = document.getElementById('ai-result-container');
  const shouldScroll = options.scroll !== false;
  let html = '';

  if (data.error) {
    html = `
      <div class="ai-error">
        <div class="error-icon">⚠️</div>
        <div class="error-message">${data.error}</div>
        <button class="retry-btn">
          ${t.retry}
        </button>
      </div>
    `;
  } else {
    const resolved = resolveAnswerForDisplay(data);

    html += renderResultBadges(data, t);

    html += renderAnswerHtml(resolved.text, resolved.isEmpty);

    if (
      data.usedWebSearch &&
      !resolved.isEmpty &&
      Array.isArray(data.sources) &&
      data.sources.length > 0
    ) {
      html += renderSourcesBlock(data.sources, t);
    }
  }

  contentDiv.innerHTML = html;
  setupSourcesToggle(contentDiv);
  setResultActionsVisible(!data.error);

  if (!data.error) {
    const resolved = resolveAnswerForDisplay(data);
    const searchInput = document.querySelector('#ai-search-form input[name="q"]');
    setShareContext(
      searchInput?.value.trim() || getQueryFromUrl(),
      resolved.text,
      resolved.isEmpty,
      data.usedWebSearch === true,
      { sources: data.sources || [] }
    );
  }

  if (container) {
    container.style.display = 'block';
    if (shouldScroll) {
      container.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  }

  setupActionButtons();
}

function showImageResults(data) {
  const t = getMessages();
  const container = document.getElementById('ai-image-results');
  if (!container) return;

  if (data.error || !Array.isArray(data.images) || data.images.length === 0) {
    container.style.display = 'none';
    container.innerHTML = '';
    lastShareContext.images = [];
    return;
  }

  lastShareContext.images = data.images.slice(0, 6);

  const itemsHtml = data.images
    .slice(0, 6)
    .map(img => {
      const title = img.title || '';
      const thumb = img.thumbnailUrl || img.imageUrl || '';
      const link = img.imageUrl || img.sourceUrl || '#';
      const source = img.sourceName || '';

      return `
        <a class="ai-image-card" href="${link}" target="_blank" rel="noopener">
          <div class="ai-image-thumb">
            <img src="${thumb}" alt="${title}">
          </div>
          <div class="ai-image-meta">
            <div class="ai-image-title">${title}</div>
            <div class="ai-image-source">${source}</div>
          </div>
        </a>
      `;
    })
    .join('');

  container.innerHTML = `
    <div class="ai-image-header">
      <span>${t.imagesHeader}</span>
    </div>
    <div class="ai-image-grid">
      ${itemsHtml}
    </div>
  `;
  container.style.display = 'block';
}

function showVideoResults(data) {
  const t = getMessages();
  const container = document.getElementById('ai-video-results');
  if (!container) return;

  if (data.error || !Array.isArray(data.videos) || data.videos.length === 0) {
    container.style.display = 'none';
    container.innerHTML = '';
    lastShareContext.videos = [];
    return;
  }

  lastShareContext.videos = data.videos.slice(0, 6);

  const itemsHtml = data.videos
    .slice(0, 6)
    .map(video => {
      const title = video.title || '';
      const thumb = video.thumbnailUrl || '';
      const link = video.videoUrl || video.sourceUrl || '#';
      const source = video.sourceName || '';
      const duration = video.duration || '';

      return `
        <a class="ai-video-card" href="${link}" target="_blank" rel="noopener">
          <div class="ai-video-thumb">
            <img src="${thumb}" alt="${title}">
            ${duration ? `<div class="ai-video-duration">${duration}</div>` : ''}
          </div>
          <div class="ai-video-meta">
            <div class="ai-video-title">${title}</div>
            <div class="ai-video-source">${source}</div>
          </div>
        </a>
      `;
    })
    .join('');

  container.innerHTML = `
    <div class="ai-video-header">
      <span>${t.videosHeader}</span>
    </div>
    <div class="ai-video-grid">
      ${itemsHtml}
    </div>
  `;
  container.style.display = 'block';
}

function showShareToast(message) {
  const toast = document.getElementById('ai-share-toast');
  if (!toast) return;
  toast.textContent = message;
  toast.style.display = 'block';
  toast.classList.add('visible');
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => {
      toast.style.display = 'none';
    }, 200);
  }, 2000);
}

// ======================================================================================================================
// НАСТРОЙКА ИНТЕРАКТИВНЫХ КНОПОК ДЕЙСТВИЙ
// ======================================================================================================================
function setupActionButtons() {
  const t = getMessages();

  // ── copy ──────────────────────────────────────────────────────────────
  const copyBtn = document.querySelector('.ai-action-btn[data-ai-action="copy"]');
  if (copyBtn && !copyBtn.dataset.initialized) {
    copyBtn.dataset.initialized = 'true';
    copyBtn.addEventListener('click', async () => {
      const payload = buildSharePayload();
      const content = payload.answerText || '';
      if (!content) {
        showShareToast(t.noTextToCopy);
        return;
      }

      try {
        await copyTextToClipboard(content);

        showShareToast(t.copied);
        copyBtn.dataset.state = 'copied';
        copyBtn.style.borderColor = '#10b981';
        setTimeout(() => {
          copyBtn.dataset.state = '';
          copyBtn.style.borderColor = '';
        }, 2000);
      } catch (err) {
        console.error('Ошибка копирования:', err);
        showShareToast(t.copyFailed);
      }
    });
  }

  // ── share ─────────────────────────────────────────────────────────────
  const shareBtn = document.querySelector('.ai-action-btn[data-ai-action="share"]');
  if (shareBtn && !shareBtn.dataset.initialized) {
    shareBtn.dataset.initialized = 'true';
    shareBtn.addEventListener('click', () => {
      const payload = buildSharePayload();

      if (!payload.answerText && !payload.query) {
        showShareToast(t.noTextToCopy);
        return;
      }

      const isVkMiniApp =
        window.location.hostname === 'vk.com' ||
        window.location.hostname.endsWith('.vk.com');

      if (isVkMiniApp && window.vkBridge && typeof window.vkBridge.send === 'function') {
        window.vkBridge
          .send('VKWebAppShare', { link: payload.pageUrl })
          .catch(err => {
            console.warn('VKWebAppShare error, fallback to web modal:', err);
            openWebShareModal(payload);
          });
        return;
      }

      openWebShareModal(payload);
    });
  }

  // ── retry ───────────────────────────────────────────────────────────
  const retryBtn = document.querySelector('.retry-btn');
  if (retryBtn) {
    retryBtn.addEventListener('click', () => {
      document.getElementById('ai-search-form')?.requestSubmit();
    });
  }

  // ── feedback ──────────────────────────────────────────────────────────
  document.querySelectorAll('.feedback-btn').forEach(btn => {
    if (btn.dataset.initialized) return;
    btn.dataset.initialized = 'true';
    btn.addEventListener('click', function () {
      const rating = this.classList.contains('like') ? 'like' : 'dislike';
      submitAiFeedback(rating, this);
    });
  });

  // ── openWebShareModal — внутри функции, как было ─────────────────────
  function openWebShareModal(payload) {
    const modal = document.getElementById('ai-share-modal');
    if (!modal) return;

    const messages = getMessages();
    const { pageUrl, shareText, answerText, shareTitle } = payload;
    const enc = encodeURIComponent;

    const dialog = modal.querySelector('.ai-share-dialog');
    const backdrop = modal.querySelector('.ai-share-backdrop');
    const quickTg = modal.querySelector('.ai-share-pill.ai-share-telegram');
    const quickVk = modal.querySelector('.ai-share-pill.ai-share-vk');
    const quickMax = modal.querySelector('.ai-share-pill.ai-share-max');
    const quickOk = modal.querySelector('.ai-share-pill.ai-share-ok');
    const urlInput = modal.querySelector('.ai-share-url-input');
    const copyBtn = modal.querySelector('.ai-share-copy-btn');

    if (urlInput) {
      urlInput.value = pageUrl;
    }

    if (copyBtn) {
      copyBtn.textContent = messages.shareCopyLink;
      copyBtn.onclick = async () => {
        try {
          await copyTextToClipboard(pageUrl);
          showShareToast(messages.shareLinkCopied);
        } catch (err) {
          console.error('Ошибка копирования ссылки:', err);
          showShareToast(messages.copyFailed);
        }
      };
    }

    if (quickTg) {
      quickTg.href =
        'https://t.me/share/url?url=' +
        enc(pageUrl) +
        '&text=' +
        enc(shareText);
    }

    if (quickVk) {
      quickVk.href =
        'https://vk.com/share.php?url=' +
        enc(pageUrl) +
        '&title=' +
        enc(shareTitle) +
        '&comment=' +
        enc(answerText || shareText);
    }

    if (quickMax) {
      quickMax.href = `https://max.ru/:share?text=${enc(shareText)}`;
    }

    if (quickOk) {
      quickOk.href =
        'https://connect.ok.ru/offer?url=' +
        enc(pageUrl) +
        '&title=' +
        enc(shareTitle) +
        '&description=' +
        enc(answerText || shareText);
    }

    const close = () => {
      modal.removeAttribute('data-open');
      setTimeout(() => { modal.style.display = 'none'; }, 150);
      document.removeEventListener('keydown', onEsc);
    };

    const onEsc = e => { if (e.key === 'Escape') close(); };
    if (backdrop) backdrop.onclick = close;

    modal.style.display = 'flex';
    modal.setAttribute('data-open', 'true');
    if (dialog) dialog.focus();
    document.addEventListener('keydown', onEsc);
  }

  initFindingsSave(() => ({ ...lastShareContext }));
}

// ======================================================================================================================
// РЕКЛАМНЫЙ БЛОК: VK → Yandex fallback (ad-pool.js)
// ======================================================================================================================
function initAdObserver() {
  initAdSlotObserver();
}

// ======================================================================================================================
// ИНИЦИАЛИЗАЦИЯ СТРАНИЦЫ
// ======================================================================================================================
async function initPage() {
  await loadMessages();

  // Больше НЕ падаем если #news-container нет — он опционален
  const newsContainer = document.getElementById('news-container');
  if (newsContainer) {
    newsContainer.addEventListener('click', function () {
      this.classList.toggle('expanded');
    });
  }

  function setupEventListeners() {
    const searchForm = document.getElementById('ai-search-form');
    const submitBtn = searchForm?.querySelector('button[type="submit"]');
    const searchInput = searchForm?.querySelector('input[name="q"]');

    if (!searchForm) {
      console.warn('[AI] Форма поиска не найдена');
      return;
    }

    let isSubmitting = false;
    let currentIdempotencyKey = null;

    searchForm.addEventListener('submit', async e => {
      e.preventDefault();
      e.stopPropagation();

      const isVoiceInput = searchInput?.dataset.voiceInput === 'true';
      if (isVoiceInput) {
        delete searchInput.dataset.voiceInput;
      }

      if (isSubmitting) {
        console.warn('[AI] ⛔ Запрос УЖЕ выполняется (isSubmitting=true), ИГНОРИРУЕМ');
        return;
      }

      const query = searchInput?.value.trim();
      if (!query) {
        return;
      }

      syncSearchQueryToUrl(query);

      isSubmitting = true;

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('is-loading');
      }

      showLoading();

      const container = document.getElementById('ai-result-container');
      if (container) {
        container.style.display = 'block';
      }

      showImageResults({ images: [] });
      showVideoResults({ videos: [] });

      const attachmentPayload = getSearchAttachmentPayload();
      const hasAttachment = Boolean(attachmentPayload.attachmentText);

      if (!hasAttachment) {
        showMediaLoading('images');
        showMediaLoading('videos');
      } else {
        hideMediaResults('images');
        hideMediaResults('videos');
      }

      let idempotencyKey = null;
      const useStream = getEnv() !== 'vk_mini';

      try {
        idempotencyKey = generateIdempotencyKey();
        currentIdempotencyKey = idempotencyKey;

        const locale = getCurrentLocale();
        const result = await requestAiSearch({
          query,
          idempotencyKey,
          locale,
          useStream,
          attachment: attachmentPayload
        });

        if (currentIdempotencyKey !== idempotencyKey) {
          console.warn('[AI] ⚠️ Обнаружен более новый запрос, игнорируем старый ответ');
          return;
        }

        if (result.mode === 'json') {
          const { response, data } = result;

          if (!response.ok) {
            if (data?.error) {
              showResult({ error: data.error });
            } else {
              throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            showImageResults({ images: [] });
            showVideoResults({ videos: [] });
            return;
          }

          showResult({
            answer: data?.answer || '',
            usedWebSearch: data?.usedWebSearch === true,
            sources: Array.isArray(data?.sources) ? data.sources : [],
            answerEmpty: data?.answerEmpty === true,
            attachmentUsed: data?.attachmentUsed === true,
            attachmentName: data?.attachmentName || null
          });

          if (Array.isArray(data?.images) && data.images.length > 0) {
            showImageResults({ images: data.images });
          } else {
            hideMediaResults('images');
          }

          if (Array.isArray(data?.videos) && data.videos.length > 0) {
            showVideoResults({ videos: data.videos });
          } else {
            hideMediaResults('videos');
          }

          showSearchTimings(data?.timings);
          return;
        }

        const streamState = createStreamState();

        await consumeAiSearchStream(result.response, event => {
          if (currentIdempotencyKey !== idempotencyKey) return;
          handleAiSearchStreamEvent(event, streamState);
        });

        if (!streamState.gotText && result.response.ok === false) {
          showResult({ error: getMessages().networkError });
        }

      } catch (error) {
        console.error('[AI] ❌ Ошибка при запросе к /ai-search:', error);

        showResult({
          error: getMessages().networkError
        });

        showImageResults({ images: [] });
        showVideoResults({ videos: [] });
      } finally {
        if (searchInput) {
          searchInput.placeholder = getMessages().askAnything;
        }

        const finishedKey = idempotencyKey;
        if (currentIdempotencyKey === finishedKey || currentIdempotencyKey === null) {
          isSubmitting = false;
          currentIdempotencyKey = null;
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('is-loading');
          }
        }
      }
    });

    initVoiceInput();
    initTxtAttachment();

    const sharedQuery = getQueryFromUrl();
    if (sharedQuery && searchInput) {
      searchInput.value = sharedQuery;
      requestAnimationFrame(() => {
        searchForm.requestSubmit();
      });
    }
  }

  async function loadPageData() {
    try {
      await Promise.allSettled([loadNews(), generateCombinedBackground()]);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    }
  }

  setupEventListeners();
  loadPageData();
  initAdObserver();
  showCookieBanner();
}

document.addEventListener('DOMContentLoaded', initPage);
