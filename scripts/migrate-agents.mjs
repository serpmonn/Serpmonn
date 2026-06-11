#!/usr/bin/env node
// Запуск: node scripts/migrate-agents.mjs
// Создаёт таблицы agents и agent_subscriptions если их нет

import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), 'backend/.env') });

import { createAgentsTable } from '../backend/agents/agents.model.mjs';
import { createSubscriptionsTable } from '../backend/agents/subscriptions.model.mjs';

try {
    await createAgentsTable();
    console.log('✅ Таблица agents готова');

    await createSubscriptionsTable();
    console.log('✅ Таблица agent_subscriptions готова');

    console.log('\nМиграция завершена.');
    process.exit(0);
} catch (err) {
    console.error('❌ Ошибка миграции:', err);
    process.exit(1);
}
