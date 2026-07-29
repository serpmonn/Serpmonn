/**
 * Доначисление стартовых баллов (+50 + +200) старым соц. аккаунтам
 * (VK ID / Messenger / VK Mini), у которых не было registration_points_awarded.
 *
 * Usage:
 *   node backend/database/migrations/backfill-social-registration-points.mjs --dry-run
 *   node backend/database/migrations/backfill-social-registration-points.mjs --apply
 */
import { query } from '../../database/config.mjs';
import { awardSocialRegistrationBonuses } from '../../points/pointsService.js';

const apply = process.argv.includes('--apply');
const dryRun = !apply;

const SELECT_ELIGIBLE = `
  SELECT id, username, email, vk_user_id, messenger_user_id,
         COALESCE(points_balance, 0) AS points_balance,
         registration_points_awarded
  FROM users
  WHERE (registration_points_awarded IS NULL OR registration_points_awarded = 0)
    AND (
      vk_user_id IS NOT NULL
      OR messenger_user_id IS NOT NULL
      OR email LIKE 'vk\\_%@vk-mini.serpmonn.local' ESCAPE '\\\\'
      OR email LIKE 'vk\\_%@users.serpmonn.ru' ESCAPE '\\\\'
      OR email LIKE 'msg\\_%@users.serpmonn.ru' ESCAPE '\\\\'
    )
  ORDER BY created_at ASC
`;

async function main() {
  const rows = await query(SELECT_ELIGIBLE);
  console.log(`Eligible social users without registration bonus: ${rows.length}`);
  if (!rows.length) {
    process.exit(0);
  }

  for (const u of rows.slice(0, 20)) {
    console.log(
      `  - ${u.id} | ${u.username} | ${u.email || '—'} | balance=${u.points_balance}` +
        (u.vk_user_id ? ` | vk=${u.vk_user_id}` : '') +
        (u.messenger_user_id ? ` | msg=${u.messenger_user_id}` : '')
    );
  }
  if (rows.length > 20) console.log(`  … and ${rows.length - 20} more`);

  if (dryRun) {
    console.log('\nDry-run only. Re-run with --apply to award +250 each.');
    process.exit(0);
  }

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  for (const u of rows) {
    try {
      const awarded = await awardSocialRegistrationBonuses(u.id, 'social_backfill');
      if (awarded) {
        ok += 1;
        console.log(`OK +250 → ${u.username} (${u.id})`);
      } else {
        skipped += 1;
        console.log(`SKIP → ${u.username} (${u.id})`);
      }
    } catch (err) {
      failed += 1;
      console.error(`FAIL → ${u.username} (${u.id}):`, err.message || err);
    }
  }

  console.log(`\nDone. awarded=${ok} skipped=${skipped} failed=${failed}`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
