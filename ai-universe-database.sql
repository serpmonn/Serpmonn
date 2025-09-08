-- SQL скрипт для создания таблиц AI-персонализированной вселенной

-- Таблица для хранения AI-профилей пользователей
CREATE TABLE IF NOT EXISTS ai_user_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    personality_traits JSON,
    interests JSON,
    behavior_patterns JSON,
    knowledge_graph JSON,
    emotional_state VARCHAR(50) DEFAULT 'neutral',
    learning_style VARCHAR(50) DEFAULT 'visual',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_updated_at (updated_at)
);

-- Таблица для логирования поведения пользователей
CREATE TABLE IF NOT EXISTS behavior_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    action_type VARCHAR(50) NOT NULL,
    action_data JSON,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_action_type (action_type),
    INDEX idx_timestamp (timestamp),
    INDEX idx_user_action (user_id, action_type)
);

-- Таблица для хранения персонализированных результатов поиска
CREATE TABLE IF NOT EXISTS personalized_search_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    query TEXT NOT NULL,
    original_results JSON,
    personalized_results JSON,
    query_analysis JSON,
    recommendations JSON,
    personalized_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_query (query(255)),
    INDEX idx_created_at (created_at)
);

-- Таблица для хранения AI-генерации контента
CREATE TABLE IF NOT EXISTS ai_generated_content (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    prompt TEXT,
    generated_content JSON,
    personalization_data JSON,
    quality_score DECIMAL(3,2),
    user_feedback ENUM('positive', 'negative', 'neutral') DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_content_type (content_type),
    INDEX idx_quality_score (quality_score),
    INDEX idx_created_at (created_at)
);

-- Таблица для хранения персональных рекомендаций
CREATE TABLE IF NOT EXISTS personalized_recommendations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    recommendation_type VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    description TEXT,
    content_data JSON,
    relevance_score DECIMAL(3,2),
    user_interaction ENUM('clicked', 'ignored', 'dismissed') DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_recommendation_type (recommendation_type),
    INDEX idx_relevance_score (relevance_score),
    INDEX idx_created_at (created_at)
);

-- Таблица для хранения игрового поведения
CREATE TABLE IF NOT EXISTS game_behavior_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    game_type VARCHAR(50) NOT NULL,
    game_data JSON,
    behavior_analysis JSON,
    performance_metrics JSON,
    session_duration INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_game_type (game_type),
    INDEX idx_created_at (created_at)
);

-- Таблица для хранения эмоционального анализа
CREATE TABLE IF NOT EXISTS emotional_analysis (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    content_type VARCHAR(50) NOT NULL,
    content_text TEXT,
    emotional_scores JSON,
    dominant_emotion VARCHAR(50),
    confidence_score DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_content_type (content_type),
    INDEX idx_dominant_emotion (dominant_emotion),
    INDEX idx_created_at (created_at)
);

-- Таблица для хранения предсказаний AI
CREATE TABLE IF NOT EXISTS ai_predictions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    prediction_type VARCHAR(50) NOT NULL,
    input_data JSON,
    prediction_result JSON,
    confidence_score DECIMAL(3,2),
    actual_outcome JSON NULL,
    accuracy_score DECIMAL(3,2) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_prediction_type (prediction_type),
    INDEX idx_confidence_score (confidence_score),
    INDEX idx_created_at (created_at)
);

-- Таблица для хранения статистики AI-вселенной
CREATE TABLE IF NOT EXISTS ai_universe_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    stat_date DATE NOT NULL,
    total_users INT DEFAULT 0,
    total_searches INT DEFAULT 0,
    total_recommendations INT DEFAULT 0,
    average_personalization_score DECIMAL(3,2) DEFAULT 0,
    most_popular_features JSON,
    user_engagement_metrics JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_date (stat_date),
    INDEX idx_stat_date (stat_date)
);

-- Таблица для хранения настроек персонализации
CREATE TABLE IF NOT EXISTS personalization_settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    search_personalization BOOLEAN DEFAULT TRUE,
    content_personalization BOOLEAN DEFAULT TRUE,
    game_personalization BOOLEAN DEFAULT TRUE,
    recommendation_frequency ENUM('high', 'medium', 'low') DEFAULT 'medium',
    privacy_level ENUM('high', 'medium', 'low') DEFAULT 'medium',
    ai_interaction_level ENUM('minimal', 'moderate', 'extensive') DEFAULT 'moderate',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id)
);

-- Создание триггеров для автоматического обновления статистики
DELIMITER //

CREATE TRIGGER update_ai_stats_after_search
AFTER INSERT ON personalized_search_results
FOR EACH ROW
BEGIN
    INSERT INTO ai_universe_stats (stat_date, total_searches)
    VALUES (CURDATE(), 1)
    ON DUPLICATE KEY UPDATE 
    total_searches = total_searches + 1;
END//

CREATE TRIGGER update_ai_stats_after_recommendation
AFTER INSERT ON personalized_recommendations
FOR EACH ROW
BEGIN
    INSERT INTO ai_universe_stats (stat_date, total_recommendations)
    VALUES (CURDATE(), 1)
    ON DUPLICATE KEY UPDATE 
    total_recommendations = total_recommendations + 1;
END//

DELIMITER ;

-- Создание представлений для удобного доступа к данным
CREATE VIEW user_ai_summary AS
SELECT 
    p.user_id,
    p.personality_traits,
    p.interests,
    p.emotional_state,
    p.learning_style,
    COUNT(DISTINCT bl.id) as total_actions,
    COUNT(DISTINCT psr.id) as total_searches,
    COUNT(DISTINCT pr.id) as total_recommendations,
    p.created_at as profile_created,
    p.updated_at as last_updated
FROM ai_user_profiles p
LEFT JOIN behavior_logs bl ON p.user_id = bl.user_id
LEFT JOIN personalized_search_results psr ON p.user_id = psr.user_id
LEFT JOIN personalized_recommendations pr ON p.user_id = pr.user_id
GROUP BY p.user_id;

-- Создание индексов для оптимизации производительности
CREATE INDEX idx_behavior_logs_user_timestamp ON behavior_logs(user_id, timestamp);
CREATE INDEX idx_personalized_search_user_created ON personalized_search_results(user_id, created_at);
CREATE INDEX idx_recommendations_user_type ON personalized_recommendations(user_id, recommendation_type);

-- Вставка начальных настроек по умолчанию
INSERT IGNORE INTO personalization_settings (user_id, search_personalization, content_personalization, game_personalization)
SELECT id, TRUE, TRUE, TRUE FROM users WHERE id NOT IN (SELECT user_id FROM personalization_settings);

-- Создание процедуры для очистки старых данных
DELIMITER //

CREATE PROCEDURE CleanupOldAIData(IN days_to_keep INT)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    
    START TRANSACTION;
    
    -- Удаляем старые логи поведения (старше указанного количества дней)
    DELETE FROM behavior_logs 
    WHERE timestamp < DATE_SUB(NOW(), INTERVAL days_to_keep DAY);
    
    -- Удаляем старые результаты поиска
    DELETE FROM personalized_search_results 
    WHERE created_at < DATE_SUB(NOW(), INTERVAL days_to_keep DAY);
    
    -- Удаляем старые рекомендации
    DELETE FROM personalized_recommendations 
    WHERE created_at < DATE_SUB(NOW(), INTERVAL days_to_keep DAY)
    AND user_interaction IS NULL;
    
    -- Удаляем старые предсказания
    DELETE FROM ai_predictions 
    WHERE created_at < DATE_SUB(NOW(), INTERVAL days_to_keep DAY)
    AND actual_outcome IS NULL;
    
    COMMIT;
    
    SELECT CONCAT('Очистка завершена. Удалены данные старше ', days_to_keep, ' дней.') as result;
END//

DELIMITER ;

-- Создание процедуры для получения статистики пользователя
DELIMITER //

CREATE PROCEDURE GetUserAIStats(IN user_id_param INT)
BEGIN
    SELECT 
        p.user_id,
        p.personality_traits,
        p.interests,
        p.emotional_state,
        COUNT(DISTINCT bl.id) as total_actions,
        COUNT(DISTINCT psr.id) as total_searches,
        COUNT(DISTINCT pr.id) as total_recommendations,
        AVG(pr.relevance_score) as avg_recommendation_score,
        p.created_at as profile_created,
        p.updated_at as last_updated
    FROM ai_user_profiles p
    LEFT JOIN behavior_logs bl ON p.user_id = bl.user_id
    LEFT JOIN personalized_search_results psr ON p.user_id = psr.user_id
    LEFT JOIN personalized_recommendations pr ON p.user_id = pr.user_id
    WHERE p.user_id = user_id_param
    GROUP BY p.user_id;
END//

DELIMITER ;