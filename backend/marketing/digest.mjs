/** Генерация дневного дайджеста и массовая публикация. */

import { query } from '../database/config.mjs';
import {
  listCampaigns,
  updateCampaign,
  seedDefaultCampaigns
} from './campaigns.mjs';
import { buildContentForCampaign } from './content-adapters.mjs';
import { adaptContentForChannels, payloadForChannel } from './channel-adapt.mjs';
import { resolvePublishChannels, ensurePlatformTables } from './platforms.mjs';
import { publishQueueItem } from './dispatcher.mjs';
import { getChannel } from './channels/index.mjs';
import { isVkChannelId } from './channels/vk.mjs';
import { renderShort, resolveMarketingMedia } from './render-short.mjs';
import { generateMarketingImage } from './generate-assets.mjs';
import {
  createQueueItem,
  ensureMarketingTables,
  findDigestSlotItem,
  getQueueItem,
  listDigestItems,
  updateQueueItem
} from './queue.mjs';

/** YYYY-MM-DD в Europe/Moscow. */
export function moscowDateString(d = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(d);
}

/** publish_at как naive DATETIME в Europe/Moscow (сервер в МСК). */
export function moscowSlotToSqlDatetime(digestDate, slot) {
  const m = String(slot || '12:00').match(/^(\d{1,2}):(\d{2})$/);
  const hh = m ? String(m[1]).padStart(2, '0') : '12';
  const mm = m ? m[2] : '00';
  return `${digestDate} ${hh}:${mm}:00`;
}

/** @deprecated use moscowSlotToSqlDatetime; kept for publish-due compare */
export function moscowSlotToUtcDate(digestDate, slot) {
  const sql = moscowSlotToSqlDatetime(digestDate, slot);
  return new Date(`${sql.replace(' ', 'T')}+03:00`);
}

function slotsForCampaign(campaign) {
  const slots = Array.isArray(campaign.slots) ? campaign.slots.map(String) : ['10:00'];
  const limit = Math.max(1, Math.min(12, Number(campaign.posts_per_day) || slots.length));
  return slots.slice(0, limit);
}

/** Fisher–Yates shuffle (копия массива). */
function shuffleCopy(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Одна публикация → одна площадка.
 * N постов: без повторов, пока не кончится колода, потом новый круг.
 */
function assignOnePlatformPerSlot(platforms, slotCount) {
  if (!platforms.length || slotCount < 1) return [];
  const out = [];
  let deck = [];
  for (let i = 0; i < slotCount; i++) {
    if (!deck.length) deck = shuffleCopy(platforms);
    out.push(deck.shift());
  }
  return out;
}

/** Каналы только с video (YouTube Shorts и т.п.) — нужен mp4 через ffmpeg. */
function channelNeedsVideo(channelId) {
  const ch = getChannel(channelId);
  const formats = ch?.formats || [];
  return formats.includes('video') && !formats.includes('text');
}

function isImageMediaPath(p) {
  return /\.(png|jpe?g|webp|gif)$/i.test(String(p || ''));
}

/**
 * Для Shorts нужно ≥2 разных still (если получится).
 * @returns {Promise<string[]>} relative paths
 */
async function ensureVideoStills(content) {
  const meta = content?.meta && typeof content.meta === 'object' ? content.meta : {};
  const stills = [];
  const push = (rel) => {
    const r = String(rel || '').trim();
    if (!r || stills.includes(r)) return;
    if (resolveMarketingMedia(r)) stills.push(r);
  };

  if (Array.isArray(meta.sourceStills)) {
    for (const s of meta.sourceStills) push(s);
  }
  push(meta.sourceStill);
  if (isImageMediaPath(content?.media_path)) push(content.media_path);

  while (stills.length < 2) {
    const img = await generateMarketingImage({
      product: content?.product || 'promocodes',
      title: content?.title || 'Serpmonn',
      variant: stills.length
    });
    if (!img.media_path) break;
    const before = stills.length;
    push(img.media_path);
    if (stills.length === before) break;
  }
  return stills.slice(0, 2);
}

/**
 * Картинки → вертикальный Shorts mp4 (xfade между 2 кадрами + круглое лого).
 * @returns {Promise<{ media_path: string, format: string, renderMeta: object }>}
 */
async function renderVideoForSlot(content, channelId) {
  const stillRels = await ensureVideoStills(content);
  const sourceImages = stillRels
    .map((rel) => resolveMarketingMedia(rel))
    .filter(Boolean);
  const rendered = await renderShort({
    product: content.product || 'promocodes',
    title: content.title || 'Serpmonn',
    subtitle: 'Serpmonn',
    ctaUrl: content.cta_url || '',
    sourceImages,
    sourceImage: sourceImages[0],
    durationSec: 12
  });
  return {
    media_path: rendered.mediaPath,
    format: 'video',
    renderMeta: {
      renderedAt: new Date().toISOString(),
      durationSec: rendered.durationSec,
      sourceStill: stillRels[0] || content.media_path || null,
      sourceStills: stillRels,
      stillCount: rendered.stillCount,
      renderChannel: channelId
    }
  };
}

function parsePublishAt(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(s) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)) {
    return new Date(s.replace(' ', 'T') + '+03:00');
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Чинит логи отложенных постов (ok→pending) и meta.isScheduled.
 * Когда время вышло — pending→ok (VK уже выложил сам).
 */
export async function reconcileScheduledPosts({ now = new Date() } = {}) {
  await ensureMarketingTables();

  const candidates = await query(
    `SELECT id, status, publish_at, meta FROM marketing_queue
     WHERE status = 'published'
     ORDER BY id DESC
     LIMIT 200`
  );

  let markedScheduled = 0;
  let promoted = 0;

  for (const row of candidates || []) {
    let meta = row.meta;
    if (typeof meta === 'string') {
      try { meta = JSON.parse(meta); } catch { meta = {}; }
    }
    meta = meta && typeof meta === 'object' ? meta : {};

    const at = parsePublishAt(row.publish_at);
    const future = Boolean(at && at.getTime() > now.getTime() + 60 * 1000);
    const deferredMeta = Boolean(meta.isScheduled || meta.lastPublishDeferred);

    if (future) {
      await query(
        `UPDATE marketing_channel_log
         SET status = 'pending'
         WHERE queue_id = ? AND status = 'ok' AND detail LIKE '%отложен%'`,
        [row.id]
      );
      if (!meta.isScheduled) {
        await updateQueueItem(row.id, {
          meta: { ...meta, isScheduled: true, lastPublishDeferred: true }
        });
      }
      markedScheduled += 1;
      continue;
    }

    if (!future && (deferredMeta || at)) {
      const logs = await query(
        `SELECT id, status, detail FROM marketing_channel_log WHERE queue_id = ?`,
        [row.id]
      );
      const hadDeferred = (logs || []).some(
        (l) => l.status === 'pending' || /отложен/i.test(String(l.detail || ''))
      );
      if (!hadDeferred && !deferredMeta) continue;

      await query(
        `UPDATE marketing_channel_log
         SET status = 'ok',
             detail = CASE
               WHEN detail LIKE '%отложен%' THEN CONCAT(COALESCE(detail, ''), ' · вышел по расписанию')
               ELSE detail
             END
         WHERE queue_id = ? AND status = 'pending' AND channel_id <> 'telegram'`,
        [row.id]
      );
      // старые логи уже ok, но в detail осталось «отложен» — помечаем выход
      await query(
        `UPDATE marketing_channel_log
         SET detail = CONCAT(detail, ' · вышел по расписанию')
         WHERE queue_id = ?
           AND status = 'ok'
           AND detail LIKE '%отложен%'
           AND detail NOT LIKE '%вышел по расписанию%'`,
        [row.id]
      );
      if (deferredMeta) {
        await updateQueueItem(row.id, {
          meta: { ...meta, isScheduled: false, lastPublishDeferred: false }
        });
        promoted += 1;
      }
    }
  }

  return { markedScheduled, promoted };
}

/**
 * Создаёт недостающие посты дайджеста на дату по всем активным кампаниям.
 */
export async function generateDigestForDate(digestDate, { force = false, useAi = false } = {}) {
  await ensureMarketingTables();
  await ensurePlatformTables();
  await seedDefaultCampaigns();

  const date = String(digestDate || moscowDateString()).slice(0, 10);
  const campaigns = await listCampaigns({ includePaused: false });
  const created = [];
  const skipped = [];
  const errors = [];

  for (const campaign of campaigns) {
    const platformPool = await resolvePublishChannels(campaign.channels);
    if (!platformPool.length) {
      errors.push({
        campaignId: campaign.id,
        slug: campaign.slug,
        slot: null,
        error: 'Нет включённых площадок для продукта'
      });
      continue;
    }

    const slots = slotsForCampaign(campaign);
    const platformBySlot = assignOnePlatformPerSlot(platformPool, slots.length);

    for (let si = 0; si < slots.length; si++) {
      const slot = slots[si];
      const channelId = platformBySlot[si];
      const channels = [channelId];
      try {
        const existing = await findDigestSlotItem(campaign.id, date, slot);
        if (existing && !force) {
          skipped.push({
            campaignId: campaign.id,
            slug: campaign.slug,
            slot,
            queueId: existing.id,
            reason: 'already_exists'
          });
          continue;
        }

        // VK — только текст. TG — фото. YouTube — still для ffmpeg Shorts.
        const needsVideo = channelNeedsVideo(channelId);
        const needsImage =
          needsVideo ||
          (!isVkChannelId(channelId) &&
            (campaign.source === 'promocodes' ||
              campaign.source === 'honey' ||
              campaign.source === 'games' ||
              campaign.source === 'partners' ||
              campaign.source === 'neon_runner' ||
              Boolean(useAi)));

        const content = await buildContentForCampaign(campaign, {
          slot,
          digestDate: date,
          useAi:
            Boolean(useAi) ||
            campaign.source === 'promocodes' ||
            campaign.source === 'honey' ||
            campaign.source === 'games' ||
            campaign.source === 'partners' ||
            campaign.source === 'neon_runner',
          withImage: needsImage
        });

        if (needsVideo) {
          const rendered = await renderVideoForSlot(content, channelId);
          content.format = rendered.format;
          content.media_path = rendered.media_path;
          content.meta = {
            ...(content.meta || {}),
            ...rendered.renderMeta
          };
        }

        const adaptations = adaptContentForChannels(content, channels, {
          digestDate: date
        });
        const adapted = adaptations[channelId];
        if (adapted) {
          content.title = adapted.title || content.title;
          content.body = adapted.body || content.body;
          content.cta_url = adapted.cta_url || content.cta_url;
        }

        const publishAt = moscowSlotToSqlDatetime(date, slot);

        const item = await createQueueItem({
          ...content,
          channels,
          status: 'pending_review',
          publish_at: publishAt,
          campaign_id: campaign.id,
          digest_date: date,
          created_by: 'cron',
          meta: {
            ...(content.meta || {}),
            slot,
            digestDate: date,
            theme: content.title || 'Тема дня',
            channelAdaptations: adaptations,
            assignedPlatform: channelId,
            platformPool
          }
        });

        created.push(item);
      } catch (err) {
        console.error('[digest] slot failed', campaign.slug, slot, err);
        errors.push({
          campaignId: campaign.id,
          slug: campaign.slug,
          slot,
          error: err.message || String(err)
        });
      }
    }

    await updateCampaign(campaign.id, { last_generated_date: date });
  }

  return {
    digestDate: date,
    created: created.map((i) => i.id),
    items: created,
    skipped,
    errors
  };
}

export async function getDigest(digestDate) {
  const date = String(digestDate || moscowDateString()).slice(0, 10);
  await reconcileScheduledPosts();
  const items = await listDigestItems(date);
  const now = new Date();
  const pending = items.filter((i) =>
    ['pending_review', 'draft', 'failed'].includes(i.status)
  );
  const isSched = (i) => {
    const at = parsePublishAt(i.publish_at);
    const stillFuture = Boolean(at && at.getTime() > now.getTime() + 60_000);

    // Слот ещё впереди — это настоящая отложка
    if (stillFuture) {
      if (i.meta?.isScheduled || i.meta?.lastPublishDeferred) return true;
      if (i.status === 'published') return true;
      if ((i.channel_results || []).some(
        (l) => l.status === 'pending' || /отложен/i.test(String(l.detail || ''))
      )) {
        return true;
      }
    }

    // Telegram ещё не ушёл (у нас pending), даже если слот уже наступил
    if ((i.channel_results || []).some(
      (l) => l.status === 'pending' && String(l.channel_id) === 'telegram'
    )) {
      return true;
    }

    return false;
  };
  const scheduled = items.filter(isSched);
  const published = items.filter((i) => i.status === 'published' && !isSched(i));

  const themes = [...new Set(items.map((i) => i.meta?.theme || i.title).filter(Boolean))];

  return {
    digestDate: date,
    themes,
    items: items.map((item) => ({
      ...item,
      // для UI: показываем «Отложено» вместо «Опубликовано»
      displayStatus: isSched(item) ? 'scheduled' : item.status,
      channelPreviews: item.meta?.channelAdaptations || {},
      channel_results: item.channel_results || []
    })),
    counts: {
      total: items.length,
      pending: pending.length,
      scheduled: scheduled.length,
      published: published.length,
      failed: items.filter((i) => i.status === 'failed').length,
      rejected: items.filter((i) => i.status === 'rejected').length
    }
  };
}

/**
 * Публикует все pending/failed посты дайджеста (вариант B — один клик).
 */
export async function publishDigestAll(digestDate, { reviewedBy } = {}) {
  const date = String(digestDate || moscowDateString()).slice(0, 10);
  const items = await listDigestItems(date, {
    statuses: ['pending_review', 'draft', 'failed']
  });

  const results = [];
  for (const item of items) {
    try {
      const published = await publishQueueItem(item.id, {
        reviewedBy: reviewedBy || 'digest-publish-all'
      });
      results.push({ id: item.id, ok: true, item: published });
    } catch (err) {
      results.push({
        id: item.id,
        ok: false,
        error: err.message || String(err)
      });
    }
  }

  return {
    digestDate: date,
    published: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results
  };
}

/** Пропуск поста из дайджеста (= reject). */
export async function skipDigestItem(id, { reviewedBy, reason } = {}) {
  const item = await getQueueItem(id);
  if (!item) return null;
  return updateQueueItem(id, {
    status: 'rejected',
    reject_reason: reason || 'Пропущено в дайджесте',
    reviewed_by: reviewedBy || null
  });
}

/**
 * Доотправка отложенных каналов (Telegram и др.) с publish_at <= now.
 */
export async function publishDeferredChannels({ now = new Date() } = {}) {
  await ensureMarketingTables();
  const logs = await query(
    `SELECT l.id AS log_id, l.queue_id, l.channel_id, l.detail,
            q.publish_at, q.status AS queue_status
     FROM marketing_channel_log l
     JOIN marketing_queue q ON q.id = l.queue_id
     WHERE l.status = 'pending'
       AND l.channel_id IN ('telegram')
     ORDER BY l.id ASC
     LIMIT 50`
  );

  const results = [];
  for (const row of logs || []) {
    const dueAt = parsePublishAt(row.publish_at);
    if (dueAt && dueAt.getTime() > now.getTime()) {
      results.push({ logId: row.log_id, skipped: true, reason: 'not_due' });
      continue;
    }
    const item = await getQueueItem(row.queue_id);
    if (!item) continue;
    const ch = getChannel(row.channel_id);
    if (!ch?.publish) continue;
    try {
      // убираем publish_at чтобы адаптер не снова отложил
      const payload = {
        ...payloadForChannel(item, row.channel_id),
        publish_at: null
      };
      const result = await ch.publish(payload);
      if (result?.ok && !result.deferred) {
        await query(
          `UPDATE marketing_channel_log
           SET status = 'ok', external_url = ?, detail = ?, error_message = NULL
           WHERE id = ?`,
          [result.url || null, result.detail || null, row.log_id]
        );
        results.push({ logId: row.log_id, ok: true, url: result.url });
      } else {
        results.push({
          logId: row.log_id,
          ok: false,
          error: result?.error || 'still deferred'
        });
      }
    } catch (err) {
      results.push({ logId: row.log_id, ok: false, error: err.message || String(err) });
    }
  }
  return {
    sent: results.filter((r) => r.ok).length,
    results
  };
}

/**
 * Страховка / full_auto: отправить в каналы всё, что пора публиковать,
 * даже если админ забыл нажать «Опубликовать».
 *
 * Берём pending_review / draft / failed у активных (не на паузе) продуктов.
 * Skip (rejected) не трогаем.
 *
 * leadMinutes (~25): шлём заранее, чтобы VK успел принять publish_date
 * (нужно ≥ ~15 мин до слота). Просроченные тоже дожимаем.
 */
export async function publishDueFullAuto({
  now = new Date(),
  leadMinutes = Number(process.env.MARKETING_AUTO_PUBLISH_LEAD_MIN) || 25
} = {}) {
  await ensureMarketingTables();
  const reconciled = await reconcileScheduledPosts({ now });
  const deferred = await publishDeferredChannels({ now });

  const campaigns = await listCampaigns({ includePaused: false });
  const activeIds = new Set(campaigns.map((c) => c.id));
  if (!activeIds.size) {
    return { published: 0, reconciled, deferred, leadMinutes, results: [] };
  }

  const today = moscowDateString(now);
  const yesterday = moscowDateString(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  const leadMs = Math.max(0, Number(leadMinutes) || 25) * 60_000;
  const deadline = new Date(now.getTime() + leadMs);

  const seen = new Set();
  const candidates = [];
  for (const date of [today, yesterday]) {
    const rows = await listDigestItems(date, {
      statuses: ['pending_review', 'draft', 'failed']
    });
    for (const item of rows) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      candidates.push(item);
    }
  }

  const due = candidates.filter((i) => {
    if (!activeIds.has(i.campaign_id)) return false;
    if (!i.publish_at) {
      const d = String(i.digest_date || '').slice(0, 10);
      return d && d <= today;
    }
    const at = parsePublishAt(i.publish_at);
    return !at || at.getTime() <= deadline.getTime();
  });

  const results = [];
  for (const item of due) {
    try {
      const published = await publishQueueItem(item.id, {
        reviewedBy: 'cron-auto'
      });
      results.push({ id: item.id, ok: true, item: published });
    } catch (err) {
      results.push({
        id: item.id,
        ok: false,
        error: err.message || String(err)
      });
    }
  }
  return {
    published: results.filter((r) => r.ok).length,
    reconciled,
    deferred,
    leadMinutes: Number(leadMinutes) || 25,
    due: due.map((i) => i.id),
    results
  };
}
