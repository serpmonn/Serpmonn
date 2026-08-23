import { channelHealth, listChannels } from '../marketing/channels/index.mjs';
import { publishQueueItem } from '../marketing/dispatcher.mjs';
import {
  createQueueItem,
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
import { createReadStream, constants as fsConstants } from 'fs';
import { access, stat } from 'fs/promises';
import { extname, join } from 'path';

function adminWho(req) {
  return req.admin?.email || req.admin?.username || req.admin?.sub || req.admin?.id || null;
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

    const needRender = Boolean(tpl.render) || applied.format === 'video';
    let item = await createQueueItem({
      ...applied,
      status: needRender ? 'rendering' : 'pending_review',
      created_by: adminWho(req) ? String(adminWho(req)) : null,
      meta: { templateId }
    });

    if (needRender) {
      try {
        item = await maybeRenderForItem(item, tpl);
      } catch (renderErr) {
        console.error('[admin] marketing render', renderErr);
        item = await updateQueueItem(item.id, {
          status: 'failed',
          meta: { templateId, renderError: renderErr.message }
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
    if (req.body?.body != null) patch.body = req.body.body;
    if (req.body?.cta_url != null) patch.cta_url = req.body.cta_url;
    if (req.body?.product != null) patch.product = req.body.product;
    if (req.body?.format != null) patch.format = req.body.format;
    if (Array.isArray(req.body?.channels)) patch.channels = req.body.channels.map(String);
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
    if (
      req.body?.title != null ||
      req.body?.body != null ||
      req.body?.cta_url != null ||
      Array.isArray(req.body?.channels) ||
      req.body?.publish_at !== undefined
    ) {
      await updateQueueItem(id, {
        title: req.body.title,
        body: req.body.body,
        cta_url: req.body.cta_url,
        channels: Array.isArray(req.body.channels) ? req.body.channels.map(String) : undefined,
        publish_at: req.body.publish_at !== undefined ? req.body.publish_at || null : undefined
      });
    }
    const item = await publishQueueItem(id, {
      reviewedBy: adminWho(req) ? String(adminWho(req)) : null,
      channels: Array.isArray(req.body?.channels) ? req.body.channels.map(String) : undefined
    });
    return res.json({ item });
  } catch (err) {
    console.error('[admin] marketing publish', err);
    const status = err.status || 500;
    return res.status(status).json({ message: err.message || 'Ошибка публикации' });
  }
}

export async function listMarketingChannels(_req, res) {
  try {
    const channels = await channelHealth();
    return res.json({ channels, registry: listChannels() });
  } catch (err) {
    console.error('[admin] marketing channels', err);
    return res.status(500).json({ message: 'Ошибка каналов' });
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
