import { getBackendMessages } from '../../utils/i18n.mjs';
import {
  getAiIdempotentResponse,
  setAiIdempotentResponse,
} from '../ai-usage-store.mjs';
import { parseAttachmentInput } from '../ollama-client.mjs';
import {
  attachUserIfToken,
  getUserIdentity,
  resolveAiSafesearch,
  trackSearchQuery,
} from '../auth-identity.mjs';
import { enforceLogicalSearchLimit } from '../limits.mjs';
import {
  wantsStream,
  replayCachedStream,
  createEmptyResponsePayload,
  executeSearchTasks,
  handleStreamingSearch,
} from '../ai-pipeline.mjs';

function registerAiSearchRoutes(router) {
  router.post(
    '/ai-search',
    attachUserIfToken,
    async (req, res) => {
      const reqStart = process.hrtime.bigint();
      const { locale, t } = getBackendMessages(req);

      try {
        const q = (req.body?.q || '').trim();
        const include = req.body?.include || {};
        const mode = req.body?.mode || 'text';

        const wantText = include.text !== false;
        const wantImages = include.images === true;
        const wantVideos = include.videos === true;

        if (!q) {
          return res.status(400).json({ error: t.queryEmpty });
        }

        const attachment = parseAttachmentInput(req.body, t);

        const identity = getUserIdentity(req);

        const idempotencyKey =
          req.headers['x-idempotency-key'] ||
          req.body?.requestId ||
          null;

        if (idempotencyKey) {
          const cachedResponse = await getAiIdempotentResponse(
            identity.id,
            idempotencyKey
          );

          if (cachedResponse) {
            if (wantsStream(req)) {
              return replayCachedStream(res, cachedResponse);
            }
            return res.json(cachedResponse);
          }
        }

        const limitCheck = await enforceLogicalSearchLimit(req, identity, t);
        if (!limitCheck.ok) {
          trackSearchQuery(req, identity, {
            mode: 'ai',
            queryText: q,
            locale,
            status: 'limit',
            resultCount: 0,
            latencyMs: Number(process.hrtime.bigint() - reqStart) / 1e6,
          });
          return res.status(limitCheck.status).json(limitCheck.payload);
        }

        const stream = wantsStream(req);

        if (stream) {
          return handleStreamingSearch(req, res, {
            q,
            mode,
            wantText,
            wantImages,
            wantVideos,
            t,
            idempotencyKey,
            identity,
            reqStart,
            attachment,
            locale,
          });
        }

        const responsePayload = createEmptyResponsePayload(q, mode);

        const { settled, branchTimings } = await executeSearchTasks({
          q,
          t,
          wantText,
          wantImages,
          wantVideos,
          responsePayload,
          emit: null,
          attachment,
          safesearch: resolveAiSafesearch(req),
        });

        const textFailure = settled.find(
          (item) =>
            item.status === 'rejected' &&
            item.reason?.isPublic === true
        );

        if (wantText && textFailure && !responsePayload.answer) {
          trackSearchQuery(req, identity, {
            mode: 'ai',
            queryText: q,
            locale,
            status: 'error',
            resultCount: 0,
            latencyMs: Number(process.hrtime.bigint() - reqStart) / 1e6,
          });
          return res.status(textFailure.reason.status || 502).json({
            error: textFailure.reason.message || t.aiUnavailable,
            images: Array.isArray(responsePayload.images) ? responsePayload.images : [],
            videos: Array.isArray(responsePayload.videos) ? responsePayload.videos : [],
            sources: [],
            usedWebSearch: false,
            model: null,
            usedBackup: false,
            partialFailures: responsePayload.partialFailures,
            timestamp: new Date().toISOString(),
          });
        }

        const reqEnd = process.hrtime.bigint();
        const totalMs = Number(reqEnd - reqStart) / 1e6;

        responsePayload.timings = {
          total_ms: totalMs,
          ...branchTimings,
        };

        console.log('/ai-search | total=' + totalMs.toFixed(0) + 'ms | ok');

        const resultCount = [
          responsePayload.answer ? 1 : 0,
          Array.isArray(responsePayload.images) ? responsePayload.images.length : 0,
          Array.isArray(responsePayload.videos) ? responsePayload.videos.length : 0,
          Array.isArray(responsePayload.sources) ? responsePayload.sources.length : 0,
        ].reduce((a, b) => a + b, 0);
        trackSearchQuery(req, identity, {
          mode: 'ai',
          queryText: q,
          locale,
          status: responsePayload.answerEmpty || !responsePayload.answer ? 'empty' : 'ok',
          resultCount,
          latencyMs: totalMs,
        });

        if (idempotencyKey) {
          await setAiIdempotentResponse(identity.id, idempotencyKey, responsePayload);
        }

        return res.json(responsePayload);
      } catch (error) {
        console.error('💥 Ошибка в /ai-search:', error.message);

        try {
          const q = (req.body?.q || '').trim();
          if (q) {
            trackSearchQuery(req, getUserIdentity(req), {
              mode: 'ai',
              queryText: q,
              locale: getBackendMessages(req).locale || 'ru',
              status: 'error',
              resultCount: 0,
            });
          }
        } catch (_) {}

        if (error?.isPublic) {
          return res.status(error.status || 400).json({
            error: error.message || t.internalError,
          });
        }

        return res.status(500).json({ error: t.internalError });
      }
    }
  );
}

export { registerAiSearchRoutes };
