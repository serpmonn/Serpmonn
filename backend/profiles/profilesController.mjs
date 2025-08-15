import dotenv from 'dotenv';                                                                                                    // Импортируем dotenv для работы с .env файлом
dotenv.config({ path: '/var/www/serpmonn.ru/.env' });                                                                           // Настраиваем путь к файлу .env

import { query } from '../database/config.mjs';                                                                                 // Импортируем функцию для выполнения запросов к БД
import paseto from 'paseto';                                                                                                    // Импортируем библиотеку paseto для работы с токенами
const { V2 } = paseto;                                                                                                          // Извлекаем модуль V2 из paseto
const secretKey = process.env.SECRET_KEY;                                                                                       // Получаем секретный ключ из переменной окружения

// Контроллер для получения профиля пользователя
const getUserProfile = async (req, res) => {                                                                                    // Определяем функцию для получения профиля
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');                                                   // Устанавливаем заголовки для отключения кэширования
    try {                                                                                                                       // Начинаем блок обработки ошибок
        const { email } = req.user;                                                                                             // Извлекаем email из объекта пользователя в запросе
        console.log('Email пользователя из токена (getUserProfile):', email);                                                   // Логируем email пользователя для отладки
        const queryText = 'SELECT username, email, confirmed, mailbox_created FROM users WHERE email = ?';                      // Определяем SQL-запрос для получения данных пользователя
        const result = await query(queryText, [email]);                                                                         // Выполняем запрос к БД с email
        console.log('Результат запроса к БД (getUserProfile):', result);                                                        // Логируем результат запроса для отладки

        if (!result || result.length === 0) {                                                                                   // Проверяем, получены ли данные пользователя
            return res.status(404).json({ message: 'Пользователь не найден' });                                                 // Возвращаем ошибку, если пользователь не найден
        }                                                                                                                      

        const user = result[0];                                                                                                 // Извлекаем данные первого пользователя из результата
        if (!user.confirmed) {                                                                                                  // Проверяем, подтвержден ли аккаунт
            return res.status(403).json({ message: 'Подтвердите ваш аккаунт перед регистрацией почтового ящика' });             // Возвращаем ошибку, если аккаунт не подтвержден
        }                                                                                                                      
        if (user.mailbox_created) {                                                                                             // Проверяем, создан ли почтовый ящик
            return res.status(403).json({ message: 'Вы уже создали почтовый ящик' });                                           // Возвращаем ошибку, если ящик уже создан
        }                                                                                                                      

        res.json(user);                                                                                                         // Возвращаем данные пользователя клиенту
    } catch (err) {                                                                                                             // Обрабатываем возможные ошибки
        console.error('Ошибка при получении данных профиля:', err);                                                             // Логируем ошибку в консоль
        res.status(401).json({ message: 'Недействительный токен или ошибка авторизации' });                                     // Возвращаем ошибку авторизации клиенту
    }                                                                                                                      
};

// Контроллер для получения информации о пользователе
const getUserInfo = async (req, res) => {                                                                                       // Определяем функцию для получения информации
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');                                                   // Устанавливаем заголовки для отключения кэширования
    try {                                                                                                                       // Начинаем блок обработки ошибок
        const { email } = req.user;                                                                                             // Извлекаем email из объекта пользователя в запросе
        console.log('Email пользователя из токена (getUserInfo):', email);                                                      // Логируем email пользователя для отладки
        const queryText = 'SELECT username, email, confirmed, mailbox_created FROM users WHERE email = ?';                      // Определяем SQL-запрос для получения данных пользователя
        const result = await query(queryText, [email]);                                                                         // Выполняем запрос к БД с email
        console.log('Результат запроса к БД (getUserInfo):', result);                                                           // Логируем результат запроса для отладки

        if (!result || result.length === 0) {                                                                                   // Проверяем, получены ли данные пользователя
            return res.status(404).json({ message: 'Пользователь не найден' });                                                 // Возвращаем ошибку, если пользователь не найден
        }                                                                                                                      

        const user = result[0];                                                                                                 // Извлекаем данные первого пользователя из результата
        res.json({ username: user.username, email: user.email, confirmed: user.confirmed, mailbox_created: user.mailbox_created }); // Возвращаем данные пользователя в структурированном виде
    } catch (err) {                                                                                                             // Обрабатываем возможные ошибки
        console.error('Ошибка при получении данных профиля:', err);                                                             // Логируем ошибку в консоль
        res.status(401).json({ message: 'Недействительный токен или ошибка авторизации' });                                     // Возвращаем ошибку авторизации клиенту
    }                                                                                                                      
};

// Контроллер для обновления профиля пользователя
const updateUserProfile = async (req, res) => {                                                                                 // Определяем функцию для обновления профиля
    const { email: oldEmail, username: oldUsername } = req.user;                                                                // Извлекаем старый email и username из токена
    const { username, email } = req.body;                                                                                       // Извлекаем новые username и email из тела запроса
    console.log('Полученные данные:', req.body);                                                                                // Логируем тело запроса для отладки
    console.log('Email пользователя из токена:', email);                                                                        // Логируем email из токена для отладки
    console.log('Username пользователя из токена:', oldUsername);                                                               // Логируем username из токена для отладки

    if (!email || !username) {                                                                                                  // Проверяем, предоставлены ли email и username
        return res.status(400).json({ message: 'Email и username обязательны' });                                               // Возвращаем ошибку, если данные отсутствуют
    }                                                                                                                      

    try {                                                                                                                       // Начинаем блок обработки ошибок
        const queryText = 'UPDATE users SET username = ?, email = ? WHERE email = ?';                                           // Определяем SQL-запрос для обновления данных
        const result = await query(queryText, [username, email, oldEmail]);                                                     // Выполняем запрос к БД для обновления
        console.log('Результат обновления:', result);                                                                           // Логируем результат обновления для отладки

        if (oldEmail !== email || oldUsername !== username) {                                                                   // Проверяем, изменились ли email или username
            res.clearCookie('token');                                                                                           // Очищаем старый токен в куки
            const newToken = await V2.sign({ username, email }, secretKey);                                                     // Создаем новый токен с обновленными данными
            res.cookie('token', newToken, { httpOnly: true, secure: true });                                                    // Устанавливаем новый токен в куки
            return res.json({ message: 'Профиль обновлен, новый токен создан', token: newToken });                              // Возвращаем ответ с новым токеном
        }                                                                                                                      

        res.json({ message: 'Профиль обновлен успешно' });                                                                      // Возвращаем успешный ответ без нового токена
    } catch (err) {                                                                                                             // Обрабатываем возможные ошибки
        console.error('Ошибка при обновлении профиля:', err);                                                                   // Логируем ошибку в консоль
        res.status(500).json({ message: 'Ошибка при обновлении профиля', error: err });                                         // Возвращаем ошибку сервера клиенту
    }                                                                                                                      
};

export { getUserProfile, getUserInfo, updateUserProfile };                                                                       // Экспортируем функции контроллеров