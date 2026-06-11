import { query } from '../database/config.mjs';              // Импортируем функцию запросов к БД

export async function createAgentsTable() {                  // Создаём таблицу agents если не существует
    await query(`
        CREATE TABLE IF NOT EXISTS agents (
            id            INT AUTO_INCREMENT PRIMARY KEY,
            user_id       INT NOT NULL,
            name          VARCHAR(100) NOT NULL,
            description   TEXT,
            webhook_url   VARCHAR(500),
            api_key       VARCHAR(64) NOT NULL UNIQUE,
            is_published  TINYINT(1) DEFAULT 0,
            price_rub     INT DEFAULT 0,
            tasks_done    INT DEFAULT 0,
            earned_rub    INT DEFAULT 0,
            created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_user_id (user_id),
            INDEX idx_api_key (api_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
}

export async function createAgent({ userId, name, description, webhookUrl, apiKey, priceRub = 0 }) {
    const result = await query(
        `INSERT INTO agents (user_id, name, description, webhook_url, api_key, price_rub)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [userId, name, description || null, webhookUrl || null, apiKey, priceRub]
    );
    return result.insertId;
}

export async function getAgentsByUserId(userId) {            // Все агенты конкретного пользователя
    return query(
        `SELECT id, name, description, webhook_url, api_key, is_published,
                price_rub, tasks_done, earned_rub, created_at
         FROM agents WHERE user_id = ? ORDER BY created_at DESC`,
        [userId]
    );
}

export async function getAgentByApiKey(apiKey) {             // Найти агента по API ключу
    const rows = await query(
        `SELECT * FROM agents WHERE api_key = ? LIMIT 1`,
        [apiKey]
    );
    return rows[0] || null;
}

export async function getPublishedAgents() {                 // Все опубликованные агенты для маркетплейса
    return query(
        `SELECT id, name, description, price_rub, tasks_done
         FROM agents WHERE is_published = 1 ORDER BY tasks_done DESC`
    );
}

export async function updateAgentPublished(agentId, userId, isPublished) {
    return query(
        `UPDATE agents SET is_published = ? WHERE id = ? AND user_id = ?`,
        [isPublished ? 1 : 0, agentId, userId]
    );
}

export async function incrementTasksDone(agentId) {          // +1 к счётчику задач агента
    return query(
        `UPDATE agents SET tasks_done = tasks_done + 1 WHERE id = ?`,
        [agentId]
    );
}

export async function deleteAgent(agentId, userId) {         // Удалить агента (только свой)
    return query(
        `DELETE FROM agents WHERE id = ? AND user_id = ?`,
        [agentId, userId]
    );
}
