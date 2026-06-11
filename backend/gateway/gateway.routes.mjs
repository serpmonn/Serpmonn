import { Router } from 'express';
import { query } from '../database/config.mjs';
import { createLog } from '../agents/logs.model.mjs';

const router = Router();

// POST|GET /gateway/:agentId — прокси любого запроса к агенту
const gatewayHandler = async (req, res) => {
    const start   = Date.now();
    const agentId = Number(req.params.agentId);

    // Авторизация: JWT в Authorization или X-Buyer-Token
    const token = (req.headers['authorization'] || req.headers['x-buyer-token'] || '').replace('Bearer ', '').trim();

    if (!token) {
        return res.status(401).json({ status: 'error', message: 'Требуется токен покупателя (Authorization или X-Buyer-Token)' });
    }

    try {
        // 1. Декодируем токен — достаём buyer_user_id
        const { default: jwt } = await import('jsonwebtoken');
        let buyerId;
        try {
            const payload = jwt.verify(token, process.env.JWT_SECRET);
            buyerId = payload.id || payload.userId || payload.sub;
        } catch {
            return res.status(401).json({ status: 'error', message: 'Невалидный токен' });
        }

        // 2. Проверяем агента: существует ли, есть ли webhook_url
        const [agentRows] = await query(
            `SELECT id, webhook_url, is_published FROM agents WHERE id = ? LIMIT 1`,
            [agentId]
        );
        if (!agentRows) {
            return res.status(404).json({ status: 'error', message: 'Агент не найден' });
        }
        if (!agentRows.webhook_url) {
            return res.status(502).json({ status: 'error', message: 'У агента не настроен webhook' });
        }

        // 3. Проверяем активную подписку
        const [sub] = await (async () => {
            const rows = await query(
                `SELECT id FROM agent_subscriptions
                 WHERE agent_id = ? AND buyer_user_id = ? AND status = 'active' AND active_until > NOW()
                 LIMIT 1`,
                [agentId, buyerId]
            );
            return rows;
        })();

        if (!sub) {
            // Пишем лог отклонённого запроса
            createLog({ agentId, buyerUserId: buyerId, eventType: 'gateway_no_subscription', payload: null }).catch(() => {});
            return res.status(403).json({ status: 'error', message: 'Нет активной подписки на агента' });
        }

        // 4. Форвардим запрос к агенту
        const forwardHeaders = {
            'Content-Type':    req.headers['content-type'] || 'application/json',
            'X-Serpmonn-Agent': String(agentId),          // Агент знает что запрос от нас
            'X-Buyer-Id':      String(buyerId),            // Агент знает кто пришёл
            'X-Request-Id':    crypto.randomUUID()         // Для дедупликации на стороне агента
        };

        // Копируем безопасные кастомные заголовки от бизнеса
        for (const [key, val] of Object.entries(req.headers)) {
            if (key.startsWith('x-') && !['x-buyer-token', 'x-serpmonn-agent', 'x-buyer-id'].includes(key)) {
                forwardHeaders[key] = val;
            }
        }

        let agentRes;
        try {
            agentRes = await fetch(agentRows.webhook_url, {
                method:  req.method,
                headers: forwardHeaders,
                body:    ['GET', 'HEAD'].includes(req.method) ? undefined : JSON.stringify(req.body),
                signal:  AbortSignal.timeout(30_000)       // 30 сек таймаут
            });
        } catch (err) {
            createLog({ agentId, buyerUserId: buyerId, eventType: 'gateway_timeout', payload: { error: err.message } }).catch(() => {});
            return res.status(504).json({ status: 'error', message: 'Агент не ответил вовремя' });
        }

        const durationMs  = Date.now() - start;
        const contentType = agentRes.headers.get('content-type') || 'application/json';
        const body        = await agentRes.text();

        // 5. Пишем лог успешного запроса
        createLog({
            agentId,
            buyerUserId: buyerId,
            eventType:   'gateway_call',
            payload:     { method: req.method, status: agentRes.status, duration_ms: durationMs }
        }).catch(() => {});

        // 6. Возвращаем ответ агента бизнесу
        res.status(agentRes.status)
           .setHeader('Content-Type', contentType)
           .setHeader('X-Serpmonn-Duration', String(durationMs))
           .send(body);

    } catch (err) {
        console.error('[gateway] error:', err);
        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
};

// Поддерживаем GET и POST (агенты бывают разные)
router.get('/:agentId',  gatewayHandler);
router.post('/:agentId', gatewayHandler);

export default router;
