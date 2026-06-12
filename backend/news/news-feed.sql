-- Таблица хранения сгенерированных новостей
CREATE TABLE IF NOT EXISTS news_feed (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  topic_key    VARCHAR(50)   NOT NULL,
  title        VARCHAR(500)  NOT NULL,
  body         TEXT          NOT NULL,
  cover_url    TEXT          NULL,         -- URL картинки из SearXNG
  sources      JSON          NOT NULL,     -- [{title, url}, ...]
  generated_at DATETIME      NOT NULL DEFAULT NOW(),
  INDEX idx_topic   (topic_key),
  INDEX idx_date    (generated_at)
);

-- Таблица предпочтений пользователя по темам
CREATE TABLE IF NOT EXISTS user_news_prefs (
  user_id    INT           NOT NULL,
  topic_key  VARCHAR(50)   NOT NULL,
  weight     FLOAT         NOT NULL DEFAULT 1.0,  -- макс 5.0, повышается по кликам
  PRIMARY KEY (user_id, topic_key)
);
