import { getChannel } from './channels/index.mjs';
import { payloadForChannel } from './channel-adapt.mjs';
import {
  addChannelLog,
  clearChannelLogs,
  getQueueItem,
  updateQueueItem
} from './queue.mjs';
import { query } from '../database/config.mjs';

/**
 * Публикует item во все выбранные каналы.
 * Manual/dzen всегда «успешны» (инструкция в detail).
 * Telegram/VK с publish_date → deferred: лог pending, очередь scheduled.
 */
export async function publishQueueItem(id, { reviewedBy, channels, forceNow = false } = {}) {
  const item = await getQueueItem(id);
  if (!item) {
    const err = new Error('Запись не найдена');
    err.status = 404;
    throw err;
  }
  if (!['pending_review', 'draft', 'failed', 'published'].includes(item.status)) {
    if (item.status === 'publishing') {
      const err = new Error('Уже публикуется');
      err.status = 409;
      throw err;
    }
    if (item.status === 'rejected') {
      const err = new Error('Отклонено — сначала верни в очередь');
      err.status = 409;
      throw err;
    }
  }

  const channelIds = Array.isArray(channels) && channels.length
    ? channels.map(String)
    : Array.isArray(item.channels) && item.channels.length
      ? item.channels.map(String)
      : ['vk'];

  const baseItem = forceNow ? { ...item, publish_at: null } : item;

  await updateQueueItem(id, {
    status: 'publishing',
    channels: channelIds,
    reviewed_by: reviewedBy || null,
    ...(forceNow ? { publish_at: null } : {})
  });
  await clearChannelLogs(id);

  let anyImmediate = false;
  let anyDeferred = false;
  let anyErr = false;

  for (const cid of channelIds) {
    const ch = getChannel(cid);
    if (!ch) {
      await addChannelLog(id, {
        channel_id: cid,
        status: 'error',
        error_message: 'Неизвестный канал'
      });
      anyErr = true;
      continue;
    }
    if (!ch.isConfigured?.()) {
      await addChannelLog(id, {
        channel_id: cid,
        status: 'skipped',
        detail: 'Канал не настроен'
      });
      continue;
    }
    if (!ch.supports?.(baseItem)) {
      await addChannelLog(id, {
        channel_id: cid,
        status: 'skipped',
        detail: `Формат ${baseItem.format} не поддерживается`
      });
      continue;
    }
    try {
      const payload = payloadForChannel(baseItem, cid);
      if (forceNow) payload.publish_at = null;
      const result = await ch.publish(payload);
      if (result?.ok) {
        if (result.deferred) anyDeferred = true;
        else anyImmediate = true;
        await addChannelLog(id, {
          channel_id: cid,
          status: result.deferred ? 'pending' : 'ok',
          external_url: result.url || null,
          detail: result.detail || null
        });
      } else {
        anyErr = true;
        await addChannelLog(id, {
          channel_id: cid,
          status: 'error',
          error_message: result?.error || 'Ошибка публикации'
        });
      }
    } catch (err) {
      anyErr = true;
      await addChannelLog(id, {
        channel_id: cid,
        status: 'error',
        error_message: err.message || String(err)
      });
    }
  }

  let finalStatus = 'failed';
  if (anyImmediate || anyDeferred) finalStatus = 'published';

  return updateQueueItem(id, {
    status: finalStatus,
    meta: {
      ...(item.meta || {}),
      lastPublishDeferred: anyDeferred && !anyImmediate,
      isScheduled: anyDeferred && !anyImmediate
    }
  });
}

function looksDeferredLog(log) {
  if (!log) return false;
  if (log.status === 'pending') return true;
  const detail = String(log.detail || '');
  return /отложен/i.test(detail);
}

/**
 * Снять с отложки и опубликовать сразу (VK: удалить отложенный → post без даты).
 */
export async function publishQueueItemNow(id, { reviewedBy } = {}) {
  const item = await getQueueItem(id);
  if (!item) {
    const err = new Error('Запись не найдена');
    err.status = 404;
    throw err;
  }
  if (item.status === 'publishing') {
    const err = new Error('Уже публикуется');
    err.status = 409;
    throw err;
  }

  const logs = item.channel_results || [];

  const hasDeferred =
    item.meta?.isScheduled ||
    item.meta?.lastPublishDeferred ||
    (logs || []).some(looksDeferredLog) ||
    (item.status === 'published' && item.publish_at && new Date(String(item.publish_at).replace(' ', 'T') + '+03:00').getTime() > Date.now());

  if (!hasDeferred && !['pending_review', 'draft', 'failed', 'published'].includes(item.status)) {
    const err = new Error('Нечего публиковать сейчас');
    err.status = 409;
    throw err;
  }

  // Если уже есть отложенные логи с URL — переотправим каналы точечно
  if ((logs || []).length && (logs || []).some(looksDeferredLog)) {
    await updateQueueItem(id, {
      status: 'publishing',
      publish_at: null,
      reviewed_by: reviewedBy || null
    });

    let anyOk = false;
    let anyErr = false;

    for (const log of logs) {
      if (!looksDeferredLog(log) && log.status === 'ok') {
        anyOk = true;
        continue;
      }
      if (log.status === 'error' || log.status === 'skipped') continue;

      const ch = getChannel(log.channel_id);
      if (!ch?.publish) {
        anyErr = true;
        continue;
      }

      if (String(log.channel_id || '').startsWith('vk') && log.external_url && ch.deleteWallPost) {
        await ch.deleteWallPost(log.external_url);
      }

      try {
        const payload = {
          ...payloadForChannel({ ...item, publish_at: null }, log.channel_id),
          publish_at: null
        };
        const result = await ch.publish(payload);
        if (result?.ok && !result.deferred) {
          anyOk = true;
          await query(
            `UPDATE marketing_channel_log
             SET status = 'ok', external_url = ?, detail = ?, error_message = NULL
             WHERE id = ?`,
            [result.url || null, result.detail || 'опубликовано сейчас', log.id]
          );
        } else {
          anyErr = true;
          await query(
            `UPDATE marketing_channel_log
             SET status = 'error', error_message = ?
             WHERE id = ?`,
            [result?.error || 'не удалось опубликовать сейчас', log.id]
          );
        }
      } catch (err) {
        anyErr = true;
        await query(
          `UPDATE marketing_channel_log
           SET status = 'error', error_message = ?
           WHERE id = ?`,
          [err.message || String(err), log.id]
        );
      }
    }

    return updateQueueItem(id, {
      status: anyOk ? 'published' : 'failed',
      publish_at: null,
      meta: {
        ...(item.meta || {}),
        lastPublishDeferred: false,
        isScheduled: false,
        publishedNow: true
      }
    });
  }

  // Иначе обычная публикация без даты
  return publishQueueItem(id, { reviewedBy, forceNow: true });
}
