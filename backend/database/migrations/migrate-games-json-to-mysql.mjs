/**
 * Создаёт таблицы game_leaderboard_scores / affiliate_clicks
 * и однократно импортирует данные из JSON, если таблицы пустые.
 *
 * Запуск: node backend/database/migrations/migrate-games-json-to-mysql.mjs
 */
import { readFile, rename } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  ensureLeaderboardTables,
  countLeaderboardScores,
  importLeaderboardFromObject,
} from '../../games/leaderboard.model.mjs';
import {
  ensureAffiliateClickTables,
  countAffiliateClicks,
  importAffiliateClicksFromArray,
} from '../../games/affiliateClicks.model.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const gamesDir = join(__dirname, '../../games');
const leaderboardFile = join(gamesDir, 'leaderboards.json');
const clicksFile = join(gamesDir, 'affiliate-clicks.json');

async function backupJson(filePath) {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const bak = `${filePath}.imported-${stamp}.bak`;
  await rename(filePath, bak);
  return bak;
}

async function migrateLeaderboards() {
  await ensureLeaderboardTables();
  const existing = await countLeaderboardScores();
  if (existing > 0) {
    console.log(`leaderboards: table already has ${existing} rows — skip import`);
    return;
  }

  let raw;
  try {
    raw = await readFile(leaderboardFile, 'utf8');
  } catch (err) {
    if (err?.code === 'ENOENT') {
      console.log('leaderboards: JSON not found — nothing to import');
      return;
    }
    throw err;
  }

  const data = JSON.parse(raw);
  const result = await importLeaderboardFromObject(data);
  console.log(
    `leaderboards: imported ${result.imported} scores across ${result.games} games`
  );

  if (result.imported > 0) {
    const bak = await backupJson(leaderboardFile);
    console.log(`leaderboards: JSON moved to ${bak}`);
  }
}

async function migrateAffiliateClicks() {
  await ensureAffiliateClickTables();
  const existing = await countAffiliateClicks();
  if (existing > 0) {
    console.log(`affiliate_clicks: table already has ${existing} rows — skip import`);
    return;
  }

  let raw;
  try {
    raw = await readFile(clicksFile, 'utf8');
  } catch (err) {
    if (err?.code === 'ENOENT') {
      console.log('affiliate_clicks: JSON not found — nothing to import');
      return;
    }
    throw err;
  }

  const data = JSON.parse(raw);
  const result = await importAffiliateClicksFromArray(data);
  console.log(`affiliate_clicks: imported ${result.imported} clicks`);

  if (result.imported > 0) {
    const bak = await backupJson(clicksFile);
    console.log(`affiliate_clicks: JSON moved to ${bak}`);
  }
}

async function migrate() {
  console.log('Migrating games JSON → MySQL...');
  await migrateLeaderboards();
  await migrateAffiliateClicks();
  console.log('Done.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
