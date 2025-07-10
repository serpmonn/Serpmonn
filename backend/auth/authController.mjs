import dotenv from 'dotenv';                                                                 // Импортируем dotenv для работы с .env файлом
dotenv.config({ path: '/var/www/serpmonn.ru/.env' });                                           // Настраиваем путь к файлу .env
                                                                                              
import bcrypt from 'bcryptjs';                                                                // Импортируем bcrypt для хеширования паролей
import paseto from 'paseto';                                                                  // Импортируем paseto для создания токенов
import { query } from '../database/config.mjs';                                               // Импортируем функцию query для работы с БД
import { validationResult } from 'express-validator';                                         // Импортируем validationResult для проверки данных
import { v4 as uuidv4 } from 'uuid';                                                         // Импортируем uuidv4 для генерации уникальных ID
import { sendConfirmationEmail } from '../utils/mailer.mjs';                                 // Импортируем функцию для отправки email
                                                                                              
const { V2 } = paseto;                                                                         // Извлекаем V2 из paseto для работы с токенами
const { hash, compare } = bcrypt;                                                              // Извлекаем hash и compare из bcrypt
const secretKey = process.env.SECRET_KEY;                                                     // Получаем секретный ключ из переменных окружения
                                                                                              
export const registerUser = async (req, res) => {                                             // Определяем функцию для регистрации пользователя
  const errors = validationResult(req);                                                        // Проверяем данные запроса на ошибки
  if (!errors.isEmpty()) {                                                                     // Проверяем, есть ли ошибки валидации
    return res.status(400).json({ errors: errors.array() });                                    // Возвращаем ошибки в формате JSON
  }                                                                                            
                                                                                              
  const { username, email, password } = req.body;                                              // Извлекаем данные из тела запроса
                                                                                              
  try {                                                                                        // Начинаем блок обработки ошибок
    const [usernameExists] = await query("SELECT id FROM users WHERE username = ?", [username]); // Проверяем, занят ли username
    if (usernameExists && usernameExists.id) {                                                 // Проверяем, существует ли пользователь
      return res.status(400).json({ message: "Имя пользователя уже используется!" });          // Возвращаем ошибку
    }                                                                                         
                                                                                              
    const [emailExists] = await query("SELECT id FROM users WHERE email = ?", [email]);       // Проверяем, занят ли email
    if (emailExists && emailExists.id) {                                                      // Проверяем, существует ли email
      return res.status(400).json({ message: "Email уже используется!" });                    // Возвращаем ошибку
    }                                                                                         
                                                                                              
    const passwordHash = await hash(password, 10);                                            // Хешируем пароль с солью (10 раундов)
    const userId = uuidv4();                                                                  // Генерируем уникальный ID пользователя
    const telegramConfirmLink = `https://t.me/SerpmonnConfirmBot?start=${userId}`;            // Формируем ссылку для подтверждения
                                                                                              
    await query(                                                                              // Выполняем запрос на вставку пользователя
      "INSERT INTO users (id, username, email, password_hash, confirmed) VALUES (?, ?, ?, ?, ?)", // SQL-запрос для вставки
      [userId, username, email, passwordHash, false]                                           // Передаем данные в запрос
    );                                                                                        
                                                                                              
    res.status(200).json({                                                                    // Отправляем успешный ответ клиенту
      success: true,                                                                          // Указываем успешность операции
      message: "Регистрация успешна! Выберите способ подтверждения.",                         // Сообщение для пользователя
      userId: userId,                                                                         // Передаем ID пользователя
      confirmLink: telegramConfirmLink                                                        // Передаем ссылку для подтверждения
    });                                                                                       
  } catch (error) {                                                                           // Обрабатываем возможные ошибки
    console.error("Ошибка регистрации:", error);                                              // Логируем ошибку в консоль
    res.status(500).json({ message: "Ошибка сервера." });                                    // Возвращаем ошибку сервера клиенту
  }                                                                                         
};                                                                                           
                                                                                              
export const confirmEmail = async (req, res) => {                                             // Определяем функцию для подтверждения email
  const { email, userId } = req.body;                                                        // Извлекаем email и userId из тела запроса
                                                                                              
  try {                                                                                       // Начинаем блок обработки ошибок
    const [user] = await query("SELECT id FROM users WHERE id = ? AND email = ?", [userId, email]); // Проверяем пользователя
    if (!user) {                                                                              // Проверяем, найден ли пользователь
      return res.status(404).json({ message: "Пользователь не найден." });                     // Возвращаем ошибку
    }                                                                                         
                                                                                              
    const confirmationToken = uuidv4();                                                       // Генерируем токен подтверждения
    const tokenExpires = new Date(Date.now() + 3600000);                                      // Устанавливаем срок действия токена (1 час)
                                                                                              
    await query(                                                                              // Выполняем запрос на обновление пользователя
      "UPDATE users SET confirmation_token = ?, confirmation_token_expires = ? WHERE id = ?", // SQL-запрос для обновления
      [confirmationToken, tokenExpires, userId]                                               // Передаем данные в запрос
    );                                                                                        
                                                                                              
    const confirmLink = `https://www.serpmonn.ru/auth/confirm?token=${confirmationToken}`;    // Формируем ссылку подтверждения
    await sendConfirmationEmail(email, confirmLink);                                          // Отправляем письмо с подтверждением
                                                                                              
    res.json({ success: true, message: "Письмо с подтверждением отправлено." });              // Отправляем успешный ответ клиенту
  } catch (error) {                                                                           // Обрабатываем возможные ошибки
    console.error("Ошибка отправки email:", error);                                            // Логируем ошибку в консоль
    res.status(500).json({ message: "Ошибка сервера." });                                    // Возвращаем ошибку сервера клиенту
  }                                                                                         
};                                                                                           
                                                                                              
export const confirmToken = async (req, res) => {                                             // Определяем функцию для проверки токена
  const { token } = req.query;                                                               // Извлекаем токен из параметров запроса
                                                                                              
  try {                                                                                       // Начинаем блок обработки ошибок
    const [user] = await query(                                                               // Выполняем запрос на поиск пользователя
      "SELECT id, email, username FROM users WHERE confirmation_token = ? AND confirmation_token_expires > ?", // SQL-запрос
      [token, new Date()]                                                                     // Передаем токен и текущую дату
    );                                                                                        
                                                                                              
    if (!user) {                                                                              // Проверяем, найден ли пользователь
      return res.status(400).json({ message: "Недействительный или истёкший токен." });       // Возвращаем ошибку
    }                                                                                         
                                                                                              
    await query(                                                                              // Выполняем запрос на обновление статуса
      "UPDATE users SET confirmed = ?, confirmation_token = NULL, confirmation_token_expires = NULL WHERE id = ?", // SQL-запрос
      [true, user.id]                                                                         // Устанавливаем confirmed и сбрасываем токен
    );                                                                                        
                                                                                              
    const payload = { email: user.email, username: user.username || user.email };             // Формируем данные для токена
    const authToken = await V2.sign(payload, secretKey);                                      // Создаем авторизационный токен
                                                                                              
    res.cookie('token', authToken, {                                                         // Устанавливаем cookie с токеном
      httpOnly: true,                                                                        // Защищаем cookie от доступа через JS
      secure: true,                                                                          // Устанавливаем только для HTTPS
      sameSite: 'Lax',                                                                       // Устанавливаем политику SameSite
      maxAge: 30 * 24 * 60 * 60 * 1000                                                      // Устанавливаем срок действия (30 дней)
    });                                                                                       
                                                                                              
    console.log('Подтверждение: пользователь', user.email, 'confirmed = 1, токен создан');    // Логируем подтверждение
    res.redirect('https://www.serpmonn.ru/frontend/profile/profile.html');                    // Переадресуем на страницу профиля
  } catch (error) {                                                                           // Обрабатываем возможные ошибки
    console.error("Ошибка подтверждения:", error);                                             // Логируем ошибку в консоль
    res.status(500).json({ message: "Ошибка сервера." });                                    // Возвращаем ошибку сервера клиенту
  }                                                                                         
};                                                                                           
                                                                                              
export const loginUser = async (req, res) => {                                                // Определяем функцию для входа пользователя
  const { email, password } = req.body;                                                      // Извлекаем email и пароль из тела запроса
                                                                                              
  const queryStr = 'SELECT * FROM users WHERE email = ?';                                     // Задаем SQL-запрос для поиска пользователя
  try {                                                                                       // Начинаем блок обработки ошибок
    const results = await query(queryStr, [email]);                                           // Выполняем запрос к базе данных
    if (results.length === 0) {                                                               // Проверяем, найден ли пользователь
      return res.status(401).json({ message: 'Неверный email или пароль' });                  // Возвращаем ошибку
    }                                                                                         
                                                                                              
    const user = results[0];                                                                  // Извлекаем первого найденного пользователя
    const isMatch = await compare(password, user.password_hash);                              // Сравниваем введенный пароль с хешем
    if (!isMatch) {                                                                           // Проверяем, совпадает ли пароль
      return res.status(401).json({ message: 'Неверный email или пароль' });                  // Возвращаем ошибку
    }                                                                                         
                                                                                              
    const payload = { username: user.username, email: user.email };                           // Формируем данные для токена
    const token = await V2.sign(payload, secretKey);                                          // Создаем авторизационный токен
                                                                                              
    res.cookie('token', token, {                                                              // Устанавливаем cookie с токеном
      httpOnly: true,                                                                        // Защищаем cookie от доступа через JS
      secure: true,                                                                          // Устанавливаем только для HTTPS
      sameSite: 'Strict',                                                                    // Устанавливаем строгую политику SameSite
      maxAge: 24 * 60 * 60 * 1000                                                           // Устанавливаем срок действия (1 день)
    });                                                                                       
                                                                                              
    res.json({ message: 'Вход выполнен успешно' });                                           // Отправляем успешный ответ клиенту
  } catch (error) {                                                                           // Обрабатываем возможные ошибки
    res.status(500).json({ message: 'Ошибка при выполнении запроса', error });               // Возвращаем ошибку сервера
  }                                                                                         
};                                                                                           
                                                                                              
export const logoutUser = (req, res) => {                                                    // Определяем функцию для выхода пользователя
  res.clearCookie('token', {                                                                 // Удаляем cookie с токеном
    httpOnly: true,                                                                          // Защищаем cookie от доступа через JS
    secure: true,                                                                            // Устанавливаем только для HTTPS
    sameSite: 'Strict'                                                                       // Устанавливаем строгую политику SameSite
  });                                                                                       
  res.json({ message: 'Выход выполнен успешно' });                                           // Отправляем успешный ответ клиенту
};                                                                                           
                                                                                              
export default { registerUser, confirmEmail, confirmToken, loginUser, logoutUser };          // Экспортируем все функции