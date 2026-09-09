import { channelHealth, listChannels } from '../marketing/channels/index.mjs';
import { publishQueueItem, publishQueueItemNow } from '../marketing/dispatcher.mjs';
import {
  createQueueItem,
  deleteQueueItem,
  ensureMarketingTables,
  getQueueItem,
  listQueue,
  updateQueueItem
} from '../marketing/queue.mjs';
import { applyTemplate, listTemplates, loadTemplate } from '../marketing/templates.mjs';
import {
  MARKETING_ROOT,
  renderShort,
  resolveMarketingMedia
} from '../marketing/render-short.mjs';
import { buildMarketingReport } from '../marketing/reports.mjs';
import {
  generateMarketingCopy,
  marketingOllamaHealth
} from '../marketing/generate-copy.mjs';
import { withTrailingHashtags } from '../marketing/content-adapters.mjs';
import { adaptContentForChannels } from '../marketing/channel-adapt.mjs';
import {
  ensureCampaignTables,
  listCampaigns,
  createCampaign,
  updateCampaign,
  setCampaignPaused,
  deleteCampaign,
  seedDefaultCampaigns,
  slugify,
  normalizeCampaignChannels,
  getCampaign
} from '../marketing/campaigns.mjs';
import {
  generateDigestForDate,
  getDigest,
  moscowDateString,
  publishDigestAll,
  skipDigestItem
} from '../marketing/digest.mjs';
import {
  ensurePlatformTables,
  listPlatforms,
  updatePlatform
} from '../marketing/platforms.mjs';
import {
  refreshReachMetrics,
  setChannelReach,
  ensureReachColumns
} from '../marketing/reach.mjs';
import { createReadStream, constants as fsConstants } from 'fs';
import { access, stat } from 'fs/promises';
import { extname, join } from 'path';

function adminWho(req) {
  return req.admin?.email || req.admin?.username || req.admin?.sub || req.admin?.id || null;
}

/** Обновить channelAdaptations / assignedPlatform при смене площадок у поста. */
function metaWithChannelAdaptations(item, channels, overrides = {}) {
  const baseMeta = item?.meta && typeof item.meta === 'object' ? item.meta : {};
  const title = overrides.title != null ? overrides.title : item.title;
  const body = overrides.body != null ? overrides.body : item.body;
  const cta = overrides.cta_url != null ? overrides.cta_url : item.cta_url;
  const digestDate =
    item.digest_date ||
    baseMeta.digestDate ||
    (item.publish_at ? String(item.publish_at).slice(0, 10) : null);
  const adaptations = adaptContentForChannels(
    {
      title,
      body,
      cta_url: cta,
      meta: baseMeta
    },
    channels,
    { digestDate }
  );
  return {
    ...baseMeta,
    channelAdaptations: {
      ...(baseMeta.channelAdaptations || {}),
      ...adaptations
    },
    assignedPlatform: channels.length === 1 ? channels[0] : baseMeta.assignedPlatform || channels[0],
    platformPool: channels
  };
}

async function maybeRenderForItem(item, tpl) {
  await updateQueueItem(item.id, { status: 'rendering', format: 'video' });
  const sourceRel = tpl?.source_image || null;
  const sourceAbs = sourceRel ? join(MARKETING_ROOT, sourceRel) : undefined;
  const rendered = await renderShort({
    product: item.product || tpl?.product || 'neli',
    title: item.title,
    subtitle: 'Serpmonn',
    ctaUrl: item.cta_url,
    sourceImage: sourceAbs,
    durationSec: tpl?.duration_sec || 12
  });
  return updateQueueItem(item.id, {
    status: 'pending_review',
    format: 'video',
    media_path: rendered.mediaPath,
    meta: {
      ...(item.meta && typeof item.meta === 'object' ? item.meta : {}),
      renderedAt: new Date().toISOString(),
      durationSec: rendered.durationSec
    }
  });
}

export async function listMarketingQueue(req, res) {
  try {
    await ensureMarketingTables();
    const status = req.query.status ? String(req.query.status) : undefined;
    const items = await listQueue({ status, limit: Number(req.query.limit) || 50 });
    return res.json({ items });
  } catch (err) {
    console.error('[admin] marketing queue list', err);
    return res.status(500).json({ message: 'Ошибка загрузки очереди' });
  }
}

export async function getMarketingItem(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ message: 'Некорректный id' });
    }
    await ensureReachColumns();
    const item = await getQueueItem(id);
    if (!item) return res.status(404).json({ message: 'Не найдено' });
    return res.json({ item });
  } catch (err) {
    console.error('[admin] marketing get', err);
    return res.status(500).json({ message: 'Ошибка' });
  }
}

export async function createMarketingFromTemplate(req, res) {
  try {
    const templateId = String(req.body?.templateId || '').trim();
    if (!templateId) {
      return res.status(400).json({ message: 'templateId обязателен' });
    }
    const tpl = await loadTemplate(templateId);
    if (!tpl) return res.status(404).json({ message: 'Шаблон не найден' });

    const applied = applyTemplate(tpl, {
      title: req.body?.title,
      body: req.body?.body,
      cta_url: req.body?.cta_url,
      product: req.body?.product,
      format: req.body?.format,
      channels: req.body?.channels
    });

    const skipGenerate = req.body?.skipGenerate === true;
    const userOverrideTitle = req.body?.title != null && String(req.body.title).trim();
    const userOverrideBody = req.body?.body != null && String(req.body.body).trim();

    let genMeta = { templateId };
    if (!skipGenerate && !userOverrideTitle && !userOverrideBody) {
      const gen = await generateMarketingCopy({
        product: applied.product || tpl.product,
        format: applied.format || tpl.format,
        ctaUrl: applied.cta_url,
        fallbackTitle: applied.title,
        fallbackBody: applied.body
      });
      applied.title = gen.title;
      applied.body = gen.body;
      genMeta = {
        templateId,
        copyGenerated: gen.generated,
        copyModel: gen.model,
        copyGeneratedAt: new Date().toISOString(),
        copyError: gen.error || null
      };
    }

    const needRender = Boolean(tpl.render) || applied.format === 'video';
    let item = await createQueueItem({
      ...applied,
      status: needRender ? 'rendering' : 'pending_review',
      created_by: adminWho(req) ? String(adminWho(req)) : null,
      meta: genMeta
    });

    if (needRender) {
      try {
        item = await maybeRenderForItem(item, tpl);
      } catch (renderErr) {
        console.error('[admin] marketing render', renderErr);
        item = await updateQueueItem(item.id, {
          status: 'failed',
          meta: { ...genMeta, renderError: renderErr.message }
        });
        return res.status(500).json({
          message: `Рендер не удался: ${renderErr.message}`,
          item
        });
      }
    }

    return res.status(201).json({ item });
  } catch (err) {
    console.error('[admin] marketing create', err);
    return res.status(500).json({ message: 'Ошибка создания' });
  }
}

export async function renderMarketingItem(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ message: 'Некорректный id' });
    }
    let item = await getQueueItem(id);
    if (!item) return res.status(404).json({ message: 'Не найдено' });

    const templateId = item.meta?.templateId;
    const tpl = templateId
      ? await loadTemplate(templateId)
      : {
          render: true,
          product: item.product,
          source_image: 'assets/clips/neli-promo.png',
          duration_sec: 12
        };

    item = await maybeRenderForItem(item, { ...tpl, render: true });
    return res.json({ item });
  } catch (err) {
    console.error('[admin] marketing re-render', err);
    return res.status(500).json({ message: err.message || 'Ошибка рендера' });
  }
}

export async function streamMarketingMedia(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ message: 'Некорректный id' });
    }
    const item = await getQueueItem(id);
    if (!item?.media_path) return res.status(404).json({ message: 'Нет медиа' });
    const abs = resolveMarketingMedia(item.media_path);
    if (!abs) return res.status(400).json({ message: 'Некорректный путь' });
    await access(abs, fsConstants.R_OK);
    const st = await stat(abs);
    const ext = extname(abs).toLowerCase();
    const types = {
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.webp': 'image/webp'
    };
    res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
    res.setHeader('Content-Length', st.size);
    res.setHeader('Cache-Control', 'private, max-age=3600');
    createReadStream(abs).pipe(res);
  } catch (err) {
    console.error('[admin] marketing media', err);
    if (!res.headersSent) res.status(404).json({ message: 'Файл не найден' });
  }
}

export async function updateMarketingItem(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ message: 'Некорректный id' });
    }
    const existing = await getQueueItem(id);
    if (!existing) return res.status(404).json({ message: 'Не найдено' });

    const patch = {};
    if (req.body?.title != null) patch.title = req.body.title;
    if (req.body?.body != null) {
      let body = String(req.body.body);
      const product = req.body?.product != null ? req.body.product : existing.product;
      if (String(product || '') === 'promocodes') {
        body = withTrailingHashtags(body);
      }
      patch.body = body;
    }
    if (req.body?.cta_url != null) patch.cta_url = req.body.cta_url;
    if (req.body?.product != null) patch.product = req.body.product;
    if (req.body?.format != null) patch.format = req.body.format;
    if (Array.isArray(req.body?.channels)) {
      const product = req.body?.product != null ? req.body.product : existing.product;
      // Мёд — только vk_vrnhoney; остальные продукты могут включать vrnhoney
      if (String(product || '') === 'honey' || existing.meta?.source === 'honey_brand') {
        patch.channels = ['vk_vrnhoney'];
      } else {
        patch.channels = normalizeCampaignChannels('promocodes', req.body.channels.map(String));
      }
      if (!patch.channels.length) {
        return res.status(400).json({ message: 'Выбери хотя бы одну площадку' });
      }
      patch.meta = metaWithChannelAdaptations(existing, patch.channels, {
        title: patch.title,
        body: patch.body,
        cta_url: patch.cta_url
      });
    }
    if (req.body?.publish_at !== undefined) patch.publish_at = req.body.publish_at || null;
    if (req.body?.status === 'pending_review' || req.body?.status === 'draft') {
      patch.status = req.body.status;
      patch.reject_reason = null;
    }

    const item = await updateQueueItem(id, patch);
    return res.json({ item });
  } catch (err) {
    console.error('[admin] marketing update', err);
    return res.status(500).json({ message: 'Ошибка сохранения' });
  }
}

export async function rejectMarketingItem(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ message: 'Некорректный id' });
    }
    const existing = await getQueueItem(id);
    if (!existing) return res.status(404).json({ message: 'Не найдено' });
    if (!['pending_review', 'draft', 'failed'].includes(existing.status)) {
      return res.status(409).json({ message: 'Нельзя отклонить в текущем статусе' });
    }
    const reason = String(req.body?.reason || '').trim().slice(0, 512) || 'Отклонено';
    const item = await updateQueueItem(id, {
      status: 'rejected',
      reject_reason: reason,
      reviewed_by: adminWho(req) ? String(adminWho(req)) : null
    });
    return res.json({ item });
  } catch (err) {
    console.error('[admin] marketing reject', err);
    return res.status(500).json({ message: 'Ошибка отклонения' });
  }
}

export async function publishMarketingItem(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ message: 'Некорректный id' });
    }
    const existing = await getQueueItem(id);
    if (!existing) return res.status(404).json({ message: 'Не найдено' });

    const isHoney =
      String(existing.product || '') === 'honey' ||
      existing.meta?.source === 'honey_brand';

    let channels = Array.isArray(req.body?.channels)
      ? req.body.channels.map(String)
      : undefined;
    if (isHoney) channels = ['vk_vrnhoney'];
    else if (channels) channels = normalizeCampaignChannels('promocodes', channels);

    if (channels && !channels.length) {
      return res.status(400).json({ message: 'Выбери хотя бы одну площадку' });
    }

    if (
      req.body?.title != null ||
      req.body?.body != null ||
      req.body?.cta_url != null ||
      channels ||
      req.body?.publish_at !== undefined
    ) {
      const patch = {
        title: req.body.title,
        body: req.body.body,
        cta_url: req.body.cta_url,
        channels,
        publish_at: req.body.publish_at !== undefined ? req.body.publish_at || null : undefined
      };
      if (channels) {
        patch.meta = metaWithChannelAdaptations(existing, channels, {
          title: patch.title,
          body: patch.body,
          cta_url: patch.cta_url
        });
      }
      await updateQueueItem(id, patch);
    }
    const item = await publishQueueItem(id, {
      reviewedBy: adminWho(req) ? String(adminWho(req)) : null,
      channels
    });
    return res.json({ item });
  } catch (err) {
    console.error('[admin] marketing publish', err);
    const status = err.status || 500;
    return res.status(status).json({ message: err.message || 'Ошибка публикации' });
  }
}

export async function publishMarketingItemNow(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ message: 'Некорректный id' });
    }
    const item = await publishQueueItemNow(id, {
      reviewedBy: adminWho(req) ? String(adminWho(req)) : null
    });
    return res.json({ item });
  } catch (err) {
    console.error('[admin] marketing publish-now', err);
    const status = err.status || 500;
    return res.status(status).json({ message: err.message || 'Ошибка публикации сейчас' });
  }
}

export async function listMarketingChannels(_req, res) {
  try {
    const channels = await channelHealth();
    const ollama = await marketingOllamaHealth();
    return res.json({
      channels,
      registry: listChannels(),
      copyGenerator: ollama
    });
  } catch (err) {
    console.error('[admin] marketing channels', err);
    return res.status(500).json({ message: 'Ошибка каналов' });
  }
}

export async function regenerateMarketingCopy(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ message: 'Некорректный id' });
    }
    let item = await getQueueItem(id);
    if (!item) return res.status(404).json({ message: 'Не найдено' });
    if (['publishing'].includes(item.status)) {
      return res.status(409).json({ message: 'Сейчас публикуется — подожди' });
    }

    const gen = await generateMarketingCopy({
      product: item.product,
      format: item.format,
      ctaUrl: item.cta_url,
      fallbackTitle: item.title,
      fallbackBody: item.body
    });

    if (!gen.generated) {
      return res.status(503).json({
        message: `Не удалось сгенерировать: ${gen.error || 'Ollama недоступна'}`,
        item
      });
    }

    const meta = {
      ...(item.meta && typeof item.meta === 'object' ? item.meta : {}),
      copyGenerated: true,
      copyModel: gen.model,
      copyGeneratedAt: new Date().toISOString(),
      copyError: null
    };

    let body = gen.body;
    if (String(item.product || '') === 'promocodes') {
      if (item.cta_url && !body.includes('serpmonn.ru')) {
        body = `${body}\n\n${item.cta_url}`;
      }
      body = withTrailingHashtags(body);
      meta.copyEngine = gen.engine || meta.copyEngine;
      meta.hashtags = true;
      meta.voice = 'company_impersonal';
    } else if (String(item.product || '') === 'honey') {
      if (item.cta_url && !body.includes('vrnhoney.ru') && !body.includes('http')) {
        body = `${body}\n\n${item.cta_url}`;
      }
      const tags =
        Array.isArray(gen.hashtags) && gen.hashtags.length >= 3
          ? gen.hashtags
          : ['#VRNHoney', '#мёд', '#vrnhoney'];
      body = withTrailingHashtags(body, tags);
      meta.copyEngine = gen.engine || meta.copyEngine;
      meta.hashtags = tags;
      meta.voice = 'company_impersonal';
      meta.lockedChannels = ['vk_vrnhoney'];
    } else {
      meta.voice = 'company_impersonal';
    }

    item = await updateQueueItem(id, {
      title: gen.title,
      body,
      status: item.status === 'published' || item.status === 'rejected'
        ? 'pending_review'
        : item.status === 'failed'
          ? 'pending_review'
          : item.status,
      meta
    });

    const alsoRender = req.body?.render === true || item.format === 'video';
    if (alsoRender && item.format === 'video') {
      try {
        const templateId = item.meta?.templateId;
        const tpl = templateId
          ? await loadTemplate(templateId)
          : {
              product: item.product,
              source_image: 'assets/clips/neli-promo.png',
              duration_sec: 12
            };
        item = await maybeRenderForItem(item, tpl);
      } catch (renderErr) {
        console.error('[admin] marketing regenerate+render', renderErr);
        return res.status(500).json({
          message: `Текст обновлён, рендер не удался: ${renderErr.message}`,
          item
        });
      }
    }

    return res.json({ item, generated: true, model: gen.model });
  } catch (err) {
    console.error('[admin] marketing regenerate-copy', err);
    return res.status(500).json({ message: err.message || 'Ошибка генерации' });
  }
}

export async function listMarketingTemplates(_req, res) {
  try {
    const templates = await listTemplates();
    return res.json({ templates });
  } catch (err) {
    console.error('[admin] marketing templates', err);
    return res.status(500).json({ message: 'Ошибка шаблонов' });
  }
}

export async function getMarketingReports(req, res) {
  try {
    const days = Number(req.query.days) || 30;
    const report = await buildMarketingReport({ days });
    return res.json(report);
  } catch (err) {
    console.error('[admin] marketing reports', err);
    return res.status(500).json({ message: 'Ошибка отчёта' });
  }
}

/* ── Кампании ── */

export async function listMarketingCampaigns(_req, res) {
  try {
    await ensureCampaignTables();
    await ensurePlatformTables();
    await seedDefaultCampaigns();
    const campaigns = await listCampaigns({ includePaused: true });
    const platforms = await listPlatforms({ includeDisabled: true });
    const ollama = await marketingOllamaHealth();
    return res.json({
      campaigns,
      platforms,
      copyEngine: ollama
    });
  } catch (err) {
    console.error('[admin] marketing campaigns list', err);
    return res.status(500).json({ message: 'Ошибка кампаний' });
  }
}

export async function listMarketingPlatforms(_req, res) {
  try {
    const platforms = await listPlatforms({ includeDisabled: true });
    return res.json({ platforms });
  } catch (err) {
    console.error('[admin] marketing platforms', err);
    return res.status(500).json({ message: 'Ошибка площадок' });
  }
}

export async function updateMarketingPlatform(req, res) {
  try {
    const platform = await updatePlatform(req.params.id, {
      enabled: req.body?.enabled,
      mode: req.body?.mode,
      tier: req.body?.tier
    });
    if (!platform) return res.status(404).json({ message: 'Не найдено' });
    return res.json({ platform });
  } catch (err) {
    console.error('[admin] marketing platform update', err);
    return res.status(err.status || 500).json({ message: err.message || 'Ошибка' });
  }
}

export async function refreshMarketingReach(_req, res) {
  try {
    await ensureReachColumns();
    const result = await refreshReachMetrics({ limit: 50 });
    return res.json(result);
  } catch (err) {
    console.error('[admin] marketing refresh reach', err);
    return res.status(500).json({ message: err.message || 'Ошибка охвата' });
  }
}

export async function setMarketingReach(req, res) {
  try {
    const result = await setChannelReach({
      logId: req.body?.logId,
      queueId: req.body?.queueId,
      channelId: req.body?.channelId,
      reach: req.body?.reach
    });
    return res.json(result);
  } catch (err) {
    console.error('[admin] marketing set reach', err);
    return res.status(err.status || 500).json({ message: err.message || 'Ошибка' });
  }
}

export async function createMarketingCampaign(req, res) {
  try {
    const body = req.body || {};
    const name = String(body.name || '').trim();
    if (!name) return res.status(400).json({ message: 'Укажи название' });
    const slug = String(body.slug || '').trim() || slugify(name);
    const slotsRaw = body.slots;
    const slots = Array.isArray(slotsRaw)
      ? slotsRaw.map(String)
      : String(slotsRaw || '10:00')
        .split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
    const channels = Array.isArray(body.channels) && body.channels.length
      ? body.channels.map(String)
      : ['vk'];
    const item = await createCampaign({
      slug,
      name,
      goal: body.goal || '',
      source: body.source === 'promocodes' ? 'promocodes' : 'template',
      template_id: body.template_id || null,
      cta_url: body.cta_url || null,
      channels,
      slots: slots.length ? slots : ['10:00'],
      mode: body.mode === 'full_auto' ? 'full_auto' : 'digest',
      paused: Boolean(body.paused),
      posts_per_day: body.posts_per_day || slots.length || 1
    });
    return res.status(201).json({ campaign: item });
  } catch (err) {
    console.error('[admin] marketing campaign create', err);
    const msg = /Duplicate|ER_DUP/i.test(err.message || '')
      ? 'Кампания с таким slug уже есть'
      : (err.message || 'Ошибка создания');
    return res.status(err.status || 500).json({ message: msg });
  }
}

export async function updateMarketingCampaign(req, res) {
  try {
    const id = req.params.id;
    const patch = { ...(req.body || {}) };
    if (Array.isArray(patch.slots) === false && typeof patch.slots === 'string') {
      patch.slots = String(patch.slots)
        .split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (patch.paused !== undefined && Object.keys(patch).length === 1) {
      const campaign = await setCampaignPaused(id, patch.paused);
      if (!campaign) return res.status(404).json({ message: 'Не найдено' });
      return res.json({ campaign });
    }
    const campaign = await updateCampaign(id, patch);
    if (!campaign) return res.status(404).json({ message: 'Не найдено' });
    return res.json({ campaign });
  } catch (err) {
    console.error('[admin] marketing campaign update', err);
    return res.status(500).json({ message: err.message || 'Ошибка сохранения' });
  }
}

export async function pauseMarketingCampaign(req, res) {
  try {
    const paused = req.body?.paused !== false && req.body?.paused !== 0;
    const campaign = await setCampaignPaused(req.params.id, paused);
    if (!campaign) return res.status(404).json({ message: 'Не найдено' });
    return res.json({ campaign });
  } catch (err) {
    console.error('[admin] marketing campaign pause', err);
    return res.status(500).json({ message: 'Ошибка паузы' });
  }
}

export async function deleteMarketingCampaign(req, res) {
  try {
    const campaign = await deleteCampaign(req.params.id);
    if (!campaign) return res.status(404).json({ message: 'Не найдено' });
    return res.json({ ok: true, campaign });
  } catch (err) {
    console.error('[admin] marketing campaign delete', err);
    return res.status(500).json({ message: 'Ошибка удаления' });
  }
}

/* ── Дайджест «Сегодня» ── */

export async function getMarketingDigest(req, res) {
  try {
    await ensureMarketingTables();
    await seedDefaultCampaigns();
    const date = req.query.date ? String(req.query.date).slice(0, 10) : moscowDateString();
    const digest = await getDigest(date);
    return res.json(digest);
  } catch (err) {
    console.error('[admin] marketing digest get', err);
    return res.status(500).json({ message: 'Ошибка дайджеста' });
  }
}

export async function generateMarketingDigest(req, res) {
  try {
    const date = req.body?.date
      ? String(req.body.date).slice(0, 10)
      : moscowDateString();
    const force = Boolean(req.body?.force);
    const useAi = Boolean(req.body?.useAi);
    const result = await generateDigestForDate(date, { force, useAi });
    const digest = await getDigest(date);
    return res.json({ ...result, digest });
  } catch (err) {
    console.error('[admin] marketing digest generate', err);
    return res.status(500).json({ message: err.message || 'Ошибка генерации' });
  }
}

export async function publishMarketingDigestAll(req, res) {
  try {
    const date = req.body?.date
      ? String(req.body.date).slice(0, 10)
      : moscowDateString();
    const result = await publishDigestAll(date, {
      reviewedBy: adminWho(req) ? String(adminWho(req)) : null
    });
    const digest = await getDigest(date);
    return res.json({ ...result, digest });
  } catch (err) {
    console.error('[admin] marketing digest publish-all', err);
    return res.status(500).json({ message: err.message || 'Ошибка публикации' });
  }
}

export async function skipMarketingDigestItem(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ message: 'Некорректный id' });
    }
    const item = await skipDigestItem(id, {
      reviewedBy: adminWho(req) ? String(adminWho(req)) : null,
      reason: String(req.body?.reason || '').trim() || 'Пропущено'
    });
    if (!item) return res.status(404).json({ message: 'Не найдено' });
    return res.json({ item });
  } catch (err) {
    console.error('[admin] marketing digest skip', err);
    return res.status(500).json({ message: 'Ошибка пропуска' });
  }
}

export async function deleteMarketingItem(req, res) {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      return res.status(400).json({ message: 'Некорректный id' });
    }
    const existing = await getQueueItem(id);
    if (!existing) return res.status(404).json({ message: 'Не найдено' });
    if (existing.status === 'publishing') {
      return res.status(409).json({ message: 'Сейчас публикуется — подожди' });
    }
    await deleteQueueItem(id);
    return res.json({ ok: true, id });
  } catch (err) {
    console.error('[admin] marketing delete', err);
    return res.status(500).json({ message: 'Ошибка удаления' });
  }
}
