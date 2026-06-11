import express from 'express';
import YooKassa from 'yookassa';
import { query } from '../database/config.mjs';
import {
    createSubscription,
    activateSubscription,
    getSubscriptionByPaymentId,
    getActiveSubscriptionsByBuyer,
    creditDeveloper
} from './subscriptions.model.mjs';
import { getAgentByIdPublic, getAgentByIdOrSlug } from './agents.model.mjs';
import verifyToken from '../auth/verifyToken.mjs';

const router = express.Router();

const yooKassa = new YooKassa({
    shopId:    process.env.YOOKASSA_SHOP_ID,
    secretKey: process.env.YOOKASSA_SECRET_KEY
});

// POST /api/agents/:id/subscribe — бизнес подключает агента
router.post('/:id/subscribe', verifyToken, async (req, res) => {
    try {
        const agentId = Number(req.params.id);
        const buyerUserId = req.user.id;

        const agent = await getAgentByIdPublic(agentId);
        if (!agent) {
            return res.status(404).json({ status: 'error', message: 'Агент не найден' });
        }
        if (!agent.is_published) {
            return res.status(400).json({ status: 'error', message: 'Агент не опубликован' });
        }
        if (agent.price_rub <= 0) {
            return res.status(400).json({ status: 'error', message: 'У агента не указана цена' });
        }

        const idempotenceKey = `agent_sub_${agentId}_${buyerUserId}_${Date.now()}`;

        const payment = await yooKassa.createPayment(
            {
                amount: {
                    value:    Number(agent.price_rub).toFixed(2),
                    currency: 'RUB'
                },
                confirmation: {
                    type:       'redirect',
                    return_url: `https://serpmonn.ru/agents/success?agent_id=${agentId}`
                },
                capture:     true,
                description: `Подписка на агента «${agent.name}» — 30 дней`,
                metadata: {
                    agentId,
                    buyerUserId,
                    type: 'agent_subscription'
                }
            },
            idempotenceKey
        );

        await createSubscription({
            agentId,
            buyerUserId,
            paymentId: payment.id,
            priceRub:  agent.price_rub
        });

        return res.json({
            status:           'ok',
            confirmation_url: payment.confirmation.confirmation_url,
            payment_id:       payment.id
        });
    } catch (err) {
        console.error('[subscriptions] subscribe error:', err);
        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
});

// GET /api/agents/:id/access — gateway URL + инструкция. :id может быть числом или slug
router.get('/:id/access', verifyToken, async (req, res) => {
    try {
        const buyerUserId = req.user.id;

        // Находим агента по slug или числовому id
        const agent = await getAgentByIdOrSlug(req.params.id);
        if (!agent) {
            return res.status(404).json({ status: 'error', message: 'Агент не найден' });
        }

        const [sub] = await query(
            `SELECT id, active_until FROM agent_subscriptions
             WHERE agent_id = ? AND buyer_user_id = ? AND status = 'active' AND active_until > NOW()
             LIMIT 1`,
            [agent.id, buyerUserId]
        );

        if (!sub) {
            return res.status(403).json({ status: 'error', message: 'Нет активной подписки' });
        }

        // Gateway URL: используем slug если есть, иначе числовой id
        const agentRef  = agent.slug || agent.id;
        const gatewayUrl = `https://api.serpmonn.ru/gateway/${agentRef}`;

        return res.json({
            status:       'ok',
            gateway_url:  gatewayUrl,
            agent_id:     agent.id,
            agent_slug:   agent.slug,
            active_until: sub.active_until,
            instructions: {
                method:  'POST',
                url:     gatewayUrl,
                headers: {
                    'Authorization': 'Bearer <ваш_токен>',
                    'Content-Type':  'application/json'
                },
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

// POST /api/agents/subscription-webhook — YooKassa webhook
router.post('/subscription-webhook', async (req, res) => {
    try {
        const event = req.body;

        if (event.event === 'payment.succeeded') {
            const payment  = event.object;
            const meta     = payment.metadata || {};

            if (meta.type !== 'agent_subscription') {
                return res.sendStatus(200);
            }

            const sub = await getSubscriptionByPaymentId(payment.id);
            if (!sub) {
                console.warn('[subscriptions] webhook: subscription not found for payment', payment.id);
                return res.sendStatus(200);
            }

            await activateSubscription(payment.id);
            await creditDeveloper(sub.agent_id, sub.price_rub);

            console.log(
                `[subscriptions] activated: agent=${sub.agent_id} buyer=${sub.buyer_user_id} payment=${payment.id}`
            );
        }

        return res.sendStatus(200);
    } catch (err) {
        console.error('[subscriptions] webhook error:', err);
        return res.sendStatus(500);
    }
});

export default router;
