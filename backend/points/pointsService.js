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

/**
 * Стартовые баллы для соц. регистрации (VK / Messenger / Mini).
 * Эквивалент email: +50 signup + +200 confirm (аккаунт сразу confirmed).
 * Идемпотентно через registration_points_awarded.
 */
export async function awardSocialRegistrationBonuses(userId, via = 'social') {
  if (!userId) return false;

  const rows = await query(
    'SELECT registration_points_awarded FROM users WHERE id = ? LIMIT 1',
    [userId]
  );
  if (!rows?.length) return false;
  if (rows[0].registration_points_awarded) return false;

  await awardPoints(userId, 50, 'registration_signup', { via });
  await awardPoints(userId, 200, 'registration', { via });
  await query(
    'UPDATE users SET registration_points_awarded = 1 WHERE id = ?',
    [userId]
  );
  return true;
}