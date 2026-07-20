import net from 'net';
import fs from 'fs';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { query } from '../database/config.mjs';

const execFileAsync = promisify(execFile);

const SEARXNG_SOCKET = '/usr/local/searxng/run/socket';
const OLLAMA_URL = process.env.OLLAMA_STATUS_URL || 'http://127.0.0.1:11434/api/tags';
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = Number(process.env.REDIS_PORT || 6379);

function formatUptime(ms) {
  if (!ms || ms < 0) return null;
  const sec = Math.floor(ms / 1000);
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d} д. ${h} ч.`;
  if (h > 0) return `${h} ч. ${m} мин.`;
  if (m > 0) return `${m} мин.`;
  return `${sec} сек.`;
}

function formatBytes(n) {
  const num = Number(n);
  if (!Number.isFinite(num) || num < 0) return '—';
  const units = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'];
  let v = num;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i += 1;
  }
  const digits = i === 0 ? 0 : (v >= 10 ? 0 : 1);
  return `${v.toFixed(digits)} ${units[i]}`;
}

function readCpuTimes() {
  let idle = 0;
  let total = 0;
  for (const cpu of os.cpus()) {
    const t = cpu.times || {};
    const idlePart = Number(t.idle) || 0;
    const sum =
      (Number(t.user) || 0) +
      (Number(t.nice) || 0) +
      (Number(t.sys) || 0) +
      idlePart +
      (Number(t.irq) || 0) +
      (Number(t.steal) || 0);
    idle += idlePart;
    total += sum;
  }
  return { idle, total };
}

async function sampleCpuPercent(sampleMs = 120) {
  const a = readCpuTimes();
  await new Promise((r) => setTimeout(r, sampleMs));
  const b = readCpuTimes();
  const idle = b.idle - a.idle;
  const total = b.total - a.total;
  if (total <= 0) return null;
  return Math.round((1 - idle / total) * 1000) / 10;
}

function readDiskUsage(path = '/') {
  try {
    if (typeof fs.statfsSync !== 'function') return null;
    const s = fs.statfsSync(path);
    const total = Number(s.blocks) * Number(s.bsize);
    const free = Number(s.bavail) * Number(s.bsize);
    if (!Number.isFinite(total) || total <= 0) return null;
    const used = Math.max(0, total - free);
    return {
      path,
      totalBytes: total,
      usedBytes: used,
      freeBytes: free,
      percent: Math.round((used / total) * 1000) / 10,
    };
  } catch {
    return null;
  }
}

/** Компактная нагрузка хоста для админ-статуса (не htop). */
async function collectHostLoad() {
  const load = os.loadavg().map((n) => Math.round(n * 100) / 100);
  const cores = os.cpus()?.length || 0;
  const memTotal = os.totalmem();
  const memFree = os.freemem();
  const memUsed = Math.max(0, memTotal - memFree);
  const memPercent = memTotal > 0 ? Math.round((memUsed / memTotal) * 1000) / 10 : null;
  const disk = readDiskUsage('/');
  const uptimeSec = Math.floor(os.uptime());
  let cpuPercent = null;
  try {
    cpuPercent = await sampleCpuPercent(120);
  } catch {
    cpuPercent = null;
  }

  return {
    load1: load[0] ?? null,
    load5: load[1] ?? null,
    load15: load[2] ?? null,
    cores,
    cpuPercent,
    memUsedBytes: memUsed,
    memTotalBytes: memTotal,
    memPercent,
    memUsedLabel: formatBytes(memUsed),
    memTotalLabel: formatBytes(memTotal),
    diskPath: disk?.path || '/',
    diskUsedBytes: disk?.usedBytes ?? null,
    diskTotalBytes: disk?.totalBytes ?? null,
    diskPercent: disk?.percent ?? null,
    diskUsedLabel: disk ? formatBytes(disk.usedBytes) : null,
    diskTotalLabel: disk ? formatBytes(disk.totalBytes) : null,
    uptimeSec,
    uptimeLabel: formatUptime(uptimeSec * 1000),
  };
}

function probePort(port, host = '127.0.0.1', timeoutMs = 1500) {
  const num = Number(port);
  if (!Number.isFinite(num) || num <= 0) return Promise.resolve(false);
  return new Promise((resolve) => {
    const socket = net.connect({ port: num, host }, () => {
      socket.end();
      resolve(true);
    });
    socket.setTimeout(timeoutMs);
    socket.on('error', () => resolve(false));
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function probeHttp(url, timeoutMs = 2500, headers = {}) {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers,
    });
    return { ok: res.ok || res.status < 500, status: res.status, data: await res.json().catch(() => null) };
  } catch (err) {
    return { ok: false, status: 0, error: err.message };
  }
}

function probeRedisPing(host = REDIS_HOST, port = REDIS_PORT, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port }, () => {
      socket.write('PING\r\n');
    });
    let buf = '';
    socket.setTimeout(timeoutMs);
    socket.on('data', (chunk) => {
      buf += chunk.toString();
      if (buf.includes('+PONG') || buf.includes('-')) {
        socket.end();
        resolve(buf.includes('+PONG'));
      }
    });
    socket.on('error', () => resolve(false));
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function probeSystemd(unit) {
  try {
    const { stdout } = await execFileAsync('systemctl', ['is-active', unit], {
      timeout: 3000,
      env: process.env,
    });
    return stdout.toString().trim() === 'active';
  } catch {
    return false;
  }
}

/** Docker-демон + состояние контейнера Serpmonn AI (open-webui). */
async function probeDockerAi() {
  const daemonOk = await probeSystemd('docker');
  if (!daemonOk) {
    return { daemonOk: false, containerStatus: null, health: null };
  }
  try {
    const { stdout } = await execFileAsync(
      'docker',
      ['inspect', '-f', '{{.State.Status}}|{{if .State.Health}}{{.State.Health.Status}}{{end}}', 'open-webui'],
      { timeout: 4000, env: process.env }
    );
    const [status, health] = stdout.toString().trim().split('|');
    return {
      daemonOk: true,
      containerStatus: status || null,
      health: health || null,
    };
  } catch {
    return { daemonOk: true, containerStatus: 'missing', health: null };
  }
}

async function probeSearxng() {
  const socketOk = fs.existsSync(SEARXNG_SOCKET);
  const uwsgiOk = await probeSystemd('uwsgi');

  // Лёгкая проверка: процесс + unix-сокет. Без /search — не дёргаем внешние движки.
  if (socketOk && uwsgiOk) {
    return { ok: true, detail: 'uwsgi active · сокет на месте' };
  }
  if (uwsgiOk && !socketOk) {
    return { ok: false, detail: 'uwsgi active, но сокет SearXNG не найден' };
  }
  if (!uwsgiOk && socketOk) {
    return { ok: false, detail: 'Сокет есть, но uwsgi не active' };
  }
  return { ok: false, detail: 'uwsgi не active и сокет не найден' };
}

async function getPm2Map() {
  try {
    const { stdout } = await execFileAsync('pm2', ['jlist'], {
      timeout: 8000,
      maxBuffer: 8 * 1024 * 1024,
      env: process.env,
    });
    const apps = JSON.parse(stdout);
    const map = {};
    for (const app of apps) {
      const env = app.pm2_env || {};
      const name = env.name;
      if (!name) continue;
      const online = env.status === 'online';
      map[name] = {
        status: env.status || 'unknown',
        restarts: env.restart_time ?? 0,
        uptimeMs: online && env.pm_uptime ? Date.now() - env.pm_uptime : 0,
        memoryMb: app.monit?.memory != null ? Math.round(app.monit.memory / 1024 / 1024) : null,
      };
    }
    return map;
  } catch (err) {
    console.error('[admin] pm2 jlist failed:', err.message);
    return null;
  }
}

function buildService({ id, name, why, level, ok, detail, pm2, pm2Name, controlName, actions }) {
  const ctrl = controlName || pm2Name || null;
  return {
    id,
    name,
    why,
    level,
    ok: Boolean(ok),
    detail: detail || null,
    pm2: pm2 || null,
    pm2Name: pm2Name || null,
    controlName: ctrl,
    actions: Array.isArray(actions)
      ? actions
      : (pm2Name ? ['start', 'stop', 'restart'] : []),
  };
}

/** Разрешённые имена PM2 для управления из админки */
export const PM2_ALLOWED = new Set([
  'auth-server',
  'admin-server',
  'news-server',
  'leaderboard-server',
  'password-reset-server',
  'onnmail-server',
  'check-pro',
  'health-alert',
  'communityBotBlog',
  'communityBotSite',
  'serpmonnKeeperBot',
  'autoReplyBot',
  'goaccess-realtime',
  'goaccess-errors',
]);

const PM2_NO_STOP = new Set(['admin-server']);

/**
 * systemd: id в статусе → unit + разрешённые действия.
 * stop у критичных нет — чтобы не отрезать себе доступ удалённо.
 */
const SYSTEMD_CONTROLS = {
  nginx: { unit: 'nginx', actions: ['start', 'restart'] },
  mysql: { unit: 'mysql', actions: ['restart'] },
  ollama: { unit: 'ollama', actions: ['start', 'restart'] },
  uwsgi: { unit: 'uwsgi', actions: ['start', 'restart'] },
  postfix: { unit: 'postfix', actions: ['start', 'stop', 'restart'] },
  dovecot: { unit: 'dovecot', actions: ['start', 'stop', 'restart'] },
  opendkim: { unit: 'opendkim', actions: ['start', 'stop', 'restart'] },
  docker: { unit: 'docker', actions: ['start', 'restart'] },
  'serpmonn-relay': { unit: 'serpmonn-relay', actions: ['start', 'stop', 'restart'] },
};

/** Docker-контейнеры: id в статусе → имя контейнера */
const DOCKER_CONTROLS = {
  'serpmonn-ai': { container: 'open-webui', actions: ['start', 'restart'] },
};

function assertAction(action) {
  if (!['start', 'stop', 'restart'].includes(action)) {
    const err = new Error('Недопустимое действие');
    err.status = 400;
    throw err;
  }
}

/**
 * start | stop | restart процесса PM2 (только из allowlist).
 */
export async function controlPm2Process(name, action) {
  if (!PM2_ALLOWED.has(name)) {
    const err = new Error('Неизвестный сервис');
    err.status = 400;
    throw err;
  }
  assertAction(action);
  if (action === 'stop' && PM2_NO_STOP.has(name)) {
    const err = new Error('Админ-сервер нельзя остановить из панели — только перезапуск');
    err.status = 400;
    throw err;
  }

  await execFileAsync('pm2', [action, name], {
    timeout: 20000,
    maxBuffer: 2 * 1024 * 1024,
    env: process.env,
  });

  return { success: true, name, action, kind: 'pm2' };
}

async function controlSystemdUnit(entry, action) {
  assertAction(action);
  if (!entry.actions.includes(action)) {
    const err = new Error(`Для этого сервиса действие «${action}» недоступно`);
    err.status = 400;
    throw err;
  }
  await execFileAsync('systemctl', [action, entry.unit], {
    timeout: 60000,
    maxBuffer: 2 * 1024 * 1024,
    env: process.env,
  });
  return { success: true, name: entry.unit, action, kind: 'systemd' };
}

async function controlDockerContainer(entry, action) {
  assertAction(action);
  if (!entry.actions.includes(action)) {
    const err = new Error(`Для этого контейнера действие «${action}» недоступно`);
    err.status = 400;
    throw err;
  }
  await execFileAsync('docker', [action, entry.container], {
    timeout: 120000,
    maxBuffer: 2 * 1024 * 1024,
    env: process.env,
  });
  return { success: true, name: entry.container, action, kind: 'docker' };
}

/**
 * Единая точка управления: PM2 / systemd / Docker (только allowlist).
 */
export async function controlManagedService(name, action) {
  if (PM2_ALLOWED.has(name)) {
    return controlPm2Process(name, action);
  }
  if (SYSTEMD_CONTROLS[name]) {
    return controlSystemdUnit(SYSTEMD_CONTROLS[name], action);
  }
  if (DOCKER_CONTROLS[name]) {
    return controlDockerContainer(DOCKER_CONTROLS[name], action);
  }
  const err = new Error('Неизвестный сервис');
  err.status = 400;
  throw err;
}

/**
 * Сводка по критичным сервисам для админ-статуса.
 */
export async function collectSystemStatus() {
  const ports = {
    auth: process.env.AUTH_PORT || 5000,
    admin: process.env.ADMIN_PORT || 8000,
    news: process.env.NEWS_PORT || 4000,
    leaderboard: process.env.LEADERBOARD_PORT || 3000,
    onnmail: process.env.ONNMAIL_PORT || 6000,
    passwordReset: process.env.PASSWORD_RESET_PORT || 6500,
    checkPro: process.env.CHECKPRO_PORT || 7000,
  };

  const pm2 = await getPm2Map();

  const [
    authHttp,
    adminPortOk,
    newsPortOk,
    lbPortOk,
    mailPortOk,
    resetPortOk,
    checkProPortOk,
    nginxActive,
    nginxPortOk,
    ollamaHttp,
    redisOk,
    searx,
    uwsgiActive,
    postfixActive,
    postfix587,
    dovecotActive,
    dovecot993,
    opendkimActive,
    relayActive,
    relay4001,
    whisperHttp,
    openWebuiHttp,
    dockerAi,
  ] = await Promise.all([
    probeHttp(`http://127.0.0.1:${ports.auth}/health`),
    probePort(ports.admin),
    probePort(ports.news),
    probePort(ports.leaderboard),
    probePort(ports.onnmail),
    probePort(ports.passwordReset),
    probePort(ports.checkPro),
    probeSystemd('nginx'),
    probePort(80),
    probeHttp(OLLAMA_URL, 4000),
    probeRedisPing(),
    probeSearxng(),
    probeSystemd('uwsgi'),
    probeSystemd('postfix'),
    probePort(587),
    probeSystemd('dovecot'),
    probePort(993),
    probeSystemd('opendkim'),
    probeSystemd('serpmonn-relay'),
    probePort(4001),
    probeHttp('http://127.0.0.1:8765/health', 4000),
    probeHttp('http://127.0.0.1:8080/health', 4000),
    probeDockerAi(),
  ]);

  const nginxOk = nginxActive || nginxPortOk;
  const ollamaOk = ollamaHttp.ok;
  const ollamaModels = Array.isArray(ollamaHttp.data?.models) ? ollamaHttp.data.models.length : null;
  const searxOk = searx.ok;

  let mysqlOk = false;
  let mysqlMs = null;
  try {
    const t0 = Date.now();
    await query('SELECT 1 AS ok');
    mysqlMs = Date.now() - t0;
    mysqlOk = true;
  } catch (err) {
    console.error('[admin] mysql check failed:', err.message);
  }

  const smtpConfigured = Boolean(
    process.env.SMTP_PASS &&
    (process.env.SMTP_USER || process.env.SMTP_HOST)
  );
  const postfixOk = postfixActive && postfix587;
  const dovecotOk = dovecotActive && dovecot993;
  const whisperOk = whisperHttp.ok && whisperHttp.data?.status === 'ok';
  const relayOk = relayActive && relay4001;
  const openWebuiOk = openWebuiHttp.ok || openWebuiHttp.status > 0;
  const dockerOk = dockerAi.daemonOk;
  const dockerContainerRunning = dockerAi.containerStatus === 'running';
  const authPm = pm2?.['auth-server'];
  const authOk = authHttp.ok && authHttp.data?.ready !== false;

  const critical = [
    buildService({
      id: 'nginx',
      name: 'Nginx',
      why: 'Отдаёт сайт наружу (HTTP/HTTPS)',
      level: 'critical',
      ok: nginxOk,
      detail: nginxOk ? (nginxActive ? 'Сервис active' : 'Порт 80 открыт') : 'Nginx не отвечает',
      controlName: 'nginx',
      actions: SYSTEMD_CONTROLS.nginx.actions,
    }),
    buildService({
      id: 'auth',
      name: 'Основной сайт и API',
      why: 'Вход, поиск, профиль, находки, платежи',
      level: 'critical',
      ok: authOk,
      detail: authOk
        ? `Работает${authPm?.uptimeMs ? ` · ${formatUptime(authPm.uptimeMs)}` : ''}`
        : 'Не отвечает — сайт и вход недоступны',
      pm2: authPm?.status || null,
      pm2Name: 'auth-server',
    }),
    buildService({
      id: 'mysql',
      name: 'База данных',
      why: 'Аккаунты, находки, рейтинги, баллы',
      level: 'critical',
      ok: mysqlOk,
      detail: mysqlOk ? `Отвечает · ${mysqlMs} мс` : 'Нет связи с MySQL',
      controlName: 'mysql',
      actions: SYSTEMD_CONTROLS.mysql.actions,
    }),
    buildService({
      id: 'searxng',
      name: 'SearXNG',
      why: 'Веб-поиск для ИИ (источники)',
      level: 'critical',
      ok: searxOk,
      detail: searx.detail,
    }),
    buildService({
      id: 'ollama',
      name: 'Ollama',
      why: 'Модели ИИ для поиска',
      level: 'critical',
      ok: ollamaOk,
      detail: ollamaOk
        ? `Отвечает${ollamaModels != null ? ` · моделей: ${ollamaModels}` : ''}`
        : 'Не отвечает — ИИ-поиск недоступен',
      controlName: 'ollama',
      actions: SYSTEMD_CONTROLS.ollama.actions,
    }),
    buildService({
      id: 'valkey',
      name: 'Valkey (для SearXNG)',
      why: 'База SearXNG на localhost:6379 — не используется основным API сайта',
      level: 'critical',
      ok: redisOk,
      detail: redisOk ? 'PONG · valkey://localhost:6379/0' : 'Нет ответа — SearXNG может сбоить',
    }),
  ];

  const important = [
    buildService({
      id: 'uwsgi',
      name: 'uWSGI (SearXNG)',
      why: 'Процессы Python-приложения SearXNG',
      level: 'important',
      ok: uwsgiActive && fs.existsSync(SEARXNG_SOCKET),
      detail: uwsgiActive
        ? (fs.existsSync(SEARXNG_SOCKET) ? 'active · сокет на месте' : 'active · сокет SearXNG не найден')
        : 'Сервис uwsgi не active',
      controlName: 'uwsgi',
      actions: SYSTEMD_CONTROLS.uwsgi.actions,
    }),
    buildService({
      id: 'postfix',
      name: 'Postfix (исходящая почта)',
      why: 'Отправка писем с сервера (SMTP submission :587)',
      level: 'important',
      ok: postfixOk && smtpConfigured,
      detail: !smtpConfigured
        ? 'В .env нет SMTP-учётки'
        : (!postfixOk
          ? 'Postfix не active или порт 587 закрыт'
          : 'active · порт 587 · учётка в .env'),
      controlName: 'postfix',
      actions: SYSTEMD_CONTROLS.postfix.actions,
    }),
    buildService({
      id: 'dovecot',
      name: 'Dovecot (ящики @serpmonn.ru)',
      why: 'IMAP/POP3 для корпоративной почты',
      level: 'important',
      ok: dovecotOk,
      detail: dovecotOk ? 'active · IMAPS :993' : 'Не active или IMAP недоступен',
      controlName: 'dovecot',
      actions: SYSTEMD_CONTROLS.dovecot.actions,
    }),
    buildService({
      id: 'opendkim',
      name: 'OpenDKIM',
      why: 'Подпись исходящих писем (доставляемость)',
      level: 'important',
      ok: opendkimActive,
      detail: opendkimActive ? 'active' : 'Не active — письма могут чаще попадать в спам',
      controlName: 'opendkim',
      actions: SYSTEMD_CONTROLS.opendkim.actions,
    }),
    buildService({
      id: 'whisper',
      name: 'Whisper STT',
      why: 'Голосовой ввод в поиске (/voice/stt)',
      level: 'important',
      ok: whisperOk,
      detail: whisperOk
        ? `active · модель ${whisperHttp.data?.model || '—'}`
        : 'Не отвечает на /health',
    }),
    buildService({
      id: 'docker',
      name: 'Docker',
      why: 'Контейнеры (в т.ч. Serpmonn AI)',
      level: 'important',
      ok: dockerOk,
      detail: dockerOk
        ? (dockerContainerRunning
          ? `Демон active · контейнер AI: running${dockerAi.health ? ` (${dockerAi.health})` : ''}`
          : `Демон active · контейнер AI: ${dockerAi.containerStatus || 'нет'}`)
        : 'Демон Docker не active',
      controlName: 'docker',
      actions: SYSTEMD_CONTROLS.docker.actions,
    }),
    buildService({
      id: 'serpmonn-ai',
      name: 'Serpmonn AI',
      why: 'ai.serpmonn.ru — AI-чат для подписчиков Pro',
      level: 'important',
      ok: openWebuiOk,
      detail: openWebuiOk
        ? `Отвечает · HTTP ${openWebuiHttp.status || '—'}`
        : 'Не отвечает на :8080 — Pro AI недоступен',
      controlName: 'serpmonn-ai',
      actions: DOCKER_CONTROLS['serpmonn-ai'].actions,
    }),
    buildService({
      id: 'news',
      name: 'Новости',
      why: 'Лента новостей на сайте',
      level: 'important',
      ok: (pm2?.['news-server']?.status === 'online') && newsPortOk,
      detail: newsPortOk ? `Порт открыт${pm2?.['news-server']?.uptimeMs ? ` · ${formatUptime(pm2['news-server'].uptimeMs)}` : ''}` : 'Сервис новостей не отвечает',
      pm2: pm2?.['news-server']?.status || null,
      pm2Name: 'news-server',
    }),
    buildService({
      id: 'leaderboard',
      name: 'Рейтинги игр',
      why: 'Таблицы лидеров в играх',
      level: 'important',
      ok: (pm2?.['leaderboard-server']?.status === 'online') && lbPortOk,
      detail: lbPortOk ? 'Порт открыт' : 'Рейтинги недоступны',
      pm2: pm2?.['leaderboard-server']?.status || null,
      pm2Name: 'leaderboard-server',
    }),
    buildService({
      id: 'password-reset',
      name: 'Сброс пароля',
      why: 'Восстановление доступа к аккаунту',
      level: 'important',
      ok: (pm2?.['password-reset-server']?.status === 'online') && resetPortOk,
      detail: resetPortOk ? 'Работает' : 'Сервис сброса пароля не отвечает',
      pm2: pm2?.['password-reset-server']?.status || null,
      pm2Name: 'password-reset-server',
    }),
    buildService({
      id: 'onnmail',
      name: 'OnnMail',
      why: 'Корпоративная почта @onnmail.ru',
      level: 'important',
      ok: (pm2?.['onnmail-server']?.status === 'online') && mailPortOk,
      detail: mailPortOk ? 'Работает' : 'Почтовый API не отвечает',
      pm2: pm2?.['onnmail-server']?.status || null,
      pm2Name: 'onnmail-server',
    }),
    buildService({
      id: 'check-pro',
      name: 'Проверка Pro',
      why: 'Статус подписки Pro у пользователей',
      level: 'important',
      ok: (pm2?.['check-pro']?.status === 'online') && checkProPortOk,
      detail: checkProPortOk ? 'Работает' : 'Проверка Pro не отвечает',
      pm2: pm2?.['check-pro']?.status || null,
      pm2Name: 'check-pro',
    }),
    buildService({
      id: 'health-alert',
      name: 'Алерты на почту',
      why: 'Письма при падении сервисов (serpmon@ / sergei@)',
      level: 'important',
      ok: pm2?.['health-alert']?.status === 'online',
      detail: pm2?.['health-alert']?.status === 'online' ? 'Следит за сервисами' : 'Остановлен — письма при авариях не уйдут',
      pm2: pm2?.['health-alert']?.status || null,
      pm2Name: 'health-alert',
    }),
    buildService({
      id: 'admin',
      name: 'Админка',
      why: 'Эта панель и управление сотрудниками',
      level: 'important',
      ok: (pm2?.['admin-server']?.status === 'online') && adminPortOk,
      detail: adminPortOk ? 'Работает' : 'Админ-сервер не отвечает',
      pm2: pm2?.['admin-server']?.status || null,
      pm2Name: 'admin-server',
      actions: ['start', 'restart'],
    }),
  ];

  const optional = [
    buildService({
      id: 'bot-blog',
      name: 'Бот блога VK',
      why: 'Публикации в сообществе блога',
      level: 'optional',
      ok: pm2?.communityBotBlog?.status === 'online',
      detail: pm2?.communityBotBlog?.status === 'online' ? 'Запущен' : 'Остановлен',
      pm2: pm2?.communityBotBlog?.status || null,
      pm2Name: 'communityBotBlog',
    }),
    buildService({
      id: 'bot-site',
      name: 'Бот сайта VK',
      why: 'Сообщество сайта',
      level: 'optional',
      ok: pm2?.communityBotSite?.status === 'online',
      detail: pm2?.communityBotSite?.status === 'online' ? 'Запущен' : 'Остановлен',
      pm2: pm2?.communityBotSite?.status || null,
      pm2Name: 'communityBotSite',
    }),
    buildService({
      id: 'bot-keeper',
      name: 'Keeper-бот VK',
      why: 'Беседа / модерация',
      level: 'optional',
      ok: pm2?.serpmonnKeeperBot?.status === 'online',
      detail: pm2?.serpmonnKeeperBot?.status === 'online' ? 'Запущен' : 'Остановлен',
      pm2: pm2?.serpmonnKeeperBot?.status || null,
      pm2Name: 'serpmonnKeeperBot',
    }),
    buildService({
      id: 'bot-autoreply',
      name: 'Автоответчик VK',
      why: 'Автоответы в сообщениях',
      level: 'optional',
      ok: pm2?.autoReplyBot?.status === 'online',
      detail: pm2?.autoReplyBot?.status === 'online' ? 'Запущен' : 'Остановлен (можно не держать включённым)',
      pm2: pm2?.autoReplyBot?.status || null,
      pm2Name: 'autoReplyBot',
    }),
    buildService({
      id: 'goaccess-realtime',
      name: 'Отчёт трафика (GoAccess)',
      why: 'Страница /analytics/analytics.html',
      level: 'optional',
      ok: pm2?.['goaccess-realtime']?.status === 'online',
      detail: pm2?.['goaccess-realtime']?.status === 'online' ? 'Сбор идёт' : 'Остановлен — отчёт может быть старым',
      pm2: pm2?.['goaccess-realtime']?.status || null,
      pm2Name: 'goaccess-realtime',
    }),
    buildService({
      id: 'goaccess-errors',
      name: 'Отчёт ошибок (GoAccess)',
      why: 'Страница /analytics/analytics-errors.html',
      level: 'optional',
      ok: pm2?.['goaccess-errors']?.status === 'online',
      detail: pm2?.['goaccess-errors']?.status === 'online' ? 'Сбор идёт' : 'Остановлен — отчёт может быть старым',
      pm2: pm2?.['goaccess-errors']?.status || null,
      pm2Name: 'goaccess-errors',
    }),
    buildService({
      id: 'serpmonn-relay',
      name: 'Serpmonn Relay (мессенджер)',
      why: 'P2P bootstrap для Serpmonn Messenger (:4001)',
      level: 'optional',
      ok: relayOk,
      detail: relayOk ? 'active · TCP :4001' : 'Не active или порт закрыт',
      controlName: 'serpmonn-relay',
      actions: SYSTEMD_CONTROLS['serpmonn-relay'].actions,
    }),
  ];

  const mustOk = [...critical, ...important].every((s) => s.ok);
  const criticalOk = critical.every((s) => s.ok);
  const failedCritical = critical.filter((s) => !s.ok);
  const failedImportant = important.filter((s) => !s.ok);

  let summary = 'Всё критичное работает';
  let tone = 'ok';
  if (!criticalOk) {
    summary = 'Критичная поломка';
    tone = 'bad';
  } else if (failedImportant.length) {
    summary = 'Сайт в целом жив, но есть сбои';
    tone = 'warn';
  }

  let host = null;
  try {
    host = await collectHostLoad();
  } catch (err) {
    console.error('[admin] host load failed:', err.message);
  }

  return {
    ok: mustOk,
    tone,
    summary,
    checkedAt: new Date().toISOString(),
    authUptime: authPm?.uptimeMs ? formatUptime(authPm.uptimeMs) : null,
    authReady: authOk,
    smtpConfigured,
    mysqlOk,
    pm2Available: Boolean(pm2),
    host,
    problems: [...failedCritical, ...failedImportant].map((s) => s.name),
    groups: [
      { id: 'critical', title: 'Критично для сайта', items: critical },
      { id: 'important', title: 'Важно для функций', items: important },
      { id: 'optional', title: 'Дополнительно (боты и отчёты)', items: optional },
    ],
  };
}
