import dotenv from 'dotenv';
dotenv.config({ path: '/var/www/serpmonn.ru/backend/.env' });

import mysql from 'mysql2';

const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306,
    });

export const query = (sql, values) => {
    return new Promise((resolve, reject) => {
        pool.execute(sql, values, (err, results) => {
            if (err) {
                console.error('Ошибка при выполнении запроса:', err);
                reject(err);
            } else {
                resolve(results);
            }
        });
    });
};

/** Promise-обёртка над pool.getConnection для транзакций */
export const getConnection = () =>
  new Promise((resolve, reject) => {
    pool.getConnection((err, connection) => {
      if (err) reject(err);
      else resolve(connection);
    });
  });

export const connQuery = (connection, sql, values = []) =>
  new Promise((resolve, reject) => {
    const text = String(sql || '').trim();
    // mysql2 prepare() не умеет START TRANSACTION / COMMIT / ROLLBACK
    const isTxControl = /^(START\s+TRANSACTION|BEGIN|COMMIT|ROLLBACK)\b/i.test(text);
    const run = isTxControl
      ? connection.query.bind(connection)
      : connection.execute.bind(connection);
    run(sql, values, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
