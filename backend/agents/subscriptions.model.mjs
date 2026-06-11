import { query } from '../database/config.mjs';

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

    // Таблица выплат
    await query(`
        CREATE TABLE IF NOT EXISTS agent_payouts (
            id           INT AUTO_INCREMENT PRIMARY KEY,
            dev_user_id  INT NOT NULL,
            amount_rub   INT NOT NULL,
            method       VARCHAR(100) NOT NULL,
            details      VARCHAR(255) NOT NULL,
            status       ENUM('pending','paid','rejected') DEFAULT 'pending',
            admin_note   TEXT,
            created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            paid_at      TIMESTAMP NULL,
            INDEX idx_dev (dev_user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
}

export async function createSubscription({ agentId, buyerUserId, paymentId, priceRub }) {
    const result = await query(
        `INSERT INTO agent_subscriptions (agent_id, buyer_user_id, payment_id, price_rub)
         VALUES (?, ?, ?, ?)`,
        [agentId, buyerUserId, paymentId, priceRub]
    );
    return result.insertId;
}

export async function activateSubscription(paymentId) {
    return query(
        `UPDATE agent_subscriptions
         SET status = 'active', active_until = DATE_ADD(NOW(), INTERVAL 30 DAY)
         WHERE payment_id = ?`,
        [paymentId]
    );
}

export async function getSubscriptionByPaymentId(paymentId) {
    const rows = await query(
        `SELECT * FROM agent_subscriptions WHERE payment_id = ? LIMIT 1`,
        [paymentId]
    );
    return rows[0] || null;
}

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

export async function creditDeveloper(agentId, priceRub) {
    const earned = Math.floor(priceRub * 0.9);             // 90% разработчику, 10% платформе
    return query(
        `UPDATE agents SET earned_rub = earned_rub + ? WHERE id = ?`,
        [earned, agentId]
    );
}

// Суммарный заработок разработчика: все агенты + активные подписки + выплаченно
export async function getDeveloperEarnings(devUserId) {
    // Агенты разработчика с их накопленным заработком
    const agents = await query(
        `SELECT id, name, slug, earned_rub, tasks_done, is_published,
                (SELECT COUNT(*) FROM agent_subscriptions s
                 WHERE s.agent_id = a.id AND s.status = 'active' AND s.active_until > NOW()) AS active_subs
         FROM agents a WHERE a.user_id = ? ORDER BY a.earned_rub DESC`,
        [devUserId]
    );

    // Общая сумма накопленного заработка
    const totalEarned = agents.reduce((s, a) => s + (a.earned_rub || 0), 0);

    // Уже выплаченно (pending + paid)
    const payoutsRows = await query(
        `SELECT COALESCE(SUM(amount_rub), 0) AS total_paid
         FROM agent_payouts WHERE dev_user_id = ? AND status IN ('pending','paid')`,
        [devUserId]
    );
    const totalPaid = payoutsRows[0]?.total_paid || 0;
    const available  = Math.max(0, totalEarned - totalPaid);

    return { agents, totalEarned, totalPaid, available };
}

// Подача заявки на выплату
export async function createPayout({ devUserId, amountRub, method, details }) {
    const result = await query(
        `INSERT INTO agent_payouts (dev_user_id, amount_rub, method, details) VALUES (?, ?, ?, ?)`,
        [devUserId, amountRub, method, details]
    );
    return result.insertId;
}

// История выплат разработчика
export async function getPayoutHistory(devUserId) {
    return query(
        `SELECT id, amount_rub, method, details, status, admin_note, created_at, paid_at
         FROM agent_payouts WHERE dev_user_id = ? ORDER BY created_at DESC LIMIT 50`,
        [devUserId]
    );
}
