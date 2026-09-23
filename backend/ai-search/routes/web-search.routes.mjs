import { getBackendMessages } from '../../utils/i18n.mjs';
import { fetchSearxViaCurl, fetchSearxAutocompleteViaCurl } from '../../utils/fetchSearxViaCurl.js';
import { attachUserIfToken, getUserIdentity, trackSearchQuery } from '../auth-identity.mjs';
import { enforceWebSearchLimit } from '../limits.mjs';
import { isSearxHardFailure } from '../web-text.mjs';
import {
  WEB_CATEGORIES,
  WEB_TIME_RANGES,
  WEB_SAFESEARCH,
  normalizeWebSearchResults,
  localeToSearxLanguage,
  normalizeWebSearchExtras,
} from '../web-search-normalize.mjs';
import { isDossierQuery, simplifyDossierQuery } from '../ai-intent.mjs';

function registerWebSearchRoutes(router) {
  router.post(
    '/web-search',
    attachUserIfToken,
    async (req, res) => {
      const { locale, t } = getBackendMessages(req);
      const reqStart = process.hrtime.bigint();

      try {
        const q = String(req.body?.q || '').trim();
        const categoryRaw = String(req.body?.category || 'general').trim().toLowerCase();
        const category = WEB_CATEGORIES.has(categoryRaw) ? categoryRaw : 'general';

        if (!q) {
          return res.status(400).json({ error: t.queryEmpty });
        }

        // «Досье со всех сайтов»: есть имя — ищем по нему + пометка;
        // нет имени — всё равно обычный поиск по исходному тексту (без экрана отказа).
        let dossierMeta = null;
        let searchQ = q;
        if (isDossierQuery(q)) {
          const suggestQuery = simplifyDossierQuery(q);
          if (suggestQuery) {
            dossierMeta = { originalQ: q, suggestQuery };
            searchQ = suggestQuery;
          }
        }

        const identity = getUserIdentity(req);
        const limitCheck = await enforceWebSearchLimit(req, identity, t);
        if (!limitCheck.ok) {
          trackSearchQuery(req, identity, {
            mode: 'web',
            queryText: q,
            category,
            locale,
            status: 'limit',
            resultCount: 0,
            latencyMs: Number(process.hrtime.bigint() - reqStart) / 1e6,
          });
          return res.status(limitCheck.status).json(limitCheck.payload);
        }

        const language = localeToSearxLanguage(req.body?.locale || locale);
        const timeRangeRaw = String(req.body?.timeRange || req.body?.time_range || '').trim().toLowerCase();
        const timeRange = WEB_TIME_RANGES.has(timeRangeRaw) ? timeRangeRaw : '';
        const safesearchRaw = Number(req.body?.safesearch);
        const safesearch = WEB_SAFESEARCH.has(safesearchRaw) ? safesearchRaw : 2;

        const data = await fetchSearxViaCurl(searchQ, category, {
          ...(language ? { language } : {}),
          ...(timeRange ? { timeRange } : {}),
          safesearch,
        });
        const results = normalizeWebSearchResults(category, searchQ, data, t);
        const extras = normalizeWebSearchExtras(data);
        const totalMs = Number(process.hrtime.bigint() - reqStart) / 1e6;

        // Падение SearX (curl/parse/empty) не маскируем под «ничего не найдено»
        if (isSearxHardFailure(data) && results.length === 0) {
          trackSearchQuery(req, identity, {
            mode: 'web',
            queryText: searchQ,
            category,
            locale,
            status: 'error',
            resultCount: 0,
            latencyMs: totalMs,
          });
          return res.status(502).json({
            error: t.resultsNetworkError || t.networkError || t.internalError,
            searxDown: true,
          });
        }

        console.log(
          `/web-search | category=${category} | lang=${language || 'auto'}` +
            ` | time=${timeRange || 'any'} | safe=${safesearch}` +
            ` | results=${results.length}` +
            (dossierMeta ? ` | dossier→${JSON.stringify(searchQ)}` : '') +
            ` | answers=${extras.answers.length} | infoboxes=${extras.infoboxes.length}` +
            ` | suggestions=${extras.suggestions.length} | corrections=${extras.corrections.length}` +
            ` | total=${totalMs.toFixed(0)}ms`
        );

        trackSearchQuery(req, identity, {
          mode: 'web',
          queryText: searchQ,
          category,
          locale,
          status: results.length === 0 ? 'empty' : 'ok',
          resultCount: results.length,
          latencyMs: totalMs,
        });

        return res.json({
          q: searchQ,
          category,
          timeRange: timeRange || null,
          safesearch,
          results,
          ...extras,
          timings: { total_ms: totalMs },
          ...(dossierMeta
            ? {
                dossierRewritten: true,
                originalQ: dossierMeta.originalQ,
                suggestQuery: dossierMeta.suggestQuery,
              }
            : {}),
        });
      } catch (error) {
        console.error('💥 Ошибка в /web-search:', error.message);
        try {
          const q = String(req.body?.q || '').trim();
          if (q) {
            trackSearchQuery(req, getUserIdentity(req), {
              mode: 'web',
              queryText: q,
              category: String(req.body?.category || 'general').slice(0, 32),
              locale: getBackendMessages(req).locale || 'ru',
              status: 'error',
              resultCount: 0,
            });
          }
        } catch (_) {}
        return res.status(500).json({ error: t.internalError || t.networkError || 'Search error' });
      }
    }
  );

  router.get(
    '/web-autocomplete',
    async (req, res) => {
      try {
        const q = String(req.query?.q || '').trim();
        if (q.length < 2) {
          return res.json({ q, suggestions: [] });
        }
        const suggestions = await fetchSearxAutocompleteViaCurl(q);
        return res.json({ q, suggestions });
      } catch (error) {
        console.error('💥 Ошибка в /web-autocomplete:', error.message);
        return res.json({ q: String(req.query?.q || ''), suggestions: [] });
      }
    }
  );
}

export { registerWebSearchRoutes };
