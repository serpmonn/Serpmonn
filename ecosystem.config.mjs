// ecosystem.config.mjs
export default {
  apps: [
    {
      name: 'serpmonn-auth',
      script: './backend/server.mjs',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'serpmonn-news',
      script: './backend/news/news-server.mjs',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'serpmonn-leaderboard',
      script: './backend/games/leaderboard-server.mjs',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'serpmonn-xcar',
      script: './backend/X-Car/x-car-server.mjs',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'serpmonn-onnmail',
      script: './backend/auth/onnmail-server.mjs',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'serpmonn-password-reset',
      script: './backend/auth/password-reset-server.mjs',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'serpmonn-games-bot',
      script: './backend/telegram_bots/Serpmonn_games/Serpmonn_games.mjs',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'serpmonn-confirm-bot',
      script: './backend/telegram_bots/SerpmonnConfirmBot/SerpmonnConfirmBot.mjs',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'serpmonn-meme-bot',
      script: './backend/telegram_bots/meme-bot/meme-bot.mjs',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
}