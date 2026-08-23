import { getBackendMessages } from '../utils/i18n.mjs';
import { setAiIdempotentResponse } from './ai-usage-store.mjs';
import {
  normalizeAiAnswer,
  resolveAttachmentSearchMode,
  getAiAnswerFromLocalModels,
} from './ollama-client.mjs';
import {
  webSearchWithSearxng,
  imageSearchWithSearxng,
  videoSearchWithSearxng,
} from './ai-searx.mjs';
import { resolveAiSafesearch, trackSearchQuery } from './auth-identity.mjs';

function wantsStream(req) {
  return (
    req.body?.stream === true ||
    String(req.headers.accept || '').includes('application/x-ndjson')
  );
}

function writeNdjson(res, payload) {
  if (res.writableEnded) return;
  res.write(`${JSON.stringify(payload)}\n`);
}

function startNdjsonResponse(res) {
  res.status(200);
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }
}

function replayCachedStream(res, cachedResponse) {
  startNdjsonResponse(res);
  writeNdjson(res, { event: 'status', phase: 'searching' });

  if (cachedResponse.answer) {
    writeNdjson(res, {
      event: 'text_done',
      answer: cachedResponse.answer,
      sources: cachedResponse.sources || [],
      usedWebSearch: cachedResponse.usedWebSearch === true,
      model: cachedResponse.model || null,
      usedBackup: cachedResponse.usedBackup === true,
    });
  }

  if (Array.isArray(cachedResponse.images) && cachedResponse.images.length > 0) {
    writeNdjson(res, { event: 'images', images: cachedResponse.images });
  }

  if (Array.isArray(cachedResponse.videos) && cachedResponse.videos.length > 0) {
    writeNdjson(res, { event: 'videos', videos: cachedResponse.videos });
  }

  writeNdjson(res, {
    event: 'done',
    timings: cachedResponse.timings || null,
    partialFailures: cachedResponse.partialFailures || [],
  });

  res.end();
}

function createEmptyResponsePayload(q, mode) {
  return {
    query: q,
    mode,
    answer: null,
    images: [],
    videos: [],
    sources: [],
    usedWebSearch: false,
    model: null,
    usedBackup: false,
    partialFailures: [],
    timestamp: new Date().toISOString(),
    timings: null,
    answerEmpty: false,
    answerEmptyReason: null,
    attachmentUsed: false,
    attachmentName: null,
  };
}

async function runTextTask(q, t, responsePayload, emit, attachment = null, safesearch = 2) {
  const hasAttachment = Boolean(attachment?.text);
  const searchMode = hasAttachment ? resolveAttachmentSearchMode(q) : { fileOnly: false, reason: 'no_attachment' };
  const fileOnly = hasAttachment && searchMode.fileOnly;
  let webContext = t.searchNoData;
  let sources = [];
  let searxMs = 0;

  if (hasAttachment) {
    console.log(`[AI] attachment mode: ${fileOnly ? 'file_only' : 'hybrid'} (${searchMode.reason}) q="${q.slice(0, 80)}"`);
  }

  if (!fileOnly) {
    const searxStart = process.hrtime.bigint();
    const searxResult = await webSearchWithSearxng(q, t, safesearch);
    webContext = searxResult.webContext;
    sources = searxResult.sources;
    const searxEnd = process.hrtime.bigint();
    searxMs = Number(searxEnd - searxStart) / 1e6;
  }

  const usedWebSearch = !fileOnly;
  responsePayload.sources = sources;
  responsePayload.usedWebSearch = usedWebSearch;
  responsePayload.attachmentUsed = hasAttachment;
  responsePayload.attachmentName = attachment?.name || null;

  if (emit) {
    emit({
      event: 'text_start',
      sources,
      usedWebSearch,
      attachmentUsed: hasAttachment,
      attachmentName: responsePayload.attachmentName,
      timings: usedWebSearch ? { searx_ms: searxMs } : {},
    });
    emit({ event: 'status', phase: 'generating' });
  }

  const modelStart = process.hrtime.bigint();
  let aiResult;
  try {
    aiResult = await getAiAnswerFromLocalModels(q, webContext, {
      attachment,
      fileOnly,
      hasWebHits: sources.length > 0,
      onToken: emit
        ? (chunk) => emit({ event: 'text_delta', chunk })
        : null,
    });
  } catch (e) {
    const publicError = new Error(t.aiUnavailable);
    publicError.isPublic = true;
    publicError.status = 502;
    publicError.phase = 'text';
    throw publicError;
  }
  const modelEnd = process.hrtime.bigint();
  const modelMs = Number(modelEnd - modelStart) / 1e6;

  const normalized = normalizeAiAnswer(aiResult.answer, t);

  responsePayload.answer = normalized.text;
  responsePayload.answerEmpty = normalized.isEmpty;
  responsePayload.answerEmptyReason = normalized.reason;
  responsePayload.model = aiResult.model;
  responsePayload.usedBackup = aiResult.usedBackup;

  const textTimings = { searx_ms: searxMs, model_ms: modelMs };

  if (emit) {
    emit({
      event: 'text_done',
      answer: responsePayload.answer,
      sources: responsePayload.sources,
      usedWebSearch: responsePayload.usedWebSearch === true,
      model: responsePayload.model,
      usedBackup: responsePayload.usedBackup,
      answerEmpty: responsePayload.answerEmpty,
      answerEmptyReason: responsePayload.answerEmptyReason,
      attachmentUsed: responsePayload.attachmentUsed,
      attachmentName: responsePayload.attachmentName,
      timings: textTimings,
    });
  }

  return { type: 'text', timings: textTimings };
}

async function runImagesTask(q, t, responsePayload, emit, safesearch = 2) {
  const start = process.hrtime.bigint();
  const images = await imageSearchWithSearxng(q, t, safesearch);
  const end = process.hrtime.bigint();
  const imagesMs = Number(end - start) / 1e6;

  responsePayload.images = images;

  if (emit) {
    emit({
      event: 'images',
      images,
      timings: { images_ms: imagesMs },
    });
  }

  return { type: 'images', timings: { images_ms: imagesMs } };
}

async function runVideosTask(q, t, responsePayload, emit, safesearch = 2) {
  const start = process.hrtime.bigint();
  const videos = await videoSearchWithSearxng(q, t, safesearch);
  const end = process.hrtime.bigint();
  const videosMs = Number(end - start) / 1e6;

  responsePayload.videos = videos;

  if (emit) {
    emit({
      event: 'videos',
      videos,
      timings: { videos_ms: videosMs },
    });
  }

  return { type: 'videos', timings: { videos_ms: videosMs } };
}

async function executeSearchTasks({
  q,
  t,
  wantText,
  wantImages,
  wantVideos,
  responsePayload,
  emit,
  attachment = null,
  safesearch = 2,
}) {
  const tasks = [];
  const branchTimings = {};

  if (wantText) {
    tasks.push(
      runTextTask(q, t, responsePayload, emit, attachment, safesearch).then((result) => {
        Object.assign(branchTimings, result.timings);
        return result;
      })
    );
  }

  if (wantImages) {
    tasks.push(
      runImagesTask(q, t, responsePayload, emit, safesearch).then((result) => {
        Object.assign(branchTimings, result.timings);
        return result;
      })
    );
  }

  if (wantVideos) {
    tasks.push(
      runVideosTask(q, t, responsePayload, emit, safesearch).then((result) => {
        Object.assign(branchTimings, result.timings);
        return result;
      })
    );
  }

  const settled = await Promise.allSettled(tasks);

  for (const item of settled) {
    if (item.status === 'rejected') {
      const reason = item.reason;
      const message = reason?.message || t.unknownTaskError;

      responsePayload.partialFailures.push(message);

      if (emit) {
        emit({
          event: 'error',
          error: reason?.isPublic ? message : t.internalError,
          phase: reason?.phase || 'unknown',
        });
      }
    }
  }

  return { settled, branchTimings };
}

async function handleStreamingSearch(req, res, ctx) {
  const {
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
  } = ctx;

  startNdjsonResponse(res);
  writeNdjson(res, { event: 'status', phase: 'searching' });

  const responsePayload = createEmptyResponsePayload(q, mode);
  const emit = (payload) => writeNdjson(res, payload);

  const { settled, branchTimings } = await executeSearchTasks({
    q,
    t,
    wantText,
    wantImages,
    wantVideos,
    responsePayload,
    emit,
    attachment,
    safesearch: resolveAiSafesearch(req),
  });

  const reqEnd = process.hrtime.bigint();
  const totalMs = Number(reqEnd - reqStart) / 1e6;
  const timings = {
    total_ms: totalMs,
    ...branchTimings,
  };

  responsePayload.timings = timings;

  writeNdjson(res, {
    event: 'done',
    timings,
    partialFailures: responsePayload.partialFailures,
  });

  console.log('/ai-search | stream | total=' + totalMs.toFixed(0) + 'ms | ok');

  const resultCount = [
    responsePayload.answer ? 1 : 0,
    Array.isArray(responsePayload.images) ? responsePayload.images.length : 0,
    Array.isArray(responsePayload.videos) ? responsePayload.videos.length : 0,
    Array.isArray(responsePayload.sources) ? responsePayload.sources.length : 0,
  ].reduce((a, b) => a + b, 0);
  const streamStatus =
    responsePayload.answerEmpty || !responsePayload.answer ? 'empty' : 'ok';
  trackSearchQuery(req, identity, {
    mode: 'ai',
    queryText: q,
    locale: getBackendMessages(req).locale || 'ru',
    status: streamStatus,
    resultCount,
    latencyMs: totalMs,
  });

  if (idempotencyKey) {
    await setAiIdempotentResponse(identity.id, idempotencyKey, responsePayload);
  }

  res.end();
}

export {
  wantsStream,
  writeNdjson,
  startNdjsonResponse,
  replayCachedStream,
  createEmptyResponsePayload,
  runTextTask,
  runImagesTask,
  runVideosTask,
  executeSearchTasks,
  handleStreamingSearch,
};
