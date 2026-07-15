import express from 'express';
import YooKassa from '../yookassa/yookassaClient.mjs';
import { query } from '../database/config.mjs';
import {
    createSubscription,
    activateSubscription,
    getSubscriptionByPaymentId,
    getActiveSubscriptionsByBuyer,
    creditDeveloper,
    getDeveloperEarnings,
    createPayout,
    getPayoutHistory
} from './subscriptions.model.mjs';
import { getAgentByIdPublic, getAgentByIdOrSlug } from './agents.model.mjs';
import verifyToken from '../auth/verifyToken.mjs';
import { getRequestIp, isYooKassaIp } from '../yookassa/yookassaWebhookAuth.mjs';

const router = express.Router();

const yooKassa = new YooKassa({
    shopId:    process.env.YOOKASSA_SHOP_ID,
    secretKey: process.env.YOOKASSA_SECRET_KEY
});

// POST /api/agents/:id/subscribe
router.post('/:id/subscribe', verifyToken, async (req, res) => {
    try {
        const agentId = Number(req.params.id);
        const buyerUserId = req.user.id;

        const agent = await getAgentByIdPublic(agentId);
        if (!agent) return res.status(404).json({ status: 'error', message: 'Агент не найден' });
        if (!agent.is_published) return res.status(400).json({ status: 'error', message: 'Агент не опубликован' });
        if (agent.price_rub <= 0) return res.status(400).json({ status: 'error', message: 'У агента не указана цена' });

        const idempotenceKey = `agent_sub_${agentId}_${buyerUserId}_${Date.now()}`;

        const payment = await yooKassa.createPayment(
            {
                amount: { value: Number(agent.price_rub).toFixed(2), currency: 'RUB' },
                confirmation: { type: 'redirect', return_url: `https://serpmonn.ru/agents/success?agent_id=${agentId}` },
                capture: true,
                description: `Подписка на агента «${agent.name}» — 30 дней`,
                metadata: { agentId, buyerUserId, type: 'agent_subscription' }
            },
            idempotenceKey
        );

        await createSubscription({ agentId, buyerUserId, paymentId: payment.id, priceRub: agent.price_rub });

        return res.json({
            status: 'ok',
            confirmation_url: payment.confirmation.confirmation_url,
            payment_id: payment.id
        });
    } catch (err) {
        console.error('[subscriptions] subscribe error:', err);
        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
});

// GET /api/agents/:id/access — slug или числовой id
router.get('/:id/access', verifyToken, async (req, res) => {
    try {
        const buyerUserId = req.user.id;
        const agent = await getAgentByIdOrSlug(req.params.id);
        if (!agent) return res.status(404).json({ status: 'error', message: 'Агент не найден' });

        const [sub] = await query(
            `SELECT id, active_until FROM agent_subscriptions
             WHERE agent_id = ? AND buyer_user_id = ? AND status = 'active' AND active_until > NOW()
             LIMIT 1`,
            [agent.id, buyerUserId]
        );

        if (!sub) return res.status(403).json({ status: 'error', message: 'Нет активной подписки' });

        const agentRef   = agent.slug || agent.id;
        const gatewayUrl = `https://api.serpmonn.ru/gateway/${agentRef}`;

        return res.json({
            status: 'ok',
            gateway_url: gatewayUrl,
            agent_id: agent.id,
            agent_slug: agent.slug,
            active_until: sub.active_until,
            instructions: {
                method: 'POST', url: gatewayUrl,
                headers: { 'Authorization': 'Bearer <ваш_токен>', 'Content-Type': 'application/json' },
                body_example: { message: 'Привет!' }
            }
        });
    } catch (err) {
        console.error('[subscriptions] access error:', err);
        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
});

// GET /api/agents/my-subscriptions
router.get('/my-subscriptions', verifyToken, async (req, res) => {
    try {
        const subs = await getActiveSubscriptionsByBuyer(req.user.id);
        return res.json({ status: 'ok', subscriptions: subs });
    } catch (err) {
        console.error('[subscriptions] my-subscriptions error:', err);
        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
});

// GET /api/agents/earnings — заработок разработчика
router.get('/earnings', verifyToken, async (req, res) => {
    try {
        const data = await getDeveloperEarnings(req.user.id);
        return res.json({ status: 'ok', ...data });
    } catch (err) {
        console.error('[subscriptions] earnings error:', err);
        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
});

// GET /api/agents/payouts — история выплат
router.get('/payouts', verifyToken, async (req, res) => {
    try {
        const payouts = await getPayoutHistory(req.user.id);
        return res.json({ status: 'ok', payouts });
    } catch (err) {
        console.error('[subscriptions] payouts error:', err);
        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
});

// POST /api/agents/payouts — заявка на выплату
router.post('/payouts', verifyToken, async (req, res) => {
    try {
        const { method, details } = req.body;

        if (!method || !details) {
            return res.status(400).json({ status: 'error', message: 'Укажите способ и реквизиты' });
        }

        const earnings = await getDeveloperEarnings(req.user.id);

        if (earnings.available < 500) {
            return res.status(400).json({ status: 'error', message: 'Минимальная сумма вывода — 500 ₽' });
        }

        const payoutId = await createPayout({
            devUserId:  req.user.id,
            amountRub:  earnings.available,
            method,
            details
        });

        return res.json({
            status: 'ok',
            payout_id:  payoutId,
            amount_rub: earnings.available,
            message:    'Заявка принята. Выплата в течение 3 рабочих дней.'
        });
    } catch (err) {
        console.error('[subscriptions] payout create error:', err);
        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
});

// POST /api/agents/subscription-webhook — YooKassa webhook
router.post('/subscription-webhook', async (req, res) => {
    try {
        const ip = getRequestIp(req);
        if (!isYooKassaIp(ip)) {
            console.warn('[subscriptions] webhook rejected: bad IP', ip);
            return res.sendStatus(403);
        }

        const event = req.body;
        if (event?.event !== 'payment.succeeded' || !event?.object?.id) {
            return res.sendStatus(200);
        }

        const paymentId = event.object.id;
        const payment = await yooKassa.getPayment(paymentId);
        if (payment.status !== 'succeeded' || payment.paid !== true) {
            console.warn('[subscriptions] webhook: payment not succeeded', paymentId, payment.status);
            return res.sendStatus(200);
        }

        const meta = payment.metadata || {};
        if (meta.type !== 'agent_subscription') return res.sendStatus(200);

        const sub = await getSubscriptionByPaymentId(payment.id);
        if (!sub) {
            console.warn('[subscriptions] webhook: subscription not found for payment', payment.id);
            return res.sendStatus(200);
        }

        await activateSubscription(payment.id);
        await creditDeveloper(sub.agent_id, sub.price_rub);

        console.log(`[subscriptions] activated: agent=${sub.agent_id} buyer=${sub.buyer_user_id} payment=${payment.id}`);

        return res.sendStatus(200);
    } catch (err) {
        console.error('[subscriptions] webhook error:', err);
        return res.sendStatus(500);
    }
});

export default router;
