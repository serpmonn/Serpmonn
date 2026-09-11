module.exports = {
  apps: [{
    name: 'search-server',
    script: './backend/search-server.mjs',
    cwd: '/var/www/serpmonn-dev',
    interpreter: '/root/.nvm/versions/node/v22.22.0/bin/node',
    exec_mode: 'fork',
    instances: 1,
    max_memory_restart: '512M',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    env: {
      NODE_ENV: 'production',
      AI_SEARCH_PORT: '3501'
    }
  }]
};
