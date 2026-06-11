import { pool } from '../db.mjs';

// Записать событие агента
export async function createLog({ agentId, buyerUserId, eventType, payload }) {
    const [result] = await pool.query(
        `INSERT INTO agent_logs (agent_id, buyer_user_id, event_type, payload)
         VALUES (?, ?, ?, ?)`,
        [agentId, buyerUserId || null, eventType, payload ? JSON.stringify(payload) : null]
    );
    return result.insertId;
}

// Получить логи для бизнеса по конкретному агенту
export async function getLogsByBuyer({ agentId, buyerUserId, limit = 100, offset = 0 }) {
    const [rows] = await pool.query(
        `SELECT id, event_type, payload, created_at
         FROM agent_logs
         WHERE agent_id = ? AND buyer_user_id = ?
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [agentId, buyerUserId, limit, offset]
    );
    return rows;
}

// Статистика для разработчика: события по агенту за последние 30 дней
export async function getStatsByAgent(agentId, ownerUserId) {
    // Проверяем владельца
    const [agentRows] = await pool.query(
        `SELECT id FROM agents WHERE id = ? AND user_id = ?`,
        [agentId, ownerUserId]
    );
    if (!agentRows.length) return null;

    const [daily] = await pool.query(
        `SELECT DATE(created_at) AS day, event_type, COUNT(*) AS cnt
         FROM agent_logs
         WHERE agent_id = ? AND created_at >= NOW() - INTERVAL 30 DAY
         GROUP BY DATE(created_at), event_type
         ORDER BY day ASC`,
        [agentId]
    );

    const [totals] = await pool.query(
        `SELECT event_type, COUNT(*) AS cnt
         FROM agent_logs
         WHERE agent_id = ?
         GROUP BY event_type`,
        [agentId]
    );

    const [uniqueBuyers] = await pool.query(
        `SELECT COUNT(DISTINCT buyer_user_id) AS cnt
         FROM agent_logs
         WHERE agent_id = ?`,
        [agentId]
    );

    return { daily, totals, unique_buyers: uniqueBuyers[0]?.cnt || 0 };
}
