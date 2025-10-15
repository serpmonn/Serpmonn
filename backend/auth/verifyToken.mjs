import dotenv from 'dotenv';                                                                                                     // Импортируем dotenv для работы с переменными окружения
import { resolve } from 'path';                                                                                                  // Импортируем resolve для создания абсолютных путей

const isProduction = process.env.NODE_ENV === 'production';                                                                      // Определяем режим работы: production или development
const envPath = isProduction                                                                                                     // Выбираем путь к .env файлу в зависимости от окружения
    ? '/var/www/serpmonn.ru/.env'                                                                                                // Продакшен путь на сервере
    : resolve(process.cwd(), 'backend/.env');                                                                                    // Разработка - абсолютный путь к .env в папке backend

dotenv.config({ path: envPath });                                                                                                // Загружаем переменные окружения из выбранного пути

import paseto from 'paseto';                                                                                                    // Импортируем библиотеку paseto для работы с токенами
const { V2 } = paseto;                                                                                                          // Извлекаем модуль V2 из paseto

const verifyToken = async (req, res, next) => {                                                                                 // Определяем middleware для проверки токена
    const token = req.cookies.token;                                                                                            // Извлекаем токен из cookies запроса
    console.log('[auth] token present:', Boolean(token), 'path:', req.path, 'ip:', req.ip);
                     // Безопасное логирование: не выводим сам токен

    if (!token) {                                                                                                               // Проверяем, присутствует ли токен
        return res.status(401).json({ message: 'Токен отсутствует' });                                                          // Возвращаем ошибку, если токен отсутствует
    }                                                                                                                          

    const secretKey = process.env.SECRET_KEY;                                                                                   // Получаем секретный ключ из переменной окружения
    if (!secretKey) {                                                                                                           // Проверяем, задан ли секретный ключ
        console.error('SECRET_KEY не задан в .env');                                                                            // Логируем ошибку, если ключ отсутствует
        return res.status(500).json({ message: 'Ошибка сервера: конфигурация отсутствует' });                                   // Возвращаем ошибку сервера
    }                                                                                                                          

    try {                                                                                                                       // Начинаем блок обработки ошибок
        const payload = await V2.verify(token, secretKey);                                                                      // Проверяем токен с использованием секретного ключа
        req.user = payload;                                                                                                     // Сохраняем данные пользователя в объект запроса
        const subjectHint = payload?.id || payload?.sub || payload?.userId || payload?.username || 'unknown';
        console.log('[auth] verified user:', subjectHint);
                     // Короткий безопасный лог
        next();                                                                                                                 // Переходим к следующему middleware или маршруту
    } catch (error) {                                                                                                           // Обрабатываем возможные ошибки
        console.error('Ошибка верификации токена:', error);                                                                     // Логируем ошибку верификации токена
        res.status(401).json({ message: 'Недействительный токен' });                                                            // Возвращаем ошибку недействительного токена
    }                                                                                                                      
};

export default verifyToken;                                                                                                     // Экспортируем middleware verifyToken