import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import axios from 'axios';
import { RateLimiter } from 'limiter';

// Инициализация
dotenv.config({ path: '/var/www/serpmonn.ru/backend/telegram_bots/meme-bot/.env' });

const TOKEN = process.env.TELEGRAM_TOKEN;
const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID;
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;

const bot = new TelegramBot(TOKEN, {
  polling: {
    interval: 2000,
    autoStart: true,
    params: { timeout: 10 }
  },
  filepath: false
});

const SUBREDDITS = ['memes', 'ProgrammerHumor'];
const REQUEST_TIMEOUT = 8000;
const POST_LIMIT = 50;
const limiter = new RateLimiter({ tokensPerInterval: 15, interval: 'second' });
const redditLimiter = new RateLimiter({ tokensPerInterval: 30, interval: 'minute' });

// Обработчик ошибок polling
const ADMIN_CHAT_ID = 5726590332;
let errorCount = 0;
const MAX_ERRORS = 10;

// Глобальная переменная для хранения токена reddit
let redditToken = {
  reddit_access_token: null,
  expires_at: 0
};

// Глобальная переменная для хранения токена VK Ads
let vkAdsToken = {
  vk_access_token: null, // Переименовано для ясности
  refresh_token: null, // Добавлено для хранения refresh_token
  expires_at: 0
};

// Счетчик для рекламы
let memeCount = 0;
const AD_FREQUENCY = 5; // Показывать рекламу после каждых 5 мемов

// Функция для получения access_token для VK Ads
async function getVkAccessToken() {
  try {
    // Используем существующий токен, если он еще действителен
    if (vkAdsToken.vk_access_token && Date.now() < vkAdsToken.expires_at - 300000) {
      console.log('[INFO] Используется существующий VK Ads access_token');
      return vkAdsToken.vk_access_token;
    }

    const response = await axios.post(
      'https://ads.vk.com/api/v2/oauth2/token.json', // Обновленный эндпоинт
      {
        client_id: process.env.VK_ADS_CLIENT_ID,
        client_secret: process.env.VK_ADS_CLIENT_SECRET,
        grant_type: 'client_credentials'
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'MemeBot/1.0 (by /u/Serpmonn)'
        },
        timeout: REQUEST_TIMEOUT
      }
    );

    vkAdsToken = {
      vk_access_token: response.data.access_token,
      refresh_token: response.data.refresh_token, // Сохраняем refresh_token
      expires_at: Date.now() + (response.data.expires_in * 1000)
    };

    console.log(`[INFO] Получен новый VK Ads access_token, истекает через ${response.data.expires_in} секунд`);
    return vkAdsToken.vk_access_token;
  } catch (error) {
    console.error('[VK ADS TOKEN ERROR]', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    throw new Error('Не удалось получить access_token от VK Ads');
  }
}

// Функция для обновления access_token
async function refreshVkAccessToken() {
  try {
    const response = await axios.post(
      'https://ads.vk.com/api/v2/oauth2/token.json',
      {
        grant_type: 'refresh_token',
        refresh_token: vkAdsToken.refresh_token,
        client_id: process.env.VK_ADS_CLIENT_ID,
        client_secret: process.env.VK_ADS_CLIENT_SECRET
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'MemeBot/1.0 (by /u/Serpmonn)'
        },
        timeout: REQUEST_TIMEOUT
      }
    );

    vkAdsToken = {
      vk_access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_at: Date.now() + (response.data.expires_in * 1000)
    };

    console.log(`[INFO] VK Ads access_token успешно обновлен`);
    return vkAdsToken.vk_access_token;
  } catch (error) {
    console.error('[VK ADS REFRESH TOKEN ERROR]', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    // Если refresh_token недействителен, пробуем получить новый токен
    if (error.response?.data?.code === 'invalid_token') {
      return getVkAccessToken();
    }
    throw new Error('Не удалось обновить access_token от VK Ads');
  }
}

// Функция для получения рекламы из VK Ad Network
async function getVkAd() {
  try {
    const token = await getVkAccessToken();
    const response = await axios.get('https://ads.vk.com/api/v2/ad_plans.json', {
      params: {
        client_id: process.env.VK_ADS_CLIENT_ID,
        ad_slot: '1873118'
      },
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': 'MemeBot/1.0 (by /u/Serpmonn)'
      },
      timeout: REQUEST_TIMEOUT
    });

    const ad = response.data.items?.[0] || response.data.ads?.[0]; // Гибкая обработка ответа
    if (!ad) throw new Error('Нет доступных объявлений');
    return {
      text: ad.description || ad.title || 'Посмотрите это крутое предложение!',
      url: ad.link || ad.url || 'https://t.me/serpmonn_life',
      image: ad.image || ad.image_url || null
    };
  } catch (error) {
    console.error('[VK ADS ERROR]', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    return {
      text: '🔥 Крутые истории ждут на <a href="https://t.me/serpmonn_life">@serpmonn_life</a>! Подпишись! 😎',
      url: 'https://t.me/serpmonn_life',
      image: null
    };
  }
}

bot.on('polling_error', (error) => {
  console.error(`[POLLING ERROR] ${new Date().toISOString()}:`, error.message);
  if (ADMIN_CHAT_ID) {
    if (error.message.includes('502 Bad Gateway') || error.message.includes('504 Gateway Timeout')) {
      console.log('[INFO] Временный сбой Telegram API');
      errorCount++;
      if (errorCount >= MAX_ERRORS) {
        bot.sendMessage(ADMIN_CHAT_ID, `⚠️ Множественные ошибки polling: ${error.message}`)
          .catch(err => console.error('[SEND MESSAGE ERROR]', err.message));
        errorCount = 0;
      }
    } else {
      bot.sendMessage(ADMIN_CHAT_ID, `⚠️ Критическая ошибка polling: ${error.message}`)
        .catch(err => console.error('[SEND MESSAGE ERROR]', err.message));
    }
  }
});

// Команда /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(
    chatId,
    `Привет, ${msg.from.first_name}! 😊\n` +
    `Я - бот, который приносит свежие мемы прямо из Reddit.\n\n` +
    `Отправь /meme и получи порцию смеха! 🔥\n` +
    `Кстати, канал <a href="https://t.me/serpmonn_life">@serpmonn_life</a> разработчика! 😎`,
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [[
          { text: 'Посмотреть канал', url: 'https://t.me/serpmonn_life' }
        ]]
      }
    }
  ).catch(err => console.error('Ошибка отправки /start:', err));
});

// Обновление команды /meme
bot.onText(/\/meme/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    await limiter.removeTokens(1);
    await bot.sendChatAction(chatId, 'upload_photo');

    const memeUrl = await getRedditMeme();
    await sendPhotoWithRetry(chatId, memeUrl, {
      caption: 'Держи горячий мем! 🔥',
      parse_mode: 'HTML'
    });

    // Увеличиваем счетчик мемов
    memeCount++;

    // Отправка рекламы после каждых AD_FREQUENCY мемов
    if (memeCount >= AD_FREQUENCY) {
      const ad = await getVkAd();
      const adUrl = `${ad.url}?utm_source=telegram&utm_medium=bot&utm_campaign=meme_ad_${chatId}`;
      if (ad.image) {
        await sendPhotoWithRetry(chatId, ad.image, {
          caption: ad.text,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[
              { text: 'Подробнее', url: adUrl }
            ]]
          }
        });
      } else {
        await bot.sendMessage(
          chatId,
          ad.text,
          {
            parse_mode: 'HTML',
            reply_markup: {
              inline_keyboard: [[
                { text: 'Подробнее', url: adUrl }
              ]]
            }
          }
        );
      }
      console.log(`[РЕКЛАМА] Отправлено в чат ${chatId}: ${ad.text} (${adUrl})`);
      memeCount = 0;
    }

  } catch (error) {
    console.error(`[ОШИБКА] ${new Date().toISOString()}:`, error.message);
    await bot.sendMessage(
      chatId,
      `⚠️ <b>Ошибка при загрузке мема</b>\n` +
      `Попробуйте снова через минуту или напишите /meme`,
      { parse_mode: 'HTML', disable_notification: true }
    );
  }
});

// Получение токена Reddit
async function getRedditToken() {
  try {
    // Используем существующий токен, если он еще действителен
    if (redditToken.access_token && Date.now() < redditToken.expires_at - 300000) {
      return redditToken.access_token;
    }

    await redditLimiter.removeTokens(1);
    const authResponse = await axios.post(
      'https://www.reddit.com/api/v1/access_token',
      'grant_type=client_credentials',
      {
        auth: {
          username: REDDIT_CLIENT_ID,
          password: REDDIT_CLIENT_SECRET
        },
        headers: {
          'User-Agent': 'MemeBot/1.0 (by /u/Serpmonn)',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: REQUEST_TIMEOUT
      }
    );

    redditToken = {
      access_token: authResponse.data.access_token,
      expires_at: Date.now() + (authResponse.data.expires_in * 1000)
    };

    console.log('[INFO] Получен новый OAuth токен');
    return redditToken.access_token;
  } catch (error) {
    console.error('[TOKEN ERROR]', {
      message: error.message,
      response: error.response?.data
    });
    throw new Error('Не удалось получить токен Reddit');
  }
}

// Получение мема с Reddit
async function getRedditMeme() {
  try {
    const token = await getRedditToken();
    const randomSub = SUBREDDITS[Math.floor(Math.random() * SUBREDDITS.length)];
    console.log(`[INFO] Запрашиваю мемы из r/${randomSub}`);

    const response = await axios.get(
      `https://oauth.reddit.com/r/${randomSub}/hot.json?limit=${POST_LIMIT}`,
      {
        headers: {
          'User-Agent': 'MemeBot/1.0 (by /u/Serpmonn)',
          'Authorization': `Bearer ${token}`
        },
        timeout: REQUEST_TIMEOUT
      }
    );

    if (!response?.data?.data?.children) {
      throw new Error('Некорректный ответ от Reddit API: отсутствуют данные');
    }

    console.log(`[INFO] Получено ${response.data.data.children.length} постов из r/${randomSub}`);

    const validPosts = response.data.data.children.filter(post => {
      if (!post?.data) return false;
      
      const url = post.data.url || '';
      return (
        !post.data.over_18 &&
        !post.data.is_video &&
        !post.data.is_self &&
        isValidImageUrl(url)
      );
    });

    if (!validPosts.length) {
      throw new Error(`В r/${randomSub} не найдено подходящих мемов`);
    }

    const post = validPosts[Math.floor(Math.random() * validPosts.length)];
    let memeUrl = post.data.url;

    // Обработка Imgur ссылок
    if (memeUrl.includes('imgur.com') && !memeUrl.includes('i.imgur.com')) {
      memeUrl = memeUrl.replace('imgur.com', 'i.imgur.com') + '.jpg';
    }

    // Преобразование preview.redd.it в i.redd.it
    if (memeUrl.includes('preview.redd.it')) {
      if (post.data.url_overridden_by_dest) {
        memeUrl = post.data.url_overridden_by_dest;
      } else {
        const urlObj = new URL(memeUrl);
        urlObj.hostname = 'i.redd.it';
        memeUrl = urlObj.toString().split('?')[0];
      }
    }

    // Финализируем URL
    memeUrl = formatMemeUrl(memeUrl);
    
    console.log(`[INFO] Выбран мем: ${memeUrl}`);
    return memeUrl;
    
  } catch (error) {
    console.error(`[REDDIT API ERROR]`, {
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
}

// Проверка валидности URL изображения
function isValidImageUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  try {
    new URL(url);
  } catch (e) {
    return false;
  }

  const allowedDomains = [
    'i.redd.it',
    'i.imgur.com',
    'imgur.com'
  ];
  
  return allowedDomains.some(domain => url.includes(domain)) || 
         /\.(jpe?g|png|gif|webp)(\?.*)?$/i.test(url);
}

// Форматирование URL мема
function formatMemeUrl(url) {
  if (!url) return '';
  
  try {
    // Убираем параметры из URL
    url = url.split('?')[0];
    
    // Декодируем URL только если он содержит %-символы
    if (url.includes('%')) {
      url = decodeURIComponent(url);
    }
    
    return url.replace(/&amp;/g, '&');
  } catch (e) {
    console.warn(`[WARN] Ошибка форматирования URL: ${url}`, e.message);
    return url;
  }
}

// Отправка фото с повторными попытками
async function sendPhotoWithRetry(chatId, url, options, retries = 3, delay = 5000) {
  try {
    options.headers = {
      'User-Agent': 'MemeBot/1.0 (by /u/Serpmonn)'
    };
    
    await bot.sendPhoto(chatId, url, options);
  } catch (error) {
    if (error.message.includes('429 Too Many Requests') && retries > 0) {
      console.log(`[INFO] 429 detected, retrying after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return sendPhotoWithRetry(chatId, url, options, retries - 1, delay * 2);
    }
    throw error;
  }
}

// Запуск бота
console.log(`[${new Date().toISOString()}] Бот запущен! 🚀`);
console.log(`Используемые сабреддиты:`, SUBREDDITS.join(', '));