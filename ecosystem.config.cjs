module.exports = {                                      // Экспорт конфигурации PM2
  apps: [                                               // Массив описаний процессов

    // API / основной backend (авторизация, основной HTTP-сервер)
    {
      name: 'auth-server',                              // Имя процесса в PM2 (pm2 status / pm2 logs)
      script: 'backend/server.mjs',                     // Точка входа сервера
      interpreter: '/root/.nvm/versions/node/v22.22.0/bin/node', // sharp требует Node 20+
      exec_mode: 'fork',                                // fork, иначе cluster игнорирует interpreter
      instances: 1,                                     // Кол-во копий процесса
      max_memory_restart: '512M',                       // Перезапуск при превышении 512 МБ
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',         // Формат времени в логах (MSK если сервер в Europe/Moscow)
      env: {
        NODE_ENV: 'production'                          // Окружение процесса
      }
    },

    // Admin panel (отдельный сервер админ-панели)
    {
      name: 'admin-server',                             // Процесс админ-панели
      script: 'backend/admin/admin-server.mjs',         // Точка входа
      instances: 1,                                     // Одна копия
      max_memory_restart: '256M',                       // Лимит памяти
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',         // Таймстемпы в логах
      env: {
        NODE_ENV: 'production'                          // Режим продакшена
      }
    },

    // News server (сервер новостей, RSS и т.п.)
    {
      name: 'news-server',                              // Имя процесса новостного сервиса
      script: 'backend/news/news-server.mjs',           // Скрипт запуска news-сервера
      instances: 1,                                     // Одна копия
      max_memory_restart: '256M',                       // Лимит памяти
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',         // Время в логах (MSK при правильном TZ сервера)
      env: {
        NODE_ENV: 'production'                          // Режим продакшена
      }
    },

    // Leaderboard / games (таблицы лидеров)
    {
      name: 'leaderboard-server',                       // Имя процесса лидеров/игр
      script: 'backend/games/leaderboard-server.mjs',   // Скрипт запуска
      instances: 1,                                     // Одна копия
      max_memory_restart: '256M',                       // Лимит памяти
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',         // Логирование с датой/временем
      env: {
        NODE_ENV: 'production'
      }
    },

    // Workers (фоновая обработка писем и т.п.)
    {
      name: 'onnmail-server',                           // Процесс e-mail (OnnMail)
      script: 'backend/auth/onnmail-server.mjs',        // Точка входа
      instances: 1,
      max_memory_restart: '256M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',         // Таймстемпы в логах
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'password-reset-server',                    // Сервер сброса пароля
      script: 'backend/auth/password-reset-server.mjs',
      instances: 1,
      max_memory_restart: '256M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',         // Таймстемпы в логах
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'check-pro',                                // Периодическая проверка подписки PRO
      script: 'backend/checkPro/checkPro.mjs',
      instances: 1,
      max_memory_restart: '256M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',         // Таймстемпы в логах
      env: {
        NODE_ENV: 'production'
      }
    },

    // Telegram-боты
    {
      name: 'memebot',                                  // Мем-бот
      script: 'backend/telegram_bots/meme-bot/meme-bot.mjs',
      instances: 1,
      max_memory_restart: '256M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',         // Таймстемпы в логах
      env: {
        NODE_ENV: 'production'
      }
    },

    // Внешние боты в /var/www — поднимаются с этого же ecosystem
    {
      name: 'autoReplyBot',                             // Auto-reply бот автоответчик vk
      script: '/var/www/bots/autoReplyBot/autoReplyBot.mjs',
      instances: 1,
      max_memory_restart: '256M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',         // Таймстемпы в логах
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'communityBotBlog',                         // Бот для блога в vk
      script: '/var/www/bots/communityBotBlog/communityBotBlog.mjs',
      instances: 1,
      max_memory_restart: '256M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',         // Таймстемпы в логах
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'communityBotSite',                         // Бот для сообщества оф сайта в вк
      script: '/var/www/bots/communityBotSite/communityBotSite.mjs',
      instances: 1,
      max_memory_restart: '256M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',         // Таймстемпы в логах
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'serpmonnKeeperBot',                        // Keeper-бот (для беседы вк)
      script: '/var/www/bots/serpmonnKeeperBot/serpmonnKeeperBot.mjs',
      instances: 1,
      max_memory_restart: '256M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',         // Таймстемпы в логах
      env: {
        NODE_ENV: 'production'
      }
    },

    {
      name: 'goaccess-realtime',                        // Периодический запуск goaccess (realtime)
      script: '/var/www/serpmonn.ru/analytics/goaccess-realtime.sh',
      cron_restart: '*/5 * * * *',                      // Запуск каждые 5 минут
      autorestart: false,                               // Не перезапускать при завершении
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'          // Таймстемпы в логах скрипта
    },
    {
      name: 'goaccess-errors',                          // Периодический запуск goaccess (ошибки)
      script: '/var/www/serpmonn.ru/analytics/goaccess-errors.sh',
      cron_restart: '*/5 * * * *',                      // Запуск каждые 5 минут
      autorestart: false,                               // Не перезапускать при завершении
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'          // Таймстемпы в логах скрипта
    }
  ]
};
