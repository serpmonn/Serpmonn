import bcrypt from 'bcryptjs';                                                                                                         // Импортируем bcrypt для хеширования паролей
import crypto from 'crypto';                                                                                                           // Импортируем crypto для генерации случайных токенов
import { sendResetEmail } from '../../utils/mailer.mjs';                                                                               // Импортируем функцию для отправки письма сброса пароля
import { saveToken, getTokenData, removeToken, canSendToken } from '../../utils/tokenStore.js';                                        // Импортируем функции для работы с токенами
import { query } from '../../database/config.mjs';                                                                                     // Импортируем функцию для выполнения запросов к базе данных

// Контроллер для обработки запроса сброса пароля
export const forgotPassword = async (req, res) => {											// Определяем функцию для запроса сброса пароля
    const { email } = req.body;														// Извлекаем email из тела запроса

    try {                                                                                                                       // Начинаем блок обработки ошибок
        const users = await query('SELECT id FROM users WHERE email = ?', [email]);                                             // Выполняем запрос к БД для поиска пользователя по email
        if (users.length === 0) {                                                                                               // Проверяем, найден ли пользователь
            return res.status(200).json({ message: 'Проверьте почту — если адрес зарегистрирован, вы получите письмо со ссылкой.' }); // Возвращаем общий ответ, чтобы не раскрывать наличие email
        }                                                                                                                      

        const user = users[0];                                                                                                  // Получаем данные первого найденного пользователя

        if (!canSendToken(user.id)) {                                                                                           // Проверяем, можно ли отправить новый токен
            return res.status(429).json({ message: 'Слишком частые запросы. Попробуйте через несколько минут.' });               // Возвращаем ошибку при превышении лимита запросов
        }                                                                                                                      

        const token = crypto.randomBytes(32).toString('hex');                                                                   // Генерируем случайный токен для сброса пароля
        saveToken(token, user.id);                                                                                              // Сохраняем токен в хранилище, связывая его с ID пользователя

        const resetLink = `https://serpmonn.ru/frontend/login/forgot/reset/reset.html?token=${token}`;                          // Формируем ссылку для сброса пароля
        await sendResetEmail(email, resetLink);                                                                                 // Отправляем письмо с ссылкой для сброса пароля

        res.status(200).json({ message: 'Ссылка для сброса пароля отправлена на почту.' });                                     // Возвращаем успешный ответ клиенту
    } catch (err) {                                                                                                             // Обрабатываем возможные ошибки
        console.error('Ошибка при отправке ссылки сброса:', err);                                                               // Логируем ошибку в консоль
        res.status(500).json({ message: 'Ошибка сервера' });                                                                    // Возвращаем ошибку сервера клиенту
    }                                                                                                                      
};

// Контроллер для выполнения сброса пароля
export const resetPassword = async (req, res) => {                                                                              // Определяем функцию для выполнения сброса пароля
    const { token, newPassword } = req.body;                                                                                    // Извлекаем токен и новый пароль из тела запроса

    try {                                                                                                                       // Начинаем блок обработки ошибок
        const userId = getTokenData(token);                                                                                     // Проверяем токен и получаем ID пользователя
        if (!userId) return res.status(400).json({ message: 'Ссылка недействительна или устарела.' });                          // Возвращаем ошибку, если токен недействителен

        const passwordHash = await bcrypt.hash(newPassword, 10);                                                                // Хешируем новый пароль с использованием bcrypt
        await query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);                                 // Обновляем пароль пользователя в базе данных

        removeToken(token);                                                                                                     // Удаляем использованный токен из хранилища
        res.status(200).json({ message: 'Пароль успешно обновлён.' });                                                          // Возвращаем успешный ответ клиенту
    } catch (err) {                                                                                                             // Обрабатываем возможные ошибки
        console.error('Ошибка сброса пароля:', err);                                                                            // Логируем ошибку в консоль
        res.status(500).json({ message: 'Ошибка сервера' });                                                                    // Возвращаем ошибку сервера клиенту
    }                                                                                                                      
};
