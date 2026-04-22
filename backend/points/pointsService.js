import { query } from '../database/config.mjs';

// Получить текущий баланс пользователя
export async function getUserPoints(userId) {
  const rows = await query(
    'SELECT points_balance FROM users WHERE id = ?',
    [userId]
  );

  if (!rows || rows.length === 0) {
    return 0;
  }

  return rows[0].points_balance ?? 0;
}

// Начисление/списание баллов + запись в историю
export async function awardPoints(userId, delta, type = 'manual', meta = null) {
  // 1. Обновляем баланс
  await query(
    'UPDATE users SET points_balance = COALESCE(points_balance, 0) + ? WHERE id = ?',
    [delta, userId]
  );

  // 2. Логируем транзакцию
  await query(
    `
      INSERT INTO points_transactions (user_id, amount, type, meta)
      VALUES (?, ?, ?, ?)
    `,
    [userId, delta, type, meta ? JSON.stringify(meta) : null]
  );
}