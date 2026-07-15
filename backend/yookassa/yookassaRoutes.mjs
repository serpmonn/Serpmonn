import express from 'express';
import { randomUUID } from 'crypto';
import YooKassa from './yookassaClient.mjs';
import { query } from '../database/config.mjs';
import verifyToken from '../auth/verifyToken.mjs';
import { getRequestIp, isYooKassaIp } from './yookassaWebhookAuth.mjs';

const router = express.Router();

const yooKassa = new YooKassa({
  shopId: process.env.YOOKASSA_SHOP_ID,
  secretKey: process.env.YOOKASSA_SECRET_KEY
});

/** Сумма Pro на 30 дней; клиентский amount не доверяем. */
const PRO_AMOUNT_RUB = Number(process.env.YOOKASSA_PRO_AMOUNT_RUB || 2499);

function formatAmount(value) {
  return Number(value).toFixed(2);
}

async function activateProForUser(userId, paymentId) {
  const id = String(userId || '').trim();
  // users.id — UUID-строка, не число
  if (!id || id.length > 64) {
    console.warn('YooKassa: skip Pro activate — invalid userId', userId, paymentId);
    return;
  }

  await query(
    `
      UPDATE users
      SET plan = 'pro', pro_until = DATE_ADD(NOW(), INTERVAL 30 DAY)
      WHERE id = ?
    `,
    [id]
  );

  console.log(`Pro activated for user ${id}, payment ${paymentId}`);
}

// 1) Создать платёж (POST /api/yookassa/create) — только авторизованный пользователь
router.post('/api/yookassa/create', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!Number.isFinite(PRO_AMOUNT_RUB) || PRO_AMOUNT_RUB <= 0) {
      console.error('YooKassa: invalid YOOKASSA_PRO_AMOUNT_RUB');
      return res.status(500).json({ error: 'Ошибка конфигурации платежа' });
    }

    const description =
      typeof req.body?.description === 'string' && req.body.description.trim()
        ? req.body.description.trim().slice(0, 128)
        : 'Serpmonn Pro — 30 дней';

    // ЮKassa: Idempotence-Key ≤ 64 символов
    const idempotenceKey = randomUUID();

    const payment = await yooKassa.createPayment(
      {
        amount: {
          value: formatAmount(PRO_AMOUNT_RUB),
          currency: 'RUB'
        },
        confirmation: {
          type: 'redirect',
          return_url: 'https://serpmonn.ru/frontend/tariffs/success.html'
        },
        capture: true,
        description,
        metadata: {
          userId: String(userId),
          type: 'serpmonn_pro'
        }
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

// 2) Webhook (POST /api/yookassa/webhook) — IP allowlist + сверка payment через API
router.post('/api/yookassa/webhook', async (req, res) => {
  try {
    const ip = getRequestIp(req);
    if (!isYooKassaIp(ip)) {
      console.warn('YooKassa webhook rejected: bad IP', ip);
      return res.sendStatus(403);
    }

    const event = req.body;
    if (event?.event !== 'payment.succeeded' || !event?.object?.id) {
      return res.sendStatus(200);
    }

    const paymentId = event.object.id;
    const payment = await yooKassa.getPayment(paymentId);

    if (payment.status !== 'succeeded' || payment.paid !== true) {
      console.warn('YooKassa webhook: payment not succeeded', paymentId, payment.status);
      return res.sendStatus(200);
    }

    if (payment.metadata?.type && payment.metadata.type !== 'serpmonn_pro') {
      // чужие типы (agent_subscription и т.п.) — не наш webhook
      return res.sendStatus(200);
    }

    const expected = formatAmount(PRO_AMOUNT_RUB);
    if (payment.amount?.value !== expected || payment.amount?.currency !== 'RUB') {
      console.warn(
        'YooKassa webhook: unexpected amount',
        paymentId,
        payment.amount,
        'expected',
        expected
      );
      return res.sendStatus(200);
    }

    const userId = payment.metadata?.userId;
    if (userId) {
      await activateProForUser(userId, paymentId);
    } else {
      console.warn('YooKassa webhook: payment.succeeded without userId', paymentId);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Webhook error:', error);
    res.sendStatus(500);
  }
});

export default router;
