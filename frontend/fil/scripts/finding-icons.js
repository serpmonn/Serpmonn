export const FINDING_SHARE_ICON = `
  <svg class="finding-share-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="18" cy="5" r="3"/>
    <circle cx="6" cy="12" r="3"/>
    <circle cx="18" cy="19" r="3"/>
    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/>
    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
  </svg>`;

export const FINDING_COPY_ICON = `
  <svg class="finding-copy-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <rect x="8" y="8" width="13" height="13" rx="2"/>
    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>
  </svg>`;

export const FINDING_SAVE_ICON = `
  <svg class="finding-save-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
  </svg>`;

export const FINDING_VIEWS_ICON = `
  <svg class="finding-views-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/>
    <circle cx="12" cy="12" r="2.5"/>
  </svg>`;

export const FINDING_OPEN_ICON = `
  <svg class="finding-open-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
    <polyline points="15 3 21 3 21 9"/>
    <line x1="10" y1="14" x2="21" y2="3"/>
  </svg>`;

export const FINDING_COMMENT_ICON = `
  <svg class="finding-comment-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>`;

export const FINDING_LIKE_ICON = `
  <svg class="finding-like-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
  </svg>`;

function ensureIconButtonContent(btn, iconHtml) {
  if (!btn) return;
  if (!btn.querySelector('svg')) {
    btn.insertAdjacentHTML('afterbegin', iconHtml.trim());
  }
}

export function renderViewsControl(count, { label = '' } = {}) {
  const safeLabel = label || 'Views';
  return `
    <button type="button" class="finding-icon-btn finding-views-control" disabled tabindex="-1" title="${safeLabel}" aria-label="${safeLabel}">
      ${FINDING_VIEWS_ICON}
      <span class="finding-views-control__count">${Number(count) || 0}</span>
    </button>`;
}

export function updateViewsControl(el, { count }) {
  if (!el) return;
  const countEl = el.querySelector('.finding-views-control__count');
  if (countEl) countEl.textContent = String(count ?? 0);
}

export function renderCommentControl(count, { action = 'comments', className = '', label = '' } = {}) {
  const safeLabel = label || 'Comments';
  return `
    <button type="button" class="finding-icon-btn finding-comment-control${className ? ` ${className}` : ''}" data-action="${action}" title="${safeLabel}" aria-label="${safeLabel}">
      ${FINDING_COMMENT_ICON}
      <span class="finding-comment-control__count">${Number(count) || 0}</span>
    </button>`;
}

export function updateCommentControl(btn, { count }) {
  if (!btn) return;
  const countEl = btn.querySelector('.finding-comment-control__count');
  if (countEl) countEl.textContent = String(count ?? 0);
}

export function renderLikeControl(count, liked, { action = 'like', className = '', likeLabel = '', unlikeLabel = '' } = {}) {
  const activeCls = liked ? ' finding-like-control--active' : '';
  const label = liked ? unlikeLabel : likeLabel;
  return `
    <button type="button" class="finding-icon-btn finding-like-control${activeCls}${className ? ` ${className}` : ''}" data-action="${action}" data-like-label="${likeLabel}" data-unlike-label="${unlikeLabel}" title="${label}" aria-label="${label}">
      ${FINDING_LIKE_ICON}
      <span class="finding-like-control__count">${Number(count) || 0}</span>
    </button>`;
}

export function updateLikeControl(btn, { liked, count }) {
  if (!btn) return;
  btn.classList.toggle('finding-like-control--active', liked === true);
  const countEl = btn.querySelector('.finding-like-control__count');
  if (countEl) countEl.textContent = String(count ?? 0);
  const likeLabel = btn.dataset.likeLabel || '';
  const unlikeLabel = btn.dataset.unlikeLabel || '';
  const label = liked ? unlikeLabel : likeLabel;
  if (label) {
    btn.title = label;
    btn.setAttribute('aria-label', label);
  }
}

export function applyShareIconButton(btn, label) {
  if (!btn) return;
  ensureIconButtonContent(btn, FINDING_SHARE_ICON);
  btn.setAttribute('aria-label', label);
  btn.title = label;
}

export function applyCopyIconButton(btn, label) {
  if (!btn) return;
  ensureIconButtonContent(btn, FINDING_COPY_ICON);
  btn.setAttribute('aria-label', label);
  btn.title = label;
}

export function applySaveIconButton(btn, label, { active = false } = {}) {
  if (!btn) return;
  ensureIconButtonContent(btn, FINDING_SAVE_ICON);
  btn.setAttribute('aria-label', label);
  btn.title = label;
  btn.classList.toggle('finding-list-card__action--active', active === true);
}

/** Карточка находки + лупа — не скрепка, свой символ вложения */
export const DM_ATTACH_FINDING_ICON = `
  <svg class="finding-dm-attach-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <path d="M7 3h8l4 4v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/>
    <path d="M15 3v4h4"/>
    <line x1="8" y1="12" x2="14" y2="12"/>
    <line x1="8" y1="15" x2="12" y2="15"/>
    <circle cx="16.5" cy="16.5" r="3.5"/>
    <line x1="19" y1="19" x2="21.2" y2="21.2"/>
  </svg>`;

/** Стрелка вправо — не самолётик Telegram */
export const DM_SEND_ICON = `
  <svg class="finding-dm-send-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <line x1="4" y1="12" x2="18" y2="12"/>
    <polyline points="13 7 18 12 13 17"/>
  </svg>`;
