-- Добавляем session_id для связи гостевых и авторизованных лайков
-- Позволяет мигрировать гостевые лайки в авторизованные при авторизации

ALTER TABLE likes 
ADD COLUMN session_id VARCHAR(255) NULL COMMENT 'Session ID для связи гостевых и авторизованных лайков';

-- Индекс для быстрого поиска по session_id
CREATE INDEX idx_session_id ON likes (session_id);

-- Индекс для поиска гостевых лайков по session_id
CREATE INDEX idx_guest_session ON likes (session_id, like_type) WHERE like_type = 'guest';