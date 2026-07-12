export function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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

export function renderSourcesBlock(items, sourcesLabel, listId = 'finding-sources-list') {
  const sources = normalizeSourceItems(items);
  if (!sources.length) return '';

  const chipSources = dedupeSourcesByHostname(sources);
  const hostnameCounts = buildSourceHostnameCounts(sources);
  const toggleLabel = `${sourcesLabel} (${sources.length})`;

  const chips = chipSources
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

  const listItems = sources
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

  return `
    <div class="ai-sources">
      <div class="ai-sources-bar">
        <div class="ai-sources-chips">${chips}</div>
        <button type="button" class="ai-sources-toggle" aria-expanded="false" aria-controls="${listId}">
          <span class="ai-sources-toggle-label">${escapeHtml(toggleLabel)}</span>
          <svg class="ai-sources-chevron" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>
          </svg>
        </button>
      </div>
      <div id="${listId}" class="ai-sources-list" hidden>
        ${listItems}
      </div>
    </div>
  `;
}

export function setupSourcesToggle(root) {
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

export function renderImageBlock(container, images, header) {
  if (!container) return;
  if (!Array.isArray(images) || !images.length) {
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  const itemsHtml = images
    .slice(0, 6)
    .map((img) => {
      const title = escapeHtml(img.title || '');
      const thumb = escapeHtml(img.thumbnailUrl || img.imageUrl || '');
      const link = escapeHtml(img.imageUrl || img.sourceUrl || '#');
      const source = escapeHtml(img.sourceName || '');
      return `
        <a class="ai-image-card" href="${link}" target="_blank" rel="noopener noreferrer">
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
      <span>${escapeHtml(header)}</span>
    </div>
    <div class="ai-image-grid">${itemsHtml}</div>
  `;
  container.style.display = 'block';
}

export function renderVideoBlock(container, videos, header) {
  if (!container) return;
  if (!Array.isArray(videos) || !videos.length) {
    container.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  const itemsHtml = videos
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
      <span>${escapeHtml(header)}</span>
    </div>
    <div class="ai-video-grid">${itemsHtml}</div>
  `;
  container.style.display = 'block';
}

export function renderFindingContent({
  rootEl,
  imageEl,
  videoEl,
  data,
  t,
  sourcesListId = 'finding-sources-list',
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

  if (rootEl) {
    rootEl.innerHTML = `
      <div class="finding-view-badge">${escapeHtml(t('savedFindingLabel'))}</div>
      <div class="finding-view-meta">${[
        author ? `${escapeHtml(t('authorLabel'))}: ${escapeHtml(author)}` : '',
        escapeHtml(createdAt),
      ].filter(Boolean).join(' · ')}</div>
      ${query ? `<div class="finding-panel-query">${escapeHtml(query)}</div>` : ''}
      <div class="finding-view-answer">${escapeHtml(answerText).replace(/\n/g, '<br>')}</div>
      ${renderSourcesBlock(sources, t('sourcesLabel'), sourcesListId)}
    `;
    setupSourcesToggle(rootEl);
  }

  renderImageBlock(imageEl, images, t('imagesLabel'));
  renderVideoBlock(videoEl, videos, t('videosLabel'));

  return { query, publicId: data.publicId || data.public_id };
}
