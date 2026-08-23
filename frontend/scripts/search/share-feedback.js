import { getMessages, t } from '../i18n-loader.js';
import { initFindingsSave } from '../findings-client.js';
import { searchState } from './state.js';
import { getCurrentLocale, getQueryFromUrl } from './env-analytics.js';
import { buildSharePageUrl } from './mode-filters.js';
import { showShareToast } from './quota-result.js';

function setShareContext(query, answer, answerEmpty = false, usedWebSearch = false, extras = {}) {
  searchState.lastShareContext = {
    query: (query || '').trim(),
    answer: (answer || '').trim(),
    answerEmpty: !!answerEmpty,
    usedWebSearch: !!usedWebSearch,
    sources: Array.isArray(extras.sources) ? extras.sources : [],
    images: Array.isArray(extras.images) ? extras.images : searchState.lastShareContext.images,
    videos: Array.isArray(extras.videos) ? extras.videos : searchState.lastShareContext.videos,
    timings: extras.timings !== undefined ? extras.timings : searchState.lastShareContext.timings
  };
  searchState.feedbackLocked = false;
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
  if (searchState.feedbackLocked) return;

  const { query, answer, answerEmpty } = searchState.lastShareContext;
  if (!answer && answerEmpty) return;

  searchState.feedbackLocked = true;
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
        usedWebSearch: searchState.lastShareContext.usedWebSearch === true,
        locale: getCurrentLocale()
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    console.warn('[AI feedback] save failed:', error);
    searchState.feedbackLocked = false;
    resetFeedbackButtons();
  }
}

function buildSharePayload() {
  const messages = getMessages();
  const { query, answer, answerEmpty } = searchState.lastShareContext;
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
  const brandName = getCurrentLocale() === 'ru' ? 'Серпмонн' : 'Serpmonn';
  const shareTitle = query ? `${brandName}: ${query}` : messages.shareTitleDefault;

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

function getVkBridge() {
  return window.vkBridge || window.bridge || null;
}

async function shareViaVkMini(payload) {
  const appId = (window.__SPN_MINI_CFG__ && window.__SPN_MINI_CFG__.appId) || '54486769';
  const link = `https://vk.com/app${appId}`;
  const message = [payload.query && `Вопрос: ${payload.query}`, payload.answerText, link]
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 2800);

  const bridge = getVkBridge();
  if (bridge && typeof bridge.send === 'function') {
    try {
      await bridge.send('VKWebAppShare', { link });
      showShareToast(getMessages().shared || 'Готово');
      return true;
    } catch (err) {
      console.warn('VKWebAppShare failed', err);
    }

    try {
      await bridge.send('VKWebAppShowWallPostBox', { message });
      showShareToast(getMessages().shared || 'Готово');
      return true;
    } catch (err) {
      console.warn('VKWebAppShowWallPostBox failed', err);
    }
  }

  try {
    if (navigator.share) {
      await navigator.share({
        title: payload.shareTitle || (getCurrentLocale() === 'ru' ? 'Серпмонн' : 'Serpmonn'),
        text: payload.answerText || payload.query || '',
        url: link
      });
      showShareToast(getMessages().shared || 'Готово');
      return true;
    }
  } catch (err) {
    if (err && err.name === 'AbortError') return true;
    console.warn('navigator.share failed', err);
  }

  try {
    await copyTextToClipboard(message || link);
    showShareToast(getMessages().copied || 'Ссылка скопирована');
    return true;
  } catch (err) {
    console.warn('share clipboard failed', err);
    return false;
  }
}

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
    shareBtn.addEventListener('click', async () => {
      const payload = buildSharePayload();

      if (!payload.answerText && !payload.query) {
        showShareToast(t.noTextToCopy);
        return;
      }

      const isVkMiniApp =
        Boolean(window.__SPN_VK_MINI__) ||
        /vk_app_id=\d+/.test(window.location.search) ||
        /(?:^|[?&])vk_mini=1(?:&|$)/.test(window.location.search) ||
        window.location.hostname === 'vk.com' ||
        window.location.hostname.endsWith('.vk.com');

      if (isVkMiniApp) {
        const ok = await shareViaVkMini(payload);
        if (!ok) {
          showShareToast(t.shareFailed || 'Не удалось поделиться');
        }
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

  initFindingsSave(() => ({ ...searchState.lastShareContext }));
}

export {
  setShareContext,
  resetFeedbackButtons,
  highlightFeedbackButton,
  submitAiFeedback,
  buildSharePayload,
  copyTextToClipboard,
  getVkBridge,
  shareViaVkMini,
  setupActionButtons
};
