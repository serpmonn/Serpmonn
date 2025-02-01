const express = require('express');
const verifyToken = require('../auth/verifyToken');
const { getUserProfile, updateUserProfile } = require('./profilesController');
const router = express.Router();

router.get('/', verifyToken, (req, res) => {
  res.json({
    username: req.user.username,
    email: req.user.email
  });
});

// Маршрут для получения данных профиля (с использованием verifyToken для авторизации)
router.get('/get', verifyToken, getUserProfile);

// Маршрут для обновления данных профиля (с использованием verifyToken для авторизации)
router.put('/put', verifyToken, updateUserProfile);

module.exports = router;

