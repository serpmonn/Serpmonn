import express from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendResetEmail } from '../../utils/mailer.js';
import { saveToken, getTokenData, removeToken, canSendToken } from '../../utils/tokenStore.js';
import { query } from '../../database/config.mjs';

const router = express.Router();

// POST /auth/forgot
router.post('/forgot', async (req, res) => {
    const { email } = req.body;

    try {
        const users = await query('SELECT id FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(200).json({ message: 'Проверьте почту — если адрес зарегистрирован, вы получите письмо со ссылкой.' });                                                   // Чтобы не выдать, есть ли email в базе
        }

        const user = users[0];

        if (!canSendToken(user.id)) {
            return res.status(429).json({ message: 'Слишком частые запросы. Попробуйте через несколько минут.' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        saveToken(token, user.id);

        const resetLink = `https://serpmonn.ru/frontend/login/forgot/reset/reset.html?token=${token}`;
        await sendResetEmail(email, resetLink);

        res.status(200).json({ message: 'Ссылка для сброса пароля отправлена на почту.' });
    } catch (err) {
        console.error('Ошибка при отправке ссылки сброса:', err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

// POST /auth/reset
router.post('/reset', async (req, res) => {
    const { token, newPassword } = req.body;

    try {
        const userId = getTokenData(token);
        if (!userId) return res.status(400).json({ message: 'Ссылка недействительна или устарела.' });

        const passwordHash = await bcrypt.hash(newPassword, 10);
        await query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);

        removeToken(token);
        res.status(200).json({ message: 'Пароль успешно обновлён.' });
    } catch (err) {
        console.error('Ошибка сброса пароля:', err);
        res.status(500).json({ message: 'Ошибка сервера' });
    }
});

export default router;