import dotenv from 'dotenv';                                                                                                     // Импортируем dotenv для работы с переменными окружения
import { resolve } from 'path';                                                                                                  // Импортируем resolve для создания абсолютных путей

const nodeEnv = process.env.NODE_ENV || 'development';                                                                           // Определяем текущее окружение: production, test или development
const envPath = nodeEnv === 'production'
    ? '/var/www/serpmonn.ru/backend/.env'                                                                                        // Продакшен: используем основной .env на сервере
    : nodeEnv === 'test'
        ? resolve(process.cwd(), 'backend/.env.test')                                                                            // Тесты: используем отдельный тестовый .env.test
        : resolve(process.cwd(), 'backend/.env');                                                                                // Разработка: используем обычный backend/.env

dotenv.config({ path: envPath });                                                                                                // Загружаем переменные окружения из выбранного файла

import cors from 'cors';                                                                                                         // Импортируем cors для обработки междоменных HTTP запросов
import express from 'express';                                                                                                   // Импортируем express для создания веб-сервера
import cookieParser from 'cookie-parser';                                                                                        // Импортируем cookie-parser для работы с cookies
import rateLimit from 'express-rate-limit';                                                                                      // Импортируем ограничитель частоты запросов для защиты от DDoS
import helmet from 'helmet';                                                                                                     // Импортируем Helmet для установки защитных HTTP-заголовков
import { doubleCsrf } from 'csrf-csrf';                                                                                          // Импортируем CSRF middleware для защиты от межсайтовых запросов
import { connectRoutes } from './routes/routes.mjs';                                                                             // Импортируем функцию централизованного подключения маршрутов

const app = express();                                                                                                           // Создаем экземпляр Express приложения
app.set('trust proxy', 1);                                                                                                       // Доверяем первому прокси (например, Nginx) для корректного IP

app.use(helmet());                                                                                                               // Подключаем стандартный набор защитных HTTP-заголовков для Express

// Порты из переменных окружения
const AUTH_PORT = process.env.AUTH_PORT;                                                                                         // Порт для auth сервера (только из .env)
const VITE_PORT = process.env.VITE_PORT;                                                                                         // Порт Vite dev сервера (из .env или 5173 по умолчанию)

const corsOptions = {                                                                                                            // Определяем настройки CORS для безопасности междоменных запросов
    origin: [                                                                                                                    // Указываем разрешенные источники (домены) для доступа к API
        'https://serpmonn.ru',                                                                                                   // Разрешаем основной домен serpmonn.ru
        'https://www.serpmonn.ru',                                                                                               // Разрешаем домен с www префиксом
        `http://localhost:${VITE_PORT}`,                                                                                         // Разрешаем локальный Vite dev сервер (порт из .env)
        `http://127.0.0.1:${VITE_PORT}`,                                                                                         // Разрешаем альтернативный адрес Vite dev сервера
        `http://localhost:${AUTH_PORT}`,                                                                                         // Разрешаем доступ с того же домена (auth сервер, порт из .env)
        `http://127.0.0.1:${AUTH_PORT}`                                                                                          // Разрешаем альтернативный адрес auth сервера
    ],
    credentials: true,                                                                                                           // Разрешаем отправку cookies через междоменные запросы
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],                                                                        // Указываем разрешенные HTTP методы для CORS запросов
    allowedHeaders: ['Authorization', 'Content-Type', 'Accept', 'Origin', 'X-CSRF-Token', 'X-Idempotency-Key']                   // Указываем разрешенные заголовки в CORS запросах
};

app.use(cors(corsOptions));                                                                                                      // Применяем CORS с заданными настройками ко всем маршрутам

let isShuttingDown = false;                                                                                                      // Флаг: идёт ли graceful shutdown

process.on('SIGTERM', () => { isShuttingDown = true; });                                                                         // При SIGTERM помечаем: сервер завершается
process.on('SIGINT',  () => { isShuttingDown = true; });                                                                         // При SIGINT (Ctrl+C) тоже

function getHealthData() {                                                                                                       // Собирает диагностические данные о процессе
    const mem = process.memoryUsage();
    const toMb = (b) => Math.round(b / 1024 / 1024 * 100) / 100;

    const smtpConfigured = Boolean(                                                                                              // Проверяем наличие обязательных SMTP-переменных
        process.env.SMTP_HOST &&
        process.env.SMTP_PORT &&
        process.env.SMTP_USER &&
        process.env.SMTP_PASS &&
        process.env.SMTP_FROM
    );

    const ready = !isShuttingDown;                                                                                               // Готов принимать трафик, если не в shutdown

    return {
        status:         ready ? 'ok' : 'shutting_down',                                                                          // Статус: ok / shutting_down
        ready,
        service:        'serpmonn-backend',
        env:            process.env.NODE_ENV,
        pid:            process.pid,                                                                                             // ID процесса — полезно при нескольких воркерах
        uptimeSec:      Math.floor(process.uptime()),                                                                            // Uptime в секундах
        timestamp:      new Date().toISOString(),
        nodeVersion:    process.version,                                                                                         // Версия Node.js
        isShuttingDown,
        memory: {                                                                                                                // Память процесса в мегабайтах
            rssMb:       toMb(mem.rss),                                                                                          // Реальная память процесса (всё вместе)
            heapTotalMb: toMb(mem.heapTotal),                                                                                    // Выделено под кучу
            heapUsedMb:  toMb(mem.heapUsed),                                                                                     // Реально занято в куче
            externalMb:  toMb(mem.external)                                                                                      // Память нативных буферов (Buffer и т.п.)
        },
        checks: {
            smtp: { configured: smtpConfigured }                                                                                 // Позже сюда можно добавить transporter.verify()
        }
    };
}

app.get('/health/live', (_req, res) => {                                                                                         // Liveness: процесс жив и отвечает
    res.status(200).json({
        status:    'ok',
        uptimeSec: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
    });
});

app.get('/health/ready', (_req, res) => {                                                                                        // Readiness: приложение готово принимать трафик
    const data = getHealthData();
    res.status(data.ready ? 200 : 503).json(data);
});

app.get('/health', (_req, res) => {                                                                                              // Полная диагностика — для ручного curl/мониторинга
    const data = getHealthData();
    res.status(data.ready ? 200 : 503).json(data);
});

// ─── Health dashboard (HTML) ────────────────────────────────────────────────
app.get('/health/dashboard', (_req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(`<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Serpmonn Health Dashboard</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    :root {
      --bg: #0b1020;
      --bg-elevated: #111827;
      --border: rgba(148, 163, 184, 0.4);
      --ok: #22c55e;
      --warn: #eab308;
      --bad: #ef4444;
      --text-main: #e5e7eb;
      --text-muted: #9ca3af;
      --accent: #38bdf8;
      --font: system-ui, -apple-system, BlinkMacSystemFont, 'SF Pro Text',
               'Segoe UI', sans-serif;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      min-height: 100vh;
      background: radial-gradient(circle at top left, #1d283a, #020617 60%);
      font-family: var(--font);
      color: var(--text-main);
      display: flex;
      align-items: stretch;
      justify-content: center;
      padding: 16px;
    }

    .shell {
      width: 100%;
      max-width: 960px;
      margin: auto;
      border-radius: 16px;
      background: linear-gradient(135deg, rgba(148,163,184,0.16), transparent);
      padding: 1px;
      box-shadow:
        0 18px 45px rgba(15, 23, 42, 0.8),
        0 0 0 1px rgba(15, 23, 42, 0.9);
    }

    .card {
      background: radial-gradient(circle at top, #111827, #020617 80%);
      border-radius: 15px;
      padding: 20px 20px 18px;
      border: 1px solid rgba(15, 23, 42, 1);
    }

    header {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      align-items: center;
      margin-bottom: 16px;
    }

    .title-block {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    h1 {
      font-size: 18px;
      margin: 0;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #f9fafb;
    }

    h1 span.badge {
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 999px;
      border: 1px solid rgba(148, 163, 184, 0.5);
      color: var(--text-muted);
      text-transform: none;
      letter-spacing: 0;
      background: rgba(15, 23, 42, 0.9);
    }

    .subtitle {
      font-size: 13px;
      color: var(--text-muted);
    }

    .status-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 12px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      border: 1px solid var(--border);
      background: rgba(15, 23, 42, 0.85);
    }

    .dot {
      width: 9px;
      height: 9px;
      border-radius: 999px;
      box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.8);
    }
    .dot.ok { background: var(--ok); box-shadow: 0 0 12px rgba(34, 197, 94, 0.65); }
    .dot.warn { background: var(--warn); box-shadow: 0 0 12px rgba(234, 179, 8, 0.65); }
    .dot.bad { background: var(--bad); box-shadow: 0 0 12px rgba(239, 68, 68, 0.65); }

    .pill-row {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
    }

    .pill {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 2px 9px;
      border-radius: 999px;
      border: 1px solid rgba(31, 41, 55, 1);
      background: rgba(15, 23, 42, 0.9);
      color: var(--text-muted);
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .pill strong {
      font-weight: 500;
      color: #e5e7eb;
    }

    .pill .sep {
      opacity: 0.4;
    }

    .grid {
      display: grid;
      grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
      gap: 16px;
    }

    @media (max-width: 720px) {
      .grid { grid-template-columns: minmax(0, 1fr); }
      .shell { padding: 0; border-radius: 12px; }
      .card { border-radius: 11px; padding: 16px 14px 14px; }
      header { flex-direction: column; align-items: flex-start; }
    }

    .panel {
      background: radial-gradient(circle at top left, rgba(30,64,175,0.35), rgba(15,23,42,0.95));
      border-radius: 11px;
      padding: 14px 12px 12px;
      border: 1px solid rgba(30, 64, 175, 0.5);
      box-shadow:
        0 12px 25px rgba(15, 23, 42, 0.8),
        inset 0 0 0 0.5px rgba(148, 163, 184, 0.25);
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      gap: 8px;
    }

    .panel-title {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      color: #bfdbfe;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    .panel-title span.icon {
      display: inline-flex;
      width: 18px;
      height: 18px;
      align-items: center;
      justify-content: center;
      border-radius: 7px;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(96, 165, 250, 0.6);
      font-size: 11px;
      color: #93c5fd;
    }

    .panel-sub {
      font-size: 11px;
      color: var(--text-muted);
    }

    .metric-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-top: 4px;
    }

    .metric {
      min-width: 0;
      padding: 6px 8px;
      border-radius: 9px;
      border: 1px solid rgba(30, 64, 175, 0.65);
      background: rgba(15, 23, 42, 0.9);
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .metric-label {
      font-size: 11px;
      color: #9ca3af;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .metric-value {
      font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
      font-size: 13px;
      color: #e5e7eb;
    }

    .metric-value.ok { color: var(--ok); }
    .metric-value.warn { color: var(--warn); }
    .metric-value.bad { color: var(--bad); }

    .kv {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
      gap: 4px 10px;
      font-size: 12px;
      align-items: baseline;
    }

    .kv dt {
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .kv dd {
      margin: 0;
      text-align: right;
      font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
      color: #e5e7eb;
    }

    .kv dd.muted { color: var(--text-muted); }

    .footer-row {
      display: flex;
      justify-content: space-between;
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px dashed rgba(55, 65, 81, 0.7);
      font-size: 11px;
      color: var(--text-muted);
      gap: 8px;
      flex-wrap: wrap;
    }

    .badge-mini {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 7px;
      border-radius: 999px;
      border: 1px solid rgba(55, 65, 81, 0.9);
      background: rgba(15, 23, 42, 0.95);
    }

    .badge-mini span {
      font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
    }

    .badge-mini .dot-mini {
      width: 6px;
      height: 6px;
      border-radius: 999px;
      background: var(--accent);
    }
  </style>
</head>
<body>
  <main class="shell">
    <section class="card">
      <header>
        <div class="title-block">
          <h1>
            Serpmonn backend
            <span class="badge">health dashboard</span>
          </h1>
          <div class="subtitle">
            Живой статус бэкенда: uptime, память, окружение и основные проверки.
          </div>
        </div>
        <div id="statusChip" class="status-chip">
          <span class="dot dot-bad"></span>
          <span id="statusText">Ожидание...</span>
        </div>
      </header>

      <div class="pill-row">
        <div class="pill"><strong>service</strong><span class="sep">·</span><span id="pillService">—</span></div>
        <div class="pill"><strong>env</strong><span class="sep">·</span><span id="pillEnv">—</span></div>
        <div class="pill"><strong>pid</strong><span class="sep">·</span><span id="pillPid">—</span></div>
        <div class="pill"><strong>node</strong><span class="sep">·</span><span id="pillNode">—</span></div>
        <div class="pill"><strong>last</strong><span class="sep">·</span><span id="pillLast">—</span></div>
      </div>

      <div class="grid">
        <section class="panel">
          <div class="panel-header">
            <div class="panel-title">
              <span class="icon">⚙</span> Runtime
            </div>
            <div class="panel-sub" id="runtimeSub">Uptime: —</div>
          </div>
          <div class="metric-row">
            <div class="metric">
              <div class="metric-label">Uptime</div>
              <div class="metric-value" id="metricUptime">—</div>
            </div>
            <div class="metric">
              <div class="metric-label">Shutting down</div>
              <div class="metric-value" id="metricShutdown">—</div>
            </div>
            <div class="metric">
              <div class="metric-label">Status</div>
              <div class="metric-value" id="metricStatus">—</div>
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="panel-header">
            <div class="panel-title">
              <span class="icon">🧠</span> Memory
            </div>
            <div class="panel-sub">rss / heap used / heap total</div>
          </div>
          <dl class="kv">
            <dt>RSS (process)</dt>
            <dd id="memRss">—</dd>
            <dt>Heap used</dt>
            <dd id="memHeapUsed">—</dd>
            <dt>Heap total</dt>
            <dd id="memHeapTotal">—</dd>
            <dt>External</dt>
            <dd id="memExternal" class="muted">—</dd>
          </dl>
        </section>
      </div>

      <div class="grid" style="margin-top: 14px;">
        <section class="panel">
          <div class="panel-header">
            <div class="panel-title">
              <span class="icon">🔗</span> Checks
            </div>
            <div class="panel-sub">Критичные зависимости приложения</div>
          </div>
          <div class="metric-row">
            <div class="metric">
              <div class="metric-label">SMTP config</div>
              <div class="metric-value" id="checkSmtp">—</div>
            </div>
            <div class="metric">
              <div class="metric-label">Ready flag</div>
              <div class="metric-value" id="checkReady">—</div>
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="panel-header">
            <div class="panel-title">
              <span class="icon">🕒</span> Timestamps
            </div>
            <div class="panel-sub">Серверное время и интервал обновления</div>
          </div>
          <dl class="kv">
            <dt>Server timestamp</dt>
            <dd id="tsServer">—</dd>
            <dt>Local time</dt>
            <dd id="tsLocal">—</dd>
            <dt>Last update</dt>
            <dd id="tsLast">—</dd>
            <dt>Interval</dt>
            <dd id="tsInterval" class="muted">—</dd>
          </dl>
        </section>
      </div>

      <div class="footer-row">
        <div>Статус обновляется каждые <span id="footerInterval">10</span> секунд без кеширования.</div>
        <div class="badge-mini">
          <div class="dot-mini"></div>
          <span id="footerSource">/health</span>
        </div>
      </div>
    </section>
  </main>

  <script>
    const INTERVAL_SEC = 10;
    const HEALTH_URL = '/health';

    const el = (id) => document.getElementById(id);

    const statusChip = el('statusChip');
    const statusText = el('statusText');

    function setStatusChip(ready, status, error) {
      statusChip.classList.remove('bad', 'ok', 'warn');
      const dot = statusChip.querySelector('.dot');
      dot.className = 'dot';

      if (error) {
        dot.classList.add('bad');
        statusText.textContent = 'UNAVAILABLE';
        return;
      }

      if (ready) {
        dot.classList.add('ok');
        statusText.textContent = 'OK · ' + (status || 'ready');
      } else if (status === 'shutting_down') {
        dot.classList.add('warn');
        statusText.textContent = 'SHUTTING DOWN';
      } else {
        dot.classList.add('warn');
        statusText.textContent = (status || 'degraded').toUpperCase();
      }
    }

    function formatUptime(sec) {
      if (typeof sec !== 'number' || !isFinite(sec)) return '—';
      const d = Math.floor(sec / 86400);
      const h = Math.floor((sec % 86400) / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = Math.floor(sec % 60);
      const parts = [];
      if (d) parts.push(d + 'd');
      if (h) parts.push(h + 'h');
      if (m) parts.push(m + 'm');
      if (!parts.length) parts.push(s + 's');
      return parts.join(' ');
    }

    function setText(id, value) {
      const node = el(id);
      if (!node) return;
      node.textContent = value;
    }

    function updateFromData(data) {
      const ready = !!data.ready;
      const status = data.status || 'unknown';

      setStatusChip(ready, status, false);

      setText('pillService', data.service || '—');
      setText('pillEnv', data.env || '—');
      setText('pillPid', data.pid ?? '—');
      setText('pillNode', data.nodeVersion || '—');
      setText('pillLast', data.timestamp || '—');

      const uptimeSec = data.uptimeSec ?? 0;
      const uptimeString = formatUptime(uptimeSec);
      setText('runtimeSub', 'Uptime: ' + uptimeString);
      setText('metricUptime', uptimeString);
      setText('metricShutdown', data.isShuttingDown ? 'yes' : 'no');
      setText('metricStatus', status);

      const mem = data.memory || {};
      const fmt = (v) => (typeof v === 'number' ? v.toFixed(2) + ' MB' : '—');
      setText('memRss', fmt(mem.rssMb));
      setText('memHeapUsed', fmt(mem.heapUsedMb));
      setText('memHeapTotal', fmt(mem.heapTotalMb));
      setText('memExternal', fmt(mem.externalMb));

      const smtpConf = data.checks && data.checks.smtp && data.checks.smtp.configured;
      const smtpEl = el('checkSmtp');
      smtpEl.textContent = smtpConf ? 'configured' : 'missing';
      smtpEl.className = 'metric-value ' + (smtpConf ? 'ok' : 'bad');

      const readyEl = el('checkReady');
      readyEl.textContent = ready ? 'true' : 'false';
      readyEl.className = 'metric-value ' + (ready ? 'ok' : 'warn');

      setText('tsServer', data.timestamp || '—');
      setText('tsLocal', new Date().toISOString());
      setText('tsLast', new Date().toLocaleTimeString('ru-RU'));

      setText('tsInterval', INTERVAL_SEC + 's');
      setText('footerInterval', INTERVAL_SEC.toString());
    }

    async function tick() {
      try {
        const res = await fetch(HEALTH_URL, { cache: 'no-store' });
        if (!res.ok) {
          setStatusChip(false, 'http ' + res.status, true);
          return;
        }
        const data = await res.json();
        updateFromData(data);
      } catch (err) {
        console.error('Health fetch error:', err);
        setStatusChip(false, 'error', true);
      }
    }

    setText('tsInterval', INTERVAL_SEC + 's');
    setText('footerInterval', INTERVAL_SEC.toString());
    setText('footerSource', HEALTH_URL);

    tick();
    setInterval(tick, INTERVAL_SEC * 1000);
  </script>
</body>
</html>`);
});

app.use((req, res, next) => {                                                                                                    // Middleware: установка заголовка Content-Language по <html lang> страницы/пути
    try {
        const parts = req.path.split('/').filter(Boolean);                                                                       // Разбиваем путь на части и убираем пустые элементы
        const idx = parts.indexOf('frontend');                                                                                   // Ищем индекс 'frontend' в пути
        let lang = 'ru';                                                                                                         // Устанавливаем русский язык по умолчанию

        if (idx !== -1 && parts[idx + 1]) {                                                                                      // Если нашли 'frontend' и есть следующий элемент
            lang = parts[idx + 1].toLowerCase();                                                                                 // Используем следующий элемент как язык
        }

        if (lang === 'pt-br') lang = 'pt-BR';                                                                                    // Нормализуем бразильский португальский
        if (lang === 'pt-pt') lang = 'pt-PT';                                                                                    // Нормализуем европейский португальский

        res.setHeader('Content-Language', lang);                                                                                 // Устанавливаем заголовок Content-Language
    } catch {}                                                                                                                   // Игнорируем ошибки разбора пути, чтобы не ломать основной запрос

    next();                                                                                                                      // Передаем управление следующему middleware
});

app.use(cookieParser());                                                                                                         // Включаем парсинг cookies из заголовков запросов

app.use('/voice/stt', express.raw({                                                                                              // Middleware для парсинга бинарных аудиоданных (ДО express.json!)
    type: ['audio/webm', 'audio/ogg', 'audio/wav', 'audio/mpeg', 'audio/webm;codecs=opus'],                                      // Разрешаем поддерживаемые аудио MIME-типы
    limit: '10mb'                                                                                                                // Ограничиваем размер аудиофайла до 10 мегабайт
}));

app.use(express.json({                                                                                                           // Парсинг JSON в запросах с защитой от атаки с огромными телами запросов
    limit: '10kb',                                                                                                               // Ограничиваем размер JSON тела до 10 килобайт
    strict: true                                                                                                                 // Включаем строгий режим парсинга JSON
}));

app.use(express.urlencoded({                                                                                                     // Парсинг URL-encoded данных из форм и запросов
    extended: true,                                                                                                              // Включаем расширенный парсинг с поддержкой сложных объектов
    limit: '10kb',                                                                                                               // Ограничиваем размер данных до 10 килобайт
    parameterLimit: 10                                                                                                           // Ограничиваем количество параметров до 10
}));

const apiLimiter = rateLimit({                                                                                                   // Глобальный лимитер запросов (защита от DoS/брютфорса)
    windowMs: 15 * 60 * 1000,                                                                                                    // Окно времени - 15 минут в миллисекундах
    max: 300,                                                                                                                    // Максимум 300 запросов за 15 минут от одного IP
    standardHeaders: true,                                                                                                       // Возвращать стандартные заголовки лимита (RateLimit-*)
    legacyHeaders: false                                                                                                         // Не использовать устаревшие заголовки (X-RateLimit-*)
});
app.use(apiLimiter);                                                                                                             // Применяем глобальный лимитер ко всем маршрутам

const authLimiter = rateLimit({                                                                                                  // Отдельный лимитер для маршрутов авторизации
    windowMs: 15 * 60 * 1000,                                                                                                    // Окно ограничения — 15 минут
    max: 10,                                                                                                                     // Максимум 10 запросов на авторизационные маршруты за окно
    standardHeaders: true,                                                                                                       // Возвращаем стандартные заголовки лимита (RateLimit-*)
    legacyHeaders: false,                                                                                                        // Не используем устаревшие заголовки (X-RateLimit-*)
    message: {
        status: 'error',
        message: 'Too many authentication attempts'
    }                                                                                                                            // Сообщение при превышении лимита попыток
});

const csrfTools = doubleCsrf({
    getSecret: () => process.env.CSRF_SECRET,                                                                                    // Берём секрет из переменной окружения
    getSessionIdentifier: (req) => `${req.ip || 'unknown-ip'}:${req.get('user-agent') || 'unknown-ua'}`,                         // Формируем идентификатор сессии для CSRF из IP и User-Agent
    cookieName: '__Host-psifi.x-csrf-token',                                                                                     // Имя cookie с CSRF-токеном
    cookieOptions: {
        httpOnly: true,
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
        path: '/'
    },
    size: 64,
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS']
});

const {
    generateCsrfToken,                                                                                                           // Правильная функция генерации CSRF-токена в текущей версии csrf-csrf
    validateRequest,
    doubleCsrfProtection,
    invalidCsrfTokenError
} = csrfTools;

app.get('/csrf-token', (req, res) => {                                                                                           // Эндпоинт выдачи CSRF-токена клиенту
    return res.status(200).json({ csrfToken: generateCsrfToken(req, res) });                                                    // Генерируем и возвращаем токен правильной функцией
});

connectRoutes(app, authLimiter);                                                                                                 // Централизованно подключаем все маршруты приложения

// ВРЕМЕННО: CSRF middleware стоит внизу
// После поэтапного тестирования будем поднимать выше или вешать точечно на нужные роуты.
app.use(doubleCsrfProtection);                                                                                                   // Временно подключаем глобальную CSRF-защиту внизу, чтобы не затронуть уже объявленные выше маршруты

app.use((err, req, res, next) => {                                                                                               // Обработчик ошибок (после всех роутов и middleware)
    if (err === invalidCsrfTokenError || err?.code === 'INVALID_CSRF_TOKEN') {                                                  // Отдельно обрабатываем ошибки невалидного CSRF токена
        return res.status(403).json({ status: 'error', message: 'Invalid CSRF token' });                                        // Возвращаем ошибку 403 при невалидном CSRF токене
    }

    console.error('[ERROR]', err.stack);                                                                                         // Логируем полный стек ошибки для отладки
    res.status(500).json({                                                                                                       // Отправляем клиенту универсальную ошибку 500
        status: 'error',
        message: 'Internal Server Error'
    });
});

// Запуск основного auth сервера
const PORT = process.env.AUTH_PORT;                                                                                              // Получаем порт основного сервера из переменной окружения

if (process.env.NODE_ENV !== 'test') {                                                                                           // Не запускаем сервер автоматически в тестовой среде
    app.listen(PORT, () => {                                                                                                     // Запускаем сервер на указанном порту
        console.log(`Сервер работает на порту ${PORT}`);                                                                         // Логируем успешный запуск сервера
    });
}

export default app;                                                                                                              // Экспортируем Express-приложение для тестов и повторного использования