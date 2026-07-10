import { query } from '../database/config.mjs';

let tablesReady = false;

export async function ensureAiFeedbackTable() {
  if (tablesReady) return;

  await query(`
    CREATE TABLE IF NOT EXISTS ai_search_feedback (
      id               INT AUTO_INCREMENT PRIMARY KEY,
      rating           ENUM('like', 'dislike') NOT NULL,
      query_text       VARCHAR(500) NOT NULL,
      answer_text      TEXT NOT NULL,
      locale           VARCHAR(16) NOT NULL DEFAULT 'ru',
      user_id          INT NULL,
      guest_key        VARCHAR(128) NULL,
      used_web_search  TINYINT(1) NOT NULL DEFAULT 0,
      created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_rating_created (rating, created_at),
      INDEX idx_created_at (created_at),
      INDEX idx_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  tablesReady = true;
}

export async function saveAiSearchFeedback(data) {
  await ensureAiFeedbackTable();

  const {
    rating,
    queryText,
    answerText,
    locale = 'ru',
    userId = null,
    guestKey = null,
    usedWebSearch = false,
  } = data;

  const result = await query(
    `INSERT INTO ai_search_feedback
      (rating, query_text, answer_text, locale, user_id, guest_key, used_web_search)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      rating,
      queryText,
      answerText,
      locale,
      userId,
      guestKey,
      usedWebSearch ? 1 : 0,
    ]
  );

  return result.insertId;
}
