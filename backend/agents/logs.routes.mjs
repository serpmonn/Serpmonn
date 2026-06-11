import { Router } from 'express';
import { verifyToken } from '../auth/auth.middleware.mjs';
import { pool } from '../db.mjs';
import { createLog, getLogsByBuyer, getStatsByAgent, getCallCount } from './logs.model.mjs';

const router = Router();

// POST /api/agents/:id/log
// Агент пишет событие — авторизация по X-Agent-Key
router.post('/:id/log', async (req, res) => {
    try {
        const agentId    = Number(req.params.id);
        const apiKey     = req.headers['x-agent-key'];
        const { event_type, payload, buyer_user_id } = req.body;

        if (!apiKey) {
            return res.status(401).json({ status: 'error', message: 'Нет X-Agent-Key' });
        }

        const [rows] = await pool.query(
            `SELECT id FROM agents WHERE id = ? AND api_key = ?`,
            [agentId, apiKey]
        );
        if (!rows.length) {
            return res.status(403).json({ status: 'error', message: 'Неверный ключ агента' });
        }

        if (!event_type?.trim()) {
            return res.status(400).json({ status: 'error', message: 'event_type обязателен' });
        }

        const logId = await createLog({
            agentId,
            buyerUserId: buyer_user_id || null,
            eventType:   event_type.trim(),
            payload:     payload || null
        });

        return res.status(201).json({ status: 'ok', log_id: logId });
    } catch (err) {
        console.error('[logs] write error:', err);
        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
});

// GET /api/agents/:id/logs
// Бизнес смотрит историю своего агента — авторизация по JWT
router.get('/:id/logs', verifyToken, async (req, res) => {
    try {
        const agentId = Number(req.params.id);
        const limit   = Math.min(Number(req.query.limit) || 50, 200);
        const offset  = Number(req.query.offset) || 0;

        const [sub] = await pool.query(
            `SELECT id FROM agent_subscriptions
             WHERE agent_id = ? AND buyer_user_id = ? AND status = 'active'
             LIMIT 1`,
            [agentId, req.user.id]
        );
        if (!sub.length) {
            return res.status(403).json({ status: 'error', message: 'Нет активной подписки' });
        }

        const logs = await getLogsByBuyer({ agentId, buyerUserId: req.user.id, limit, offset });
        return res.status(200).json({ status: 'ok', logs });
    } catch (err) {
        console.error('[logs] read error:', err);
        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
});

// GET /api/agents/:id/stats
// Разработчик смотрит аналитику своего агента — авторизация по JWT
// Ответ содержит call_count: { total, month, day } — число gateway_call вызовов агента
router.get('/:id/stats', verifyToken, async (req, res) => {
    try {
        const agentId = Number(req.params.id);
        const stats   = await getStatsByAgent(agentId, req.user.id);

        if (!stats) {
            return res.status(403).json({ status: 'error', message: 'Агент не найден или нет доступа' });
        }

        // Добавляем счётчик звонков агента — быстро через индекс
        const [callTotal, callMonth, callDay] = await Promise.all([
            getCallCount(agentId, null, 'all'),
            getCallCount(agentId, null, 'month'),
            getCallCount(agentId, null, 'day'),
        ]);

        return res.status(200).json({
            status: 'ok',
            stats: {
                ...stats,
                call_count: { total: callTotal, month: callMonth, day: callDay }
            }
        });
    } catch (err) {
        console.error('[logs] stats error:', err);
        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
});

// GET /api/agents/:id/stats/calls
// Покупатель смотрит свой счётчик запросов к агенту — авторизация по JWT
router.get('/:id/stats/calls', verifyToken, async (req, res) => {
    try {
        const agentId = Number(req.params.id);

        // Проверяем наличие активной подписки
        const [sub] = await pool.query(
            `SELECT id FROM agent_subscriptions
             WHERE agent_id = ? AND buyer_user_id = ? AND status = 'active'
             LIMIT 1`,
            [agentId, req.user.id]
        );
        if (!sub.length) {
            return res.status(403).json({ status: 'error', message: 'Нет активной подписки' });
        }

        const [callTotal, callMonth, callDay] = await Promise.all([
            getCallCount(agentId, req.user.id, 'all'),
            getCallCount(agentId, req.user.id, 'month'),
            getCallCount(agentId, req.user.id, 'day'),
        ]);

        return res.status(200).json({
            status: 'ok',
            call_count: { total: callTotal, month: callMonth, day: callDay }
        });
    } catch (err) {
        console.error('[logs] calls error:', err);
        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
});

export default router;
