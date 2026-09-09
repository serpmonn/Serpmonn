/**
 * GigaChat: cooldown + последовательная очередь запросов
 * (чтобы не ловить 429 от параллельных/частых вызовов).
 */

let coolUntil = 0;
let lastReason = '';
let lastCallAt = 0;
let queueTail = Promise.resolve();

const MIN_GAP_MS = Math.max(
  500,
  Number(process.env.GIGACHAT_MIN_GAP_MS) || 3000
);

export function isGigaChatCoolingDown() {
  return Date.now() < coolUntil;
}

export function gigaChatCooldownRemainingMs() {
  return Math.max(0, coolUntil - Date.now());
}

export function getGigaChatCooldownReason() {
  return lastReason || '';
}

/** @param {number} ms */
export function markGigaChatCooldown(ms = 10 * 60 * 1000, reason = 'rate_limited') {
  coolUntil = Math.max(coolUntil, Date.now() + Math.max(5_000, ms));
  lastReason = String(reason || 'cooldown');
  console.warn(
    `[marketing] gigachat cooldown ${Math.round((coolUntil - Date.now()) / 1000)}s: ${lastReason}`
  );
}

export function clearGigaChatCooldown() {
  coolUntil = 0;
  lastReason = '';
}

/** Пометить cooldown по ошибке GigaChat (429 / timeout / 402). */
export function noteGigaChatFailure(err) {
  const status = Number(err?.status) || 0;
  const msg = String(err?.message || err || '');
  if (status === 429 || /too many requests/i.test(msg)) {
    // Короче: очередь + пауза; длинный cooldown только если совсем забили
    markGigaChatCooldown(90_000, 'Too Many Requests');
    return;
  }
  if (status === 402 || /payment|quota|balance/i.test(msg)) {
    markGigaChatCooldown(60 * 60 * 1000, msg.slice(0, 120));
    return;
  }
  if (/timeout/i.test(msg)) {
    markGigaChatCooldown(60_000, 'timeout');
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Выполнить работу с GigaChat строго по очереди:
 * один запрос за раз + минимальный интервал между вызовами.
 * При 429 — одна повторная попытка после паузы.
 */
export function enqueueGigaChat(task, { label = 'call' } = {}) {
  const run = async () => {
    // дождаться конца чужого cooldown (не дольше 2 мин за один wait)
    while (isGigaChatCoolingDown()) {
      const left = gigaChatCooldownRemainingMs();
      if (left <= 0) break;
      const chunk = Math.min(left, 120_000);
      console.warn(`[marketing] gigachat queue wait ${Math.round(chunk / 1000)}s (${label})`);
      await sleep(chunk);
    }

    const gap = Math.max(0, lastCallAt + MIN_GAP_MS - Date.now());
    if (gap > 0) await sleep(gap);

    lastCallAt = Date.now();
    try {
      return await task();
    } catch (err) {
      const status = Number(err?.status) || 0;
      const msg = String(err?.message || '');
      if (status === 429 || /too many requests/i.test(msg)) {
        noteGigaChatFailure(err);
        const retryWait = Math.min(45_000, Math.max(8_000, gigaChatCooldownRemainingMs()));
        console.warn(`[marketing] gigachat 429 → retry after ${Math.round(retryWait / 1000)}s (${label})`);
        await sleep(retryWait);
        clearGigaChatCooldown();
        const gap2 = Math.max(0, lastCallAt + MIN_GAP_MS - Date.now());
        if (gap2 > 0) await sleep(gap2);
        lastCallAt = Date.now();
        return task();
      }
      noteGigaChatFailure(err);
      throw err;
    }
  };

  const p = queueTail.then(run, run);
  // хвост не должен падать из‑за ошибки задачи
  queueTail = p.then(
    () => undefined,
    () => undefined
  );
  return p;
}
