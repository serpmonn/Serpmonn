import { query } from '../database/config.mjs';

let tablesReady = false;

export async function ensureImproveTables() {
  if (tablesReady) return;

  await query(`
    CREATE TABLE IF NOT EXISTS improvement_suggestions (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      name        VARCHAR(100) NULL,
      email       VARCHAR(255) NULL,
      category    VARCHAR(32)  NOT NULL,
      title       VARCHAR(200) NOT NULL,
      description TEXT         NOT NULL,
      priority    VARCHAR(16)  NOT NULL DEFAULT 'medium',
      language    VARCHAR(16)  NOT NULL DEFAULT 'ru',
      page        VARCHAR(64)  NOT NULL DEFAULT 'improve',
      created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS improvement_stats (
      id           TINYINT   NOT NULL PRIMARY KEY DEFAULT 1,
      accepted     INT       NOT NULL DEFAULT 2,
      in_progress  INT       NOT NULL DEFAULT 0,
      implemented  INT       NOT NULL DEFAULT 0,
      updated_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await query(`
    INSERT INTO improvement_stats (id, accepted, in_progress, implemented)
    VALUES (1, 2, 0, 0)
    ON DUPLICATE KEY UPDATE id = id
  `);

  tablesReady = true;
}

export async function getImproveStats() {
  await ensureImproveTables();

  const [statsRows, weekRows] = await Promise.all([
    query(
      `SELECT accepted, in_progress, implemented
       FROM improvement_stats
       WHERE id = 1
       LIMIT 1`
    ),
    query(
      `SELECT COUNT(*) AS cnt
       FROM improvement_suggestions
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`
    ),
  ]);

  const stats = statsRows[0] || { accepted: 2, in_progress: 0, implemented: 0 };

  return {
    accepted: Number(stats.accepted) || 0,
    in_progress: Number(stats.in_progress) || 0,
    implemented: Number(stats.implemented) || 0,
    this_week: Number(weekRows[0]?.cnt) || 0,
  };
}

export async function saveImprovementSuggestion(data) {
  await ensureImproveTables();

  const {
    name = null,
    email = null,
    category,
    title,
    description,
    priority = 'medium',
    language = 'ru',
    page = 'improve',
  } = data;

  const result = await query(
    `INSERT INTO improvement_suggestions
      (name, email, category, title, description, priority, language, page)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      name || null,
      email || null,
      category,
      title,
      description,
      priority,
      language,
      page,
    ]
  );

  await query(
    `UPDATE improvement_stats
     SET accepted = accepted + 1
     WHERE id = 1`
  );

  return result.insertId;
}
