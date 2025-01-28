require('dotenv').config();

const paseto = require('paseto');
const { V2 } = paseto;

const verifyToken = async (req, res, next) => {

  const token = req.headers['authorization'] && req.headers['authorization'].split(' ')[1];	// Получаем токен из заголовка Authorization
  console.log("Token from header:", token);  							// Добавьте это для диагностики


  if (!token) {
    return res.status(403).json({ message: 'Токен не предоставлен' });
  }

  const secretKey = process.env.SECRET_KEY;

  try {
    const payload = await V2.verify(token, secretKey);
    req.user = payload;  									// Сохраняем данные пользователя в запросе
    next();  											// Переходим к следующему обработчику
  } catch (error) {
    res.status(401).json({ message: 'Неверный токен' });
  }
};

module.exports = verifyToken;

