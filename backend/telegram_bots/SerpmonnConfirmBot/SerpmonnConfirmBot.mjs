import dotenv from 'dotenv';
dotenv.config({ path: '/var/www/serpmonn.ru/.env' });

import { query } from '../../database/config.mjs';                                                      		                // Импортируем функцию query для выполнения SQL-запросов
import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs/promises';

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

async function getTempRegistrationData(userId) {                                                                                        // Функция для получения временных данных регистрации
    try {
        const tempData = JSON.parse(await fs.readFile('/var/www/serpmonn.ru/backend/auth/tempUserData.json', 'utf-8') || '{}');
        return tempData[userId];
    } catch (error) {
        console.error('Ошибка при получении временных данных:', error);
        return null;
    }
}

async function deleteTempRegistrationData(userId) {                                                                                     // Функция для удаления временных данных после завершения регистрации
    try {
        const tempData = JSON.parse(await fs.readFile('/var/www/serpmonn.ru/backend/auth/tempUserData.json', 'utf-8') || '{}');
        delete tempData[userId];
        await fs.writeFile('/var/www/serpmonn.ru/backend/auth/tempUserData.json', JSON.stringify(tempData));
    } catch (error) {
        console.error('Ошибка при удалении временных данных:', error);
    }
}

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text.startsWith('/start ')) {
        const userId = text.split(' ')[1];                                                                      		                // Получаем userId из диплинка
        console.log("User ID:", userId);                                                                        		                // Логируем userId

        const [existingUser] = await query("SELECT id FROM users WHERE id = ?", [userId]);					                            // Проверяем, нет ли уже этого пользователя в БД
	
	if (existingUser) {
            bot.sendMessage(chatId, "Вы уже зарегистрированы!");
            return;
        }

        const tempData = await getTempRegistrationData(userId);                                                 		                // Тут можно хранить временные данные о регистрации (например, email, пароль)

        if (!tempData) {
            bot.sendMessage(chatId, "Ошибка: регистрационные данные не найдены.");
            return;
        }

        await query("INSERT INTO users (id, username, email, password_hash, confirmed) VALUES (?, ?, ?, ?, ?)",	 		                // Сохраняем в БД
            [userId, tempData.username, tempData.email, tempData.passwordHash, true]);

        deleteTempRegistrationData(userId);                                                                     		                // Удаляем временные данные после успешной регистрации

        const loginButton = {													                                                        // Создаем кнопку с URL, ведущую на страницу логина
            reply_markup: {
                inline_keyboard: [
                    [
                        { text: 'Перейти к входу', url: 'https://serpmonn.ru/frontend/login/login.html' }  			                    // Ссылка на страницу логина
                    ]
                ]
            }
        };

        bot.sendMessage(chatId, "Вы успешно подтвердили регистрацию! Теперь можете войти в аккаунт.", loginButton);
    }
});
