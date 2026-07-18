import { query } from '../config.mjs';

async function columnExists(table, column) {
    const rows = await query(
        `SELECT COUNT(*) AS cnt
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?
           AND COLUMN_NAME = ?`,
        [table, column]
    );
    return (rows[0]?.cnt ?? 0) > 0;
}

async function tableExists(table) {
    const rows = await query(
        `SELECT COUNT(*) AS cnt
         FROM information_schema.TABLES
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?`,
        [table]
    );
    return (rows[0]?.cnt ?? 0) > 0;
}

async function migrate() {
    if (!(await columnExists('users', 'messenger_user_id'))) {
        await query(
            'ALTER TABLE users ADD COLUMN messenger_user_id VARCHAR(64) NULL DEFAULT NULL'
        );
        console.log('users.messenger_user_id added');
    } else {
        console.log('users.messenger_user_id already exists — skip');
    }

    if (!(await columnExists('users', 'messenger_sign_pub'))) {
        await query(
            'ALTER TABLE users ADD COLUMN messenger_sign_pub VARCHAR(128) NULL DEFAULT NULL'
        );
        console.log('users.messenger_sign_pub added');
    } else {
        console.log('users.messenger_sign_pub already exists — skip');
    }

    // Unique index for messenger_user_id (ignore duplicates of NULL)
    try {
        await query(
            'CREATE UNIQUE INDEX uniq_users_messenger_user_id ON users (messenger_user_id)'
        );
        console.log('uniq_users_messenger_user_id created');
    } catch (err) {
        if (err?.code === 'ER_DUP_KEYNAME' || err?.errno === 1061) {
            console.log('uniq_users_messenger_user_id already exists — skip');
        } else {
            throw err;
        }
    }

    if (!(await tableExists('messenger_auth_challenges'))) {
        await query(`
            CREATE TABLE messenger_auth_challenges (
                challenge_id CHAR(36) NOT NULL PRIMARY KEY,
                short_code VARCHAR(8) NOT NULL,
                nonce VARCHAR(64) NOT NULL,
                purpose ENUM('login','link') NOT NULL DEFAULT 'login',
                host VARCHAR(255) NOT NULL,
                exp DATETIME NOT NULL,
                created_at DATETIME NOT NULL,
                used_at DATETIME NULL,
                link_user_id CHAR(36) NULL,
                approved_user_id CHAR(36) NULL,
                exchange_code VARCHAR(64) NULL,
                exchange_expires_at DATETIME NULL,
                exchange_used_at DATETIME NULL,
                UNIQUE KEY uniq_short_code (short_code),
                KEY idx_exchange_code (exchange_code)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        `);
        console.log('messenger_auth_challenges created');
    } else {
        console.log('messenger_auth_challenges already exists — skip');
    }
}

migrate().catch((err) => {
    console.error(err);
    process.exit(1);
});
