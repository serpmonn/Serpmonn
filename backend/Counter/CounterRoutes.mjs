import { Router } from 'express';
import { query } from '../database/config.mjs';                                                     // Импортируем query

const router = Router();

// Роут для получения количества пользователей
router.get('/', async (req, res) => {
    try {
        const [results] = await query('SELECT COUNT(*) AS count FROM users');
        res.json({
            success: true,
            count: results.count,
        });
    } catch (error) {
        console.error('Counter error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

export default router;