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

  try {
    const { stdout } = await execFileAsync('curl', [
      '-s',                         // тихий режим
      '-H', 'Host: serpmonn.ru',
      '--max-time', '15',           // максимум 15 секунд на запрос
      '--connect-timeout', '2',     // до 2 секунд на установление соединения
      url
    ]);

    if (!stdout) {
      console.error('[SearXNG] Empty response from curl for URL:', url);
      return {
        results: [],
        answers: [],
        suggestions: [],
        unresponsive_engines: ['searxng-empty-response']
      };
    }

    try {
      return JSON.parse(stdout);
    } catch (parseErr) {
      console.error('[SearXNG] JSON parse error:', parseErr, 'raw:', stdout.slice(0, 500));
      return {
        results: [],
        answers: [],
        suggestions: [],
        unresponsive_engines: ['searxng-json-parse-error']
      };
    }
  } catch (err) {
    console.error('[SearXNG] fetchSearxViaCurl error:', err);
    return {
      results: [],
      answers: [],
      suggestions: [],
      unresponsive_engines: ['searxng-curl-error']
    };
  }
}

export { fetchSearxViaCurl };