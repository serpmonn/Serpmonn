import express from 'express';
import { query } from '../database/config.mjs';

const router = express.Router();

router.get('/unsubscribe', async (req, res) => {
  const email = req.query.email?.trim();

  if (!email) {
    return res.status(400).send('Некорректная ссылка отписки.');
  }

  try {
    await query(
      `UPDATE subscriptions
       SET is_active = 0
       WHERE email = ?`,
      [email]
    );

    // Простейшая страница после отписки
    return res.send(`
      <!doctype html>
      <html lang="ru">
        <head><meta charset="utf-8"><title>Отписка</title></head>
        <body style="font-family: Arial, sans-serif;">
          <h2>Вы успешно отписались от рассылки промокодов Serpmonn.</h2>
          <p>Если это произошло случайно, вы всегда можете снова подписаться на сайте.</p>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Ошибка отписки:', error);
    return res.status(500).send('Ошибка сервера. Попробуйте позже.');
  }
});

export default router;