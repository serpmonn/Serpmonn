import { loadMessages, getMessages } from './i18n-loader.js';
import { showCookieBanner } from './cookies.js';
import { loadNews } from './news.js';
import { generateCombinedBackground } from './backgroundGenerator.js';
import '/frontend/pwa/app.js';

// scripts.js

export function getEnv() {
  const ua = navigator.userAgent || '';

  const isStandalonePWA =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  const params = new URLSearchParams(window.location.search);
  const envParam = params.get('env') || '';

  if (envParam === 'vk_mini' || location.host.includes('vk.com')) return 'vk_mini';
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

// ======================================================================================================================
// ИЗВЛЕЧЕНИЕ ССЫЛОК ИЗ HTML-ТЕКСТа
// ======================================================================================================================
function extractLinks(text) {
  const linkRegex = /<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g;
  const links = [];
  let match;

  while ((match = linkRegex.exec(text)) !== null) {
    try {
      const url = new URL(match[1]);
      links.push({
        url: match[1],
        text: match[2] || match[1]
      });
    } catch (e) {
      console.warn('Невалидный URL:', match[1]);
    }
  }

  return links.slice(0, 3);
}

// ======================================================================================================================
// ПОКАЗАТЬ АНИМАЦИЮ ЗАГРУЗКИ
// ======================================================================================================================
function showLoading() {
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
    timestampDiv.textContent = new Date().toLocaleTimeString(getCurrentLanguageTag(), {
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}

// ======================================================================================================================
// ПОКАЗАТЬ РЕЗУЛЬТАТ ОТВЕТА ИИ
// ======================================================================================================================
function showResult(data) {
  const t = getMessages();
  const contentDiv = document.getElementById('ai-result-content');
  const container = document.getElementById('ai-result-container');
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
    const answer = data.answer || '';

    if (data.usedWebSearch) {
      html += `
        <div class="ai-search-badge">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zM9.5 14C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          ${t.webSearchUsed}
        </div>
      `;
    }

    html += renderMarkdown(answer);

    if (Array.isArray(data.sources) && data.sources.length > 0) {
      html += `
        <div class="ai-sources">
          <div class="sources-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            ${t.sources}
          </div>
          ${
            data.sources
              .slice(0, 4)
              .map(src => {
                let hostname = '';
                try { hostname = new URL(src.link).hostname; } catch (e) {}
                return `
                  <a href="${src.link}" target="_blank" rel="noopener" class="source-item">
                    <img src="https://www.google.com/s2/favicons?domain=${hostname}&sz=16" 
                         class="source-favicon" alt="">
                    <span class="source-title">${src.title || src.link}</span>
                    <span class="source-url">${hostname}</span>
                  </a>
                `;
              })
              .join('')
          }
        </div>
      `;
    } else {
      const links = extractLinks(html);
      if (links.length > 0) {
        html += `
          <div class="ai-sources">
            <div class="sources-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
              ${t.sources}
            </div>
            ${
              links.map(link => {
                let hostname = '';
                try { hostname = new URL(link.url).hostname; } catch (e) {}
                return `
                  <a href="${link.url}" target="_blank" rel="noopener" class="source-item">
                    <img src="https://www.google.com/s2/favicons?domain=${hostname}&sz=16" 
                         class="source-favicon" alt="">
                    <span class="source-title">${link.text || link.url}</span>
                    <span class="source-url">${hostname}</span>
                  </a>
                `;
              }).join('')
            }
          </div>
        `;
      }
    }
  }

  contentDiv.innerHTML = html;

  if (container) {
    container.style.display = 'block';
    container.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
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
    return;
  }

  const itemsHtml = data.images
    .slice(0, 24)
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
    return;
  }

  const itemsHtml = data.videos
    .slice(0, 18)
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
      const contentEl = document.getElementById('ai-result-content');
      const content = contentEl?.textContent.trim() || '';
      if (!content) {
        showShareToast(t.noTextToCopy);
        return;
      }

      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(content);
        } else {
          const tmp = document.createElement('textarea');
          tmp.value = content;
          document.body.appendChild(tmp);
          tmp.select();
          document.execCommand('copy');
          document.body.removeChild(tmp);
        }

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
      const resultEl = document.getElementById('ai-result-content');
      if (!resultEl) return;

      const pageUrl = window.location.href.split('#')[0];
      const answerText =
        resultEl.textContent.trim().substring(0, 300) || t.shareTitleDefault;

      const isVkMiniApp =
        window.location.hostname === 'vk.com' ||
        window.location.hostname.endsWith('.vk.com');

      if (isVkMiniApp && window.vkBridge && typeof window.vkBridge.send === 'function') {
        window.vkBridge
          .send('VKWebAppShare', { link: pageUrl })
          .catch(err => {
            console.warn('VKWebAppShare error, fallback to web modal:', err);
            openWebShareModal(pageUrl, answerText);
          });
        return;
      }

      openWebShareModal(pageUrl, answerText);
    });
  }

  // ── feedback ──────────────────────────────────────────────────────────
  document.querySelectorAll('.feedback-btn').forEach(btn => {
    if (btn.dataset.initialized) return;
    btn.dataset.initialized = 'true';
    btn.addEventListener('click', function () {
      const isLike = this.classList.contains('like');
      this.style.background = isLike ? '#ecfdf5' : '#fef2f2';
      this.style.borderColor = isLike ? '#10b981' : '#ef4444';
      this.style.color = isLike ? '#047857' : '#dc2626';
      setTimeout(() => {
        this.style.background = '';
        this.style.borderColor = '';
        this.style.color = '';
      }, 3000);
    });
  });

  // ── openWebShareModal — внутри функции, как было ─────────────────────
  function openWebShareModal(pageUrl, answerText) {
    const modal = document.getElementById('ai-share-modal');
    if (!modal) return;

    const dialog = modal.querySelector('.ai-share-dialog');
    const backdrop = modal.querySelector('.ai-share-backdrop');
    const quickTg = modal.querySelector('.ai-share-pill.ai-share-telegram');
    const quickVk = modal.querySelector('.ai-share-pill.ai-share-vk');

    const tgUrl =
      'https://t.me/share/url?url=' +
      encodeURIComponent(pageUrl) +
      '&text=' +
      encodeURIComponent(answerText);

    const vkUrl =
      'https://vk.com/share.php?url=' +
      encodeURIComponent(pageUrl) +
      '&title=' +
      encodeURIComponent(t.shareTitleDefault) +
      '&comment=' +
      encodeURIComponent(answerText);

    if (quickTg) quickTg.onclick = () => window.open(tgUrl, '_blank', 'noopener');
    if (quickVk) quickVk.onclick = () => window.open(vkUrl, '_blank', 'noopener');

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
}

// ======================================================================================================================
// РЕКЛАМНЫЙ БЛОК: ОБРАБОТКА ins.mrg-tag
// ======================================================================================================================
function handleIns(ins) {
  if (!ins || ins.__handled) return;
  ins.__handled = true;

  setTimeout(function () {
    const has = !!ins.querySelector('iframe');
    if (!has) {
      (window.MRGtag = window.MRGtag || []).push({});
    }
    setTimeout(function () {
      if (!ins.querySelector('iframe')) {
        const p = ins.closest(
          '.ad-top-banner,.ad-leaderboard,.promo-ad-inline,#mobile-anchor-ad'
        );
        if (p) p.style.display = 'none';
      }
    }, 2000);
  }, 2000);
}

function initAdObserver() {
  document.querySelectorAll('ins.mrg-tag').forEach(handleIns);

  const mo = new MutationObserver(function (muts) {
    muts.forEach(function (m) {
      m.addedNodes &&
        m.addedNodes.forEach(function (n) {
          if (n.querySelectorAll) {
            n.querySelectorAll('ins.mrg-tag').forEach(handleIns);
          }
        });
    });
  });

  mo.observe(document.documentElement, { childList: true, subtree: true });
}

// ======================================================================================================================
// ИНИЦИАЛИЗАЦИЯ СТРАНИЦЫ
// ======================================================================================================================
async function initPage() {
  await loadMessages();
  const newsContainer = document.getElementById('news-container');
  if (!newsContainer) {
    console.error('Не найден контейнер новостей');
    return;
  }

  function setupEventListeners() {
    const newsContainer = document.getElementById('news-container');
    if (newsContainer) {
      newsContainer.addEventListener('click', function () {
        this.classList.toggle('expanded');
      });
    }

    const searchForm = document.getElementById('ai-search-form');
    const submitBtn = searchForm?.querySelector('button[type="submit"]');
    const searchInput = searchForm?.querySelector('input[name="q"]');

    if (!searchForm) {
      console.warn('[AI] Форма поиска не найдена');
      return;
    }

    let isSubmitting = false;
    let lastSubmitTime = 0;
    let currentIdempotencyKey = null;

    searchForm.addEventListener('submit', async e => {
      e.preventDefault();
      e.stopPropagation();

      const isVoiceInput = searchInput?.dataset.voiceInput === 'true';
      if (isVoiceInput) {
        delete searchInput.dataset.voiceInput;
      }

      const now = Date.now();

      if (isSubmitting) {
        console.warn('[AI] ⛔ Запрос УЖЕ выполняется (isSubmitting=true), ИГНОРИРУЕМ');
        return;
      }

      if (now - lastSubmitTime < 3000) {
        console.warn(`[AI] ⛔ Слишком частая отправка (прошло ${now - lastSubmitTime}мс), ИГНОРИРУЕМ`);
        return;
      }

      const query = searchInput?.value.trim();
      if (!query) {
        return;
      }

      isSubmitting = true;
      lastSubmitTime = now;

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

      const idempotencyKey = generateIdempotencyKey();
      currentIdempotencyKey = idempotencyKey;
      
      try {
        const mode = 'full';
        const include = {
          text: true,
          images: true,
          videos: true
        };

        const locale = getCurrentLocale();

        const response = await fetch('/ai-search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'X-Idempotency-Key': idempotencyKey,
            'X-User-Lang': locale
          },
          credentials: 'include',
          body: JSON.stringify({
            q: query,
            include,
            mode,
            lang: locale
          })
        });

        if (currentIdempotencyKey !== idempotencyKey) {
          console.warn('[AI] ⚠️ Обнаружен более новый запрос, игнорируем старый ответ');
          return;
        }

        const data = await response.json().catch(() => null);

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
          sources: Array.isArray(data?.sources) ? data.sources : []
        });

        showImageResults({
          images: Array.isArray(data?.images) ? data.images : []
        });

        showVideoResults({
          videos: Array.isArray(data?.videos) ? data.videos : []
        });

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

      setTimeout(() => {
        // Сбрасываем только если это всё ещё наш запрос
        if (currentIdempotencyKey === idempotencyKey || currentIdempotencyKey === null) {
          isSubmitting = false;
          currentIdempotencyKey = null;
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('is-loading');
          }
        }
      }, 2000);
    }
    });

    initVoiceInput();
  }

  async function loadPageData() {
    const newsContainer = document.getElementById('news-container');
    if (newsContainer) {
      newsContainer.addEventListener('click', function () {
        this.classList.toggle('expanded');
      });
    }
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