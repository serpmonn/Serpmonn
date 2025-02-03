import dotenv from 'dotenv';                                                                        // Подключаем dotenv для работы с переменными окружения
dotenv.config({ path: '/var/www/serpmonn.ru/.env' });

import { query } from '../database/config.mjs';                                                      // Импортируем функцию query
import paseto from 'paseto';                                                                        // Импортируем библиотеку для работы с PASETO
const { sign } = paseto;
const secretKey = process.env.SECRET_KEY;                                                           // Берём секретный ключ для генерации токена из переменных окружения

const getUserProfile = (req, res) => {                                                              // Получение данных профиля
  const { email } = req.user;                                                                       // Извлекаем email из токена пользователя

  const queryText = 'SELECT username, email FROM users WHERE email = ?';                            // Запрос в базу данных для получения данных пользователя по email
  query(queryText, [email], (err, result) => {
    if (err || result.length === 0) {
      return res.status(404).json({ message: 'Пользователь не найден' });                           // Если произошла ошибка или пользователь не найден, возвращаем 404
    }

    res.json(result[0]);                                                                            // Если данные найдены, отправляем их в ответе
  });
};

const updateUserProfile = async (req, res) => {                                                     // Обновление данных профиля
  const { email: oldEmail, username: oldUsername } = req.user;                                      // Получаем email и username из токена
  const { username, email } = req.body;                                                             // Получаем данные для обновления из запроса

  console.log('Полученные данные:', req.body);                                                      // Логируем тело запроса
  console.log('Email пользователя из токена:', email);
  console.log('Username пользователя из токена:', oldUsername);

  try {
    const queryText = 'UPDATE users SET username = ?, email = ? WHERE email = ?';                   // Запрос для обновления данных пользователя
    const result = await new Promise((resolve, reject) => {
      query(queryText, [username, email, oldEmail], (err, result) => {
        if (err) {
          reject(err);                                                                              // Отклоняем промис при ошибке
        }
        resolve(result);                                                                            // Разрешаем промис при успешном выполнении запроса
      });
    });

    console.log('Результат обновления:', result);

    if (oldEmail !== email || oldUsername !== username) {                                           // Если изменился username или email → создаём новый токен
      res.clearCookie('token');                                                                     // Очистка старого токена перед выдачей нового
      const newToken = await sign({ username, email }, secretKey);                                  // Генерируем новый токен, если изменился email или username
      res.cookie('token', newToken, { httpOnly: true, secure: true });
      return res.json({ message: 'Профиль обновлен, новый токен создан', token: newToken });
    }

    res.json({ message: 'Профиль обновлен успешно' });                                              // Если обновление прошло успешно и токен не требуется, отправляем сообщение об успехе
  } catch (err) {
    res.status(500).json({ message: 'Ошибка при обновлении профиля', error: err });                 // Если произошла ошибка, возвращаем её в ответ
  }
};

export { getUserProfile, updateUserProfile };                                                       // Экспортируем функции для использования в других частях приложения
