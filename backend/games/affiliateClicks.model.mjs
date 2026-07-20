import { query } from '../database/config.mjs';

let tablesReady = false;

export async function ensureAffiliateClickTables() {
  if (tablesReady) return;

  await query(`
    CREATE TABLE IF NOT EXISTS affiliate_clicks (
      id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      game        VARCHAR(64) NOT NULL,
      ip          VARCHAR(64) NULL,
      ua          VARCHAR(120) NULL,
      clicked_at  DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      KEY idx_affiliate_game (game),
      KEY idx_affiliate_clicked (clicked_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  tablesReady = true;
}

function toIsoTs(value) {
  if (!value) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? String(value) : d.toISOString();
}

export async function logAffiliateClick(game, ip, ua) {
  await ensureAffiliateClickTables();

  const safeGame = String(game || '').trim().slice(0, 64);
  if (!safeGame) return;

  const safeIp = ip ? String(ip).slice(0, 64) : null;
  const safeUa = ua ? String(ua).slice(0, 120) : null;

  await query(
    `INSERT INTO affiliate_clicks (game, ip, ua)
     VALUES (?, ?, ?)`,
    [safeGame, safeIp, safeUa]
  );
}

export async function getAffiliateClickStats() {
  await ensureAffiliateClickTables();

  const totalRows = await query(
    `SELECT COUNT(*) AS cnt FROM affiliate_clicks`
  );
  const total = Number(totalRows[0]?.cnt ?? 0);

  const byGameRows = await query(
    `SELECT game, COUNT(*) AS cnt
     FROM affiliate_clicks
     GROUP BY game
     ORDER BY cnt DESC`
  );
  const byGame = {};
  for (const row of byGameRows) {
    byGame[row.game] = Number(row.cnt);
  }

  const lastRows = await query(
    `SELECT game, ip, ua, clicked_at
     FROM affiliate_clicks
     ORDER BY id DESC
     LIMIT 10`
  );
  const last10 = lastRows.map((row) => ({
    game: row.game,
    ip: row.ip,
    ua: row.ua || '',
    ts: toIsoTs(row.clicked_at),
  }));

  return { total, byGame, last10 };
}

export async function countAffiliateClicks() {
  await ensureAffiliateClickTables();
  const rows = await query(`SELECT COUNT(*) AS cnt FROM affiliate_clicks`);
  return Number(rows[0]?.cnt ?? 0);
}

export async function importAffiliateClicksFromArray(clicks) {
  await ensureAffiliateClickTables();

  if (!Array.isArray(clicks) || clicks.length === 0) {
    return { imported: 0 };
  }

  let imported = 0;
  const chunkSize = 200;

  for (let i = 0; i < clicks.length; i += chunkSize) {
    const chunk = clicks.slice(i, i + chunkSize);
    const placeholders = [];
    const values = [];

    for (const click of chunk) {
      const game = String(click?.game || '').trim().slice(0, 64);
      if (!game) continue;

      const ip = click?.ip ? String(click.ip).slice(0, 64) : null;
      const ua = click?.ua ? String(click.ua).slice(0, 120) : null;
      let clickedAt = null;
      if (click?.ts) {
        const d = new Date(click.ts);
        if (!Number.isNaN(d.getTime())) {
          clickedAt = d;
        }
      }

      placeholders.push('(?, ?, ?, COALESCE(?, CURRENT_TIMESTAMP(3)))');
      values.push(game, ip, ua, clickedAt);
    }

    if (placeholders.length === 0) continue;

    await query(
      `INSERT INTO affiliate_clicks (game, ip, ua, clicked_at)
       VALUES ${placeholders.join(', ')}`,
      values
    );
    imported += placeholders.length;
  }

  return { imported };
}
