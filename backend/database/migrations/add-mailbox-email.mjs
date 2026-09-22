import { query } from '../config.mjs';

async function migrate() {
    const rows = await query(
        `SELECT COUNT(*) AS cnt
         FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'users'
           AND COLUMN_NAME = 'mailbox_email'`
    );

    if (rows[0]?.cnt > 0) {
        console.log('mailbox_email already exists — skip');
        return;
    }

    await query(
        'ALTER TABLE users ADD COLUMN mailbox_email VARCHAR(255) NULL DEFAULT NULL AFTER mailbox_created'
    );
    console.log('mailbox_email column added');
}

migrate().catch((err) => {
    console.error(err);
    process.exit(1);
});
