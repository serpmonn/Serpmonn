import { query } from '../database/config.mjs';

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

export async function ensureUniqueUsernames() {
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

  try {
    await query('ALTER TABLE users ADD UNIQUE INDEX uq_users_username (username)');
    console.log('[users] unique index uq_users_username ready');
  } catch (err) {
    if (err?.code !== 'ER_DUP_KEYNAME' && err?.errno !== 1061) {
      console.error('[users] unique index', err?.message || err);
    }
  }
}
