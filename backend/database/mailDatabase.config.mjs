// mailDatabase.config.mjs
import dotenv from 'dotenv';
import { resolve } from 'path';

const isProduction = process.env.NODE_ENV === 'production';
const envPath = isProduction
    ? '/var/www/serpmonn.ru/backend/.env'
    : resolve(process.cwd(), 'backend/.env');

dotenv.config({ path: envPath });

import mysql from 'mysql2';

// Пул подключений для mailserver БД
const mailPool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER, 
    password: process.env.DB_PASSWORD,
    database: 'mailserver', // Явно указываем БД mailserver
    port: process.env.DB_PORT || 3306,
});

export const mailQuery = (sql, values) => {
    return new Promise((resolve, reject) => {
        mailPool.execute(sql, values, (err, results) => {
            if (err) {
                console.error('Ошибка при выполнении запроса к mailserver:', err);
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
};