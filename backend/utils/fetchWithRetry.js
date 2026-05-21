// /var/www/serpmonn.ru/backend/utils/fetchWithRetry.js

async function fetchWithRetry(url, options = {}, retries = 1) {
  let lastErr;

  for (let i = 0; i <= retries; i++) {
    try {
      // Принудительно ходим на 127.0.0.1, но сохраняем путь и query
      let finalUrl = url;
      try {
        const u = new URL(url);
        if (u.hostname === 'serpmonn.ru' || u.hostname === 'www.serpmonn.ru') {
          u.hostname = '127.0.0.1';
          u.protocol = 'http:';    // на всякий случай
          u.port = '80';
          finalUrl = u.toString();
        }
      } catch (_) {
        finalUrl = url;
      }

      const res = await fetch(finalUrl, {
        ...options,
        headers: {
          ...(options.headers || {}),
          Host: 'serpmonn.ru'
        }
        // ВРЕМЕННО убираем кастомные таймауты, чтобы не ловить лишних обрывов
        // @ts-ignore
        // headersTimeout: 15000,
        // @ts-ignore
        // bodyTimeout: 15000
      });

      if (!res.ok) {
        // Логируем статус и кусочек тела для отладки
        const text = await res.text();
        console.warn('SearXNG non-OK response:', res.status, res.statusText);
        console.warn('SearXNG body (first 500 chars):', text.slice(0, 500));
        throw new Error(`${res.status} ${res.statusText}`);
      }

      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        const text = await res.text();
        console.warn('SearXNG returned non-JSON, content-type:', contentType);
        console.warn('Body (first 500 chars):', text.slice(0, 500));
        throw new Error('Non-JSON response from SearXNG');
      }

      const bodyText = await res.text();
      // На всякий случай логируем первые символы, но НЕ обязательно
      // console.log('SearXNG JSON (first 200 chars):', bodyText.slice(0, 200));

      return JSON.parse(bodyText);
    } catch (err) {
      lastErr = err;

      const msg = String(err.message || '');
      const causeMsg = String(err.cause?.message || '');
      const code = String(err.cause?.code || '');

      console.warn('fetchWithRetry error attempt', i, 'url:', url, 'err:', msg, 'cause:', causeMsg, 'code:', code);

      const isRetryable =
        msg.includes('ECONNRESET') ||
        msg.includes('UND_ERR_CONNECT_TIMEOUT') ||
        causeMsg.includes('ECONNRESET') ||
        causeMsg.includes('UND_ERR_CONNECT_TIMEOUT') ||
        code === 'UND_ERR_CONNECT_TIMEOUT';

      if (!isRetryable) {
        break;
      }
    }

    if (i < retries) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  throw lastErr;
}

export { fetchWithRetry };