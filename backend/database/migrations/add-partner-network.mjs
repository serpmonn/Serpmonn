/**
 * Create partner_* tables (idempotent).
 * Usage: node backend/database/migrations/add-partner-network.mjs
 * cwd: /var/www/serpmonn-dev or /var/www/serpmonn.ru
 */
import { ensurePartnerTables } from '../../partners/partnerModel.mjs';

async function main() {
  await ensurePartnerTables();
  console.log('partner tables ready');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
