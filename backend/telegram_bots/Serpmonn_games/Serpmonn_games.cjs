require('dotenv').config({ path: '/var/www/serpmonn.ru/.env' });
const TelegramBot = require("node-telegram-bot-api");

const TOKEN = process.env.TELEGRAM_TOKEN;
const bot = new TelegramBot(TOKEN, { polling: true });

// Обработчик ошибок polling
bot.on('polling_error', (error) => {
    console.error('Ошибка подключения:', error.message);
});

// Команда /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    
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

    bot.sendMessage(chatId, "🎮 Выберите игру из списка ниже:", {
        reply_markup: keyboard
    }).catch(error => {
        console.error("Ошибка отправки сообщения:", error);
    });
});

// Команда /help
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    
    const helpText = `
🤖 <b>Помощь по боту</b>

▫️ <b>/start</b> - показать меню игр
▫️ <b>/help</b> - эта справка

Просто выберите игру из меню, чтобы начать играть прямо в Telegram!
    `;

    bot.sendMessage(chatId, helpText, {
        parse_mode: 'HTML'
    }).catch(error => {
        console.error("Ошибка отправки help-сообщения:", error);
    });
});

console.log("Бот запущен и ожидает команд...");