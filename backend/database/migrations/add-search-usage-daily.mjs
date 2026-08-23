/**
 * Дневные лимиты ИИ/Выдачи + idempotency-кэш в MySQL
 * (вместо in-memory Map, которые сбрасывались при рестарте PM2).
 *
 * Запуск: node backend/database/migrations/add-search-usage-daily.mjs
 */
import {
  ensureAiUsageTables,
} from '../../ai-search/ai-usage-store.mjs';
import { ensureWebUsageTables } from '../../ai-search/web-usage-store.mjs';

async function migrate() {
  await ensureAiUsageTables();
  await ensureWebUsageTables();
  console.log('ai_usage_daily + ai_search_idempotency + web_usage_daily ready');
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
