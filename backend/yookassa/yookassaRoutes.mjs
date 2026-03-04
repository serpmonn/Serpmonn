import express from 'express';
import YooKassa from 'yookassa';
import { query } from '../database/config.mjs';

const router = express.Router();

const yooKassa = new YooKassa({
  shopId: process.env.YOOKASSA_SHOP_ID,
  secretKey: process.env.YOOKASSA_SECRET_KEY
});

// 1) Создать платёж (POST /api/yookassa/create)
router.post('/api/yookassa/create', async (req, res) => {
  try {
    const { userId, amount, description = 'Тариф Pro' } = req.body;

    const idempotenceKey =
      `pay_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    const payment = await yooKassa.createPayment(
      {
        amount: {
          value: Number(amount).toFixed(2),
          currency: 'RUB'
        },
        confirmation: {
          type: 'redirect',
          return_url: 'https://serpmonn.ru/frontend/tariffs/success.html'
        },
        capture: true,
        description,
        metadata: { userId }
      },
      idempotenceKey
    );

    res.json({
      success: true,
      confirmationUrl: payment.confirmation.confirmation_url
    });
  } catch (error) {
    console.error('YooKassa create error:', error);
    res.status(500).json({ error: 'Ошибка создания платежа' });
  }
});

// 2) Webhook для уведомлений (POST /api/yookassa/webhook)
router.post('/api/yookassa/webhook', async (req, res) => {
  try {
    const event = req.body;

    if (event.event === 'payment.succeeded') {
      const payment = event.object;
      const userId = payment.metadata?.userId;

      if (userId) {
        const sql = `
          UPDATE users 
          SET plan = 'pro', pro_until = DATE_ADD(NOW(), INTERVAL 30 DAY) 
          WHERE id = ?
        `;
        await query(sql, [userId]);

        console.log(
          `Pro activated for user ${userId}, payment ${payment.id}`
        );
      } else {
        console.warn('payment.succeeded without userId metadata');
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
});

export default router;