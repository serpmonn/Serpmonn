/**
 * Тонкий клиент ЮKassa API v3 на axios.
 * Заменяет npm-пакет `yookassa` (тянул мёртвый `request` + старый uuid).
 * @see https://yookassa.ru/developers/api
 */
import axios from 'axios';
import { randomUUID } from 'crypto';

const DEFAULT_URL = 'https://api.yookassa.ru/v3/';
const DEFAULT_TIMEOUT_MS = 120_000;
const DEFAULT_RETRY_DELAY_MS = 60_000;

export class YooKassaError extends Error {
  constructor(error) {
    const message = error?.description || error?.message || 'YooKassa error';
    super(message);
    this.name = 'YooKassaError';
    this.id = error?.id;
    this.code = error?.code;
    this.parameter = error?.parameter;
  }
}

export class YooKassa {
  /**
   * @param {{ shopId: string, secretKey: string, apiUrl?: string, timeout?: number, retryDelay?: number }} opts
   */
  constructor({
    shopId,
    secretKey,
    apiUrl = DEFAULT_URL,
    timeout = DEFAULT_TIMEOUT_MS,
    retryDelay = DEFAULT_RETRY_DELAY_MS
  }) {
    this.shopId = shopId;
    this.secretKey = secretKey;
    this.apiUrl = apiUrl.endsWith('/') ? apiUrl : `${apiUrl}/`;
    this.timeout = timeout;
    this.retryDelay = retryDelay;
  }

  /**
   * @param {object} payload
   * @param {string} [idempotenceKey]
   * @returns {Promise<object>} тело ответа API (payment object)
   */
  createPayment(payload, idempotenceKey) {
    return this.#request('POST', 'payments', payload, idempotenceKey);
  }

  /**
   * @param {string} paymentId
   * @param {string} [idempotenceKey]
   */
  getPayment(paymentId, idempotenceKey) {
    return this.#request('GET', `payments/${paymentId}`, null, idempotenceKey);
  }

  async #request(method, path, payload, idempotenceKey) {
    const key = idempotenceKey || randomUUID();
    const url = `${this.apiUrl}${path}`;

    try {
      const response = await axios({
        method,
        url,
        data: method === 'GET' ? undefined : payload ?? {},
        timeout: this.timeout,
        auth: {
          username: this.shopId,
          password: this.secretKey
        },
        headers: {
          'Idempotence-Key': key,
          'Content-Type': 'application/json'
        },
        validateStatus: (status) => status >= 200 && status < 300
      });

      // 202 — ЮKassa просит повторить позже
      if (response.status === 202) {
        const delayMs = Number(response.data?.retry_after) || this.retryDelay;
        await new Promise((r) => setTimeout(r, delayMs));
        return this.#request(method, path, payload, key);
      }

      return response.data;
    } catch (err) {
      const body = err.response?.data;
      if (body && typeof body === 'object') {
        throw new YooKassaError(body);
      }
      throw err;
    }
  }
}

export default YooKassa;
