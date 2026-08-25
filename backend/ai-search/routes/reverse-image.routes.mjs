import multer from 'multer';

import { getBackendMessages } from '../../utils/i18n.mjs';
import {
  MAX_BYTES as REVERSE_IMAGE_MAX_BYTES,
  isAllowedReverseImageMime,
  storeReverseImage,
  removeReverseImage,
  reverseImageSearch,
  archiveReverseImageForLog,
} from '../reverse-image.mjs';
import { attachUserIfToken, getUserIdentity, trackSearchQuery } from '../auth-identity.mjs';
import { enforceWebSearchLimit } from '../limits.mjs';
import { WEB_RESULT_LIMIT } from '../web-search-normalize.mjs';

const reverseImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: REVERSE_IMAGE_MAX_BYTES, files: 1 },
});

function registerReverseImageRoutes(router) {
  router.post(
    '/web-search/reverse-image',
    attachUserIfToken,
    (req, res, next) => {
      reverseImageUpload.single('image')(req, res, (err) => {
        if (!err) return next();
        const { t } = getBackendMessages(req);
        if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({
            error: t.reverseImageTooLarge || t.attachmentTooLarge || 'Image too large',
            maxBytes: REVERSE_IMAGE_MAX_BYTES,
          });
        }
        return res.status(400).json({ error: t.reverseImageInvalid || t.attachmentInvalidType || 'Invalid image' });
      });
    },
    async (req, res) => {
      const { locale, t } = getBackendMessages(req);
      const reqStart = process.hrtime.bigint();
      let storedPath = null;
      let logImagePath = null;

      try {
        const file = req.file;
        if (!file?.buffer?.length) {
          return res.status(400).json({
            error: t.reverseImageMissing || t.attachmentInvalidType || 'Image required',
          });
        }
        if (!isAllowedReverseImageMime(file.mimetype)) {
          return res.status(415).json({
            error: t.reverseImageInvalid || t.attachmentInvalidType || 'Unsupported image type',
          });
        }

        const identity = getUserIdentity(req);
        const limitCheck = await enforceWebSearchLimit(req, identity, t);
        if (!limitCheck.ok) {
          trackSearchQuery(req, identity, {
            mode: 'web',
            queryText: '[reverse-image]',
            category: 'images',
            locale,
            status: 'limit',
            resultCount: 0,
            latencyMs: Number(process.hrtime.bigint() - reqStart) / 1e6,
          });
          return res.status(limitCheck.status).json(limitCheck.payload);
        }

        const stored = await storeReverseImage(file.buffer, file.mimetype);
        storedPath = stored.absPath;

        const archived = await archiveReverseImageForLog(file.buffer, file.mimetype);
        logImagePath = archived?.imagePath || null;

        const found = await reverseImageSearch({
          buffer: file.buffer,
          mime: file.mimetype,
          publicUrl: stored.publicUrl,
        });

        const results = (found.results || []).slice(0, WEB_RESULT_LIMIT).map((item) => ({
          title: item.title,
          url: item.url,
          content: item.content,
          engine: item.engine,
          hostname: item.hostname,
          thumbnail: item.thumbnail || item.imageUrl || '',
          img_src: item.imageUrl || item.thumbnail || '',
          thumbnail_src: item.thumbnail || item.imageUrl || '',
          score: item.score,
        }));

        const totalMs = Number(process.hrtime.bigint() - reqStart) / 1e6;
        const status = results.length === 0 ? 'empty' : 'ok';
        // Страницы с совпадениями читаются лучше списком, чем сеткой картинок
        const category = 'general';

        trackSearchQuery(req, identity, {
          mode: 'web',
          queryText: '[reverse-image]',
          category,
          locale,
          status,
          resultCount: results.length,
          latencyMs: totalMs,
          imagePath: logImagePath,
        });

        console.log(
          `/web-search/reverse-image | engine=${found.engine || 'none'}` +
            ` | results=${results.length}` +
            ` | attempts=${JSON.stringify(found.attempts || [])}` +
            ` | total=${totalMs.toFixed(0)}ms`
        );

        return res.json({
          q: '',
          category,
          reverseImage: true,
          engine: found.engine,
          imageUrl: found.imageUrl || stored.publicUrl,
          results,
          answers: [],
          suggestions: [],
          corrections: [],
          infoboxes: [],
          attempts: found.attempts || [],
          timings: { total_ms: totalMs },
          ...(results.length === 0
            ? { error: t.reverseImageEmpty || t.resultsEmpty || 'Nothing found' }
            : {}),
        });
      } catch (error) {
        console.error('💥 Ошибка в /web-search/reverse-image:', error.message);
        try {
          trackSearchQuery(req, getUserIdentity(req), {
            mode: 'web',
            queryText: '[reverse-image]',
            category: 'images',
            locale,
            status: 'error',
            resultCount: 0,
            imagePath: logImagePath,
          });
        } catch (_) {}
        const status = Number(error.status) || 500;
        return res.status(status).json({
          error:
            status === 413
              ? t.reverseImageTooLarge || t.attachmentTooLarge
              : status === 415
                ? t.reverseImageInvalid || t.attachmentInvalidType
                : t.reverseImageError || t.internalError || t.networkError,
        });
      } finally {
        // Файл оставляем на TTL — превью/повтор TinEye; cleanup по cron TTL
        void storedPath;
      }
    }
  );
}

export { registerReverseImageRoutes };
