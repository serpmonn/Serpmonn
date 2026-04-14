import { query } from '../database/config.mjs';
import validator from 'validator';
const { isEmail } = validator;

async function subscribe(req, res) {
  const email = req.body.email?.trim();

  if (!email || !isEmail(email)) {
    return res.status(400).json({ message: 'Некорректный email' });
  }

  if (email.length > 255) {
    return res.status(400).json({ message: 'Email слишком длинный' });
  }

  try {
    // 1. Ищем подписку по email вообще
    const rows = await query(
      `SELECT id, is_active 
       FROM subscriptions 
       WHERE email = ? 
       LIMIT 1`,
      [email]
    );

    const existing = rows[0];

    if (existing) {
      // 2а. Уже есть подписка
      if (existing.is_active) {
        // Уже активна -> считаем, что всё ок
        return res.json({ message: 'Вы уже подписаны на рассылку промокодов!' });
      } else {
        // Есть, но выключена -> реактивируем
        await query(
          `UPDATE subscriptions 
           SET is_active = 1, created_at = NOW() 
           WHERE id = ?`,
          [existing.id]
        );
        return res.json({ message: 'Подписка на промокоды успешно восстановлена!' });
      }
    }

    // 2б. Подписки нет -> создаём новую
    await query(
      `INSERT INTO subscriptions (email, is_active) 
       VALUES (?, 1)`,
      [email]
    );

    return res.json({ message: 'Подписка на промокоды оформлена!' });
  } catch (error) {
    console.error('Ошибка при подписке:', error);

    // На всякий случай защитимся от гонки/дубликатов
    if (error.code === 'ER_DUP_ENTRY') {
      return res.json({ message: 'Вы уже подписаны на рассылку промокодов!' });
    }

    return res.status(500).json({ message: 'Ошибка сервера' });
  }
}

export { subscribe };