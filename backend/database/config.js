require('dotenv').config({ path: '/var/www/serpmonn.ru/.env' });
import { createConnection } from 'mysql2';

const connection = createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
});

export default connection;

