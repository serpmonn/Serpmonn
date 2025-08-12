import { query } from '../database/config.mjs';
import validator from 'validator';
const { isEmail } = validator;

async function subscribe(req, res) {
    const email = req.body.email.trim();
    
    if (!email || !isEmail(email)) {
        return res.status(400).json({ message: 'Некорректный email' });
    }

    if (email.length > 255) {
        return res.status(400).json({ message: 'Email слишком длинный' });
    }

    try {
        // Проверяем существующую неактивную подписку
        const [existing] = await query(
            `SELECT id FROM subscriptions 
             WHERE email = ? AND is_active = 0`,
            [email]
        );

        if (existing?.length > 0) {
            // Реактивируем существующую подписку
            await query(
                `UPDATE subscriptions 
                 SET is_active = 1, created_at = NOW() 
                 WHERE email = ?`,
                [email]
            );
            return res.json({ message: 'Подписка реактивирована!' });
        }

        // Пытаемся создать новую подписку
        const result = await query(
            `INSERT INTO subscriptions (email, is_active) 
             VALUES (?, 1)`,
            [email]
        );

        return res.json({ message: 'Подписка оформлена!' });
    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Этот email уже подписан' });
        }
        console.error('Ошибка при подписке:', error);
        return res.status(500).json({ message: 'Ошибка сервера' });
    }
}

export { subscribe };