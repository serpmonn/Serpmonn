import { getMessages } from '../i18n-loader.js';
import { escapeHtml } from '../finding-content-render.js';
import { searchState } from './state.js';
import { getCurrentLocale, getSearchAnalyticsHeaders } from './env-analytics.js';
import { showShareToast } from './quota-result.js';
import { setSearchMode, setActiveResultsTab, renderResultsMode } from './results-mode.js';

const ATTACHMENT_MAX_BYTES = 100 * 1024;
/** Лимит уже сжатого файла, который уходит на сервер. */
const ATTACHMENT_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
/** Сырой кадр с камеры часто 5–15 МБ — принимаем и сжимаем на клиенте. */
const ATTACHMENT_IMAGE_RAW_MAX_BYTES = 20 * 1024 * 1024;
const ATTACHMENT_IMAGE_MAX_EDGE = 1600;
const ATTACHMENT_ALLOWED_EXT = new Set([
  'txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'log', 'xml', 'html', 'htm', 'yaml', 'yml'
]);
const ATTACHMENT_IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif', 'heic', 'heif']);
const ATTACHMENT_ACCEPT =
  'image/*,.jpg,.jpeg,.png,.webp,.gif,.txt,.md,.markdown,.csv,.tsv,.json,.log,.xml,.html,.htm,.yaml,.yml,text/plain,text/markdown,text/csv,application/json,text/html,application/xml,text/xml';

function isImageAttachmentFile(file) {
  if (!file) return false;
  const ext = String(file.name || '').split('.').pop()?.toLowerCase() || '';
  if (ATTACHMENT_IMAGE_EXT.has(ext)) return true;
  const type = String(file.type || '').toLowerCase();
  if (!type.startsWith('image/')) return false;
  // Камера/галерея иногда отдаёт image/* или heic
  return true;
}

function isAllowedAttachmentFile(file) {
  if (!file) return false;
  if (isImageAttachmentFile(file)) return true;
  const ext = String(file.name || '').split('.').pop()?.toLowerCase() || '';
  if (ATTACHMENT_ALLOWED_EXT.has(ext)) return true;
  const type = String(file.type || '').toLowerCase();
  if (type.startsWith('text/')) return true;
  if (type === 'application/json' || type === 'application/xml' || type === 'text/xml') return true;
  return false;
}


function clearSearchAttachment() {
  if (searchState.searchAttachment?.previewUrl) {
    try {
      URL.revokeObjectURL(searchState.searchAttachment.previewUrl);
    } catch (_) {}
  }
  searchState.searchAttachment = null;
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

/**
 * Уменьшает фото с камеры до безопасного JPEG, чтобы телефон не падал по RAM
 * на полном кадре (даже для крошечного превью).
 */
async function compressImageForReverseSearch(file) {
  if (!file) throw new Error('no file');

  const maxEdge = ATTACHMENT_IMAGE_MAX_EDGE;
  let bitmap;
  try {
    // Даунскейл при декодировании — меньше пик RAM на кадрах 12 МП с телефона
    bitmap = await createImageBitmap(file, { resizeWidth: maxEdge });
    if (bitmap.height > maxEdge) {
      const scaled = await createImageBitmap(bitmap, { resizeHeight: maxEdge });
      bitmap.close();
      bitmap = scaled;
    }
  } catch (_) {
    try {
      bitmap = await createImageBitmap(file);
    } catch (err) {
      const err2 = new Error('decode failed');
      err2.cause = err;
      throw err2;
    }
  }

  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height, 1));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('no canvas');
    ctx.drawImage(bitmap, 0, 0, width, height);

    let quality = 0.85;
    let blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    while (blob && blob.size > ATTACHMENT_IMAGE_MAX_BYTES && quality > 0.45) {
      quality -= 0.1;
      blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    }

    if (blob && blob.size > ATTACHMENT_IMAGE_MAX_BYTES) {
      const scale2 = Math.sqrt(ATTACHMENT_IMAGE_MAX_BYTES / blob.size) * 0.95;
      const w2 = Math.max(1, Math.round(width * scale2));
      const h2 = Math.max(1, Math.round(height * scale2));
      canvas.width = w2;
      canvas.height = h2;
      ctx.drawImage(bitmap, 0, 0, w2, h2);
      blob = await canvasToBlob(canvas, 'image/jpeg', 0.75);
    }

    if (!blob) throw new Error('toBlob failed');
    if (blob.size > ATTACHMENT_IMAGE_MAX_BYTES) {
      const err = new Error('still too large');
      err.code = 'TOO_LARGE';
      throw err;
    }

    const baseName = String(file.name || 'photo')
      .replace(/\.[^.]+$/, '')
      .replace(/[^\w.-]+/g, '_')
      .slice(0, 40) || 'photo';
    return new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now()
    });
  } finally {
    try {
      bitmap.close();
    } catch (_) {}
  }
}

function initTxtAttachment() {
  const attachBtn = document.getElementById('attach-txt-btn');
  const fileInput = document.getElementById('attach-txt-input');
  if (!attachBtn || !fileInput) return;

  fileInput.accept = ATTACHMENT_ACCEPT;

  // Фото без текста в запросе — HTML required блокировал бы Enter
  const searchInput = document.querySelector('#ai-search-form input[name="q"]');
  if (searchInput) searchInput.required = false;

  const messages = getMessages();
  attachBtn.title = messages.attachFileTitle;
  attachBtn.setAttribute('aria-label', messages.attachFileLabel);

  attachBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;

    if (!isAllowedAttachmentFile(file)) {
      showShareToast(messages.attachmentInvalidType);
      return;
    }

    const isImage = isImageAttachmentFile(file);
    if (!isImage) {
      if (file.size > ATTACHMENT_MAX_BYTES) {
        showShareToast(messages.attachmentTooLarge);
        return;
      }
      try {
        clearSearchAttachment();
        const text = await file.text();
        if (!text.trim()) {
          showShareToast(messages.attachmentInvalidType);
          return;
        }
        searchState.searchAttachment = {
          kind: 'text',
          name: file.name,
          text
        };
        renderAttachmentPreview();
      } catch (error) {
        console.warn('[attach] read failed:', error);
        showShareToast(messages.attachmentInvalidType);
      }
      return;
    }

    if (file.size > ATTACHMENT_IMAGE_RAW_MAX_BYTES) {
      showShareToast(messages.reverseImageTooLarge || messages.attachmentTooLarge);
      return;
    }

    try {
      clearSearchAttachment();
      // Сразу сжимаем — иначе img-превью декодирует полный кадр и телефон падает по RAM
      const compressed = await compressImageForReverseSearch(file);
      searchState.searchAttachment = {
        kind: 'image',
        name: compressed.name,
        file: compressed,
        previewUrl: URL.createObjectURL(compressed)
      };
      renderAttachmentPreview();
      // Сразу запускаем поиск по фото (без обязательного Enter)
      document.getElementById('ai-search-form')?.requestSubmit();
    } catch (error) {
      console.warn('[attach] image compress failed:', error);
      showShareToast(
        error?.code === 'TOO_LARGE'
          ? messages.reverseImageTooLarge || messages.attachmentTooLarge
          : messages.reverseImageInvalid || messages.attachmentInvalidType
      );
    }
  });
}

function renderAttachmentPreview() {
  const preview = document.getElementById('search-attachment-preview');
  const attachBtn = document.getElementById('attach-txt-btn');
  const messages = getMessages();

  if (!preview) return;

  if (!searchState.searchAttachment) {
    preview.hidden = true;
    preview.innerHTML = '';
    attachBtn?.classList.remove('has-file');
    return;
  }

  attachBtn?.classList.add('has-file');
  preview.hidden = false;

  const isImage = searchState.searchAttachment.kind === 'image' && searchState.searchAttachment.previewUrl;
  const iconHtml = isImage
    ? `<img class="search-attachment-thumb" src="${escapeHtml(searchState.searchAttachment.previewUrl)}" alt="" />`
    : `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <path d="M14 2v6h6"/>
      </svg>`;

  preview.innerHTML = `
    <span class="search-attachment-chip${isImage ? ' is-image' : ''}">
      ${iconHtml}
      <span class="search-attachment-name">${escapeHtml(searchState.searchAttachment.name)}</span>
      <button type="button" class="search-attachment-remove" aria-label="${escapeHtml(messages.attachmentRemoveLabel)}">&times;</button>
    </span>
  `;

  preview.querySelector('.search-attachment-remove')?.addEventListener('click', () => {
    clearSearchAttachment();
    renderAttachmentPreview();
  });
}

function getSearchAttachmentPayload() {
  if (searchState.searchAttachment?.kind !== 'text' || !searchState.searchAttachment?.text) {
    return {};
  }

  return {
    attachmentText: searchState.searchAttachment.text,
    attachmentName: searchState.searchAttachment.name
  };
}

function hasImageAttachment() {
  return searchState.searchAttachment?.kind === 'image' && Boolean(searchState.searchAttachment.file);
}

async function requestReverseImageSearch({ file, locale }) {
  const body = new FormData();
  body.append('image', file, file.name || 'image.jpg');
  if (locale) body.append('locale', locale);

  const response = await fetch('/web-search/reverse-image', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      ...getSearchAnalyticsHeaders()
    },
    credentials: 'same-origin',
    body
  });

  let data = null;
  try {
    data = await response.json();
  } catch (_) {
    data = null;
  }

  return { response, data };
}

async function runReverseImageSearch() {
  const messages = getMessages();
  const file = searchState.searchAttachment?.file;
  if (!file) {
    throw new Error('no image');
  }

  setSearchMode('results');
  searchState.currentResultsCategory = 'general';
  setActiveResultsTab('general');

  const contentDiv = document.getElementById('ai-result-content');
  const container = document.getElementById('ai-result-container');
  const tabs = document.getElementById('results-tabs');
  if (container) {
    container.style.display = 'block';
    container.classList.add('is-results-mode');
  }
  if (tabs) tabs.hidden = false;
  if (contentDiv) {
    contentDiv.innerHTML = `<div class="results-loading">${escapeHtml(
      messages.reverseImageSearching || messages.loading || 'Searching…'
    )}</div>`;
  }

  const { response, data } = await requestReverseImageSearch({
    file,
    locale: getCurrentLocale()
  });

  const category = data?.category || 'general';
  searchState.currentResultsCategory = category;

  if (!response.ok) {
    renderResultsMode({
      category,
      results: [],
      error:
        data?.error ||
        messages.reverseImageError ||
        messages.resultsNetworkError ||
        messages.networkError,
      quota: data
    });
    return data;
  }

  const results = Array.isArray(data?.results) ? data.results : [];
  renderResultsMode({
    category,
    results,
    emptyText:
      results.length === 0
        ? data?.error || messages.reverseImageEmpty || messages.resultsEmpty
        : undefined
  });
  return data;
}

export {
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_IMAGE_MAX_BYTES,
  ATTACHMENT_IMAGE_RAW_MAX_BYTES,
  ATTACHMENT_IMAGE_MAX_EDGE,
  ATTACHMENT_ALLOWED_EXT,
  ATTACHMENT_IMAGE_EXT,
  ATTACHMENT_ACCEPT,
  isImageAttachmentFile,
  isAllowedAttachmentFile,
  clearSearchAttachment,
  canvasToBlob,
  compressImageForReverseSearch,
  initTxtAttachment,
  renderAttachmentPreview,
  getSearchAttachmentPayload,
  hasImageAttachment,
  requestReverseImageSearch,
  runReverseImageSearch
};
