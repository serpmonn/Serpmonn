process.env.NODE_ENV = 'test';                                                                                                   // Принудительно включаем тестовое окружение до импорта приложения
process.env.CSRF_SECRET = process.env.CSRF_SECRET || 'test-secret-for-vitest-only';                                             // Подставляем тестовый CSRF-секрет
process.env.AUTH_PORT = process.env.AUTH_PORT || '3001';                                                                        // Подставляем тестовый порт

import request from 'supertest';        // HTTP-клиент для тестирования Express без поднятия реального сервера
import app from './server.mjs';         // Наше Express-приложение

describe('Server smoke tests', () => {

    it('GET /csrf-token возвращает токен', async () => {
        const res = await request(app).get('/csrf-token');

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('csrfToken');
        expect(typeof res.body.csrfToken).toBe('string');
    });

    it('Неизвестный маршрут не падает с необработанной ошибкой', async () => {
        const res = await request(app).get('/route-that-does-not-exist');

        expect([404, 500]).toContain(res.status);
    });

    // --- новый тест ---
    it('GET /health возвращает статус ok', async () => {
        const res = await request(app).get('/health');

        expect(res.status).toBe(200);                      // Ожидаем успешный HTTP-ответ
        expect(res.body.status).toBe('ok');                // Статус приложения — 'ok'
        expect(res.body).toHaveProperty('uptime');         // Поле uptime присутствует
        expect(typeof res.body.uptime).toBe('number');     // Uptime — число (секунды)
        expect(res.body).toHaveProperty('timestamp');      // Поле timestamp присутствует
    });

});