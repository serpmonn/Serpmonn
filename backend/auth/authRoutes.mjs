import express from 'express';
import { body } from 'express-validator';
import { registerUser, loginUser, logoutUser } from './authController.mjs';                          // Контроллеры (сделано через деструктуризацию)
import verifyToken from './verifyToken.mjs';

const router = express.Router();                                                                    // Создаём новый экземпляр маршрутизатора

router.post(                                                                                        // Маршрут для регистрации с валидацией данных
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
  registerUser                                                                                      // В контроллер передаются только данные, прошедшие валидацию
);

router.post('/login', loginUser);                                                                   // Маршрут для логина

router.get('/protected', verifyToken, (req, res) => {                                               //Зашишённый маршрут
  res.json({ message: 'Вы получили доступ к защищённому маршруту', user: req.user });
});

router.post('/logout', logoutUser);                                                                 // Маршрут для выхода

export default router;
