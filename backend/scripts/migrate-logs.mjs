import { pool } from '../db.mjs';

async function migrate() {
    console.log('Создаём таблицу agent_logs...');

    await pool.query(`
        CREATE TABLE IF NOT EXISTS agent_logs (
            id             INT AUTO_INCREMENT PRIMARY KEY,
            agent_id       INT          NOT NULL,
            buyer_user_id  INT          NULL,
            event_type     VARCHAR(50)  NOT NULL,
            payload        JSON         NULL,
            created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_agent_buyer  (agent_id, buyer_user_id),
            INDEX idx_agent_time   (agent_id, created_at),
            INDEX idx_created      (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    console.log('✅ agent_logs создана');
    await pool.end();
}

migrate().catch(err => {
    console.error('❌ Ошибка миграции:', err);
    process.exit(1);
});
