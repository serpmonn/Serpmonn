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
 *
 * @param {string} query
 * @param {string} category
 * @param {{ language?: string, engines?: string, timeRange?: string, safesearch?: number|string }} [opts]
 */
async function fetchSearxViaCurl(query, category, opts = {}) {
  const { language, engines, timeRange, safesearch } = opts;
  let url =
    `http://127.0.0.1/search` +
    `?q=${encodeURIComponent(query)}` +
    `&categories=${encodeURIComponent(category)}` +
    `&format=json`;
  if (language) url += `&language=${encodeURIComponent(language)}`;
  if (engines) url += `&engines=${encodeURIComponent(engines)}`;
  if (timeRange) url += `&time_range=${encodeURIComponent(timeRange)}`;
  if (safesearch !== undefined && safesearch !== null && safesearch !== '') {
    url += `&safesearch=${encodeURIComponent(String(safesearch))}`;
  }

  try {
    const { stdout, stderr } = await execFileAsync('curl', [
      '-sS',
      '-f',
      '-H', 'Host: serpmonn.ru',
      '--max-time', '15',
      '--connect-timeout', '2',
      url
    ], {
      maxBuffer: 10 * 1024 * 1024
    });

    if (stderr?.trim()) {
      console.warn('[SearXNG] curl stderr:', stderr.slice(0, 300));
    }

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
      console.error('[SearXNG] JSON parse error:', parseErr.message, 'raw:', stdout.slice(0, 500));
      return {
        results: [],
        answers: [],
        suggestions: [],
        unresponsive_engines: ['searxng-json-parse-error']
      };
    }
  } catch (err) {
    console.error('[SearXNG] fetchSearxViaCurl error:', {
      message: err.message,
      code: err.code,
      signal: err.signal,
      killed: err.killed,
      stdoutPreview: err.stdout ? String(err.stdout).slice(0, 300) : null,
      stderrPreview: err.stderr ? String(err.stderr).slice(0, 300) : null,
    });
    return {
      results: [],
      answers: [],
      suggestions: [],
      unresponsive_engines: ['searxng-curl-error']
    };
  }
}

/**
 * Подсказки SearXNG (duckduckgo autocomplete и т.п.).
 * @param {string} query
 * @returns {Promise<string[]>}
 */
async function fetchSearxAutocompleteViaCurl(query) {
  const q = String(query || '').trim();
  if (!q || q.length < 2) return [];

  const url = `http://127.0.0.1/autocompleter?q=${encodeURIComponent(q)}`;

  try {
    const { stdout } = await execFileAsync('curl', [
      '-sS',
      '-f',
      '-H', 'Host: serpmonn.ru',
      '--max-time', '4',
      '--connect-timeout', '2',
      url
    ], {
      maxBuffer: 1 * 1024 * 1024
    });

    if (!stdout) return [];

    const data = JSON.parse(stdout);
    // Typical: ["query", ["s1","s2",...]] or just ["s1","s2"]
    if (Array.isArray(data)) {
      if (data.length >= 2 && Array.isArray(data[1])) {
        return data[1].map((s) => String(s || '').trim()).filter(Boolean).slice(0, 8);
      }
      return data
        .filter((item) => typeof item === 'string')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 8);
    }
    return [];
  } catch (err) {
    console.warn('[SearXNG] autocomplete error:', err.message);
    return [];
  }
}

export { fetchSearxViaCurl, fetchSearxAutocompleteViaCurl };
