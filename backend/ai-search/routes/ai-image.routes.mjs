import { access, stat } from 'fs/promises';
import { constants as fsConstants } from 'fs';
import { extname } from 'path';

import { getBackendMessages } from '../../utils/i18n.mjs';
import { generateImageWithGigaChat } from '../gigachat-client.mjs';
import { storeAiGeneratedImage, resolveAiGeneratedPath } from '../ai-image-store.mjs';
import { insertAiGeneratedImage } from '../ai-generated-images-store.mjs';
import {
  attachUserIfToken,
  getUserIdentity,
  trackSearchQuery,
} from '../auth-identity.mjs';
import { enforceImageLimit, refundImageUsage, refundImageProMonthly } from '../limits.mjs';

function registerAiImageRoutes(router) {
  router.post('/ai-image', attachUserIfToken, async (req, res) => {
    const reqStart = process.hrtime.bigint();
    const { locale, t } = getBackendMessages(req);
    let limitCheck = null;

    try {
      const prompt = String(req.body?.prompt || req.body?.q || '').trim();
      if (!prompt) {
        return res.status(400).json({ error: t.queryEmpty || 'Empty prompt' });
      }
      if (prompt.length > 1000) {
        return res.status(400).json({ error: t.attachmentTooLarge || 'Prompt too long' });
      }

      const identity = getUserIdentity(req);
      limitCheck = await enforceImageLimit(req, identity, t);
      if (!limitCheck.ok) {
        trackSearchQuery(req, identity, {
          mode: 'ai',
          queryText: `[ai-image] ${prompt}`.slice(0, 300),
          locale,
          status: 'limit',
          resultCount: 0,
          latencyMs: Number(process.hrtime.bigint() - reqStart) / 1e6,
        });
        return res.status(limitCheck.status).json(limitCheck.payload);
      }

      const generated = await generateImageWithGigaChat(prompt);
      const stored = await storeAiGeneratedImage(generated.buffer, generated.contentType);
      const latencyMs = Number(process.hrtime.bigint() - reqStart) / 1e6;

      const userId =
        identity?.type === 'user' && req.user?.id != null ? String(req.user.id) : null;
      try {
        await insertAiGeneratedImage({
          id: stored.id,
          fileName: stored.fileName,
          contentType: generated.contentType,
          bytes: generated.buffer.length,
          prompt,
          caption: generated.caption || '',
          userId,
          identityKey: identity?.id || '',
          locale,
          visibility: 'admin',
        });
      } catch (metaErr) {
        console.warn('[ai-image] metadata insert failed:', metaErr.message);
      }

      trackSearchQuery(req, identity, {
        mode: 'ai',
        queryText: `[ai-image] ${prompt}`.slice(0, 300),
        locale,
        status: 'ok',
        resultCount: 1,
        latencyMs,
        imagePath: stored.imagePath,
      });

      console.log(
        `/ai-image | ok | bytes=${generated.buffer.length}` +
          ` | tokens=${generated.usage?.total_tokens || '?'} | ${latencyMs.toFixed(0)}ms`
      );

      return res.json({
        prompt,
        caption: generated.caption || '',
        imageUrl: `/ai-image/file/${stored.fileName}`,
        contentType: generated.contentType,
        usage: limitCheck.usage
          ? { ok: true, limit: limitCheck.usage.limit, used: limitCheck.usage.used }
          : null,
        timings: { total_ms: latencyMs },
      });
    } catch (error) {
      console.error('/ai-image error:', error.message);
      try {
        if (limitCheck?.ok && limitCheck.usage) {
          if (limitCheck.plan === 'pro') {
            await refundImageProMonthly(limitCheck.usage);
          } else {
            await refundImageUsage(limitCheck.usage);
          }
        }
      } catch (_) {}
      try {
        trackSearchQuery(req, getUserIdentity(req), {
          mode: 'ai',
          queryText: `[ai-image] ${String(req.body?.prompt || req.body?.q || '').slice(0, 200)}`,
          locale,
          status: 'error',
          resultCount: 0,
        });
      } catch (_) {}

      const status = Number(error.status) || 500;
      return res.status(status).json({
        error:
          status === 429
            ? t.proLimit || 'Too many requests'
            : status === 402
              ? t.proLimit || 'Quota exceeded'
              : t.imageGenError || t.internalError || t.networkError || error.message || 'Image generation failed',
      });
    }
  });

  router.get('/ai-image/file/:name', async (req, res) => {
    try {
      const abs = resolveAiGeneratedPath(req.params.name);
      if (!abs) return res.status(400).json({ error: 'Bad file' });
      await access(abs, fsConstants.R_OK);
      const st = await stat(abs);
      const ext = extname(abs).toLowerCase();
      const types = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
      };
      res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
      res.setHeader('Content-Length', st.size);
      res.setHeader('Cache-Control', 'private, max-age=86400');
      return res.sendFile(abs);
    } catch (err) {
      return res.status(404).json({ error: 'Not found' });
    }
  });
}

export { registerAiImageRoutes };
