-- Миграция: составной индекс для быстрого COUNT по gateway_call
-- Выполнить один раз на сервере:
--   mysql -u root -p serpmonn < backend/scripts/migrate-agent-logs-index.sql
--
-- Индекс покрывает:
--   getCallCount(agentId)                      — фильтр по agent_id + event_type
--   getCallCount(agentId, buyerUserId)         — + buyer_user_id
--   getCallCount(agentId, ..., 'day'|'month')  — + created_at (range)
--
-- Если индекс уже существует — MySQL проигнорирует команду (IF NOT EXISTS).

ALTER TABLE agent_logs
    ADD INDEX IF NOT EXISTS idx_agent_logs_counter
        (agent_id, event_type, buyer_user_id, created_at);
