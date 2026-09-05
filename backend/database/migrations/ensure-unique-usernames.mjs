/**
 * Одноразовая миграция: заполнить пустые username, переименовать дубликаты,
 * добавить UNIQUE INDEX uq_users_username.
 *
 * Запуск: node backend/database/migrations/ensure-unique-usernames.mjs
 */
import { query } from '../config.mjs';

function shortId(id) {
  return String(id || '').replace(/-/g, '').slice(0, 8);
}

async function usernameTaken(name) {
  const rows = await query('SELECT id FROM users WHERE username = ? LIMIT 1', [name]);
  return Boolean(rows[0]?.id);
}

async function uniqueName(base, id) {
  const root = String(base || 'user').slice(0, 55);
  let candidate = `${root}_${shortId(id)}`;
  let n = 0;
  while (await usernameTaken(candidate)) {
    n += 1;
    candidate = `${root.slice(0, 50)}_${shortId(id)}${n}`;
  }
  return candidate;
}

async function indexExists() {
  const rows = await query(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'users'
       AND INDEX_NAME = 'uq_users_username'`
  );
  return rows[0]?.cnt > 0;
}

async function migrate() {
  const blanks = await query(
    `SELECT id FROM users WHERE username IS NULL OR username = ''`
  );
  for (const row of blanks) {
    const next = await uniqueName('user', row.id);
    await query('UPDATE users SET username = ? WHERE id = ?', [next, row.id]);
    console.log(`[users] filled empty username → ${next}`);
  }

  const dups = await query(
    `SELECT username
     FROM users
     WHERE username IS NOT NULL AND username != ''
     GROUP BY username
     HAVING COUNT(*) > 1`
  );

  for (const row of dups) {
    const users = await query(
      'SELECT id, username FROM users WHERE username = ? ORDER BY created_at ASC, id ASC',
      [row.username]
    );
    for (let i = 1; i < users.length; i++) {
      const next = await uniqueName(row.username, users[i].id);
      await query('UPDATE users SET username = ? WHERE id = ?', [next, users[i].id]);
      console.log(`[users] renamed duplicate ${row.username} → ${next}`);
    }
  }

  if (await indexExists()) {
    console.log('uq_users_username already exists — skip');
    return;
  }

  await query('ALTER TABLE users ADD UNIQUE INDEX uq_users_username (username)');
  console.log('[users] unique index uq_users_username created');
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
