import dotenv from 'dotenv';
import { resolve, dirname, join } from 'path';  // Добавили dirname и join
import { fileURLToPath } from 'url';           // Добавили импорт

const isProduction = process.env.NODE_ENV === 'production';
const envPath = isProduction 
    ? '/var/www/serpmonn.ru/backend/.env'
    : resolve(process.cwd(), 'backend/.env');

dotenv.config({ path: envPath });

const __filename = fileURLToPath(import.meta.url);  // Исправили опечатку
const __dirname = dirname(__filename);              // Исправили вызов

import express from 'express';                                                                                                   // Импортируем Express для создания сервера
import fs from 'fs';                                                                                                             // Импортируем File System для работы с файлами
import cors from 'cors';                                                                                                         // Импортируем CORS для обработки междоменных запросов
import rateLimit from 'express-rate-limit';                                                                                      // Импортируем ограничитель частоты запросов

const app = express();                                                                                                           // Создаем экземпляр Express приложения
const PORT = process.env.X_CAR_PORT;                                                                                             // Берем порт только из .env файла

const DATA_FILE = join(__dirname, 'leads.json');                                                    // Определяем путь к файлу с данными заявок

app.use(cors());                                                                                  // Включаем CORS для всех маршрутов
app.use(express.json());                                                                          // Включаем парсинг JSON в теле запросов

// Глобальный лимитер запросов (защита от частых запросов)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,                                                                     // Окно времени - 15 минут
    max: 600,                                                                                     // Максимум 600 запросов за 15 минут
    standardHeaders: true,                                                                        // Использовать стандартные заголовки лимита
    legacyHeaders: false                                                                          // Не использовать устаревшие заголовки
});
app.use(apiLimiter);                                                                              // Применяем глобальный лимитер ко всем маршрутам

// Функция для инициализации файла данных
const initDataFile = () => {
    try {
        if (!fs.existsSync(DATA_FILE)) {                                                          // Проверяем существование файла данных
            fs.writeFileSync(DATA_FILE, '[]', 'utf8');                                            // Создаем файл с пустым массивом если не существует
            console.log(`Файл успешно создан: ${DATA_FILE}`);                                     // Логируем успешное создание файла
        }
        
        // Проверка возможности чтения/записи файла
        fs.accessSync(DATA_FILE, fs.constants.R_OK | fs.constants.W_OK);                          // Проверяем права на чтение и запись файла
        console.log('Доступ к файлу подтвержден');                                                // Логируем успешную проверку доступа
    } catch (err) {
        console.error('❌ Ошибка инициализации файла:', err);                                     // Логируем ошибку инициализации
        console.log('Попытка создать файл по пути:', DATA_FILE);                                  // Показываем путь к файлу для отладки
        console.log('Текущая рабочая директория:', process.cwd());                                // Показываем текущую рабочую директорию
        process.exit(1);                                                                          // Завершаем процесс с ошибкой
    }
};

// Инициализируем файл данных при запуске сервера
initDataFile();

// Более строгий лимитер для приема заявок (отдельный от глобального)
const leadsLimiter = rateLimit({
    windowMs: 60 * 1000,                                                                          // Окно времени - 1 минута
    max: 120,                                                                                     // Максимум 120 заявок в минуту
    standardHeaders: true,                                                                        // Использовать стандартные заголовки лимита
    legacyHeaders: false                                                                          // Не использовать устаревшие заголовки
});

// Маршрут для приема заявок от водителей X-Car
app.post('/xcar-drivers', leadsLimiter, (req, res) => {
    try {
        const newLead = {                                                                         // Создаем объект новой заявки
            ...req.body,                                                                          // Копируем данные из тела запроса
            ip: req.ip,                                                                           // Добавляем IP адрес клиента
            timestamp: new Date().toISOString()                                                   // Добавляем временную метку
        };

        // Чтение текущих данных из файла
        const fileContent = fs.readFileSync(DATA_FILE, 'utf8');                                   // Читаем файл с заявками
        const leads = JSON.parse(fileContent);                                                    // Парсим JSON в массив объектов
        
        // Добавление новой записи в массив заявок
        leads.push(newLead);                                                                      // Добавляем новую заявку в конец массива
        
        // Запись обновленных данных обратно в файл
        fs.writeFileSync(DATA_FILE, JSON.stringify(leads, null, 2), 'utf8');                      // Записываем массив обратно в файл с форматированием
        
        console.log('✅ Новая заявка:', newLead.name, newLead.phone);                             // Логируем успешное получение заявки
        res.status(200).json({ success: true });                                                  // Отправляем успешный ответ клиенту
    } catch (error) {
        console.error('❌ Ошибка обработки заявки:', error);                                      // Логируем ошибку обработки заявки
        res.status(500).json({                                                                    // Отправляем ошибку сервера клиенту
            success: false,
            error: 'Internal server error'
        });
    }
});

// Базовый маршрут для проверки работы сервера
app.get('/', (req, res) => {
    res.send('Сервер для сбора заявок X-Car работает!');                                          // Отправляем простое сообщение о работе сервера
});

app.listen(PORT, () => {                                                                          // Запускаем сервер на указанном порту
    console.log(`Сервер запущен на http://localhost:${PORT}`);                                    // Логируем запуск сервера с портом
    console.log(`Файл данных: ${DATA_FILE}`);                                                     // Логируем путь к файлу данных
});
