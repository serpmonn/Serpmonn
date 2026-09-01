import { escapeHtml } from './finding-content-render.js';
import { formatFindingDate } from './finding-list-card.js';
import { DM_ATTACH_FINDING_ICON, DM_ATTACH_ICON, DM_ATTACH_PHOTO_ICON, DM_ATTACH_AUDIO_ICON, DM_DOWNLOAD_ICON, DM_MIC_ICON, DM_MIC_STOP_ICON, DM_SEND_ICON } from './finding-icons.js';

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
  if (last.hasAudio) return t('dmAudioPreview');
  if (last.hasPhoto) return t('dmPhotoPreview');
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
  const letter = dialogAvatarLetter(conv.peerUsername);
  const avatarUrl = typeof conv.peerAvatarUrl === 'string' && conv.peerAvatarUrl.startsWith('/uploads/avatars/')
    ? conv.peerAvatarUrl
    : '';
  const avatarInner = avatarUrl
    ? `<img src="${escapeHtml(avatarUrl)}" alt="" width="40" height="40" loading="lazy" decoding="async" data-fallback="${escapeHtml(letter)}" onerror="this.onerror=null;const f=this.getAttribute('data-fallback')||'?';this.replaceWith(document.createTextNode(f));">`
    : escapeHtml(letter);

  return `
    <article
      class="finding-dm-dialog-item${unreadCls} finding-inbox-item--enter"
      style="--inbox-delay:${index * 40}ms"
      data-inbox-username="${escapeHtml(conv.peerUsername)}"
      data-inbox-peer-id="${escapeHtml(conv.peerId || '')}"
      data-inbox-avatar="${escapeHtml(avatarUrl)}"
    >
      <div class="finding-dm-dialog-item__avatar" aria-hidden="true">${avatarInner}</div>
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

function isSafeDmPhotoUrl(url) {
  return typeof url === 'string' && /^\/uploads\/dm\/[A-Za-z0-9._-]+\.webp$/.test(url);
}

function isSafeDmAudioUrl(url) {
  return typeof url === 'string' && /^\/uploads\/dm-audio\/[A-Za-z0-9._-]+\.(webm|ogg|m4a|mp3|wav)$/.test(url);
}

function formatAudioDuration(sec) {
  const n = Math.max(0, Math.round(Number(sec) || 0));
  const m = Math.floor(n / 60);
  const s = n % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function renderMineTime(msg, t) {
  const isRead = Boolean(msg.readAt);
  const label = isRead ? t('dmMessageRead') : t('dmMessageSent');
  const stateCls = isRead ? ' finding-dm-bubble__time--read' : ' finding-dm-bubble__time--sent';
  return `<time class="finding-dm-bubble__time finding-dm-bubble__time--inline${stateCls}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${escapeHtml(formatDialogTime(msg.createdAt))}</time>`;
}

function renderBubbleFooter(msg, t) {
  return `<div class="finding-dm-bubble__footer">${renderMineTime(msg, t)}</div>`;
}

function renderAudioMetaRight(msg, t) {
  return `<span class="finding-dm-audio__meta-right">${renderMineTime(msg, t)}</span>`;
}

function mediaFileName(url, fallback = 'download') {
  if (typeof url !== 'string') return fallback;
  const part = url.split('/').pop();
  return part && part.includes('.') ? part : fallback;
}

function isAndroidAppShell() {
  try {
    return Boolean(window.__SPN_ANDROID_APP__);
  } catch (_) {
    return false;
  }
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      resolve(dataUrl.split(',')[1] || '');
    };
    reader.onerror = () => reject(reader.error || new Error('read'));
    reader.readAsDataURL(blob);
  });
}

export async function downloadDmMedia(url, filename) {
  const name = filename || mediaFileName(url);
  const rawUrl = String(url || '');

  if (rawUrl.startsWith('blob:')) {
    try {
      const res = await fetch(rawUrl);
      const blob = await res.blob();
      if (window.SpnAndroid?.downloadBlobBase64) {
        const b64 = await blobToBase64(blob);
        const result = window.SpnAndroid.downloadBlobBase64(b64, name, blob.type || '');
        return String(result || '').startsWith('OK');
      }
      if (isAndroidAppShell()) return false;
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
      return false;
    }
  }

  let absUrl = rawUrl;
  try {
    absUrl = new URL(rawUrl, location.origin).href;
  } catch (_) {}

  if (window.SpnAndroid?.downloadFile) {
    try {
      const result = window.SpnAndroid.downloadFile(absUrl, name);
      return String(result || '').startsWith('OK');
    } catch (_) {}
  }

  if (isAndroidAppShell()) return false;

  try {
    const res = await fetch(absUrl, { credentials: 'include', cache: 'no-store' });
    if (!res.ok) throw new Error('http');
    const blob = await res.blob();
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
    return false;
  }
}

function renderMediaDownload(url, t, filename = '') {
  const name = filename || mediaFileName(url);
  const label = t('dmDownload');
  return `<button type="button" class="finding-dm-media__download" data-action="download-media" data-media-url="${escapeHtml(url)}" data-media-name="${escapeHtml(name)}" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${DM_DOWNLOAD_ICON}</button>`;
}

export function renderChatMessage(msg, t) {
  const mineCls = msg.isMine ? ' finding-dm-bubble--mine' : ' finding-dm-bubble--theirs';
  const hasAudio = isSafeDmAudioUrl(msg.audioUrl);
  const hasBody = Boolean(msg.body);
  const hasPhoto = isSafeDmPhotoUrl(msg.imageUrl);
  const hasFinding = Boolean(msg.finding);
  const voiceOnly = hasAudio && !hasBody && !hasPhoto && !hasFinding;
  const voiceCls = voiceOnly ? ' finding-dm-bubble--voice' : '';
  const bodyHtml = hasBody
    ? `<p class="finding-dm-bubble__text">${escapeHtml(msg.body)}</p>`
    : '';
  const findingHtml = hasFinding
    ? `<button type="button" class="finding-dm-attachment" data-action="open-finding" data-public-id="${escapeHtml(msg.finding.publicId)}">
        <span class="finding-dm-attachment__label">${escapeHtml(t('dmFindingAttachment'))}</span>
        <span class="finding-dm-attachment__query">${escapeHtml(msg.finding.query)}</span>
      </button>`
    : '';
  const photoHtml = hasPhoto
    ? `<figure class="finding-dm-photo">
        <div class="finding-dm-photo__frame">
          <img src="${escapeHtml(msg.imageUrl)}" alt="${escapeHtml(t('dmPhotoAttachment'))}" loading="lazy" decoding="async">
          ${renderMediaDownload(msg.imageUrl, t)}
        </div>
      </figure>`
    : '';
  const audioMetaHtml = hasAudio
    ? `<div class="finding-dm-audio__meta">
        ${
          msg.audioDurationSec
            ? `<span class="finding-dm-audio__duration">${escapeHtml(formatAudioDuration(msg.audioDurationSec))}</span>`
            : '<span class="finding-dm-audio__duration finding-dm-audio__duration--empty" aria-hidden="true"></span>'
        }
        ${
          voiceOnly
            ? (msg.isMine ? renderAudioMetaRight(msg, t) : `<time class="finding-dm-bubble__time finding-dm-bubble__time--inline">${escapeHtml(formatDialogTime(msg.createdAt))}</time>`)
            : ''
        }
      </div>`
    : '';
  const audioHtml = hasAudio
    ? `<div class="finding-dm-audio">
        <div class="finding-dm-audio__toolbar">
          <audio class="finding-dm-audio__player" controls preload="metadata" src="${escapeHtml(msg.audioUrl)}" controlsList="nodownload"></audio>
          ${renderMediaDownload(msg.audioUrl, t)}
        </div>
        ${audioMetaHtml}
      </div>`
    : '';
  const footerHtml = msg.isMine && !voiceOnly
    ? renderBubbleFooter(msg, t)
    : (!msg.isMine && !voiceOnly
        ? `<time class="finding-dm-bubble__time">${escapeHtml(formatFindingDate(msg.createdAt))}</time>`
        : '');

  return `
    <div class="finding-dm-bubble${mineCls}${voiceCls}" data-message-id="${msg.id}">
      ${bodyHtml}
      ${photoHtml}
      ${audioHtml}
      ${findingHtml}
      ${footerHtml}
    </div>`;
}

export function renderChatThread(messages, t) {
  if (!messages.length) {
    return renderActivityEmpty('thread', t);
  }
  return `<div class="finding-dm-thread">${messages.map((msg) => renderChatMessage(msg, t)).join('')}</div>`;
}

export function renderChatComposeBar(t, pendingFinding = null, pendingPhoto = null, pendingAudio = null, recording = null) {
  const pendingFindingHtml = pendingFinding
    ? `<div class="finding-dm-compose__pending">
        <span class="finding-dm-compose__pending-label">${escapeHtml(t('dmFindingAttachment'))}</span>
        <span class="finding-dm-compose__pending-query">${escapeHtml(pendingFinding.query)}</span>
        <button type="button" class="finding-dm-compose__pending-clear" data-inbox-compose-clear aria-label="${escapeHtml(t('cancelLabel'))}">×</button>
      </div>`
    : '';
  const pendingPhotoHtml = pendingPhoto?.previewUrl
    ? `<div class="finding-dm-compose__pending finding-dm-compose__pending--photo">
        <div class="finding-dm-photo__frame finding-dm-compose__pending-frame">
          <img class="finding-dm-compose__pending-thumb" src="${escapeHtml(pendingPhoto.previewUrl)}" alt="" draggable="false">
          ${renderMediaDownload(pendingPhoto.previewUrl, t, pendingPhoto.name || 'photo.jpg')}
        </div>
        <span class="finding-dm-compose__pending-label">${escapeHtml(t('dmPhotoAttachment'))}</span>
        <button type="button" class="finding-dm-compose__pending-clear" data-inbox-compose-clear-photo aria-label="${escapeHtml(t('cancelLabel'))}">×</button>
      </div>`
    : '';
  const pendingAudioHtml = pendingAudio?.name
    ? `<div class="finding-dm-compose__pending finding-dm-compose__pending--audio">
        <span class="finding-dm-compose__pending-label">${escapeHtml(t('dmAudioFileAttachment'))}</span>
        <span class="finding-dm-compose__pending-query">${escapeHtml(pendingAudio.name)}</span>
        <button type="button" class="finding-dm-compose__pending-clear" data-inbox-compose-clear-audio aria-label="${escapeHtml(t('cancelLabel'))}">×</button>
      </div>`
    : '';

  const isRecording = Boolean(recording?.active);
  const elapsed = formatAudioDuration(recording?.elapsedSec || 0);
  const recordingHtml = isRecording
    ? `<div class="finding-dm-compose__recording" data-inbox-compose-recording>
        <span class="finding-dm-compose__recording-dot" aria-hidden="true"></span>
        <span class="finding-dm-compose__recording-label">${escapeHtml(t('dmAudioRecording'))}</span>
        <span class="finding-dm-compose__recording-time" data-inbox-compose-recording-time>${escapeHtml(elapsed)}</span>
        <button type="button" class="finding-dm-compose__recording-cancel" data-inbox-compose-voice-cancel>${escapeHtml(t('cancelLabel'))}</button>
      </div>`
    : '';

  return `
    <form class="finding-dm-compose" data-inbox-compose>
      ${pendingFindingHtml}
      ${pendingPhotoHtml}
      ${pendingAudioHtml}
      ${recordingHtml}
      <div class="finding-dm-compose__row">
        <div class="finding-dm-compose__attach-wrap">
          <button
            type="button"
            class="finding-dm-compose__attach"
            data-inbox-compose-attach-toggle
            title="${escapeHtml(t('dmAttach'))}"
            aria-label="${escapeHtml(t('dmAttach'))}"
            aria-haspopup="menu"
            aria-expanded="false"
            ${isRecording ? 'disabled' : ''}
          >${DM_ATTACH_ICON}</button>
          <div class="finding-dm-attach-menu" data-inbox-compose-attach-menu hidden role="menu">
            <button type="button" class="finding-dm-attach-menu__item" data-inbox-compose-attach role="menuitem">
              ${DM_ATTACH_FINDING_ICON}
              <span>${escapeHtml(t('dmAttachFindingShort'))}</span>
            </button>
            <button type="button" class="finding-dm-attach-menu__item" data-inbox-compose-photo role="menuitem">
              ${DM_ATTACH_PHOTO_ICON}
              <span>${escapeHtml(t('dmAttachPhotoShort'))}</span>
            </button>
            <button type="button" class="finding-dm-attach-menu__item" data-inbox-compose-audio-file role="menuitem">
              ${DM_ATTACH_AUDIO_ICON}
              <span>${escapeHtml(t('dmAttachAudioShort'))}</span>
            </button>
          </div>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/*"
            hidden
            data-inbox-compose-photo-input
          >
          <input
            type="file"
            accept="audio/*,.mp3,.ogg,.webm,.wav,.m4a"
            hidden
            data-inbox-compose-audio-input
          >
        </div>
        <textarea
          class="finding-dm-compose__input"
          data-inbox-compose-input
          rows="1"
          maxlength="2000"
          placeholder="${escapeHtml(t('dmWritePlaceholder'))}"
          aria-label="${escapeHtml(t('dmWritePlaceholder'))}"
          ${isRecording ? 'disabled' : ''}
        ></textarea>
        <button
          type="button"
          class="finding-dm-compose__mic${isRecording ? ' is-recording' : ''}"
          data-inbox-compose-voice
          title="${escapeHtml(isRecording ? t('dmAudioStop') : t('dmAudioRecord'))}"
          aria-label="${escapeHtml(isRecording ? t('dmAudioStop') : t('dmAudioRecord'))}"
          aria-pressed="${isRecording ? 'true' : 'false'}"
        >${isRecording ? DM_MIC_STOP_ICON : DM_MIC_ICON}</button>
        <button
          type="submit"
          class="finding-dm-compose__send"
          data-inbox-compose-send
          title="${escapeHtml(t('dmSendButton'))}"
          aria-label="${escapeHtml(t('dmSendButton'))}"
          ${isRecording ? 'disabled' : ''}
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
