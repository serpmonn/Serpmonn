require('dotenv').config({ path: '/var/www/serpmonn.ru/.env' });

const TelegramBot = require("node-telegram-bot-api");

const TOKEN = process.env.TELEGRAM_TOKEN;

const bot = new TelegramBot(TOKEN, { polling: true });

// Обрабатываем команду /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;

    // Клавиатура с кнопками для открытия Web Apps
    const keyboard = {
        inline_keyboard: [
            [
                {
                    text: "Играть в 2048",
                    web_app: { url: "https://serpmonn.ru/games/2048/index.html" }
                }
            ],
            [
                {
                    text: "Играть в Квадратное бегство",
                    web_app: { url: "https://www.serpmonn.ru/games/redsquare/redsquare.html" }
                }
            ],
            [
                {
                    text: "Играть в Падающие фигуры",
                    web_app: { url: "https://www.serpmonn.ru/games/redsquare2/redsquare2.html" }
                }
            ]
        ]
    };

    // Отправляем сообщение с клавиатурой
    bot.sendMessage(chatId, "Выберите игру:", {
        reply_markup: keyboard
    }).catch(error => {
        console.error("Ошибка при отправке сообщения:", error);
    });
});

console.log("Бот запущен...");