// backend/points/withdrawalRoutes.mjs
import express from 'express';
import { query } from '../database/config.mjs';
import { awardPoints, getUserPoints } from './pointsService.js';
import {
  POINTS_PER_PRO_DAY,
  MIN_PRO_EXCHANGE_POINTS
} from '../config/pointsConfig.mjs';

const router = express.Router();

router.post('/me/points/withdraw/pro', async (req, res) => {
  try {
    const userId = req.user?.id || req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const { days } = req.body || {};
    const daysInt = parseInt(days, 10);

    if (!Number.isFinite(daysInt) || daysInt <= 0) {
      return res.status(400).json({ error: 'invalid_days' });
    }

    const needPoints = daysInt * POINTS_PER_PRO_DAY;

    // минимум ИМЕННО для обмена на Pro
    if (needPoints < MIN_PRO_EXCHANGE_POINTS) {
      return res.status(400).json({
        error: 'too_small',
        message: `Минимум для обмена — ${MIN_PRO_EXCHANGE_POINTS} баллов.`
      });
    }

    // баланс пользователя
    const balance = await getUserPoints(userId);
    if (balance < needPoints) {
      return res.status(400).json({
        error: 'not_enough_points',
        message: 'Недостаточно баллов для обмена.'
      });
    }

    // создаём заявку
  const insertResult = await query(
    `INSERT INTO withdrawals (user_id, amount_points, amount_rub, method, details, status)
    VALUES (?, ?, ?, ?, ?, 'new')`,
    [
      userId,
      needPoints,
      0, // для pro можно 0, либо считать эквивалент в рублях
      'pro_days',
      JSON.stringify({ days: daysInt })
    ]
  );

  const withdrawalId = insertResult.insertId;

    // списываем баллы как заявку на вывод
    await awardPoints(
      userId,
      -needPoints,
      'withdraw_request',
      { withdrawal_id: withdrawalId, via: 'pro_exchange' }
    );

    // считаем, что оплата прошла и сразу помечаем как paid
    await query(
      `UPDATE withdrawals SET status = 'paid' WHERE id = ?`,
      [withdrawalId]
    );

    // продлеваем Pro пользователю
    await query(
      `
      UPDATE users
      SET plan = 'pro',
          pro_until =
            IF(
              pro_until IS NULL OR pro_until < NOW(),
              DATE_ADD(NOW(), INTERVAL ? DAY),
              DATE_ADD(pro_until, INTERVAL ? DAY)
            )
      WHERE id = ?
      `,
      [daysInt, daysInt, userId]
    );

    // фиксируем успешную активацию Pro за баллы
    await awardPoints(
      userId,
      0,
      'withdraw_paid',
      { withdrawal_id: withdrawalId, via: 'pro_exchange', points_spent: needPoints, days: daysInt }
    );

    return res.json({
      success: true,
      message: `Pro подписка продлена на ${daysInt} дней за ${needPoints} баллов.`
    });
  } catch (e) {
    console.error('POST /me/points/withdraw/pro error', e);
    return res.status(500).json({ error: 'internal_error' });
  }
});

export default router;