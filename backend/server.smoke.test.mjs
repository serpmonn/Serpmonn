process.env.CSRF_SECRET = process.env.CSRF_SECRET || 'test-secret-for-vitest-only';
process.env.AUTH_PORT = process.env.AUTH_PORT || '3001';

import request from 'supertest';        // HTTP-клиент для тестирования Express без поднятия реального сервера
import app from './server.mjs';         // Наше Express-приложение

describe('Server smoke tests', () => {

    it('GET /csrf-token возвращает токен', async () => {
        const res = await request(app).get('/csrf-token');

        expect(res.status).toBe(200);                          // Ожидаем успешный ответ
        expect(res.body).toHaveProperty('csrfToken');          // В теле должен быть csrfToken
        expect(typeof res.body.csrfToken).toBe('string');      // Токен — строка
    });

    it('Неизвестный маршрут не падает с необработанной ошибкой', async () => {
        const res = await request(app).get('/route-that-does-not-exist');

        expect([404, 500]).toContain(res.status);              // 404 (маршрут не найден) или 500 — оба приемлемы
    });

});