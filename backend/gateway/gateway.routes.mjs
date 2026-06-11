import { Router } from 'express';
import { query } from '../database/config.mjs';
import { createLog } from '../agents/logs.model.mjs';

const router = Router();

// POST|GET /gateway/:agentId — прокси любого запроса к агенту. :agentId может быть числом или slug
const gatewayHandler = async (req, res) => {
    const start       = Date.now();
    const agentParam  = req.params.agentId;
    const isNumeric   = /^\d+$/.test(agentParam);

    const token = (req.headers['authorization'] || req.headers['x-buyer-token'] || '').replace('Bearer ', '').trim();

    if (!token) {
        return res.status(401).json({ status: 'error', message: 'Требуется токен покупателя (Authorization или X-Buyer-Token)' });
    }

    try {
        const { default: jwt } = await import('jsonwebtoken');
        let buyerId;
        try {
            const payload = jwt.verify(token, process.env.JWT_SECRET);
            buyerId = payload.id || payload.userId || payload.sub;
        } catch {
            return res.status(401).json({ status: 'error', message: 'Невалидный токен' });
        }

        // Находим агента по slug или числовому id
        const [agentRows] = await query(
            isNumeric
                ? `SELECT id, webhook_url, is_published FROM agents WHERE id = ? LIMIT 1`
                : `SELECT id, webhook_url, is_published FROM agents WHERE slug = ? LIMIT 1`,
            [isNumeric ? Number(agentParam) : agentParam]
        );

        if (!agentRows) {
            return res.status(404).json({ status: 'error', message: 'Агент не найден' });
        }
        if (!agentRows.webhook_url) {
            return res.status(502).json({ status: 'error', message: 'У агента не настроен webhook' });
        }

        const agentId = agentRows.id; // всегда работаем с числовым id внутри

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
            createLog({ agentId, buyerUserId: buyerId, eventType: 'gateway_no_subscription', payload: null }).catch(() => {});
            return res.status(403).json({ status: 'error', message: 'Нет активной подписки на агента' });
        }

        const forwardHeaders = {
            'Content-Type':     req.headers['content-type'] || 'application/json',
            'X-Serpmonn-Agent': String(agentId),
            'X-Buyer-Id':       String(buyerId),
            'X-Request-Id':     crypto.randomUUID()
        };

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
                signal:  AbortSignal.timeout(30_000)
            });
        } catch (err) {
            createLog({ agentId, buyerUserId: buyerId, eventType: 'gateway_timeout', payload: { error: err.message } }).catch(() => {});
            return res.status(504).json({ status: 'error', message: 'Агент не ответил вовремя' });
        }

        const durationMs  = Date.now() - start;
        const contentType = agentRes.headers.get('content-type') || 'application/json';
        const body        = await agentRes.text();

        createLog({
            agentId,
            buyerUserId: buyerId,
            eventType:   'gateway_call',
            payload:     { method: req.method, status: agentRes.status, duration_ms: durationMs }
        }).catch(() => {});

        res.status(agentRes.status)
           .setHeader('Content-Type', contentType)
           .setHeader('X-Serpmonn-Duration', String(durationMs))
           .send(body);

    } catch (err) {
        console.error('[gateway] error:', err);
        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
};

router.get('/:agentId',  gatewayHandler);
router.post('/:agentId', gatewayHandler);

export default router;
