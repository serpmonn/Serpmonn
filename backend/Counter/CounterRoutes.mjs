import { Router } from 'express';
import { query } from '../database/config.mjs';                                                     // Импортируем query

const router = Router();

// Роут для получения количества пользователей (сайт + партнёрка)
router.get('/', async (req, res) => {
    try {
        const [siteUsers] = await query('SELECT COUNT(*) AS count FROM users');
        const [partnerUsers] = await query('SELECT COUNT(*) AS count FROM partner_users');
        const count = Number(siteUsers?.count || 0) + Number(partnerUsers?.count || 0);
        res.json({
            success: true,
            count,
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