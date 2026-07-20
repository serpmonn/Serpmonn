import { query } from '../database/config.mjs';

let tablesReady = false;

const MAX_SCORES_PER_GAME = 5000;

export function normalizeGameId(raw) {
  const base = String(raw || 'global')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '')
    .slice(0, 32);
  return base || 'global';
}

export async function ensureLeaderboardTables() {
  if (tablesReady) return;

  await query(`
    CREATE TABLE IF NOT EXISTS game_leaderboard_scores (
      id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      game_id     VARCHAR(32) NOT NULL,
      nickname    VARCHAR(40) NOT NULL,
      score       INT UNSIGNED NOT NULL DEFAULT 0,
      created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_game_score (game_id, score),
      KEY idx_game_created (game_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);

  tablesReady = true;
}

export async function addLeaderboardScore({ nickname, score, gameId }) {
  await ensureLeaderboardTables();

  const gid = normalizeGameId(gameId);
  const safeNickname =
    String(nickname || '').trim().slice(0, 40) ||
    `Player#${((Math.random() * 1e6) | 0).toString(36)}`;
  const safeScore = Number.isFinite(Number(score))
    ? Math.max(0, Math.floor(Number(score)))
    : 0;

  await query(
    `INSERT INTO game_leaderboard_scores (game_id, nickname, score)
     VALUES (?, ?, ?)`,
    [gid, safeNickname, safeScore]
  );

  const rows = await query(
    `SELECT COUNT(*) AS cnt FROM game_leaderboard_scores WHERE game_id = ?`,
    [gid]
  );
  const cnt = Number(rows[0]?.cnt ?? 0);

  if (cnt > MAX_SCORES_PER_GAME) {
    await query(
      `DELETE FROM game_leaderboard_scores
       WHERE game_id = ?
         AND id NOT IN (
           SELECT id FROM (
             SELECT id FROM game_leaderboard_scores
             WHERE game_id = ?
             ORDER BY score DESC, id DESC
             LIMIT ${MAX_SCORES_PER_GAME}
           ) keep_ids
         )`,
      [gid, gid]
    );
  }

  return { gameId: gid, nickname: safeNickname, score: safeScore };
}

export async function getLeaderboardPage({ gameId, page = 1, limit = 20 } = {}) {
  await ensureLeaderboardTables();

  const gid = normalizeGameId(gameId);
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const offset = (safePage - 1) * safeLimit;

  const rows = await query(
    `SELECT nickname, score
     FROM game_leaderboard_scores
     WHERE game_id = ?
     ORDER BY score DESC, id DESC
     LIMIT ${safeLimit} OFFSET ${offset}`,
    [gid]
  );

  return rows.map((row) => ({
    nickname: row.nickname,
    score: Number(row.score),
  }));
}

export async function countLeaderboardScores(gameId = null) {
  await ensureLeaderboardTables();
  if (gameId == null) {
    const rows = await query(
      `SELECT COUNT(*) AS cnt FROM game_leaderboard_scores`
    );
    return Number(rows[0]?.cnt ?? 0);
  }
  const gid = normalizeGameId(gameId);
  const rows = await query(
    `SELECT COUNT(*) AS cnt FROM game_leaderboard_scores WHERE game_id = ?`,
    [gid]
  );
  return Number(rows[0]?.cnt ?? 0);
}

export async function importLeaderboardFromObject(data) {
  await ensureLeaderboardTables();

  let boards = {};
  if (Array.isArray(data)) {
    boards = { global: data };
  } else if (data && typeof data === 'object') {
    boards = data;
  } else {
    return { imported: 0, games: 0 };
  }

  let imported = 0;
  let games = 0;

  for (const [rawGameId, entries] of Object.entries(boards)) {
    if (!Array.isArray(entries) || entries.length === 0) continue;
    const gid = normalizeGameId(rawGameId);
    games += 1;

    // Сортируем и режем до лимита до вставки
    const sorted = [...entries]
      .map((e) => ({
        nickname: String(e?.nickname || '').trim().slice(0, 40) || 'Player',
        score: Number.isFinite(Number(e?.score))
          ? Math.max(0, Math.floor(Number(e.score)))
          : 0,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_SCORES_PER_GAME);

    const chunkSize = 200;
    for (let i = 0; i < sorted.length; i += chunkSize) {
      const chunk = sorted.slice(i, i + chunkSize);
      const placeholders = chunk.map(() => '(?, ?, ?)').join(', ');
      const values = chunk.flatMap((e) => [gid, e.nickname, e.score]);
      await query(
        `INSERT INTO game_leaderboard_scores (game_id, nickname, score)
         VALUES ${placeholders}`,
        values
      );
      imported += chunk.length;
    }
  }

  return { imported, games };
}
