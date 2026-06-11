import { Router } from 'express';
import {
    handleCreateAgent,
    handleGetMyAgents,
    handleGetMarketplace,
    handlePublishAgent,
    handleIncomingEvent,
    handleDeleteAgent
} from './agents.controller.mjs';

const agentsRouter = Router();

// Публичные маршруты (не требуют авторизации)
agentsRouter.get('/marketplace',   handleGetMarketplace);    // Список всех опубликованных агентов
agentsRouter.post('/event',        handleIncomingEvent);     // Входящее событие от VK/TG/etc

// Защищённые маршруты (verifyToken применяется в routes.mjs через /api)
agentsRouter.post('/',             handleCreateAgent);       // Создать агента
agentsRouter.get('/',              handleGetMyAgents);       // Мои агенты
agentsRouter.post('/:id/publish',  handlePublishAgent);      // Опубликовать / снять
agentsRouter.delete('/:id',        handleDeleteAgent);       // Удалить агента

export default agentsRouter;
