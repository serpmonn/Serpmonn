// meme-bot.mjs
import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';

// =====================
// ИНИЦИАЛИЗАЦИЯ
// =====================
dotenv.config({ 
  path: '/var/www/serpmonn.ru/backend/telegram_bots/meme-bot/.env' 
});

const TOKEN = process.env.TELEGRAM_TOKEN;
const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID;
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;

const bot = new TelegramBot(TOKEN, {
  polling: true,
  filepath: false // Отключаем сохранение файлов на диск
});

// =====================
// КОНСТАНТЫ
// =====================
const SUBREDDITS = ['memes', 'dankmemes', 'ProgrammerHumor'];
const REQUEST_TIMEOUT = 8000; // 8 секунд
const POST_LIMIT = 100;

// =====================
// ОБРАБОТЧИКИ КОМАНД
// =====================
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    `Привет, ${msg.from.first_name}! 😊\n` +
    `Я - бот, который приносит свежие мемы прямо из Reddit.\n\n` +
    `Просто отправь мне команду /meme и получи порцию смеха!`,
    { parse_mode: 'HTML' }
  );
});

bot.onText(/\/meme/, async (msg) => {
  const chatId = msg.chat.id;
  
  try {
    // Показываем статус "печатает..."
    await bot.sendChatAction(chatId, 'upload_photo');
    
    const memeUrl = await getRedditMeme();
    await bot.sendPhoto(chatId, memeUrl, {
      caption: 'Держи горячий мем! 🔥',
      parse_mode: 'HTML'
    });
    
  } catch (error) {
    console.error(`[ОШИБКА] ${new Date().toISOString()}:`, error.message);
    
    await bot.sendMessage(
      chatId,
      `⚠️ <b>Ошибка при загрузке мема</b>\n` +
      `Попробуйте снова через минуту или напишите /meme`,
      { 
        parse_mode: 'HTML',
        disable_notification: true 
      }
    );
  }
});

// =====================
// ФУНКЦИИ
// =====================
async function getRedditMeme() {
  try {
    const randomSub = SUBREDDITS[Math.floor(Math.random() * SUBREDDITS.length)];
    console.log(`[INFO] Запрашиваю мемы из r/${randomSub}`);
    
    const response = await axios.get(
      `https://www.reddit.com/r/${randomSub}/hot.json?limit=${POST_LIMIT}`,
      {
        auth: {
          username: REDDIT_CLIENT_ID,
          password: REDDIT_CLIENT_SECRET
        },
        headers: {
          'User-Agent': 'MemeBot/1.0 (by /u/These-Loan-7733)'
        },
        timeout: REQUEST_TIMEOUT
      }
    );

    const validPosts = response.data.data.children.filter(post => {
      return (
        !post.data.over_18 &&       // Без NSFW
        !post.data.is_video &&      // Без видео
        !post.data.is_self &&       // Без текстовых постов
        /\.(jpe?g|png|gifv?)$/i.test(post.data.url) // Только изображения
      );
    });

    if (!validPosts.length) {
      throw new Error(`В r/${randomSub} не найдено подходящих мемов`);
    }

    const post = validPosts[Math.floor(Math.random() * validPosts.length)];
    return formatMemeUrl(post.data.url);
    
  } catch (error) {
    console.error(`[REDDIT API ERROR]`, error.message);
    throw error;
  }
}

function formatMemeUrl(url) {
  return url
    .replace('.gifv', '.gif')       // Конвертируем gifv в gif
    .replace(/&amp;/g, '&');        // Исправляем HTML-сущности
}

// =====================
// ЗАПУСК
// =====================
console.log(`[${new Date().toISOString()}] Бот запущен! 🚀`);
console.log(`Используемые сабреддиты:`, SUBREDDITS.join(', '));