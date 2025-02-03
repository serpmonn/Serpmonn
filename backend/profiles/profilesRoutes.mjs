import { Router } from 'express';
import verifyToken from '../auth/verifyToken.mjs';
import { getUserProfile, updateUserProfile } from './profilesController.mjs';
const router = Router();

router.get('/', verifyToken, (req, res) => {
  res.json({
    username: req.user.username,
    email: req.user.email
  });
});

router.get('/get', verifyToken, getUserProfile);                                                      // Маршрут для получения данных профиля (с использованием verifyToken для авторизации)

router.put('/put', verifyToken, updateUserProfile);                                                   // Маршрут для обновления данных профиля (с использованием verifyToken для авторизации)

export default router;

