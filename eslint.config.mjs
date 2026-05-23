import js from '@eslint/js';

export default [
    {
        ignores: [
            'node_modules/**',         // Зависимости npm — не проверяем
            'dist/**',                 // Production-сборка — не проверяем
            'assembly/dist/**',        // Сборка assembly — не проверяем
            'frontend/analytics/**',   // Аналитика фронтенда — не проверяем
            'backend/analytics/**'     // Аналитика бэкенда — не проверяем
        ]
    },
    js.configs.recommended,            // Базовый набор рекомендуемых правил ESLint
    {
        files: ['**/*.js', '**/*.mjs'],                // Применяем ко всем JS и MJS файлам
        languageOptions: {
            ecmaVersion: 'latest',                     // Используем актуальную версию ECMAScript
            sourceType: 'module',                      // Проект на ES Modules
            globals: {
                console: 'readonly',
                process: 'readonly',
                Buffer: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                URL: 'readonly',
                URLSearchParams: 'readonly',
                fetch: 'readonly'                      // Нативный fetch доступен в Node 18+
            }
        },
        rules: {
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],  // Предупреждение о неиспользуемых переменных (кроме _*)
            'no-undef': 'error'                                        // Ошибка при обращении к необъявленной переменной
        }
    }
];