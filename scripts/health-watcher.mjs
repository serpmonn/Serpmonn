// scripts/health-watcher.mjs
// Запуск: node scripts/health-watcher.mjs
// Или:    HEALTH_URL=https://serpmonn.ru/health INTERVAL=30 node scripts/health-watcher.mjs

const HEALTH_URL = process.env.HEALTH_URL || 'http://localhost:3001/health';
const INTERVAL_SEC = Number(process.env.INTERVAL || 30);

const GREEN  = '\x1b[32m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN   = '\x1b[36m';
const RESET  = '\x1b[0m';

let lastStatus = null;                                                           // Запоминаем предыдущий статус для алертов

async function check() {
    const now = new Date().toLocaleTimeString('ru-RU');
    try {
        const res  = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(5000) });
        const data = await res.json();

        const icon   = data.ready ? `${GREEN}●${RESET}` : `${YELLOW}●${RESET}`;
        const status = data.ready ? `${GREEN}OK${RESET}`  : `${YELLOW}${data.status}${RESET}`;

        console.log(
            `[${now}] ${icon} ${status} ` +
            `| uptime: ${CYAN}${data.uptimeSec}s${RESET} ` +
            `| heap: ${CYAN}${data.memory?.heapUsedMb}/${data.memory?.heapTotalMb} MB${RESET} ` +
            `| rss: ${CYAN}${data.memory?.rssMb} MB${RESET} ` +
            `| smtp: ${data.checks?.smtp?.configured ? `${GREEN}configured${RESET}` : `${RED}MISSING${RESET}`}`
        );

        // Алерт при смене статуса
        if (lastStatus !== null && lastStatus !== data.ready) {
            const msg = data.ready
                ? `${GREEN}✔ ВОССТАНОВЛЕН${RESET}`
                : `${RED}✖ УПАЛ / НЕ ГОТОВ${RESET}`;
            console.log(`\n  >>> ${msg} <<<\n`);
        }
        lastStatus = data.ready;

    } catch (err) {
        console.log(`[${now}] ${RED}● НЕДОСТУПЕН${RESET} — ${err.message}`);
        if (lastStatus !== false) {
            console.log(`\n  >>> ${RED}✖ СЕРВЕР НЕ ОТВЕЧАЕТ${RESET} <<<\n`);
        }
        lastStatus = false;
    }
}

console.log(`Health watcher → ${CYAN}${HEALTH_URL}${RESET} (каждые ${INTERVAL_SEC}с)\n`);
check();
setInterval(check, INTERVAL_SEC * 1000);