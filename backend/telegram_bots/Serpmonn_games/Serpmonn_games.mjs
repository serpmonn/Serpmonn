import dotenv from 'dotenv';                                                                                                     // Импортируем dotenv для работы с переменными окружения
import { resolve } from 'path';                                                                                                  // Импортируем resolve для создания абсолютных путей
import TelegramBot from 'node-telegram-bot-api';                                                                                 // Импортируем TelegramBot для создания телеграм бота

const isProduction = process.env.NODE_ENV === 'production';                                                                      // Определяем режим работы: production или development
const envPath = isProduction                                                                                                     // Выбираем путь к .env файлу в зависимости от окружения
    ? '/var/www/serpmonn.ru/backend/telegram_bots/.env'                                                                                                // Продакшен путь на сервере
    : resolve(process.cwd(), 'backend/telegram_bots/.env');                                                                                    // Разработка - абсолютный путь к .env в папке backend

dotenv.config({ path: envPath });                                                                                                // Загружаем переменные окружения из выбранного пути

const SERPMONN_GAMES_TOKEN = process.env.SERPMONN_GAMES_TOKEN;                                                                   // Получаем токен бота из переменных окружения с новым именем SERPMONN_GAMES_TOKEN
const bot = new TelegramBot(SERPMONN_GAMES_TOKEN, { polling: true });                                                            // Создаем экземпляр бота с использованием нового токена SERPMONN_GAMES_TOKEN

// Функция для получения URL игр в зависимости от окружения
function getGameUrl(gamePath) {
    const baseUrl = isProduction                                                                                                 // Выбираем базовый URL в зависимости от окружения
        ? 'https://serpmonn.ru'                                                                                                  // Продакшен URL
        : 'http://localhost:5173';                                                                                               // Разработка - локальный URL Vite сервера
    
    return `${baseUrl}${gamePath}`;                                                                                              // Формируем полный URL для игры
}

bot.on('polling_error', (error) => {                                                                                             // Обработчик ошибок polling для отслеживания проблем с подключением
    console.error('Ошибка подключения:', error.message);                                                                         // Логируем сообщение об ошибке подключения к Telegram API
});

bot.onText(/\/start/, (msg) => {                                                                                                 // Обработчик команды /start для показа меню игр
    const chatId = msg.chat.id;                                                                                                  // Получаем ID чата для отправки ответа

    const keyboard = {                                                                                                           // Создаем объект клавиатуры с кнопками для выбора игр
        inline_keyboard: [                                                                                                       // Определяем inline клавиатуру с рядами кнопок
            [                                                                                                                    // Первый ряд кнопок
                {                                                                                                                // Кнопка для игры 2048
                    text: "Играть в 2048",                                                                                       // Текст на кнопке
                    web_app: { url: getGameUrl("/games/2048/index.html") }                                                       // Веб-приложение с URL в зависимости от окружения
                }
            ],
            [                                                                                                                    // Второй ряд кнопок
                {                                                                                                                // Кнопка для игры Квадратное бегство
                    text: "Играть в Квадратное бегство",                                                                         // Текст на кнопке
                    web_app: { url: getGameUrl("/games/redsquare/redsquare.html") }                                              // Веб-приложение с URL в зависимости от окружения
                }
            ],
            [                                                                                                                    // Третий ряд кнопок
                {                                                                                                                // Кнопка для игры Падающие фигуры
                    text: "Играть в Падающие фигуры",                                                                            // Текст на кнопке
                    web_app: { url: getGameUrl("/games/redsquare2/redsquare2.html") }                                            // Веб-приложение с URL в зависимости от окружения
                }
            ]
        ]
    };

    bot.sendMessage(chatId, "🎮 Выберите игру из списка ниже:", {                                                                // Отправляем сообщение с меню игр
        reply_markup: keyboard                                                                                                   // Прикрепляем созданную клавиатуру к сообщению
    }).catch(error => {                                                                                                          // Обрабатываем возможные ошибки отправки сообщения
        console.error("Ошибка отправки сообщения:", error);                                                                      // Логируем ошибку отправки сообщения
    });
});

bot.onText(/\/help/, (msg) => {                                                                                                  // Обработчик команды /help для показа справки
    const chatId = msg.chat.id;                                                                                                  // Получаем ID чата для отправки ответа
    
    const helpText = `                                                                                                           // Формируем текст справки с HTML разметкой
🤖 <b>Помощь по боту</b>

▫️ <b>/start</b> - показать меню игр
▫️ <b>/help</b> - эта справка

Просто выберите игру из меню, чтобы начать играть прямо в Telegram!
    `;

    bot.sendMessage(chatId, helpText, {                                                                                          // Отправляем сообщение со справкой
        parse_mode: 'HTML'                                                                                                       // Указываем парсинг HTML разметки в сообщении
    }).catch(error => {                                                                                                          // Обрабатываем возможные ошибки отправки сообщения
        console.error("Ошибка отправки help-сообщения:", error);                                                                 // Логируем ошибку отправки help-сообщения
    });
});

console.log("Бот запущен и ожидает команд...");                                                                                  // Логируем успешный запуск бота