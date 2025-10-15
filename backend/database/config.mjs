import dotenv from 'dotenv';                                                                                                     // Импортируем dotenv для работы с переменными окружения
import { resolve } from 'path';                                                                                                  // Импортируем resolve для создания абсолютных путей

const isProduction = process.env.NODE_ENV === 'production';                                                                      // Определяем режим работы: production или development
const envPath = isProduction                                                                                                     // Выбираем путь к .env файлу в зависимости от окружения
    ? '/var/www/serpmonn.ru/.env'                                                                                                // Продакшен путь на сервере
    : resolve(process.cwd(), 'backend/.env');                                                                                    // Разработка - абсолютный путь к .env в папке backend

dotenv.config({ path: envPath });                                                                                                // Загружаем переменные окружения из выбранного пути

import mysql from 'mysql2';

const pool = mysql.createPool({                                                             // Создаём пул подключений к базе данных
        host: process.env.DB_HOST,                                                          // Хост базы данных, загружается из переменных окружения
        user: process.env.DB_USER,                                                          // Пользователь для подключения
        password: process.env.DB_PASSWORD,                                                  // Пароль для подключения
        database: process.env.DB_NAME,                                                      // Название базы данных
        port: process.env.DB_PORT || 3306,                                                  // Порт подключения, если не задан в .env, используется 3306
    });

export const query = (sql, values) => {                                                     // Функция для выполнения SQL-запросов
    return new Promise((resolve, reject) => {
        pool.execute(sql, values, (err, results) => {
            if (err) {
                console.error('Ошибка при выполнении запроса:', err);                       // Логирование ошибки
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
};