import express from 'express';
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import fs from 'fs';
import fetch from "node-fetch";
import { body } from 'express-validator';
import { registerUser, loginUser, logoutUser } from './authController.mjs';                         // Контроллеры (сделано через деструктуризацию)
import verifyToken from './verifyToken.mjs';
import { query } from '../database/config.mjs';  // Импортируем query

const router = express.Router();                                                                    // Создаём новый экземпляр маршрутизатора

const TEMP_FILE = '/var/www/serpmonn.ru/backend/auth/tempUserData.json';

// Функция для сохранения временных данных в файл
function saveTempRegistrationData(userId, data) {
    try {
        const tempData = JSON.parse(fs.readFileSync(TEMP_FILE, 'utf-8') || '{}');
        tempData[userId] = data;
        fs.writeFileSync(TEMP_FILE, JSON.stringify(tempData));
    } catch (error) {
        console.error('Ошибка при сохранении временных данных:', error);
    }
}

// Регистрация пользователя с проверкой данных
router.post(
  "/register",
  [
    body('username')
      .isLength({ min: 3 }).withMessage('Username должен быть длиной от 3 символов.')
      .isAlphanumeric().withMessage('Username должен содержать только буквы и цифры.'),
    body('email')
      .isEmail().withMessage('Неверный формат email.').normalizeEmail(),
    body('password')
      .isLength({ min: 6 }).withMessage('Пароль должен быть длиной от 6 символов.')
  ],
  async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: "Заполните все поля!" });
    }

    try {
        const [usernameExists] = await query("SELECT id FROM users WHERE username = ?", [username]);

	    if (usernameExists && usernameExists.id) {
	        return res.status(400).json({ message: "Имя пользователя уже используется!" });
	    }

	const [emailExists] = await query("SELECT id FROM users WHERE email = ?", [email]);

	    if (emailExists && emailExists.id) {
	        return res.status(400).json({ message: "Email уже используется!" });
	    }


        const passwordHash = await bcrypt.hash(password, 10);
        const userId = uuidv4(); 								// Уникальный идентификатор пользователя

	// Сохраняем временные данные
    	saveTempRegistrationData(userId, { username, email, passwordHash });
	
	// Отправляем пользователю ссылку на подтверждение
        const telegramConfirmLink = `https://t.me/SerpmonnConfirmBot?start=${userId}`;

         res.status(200).json({ 
            success: true,
            message: "Регистрация успешна! Подтвердите аккаунт через Telegram.",
            userId: userId,
            confirmLink: telegramConfirmLink // Отправляем ссылку на фронт
        });

    } catch (error) {
        console.error("Ошибка регистрации:", error);
        res.status(500).json({ message: "Ошибка сервера." });
    }
  }
);

router.post('/login', loginUser);                                                                   // Маршрут для логина

router.get('/protected', verifyToken, (req, res) => {                                               //Зашишённый маршрут
  res.json({ message: 'Вы получили доступ к защищённому маршруту', user: req.user });
});

router.post('/logout', logoutUser);                                                                 // Маршрут для выхода

router.get("/check-confirmation", async (req, res) => { 					    // Маршрут для проверки подтверждения регистрации
    const { username } = req.query;

    if (!username) {
        return res.status(400).json({ message: "Имя пользователя не указано." });
    }

    try {
        const results = await query("SELECT confirmed FROM users WHERE username = ?", [username]);

        if (results.length === 0) {
            return res.status(404).json({ message: "Пользователь не найден." });
        }

        res.json({ confirmed: results[0].confirmed });

    } catch (error) {
        console.error("Ошибка проверки подтверждения:", error);
        res.status(500).json({ message: "Ошибка сервера." });
    }
});

export default router;
