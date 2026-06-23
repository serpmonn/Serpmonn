import js from '@eslint/js';

export default [
    {
        ignores: [
            'node_modules/**',
            'dist/**',
            'assembly/dist/**',
            'frontend/analytics/**',
            'backend/analytics/**'
        ]
    },
    js.configs.recommended,
    {
        // Все JS/MJS файлы — базовые правила
        files: ['**/*.js', '**/*.mjs'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                console: 'readonly',
                process: 'readonly',
                Buffer: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly',
                setImmediate: 'readonly',
                clearImmediate: 'readonly',
                URL: 'readonly',
                URLSearchParams: 'readonly',
                fetch: 'readonly',
                crypto: 'readonly',
                AbortController: 'readonly',
                AbortSignal: 'readonly',
                Promise: 'readonly',
                Symbol: 'readonly',
                Map: 'readonly',
                Set: 'readonly',
                WeakMap: 'readonly',
                WeakSet: 'readonly',
                TextEncoder: 'readonly',
                TextDecoder: 'readonly',
                Blob: 'readonly',
                FormData: 'readonly',
                Headers: 'readonly',
                Request: 'readonly',
                Response: 'readonly',
                ReadableStream: 'readonly',
                WritableStream: 'readonly',
                TransformStream: 'readonly'
            }
        },
        rules: {
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'no-undef': 'error',
            'no-empty': 'warn',
            'no-unreachable': 'warn',
            'no-dupe-keys': 'warn'
        }
    },
    {
        // Скрипты .js во frontend/ и assembly/site/src/ — браузерные, no-undef выключен
        files: ['frontend/**/*.js', 'assembly/site/src/**/*.js'],
        ignores: ['**/service-worker.js', '**/sw.js', '**/sw-*.js', '**/*-sw.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'script'
        },
        rules: {
            'no-undef': 'off',
            'no-empty': 'warn',
            'no-dupe-keys': 'warn'
        }
    },
    {
        // CommonJS файлы assembly — require, module, __dirname разрешены
        files: ['assembly/*.js', 'assembly/**/*.js'],
        ignores: [
            'assembly/site/src/**/*.js',
            '**/service-worker.js',
            '**/sw.js'
        ],
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
        // Service Worker файлы — self, caches, clients разрешены
        files: ['**/service-worker.js', '**/sw.js', '**/*-sw.js', '**/sw-*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'script'
        },
        rules: {
            'no-empty': 'warn',
            'no-undef': 'off'
        }
    },
    {
        // Тестовые файлы — глобалы Jest/Vitest/Mocha разрешены
        files: ['**/*.test.mjs', '**/*.test.js', '**/*.spec.mjs', '**/*.spec.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                describe: 'readonly',
                it: 'readonly',
                test: 'readonly',
                expect: 'readonly',
                beforeAll: 'readonly',
                afterAll: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
                vi: 'readonly',
                jest: 'readonly',
                spyOn: 'readonly',
                mock: 'readonly'
            }
        }
    }
];
