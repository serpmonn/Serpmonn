const express = require('express');
const { body } = require('express-validator');
const { registerUser, loginUser, logoutUser } = require('./authController'); // Импортируем обработчики из контроллера
const verifyToken = require('./verifyToken');
const router = express.Router();

// Маршрут для регистрации с валидацией данных
router.post(
  '/register',
  [
    body('username')
      .isLength({ min: 3 }).withMessage('Username должен быть длиной от 3 символов.')
      .isAlphanumeric().withMessage('Username должен содержать только буквы и цифры.'),
    body('email')
      .isEmail().withMessage('Неверный формат email.')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 }).withMessage('Пароль должен быть длиной от 6 символов.')
  ],
  registerUser // В контроллер передаются только данные, прошедшие валидацию
);

// Маршрут для логина
router.post('/login', loginUser);

//Зашишённый маршрут
router.get('/protected', verifyToken, (req, res) => {
  res.json({ message: 'Вы получили доступ к защищённому маршруту', user: req.user });
});

// Маршрут для выхода
router.post('/logout', logoutUser);  // Используем функцию из контроллера

module.exports = router;

