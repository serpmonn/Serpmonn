import dotenv from 'dotenv';                                                                                                    // Импортируем dotenv для работы с .env файлом
dotenv.config({ path: '/var/www/serpmonn.ru/.env' });                                                                           // Настраиваем путь к файлу .env

import fetch from 'node-fetch';                                                                                                 // Импортируем fetch для HTTP-запросов
import Tokens from 'csrf';                                                                                                      // Импортируем библиотеку для работы с CSRF-токенами
import { query } from '../../database/config.mjs';                                                                              // Импортируем функцию для выполнения запросов к БД

const csrf = new Tokens();                                                                                                      // Создаем экземпляр CSRF для генерации токенов

// Контроллер для получения CSRF-токена
export const getCsrfToken = (req, res) => {                                                                                     // Определяем функцию для получения CSRF-токена
    const csrfToken = csrf.create(process.env.CSRF_SECRET || 'default-secret');                                                 // Генерируем CSRF-токен
    res.json({ csrfToken });                                                                                                    // Возвращаем CSRF-токен клиенту
};

// Контроллер для регистрации почтового ящика
export const createMailbox = async (req, res) => {                                                                            // Определяем функцию для регистрации почтового ящика
    try {                                                                                                                       // Начинаем блок обработки ошибок
        const { username, emailLocalPart, password } = req.body;                                                                // Извлекаем данные из тела запроса
        const userEmail = req.user.email;                                                                                       // Получаем email пользователя из токена

        // Проверка CSRF-токена
        const csrfToken = req.headers['x-csrf-token'];                                                                          // Извлекаем CSRF-токен из заголовков
        if (!csrfToken || !csrf.verify(process.env.CSRF_SECRET || 'default-secret', csrfToken)) {                               // Проверяем валидность CSRF-токена
            return res.status(403).json({ message: 'Недействительный CSRF-токен' });                                            // Возвращаем ошибку при недействительном CSRF-токене
        }                                                                                                                      

        // Проверка, подтверждён ли пользователь
        const [user] = await query('SELECT confirmed, mailbox_created FROM users WHERE email = ?', [userEmail]);                // Выполняем запрос к БД для проверки пользователя
        if (!user) {                                                                                                            // Проверяем, найден ли пользователь
            return res.status(404).json({ message: 'Пользователь не найден' });                                                 // Возвращаем ошибку, если пользователь не найден
        }                                                                                                                      
        if (!user.confirmed) {                                                                                                  // Проверяем, подтвержден ли аккаунт
            return res.status(403).json({ message: 'Подтвердите ваш аккаунт перед регистрацией почтового ящика' });              // Возвращаем ошибку, если аккаунт не подтвержден
        }                                                                                                                      
        if (user.mailbox_created) {                                                                                             // Проверяем, создан ли почтовый ящик
            return res.status(403).json({ message: 'Вы уже создали почтовый ящик' });                                           // Возвращаем ошибку, если ящик уже создан
        }                                                                                                                      

        // Валидация
        if (!username || !emailLocalPart || !password) {                                                                        // Проверяем, предоставлены ли все обязательные поля
            return res.status(400).json({ message: 'Все поля обязательны для заполнения' });                                    // Возвращаем ошибку, если поля отсутствуют
        }                                                                                                                      
        if (!/^[a-z0-9._%+-]+$/.test(emailLocalPart)) {                                                                         // Проверяем формат локальной части email
            return res.status(400).json({ message: 'Логин может содержать только латинские буквы, цифры и символы ._%+-' });    // Возвращаем ошибку при неверном формате
        }                                                                                                                      
        if (password.length < 8) {                                                                                              // Проверяем длину пароля
            return res.status(400).json({ message: 'Пароль должен содержать минимум 8 символов' });                             // Возвращаем ошибку, если пароль слишком короткий
        }                                                                                                                      

        // Создание почтового ящика в Mailcow
        const mailboxData = {                                                                                                   // Формируем данные для создания почтового ящика
            active: "1",                                                                                                        // Указываем, что ящик активен
            domain: "onnmail.ru",                                                                                               // Указываем домен почтового ящика
            local_part: emailLocalPart,                                                                                         // Указываем локальную часть email
            name: username,                                                                                                     // Указываем имя пользователя
            password: password,                                                                                                 // Указываем пароль
            password2: password,                                                                                                // Подтверждаем пароль
            quota: "1024"                                                                                                       // Устанавливаем квоту в 1024 МБ
        };                                                                                                                     

        const mailcowResponse = await fetch('https://mail.serpmonn.ru/api/v1/add/mailbox', {                                    // Отправляем запрос к API Mailcow
            method: 'POST',                                                                                                     // Указываем метод POST
            headers: {                                                                                                          // Устанавливаем заголовки запроса
                'Content-Type': 'application/json',                                                                             // Указываем тип содержимого
                'X-API-Key': process.env.MAILCOW_API_KEY                                                                        // Передаем API-ключ Mailcow
            },                                                                                                                 
            body: JSON.stringify(mailboxData)                                                                                   // Передаем данные в формате JSON
        });                                                                                                                    

        if (!mailcowResponse.ok) {                                                                                              // Проверяем успешность ответа от Mailcow
            const error = await mailcowResponse.json();                                                                         // Получаем данные об ошибке
            throw new Error(error.msg || 'Ошибка при создании почтового ящика');                                                // Выбрасываем ошибку с сообщением
        }                                                                                                                      

        // Обновляем флаг mailbox_created
        await query('UPDATE users SET mailbox_created = ? WHERE email = ?', [1, userEmail]);                                    // Обновляем флаг mailbox_created в БД

        res.status(201).json({ success: true });                                                                                // Возвращаем успешный ответ клиенту
    } catch (error) {                                                                                                           // Обрабатываем возможные ошибки
        console.error('Ошибка регистрации:', error);                                                                            // Логируем ошибку в консоль
        res.status(400).json({                                                                                                  // Возвращаем ошибку клиенту
            message: error.message.includes('already exists')                                                                   // Проверяем, существует ли ящик
                ? 'Почтовый ящик уже существует'                                                                                // Возвращаем сообщение, если ящик существует
                : error.message                                                                                                 // Возвращаем общее сообщение об ошибке
        });                                                                                                                   
    }                                                                                                                      
};