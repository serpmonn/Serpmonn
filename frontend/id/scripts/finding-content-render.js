export function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function excerptAnswerPreview(source) {
  if (!source) return '';
  if (typeof source === 'string' && !source.trimStart().startsWith('{')) {
    const text = source.replace(/\s+/g, ' ').trim();
    return text.length > 220 ? `${text.slice(0, 217)}…` : text;
  }
  try {
    const data = typeof source === 'string' ? JSON.parse(source) : source;
    const text = String(data?.answer?.text || '').replace(/\s+/g, ' ').trim();
    if (!text) return '';
    return text.length > 220 ? `${text.slice(0, 217)}…` : text;
  } catch {
    return '';
  }
}

function getSourceHostname(link) {
  try {
    return new URL(link).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function getSourceFaviconUrl(hostname, size = 32) {
  if (!hostname) return '';
  return `https://www.google.com/s2/favicons?domain=${hostname}&sz=${size}`;
}

function normalizeSourceItems(items) {
  return items
    .slice(0, 12)
    .map((item) => ({
      link: item.link || item.url || '',
      title: item.title || item.text || item.link || item.url || '',
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

function renderSourceChips(sources) {
  const chipSources = dedupeSourcesByHostname(sources);
  const hostnameCounts = buildSourceHostnameCounts(sources);
  return chipSources
    .map((src) => {
      const hostname = src.hostname || getSourceHostname(src.link);
      const favicon = getSourceFaviconUrl(hostname, 32);
      const count = hostnameCounts.get(hostname || src.link) || 1;
      const chipTitle =
        count > 1 ? `${hostname} (${count})` : escapeHtml(src.title || hostname);

      return `
        <a href="${escapeHtml(src.link)}" target="_blank" rel="noopener noreferrer" class="ai-source-chip" title="${chipTitle}">
          <img src="${favicon}" class="ai-source-chip-favicon" alt="" width="14" height="14" loading="lazy">
        </a>
      `;
    })
    .join('');
}

function renderSourceListItems(sources) {
  return sources
    .map((src) => {
      const hostname = getSourceHostname(src.link);
      const favicon = getSourceFaviconUrl(hostname, 16);
      return `
        <a href="${escapeHtml(src.link)}" target="_blank" rel="noopener noreferrer" class="source-item">
          <img src="${favicon}" class="source-favicon" alt="" width="16" height="16" loading="lazy">
          <span class="source-title">${escapeHtml(src.title)}</span>
          <span class="source-url">${escapeHtml(hostname)}</span>
        </a>
      `;
    })
    .join('');
}

function renderImageGrid(images) {
  if (!Array.isArray(images) || !images.length) return '';
  const cards = images
    .slice(0, 6)
    .map((img) => {
      const title = escapeHtml(img.title || '');
      const thumb = escapeHtml(img.thumbnailUrl || img.imageUrl || '');
      const link = escapeHtml(img.imageUrl || img.sourceUrl || '#');
      const source = escapeHtml(img.sourceName || '');
      return `
        <a class="ai-image-card" href="${link}" target="_blank" rel="noopener noreferrer">
          <div class="ai-image-thumb">
            <img src="${thumb}" alt="${title}" loading="lazy">
          </div>
          <div class="ai-image-meta">
            <div class="ai-image-title">${title}</div>
            <div class="ai-image-source">${source}</div>
          </div>
        </a>`;
    })
    .join('');
  return `
    <div class="finding-details-section finding-details-section--images">
      <div class="ai-image-grid">${cards}</div>
    </div>`;
}

function renderVideoGrid(videos) {
  if (!Array.isArray(videos) || !videos.length) return '';
  const cards = videos
    .slice(0, 6)
    .map((video) => {
      const title = escapeHtml(video.title || '');
      const thumb = escapeHtml(video.thumbnailUrl || '');
      const link = escapeHtml(video.videoUrl || video.sourceUrl || '#');
      const source = escapeHtml(video.sourceName || '');
      const duration = escapeHtml(video.duration || '');
      return `
        <a class="ai-video-card" href="${link}" target="_blank" rel="noopener noreferrer">
          <div class="ai-video-thumb">
            <img src="${thumb}" alt="${title}" loading="lazy">
            ${duration ? `<div class="ai-video-duration">${duration}</div>` : ''}
          </div>
          <div class="ai-video-meta">
            <div class="ai-video-title">${title}</div>
            <div class="ai-video-source">${source}</div>
          </div>
        </a>`;
    })
    .join('');
  return `
    <div class="finding-details-section finding-details-section--videos">
      <div class="ai-video-grid">${cards}</div>
    </div>`;
}

function renderDetailsBlock({ sources, images, videos, t, detailsListId }) {
  const normalizedSources = normalizeSourceItems(sources);
  const hasSources = normalizedSources.length > 0;
  const hasImages = Array.isArray(images) && images.length > 0;
  const hasVideos = Array.isArray(videos) && videos.length > 0;

  if (!hasSources && !hasImages && !hasVideos) return '';

  const chipsHtml = hasSources ? renderSourceChips(normalizedSources) : '';
  const bodyParts = [];

  if (hasSources) {
    bodyParts.push(`
      <div class="finding-details-section finding-details-section--sources">
        ${renderSourceListItems(normalizedSources)}
      </div>`);
  }
  if (hasImages) bodyParts.push(renderImageGrid(images));
  if (hasVideos) bodyParts.push(renderVideoGrid(videos));

  return `
    <div class="ai-sources finding-collapsible finding-details-block">
      <div class="ai-sources-bar finding-collapsible-bar">
        ${chipsHtml ? `<div class="ai-sources-chips">${chipsHtml}</div>` : '<div class="ai-sources-chips"></div>'}
        <button type="button" class="ai-sources-toggle finding-collapsible-toggle" aria-expanded="false" aria-controls="${detailsListId}">
          <span class="ai-sources-toggle-label">${escapeHtml(t('detailsLabel'))}</span>
          <svg class="ai-sources-chevron" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>
          </svg>
        </button>
      </div>
      <div id="${detailsListId}" class="ai-sources-list finding-collapsible-body finding-details-body" hidden>
        ${bodyParts.join('')}
      </div>
    </div>
  `;
}

export function setupFindingToggles(root) {
  if (!root) return;

  root.querySelectorAll('.finding-collapsible, .ai-sources, .finding-details-block').forEach((block) => {
    const toggle = block.querySelector('.finding-collapsible-toggle, .ai-sources-toggle');
    const body = block.querySelector('.finding-collapsible-body, .ai-sources-list');
    if (!toggle || !body || toggle.dataset.boundToggle) return;
    toggle.dataset.boundToggle = 'true';

    toggle.addEventListener('click', () => {
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      const nextExpanded = !expanded;
      toggle.setAttribute('aria-expanded', nextExpanded ? 'true' : 'false');
      body.hidden = !nextExpanded;
      block.classList.toggle('is-expanded', nextExpanded);
    });
  });
}

export function setupSourcesToggle(root) {
  setupFindingToggles(root);
}

export function renderFindingContent({
  rootEl,
  imageEl,
  videoEl,
  data,
  t,
  sourcesListId = 'finding-details-list',
}) {
  const snap = data.snapshot || {};
  const answerText = snap.answer?.text || '';
  const query = data.query || '';
  const author = data.author ? `@${data.author}` : '';
  const createdAt = data.createdAt
    ? new Date(data.createdAt).toLocaleString(document.documentElement.lang || 'ru')
    : '';

  const images = snap.media?.images || [];
  const videos = snap.media?.videos || [];
  const sources = snap.sources || [];
  const isOwner = data.isOwner === true || data.is_owner === true;

  if (rootEl) {
    rootEl.innerHTML = `
      ${isOwner ? `<div class="finding-view-badge">${escapeHtml(t('savedFindingLabel'))}</div>` : ''}
      <div class="finding-view-meta">${[
        author ? `${escapeHtml(t('authorLabel'))}: ${escapeHtml(author)}` : '',
        escapeHtml(createdAt),
      ].filter(Boolean).join(' · ')}</div>
      ${query ? `<div class="finding-panel-query">${escapeHtml(query)}</div>` : ''}
      <div class="finding-view-answer">${escapeHtml(answerText).replace(/\n/g, '<br>')}</div>
      ${renderDetailsBlock({ sources, images, videos, t, detailsListId: sourcesListId })}
    `;
    setupFindingToggles(rootEl);
  }

  if (imageEl) {
    imageEl.innerHTML = '';
    imageEl.style.display = 'none';
  }
  if (videoEl) {
    videoEl.innerHTML = '';
    videoEl.style.display = 'none';
  }

  return { query, publicId: data.publicId || data.public_id };
}
