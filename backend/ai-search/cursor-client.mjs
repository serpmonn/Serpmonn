/**
 * Cursor cloud chat client.
 *
 * HARD RULE: never use local runtime / cwd on this machine.
 * Only cloud: { repos: [] } so the agent cannot see our server disk.
 *
 * @cursor/sdk is loaded lazily so search-server starts without the package
 * when CURSOR_CHAT_ENABLED is off.
 */

const CURSOR_MODEL = process.env.CURSOR_CHAT_MODEL || 'composer-2.5';
const CURSOR_TIMEOUT_MS = Number(process.env.CURSOR_CHAT_TIMEOUT_MS || 90_000);

const SYSTEM_PROMPT =
  'Ты ассистент Serpmonn (serpmonn.ru). Отвечай полезно и кратко на языке пользователя. ' +
  'Твоё имя — Serpmonn AI. Запрещено говорить, что тебя сделали Google, Gemma, OpenAI, Microsoft или другие. ' +
  'Только текст в ответе. Не предлагай править файлы, запускать команды или менять сервер.';

function getApiKey() {
  return String(process.env.CURSOR_API_KEY || '').trim();
}

export function isCursorChatConfigured() {
  return Boolean(getApiKey());
}

/**
 * Build cloud-only options. Throws if anything looks like local runtime.
 * @returns {import('@cursor/sdk').AgentOptions}
 */
function buildCloudOnlyOptions() {
  const apiKey = getApiKey();
  if (!apiKey) {
    const err = new Error('CURSOR_API_KEY not configured');
    err.status = 503;
    throw err;
  }

  const options = {
    apiKey,
    model: { id: CURSOR_MODEL },
    cloud: { repos: [] },
  };

  // Absolute guard: refuse any accidental local wiring
  if (Object.prototype.hasOwnProperty.call(options, 'local')) {
    const err = new Error('Cursor local runtime is forbidden on this server');
    err.status = 500;
    throw err;
  }
  if (!options.cloud || !Array.isArray(options.cloud.repos) || options.cloud.repos.length !== 0) {
    const err = new Error('Cursor cloud no-repo runtime required');
    err.status = 500;
    throw err;
  }

  return Object.freeze({
    apiKey: options.apiKey,
    model: Object.freeze({ ...options.model }),
    cloud: Object.freeze({ repos: Object.freeze([]) }),
  });
}

function formatTranscript(messages) {
  const list = Array.isArray(messages) ? messages : [];
  const lines = [SYSTEM_PROMPT, '', 'Диалог:'];
  for (const m of list) {
    const role = m?.role === 'assistant' ? 'Ассистент' : m?.role === 'system' ? 'Система' : 'Пользователь';
    const content = String(m?.content || '').trim();
    if (!content) continue;
    if (m?.role === 'system') continue; // system already in preamble
    lines.push(`${role}: ${content}`);
  }
  lines.push('', 'Ответь следующим сообщением ассистента (только текст):');
  return lines.join('\n');
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      const err = new Error(`Cursor chat timeout after ${ms}ms`);
      err.status = 504;
      reject(err);
    }, ms);
    promise.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

/**
 * @param {Array<{role:string,content:string}>} messages - ollama-style messages (may include system)
 * @returns {Promise<string>}
 */
export async function callCursorChat(messages) {
  const options = buildCloudOnlyOptions();
  const prompt = formatTranscript(messages);

  let Agent;
  try {
    ({ Agent } = await import('@cursor/sdk'));
  } catch (err) {
    const e = new Error(`@cursor/sdk unavailable: ${err.message}`);
    e.status = 503;
    throw e;
  }

  const result = await withTimeout(Agent.prompt(prompt, options), CURSOR_TIMEOUT_MS);

  if (!result || result.status === 'error') {
    const detail = result?.error?.message || result?.error || 'Cursor run failed';
    const err = new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
    err.status = 502;
    throw err;
  }

  const text = String(result.result || '').trim();
  if (!text) {
    const err = new Error('Cursor returned empty answer');
    err.status = 502;
    throw err;
  }
  return text;
}
