// backend/subscribersCountRoutes.mjs
import express from 'express';
import { getSubscribersCount } from './subscribersCountController.mjs';

const router = express.Router();

// GET /api/subscribers/count
router.get('/subscribers/count', getSubscribersCount);

export default router;