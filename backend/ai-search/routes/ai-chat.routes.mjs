import { getBackendMessages } from '../../utils/i18n.mjs';
import { buildChatMessages, callOllamaChat } from '../ollama-client.mjs';
import { callCursorChat, isCursorChatConfigured } from '../cursor-client.mjs';
import {
  attachUserIfToken,
  getUserIdentity,
  trackSearchQuery,
} from '../auth-identity.mjs';
import { enforceLogicalSearchLimit } from '../limits.mjs';

async function generateChatAnswer(ollamaMessages) {
  // Cursor cloud chat временно выключен (дорого/медленно для прод-чата).
  // Включить: CURSOR_CHAT_ENABLED=1 + CURSOR_API_KEY в .env
  const cursorOn =
    process.env.CURSOR_CHAT_ENABLED === '1' ||
    process.env.CURSOR_CHAT_ENABLED === 'true';
  if (cursorOn && isCursorChatConfigured()) {
    try {
      const answer = await callCursorChat(ollamaMessages);
      return { answer, engine: 'cursor' };
    } catch (err) {
      console.warn('[ai-chat] Cursor failed, fallback to Ollama:', err.message);
    }
  }
  const answer = await callOllamaChat(ollamaMessages);
  return { answer, engine: 'ollama' };
}

function registerAiChatRoutes(router) {
  router.post('/ai-chat', attachUserIfToken, async (req, res) => {
    const reqStart = process.hrtime.bigint();
    const { locale, t } = getBackendMessages(req);

    try {
      let messages = req.body?.messages;
      if (!Array.isArray(messages) || !messages.length) {
        const q = String(req.body?.q || req.body?.prompt || '').trim();
        if (!q) {
          return res.status(400).json({ error: t.queryEmpty || 'Empty message' });
        }
        messages = [{ role: 'user', content: q }];
      }

      const ollamaMessages = buildChatMessages(messages, { locale });
      if (!ollamaMessages) {
        return res.status(400).json({ error: t.queryEmpty || 'Empty message' });
      }

      const lastUser = [...messages].reverse().find((m) => m?.role === 'user');
      const queryText = String(lastUser?.content || '').slice(0, 300);

      const identity = getUserIdentity(req);
      const limitCheck = await enforceLogicalSearchLimit(req, identity, t);
      if (!limitCheck.ok) {
        trackSearchQuery(req, identity, {
          mode: 'ai',
          queryText: `[ai-chat] ${queryText}`,
          locale,
          status: 'limit',
          resultCount: 0,
          latencyMs: Number(process.hrtime.bigint() - reqStart) / 1e6,
        });
        return res.status(limitCheck.status).json(limitCheck.payload);
      }

      const { answer, engine } = await generateChatAnswer(ollamaMessages);
      const latencyMs = Number(process.hrtime.bigint() - reqStart) / 1e6;

      trackSearchQuery(req, identity, {
        mode: 'ai',
        queryText: `[ai-chat] ${queryText}`,
        locale,
        status: 'ok',
        resultCount: 1,
        latencyMs,
      });

      console.log(`/ai-chat | ok | engine=${engine} | ${latencyMs.toFixed(0)}ms`);

      return res.json({
        answer,
        engine,
        messages: [...messages, { role: 'assistant', content: answer }],
        usage: limitCheck.usage || null,
        timings: { total_ms: latencyMs },
      });
    } catch (error) {
      console.error('/ai-chat error:', error.message);
      const status = Number(error.status) || 500;
      try {
        trackSearchQuery(req, getUserIdentity(req), {
          mode: 'ai',
          queryText: '[ai-chat]',
          locale,
          status: 'error',
          resultCount: 0,
        });
      } catch (_) {}
      return res.status(status).json({
        error: t.internalError || t.networkError || error.message || 'Chat failed',
      });
    }
  });
}

export { registerAiChatRoutes };
