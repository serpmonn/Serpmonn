-- Таблица новостей с поддержкой многоязычности
CREATE TABLE IF NOT EXISTS news_feed (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  topic_key    VARCHAR(32)   NOT NULL,
  lang         VARCHAR(5)    NOT NULL DEFAULT 'en',
  title        VARCHAR(255)  NOT NULL,
  body         TEXT          NOT NULL,
  cover_url    TEXT,
  sources      JSON,
  generated_at DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_topic_lang (topic_key, lang),
  INDEX idx_generated (generated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Предпочтения пользователей по темам
CREATE TABLE IF NOT EXISTS user_news_prefs (
  user_id      INT UNSIGNED  NOT NULL,
  topic_key    VARCHAR(32)   NOT NULL,
  weight       FLOAT         NOT NULL DEFAULT 1.0,
  updated_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, topic_key),
  INDEX idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Если таблица уже существует без поля lang — добавить его:
-- ALTER TABLE news_feed ADD COLUMN lang VARCHAR(5) NOT NULL DEFAULT 'en' AFTER topic_key;
-- ALTER TABLE news_feed ADD INDEX idx_topic_lang (topic_key, lang);
