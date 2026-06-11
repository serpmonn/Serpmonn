import crypto from 'crypto';                                   // Для генерации API ключей
import {
    createAgent,
    getAgentsByUserId,
    getAgentByApiKey,
    getPublishedAgents,
    updateAgentPublished,
    deleteAgent,
    incrementTasksDone
} from './agents.model.mjs';

// POST /api/agents — создать агента
export async function handleCreateAgent(req, res) {
    try {
        const { name, description, webhook_url, price_rub } = req.body;

        if (!name?.trim()) {
            return res.status(400).json({ status: 'error', message: 'Имя агента обязательно' });
        }
        if (name.trim().length > 100) {
            return res.status(400).json({ status: 'error', message: 'Имя не более 100 символов' });
        }

        const apiKey = crypto.randomBytes(32).toString('hex'); // Генерируем уникальный API ключ

        const agentId = await createAgent({
            userId:      req.user.id,
            name:        name.trim(),
            description: description?.trim() || null,
            webhookUrl:  webhook_url || null,
            apiKey,
            priceRub:    Number(price_rub) || 0
        });

        return res.status(201).json({
            status:   'ok',
            agent_id: agentId,
            api_key:  apiKey,                                // Возвращаем ключ ОДИН РАЗ
            message:  'Агент создан'
        });
    } catch (err) {
        console.error('[agents] create error:', err);
        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
}

// GET /api/agents — список своих агентов
export async function handleGetMyAgents(req, res) {
    try {
        const agents = await getAgentsByUserId(req.user.id);
        return res.status(200).json({ status: 'ok', agents });
    } catch (err) {
        console.error('[agents] list error:', err);
        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
}

// GET /api/agents/marketplace — все опубликованные агенты
export async function handleGetMarketplace(req, res) {
    try {
        const agents = await getPublishedAgents();
        return res.status(200).json({ status: 'ok', agents });
    } catch (err) {
        console.error('[agents] marketplace error:', err);
        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
}

// POST /api/agents/:id/publish — опубликовать / снять
export async function handlePublishAgent(req, res) {
    try {
        const agentId = Number(req.params.id);
        const { publish } = req.body;

        await updateAgentPublished(agentId, req.user.id, publish);
        return res.status(200).json({ status: 'ok', message: publish ? 'Опубликован' : 'Снят с публикации' });
    } catch (err) {
        console.error('[agents] publish error:', err);
        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
}

// POST /api/agents/event — входящее событие от внешнего сервиса
export async function handleIncomingEvent(req, res) {
    try {
        const apiKey = req.headers['x-agent-key'];

        if (!apiKey) {
            return res.status(401).json({ status: 'error', message: 'Нет API ключа' });
        }

        const agent = await getAgentByApiKey(apiKey);
        if (!agent) {
            return res.status(401).json({ status: 'error', message: 'Агент не найден' });
        }

        await incrementTasksDone(agent.id);

        if (agent.webhook_url) {                             // Форвардим событие на webhook агента
            fetch(agent.webhook_url, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json', 'X-AgentBase-Key': apiKey },
                body:    JSON.stringify({ event: req.body, agent_id: agent.id })
            }).catch(err => console.error('[agents] webhook forward error:', err));
        }

        return res.status(200).json({ status: 'ok', agent_id: agent.id });
    } catch (err) {
        console.error('[agents] event error:', err);
        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
}

// DELETE /api/agents/:id — удалить агента
export async function handleDeleteAgent(req, res) {
    try {
        const agentId = Number(req.params.id);
        await deleteAgent(agentId, req.user.id);
        return res.status(200).json({ status: 'ok', message: 'Агент удалён' });
    } catch (err) {
        console.error('[agents] delete error:', err);
        return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
    }
}
