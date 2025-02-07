import dotenv from 'dotenv';                                                                        // Подключаем dotenv для работы с переменными окружения
dotenv.config({ path: '/var/www/serpmonn.ru/.env' });

import { query } from '../database/config.mjs';                                                      // Импортируем функцию query
import paseto from 'paseto';                                                                        // Импортируем библиотеку для работы с PASETO
const { V2 } = paseto;                                                                              // Обратите внимание, что используется V2
const secretKey = process.env.SECRET_KEY;                                                           // Берём секретный ключ для генерации токена из переменных окружения

const getUserProfile = async (req, res) => {
  try {
    const { email } = req.user;                                                                     // Извлекаем email пользователя из объекта req.user (данные из токена)
    console.log('Email пользователя из токена:', email);

    const queryText = 'SELECT username, email FROM users WHERE email = ?';                          // SQL-запрос для поиска пользователя в базе данных по email

    const result = await query(queryText, [email]);                                                 // Выполняем запрос к базе данных, ожидая результат (асинхронный вызов)

    console.log('Результат запроса к БД:', result);                                                 // Логируем результат запроса в консоль для диагностики

    if (!result || result.length === 0) {                                                           // Если пользователь не найден или результат пустой — отправляем 404
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    res.json(result[0]);                                                                            // Если данные найдены, отправляем их в JSON-ответе
  } catch (err) {
    console.error('Ошибка при получении данных профиля:', err);                                     // Логируем ошибку на сервере

    res.status(500).json({ message: 'Ошибка при получении данных профиля', error: err });           // Отправляем пользователю статус 500 и описание ошибки
  }
};

const updateUserProfile = async (req, res) => {                                                     // Обновление данных профиля
  const { email: oldEmail, username: oldUsername } = req.user;                                      // Получаем email и username из токена
  const { username, email } = req.body;                                                             // Получаем данные для обновления из запроса

  console.log('Полученные данные:', req.body);                                                      // Логируем тело запроса
  console.log('Email пользователя из токена:', email);
  console.log('Username пользователя из токена:', oldUsername);

  if (!email || !username) {                                                                        // Проверка валидности данных
    return res.status(400).json({ message: 'Email и username обязательны' });
  }

  try {
    const queryText = 'UPDATE users SET username = ?, email = ? WHERE email = ?';                   // Обновляем данные пользователя в базе данных
    const result = await query(queryText, [username, email, oldEmail]);                             // Ожидаем результат

    console.log('Результат обновления:', result);

    if (oldEmail !== email || oldUsername !== username) {                                           // Если обновился email или username — генерируем новый токен
      res.clearCookie('token');                                                                     // Очистка старого токена
      const newToken = await V2.sign({ username, email }, secretKey);                               // Используйте V2.sign
      res.cookie('token', newToken, { httpOnly: true, secure: true });
      return res.json({ message: 'Профиль обновлен, новый токен создан', token: newToken });
    }

    res.json({ message: 'Профиль обновлен успешно' });                                              // Если изменения не было — просто возвращаем сообщение об успешном обновлении
  } catch (err) {
    console.error('Ошибка при обновлении профиля:', err);
    res.status(500).json({ message: 'Ошибка при обновлении профиля', error: err });
  }
};


export { getUserProfile, updateUserProfile };                                                       // Экспортируем функции для использования в других частях приложения
