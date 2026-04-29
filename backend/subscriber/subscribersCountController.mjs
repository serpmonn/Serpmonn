// backend/subscribersCountController.mjs
import { query } from '../database/config.mjs';

async function getSubscribersCount(req, res) {
  try {
    const rows = await query(
      `SELECT COUNT(*) AS cnt 
       FROM subscriptions 
       WHERE is_active = 1`
    );

    const count = Number(rows[0]?.cnt || 0);

    // Можно сразу вернуть округлённое значение или «сырое» число
    return res.json({ count });
  } catch (error) {
    console.error('Ошибка при получении количества подписчиков:', error);
    return res.status(500).json({ count: 0 });
  }
}

export { getSubscribersCount };