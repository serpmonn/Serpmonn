module.exports = {
  apps: [
    // Псевдо-realtime общий отчёт (обновление каждые 5 минут)
    {
      name: "goaccess-realtime",
      script: "bash",
      args: [
        "-lc",
        "goaccess /var/log/nginx/access.log " +
        "--log-format=COMBINED " +
        "--time-format=%T " +
        "--date-format=%d/%b/%Y " +
        "-o /var/www/serpmonn.ru/analytics/analytics.html"
      ],
      cron_restart: "*/5 * * * *",
      autorestart: false
    },

    // Отчёт по ошибкам (4xx/5xx) раз в 5 минут
    {
      name: "goaccess-errors",
      script: "bash",
      args: [
        "-lc",
        "grep ' 4[0-9][0-9] ' /var/log/nginx/access.log | " +
        "goaccess - " +
        "--log-format=COMBINED " +
        "--time-format=%T " +
        "--date-format=%d/%b/%Y " +
        "-o /var/www/serpmonn.ru/analytics/analytics-errors.html"
      ],
      cron_restart: "*/5 * * * *",
      autorestart: false
    }
  ]
};
