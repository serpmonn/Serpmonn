require('dotenv').config({ path: '/var/www/serpmonn.ru/.env' });                                        // Подключаем dotenv для работы с переменными окружения

const db = require('../database/config');                                                               // Подключение к базе данных
const paseto = require('paseto');                                    					// Подключение PASETO для работы с токенами
const secretKey = process.env.SECRET_KEY;                                                               // Берём секретный ключ для генерации токена из переменных окружения

// Получение данных профиля
const getUserProfile = (req, res) => {
  const { email } = req.user; // Извлекаем email из токена пользователя

  // Запрос в базу данных для получения данных пользователя по email
  const query = 'SELECT username, email FROM users WHERE email = ?';
  db.query(query, [email], (err, result) => {
    if (err || result.length === 0) {
      // Если произошла ошибка или пользователь не найден, возвращаем 404
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    // Если данные найдены, отправляем их в ответе
    res.json(result[0]);
  });
};

// Обновление данных профиля
const updateUserProfile = async (req, res) => {
  const { email } = req.user; 										// Извлекаем email из токена пользователя
  const { username, newEmail } = req.body; 								// Получаем данные для обновления из запроса

  try {
    // Запрос для обновления данных пользователя
    const query = 'UPDATE users SET username = ?, email = ? WHERE email = ?';
    await new Promise((resolve, reject) => {
      db.query(query, [username, newEmail, email], (err, result) => {
        if (err) {
          reject(err);  // Отклоняем промис при ошибке
        }
        resolve(result);  // Разрешаем промис при успешном выполнении запроса
      });
    });

    // Проверяем, изменился ли email или username, и если изменились, выдаём новый токен
    if (email !== newEmail || req.user.username !== username) {
      // Генерируем новый токен, если изменился email или username
      const newToken = await paseto.sign({ username, email: newEmail }, secretKey);
      res.cookie('token', newToken, { httpOnly: true, secure: true });
      return res.json({ message: 'Профиль обновлен, новый токен создан', token: newToken });
    }

    // Если обновление прошло успешно и токен не требуется, отправляем сообщение об успехе
    res.json({ message: 'Профиль обновлен успешно' });
  } catch (err) {
    // Если произошла ошибка, возвращаем её в ответ
    res.status(500).json({ message: 'Ошибка при обновлении профиля', error: err });
  }
};

module.exports = { getUserProfile, updateUserProfile }; 						// Экспортируем функции для использования в других частях приложения

