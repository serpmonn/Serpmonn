import { escapeHtml } from './finding-content-render.js';
import { renderLikeControl, renderCommentControl, renderViewsControl, FINDING_SAVE_ICON } from './finding-icons.js';

export function formatFindingDate(iso) {
  try {
    return new Date(iso).toLocaleString(document.documentElement.lang || 'ru');
  } catch {
    return iso || '';
  }
}

export function visibilityLabel(vis, t) {
  const map = {
    public: t('visibilityPublicShort'),
    followers: t('visibilityFollowersShort'),
    private: t('visibilityPrivateShort'),
  };
  return map[vis] || map.private;
}

function renderVisibilitySelect(vis, t) {
  const options = [
    { value: 'private', label: t('visibilityPrivateShort') },
    { value: 'followers', label: t('visibilityFollowersShort') },
    { value: 'public', label: t('visibilityPublicShort') },
  ];
  const opts = options
    .map(
      (o) =>
        `<option value="${escapeHtml(o.value)}"${o.value === vis ? ' selected' : ''}>${escapeHtml(o.label)}</option>`
    )
    .join('');
  return `<select class="finding-list-card__visibility-select" data-action="visibility" aria-label="${escapeHtml(t('changeVisibility'))}">${opts}</select>`;
}

/**
 * Unified list card for feed, profile (owner), inbox thread items.
 */
export function renderFindingListCard(item, options = {}) {
  const {
    mode = 'feed',
    t = (k) => k,
    index = 0,
    unread = false,
    message = '',
    shareId = '',
    fromUsername = '',
    profileCompact = false,
  } = options;

  const publicId = item.public_id || item.publicId || '';
  const query = item.query_text || item.query || '';
  const preview = item.answer_preview || '';
  const author = item.author_username || item.author || '';
  const createdAt = item.created_at || item.createdAt || '';
  const vis = item.visibility || 'private';
  const likes = Number(item.likes_count ?? item.likesCount) || 0;
  const comments = Number(item.comments_count ?? item.commentsCount) || 0;
  const views = Number(item.views_count ?? item.viewsCount) || 0;
  const liked = item.liked_by_me === true || item.likedByMe === true;
  const saved = item.saved_by_me === true || item.savedByMe === true;
  const following = item.following_author === true || item.followingAuthor === true;
  const followers = Number(item.author_followers_count ?? item.authorFollowersCount) || 0;
  const isAuthorMe = item.is_author_me === true || item.isAuthorMe === true;

  const unreadCls = unread ? ' finding-list-card--unread' : '';
  const profileCls = mode === 'owner' && profileCompact ? ' finding-list-card--profile' : '';
  const previewHtml =
    preview && !(mode === 'owner' && profileCompact)
      ? `<p class="finding-list-card__preview">${escapeHtml(preview)}</p>`
      : '';

  let headHtml = '';
  if (mode === 'feed' || mode === 'author') {
    const followCls = following ? ' finding-list-card__follow--active' : '';
    const followLabel = following ? t('unfollowUser') : t('followUser');
    const followersLabel = t('authorFollowersLabel', { count: followers });
    const followBtnHtml = isAuthorMe
      ? ''
      : `<button type="button" class="finding-list-card__follow finding-list-card__action${followCls}" data-action="follow" title="${escapeHtml(followLabel)}" aria-label="${escapeHtml(followLabel)}">${escapeHtml(followLabel)}</button>`;
    headHtml = `
      <div class="finding-list-card__head">
        <button type="button" class="finding-list-card__author" data-action="author" title="${escapeHtml(t('authorFindingsTitle', { user: author || '?' }))}">
          ${escapeHtml(t('byUser', { user: author || '?' }))}
        </button>
        <span class="finding-list-card__followers" title="${escapeHtml(followersLabel)}" aria-label="${escapeHtml(followersLabel)}">
          <span class="finding-list-card__followers-count">${followers}</span>
        </span>
        ${followBtnHtml}
      </div>`;
  }

  let statsHtml = '';

  let actionsHtml = '';
  if (mode === 'feed' || mode === 'author') {
    const saveCls = saved ? ' finding-list-card__action--active' : '';
    const saveLabel = saved ? t('savedToMineShort') : t('saveToMine');
    const commentsLabel = t('commentsTitle');
    const viewsLabel = t('viewsLabel');
    const likeLabel = t('likeAction');
    const unlikeLabel = t('unlikeAction');
    actionsHtml = `
      <div class="finding-list-card__actions" data-public-id="${escapeHtml(publicId)}" data-author="${escapeHtml(author)}">
        ${renderViewsControl(views, { label: escapeHtml(viewsLabel) })}
        ${renderCommentControl(comments, { action: 'comments', label: escapeHtml(commentsLabel), className: 'finding-list-card__comment' })}
        ${renderLikeControl(likes, liked, { className: 'finding-list-card__like', likeLabel: escapeHtml(likeLabel), unlikeLabel: escapeHtml(unlikeLabel) })}
        <button type="button" class="finding-icon-btn finding-save-icon-btn finding-list-card__action${saveCls}" data-action="save" title="${escapeHtml(saveLabel)}" aria-label="${escapeHtml(saveLabel)}">${FINDING_SAVE_ICON}</button>
      </div>`;
  } else if (mode === 'inbox') {
    actionsHtml = `
      <div class="finding-list-card__actions">
        <button type="button" class="secondary-button secondary-button--xs finding-list-card__action" data-action="open">${escapeHtml(t('viewFinding'))}</button>
        ${fromUsername ? `<button type="button" class="secondary-button secondary-button--xs finding-list-card__action" data-action="reply">${escapeHtml(t('replyToSender'))}</button>` : ''}
      </div>`;
  } else if (mode === 'owner') {
    if (profileCompact) {
      actionsHtml = `
      <div class="finding-list-card__owner-head">
        <div class="finding-list-card__owner-main">
          <h3 class="finding-list-card__query">${escapeHtml(query || t('pageTitle'))}</h3>
          <div class="finding-list-card__owner-meta">
            ${renderVisibilitySelect(vis, t)}
            <span class="finding-list-card__date">${escapeHtml(formatFindingDate(createdAt))}</span>
          </div>
        </div>
        <button type="button" class="finding-list-card__delete finding-dismiss-btn" data-action="delete" aria-label="${escapeHtml(t('deleteLabel'))}">&times;</button>
      </div>`;
    } else {
      actionsHtml = `
      <div class="finding-list-card__owner-head">
        <h3 class="finding-list-card__query">${escapeHtml(query || t('pageTitle'))}</h3>
        <button type="button" class="finding-list-card__delete finding-dismiss-btn" data-action="delete" aria-label="${escapeHtml(t('deleteLabel'))}">&times;</button>
      </div>
      <div class="finding-list-card__owner-row">
        ${renderVisibilitySelect(vis, t)}
        <span class="finding-list-card__date">${escapeHtml(formatFindingDate(createdAt))}</span>
      </div>`;
    }
  }

  const messageHtml = message
    ? `<p class="finding-list-card__message">${escapeHtml(message)}</p>`
    : '';

  const enterCls = mode === 'owner' ? '' : ' finding-inbox-item--enter';

  return `
    <article
      class="finding-list-card finding-list-card--${mode}${profileCls}${unreadCls}${enterCls}"
      style="--inbox-delay:${index * 60}ms"
      data-public-id="${escapeHtml(publicId)}"
      data-share-id="${escapeHtml(String(shareId))}"
      data-from-username="${escapeHtml(fromUsername || author)}"
      data-author="${escapeHtml(author)}"
      data-visibility="${escapeHtml(vis)}"
      data-query="${escapeHtml(query)}"
    >
      ${headHtml}
      ${mode === 'owner' ? '' : `<h3 class="finding-list-card__query">${escapeHtml(query || t('pageTitle'))}</h3>`}
      ${mode === 'owner' ? actionsHtml : ''}
      ${messageHtml}
      ${previewHtml}
      ${mode !== 'owner' ? `<p class="finding-list-card__date">${escapeHtml(formatFindingDate(createdAt))}</p>` : ''}
      ${statsHtml}
      ${mode !== 'owner' ? actionsHtml : ''}
    </article>`;
}

export function renderInboxDialogCard(dialog, t, index = 0) {
  const unreadCls = dialog.unread > 0 ? ' finding-list-card--unread' : '';
  const badge =
    dialog.unread > 0
      ? `<span class="finding-inbox-dialog-badge">${dialog.unread > 99 ? '99+' : dialog.unread}</span>`
      : '';
  return `
    <article
      class="finding-list-card finding-list-card--dialog${unreadCls} finding-inbox-item--enter"
      style="--inbox-delay:${index * 60}ms"
      data-inbox-username="${escapeHtml(dialog.username)}"
    >
      <div class="finding-list-card__dialog-head">
        <h3 class="finding-list-card__query">${escapeHtml(t('byUser', { user: dialog.username }))}</h3>
        ${badge}
      </div>
      <p class="finding-list-card__preview">${escapeHtml(dialog.preview || '')}</p>
      <p class="finding-list-card__date">${escapeHtml(formatFindingDate(dialog.lastAt))}</p>
      <p class="finding-list-card__dialog-meta">${escapeHtml(t('inboxDialogCount', { count: dialog.items.length }))}</p>
    </article>`;
}

export function groupInboxDialogs(items) {
  const map = new Map();
  for (const item of items) {
    const username = item.from_username || '?';
    if (!map.has(username)) {
      map.set(username, {
        username,
        items: [],
        unread: 0,
        preview: '',
        lastAt: item.created_at,
      });
    }
    const dialog = map.get(username);
    dialog.items.push(item);
    if (!item.read_at) dialog.unread += 1;
    if (!dialog.preview) {
      dialog.preview = item.message || item.query_text || '';
    }
    if (new Date(item.created_at) > new Date(dialog.lastAt)) {
      dialog.lastAt = item.created_at;
      dialog.preview = item.message || item.query_text || dialog.preview;
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()
  );
}
