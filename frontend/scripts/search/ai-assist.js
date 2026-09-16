import { getMessages } from '../i18n-loader.js';
import { escapeHtml } from '../finding-content-render.js';
import { getSearchAnalyticsHeaders } from './env-analytics.js';
import { isQuotaError, quotaNoticeHtml } from './quota-result.js';

const chatHistory = [];

function getChatHistory() {
  return chatHistory.slice();
}

function resetChatHistory() {
  chatHistory.length = 0;
}

function renderChatThread(container, messages, options = {}) {
  if (!container) return;
  container.classList.add('ai-chat-thread');
  const msgs = getMessages();
  if (!messages.length && !options.waiting) {
    container.innerHTML = `<p class="ai-chat-empty">${escapeHtml(msgs.chatEmpty || msgs.askAnything || '')}</p>`;
    return;
  }
  const assistantLabel =
    msgs.chatRoleAssistant || (document.documentElement.lang === 'ru' ? 'Серпмонн' : 'Serpmonn');
  const userLabel =
    msgs.chatRoleUser || (document.documentElement.lang === 'ru' ? 'Вы' : 'You');
  const thinkingLabel = msgs.chatThinking || msgs.loading || '…';

  let html = (messages || [])
    .map((m) => {
      const role = m.role === 'assistant' ? 'assistant' : 'user';
      const label = role === 'assistant' ? assistantLabel : userLabel;
      return `<div class="ai-chat-msg ai-chat-msg--${role}">
        <div class="ai-chat-msg__role">${escapeHtml(label)}</div>
        <div class="ai-chat-msg__body">${escapeHtml(m.content)}</div>
      </div>`;
    })
    .join('');

  if (options.waiting) {
    html += `<div class="ai-chat-msg ai-chat-msg--assistant ai-chat-msg--thinking" aria-live="polite">
      <div class="ai-chat-msg__role">${escapeHtml(assistantLabel)}</div>
      <div class="ai-chat-msg__body ai-chat-thinking">
        <span class="ai-chat-thinking__label">${escapeHtml(thinkingLabel)}</span>
        <span class="loading-dots" aria-hidden="true"><span></span><span></span><span></span></span>
      </div>
    </div>`;
  }

  container.innerHTML = html;
  container.scrollTop = container.scrollHeight;
}

async function requestAiChat({ messages, locale }) {
  const response = await fetch('/ai-chat', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...getSearchAnalyticsHeaders(locale),
    },
    body: JSON.stringify({ messages, locale }),
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function runAiChat(query, { onRender } = {}) {
  const msgs = getMessages();
  const locale = document.documentElement.lang || 'ru';
  const content = String(query || '').trim();
  if (!content) return;

  chatHistory.push({ role: 'user', content });
  if (typeof onRender === 'function') onRender(chatHistory, { waiting: true });

  const { response, data } = await requestAiChat({ messages: chatHistory, locale });
  if (!response.ok) {
    chatHistory.pop();
    if (typeof onRender === 'function') onRender(chatHistory, { waiting: false });
    if (isQuotaError(data)) {
      throw Object.assign(new Error(data.error || 'limit'), { quota: data, status: response.status });
    }
    throw new Error(data.error || msgs.networkError || 'Chat failed');
  }

  const answer = String(data.answer || '').trim();
  chatHistory.push({ role: 'assistant', content: answer || msgs.emptyAnswer || '—' });
  if (typeof onRender === 'function') onRender(chatHistory, { waiting: false });
  return data;
}

async function requestAiImage({ prompt, locale }) {
  const response = await fetch('/ai-image', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...getSearchAnalyticsHeaders(locale),
    },
    body: JSON.stringify({ prompt, q: prompt, locale }),
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

function aiImageFileName(url) {
  try {
    const part = String(url || '').split('/').pop() || '';
    if (/^[a-f0-9-]{36}\.(jpg|jpeg|png|webp)$/i.test(part)) return part;
  } catch (_) {}
  return `serpmonn-ai-${Date.now()}.jpg`;
}

async function downloadAiImage(url, filename) {
  const name = filename || aiImageFileName(url);
  let absUrl = String(url || '');
  try {
    absUrl = new URL(absUrl, location.origin).href;
  } catch (_) {}

  if (window.SpnAndroid?.downloadFile) {
    try {
      const result = window.SpnAndroid.downloadFile(absUrl, name);
      if (String(result || '').startsWith('OK')) return true;
    } catch (_) { /* fall through */ }
  }

  try {
    const res = await fetch(absUrl, { credentials: 'include', cache: 'no-store' });
    if (!res.ok) throw new Error('http');
    const blob = await res.blob();
    if (!String(blob.type || '').startsWith('image/')) {
      throw new Error('not-image');
    }
    if (window.SpnAndroid?.downloadBlobBase64) {
      try {
        const b64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = String(reader.result || '');
            resolve(dataUrl.split(',')[1] || '');
          };
          reader.onerror = () => reject(reader.error || new Error('read'));
          reader.readAsDataURL(blob);
        });
        const result = window.SpnAndroid.downloadBlobBase64(b64, name, blob.type || '');
        if (String(result || '').startsWith('OK')) return true;
      } catch (_) { /* fall through */ }
    }
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => {
      try { URL.revokeObjectURL(blobUrl); } catch (_) {}
    }, 4000);
    return true;
  } catch (_) {
    const a = document.createElement('a');
    a.href = absUrl.includes('?') ? `${absUrl}&download=1` : `${absUrl}?download=1`;
    a.download = name;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    return false;
  }
}

function renderAiImageResult(container, data) {
  if (!container) return;
  const msgs = getMessages();
  if (data?.quota || isQuotaError(data)) {
    container.innerHTML = quotaNoticeHtml(data.quota || data, msgs, { meter: 'ai' });
    return;
  }
  const url = data?.imageUrl;
  if (!url) {
    container.innerHTML = `<p class="ai-image-error">${escapeHtml(data?.error || msgs.networkError || '')}</p>`;
    return;
  }
  const caption = data.caption || '';
  const fileName = aiImageFileName(url);
  container.innerHTML = `
    <div class="ai-image-result">
      <img src="${escapeHtml(url)}" alt="${escapeHtml(caption || msgs.modeImageLabel || 'image')}" decoding="async" loading="eager">
      ${caption ? `<p class="ai-image-caption">${escapeHtml(caption)}</p>` : ''}
      <button type="button" class="ai-image-download" data-ai-image-url="${escapeHtml(url)}" data-ai-image-name="${escapeHtml(fileName)}">${escapeHtml(msgs.downloadImage || 'Скачать')}</button>
    </div>`;
  const btn = container.querySelector('[data-ai-image-url]');
  if (btn) {
    btn.addEventListener('click', () => {
      downloadAiImage(btn.getAttribute('data-ai-image-url'), btn.getAttribute('data-ai-image-name'));
    });
  }
}

async function runAiImage(prompt) {
  const msgs = getMessages();
  const locale = document.documentElement.lang || 'ru';
  const text = String(prompt || '').trim();
  if (!text) return null;

  const { response, data } = await requestAiImage({ prompt: text, locale });
  if (!response.ok) {
    if (isQuotaError(data)) {
      throw Object.assign(new Error(data.error || 'limit'), { quota: data, status: response.status });
    }
    throw new Error(data.error || msgs.networkError || 'Image failed');
  }
  return data;
}

export {
  getChatHistory,
  resetChatHistory,
  renderChatThread,
  runAiChat,
  runAiImage,
  renderAiImageResult,
};
