import express from 'express';                                                               // Импортируем express для создания маршрутов
import { body } from 'express-validator';                                                    // Импортируем body для валидации данных
import { registerUser, confirmTelegram, confirmEmail, confirmToken, loginUser, logoutUser } from './authController.mjs'; // Импортируем функции контроллера (ДОБАВЬТЕ confirmTelegram)
import verifyToken from './verifyToken.mjs';                                                 // Импортируем middleware для проверки токена
import { query } from '../database/config.mjs';                                              // Импортируем функцию query для работы с БД
import rateLimit from 'express-rate-limit';                                                 // Ограничитель запросов для auth
                                                                                              
const router = express.Router();                                                             // Создаем экземпляр маршрутизатора
                                                                                              
// Лимитеры для auth-операций
const authWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});
                                                                                              
router.post(                                                                                 // Определяем POST маршрут для регистрации
  '/register',                                                                               // Указываем путь маршрута
  [                                                                                          // Начинаем массив middleware валидации
    body('username')                                                                         // Валидируем поле username
      .isLength({ min: 3 }).withMessage('Username должен быть длиной от 3 символов.')        // Устанавливаем минимальную длину
      .isAlphanumeric().withMessage('Username должен содержать только буквы и цифры.'),      // Требуем только буквы и цифры
    body('email')                                                                            // Валидируем поле email
      .isEmail().withMessage('Неверный формат email.').normalizeEmail(),                     // Проверяем формат и нормализуем email
    body('password')                                                                         // Валидируем поле password
      .isLength({ min: 6 }).withMessage('Пароль должен быть длиной от 6 символов.')          // Устанавливаем минимальную длину
  ],                                                                                         // Завершаем массив middleware валидации
  authWriteLimiter,                                                                          // Указываем функцию обработки маршрута
  registerUser                                                                               // Указываем функцию обработки маршрута
);                                                                                           
                                                                                              
router.post('/confirm-email', authWriteLimiter, confirmEmail);                               // Определяем POST маршрут для подтверждения

router.post('/confirm-telegram', authWriteLimiter, confirmTelegram);                         // Определяем POST маршрут для подтверждения через Telegram Web App
                                                                                              
router.get('/confirm', confirmToken);                                                        // Определяем GET маршрут для проверки токена
                                                                                              
router.post('/login', authWriteLimiter, loginUser);                                                            // Определяем POST маршрут для входа пользователя
                                                                                              
router.post('/logout', authWriteLimiter, logoutUser);                                                          // Определяем POST маршрут для выхода пользователя
                                                                                              
router.get('/protected', verifyToken, (req, res) => {                                        // Определяем защищённый GET маршрут
  res.json({ message: 'Вы получили доступ к защищённому маршруту', user: req.user });        // Отправляем ответ клиенту
});                                                                                          
                                                                                              
router.get('/check-confirmation', async (req, res) => {                                      // Определяем GET маршрут для проверки статуса
  const { username } = req.query;                                                            // Извлекаем username из параметров запроса
  if (!username) {                                                                           // Проверяем, указан ли username
    return res.status(400).json({ message: "Имя пользователя не указано." });                // Возвращаем ошибку
  }                                                                                         
                                                                                              
  try {                                                                                      // Начинаем блок обработки ошибок
    const results = await query("SELECT confirmed FROM users WHERE username = ?", [username]); // Выполняем запрос к БД
    if (results.length === 0) {                                                              // Проверяем, найден ли пользователь
      return res.status(404).json({ message: "Пользователь не найден." });                   // Возвращаем ошибку
    }                                                                                       
    res.json({ confirmed: results[0].confirmed });                                           // Отправляем статус подтверждения клиенту
  } catch (error) {                                                                          // Обрабатываем возможные ошибки
    console.error("Ошибка проверки подтверждения:", error);                                  // Логируем ошибку в консоль
    res.status(500).json({ message: "Ошибка сервера." });                                    // Возвращаем ошибку сервера клиенту
  }                                                                                         
});                                                                                          
                                                                                              
export default router;                                                                       // Экспортируем маршрутизатор