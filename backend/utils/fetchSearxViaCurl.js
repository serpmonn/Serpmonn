// /var/www/serpmonn.ru/backend/utils/fetchSearxViaCurl.js

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Обёртка вокруг SearXNG через curl.
 *
 * Обход проблемы ECONNRESET / UND_ERR_CONNECT_TIMEOUT в Undici
 * при запросах к локальному SearXNG (127.0.0.1:80).
 * Здесь повторяем ровно тот запрос, который стабильно работает через curl.
 */
async function fetchSearxViaCurl(query, category) {
  const url =
    `http://127.0.0.1/search` +
    `?q=${encodeURIComponent(query)}` +
    `&categories=${encodeURIComponent(category)}` +
    `&format=json`;

  const { stdout } = await execFileAsync('curl', [
    '-s',                // тихий режим
    '-H', 'Host: serpmonn.ru',
    '--max-time', '15',  // максимум 15 секунд на запрос
    url
  ]);

  return JSON.parse(stdout);
}

export { fetchSearxViaCurl };