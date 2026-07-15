import { escapeHtml } from './finding-content-render.js';
import { formatFindingDate } from './finding-list-card.js';
import { DM_ATTACH_FINDING_ICON, DM_SEND_ICON } from './finding-icons.js';

export function renderActivityEmpty(kind, t) {
  const configs = {
    inbox: {
      icon: '💬',
      title: t('noInbox'),
      hint: t('dmEmptyInboxHint'),
      action: t('dmNewMessage'),
      actionType: 'write',
    },
    notifications: {
      icon: '🔔',
      title: t('noNotifications'),
      hint: t('notificationsEmptyHint'),
    },
    thread: {
      icon: '👋',
      title: t('dmEmptyThread'),
      hint: '',
    },
  };
  const cfg = configs[kind] || configs.inbox;
  const actionHtml = cfg.action
    ? `<button type="button" class="primary-button finding-activity-empty__action" data-activity-empty-action="${escapeHtml(cfg.actionType)}">${escapeHtml(cfg.action)}</button>`
    : '';

  return `
    <div class="finding-activity-empty">
      <div class="finding-activity-empty__icon" aria-hidden="true">${cfg.icon}</div>
      <p class="finding-activity-empty__title">${escapeHtml(cfg.title)}</p>
      ${cfg.hint ? `<p class="finding-activity-empty__hint">${escapeHtml(cfg.hint)}</p>` : ''}
      ${actionHtml}
    </div>`;
}

const NOTIFICATION_COMMENT_ICON = `
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>`;

const NOTIFICATION_FINDING_ICON = `
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 3l1.9 5.8H20l-4.8 3.5 1.8 5.7L12 14.8 7 18l1.8-5.7L4 8.8h6.1L12 3z"/>
  </svg>`;

export function renderNotificationItem(item, t, index = 0) {
  const isComment = item.type === 'comment';
  const typeCls = isComment ? 'finding-activity-event--comment' : 'finding-activity-event--finding';
  const label = isComment ? t('notificationTypeComment') : t('notificationTypeFinding');
  const text = isComment
    ? t('notificationComment', { user: item.actor_username || '?', query: item.query_text || '' })
    : t('notificationNewFinding', { user: item.actor_username || '?', query: item.query_text || '' });
  const icon = isComment ? NOTIFICATION_COMMENT_ICON : NOTIFICATION_FINDING_ICON;

  return `
    <article
      class="finding-activity-event ${typeCls} finding-inbox-item--enter"
      style="--inbox-delay:${index * 40}ms"
      data-public-id="${escapeHtml(item.public_id || '')}"
    >
      <div class="finding-activity-event__icon" aria-hidden="true">${icon}</div>
      <div class="finding-activity-event__body">
        <span class="finding-activity-event__type">${escapeHtml(label)}</span>
        <p class="finding-activity-event__text">${escapeHtml(text)}</p>
        <time class="finding-activity-event__time">${escapeHtml(formatDialogTime(item.created_at))}</time>
      </div>
    </article>`;
}

export function formatDialogPreview(conv, t) {
  const last = conv.lastMessage || {};
  if (last.body) return last.body;
  if (last.hasFinding && last.findingQuery) {
    return t('dmFindingPreview', { query: last.findingQuery });
  }
  return t('dmMessageOnly');
}

function formatDialogTime(iso) {
  try {
    const date = new Date(iso);
    const now = new Date();
    const locale = document.documentElement.lang || 'ru';
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  } catch {
    return iso || '';
  }
}

function dialogAvatarLetter(username) {
  const letter = String(username || '?').trim().charAt(0);
  return letter ? letter.toUpperCase() : '?';
}

export function renderDmDialogCard(conv, t, index = 0) {
  const unread = conv.unreadCount || 0;
  const unreadCls = unread > 0 ? ' finding-dm-dialog-item--unread' : '';
  const last = conv.lastMessage || {};
  const preview = formatDialogPreview(conv, t);
  const previewText = last.isMine ? `${t('dmYouPrefix')}: ${preview}` : preview;
  const badge =
    unread > 0
      ? `<span class="finding-dm-dialog-item__badge">${unread > 99 ? '99+' : unread}</span>`
      : '';

  return `
    <article
      class="finding-dm-dialog-item${unreadCls} finding-inbox-item--enter"
      style="--inbox-delay:${index * 40}ms"
      data-inbox-username="${escapeHtml(conv.peerUsername)}"
    >
      <div class="finding-dm-dialog-item__avatar" aria-hidden="true">${escapeHtml(dialogAvatarLetter(conv.peerUsername))}</div>
      <div class="finding-dm-dialog-item__body">
        <div class="finding-dm-dialog-item__top">
          <span class="finding-dm-dialog-item__name">@${escapeHtml(conv.peerUsername)}</span>
          <time class="finding-dm-dialog-item__time">${escapeHtml(formatDialogTime(conv.updatedAt))}</time>
        </div>
        <div class="finding-dm-dialog-item__bottom">
          <p class="finding-dm-dialog-item__preview">${escapeHtml(previewText)}</p>
          ${badge}
        </div>
      </div>
    </article>`;
}

export function renderChatMessage(msg, t) {
  const mineCls = msg.isMine ? ' finding-dm-bubble--mine' : ' finding-dm-bubble--theirs';
  const bodyHtml = msg.body
    ? `<p class="finding-dm-bubble__text">${escapeHtml(msg.body)}</p>`
    : '';
  const findingHtml = msg.finding
    ? `<button type="button" class="finding-dm-attachment" data-action="open-finding" data-public-id="${escapeHtml(msg.finding.publicId)}">
        <span class="finding-dm-attachment__label">${escapeHtml(t('dmFindingAttachment'))}</span>
        <span class="finding-dm-attachment__query">${escapeHtml(msg.finding.query)}</span>
      </button>`
    : '';

  return `
    <div class="finding-dm-bubble${mineCls}" data-message-id="${msg.id}">
      ${bodyHtml}
      ${findingHtml}
      <time class="finding-dm-bubble__time">${escapeHtml(formatFindingDate(msg.createdAt))}</time>
    </div>`;
}

export function renderChatThread(messages, t) {
  if (!messages.length) {
    return renderActivityEmpty('thread', t);
  }
  return `<div class="finding-dm-thread">${messages.map((msg) => renderChatMessage(msg, t)).join('')}</div>`;
}

export function renderChatComposeBar(t, pendingFinding = null) {
  const pendingHtml = pendingFinding
    ? `<div class="finding-dm-compose__pending">
        <span class="finding-dm-compose__pending-label">${escapeHtml(t('dmFindingAttachment'))}</span>
        <span class="finding-dm-compose__pending-query">${escapeHtml(pendingFinding.query)}</span>
        <button type="button" class="finding-dm-compose__pending-clear" data-inbox-compose-clear aria-label="${escapeHtml(t('cancelLabel'))}">×</button>
      </div>`
    : '';

  return `
    <form class="finding-dm-compose" data-inbox-compose>
      ${pendingHtml}
      <div class="finding-dm-compose__row">
        <button
          type="button"
          class="finding-dm-compose__attach"
          data-inbox-compose-attach
          title="${escapeHtml(t('dmAttachFinding'))}"
          aria-label="${escapeHtml(t('dmAttachFinding'))}"
        >${DM_ATTACH_FINDING_ICON}</button>
        <textarea
          class="finding-dm-compose__input"
          data-inbox-compose-input
          rows="2"
          maxlength="2000"
          placeholder="${escapeHtml(t('dmWritePlaceholder'))}"
          aria-label="${escapeHtml(t('dmWritePlaceholder'))}"
        ></textarea>
        <button
          type="submit"
          class="finding-dm-compose__send"
          data-inbox-compose-send
          title="${escapeHtml(t('dmSendButton'))}"
          aria-label="${escapeHtml(t('dmSendButton'))}"
        >${DM_SEND_ICON}</button>
      </div>
    </form>`;
}

export function renderDmFindingPickerList(items, t) {
  if (!items.length) {
    return `<p class="finding-empty finding-inbox-empty">${escapeHtml(t('dmNoFindingsToAttach'))}</p>`;
  }
  return `<ul class="finding-dm-picker-list">
    ${items
      .map(
        (item) => `
      <li>
        <button type="button" class="finding-dm-picker-item" data-dm-pick-finding="${escapeHtml(item.public_id)}">
          <span class="finding-dm-picker-item__query">${escapeHtml(item.query_text)}</span>
          <time class="finding-dm-picker-item__date">${escapeHtml(formatFindingDate(item.created_at))}</time>
        </button>
      </li>`
      )
      .join('')}
  </ul>`;
}
