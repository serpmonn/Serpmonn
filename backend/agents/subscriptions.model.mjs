import { query } from '../database/config.mjs';

// Создаём таблицу подписок если не существует
export async function createSubscriptionsTable() {
    await query(`
        CREATE TABLE IF NOT EXISTS agent_subscriptions (
            id            INT AUTO_INCREMENT PRIMARY KEY,
            agent_id      INT NOT NULL,
            buyer_user_id INT NOT NULL,
            payment_id    VARCHAR(64) NOT NULL UNIQUE,
            status        ENUM('pending','active','cancelled') DEFAULT 'pending',
            price_rub     INT NOT NULL,
            active_until  TIMESTAMP NULL,
            created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_agent_id (agent_id),
            INDEX idx_buyer (buyer_user_id),
            INDEX idx_payment (payment_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
}

// Создать запись подписки со статусом pending
export async function createSubscription({ agentId, buyerUserId, paymentId, priceRub }) {
    const result = await query(
        `INSERT INTO agent_subscriptions (agent_id, buyer_user_id, payment_id, price_rub)
         VALUES (?, ?, ?, ?)`,
        [agentId, buyerUserId, paymentId, priceRub]
    );
    return result.insertId;
}

// Активировать подписку после успешной оплаты
export async function activateSubscription(paymentId) {
    return query(
        `UPDATE agent_subscriptions
         SET status = 'active', active_until = DATE_ADD(NOW(), INTERVAL 30 DAY)
         WHERE payment_id = ?`,
        [paymentId]
    );
}

// Найти подписку по payment_id
export async function getSubscriptionByPaymentId(paymentId) {
    const rows = await query(
        `SELECT * FROM agent_subscriptions WHERE payment_id = ? LIMIT 1`,
        [paymentId]
    );
    return rows[0] || null;
}

// Активные подписки покупателя
export async function getActiveSubscriptionsByBuyer(buyerUserId) {
    return query(
        `SELECT s.*, a.name AS agent_name, a.description, a.webhook_url
         FROM agent_subscriptions s
         JOIN agents a ON a.id = s.agent_id
         WHERE s.buyer_user_id = ? AND s.status = 'active' AND s.active_until > NOW()
         ORDER BY s.created_at DESC`,
        [buyerUserId]
    );
}

// Начислить заработок разработчику (90% от суммы)
export async function creditDeveloper(agentId, priceRub) {
    const earned = Math.floor(priceRub * 0.9);             // 90% разработчику, 10% комиссия платформы
    return query(
        `UPDATE agents SET earned_rub = earned_rub + ? WHERE id = ?`,
        [earned, agentId]
    );
}
