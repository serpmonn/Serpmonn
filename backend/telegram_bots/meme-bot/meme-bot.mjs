import dotenv from 'dotenv';                                                                                                     // Импортируем dotenv для работы с переменными окружения
import { resolve } from 'path';                                                                                                  // Импортируем resolve для создания абсолютных путей
import TelegramBot from 'node-telegram-bot-api';                                                                                 // Импортируем TelegramBot для создания телеграм бота
import axios from 'axios';                                                                                                       // Импортируем axios для выполнения HTTP запросов
import { RateLimiter } from 'limiter';                                                                                           // Импортируем RateLimiter для ограничения частоты запросов

const isProduction = process.env.NODE_ENV === 'production';                                                                      // Определяем режим работы: production или development
const envPath = isProduction                                                                                                     // Выбираем путь к .env файлу в зависимости от окружения
    ? '/var/www/serpmonn.ru/.env'                                                                                                // Продакшен путь на сервере
    : resolve(process.cwd(), 'backend/telegram_bots/.env');                                                                      // Разработка - абсолютный путь к .env в папке backend (ИСПРАВЛЕНО)

dotenv.config({ path: envPath });                                                                                                // Загружаем переменные окружения из выбранного пути

const TOKEN = process.env.MEME_BOT_TOKEN;                                                                                        // Получаем токен бота для мемов из переменных окружения
const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID;                                                                           // Получаем client_id для Reddit API из переменных окружения
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;                                                                   // Получаем client_secret для Reddit API из переменных окружения

const bot = new TelegramBot(TOKEN, {                                                                                             // Создаем экземпляр бота с настройками polling
  polling: {                                                                                                                     // Настройки long-polling для получения обновлений
    interval: 2000,                                                                                                              // Интервал опроса сервера в миллисекундах
    autoStart: true,                                                                                                             // Автоматически начинать опрос после создания бота
    params: { timeout: 10 }                                                                                                      // Параметры запроса: timeout в секундах
  },
  filepath: false                                                                                                                // Отключаем сохранение файлов на диск
});

const SUBREDDITS = ['memes', 'ProgrammerHumor'];                                                                                 // Список сабреддитов для получения мемов
const REQUEST_TIMEOUT = 8000;                                                                                                    // Таймаут для HTTP запросов в миллисекундах
const POST_LIMIT = 50;                                                                                                           // Лимит постов для запроса к Reddit API
const limiter = new RateLimiter({ tokensPerInterval: 15, interval: 'second' });                                                  // Лимитер для общего использования (15 запросов в секунду)
const redditLimiter = new RateLimiter({ tokensPerInterval: 30, interval: 'minute' });                                            // Лимитер для Reddit API (30 запросов в минуту)

const ADMIN_CHAT_ID = 5726590332;                                                                                                // ID чата администратора для уведомлений об ошибках
let errorCount = 0;                                                                                                              // Счетчик ошибок для отслеживания повторяющихся сбоев
const MAX_ERRORS = 10;                                                                                                           // Максимальное количество ошибок перед уведомлением администратора

let redditToken = {                                                                                                              // Объект для хранения токена доступа Reddit и времени его истечения
  reddit_access_token: null,                                                                                                     // Токен доступа для Reddit API
  expires_at: 0                                                                                                                  // Время истечения токена в миллисекундах
};

let vkAdsToken = {                                                                                                               // Объект для хранения токена доступа VK Ads и refresh токена
  vk_access_token: null,                                                                                                         // Токен доступа для VK Ads API
  refresh_token: null,                                                                                                           // Refresh токен для обновления access_token
  expires_at: 0                                                                                                                  // Время истечения токена в миллисекундах
};

let memeCount = 0;                                                                                                               // Счетчик отправленных мемов для управления показом рекламы
const AD_FREQUENCY = 5;                                                                                                          // Частота показа рекламы (после каждых 5 мемов)

async function getVkAccessToken() {                                                                                              // Функция для получения access_token для VK Ads API
  try {                                                                                                                          // Начало блока обработки ошибок
    if (vkAdsToken.vk_access_token && Date.now() < vkAdsToken.expires_at - 300000) {                                             // Проверяем действительность существующего токена (с запасом 5 минут)
      console.log('[INFO] Используется существующий VK Ads access_token');                                                       // Логируем использование существующего токена
      return vkAdsToken.vk_access_token;                                                                                         // Возвращаем существующий токен если он еще действителен
    }

    const response = await axios.post(                                                                                           // Отправляем POST запрос для получения нового токена
      'https://ads.vk.com/api/v2/oauth2/token.json',                                                                             // Эндпоинт для получения токена VK Ads
      {                                                                                                                          // Тело запроса с учетными данными
        client_id: process.env.VK_ADS_CLIENT_ID,                                                                                 // Client ID из переменных окружения
        client_secret: process.env.VK_ADS_CLIENT_SECRET,                                                                         // Client Secret из переменных окружения
        grant_type: 'client_credentials'                                                                                         // Тип авторизации - client credentials
      },
      {                                                                                                                          // Настройки запроса
        headers: {                                                                                                               // Заголовки запроса
          'Content-Type': 'application/x-www-form-urlencoded',                                                                   // Указываем тип содержимого
          'User-Agent': 'MemeBot/1.0 (by /u/Serpmonn)'                                                                           // User-Agent для идентификации
        },
        timeout: REQUEST_TIMEOUT                                                                                                 // Таймаут запроса
      }
    );

    vkAdsToken = {                                                                                                               // Обновляем объект с токеном новыми данными
      vk_access_token: response.data.access_token,                                                                               // Сохраняем новый access_token
      refresh_token: response.data.refresh_token,                                                                                // Сохраняем refresh_token для будущих обновлений
      expires_at: Date.now() + (response.data.expires_in * 1000)                                                                 // Вычисляем время истечения токена
    };

    console.log(`[INFO] Получен новый VK Ads access_token, истекает через ${response.data.expires_in} секунд`);                  // Логируем успешное получение токена
    return vkAdsToken.vk_access_token;                                                                                           // Возвращаем новый токен
  } catch (error) {                                                                                                              // Обработка ошибок получения токена
    console.error('[VK ADS TOKEN ERROR]', {                                                                                      // Логируем детали ошибки
      message: error.message,                                                                                                    // Сообщение об ошибке
      status: error.response?.status,                                                                                            // HTTP статус ответа если есть
      data: error.response?.data                                                                                                 // Данные ответа если есть
    });
    throw new Error('Не удалось получить access_token от VK Ads');                                                               // Пробрасываем ошибку дальше
  }
}

async function refreshVkAccessToken() {                                                                                          // Функция для обновления access_token с помощью refresh_token
  try {                                                                                                                          // Начало блока обработки ошибок
    const response = await axios.post(                                                                                           // Отправляем POST запрос для обновления токена
      'https://ads.vk.com/api/v2/oauth2/token.json',                                                                             // Эндпоинт для обновления токена
      {                                                                                                                          // Тело запроса для обновления токена
        grant_type: 'refresh_token',                                                                                             // Тип гранта - refresh token
        refresh_token: vkAdsToken.refresh_token,                                                                                 // Refresh token из сохраненных данных
        client_id: process.env.VK_ADS_CLIENT_ID,                                                                                 // Client ID из переменных окружения
        client_secret: process.env.VK_ADS_CLIENT_SECRET                                                                          // Client Secret из переменных окружения
      },
      {                                                                                                                          // Настройки запроса
        headers: {                                                                                                               // Заголовки запроса
          'Content-Type': 'application/x-www-form-urlencoded',                                                                   // Указываем тип содержимого
          'User-Agent': 'MemeBot/1.0 (by /u/Serpmonn)'                                                                           // User-Agent для идентификации
        },
        timeout: REQUEST_TIMEOUT                                                                                                 // Таймаут запроса
      }
    );

    vkAdsToken = {                                                                                                               // Обновляем объект с токеном новыми данными
      vk_access_token: response.data.access_token,                                                                               // Сохраняем новый access_token
      refresh_token: response.data.refresh_token,                                                                                // Сохраняем новый refresh_token
      expires_at: Date.now() + (response.data.expires_in * 1000)                                                                 // Вычисляем новое время истечения
    };

    console.log(`[INFO] VK Ads access_token успешно обновлен`);                                                                  // Логируем успешное обновление токена
    return vkAdsToken.vk_access_token;                                                                                           // Возвращаем обновленный токен
  } catch (error) {                                                                                                              // Обработка ошибок обновления токена
    console.error('[VK ADS REFRESH TOKEN ERROR]', {                                                                              // Логируем детали ошибки
      message: error.message,                                                                                                    // Сообщение об ошибке
      status: error.response?.status,                                                                                            // HTTP статус ответа
      data: error.response?.data                                                                                                 // Данные ответа
    });
    if (error.response?.data?.code === 'invalid_token') {                                                                        // Проверяем если refresh_token недействителен
      return getVkAccessToken();                                                                                                 // Пытаемся получить новый токен с нуля
    }
    throw new Error('Не удалось обновить access_token от VK Ads');                                                               // Пробрасываем ошибку дальше
  }
}

async function getVkAd() {                                                                                                       // Функция для получения рекламного объявления из VK Ad Network
  try {                                                                                                                          // Начало блока обработки ошибок
    const token = await getVkAccessToken();                                                                                      // Получаем действительный access_token
    const response = await axios.get('https://ads.vk.com/api/v2/ad_plans.json', {                                                // Отправляем GET запрос для получения рекламных объявлений
      params: {                                                                                                                  // Параметры запроса
        client_id: process.env.VK_ADS_CLIENT_ID,                                                                                 // Client ID из переменных окружения
        ad_slot: '1873118'                                                                                                       // ID рекламного слота
      },
      headers: {                                                                                                                 // Заголовки запроса
        'Authorization': `Bearer ${token}`,                                                                                      // Authorization header с токеном
        'User-Agent': 'MemeBot/1.0 (by /u/Serpmonn)'                                                                             // User-Agent для идентификации
      },
      timeout: REQUEST_TIMEOUT                                                                                                   // Таймаут запроса
    });

    const ad = response.data.items?.[0] || response.data.ads?.[0];                                                               // Извлекаем первое объявление из ответа (гибкая обработка структуры)
    if (!ad) throw new Error('Нет доступных объявлений');                                                                        // Если объявлений нет - выбрасываем ошибку
    return {                                                                                                                     // Возвращаем объект с данными объявления
      text: ad.description || ad.title || 'Посмотрите это крутое предложение!',                                                  // Текст объявления или заглушка
      url: ad.link || ad.url || 'https://t.me/serpmonn_life',                                                                    // URL объявления или ссылка на канал по умолчанию
      image: ad.image || ad.image_url || null                                                                                    // Изображение объявления или null если нет
    };
  } catch (error) {                                                                                                              // Обработка ошибок получения рекламы
    console.error('[VK ADS ERROR]', {                                                                                            // Логируем детали ошибки
      message: error.message,                                                                                                    // Сообщение об ошибке
      status: error.response?.status,                                                                                            // HTTP статус ответа
      data: error.response?.data                                                                                                 // Данные ответа
    });
    return {                                                                                                                     // Возвращаем резервное объявление при ошибке
      text: '🔥 Крутые истории ждут на <a href="https://t.me/serpmonn_life">@serpmonn_life</a>! Подпишись! 😎',                  // Текст резервного объявления с HTML разметкой
      url: 'https://t.me/serpmonn_life',                                                                                         // Ссылка на Telegram канал
      image: null                                                                                                                // Без изображения
    };
  }
}

bot.on('polling_error', (error) => {                                                                                             // Обработчик ошибок polling от Telegram API
  console.error(`[POLLING ERROR] ${new Date().toISOString()}:`, error.message);                                                  // Логируем ошибку с временной меткой
  if (ADMIN_CHAT_ID) {                                                                                                           // Проверяем установлен ли ID администратора
    if (error.message.includes('502 Bad Gateway') || error.message.includes('504 Gateway Timeout')) {                            // Проверяем тип ошибки (временные сбои)
      console.log('[INFO] Временный сбой Telegram API');                                                                         // Логируем временный сбой
      errorCount++;                                                                                                              // Увеличиваем счетчик ошибок
      if (errorCount >= MAX_ERRORS) {                                                                                            // Проверяем достигли ли максимального количества ошибок
        bot.sendMessage(ADMIN_CHAT_ID, `⚠️ Множественные ошибки polling: ${error.message}`)                                      // Отправляем уведомление администратору
          .catch(err => console.error('[SEND MESSAGE ERROR]', err.message));                                                     // Обрабатываем ошибку отправки уведомления
        errorCount = 0;                                                                                                          // Сбрасываем счетчик ошибок
      }
    } else {                                                                                                                     // Если ошибка не временная
      bot.sendMessage(ADMIN_CHAT_ID, `⚠️ Критическая ошибка polling: ${error.message}`)                                          // Отправляем критическое уведомление
        .catch(err => console.error('[SEND MESSAGE ERROR]', err.message));                                                       // Обрабатываем ошибку отправки уведомления
    }
  }
});

bot.onText(/\/start/, (msg) => {                                                                                                 // Обработчик команды /start
  const chatId = msg.chat.id;                                                                                                    // Получаем ID чата из сообщения
  bot.sendMessage(                                                                                                               // Отправляем приветственное сообщение
    chatId,
    `Привет, ${msg.from.first_name}! 😊\n` +                                                                                    // Персонализированное приветствие
    `Я - бот, который приносит свежие мемы прямо из Reddit.\n\n` +                                                               // Описание функциональности бота
    `Отправь /meme и получи порцию смеха! 🔥\n` +                                                                                // Инструкция по использованию
    `Кстати, канал <a href="https://t.me/serpmonn_life">@serpmonn_life</a> разработчика! 😎`,                                   // Реклама канала с HTML ссылкой
    {
      parse_mode: 'HTML',                                                                                                        // Включаем парсинг HTML разметки
      reply_markup: {                                                                                                            // Настройки клавиатуры
        inline_keyboard: [[                                                                                                      // Inline клавиатура с одной кнопкой
          { text: 'Посмотреть канал', url: 'https://t.me/serpmonn_life' }                                                        // Кнопка с ссылкой на канал
        ]]
      }
    }
  ).catch(err => console.error('Ошибка отправки /start:', err));                                                                 // Обрабатываем ошибки отправки сообщения
});

bot.onText(/\/meme/, async (msg) => {                                                                                            // Обработчик команды /meme
  const chatId = msg.chat.id;                                                                                                    // Получаем ID чата из сообщения

  try {                                                                                                                          // Начало блока обработки ошибок
    await limiter.removeTokens(1);                                                                                               // Применяем лимитер для контроля частоты запросов
    await bot.sendChatAction(chatId, 'upload_photo');                                                                            // Отправляем действие "upload_photo" для индикации загрузки

    const memeUrl = await getRedditMeme();                                                                                       // Получаем URL мема из Reddit
    await sendPhotoWithRetry(chatId, memeUrl, {                                                                                  // Отправляем фото с мемом с возможностью повторных попыток
      caption: 'Держи горячий мем! 🔥',                                                                                          // Подпись к фото
      parse_mode: 'HTML'                                                                                                         // Включаем парсинг HTML
    });

    memeCount++;                                                                                                                 // Увеличиваем счетчик отправленных мемов

    if (memeCount >= AD_FREQUENCY) {                                                                                             // Проверяем достигли ли частоты показа рекламы
      const ad = await getVkAd();                                                                                                // Получаем рекламное объявление
      const adUrl = `${ad.url}?utm_source=telegram&utm_medium=bot&utm_campaign=meme_ad_${chatId}`;                               // Формируем URL с UTM метками для аналитики
      if (ad.image) {                                                                                                            // Проверяем есть ли изображение в объявлении
        await sendPhotoWithRetry(chatId, ad.image, {                                                                             // Отправляем фото с рекламой
          caption: ad.text,                                                                                                      // Текст объявления как подпись
          parse_mode: 'HTML',                                                                                                    // Включаем парсинг HTML
          reply_markup: {                                                                                                        // Настройки клавиатуры
            inline_keyboard: [[                                                                                                  // Inline клавиатура с одной кнопкой
              { text: 'Подробнее', url: adUrl }                                                                                  // Кнопка "Подробнее" с ссылкой
            ]]
          }
        });
      } else {                                                                                                                   // Если изображения нет
        await bot.sendMessage(                                                                                                   // Отправляем текстовое сообщение с рекламой
          chatId,
          ad.text,                                                                                                               // Текст объявления
          {
            parse_mode: 'HTML',                                                                                                  // Включаем парсинг HTML
            reply_markup: {                                                                                                      // Настройки клавиатуры
              inline_keyboard: [[                                                                                                // Inline клавиатура с одной кнопкой
                { text: 'Подробнее', url: adUrl }                                                                                // Кнопка "Подробнее" с ссылкой
              ]]
            }
          }
        );
      }
      console.log(`[РЕКЛАМА] Отправлено в чат ${chatId}: ${ad.text} (${adUrl})`);                                                // Логируем отправку рекламы
      memeCount = 0;                                                                                                             // Сбрасываем счетчик мемов
    }

  } catch (error) {                                                                                                              // Обработка ошибок команды /meme
    console.error(`[ОШИБКА] ${new Date().toISOString()}:`, error.message);                                                       // Логируем ошибку с временной меткой
    await bot.sendMessage(                                                                                                       // Отправляем сообщение об ошибке пользователю
      chatId,
      `⚠️ <b>Ошибка при загрузке мема</b>\n` +                                                                                   // Заголовок ошибки с HTML разметкой
      `Попробуйте снова через минуту или напишите /meme`,                                                                        // Инструкция для пользователя
      { parse_mode: 'HTML', disable_notification: true }                                                                         // Настройки сообщения: HTML парсинг и отключение уведомления
    );
  }
});

async function getRedditToken() {                                                                                                // Функция для получения OAuth токена Reddit
  try {                                                                                                                          // Начало блока обработки ошибок
    if (redditToken.access_token && Date.now() < redditToken.expires_at - 300000) {                                              // Проверяем действительность существующего токена (с запасом 5 минут)
      return redditToken.access_token;                                                                                           // Возвращаем существующий токен если он еще действителен
    }

    await redditLimiter.removeTokens(1);                                                                                         // Применяем лимитер для Reddit API
    const authResponse = await axios.post(                                                                                       // Отправляем POST запрос для получения токена
      'https://www.reddit.com/api/v1/access_token',                                                                              // Эндпоинт для получения OAuth токена Reddit
      'grant_type=client_credentials',                                                                                           // Тело запроса с типом авторизации
      {
        auth: {                                                                                                                  // Basic Auth с client_id и client_secret
          username: REDDIT_CLIENT_ID,                                                                                            // Client ID для Reddit API
          password: REDDIT_CLIENT_SECRET                                                                                         // Client Secret для Reddit API
        },
        headers: {                                                                                                               // Заголовки запроса
          'User-Agent': 'MemeBot/1.0 (by /u/Serpmonn)',                                                                          // User-Agent для идентификации
          'Content-Type': 'application/x-www-form-urlencoded'                                                                    // Указываем тип содержимого
        },
        timeout: REQUEST_TIMEOUT                                                                                                 // Таймаут запроса
      }
    );

    redditToken = {                                                                                                              // Обновляем объект с токеном новыми данными
      access_token: authResponse.data.access_token,                                                                              // Сохраняем access_token из ответа
      expires_at: Date.now() + (authResponse.data.expires_in * 1000)                                                             // Вычисляем время истечения токена
    };

    console.log('[INFO] Получен новый OAuth токен');                                                                             // Логируем успешное получение токена
    return redditToken.access_token;                                                                                             // Возвращаем новый токен
  } catch (error) {                                                                                                              // Обработка ошибок получения токена
    console.error('[TOKEN ERROR]', {                                                                                             // Логируем детали ошибки
      message: error.message,                                                                                                    // Сообщение об ошибке
      response: error.response?.data                                                                                             // Данные ответа если есть
    });
    throw new Error('Не удалось получить токен Reddit');                                                                         // Пробрасываем ошибку дальше
  }
}

async function getRedditMeme() {                                                                                                 // Функция для получения случайного мема с Reddit
  try {                                                                                                                          // Начало блока обработки ошибок
    const token = await getRedditToken();                                                                                        // Получаем действительный OAuth токен
    const randomSub = SUBREDDITS[Math.floor(Math.random() * SUBREDDITS.length)];                                                 // Выбираем случайный сабреддит из списка
    console.log(`[INFO] Запрашиваю мемы из r/${randomSub}`);                                                                     // Логируем выбранный сабреддит

    const response = await axios.get(                                                                                            // Отправляем GET запрос к Reddit API
      `https://oauth.reddit.com/r/${randomSub}/hot.json?limit=${POST_LIMIT}`,                                                    // Эндпоинт для получения горячих постов с лимитом
      {
        headers: {                                                                                                               // Заголовки запроса
          'User-Agent': 'MemeBot/1.0 (by /u/Serpmonn)',                                                                          // User-Agent для идентификации
          'Authorization': `Bearer ${token}`                                                                                     // Authorization header с OAuth токеном
        },
        timeout: REQUEST_TIMEOUT                                                                                                 // Таймаут запроса
      }
    );

    if (!response?.data?.data?.children) {                                                                                       // Проверяем корректность структуры ответа
      throw new Error('Некорректный ответ от Reddit API: отсутствуют данные');                                                   // Выбрасываем ошибку если данные отсутствуют
    }

    console.log(`[INFO] Получено ${response.data.data.children.length} постов из r/${randomSub}`);                               // Логируем количество полученных постов

    const validPosts = response.data.data.children.filter(post => {                                                              // Фильтруем посты по критериям пригодности
      if (!post?.data) return false;                                                                                             // Проверяем наличие данных поста
      
      const url = post.data.url || '';                                                                                           // Получаем URL поста или пустую строку
      return (                                                                                                                   // Возвращаем true если пост удовлетворяет всем критериям:
        !post.data.over_18 &&                                                                                                    // Пост не помечен как 18+
        !post.data.is_video &&                                                                                                   // Пост не является видео
        !post.data.is_self &&                                                                                                    // Пост не является текстовым (self-post)
        isValidImageUrl(url)                                                                                                     // URL является валидным изображением
      );
    });

    if (!validPosts.length) {                                                                                                    // Проверяем есть ли подходящие посты после фильтрации
      throw new Error(`В r/${randomSub} не найдено подходящих мемов`);                                                           // Выбрасываем ошибку если подходящих постов нет
    }

    const post = validPosts[Math.floor(Math.random() * validPosts.length)];                                                      // Выбираем случайный пост из подходящих
    let memeUrl = post.data.url;                                                                                                 // Получаем URL выбранного поста

    try {                                                                                                                        // Обработка Imgur ссылок
      const parsed = new URL(memeUrl);                                                                                           // Парсим URL для анализа
      if (parsed.hostname === 'imgur.com') {                                                                                     // Проверяем если это Imgur ссылка
        parsed.hostname = 'i.imgur.com';                                                                                         // Меняем хост на i.imgur.com для прямого доступа к изображению
        if (!/\.(jpe?g|png|gif|webp)$/i.test(parsed.pathname)) {                                                                 // Проверяем есть ли расширение файла в пути
          parsed.pathname = parsed.pathname.replace(/\/$/, '') + '.jpg';                                                         // Добавляем расширение .jpg если его нет
        }
        memeUrl = parsed.toString().split('?')[0];                                                                               // Формируем новый URL без параметров запроса
      }
    } catch {}                                                                                                                   // Игнорируем ошибки парсинга URL

    if (memeUrl.includes('preview.redd.it')) {                                                                                   // Проверяем если это preview ссылка Reddit
      if (post.data.url_overridden_by_dest) {                                                                                    // Проверяем есть ли оригинальный URL
        memeUrl = post.data.url_overridden_by_dest;                                                                              // Используем оригинальный URL если доступен
      } else {                                                                                                                   // Если оригинального URL нет
        const urlObj = new URL(memeUrl);                                                                                         // Парсим preview URL
        urlObj.hostname = 'i.redd.it';                                                                                           // Меняем хост на i.redd.it
        memeUrl = urlObj.toString().split('?')[0];                                                                               // Формируем новый URL без параметров
      }
    }

    memeUrl = formatMemeUrl(memeUrl);                                                                                            // Форматируем URL мема
    
    console.log(`[INFO] Выбран мем: ${memeUrl}`);                                                                                // Логируем выбранный URL мема
    return memeUrl;                                                                                                              // Возвращаем URL мема
    
  } catch (error) {                                                                                                              // Обработка ошибок получения мема
    console.error(`[REDDIT API ERROR]`, {                                                                                        // Логируем детали ошибки Reddit API
      status: error.response?.status,                                                                                            // HTTP статус ответа
      data: error.response?.data,                                                                                                // Данные ответа
      message: error.message,                                                                                                    // Сообщение об ошибке
      stack: error.stack                                                                                                         // Stack trace ошибки
    });
    throw error;                                                                                                                 // Пробрасываем ошибку дальше
  }
}

function isValidImageUrl(url) {                                                                                                  // Функция для проверки валидности URL изображения
  if (!url || typeof url !== 'string') return false;                                                                             // Проверяем что URL существует и является строкой
  
  try {                                                                                                                          // Начало блока обработки ошибок парсинга URL
    const parsed = new URL(url);                                                                                                 // Парсим URL для анализа
    const hostname = parsed.hostname.toLowerCase();                                                                              // Приводим хостнейм к нижнему регистру

    const allowedDomains = [                                                                                                     // Список разрешенных доменов для изображений
      'i.redd.it',                                                                                                               // Прямые ссылки Reddit
      'i.imgur.com',                                                                                                             // Прямые ссылки Imgur
      'imgur.com'                                                                                                                // Обычные ссылки Imgur
    ];
    
    const isAllowedHost = allowedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain));                  // Проверяем соответствует ли хост разрешенным доменам
    const hasAllowedExt = /\.(jpe?g|png|gif|webp)(\?.*)?$/i.test(parsed.pathname);                                               // Проверяем имеет ли путь разрешенное расширение файла
    
    return isAllowedHost || hasAllowedExt;                                                                                       // Возвращаем true если хост разрешен или расширение валидно
  } catch (e) {                                                                                                                  // Обработка ошибок парсинга URL
    return false;                                                                                                                // Возвращаем false если URL невалиден
  }
}

function formatMemeUrl(url) {                                                                                                    // Функция для форматирования URL мема
  if (!url) return '';                                                                                                           // Возвращаем пустую строку если URL отсутствует
  
  try {                                                                                                                          // Начало блока обработки ошибок форматирования
    url = url.split('#')[0].split('?')[0];                                                                                       // Убираем фрагмент и параметры из URL
    
    if (url.includes('%')) {                                                                                                     // Проверяем содержит ли URL процентное кодирование
      url = decodeURIComponent(url);                                                                                             // Декодируем URL если содержит %-символы
    }
    
    return url.replace(/&amp;/g, '&');                                                                                           // Заменяем HTML entity &amp; на обычный & и возвращаем результат
  } catch (e) {                                                                                                                  // Обработка ошибок форматирования
    console.warn(`[WARN] Ошибка форматирования URL: ${url}`, e.message);                                                         // Логируем предупреждение об ошибке
    return url;                                                                                                                  // Возвращаем исходный URL при ошибке
  }
}

async function sendPhotoWithRetry(chatId, url, options, retries = 3, delay = 5000) {                                             // Функция для отправки фото с повторными попытками при ошибках
  try {                                                                                                                          // Начало блока обработки ошибок отправки
    options.headers = {                                                                                                          // Добавляем заголовки к опциям отправки
      'User-Agent': 'MemeBot/1.0 (by /u/Serpmonn)'                                                                               // User-Agent для идентификации
    };
    
    await bot.sendPhoto(chatId, url, options);                                                                                   // Отправляем фото через Telegram Bot API
  } catch (error) {                                                                                                              // Обработка ошибок отправки фото
    if (error.message.includes('429 Too Many Requests') && retries > 0) {                                                        // Проверяем если ошибка 429 (слишком много запросов) и есть попытки
      console.log(`[INFO] 429 detected, retrying after ${delay}ms...`);                                                          // Логируем обнаружение ошибки 429 и повторную попытку
      await new Promise(resolve => setTimeout(resolve, delay));                                                                  // Ждем указанное время перед повторной попыткой
      return sendPhotoWithRetry(chatId, url, options, retries - 1, delay * 2);                                                   // Рекурсивно вызываем функцию с уменьшенным количеством попыток и увеличенной задержкой
    }
    throw error;                                                                                                                 // Пробрасываем другие ошибки дальше
  }
}

console.log(`[${new Date().toISOString()}] Бот запущен! 🚀`);                                                                    // Логируем успешный запуск бота с временной меткой
console.log(`Используемые сабреддиты:`, SUBREDDITS.join(', '));                                                                  // Логируем список используемых сабреддитов