const express = require('express');
const { body } = require('express-validator');
const { registerUser, loginUser } = require('./authController');
const verifyToken = require('./verifyToken');
const router = express.Router();

router.post('/register', [
  body('username').isLength({ min: 5 }).withMessage('Имя пользователя должно быть минимум 5 символов'),
  body('email').isEmail().withMessage('Неверный формат email'),
  body('password').isLength({ min: 8 }).withMessage('Пароль должен содержать минимум 8 символов'),
], registerUser);

router.post('/login', [
  body('email').isEmail().withMessage('Неверный формат email'),
  body('password').not().isEmpty().withMessage('Пароль не может быть пустым'),
], loginUser);

router.get('/protected', verifyToken, (req, res) => {
  res.json({ message: 'Вы получили доступ к защищённому маршруту', user: req.user });
});

module.exports = router;

