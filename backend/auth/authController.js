require('dotenv').config({ path: '/var/www/serpmonn.ru/.env' }); 					                    // Подключаем dotenv для работы с переменными окружения

import { hash, compare } from 'bcryptjs'; 									                                  // Для хеширования паролей
import paseto from 'paseto'; 									                                                // Для работы с PASETO (токены)
const { V2 } = paseto; 											                                                  // Используем версию 2 PASETO для создания токенов
import { query as _query } from '../database/config'; 								                        // Подключение к базе данных
import { validationResult } from 'express-validator'; 						                            // Для валидации данных, отправленных пользователем

// Функция для регистрации пользователя
const registerUser = async (req, res) => {
  // Проверяем, есть ли ошибки в данных, которые прислал пользователь
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() }); 						                      // Если есть ошибки, отправляем их в ответ
  }

  // Извлекаем данные из тела запроса (пользователь, email, пароль)
  const { username, email, password } = req.body;

  // Хешируем пароль перед его сохранением в базе данных
  const hashedPassword = await hash(password, 10);

  // Строим SQL-запрос для добавления нового пользователя
  const query = 'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)';
  _query(query, [username, email, hashedPassword], async (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Ошибка при сохранении пользователя', err }); 		// В случае ошибки возвращаем сообщение
    }

    const secretKey = process.env.SECRET_KEY;								                                  // Берём секретный ключ для генерации токена из переменных окружения
    const payload = { username, email }; 								                                       // Данные, которые будем передавать в токен

    try {
      // Генерируем PASETO токен с данными пользователя
      const token = await V2.sign(payload, secretKey);

      // Отправляем токен в виде cookie в ответ
      res.cookie('token', token, {
        httpOnly: true, 										// Запрещаем доступ к cookie через JavaScript
        secure: true, 											// cookie будет отправляться только по HTTPS
        sameSite: 'Strict', 										// Устанавливаем строгие правила для использования cookie
        maxAge: 24 * 60 * 60 * 1000, 									// Устанавливаем время жизни cookie на 1 день
      });

      // Отправляем сообщение о успешной регистрации
      res.status(201).json({ message: 'Пользователь успешно зарегистрирован' });
    } catch (error) {
      // Если произошла ошибка при создании токена, отправляем сообщение об ошибке
      res.status(500).json({ message: 'Ошибка при генерации токена', error });
    }
  });
};

// Функция для логина пользователя
const loginUser = async (req, res) => {
  const { email, password } = req.body; 								// Извлекаем email и пароль из запроса

  // Запрос к базе данных для поиска пользователя по email
  const query = 'SELECT * FROM users WHERE email = ?';
  _query(query, [email], async (err, results) => {
    if (err || results.length === 0) {
      return res.status(401).json({ message: 'Неверный email или пароль' }); 				// Если ошибка или пользователь не найден
    }

    // Извлекаем данные пользователя из результата
    const user = results[0];

    // Сравниваем введённый пароль с хешированным паролем в базе данных
    const isMatch = await compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ message: 'Неверный email или пароль' }); 				// Если пароли не совпадают
    }

    // Берём секретный ключ для генерации токена
    const secretKey = process.env.SECRET_KEY;
    const payload = { username: user.username, email: user.email }; 					// Данные, которые будут в токене

    try {
      // Генерируем PASETO токен с данными пользователя
      const token = await V2.sign(payload, secretKey);

      // Отправляем токен в виде cookie в ответ
      res.cookie('token', token, {
        httpOnly: true, 										// Запрещаем доступ к cookie через JavaScript
        secure: true, 											// cookie будет отправляться только по HTTPS
        sameSite: 'Strict', 										// Строгие правила для cookie
        maxAge: 24 * 60 * 60 * 1000, 									// Время жизни cookie 1 день
      });

      // Отправляем сообщение о успешном входе
      res.json({ message: 'Вход выполнен успешно' });
    } catch (error) {
      // В случае ошибки при генерации токена, отправляем сообщение об ошибке
      res.status(500).json({ message: 'Ошибка при генерации токена', error });
    }
  });
};

// Функция для выхода пользователя (удаляем токен)
const logoutUser = (req, res) => {
  // Очищаем cookie с токеном
  res.clearCookie('token', {
    httpOnly: true, 											// Запрещаем доступ к cookie через JavaScript
    secure: true,   											// cookie будет удаляться только по HTTPS
    sameSite: 'Strict',											// Строгие правила для cookie
  });

  // Отправляем сообщение о выходе
  res.json({ message: 'Выход выполнен успешно' });
};

// Экспортируем функции для использования в других частях приложения
export default {
  registerUser,
  loginUser,
  logoutUser,
};

