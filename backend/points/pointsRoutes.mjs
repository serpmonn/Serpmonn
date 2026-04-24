// backend/points/pointsRoutes.mjs
import express from 'express';
import { getUserPoints } from './pointsService.js';
import { query } from '../database/config.mjs';                                                   // Импорт query для выборки истории поинтов

const router = express.Router();

// GET /api/me/points — вернуть баланс баллов текущего пользователя
router.get('/me/points', async (req, res) => {                                                   // Обрабатываем запрос на получение текущего баланса
  try {
    const userId = req.user?.id || req.userId;                                                   // Берём id пользователя из req.user или req.userId (в зависимости от middleware)
    if (!userId) {                                                                               // Если id нет — пользователь не авторизован
      return res.status(401).json({ error: 'unauthorized' });                                    // Возвращаем 401 — нет доступа
    }

    const balance = await getUserPoints(userId);                                                 // Получаем баланс баллов через сервисную функцию
    res.json({ balance });                                                                       // Отправляем баланс в ответе
  } catch (e) {
    console.error('GET /api/me/points error', e);                                                // Логируем ошибку на сервере
    res.status(500).json({ error: 'internal_error' });                                           // Возвращаем 500 — внутренняя ошибка
  }
});

// GET /api/me/points/history — вернуть историю операций по баллам текущего пользователя
router.get('/me/points/history', async (req, res) => {                                           // Обрабатываем запрос на историю баллов
  try {
    const userId = req.user?.id || req.userId;                                                   // Берём id пользователя из объекта запроса
    if (!userId) {                                                                               // Если пользователя нет — значит, не авторизован
      return res.status(401).json({ error: 'unauthorized' });                                    // Возвращаем ошибку 401
    }

    const rows = await query(                                                                    // Делаем запрос к таблице points_transactions
      `
        SELECT
          amount,
          type,
          meta,
          created_at
        FROM points_transactions
        WHERE user_id = ?
        ORDER BY created_at DESC
        LIMIT 100
      `,
      [userId]                                                                                   // Подставляем id пользователя в запрос
    );

    const history = rows.map(row => {                                                            // Преобразуем данные из базы в удобный формат
      let metaParsed = null;                                                                     // Инициализируем переменную для распарсенного meta
      try {                                                                                      // Пытаемся распарсить meta как JSON
        metaParsed = row.meta ? JSON.parse(row.meta) : null;                                     // Если meta не пустой, парсим её, иначе оставляем null
      } catch {                                                                                  // Если парсинг JSON не удался
        metaParsed = row.meta;                                                                   // Сохраняем meta как строку без изменений
      }

      return {                                                                                   // Формируем объект одной операции истории
        amount: row.amount,                                                                      // Сумма операции в баллах (положительная или отрицательная)
        type: row.type,                                                                          // Технический тип операции (registration_signup, registration и т.д.)
        meta: metaParsed,                                                                        // Объект meta с дополнительными данными (например, via: 'signup')
        createdAt: row.created_at                                                                // Дата и время операции
      };
    });

    res.json({                                                                                   // Отправляем успешный ответ клиенту
      history                                                                                    // Массив операций по баллам
    });
  } catch (e) {
    console.error('GET /api/me/points/history error', e);                                        // Логируем ошибку при получении истории
    res.status(500).json({ error: 'internal_error' });                                           // Возвращаем 500 — внутренняя ошибка сервера
  }
});

export default router;