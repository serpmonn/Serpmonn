-- Миграция для создания таблицы лайков
-- Поддерживает гостевые и подтверждённые лайки с дедупликацией по пользователю

CREATE TABLE IF NOT EXISTS likes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    url VARCHAR(2048) NOT NULL,
    user_id VARCHAR(255) NULL, -- NULL для гостевых лайков, строка для авторизованных
    like_type ENUM('guest', 'auth') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    -- Индексы для быстрого поиска
    INDEX idx_url (url(255)),
    INDEX idx_user_id (user_id),
    INDEX idx_url_user (url(255), user_id),
    
    -- Уникальный индекс: один авторизованный лайк на пользователя на URL
    UNIQUE KEY unique_auth_like (url(255), user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Комментарии для документации
ALTER TABLE likes COMMENT = 'Лайки результатов поиска: гостевые и подтверждённые';