// backend/points/pointsRoutes.mjs
import express from 'express';
import { getUserPoints } from './pointsService.js';

const router = express.Router();

router.get('/me/points', async (req, res) => {                                                                                  // GET /api/me/points — вернуть баланс баллов текущего пользователя
  try {
    const userId = req.user?.id || req.userId;
    if (!userId) {
      return res.status(401).json({ error: 'unauthorized' });
    }

    const balance = await getUserPoints(userId);
    res.json({ balance });
  } catch (e) {
    console.error('GET /api/me/points error', e);
    res.status(500).json({ error: 'internal_error' });
  }
});

export default router;