import dotenv from 'dotenv';                                                                  // Подключаем dotenv для работы с переменными окружени
dotenv.config({ path: '/var/www/serpmonn.ru/.env' });

import bcrypt from 'bcryptjs';                                                                // Для CommonJS модуля
import paseto from 'paseto'; 									                                                // Для работы с PASETO (токены)
import { query } from '../database/config.mjs';                                                // Импортируем функцию query
import { validationResult } from 'express-validator'; 						                            // Для валидации данных, отправленных пользователем

const { V2 } = paseto; 											                                                  // Используем версию 2 PASETO для создания токенов
const { hash, compare } = bcrypt;

export const registerUser = async (req, res) => {                                             // Функция для регистрации пользователя
  const errors = validationResult(req);                                                       // Проверяем, есть ли ошибки в данных, которые прислал пользователь
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() }); 						                      // Если есть ошибки, отправляем их в ответ
  }

  const { username, email, password } = req.body;                                             // Извлекаем данные из тела запроса (пользователь, email, пароль)

  const hashedPassword = await hash(password, 10);                                            // Хешируем пароль перед его сохранением в базе данных

  const queryStr = 'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)';     // Строим SQL-запрос для добавления нового пользователя
  try {
    await query(queryStr, [username, email, hashedPassword]);                                 // Выполняем SQL-запрос через функцию query

    const secretKey = process.env.SECRET_KEY;								                                  // Берём секретный ключ для генерации токена из переменных окружения
    const payload = { username, email }; 								                                      // Данные, которые будем передавать в токен

    try {
      const token = await V2.sign(payload, secretKey);                                        // Генерируем PASETO токен с данными пользователя

      res.cookie('token', token, {                                                            // Отправляем токен в виде cookie в ответ
        httpOnly: true, 										                                                  // Запрещаем доступ к cookie через JavaScript
        secure: true, 											                                                  // cookie будет отправляться только по HTTPS
        sameSite: 'Strict', 										                                              // Устанавливаем строгие правила для использования cookie
        maxAge: 24 * 60 * 60 * 1000, 									                                        // Устанавливаем время жизни cookie на 1 день
      });

      res.status(201).json({ message: 'Пользователь успешно зарегистрирован' });              // Отправляем сообщение о успешной регистрации
    } catch (error) {
      res.status(500).json({ message: 'Ошибка при генерации токена', error });                // Если произошла ошибка при создании токена, отправляем сообщение об ошибке
    }
  } catch (err) {
    res.status(500).json({ message: 'Ошибка при сохранении пользователя', err });             // Ошибка при сохранении пользователя в базе данных
  }
};

export const loginUser = async (req, res) => {                                                // Функция для логина пользователя
  const { email, password } = req.body; 								                                      // Извлекаем email и пароль из запроса

  const queryStr = 'SELECT * FROM users WHERE email = ?';                                     // Строим запрос для поиска пользователя по email
  try {
    const results = await query(queryStr, [email]);                                           // Выполняем запрос
    if (results.length === 0) {                                                               // Если пользователь не найден
      return res.status(401).json({ message: 'Неверный email или пароль' });                  // Возвращаем ошибку
    }

    const user = results[0];                                                                  // Извлекаем данные пользователя из результата

    const isMatch = await compare(password, user.password_hash);                              // Сравниваем введённый пароль с хешированным паролем в базе данных

    if (!isMatch) {
      return res.status(401).json({ message: 'Неверный email или пароль' }); 				          // Если пароли не совпадают
    }

    const secretKey = process.env.SECRET_KEY;                                                 // Берём секретный ключ для генерации токена
    const payload = { username: user.username, email: user.email }; 					                // Данные, которые будут в токене

    try {
      const token = await V2.sign(payload, secretKey);                                        // Генерируем PASETO токен с данными пользователя

      res.cookie('token', token, {                                                            // Отправляем токен в виде cookie в ответ
        httpOnly: true, 										                                                  // Запрещаем доступ к cookie через JavaScript
        secure: true, 											                                                  // cookie будет отправляться только по HTTPS
        sameSite: 'Strict', 										                                              // Строгие правила для cookie
        maxAge: 24 * 60 * 60 * 1000, 									                                        // Время жизни cookie 1 день
      });

      res.json({ message: 'Вход выполнен успешно' });                                         // Отправляем сообщение о успешном входе
    } catch (error) {
      res.status(500).json({ message: 'Ошибка при генерации токена', error });                // В случае ошибки при генерации токена, отправляем сообщение об ошибке
    }
  } catch (err) {
    res.status(500).json({ message: 'Ошибка при выполнении запроса', err });                  // Ошибка при выполнении запроса к базе данных
  }
};

export const logoutUser = (req, res) => {                                                     // Функция для выхода пользователя (удаляем токен)
  res.clearCookie('token', {                                                                  // Очищаем cookie с токеном
    httpOnly: true, 											                                                    // Запрещаем доступ к cookie через JavaScript
    secure: true,   											                                                    // cookie будет удаляться только по HTTPS
    sameSite: 'Strict',											                                                  // Строгие правила для cookie
  });

  res.json({ message: 'Выход выполнен успешно' });                                            // Отправляем сообщение о выходе
};

export default {                                                                              // Экспортируем функции для использования в других частях приложения
  registerUser,
  loginUser,
  logoutUser,
};

