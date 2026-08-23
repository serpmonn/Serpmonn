import { getChannel } from './channels/index.mjs';
import {
  addChannelLog,
  clearChannelLogs,
  getQueueItem,
  updateQueueItem
} from './queue.mjs';

/**
 * Публикует item во все выбранные каналы.
 * Manual всегда «успешен» (инструкция в detail).
 * Остальные каналы вызывают свой publish(); stub → error в логе.
 */
export async function publishQueueItem(id, { reviewedBy, channels } = {}) {
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
      : ['manual'];

  await updateQueueItem(id, {
    status: 'publishing',
    channels: channelIds,
    reviewed_by: reviewedBy || null
  });
  await clearChannelLogs(id);

  let anyOk = false;
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
    if (!ch.supports?.(item)) {
      await addChannelLog(id, {
        channel_id: cid,
        status: 'skipped',
        detail: `Формат ${item.format} не поддерживается`
      });
      continue;
    }
    try {
      const result = await ch.publish(item);
      if (result?.ok) {
        anyOk = true;
        await addChannelLog(id, {
          channel_id: cid,
          status: 'ok',
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

  const finalStatus = anyOk && !anyErr ? 'published' : anyOk ? 'published' : 'failed';
  return updateQueueItem(id, { status: finalStatus });
}
