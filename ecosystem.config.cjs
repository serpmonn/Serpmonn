module.exports = {                                      // Экспорт конфигурации PM2
  apps: [                                               // Массив описаний процессов

    // API / основной backend (авторизация, основной HTTP-сервер)
    {
      name: 'auth-server',                              // Имя процесса в PM2 (pm2 status / pm2 logs)
      script: 'backend/server.mjs',                     // Точка входа сервера
      instances: 1,                                     // Кол-во копий процесса
      max_memory_restart: '512M',                       // Перезапуск при превышении 512 МБ
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',         // Формат времени в логах
      env: {
        NODE_ENV: 'production'
      }
    },

    // Admin panel (отдельный сервер админ-панели)
    {
      name: 'admin-server',                             // Процесс админ-панели
      script: 'backend/admin/admin-server.mjs',         // Точка входа
      instances: 1,
      max_memory_restart: '256M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      env: {
        NODE_ENV: 'production'
      }
    },

    // News server (сервер новостей, RSS и т.п.)
    {
      name: 'news-server',                              // Имя процесса новостного сервиса
      script: 'backend/news/news-server.mjs',           // Скрипт запуска news-сервера
      instances: 1,
      max_memory_restart: '256M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      env: {
        NODE_ENV: 'production'
      }
    },

    // Leaderboard / games (таблицы лидеров)
    {
      name: 'leaderboard-server',
      script: 'backend/games/leaderboard-server.mjs',
      instances: 1,
      max_memory_restart: '256M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      env: {
        NODE_ENV: 'production'
      }
    },

    // Workers (фоновая обработка писем и т.п.)
    {
      name: 'onnmail-server',
      script: 'backend/auth/onnmail-server.mjs',
      instances: 1,
      max_memory_restart: '256M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'password-reset-server',
      script: 'backend/auth/password-reset-server.mjs',
      instances: 1,
      max_memory_restart: '256M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'check-pro',
      script: 'backend/checkPro/checkPro.mjs',
      instances: 1,
      max_memory_restart: '256M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      env: {
        NODE_ENV: 'production'
      }
    },

    // Telegram-боты
    {
      name: 'serpmonngamesbot',
      script: 'backend/telegram_bots/Serpmonn_games/Serpmonn_games.mjs',
      instances: 1,
      max_memory_restart: '256M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'serpmonnconfirmbot',
      script: 'backend/telegram_bots/SerpmonnConfirmBot/SerpmonnConfirmBot.mjs',
      instances: 1,
      max_memory_restart: '256M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'memebot',
      script: 'backend/telegram_bots/meme-bot/meme-bot.mjs',
      instances: 1,
      max_memory_restart: '256M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      env: {
        NODE_ENV: 'production'
      }
    },

    // Внешние боты в /var/www
    {
      name: 'autoReplyBot',
      script: '/var/www/bots/autoReplyBot/autoReplyBot.mjs',
      instances: 1,
      max_memory_restart: '256M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'communityBotBlog',
      script: '/var/www/bots/communityBotBlog/communityBotBlog.mjs',
      instances: 1,
      max_memory_restart: '256M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'communityBotSite',
      script: '/var/www/bots/communityBotSite/communityBotSite.mjs',
      instances: 1,
      max_memory_restart: '256M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'serpmonnKeeperBot',
      script: '/var/www/bots/serpmonnKeeperBot/serpmonnKeeperBot.mjs',
      instances: 1,
      max_memory_restart: '256M',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      env: {
        NODE_ENV: 'production'
      }
    },

    {
      name: 'goaccess-realtime',
      script: '/var/www/serpmonn.ru/analytics/goaccess-realtime.sh',
      cron_restart: '*/5 * * * *',
      autorestart: false,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'goaccess-errors',
      script: '/var/www/serpmonn.ru/analytics/goaccess-errors.sh',
      cron_restart: '*/5 * * * *',
      autorestart: false,
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
