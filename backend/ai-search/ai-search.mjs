import dotenv from 'dotenv';
import express from 'express';

import { warmupSearchModel } from './ollama-client.mjs';
import { registerAiSearchRoutes } from './routes/ai-search.routes.mjs';
import { registerWebSearchRoutes } from './routes/web-search.routes.mjs';
import { registerReverseImageRoutes } from './routes/reverse-image.routes.mjs';
import { registerFeedbackRoutes } from './routes/feedback.routes.mjs';
import { registerAiImageRoutes } from './routes/ai-image.routes.mjs';
import { registerAiChatRoutes } from './routes/ai-chat.routes.mjs';

dotenv.config({ path: '/var/www/serpmonn.ru/backend/.env' });

const router = express.Router();

// Preserve original registration order
registerAiSearchRoutes(router);
registerAiChatRoutes(router);
registerAiImageRoutes(router);
registerReverseImageRoutes(router);
registerWebSearchRoutes(router);
registerFeedbackRoutes(router);

setTimeout(warmupSearchModel, 3000);

export default router;
