-- Добавляем поля для истории лайков
-- Позволяет отслеживать миграцию гостевых лайков в авторизованные

ALTER TABLE likes 
ADD COLUMN was_guest BOOLEAN DEFAULT FALSE COMMENT 'Был ли лайк изначально гостевым',
ADD COLUMN migrated_at TIMESTAMP NULL COMMENT 'Когда был мигрирован из гостевого в авторизованный';

-- Индекс для быстрого поиска мигрированных лайков
CREATE INDEX idx_was_guest ON likes (was_guest);
CREATE INDEX idx_migrated_at ON likes (migrated_at);