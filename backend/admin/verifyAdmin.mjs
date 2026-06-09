import dotenv from 'dotenv';
import { resolve } from 'path';

const isProduction = process.env.NODE_ENV === 'production';
const envPath = isProduction
  ? '/var/www/serpmonn.ru/backend/.env'
  : resolve(process.cwd(), 'backend/.env');

dotenv.config({ path: envPath });

import paseto from 'paseto';
const { V4 } = paseto;

const verifyAdmin = async (req, res, next) => {
  const token = req.cookies.admin_token;
  console.log('[admin] token present:', Boolean(token), 'path:', req.path, 'ip:', req.ip);

  if (!token) {
    return res.status(401).json({ message: 'Требуется авторизация' });
  }

  const secretKey = process.env.ADMIN_SECRET_KEY;
  if (!secretKey) {
    console.error('ADMIN_SECRET_KEY не задан в .env');
    return res.status(500).json({ message: 'Ошибка сервера: конфигурация отсутствует' });
  }

  try {
    const payload = await V4.verify(token, secretKey, {
      audience: 'admin-panel'
    });
    req.admin = payload;
    console.log('[admin] verified:', payload?.sub || 'unknown');
    next();
  } catch (error) {
    console.error('[admin] ошибка верификации токена:', error.message);
    return res.status(401).json({ message: 'Недействительный или просроченный токен' });
  }
};

export default verifyAdmin;
