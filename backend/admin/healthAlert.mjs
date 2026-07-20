/**
 * Фоновый алерт: при падении/восстановлении сервисов шлёт письмо
 * на serpmon@gmail.com и sergei@serpmonn.ru.
 *
 * Лёгкие проверки (collectSystemStatus) — без внешних SearXNG/моделей.
 * Письмо только при смене состояния после 2 неудачных проверок подряд.
 */
import dotenv from 'dotenv';
import fs from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { collectSystemStatus } from './systemStatus.mjs';
import { transporter } from '../utils/mailer.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';
dotenv.config({
  path: isProduction
    ? '/var/www/serpmonn.ru/backend/.env'
    : resolve(process.cwd(), 'backend/.env'),
});

const INTERVAL_MS = Number(process.env.HEALTH_ALERT_INTERVAL_MS || 60_000);
const FAIL_THRESHOLD = Number(process.env.HEALTH_ALERT_FAIL_THRESHOLD || 2);
const STATE_PATH =
  process.env.HEALTH_ALERT_STATE_PATH ||
  resolve(__dirname, '.health-alert-state.json');
const TO = (process.env.HEALTH_ALERT_TO || 'serpmon@gmail.com,sergei@serpmonn.ru')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const FROM = process.env.HEALTH_ALERT_FROM || '"Serpmonn Status" <noreply@serpmonn.ru>';
/** Алертим critical + important; боты/отчёты — нет */
const ALERT_LEVELS = new Set(['critical', 'important']);

function loadState() {
  try {
    const raw = fs.readFileSync(STATE_PATH, 'utf8');
    const data = JSON.parse(raw);
    return {
      failCounts: data.failCounts && typeof data.failCounts === 'object' ? data.failCounts : {},
      alerted: data.alerted && typeof data.alerted === 'object' ? data.alerted : {},
    };
  } catch {
    return { failCounts: {}, alerted: {} };
  }
}

function saveState(state) {
  try {
    fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
  } catch (err) {
    console.error('[health-alert] не удалось сохранить state:', err.message);
  }
}

async function sendAlert({ subject, text }) {
  const info = await transporter.sendMail({
    from: FROM,
    to: TO.join(', '),
    subject,
    text,
  });
  console.log('[health-alert] mail sent:', subject, '→', TO.join(', '), info.messageId || '');
}

function pickServices(status) {
  const items = [];
  for (const group of status.groups || []) {
    for (const item of group.items || []) {
      if (ALERT_LEVELS.has(item.level)) items.push(item);
    }
  }
  return items;
}

async function tick(state) {
  let status;
  try {
    status = await collectSystemStatus();
  } catch (err) {
    console.error('[health-alert] collect failed:', err.message);
    return;
  }

  const services = pickServices(status);
  const downNow = [];
  const recovered = [];

  for (const s of services) {
    const id = s.id;
    if (s.ok) {
      state.failCounts[id] = 0;
      if (state.alerted[id] === 'down') {
        recovered.push(s);
        state.alerted[id] = 'ok';
      }
      continue;
    }

    state.failCounts[id] = (Number(state.failCounts[id]) || 0) + 1;
    if (state.failCounts[id] >= FAIL_THRESHOLD && state.alerted[id] !== 'down') {
      downNow.push(s);
      state.alerted[id] = 'down';
    }
  }

  const when = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });

  if (downNow.length) {
    const lines = downNow.map((s) => `• ${s.name}: ${s.detail || 'сбой'}${s.why ? ` (${s.why})` : ''}`);
    try {
      await sendAlert({
        subject: `[Serpmonn] Упало: ${downNow.map((s) => s.name).join(', ')}`,
        text: [
          `Обнаружены проблемы (${when}, MSK).`,
          '',
          ...lines,
          '',
          'Админка: https://serpmonn.ru/frontend/admin/health.html',
          'Письмо ушло после нескольких неудачных проверок подряд.',
        ].join('\n'),
      });
    } catch (err) {
      console.error('[health-alert] send down failed:', err.message);
      // откат флага, чтобы повторить попытку на следующем тике
      for (const s of downNow) state.alerted[s.id] = 'ok';
    }
  }

  if (recovered.length) {
    const lines = recovered.map((s) => `• ${s.name}: ${s.detail || 'ок'}`);
    try {
      await sendAlert({
        subject: `[Serpmonn] Восстановилось: ${recovered.map((s) => s.name).join(', ')}`,
        text: [
          `Сервисы снова в порядке (${when}, MSK).`,
          '',
          ...lines,
          '',
          'Админка: https://serpmonn.ru/frontend/admin/health.html',
        ].join('\n'),
      });
    } catch (err) {
      console.error('[health-alert] send recovery failed:', err.message);
      for (const s of recovered) state.alerted[s.id] = 'down';
    }
  }

  saveState(state);

  const bad = services.filter((s) => !s.ok).map((s) => s.name);
  if (bad.length) {
    console.log(`[health-alert] still down: ${bad.join(', ')}`);
  } else {
    console.log('[health-alert] all critical/important ok');
  }
}

const state = loadState();
console.log(
  `[health-alert] start → every ${INTERVAL_MS / 1000}s, threshold=${FAIL_THRESHOLD}, to=${TO.join(', ')}`
);

tick(state).catch((err) => console.error('[health-alert] first tick:', err.message));
setInterval(() => {
  tick(state).catch((err) => console.error('[health-alert] tick:', err.message));
}, INTERVAL_MS);
