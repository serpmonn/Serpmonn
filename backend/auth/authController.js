const bcrypt = require('bcryptjs');
const paseto = require('paseto');
const { V2 } = paseto;
const db = require('../database/config');  // Подключение к базе данных
const { validationResult } = require('express-validator');
require('dotenv').config();

const registerUser = async (req, res) => {
  // Валидация данных
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, email, password } = req.body;

  // Хеширование пароля
  const hashedPassword = await bcrypt.hash(password, 10);

  // Сохранение пользователя в базе данных
  const query = 'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)';
  db.query(query, [username, email, hashedPassword], async (err, result) => {
    if (err) {
      return res.status(500).json({ message: 'Ошибка при сохранении пользователя', err });
    }

    // Генерация токена
    const secretKey = process.env.SECRET_KEY;			  							// Пример секретного ключа
    const payload = { username, email };

    try {
      const token = await V2.sign(payload, secretKey);
      console.log('Токен сгенерирован:', token);  // Логирование токена
      res.status(201).json({ message: 'Пользователь успешно зарегистрирован', token });
    } catch (error) {
      console.error('Ошибка при генерации токена:', error);  // Логирование ошибки
      res.status(500).json({ message: 'Ошибка при генерации токена', error });
    }
  });
};

const loginUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  // Получение пользователя из базы данных
  const query = 'SELECT * FROM users WHERE email = ?';
  db.query(query, [email], async (err, result) => {
    if (err || result.length === 0) {
      return res.status(401).json({ message: 'Пользователь не найден' });
    }

    const user = result[0];
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Неверный пароль' });
    }

    // Генерация токена
    const secretKey = process.env.SECRET_KEY;
    const payload = { username: user.username, email: user.email };

    V2.sign(payload, secretKey)
      .then((token) => {
        res.json({ message: 'Авторизация успешна', token });
      })
      .catch((error) => {
	  console.error("Error generating token:", error);  // Добавьте логирование
	  res.status(500).json({ message: 'Ошибка при генерации токена', error });
	});
  });
};

module.exports = { registerUser, loginUser };
