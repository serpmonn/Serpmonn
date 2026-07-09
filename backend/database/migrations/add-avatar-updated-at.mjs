import { query } from '../config.mjs';

async function migrate() {
    const rows = await query(
        `SELECT COUNT(*) AS cnt
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'users'
           AND COLUMN_NAME = 'avatar_updated_at'`
    );

    if (rows[0]?.cnt > 0) {
        console.log('avatar_updated_at already exists — skip');
        return;
    }

    await query(
        'ALTER TABLE users ADD COLUMN avatar_updated_at DATETIME NULL DEFAULT NULL AFTER mailbox_created'
    );
    console.log('avatar_updated_at column added');
}

migrate().catch((err) => {
    console.error(err);
    process.exit(1);
});
