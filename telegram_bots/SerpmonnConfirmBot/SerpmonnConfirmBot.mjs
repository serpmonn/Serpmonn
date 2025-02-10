import dotenv from 'dotenv';
dotenv.config({ path: '/var/www/serpmonn.ru/.env' });

import { query } from '../../backend/database/config.mjs';  							// Импортируем функцию query для выполнения SQL-запросов
import TelegramBot from 'node-telegram-bot-api';
import fs from 'fs';

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// Функция для получения временных данных регистрации
function getTempRegistrationData(userId) {
    try {
        const tempData = JSON.parse(fs.readFileSync('/var/www/serpmonn.ru/backend/auth/tempUserData.json', 'utf-8') || '{}');
        return tempData[userId];
    } catch (error) {
        console.error('Ошибка при получении временных данных:', error);
        return null;
    }
}

// Функция для удаления временных данных после завершения регистрации
function deleteTempRegistrationData(userId) {
    try {
        const tempData = JSON.parse(fs.readFileSync('/var/www/serpmonn.ru/backend/auth/tempUserData.json', 'utf-8') || '{}');
        delete tempData[userId];
        fs.writeFileSync('tempUserData.json', JSON.stringify(tempData));
    } catch (error) {
        console.error('Ошибка при удалении временных данных:', error);
    }
}

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text.startsWith('/start ')) {
        const userId = text.split(' ')[1]; 									// Получаем userId из диплинка
	console.log("User ID:", userId);  									// Логируем userId
        // Проверяем, нет ли уже этого пользователя в БД
        const [existingUser] = await query("SELECT id FROM users WHERE id = ?", [userId]);

        if (existingUser && existingUser.length > 0) {
            bot.sendMessage(chatId, "Вы уже зарегистрированы!");
            return;
        }

        const tempData = await getTempRegistrationData(userId); 						// Тут можно хранить временные данные о регистрации (например, email, пароль)

        if (!tempData) {
            bot.sendMessage(chatId, "Ошибка: регистрационные данные не найдены.");
            return;
        }

        // Сохраняем в БД
        await query("INSERT INTO users (id, username, email, password_hash, confirmed) VALUES (?, ?, ?, ?, ?)", 
            [userId, tempData.username, tempData.email, tempData.passwordHash, true]);

        deleteTempRegistrationData(userId);									// Удаляем временные данные после успешной регистрации

        bot.sendMessage(chatId, "Вы успешно подтвердили регистрацию! Теперь можете войти в аккаунт.");
    }
});
