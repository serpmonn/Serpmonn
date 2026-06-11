import { query } from '../database/config.mjs';

export async function createAgentsTable() {
    await query(`
        CREATE TABLE IF NOT EXISTS agents (
            id            INT AUTO_INCREMENT PRIMARY KEY,
            user_id       INT NOT NULL,
            slug          VARCHAR(100) UNIQUE,
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
            INDEX idx_api_key (api_key),
            INDEX idx_slug (slug)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Миграция: добавляем slug если колонки ещё нет
    await query(`
        ALTER TABLE agents ADD COLUMN IF NOT EXISTS slug VARCHAR(100) UNIQUE
    `).catch(() => {}); // игнорируем если уже есть
}

export async function createAgent({ userId, name, description, webhookUrl, apiKey, priceRub = 0, slug = null }) {
    const result = await query(
        `INSERT INTO agents (user_id, slug, name, description, webhook_url, api_key, price_rub)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, slug || null, name, description || null, webhookUrl || null, apiKey, priceRub]
    );
    return result.insertId;
}

export async function getAgentsByUserId(userId) {
    return query(
        `SELECT id, slug, name, description, webhook_url, api_key, is_published,
                price_rub, tasks_done, earned_rub, created_at
         FROM agents WHERE user_id = ? ORDER BY created_at DESC`,
        [userId]
    );
}

export async function getAgentByApiKey(apiKey) {
    const rows = await query(
        `SELECT * FROM agents WHERE api_key = ? LIMIT 1`,
        [apiKey]
    );
    return rows[0] || null;
}

// Найти агента по slug или числовому id
export async function getAgentByIdOrSlug(idOrSlug) {
    const isNumeric = /^\d+$/.test(String(idOrSlug));
    const rows = await query(
        isNumeric
            ? `SELECT id, slug, name, description, is_published, price_rub, webhook_url FROM agents WHERE id = ? LIMIT 1`
            : `SELECT id, slug, name, description, is_published, price_rub, webhook_url FROM agents WHERE slug = ? LIMIT 1`,
        [isNumeric ? Number(idOrSlug) : idOrSlug]
    );
    return rows[0] || null;
}

export async function getAgentByIdPublic(agentId) {
    const rows = await query(
        `SELECT id, slug, name, description, is_published, price_rub, webhook_url
         FROM agents WHERE id = ? LIMIT 1`,
        [agentId]
    );
    return rows[0] || null;
}

export async function getPublishedAgents() {
    return query(
        `SELECT id, slug, name, description, price_rub, tasks_done
         FROM agents WHERE is_published = 1 ORDER BY tasks_done DESC`
    );
}

export async function updateAgentPublished(agentId, userId, isPublished) {
    return query(
        `UPDATE agents SET is_published = ? WHERE id = ? AND user_id = ?`,
        [isPublished ? 1 : 0, agentId, userId]
    );
}

export async function incrementTasksDone(agentId) {
    return query(
        `UPDATE agents SET tasks_done = tasks_done + 1 WHERE id = ?`,
        [agentId]
    );
}

export async function deleteAgent(agentId, userId) {
    return query(
        `DELETE FROM agents WHERE id = ? AND user_id = ?`,
        [agentId, userId]
    );
}
