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

if (!TOKEN || !REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, {
  polling: true,
  filepath: false
});

// =====================
// КОНСТАНТЫ
// =====================
const SUBREDDITS = {
  en: ['memes', 'dankmemes', 'ProgrammerHumor'],
  ru: ['anormaldayinrussia', 'SlavMemes', 'russiamemes'] // Публичные русскоязычные сабреддиты
};

const REQUEST_TIMEOUT = 10000;
const POST_LIMIT = 100;

// Текстовые шаблоны
const TEXTS = {
  en: {
    welcome: (name) => `Hi ${name}! 😊\nI'm a meme bot that brings fresh memes from Reddit.`,
    memeCaption: "Hot meme for you! 🔥",
    error: "⚠️ <b>Error loading meme</b>\nPlease try again later",
    languageSelected: "🇬🇧 Showing English memes",
    noMemes: "⚠️ <b>No memes available</b>\nTry again later"
  },
  ru: {
    welcome: (name) => `Привет ${name}! 😊\nЯ бот, который приносит свежие мемы.`,
    memeCaption: "Держи горячий мем! 🔥",
    error: "⚠️ <b>Ошибка загрузки</b>\nПопробуйте позже",
    languageSelected: "🇷🇺 Показываю русские мемы",
    noMemes: "⚠️ <b>Мемы недоступны</b>\nПопробуйте позже"
  }
};

// =====================
// ОБРАБОТЧИКИ КОМАНД
// =====================
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from?.first_name || 'friend';

  try {
    await bot.sendMessage(
      chatId,
      `${TEXTS.ru.welcome(firstName)}\n\nВыберите язык / Choose language:`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [
            [
              { text: "🇷🇺 Русские мемы", callback_data: "set_ru" },
              { text: "🇬🇧 English memes", callback_data: "set_en" }
            ]
          ]
        }
      }
    );
  } catch (error) {
    console.error('Start command error:', error);
    await bot.sendMessage(chatId, TEXTS.ru.error, { parse_mode: 'HTML' });
  }
});

// Единый обработчик кнопок
bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  // Для rate limiting можно добавить библиотеку bottleneck:
  // const limiter = new Bottleneck({ minTime: 1000 });
  // await limiter.schedule(async () => { ... });

  try {
    await bot.answerCallbackQuery(query.id);

    if (data.startsWith('set_')) {
      const language = data.replace('set_', '');
      const userLang = ['ru', 'en'].includes(language) ? language : 'en';
      await bot.deleteMessage(chatId, query.message.message_id);
      await bot.sendMessage(
        chatId,
        TEXTS[userLang].languageSelected,
        {
          reply_markup: {
            inline_keyboard: [[
              { text: "🎲 Случайный мем", callback_data: `meme_${userLang}` }
            ]]
          }
        }
      );
    } else if (data.startsWith('meme_')) {
      const language = data.split('_')[1];
      const userLang = ['ru', 'en'].includes(language) ? language : 'en';
      await bot.sendChatAction(chatId, 'upload_photo');
      const memeUrl = await getRedditMeme(userLang);
      await bot.sendPhoto(
        chatId,
        memeUrl,
        {
          caption: TEXTS[userLang].memeCaption,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[
              { text: "🔄 Ещё мем", callback_data: `meme_${userLang}` },
              { text: "🌍 Сменить язык", callback_data: "change_lang" }
            ]]
          }
        }
      );
    } else if (data === 'change_lang') {
      await bot.deleteMessage(chatId, query.message.message_id);
      await bot.sendMessage(
        chatId,
        "Выберите язык / Choose language:",
        {
          reply_markup: {
            inline_keyboard: [[
              { text: "🇷🇺 Русские мемы", callback_data: "set_ru" },
              { text: "🇬🇧 English memes", callback_data: "set_en" }
            ]]
          }
        }
      );
    }
  } catch (error) {
    console.error('Callback error:', error);
    const fallbackLang = ['ru', 'en'].includes(data.split('_')[1]) ? data.split('_')[1] : 'en';
    await bot.sendMessage(
      chatId,
      error.message.includes('No suitable memes') ? TEXTS[fallbackLang].noMemes : TEXTS[fallbackLang].error,
      { parse_mode: 'HTML' }
    );
  }
});

// =====================
// ОСНОВНЫЕ ФУНКЦИИ
// =====================
async function getRedditMeme(language = 'en') {
  try {
    const subreddits = SUBREDDITS[language];
    let attempts = subreddits.length;
    let validPosts = [];
    let triedSubreddits = [];

    while (attempts > 0 && !validPosts.length) {
      const availableSubreddits = subreddits.filter(sub => !triedSubreddits.includes(sub));
      if (!availableSubreddits.length) {
        break;
      }
      const randomSub = availableSubreddits[Math.floor(Math.random() * availableSubreddits.length)];
      triedSubreddits.push(randomSub);
      console.log(`[INFO] Requesting memes from r/${randomSub} (${language})`);

      try {
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

        validPosts = response.data.data.children.filter(post => {
          return (
            !post.data.over_18 &&
            !post.data.is_video &&
            !post.data.is_self &&
            /\.(jpe?g|png|gifv?)(?:\?.*)?$/i.test(post.data.url)
          );
        });
      } catch (error) {
        if (error.response?.status === 404) {
          console.warn(`[REDDIT API WARN] Subreddit r/${randomSub} not found`);
          attempts--;
          continue;
        } else if (error.response?.status === 403) {
          console.warn(`[REDDIT API WARN] Subreddit r/${randomSub} is private or forbidden`);
          attempts--;
          continue;
        }
        throw error; // Пробрасываем другие ошибки
      }

      attempts--;
    }

    if (!validPosts.length) {
      console.error(`[ERROR] No valid posts found after trying subreddits: ${triedSubreddits.join(', ')}`);
      throw new Error('No suitable memes found in any subreddit');
    }

    const post = validPosts[Math.floor(Math.random() * validPosts.length)];
    return formatMemeUrl(post.data.url);
  } catch (error) {
    console.error(`[REDDIT API ERROR] ${error.message}`);
    throw error;
  }
}

function formatMemeUrl(url) {
  return url
    .replace('.gifv', '.gif')
    .replace(/&/g, '&');
}

// =====================
// ЗАПУСК
// =====================
console.log(`[${new Date().toISOString()}] Бот запущен! 🚀`);
console.log('English subreddits:', SUBREDDITS.en.join(', '));
console.log('Russian subreddits:', SUBREDDITS.ru.join(', '));