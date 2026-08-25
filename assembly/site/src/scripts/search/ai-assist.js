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
  container.innerHTML = `
    <div class="ai-image-result">
      <img src="${escapeHtml(url)}" alt="${escapeHtml(caption || msgs.modeImageLabel || 'image')}" loading="lazy">
      ${caption ? `<p class="ai-image-caption">${escapeHtml(caption)}</p>` : ''}
      <a class="ai-image-download" href="${escapeHtml(url)}" download>${escapeHtml(msgs.downloadImage || 'Скачать')}</a>
    </div>`;
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
