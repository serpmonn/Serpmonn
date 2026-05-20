module.exports = {
  // Массив приложений (процессов), которыми управляет PM2
  apps: [
    // API / основной backend (авторизация, основной HTTP-сервер)
    {
      name: 'auth-server',                      // Имя процесса в PM2 (pm2 status/pm2 logs)
      script: 'backend/server.mjs',             // Точка входа для сервера
      instances: 1,                             // Кол-во копий процесса (1 = одна копия, другие копии для балансировки трафика)
      max_memory_restart: '512M',               // Перезапустить, если процесс съел больше 512 МБ
      env: {
        NODE_ENV: 'production'                  // Окружение внутри процесса (process.env.NODE_ENV)
      }
    },

    // News server (сервер новостей, RSS и т.п.)
    {
      name: 'news-server',                      // Имя процесса для новостного сервиса
      script: 'backend/news/news-server.mjs',   // Файл запуска news-сервера
      instances: 1,                             // Одна копия достаточно
      max_memory_restart: '256M',               // Лимит памяти для новостного сервиса
      env: {
        NODE_ENV: 'production'                  // Работает в режиме продакшена
      }
    },

    // Leaderboard / games (таблицы лидеров)
    {
      name: 'leaderboard-server',               // Имя процесса для серверной части игр/лидерборда
      script: 'backend/games/leaderboard-server.mjs', // Скрипт запуска
      instances: 1,                             // Одна копия
      max_memory_restart: '256M',               // Лимит памяти
      env: {
        NODE_ENV: 'production'
      }
    },

    // Workers (фоновая обработка писем и т.п.)
    {
      name: 'onnmail-server',                   // Процесс, который занимается email (OnnMail)
      script: 'backend/auth/onnmail-server.mjs',
      instances: 1,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'password-reset-server',            // Сервер для сброса пароля (отправка ссылок и т.п.)
      script: 'backend/auth/password-reset-server.mjs',
      instances: 1,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'check-pro',                        // Периодическая проверка подписки PRO
      script: 'backend/checkPro/checkPro.mjs',
      instances: 1,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production'
      }
    },

    // Telegram‑боты
    {
      name: 'serpmonngamesbot',                 // Telegram-бот для игр Serpmonn_games
      script: 'backend/telegram_bots/Serpmonn_games/Serpmonn_games.mjs',
      instances: 1,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'serpmonnconfirmbot',               // Бот подтверждения (например, коды/связка аккаунтов)
      script: 'backend/telegram_bots/SerpmonnConfirmBot/SerpmonnConfirmBot.mjs',
      instances: 1,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'memebot',                          // Мем-бот
      script: 'backend/telegram_bots/meme-bot/meme-bot.mjs',
      instances: 1,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production'
      }
    },

    // AI search (отдельный сервис поиска с ИИ)
    {
      name: 'ai-search',                        // Процесс AI-поиска
      script: 'backend/ai-search/ai-search.mjs',
      instances: 1,
      max_memory_restart: '512M',               // Можно дать побольше памяти (модели, запросы)
      env: {
        NODE_ENV: 'production'
      }
    },

    // Внешние боты в /var/www — поднимаются с этого же ecosystem
    {
      name: 'autoReplyBot',                     // Auto-reply бот (путь вне репозитория)
      script: '/var/www/bots/autoReplyBot/autoReplyBot.mjs',
      instances: 1,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'communityBotBlog',                 // Бот для блога (сообщество)
      script: '/var/www/bots/communityBotBlog/communityBotBlog.mjs',
      instances: 1,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'communityBotSite',                 // Бот для сайта (сообщество)
      script: '/var/www/bots/communityBotSite/communityBotSite.mjs',
      instances: 1,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'serpmonnKeeperBot',                // Keeper-бот (служебный)
      script: '/var/www/bots/serpmonnKeeperBot/serpmonnKeeperBot.mjs',
      instances: 1,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: "goaccess-realtime",
      script: "/var/www/serpmonn.ru/analytics/goaccess-realtime.sh",
      cron_restart: "*/5 * * * *",
      autorestart: false
    },
    {
      name: "goaccess-errors",
      script: "/var/www/serpmonn.ru/analytics/goaccess-errors.sh",
      cron_restart: "*/5 * * * *",
      autorestart: false
    }
  ]
};