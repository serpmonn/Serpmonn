import dotenv from 'dotenv';
dotenv.config({ path: '/var/www/serpmonn.ru/.env' });

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