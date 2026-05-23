import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'node',    // Запускаем тесты в Node.js окружении (не в браузере)
        globals: true,          // Включаем глобальные describe/it/expect без дополнительных импортов
        env: {
            NODE_ENV: 'test'    // Переводим приложение в тестовый режим
        }
    }
});