import js from '@eslint/js';

export default [
    {
        ignores: [
            'node_modules/**',
            'dist/**',                              // Production сборка — не проверяем
            'assembly/dist/**',                     // Сборка assembly — не проверяем
            'frontend/analytics/**',                // Аналитика фронтенда — не проверяем
            'backend/analytics/**'                  // Аналитика бэкенда — не проверяем
        ]
    },
    js.configs.recommended,                         // Базовый набор рекомендуемых правил ESLint
    {
        files: ['**/*.js', '**/*.mjs'],             // Применяем ко всем JS и MJS файлам
        languageOptions: {
            ecmaVersion: 'latest',                  // Используем актуальную версию ECMAScript
            sourceType: 'module',                   // Проект на ES Modules
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
                fetch: 'readonly'                   // Нативный fetch доступен в Node 18+
            }
        },
        rules: {
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],  // Предупреждение о неиспользуемых переменных (кроме _)
            'no-undef': 'error'                     // Ошибка при обращении к необъявленной переменной
        }
    },
    {
        // CommonJS файлы assembly — require, module, __dirname разрешены
        files: ['assembly/*.js', 'assembly/**/*.js'],
        ignores: ['assembly/site/src/games/**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'commonjs',
            globals: {
                require: 'readonly',
                module: 'writable',
                exports: 'writable',
                __dirname: 'readonly',
                __filename: 'readonly',
                console: 'readonly',
                process: 'readonly',
                Buffer: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly'
            }
        }
    },
    {
        // Браузерные JS файлы игр — document, window, localStorage разрешены
        files: ['assembly/site/src/games/**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'script',
            globals: {
                window: 'readonly',
                document: 'readonly',
                localStorage: 'readonly',
                sessionStorage: 'readonly',
                navigator: 'readonly',
                location: 'readonly',
                history: 'readonly',
                alert: 'readonly',
                confirm: 'readonly',
                requestAnimationFrame: 'readonly',
                cancelAnimationFrame: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                console: 'readonly',
                Image: 'readonly',
                Audio: 'readonly',
                Event: 'readonly',
                CustomEvent: 'readonly'
            }
        }
    }
];
