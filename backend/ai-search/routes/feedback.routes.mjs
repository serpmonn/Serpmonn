import { getBackendMessages } from '../../utils/i18n.mjs';
import { saveAiSearchFeedback } from '../ai-feedback.model.mjs';
import { attachUserIfToken, getUserIdentity } from '../auth-identity.mjs';

function registerFeedbackRoutes(router) {
  router.post(
    '/ai-search/feedback',
    attachUserIfToken,
    async (req, res) => {
      const { locale, t } = getBackendMessages(req);

      try {
        const rating = req.body?.rating;
        const queryText = String(req.body?.query || '').trim();
        const answerText = String(req.body?.answer || '').trim();
        const usedWebSearch = req.body?.usedWebSearch === true;

        if (rating !== 'like' && rating !== 'dislike') {
          return res.status(400).json({ error: t.internalError });
        }

        if (!queryText || queryText.length > 500) {
          return res.status(400).json({ error: t.queryEmpty });
        }

        if (!answerText || answerText.length > 8000) {
          return res.status(400).json({ error: t.noModelText });
        }

        const identity = getUserIdentity(req);
        const userId = req.user?.id ? Number(req.user.id) : null;
        const guestKey = userId ? null : identity.id;

        const id = await saveAiSearchFeedback({
          rating,
          queryText,
          answerText,
          locale,
          userId: Number.isFinite(userId) ? userId : null,
          guestKey,
          usedWebSearch,
        });

        return res.json({ ok: true, id });
      } catch (error) {
        console.error('ai-search feedback error:', error.message);
        return res.status(500).json({ error: t.internalError });
      }
    }
  );
}

export { registerFeedbackRoutes };
