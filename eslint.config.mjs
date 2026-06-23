import js from '@eslint/js';

// Общие браузерные глобалы (window, document, и т..) — используются в браузерных JS файлах
const browserGlobals = {
    window: 'readonly',
    document: 'readonly',
    localStorage: 'readonly',
    sessionStorage: 'readonly',
    navigator: 'readonly',
    location: 'readonly',
    history: 'readonly',
    alert: 'readonly',
    confirm: 'readonly',
    prompt: 'readonly',
    getComputedStyle: 'readonly',
    requestAnimationFrame: 'readonly',
    cancelAnimationFrame: 'readonly',
    setTimeout: 'readonly',
    clearTimeout: 'readonly',
    setInterval: 'readonly',
    clearInterval: 'readonly',
    console: 'readonly',
    fetch: 'readonly',
    crypto: 'readonly',
    performance: 'readonly',
    screen: 'readonly',
    innerWidth: 'readonly',
    innerHeight: 'readonly',
    scrollX: 'readonly',
    scrollY: 'readonly',
    pageXOffset: 'readonly',
    pageYOffset: 'readonly',
    Image: 'readonly',
    Audio: 'readonly',
    Event: 'readonly',
    CustomEvent: 'readonly',
    MouseEvent: 'readonly',
    KeyboardEvent: 'readonly',
    TouchEvent: 'readonly',
    HTMLElement: 'readonly',
    HTMLInputElement: 'readonly',
    HTMLCanvasElement: 'readonly',
    Element: 'readonly',
    Node: 'readonly',
    NodeList: 'readonly',
    DOMParser: 'readonly',
    URL: 'readonly',
    URLSearchParams: 'readonly',
    Blob: 'readonly',
    File: 'readonly',
    FileReader: 'readonly',
    FormData: 'readonly',
    XMLHttpRequest: 'readonly',
    WebSocket: 'readonly',
    Worker: 'readonly',
    MutationObserver: 'readonly',
    IntersectionObserver: 'readonly',
    ResizeObserver: 'readonly',
    PerformanceObserver: 'readonly',
    AbortController: 'readonly',
    AbortSignal: 'readonly',
    Promise: 'readonly',
    Symbol: 'readonly',
    Map: 'readonly',
    Set: 'readonly',
    WeakMap: 'readonly',
    WeakSet: 'readonly',
    Proxy: 'readonly',
    Reflect: 'readonly',
    JSON: 'readonly',
    Math: 'readonly',
    Array: 'readonly',
    Object: 'readonly',
    String: 'readonly',
    Number: 'readonly',
    Boolean: 'readonly',
    Date: 'readonly',
    RegExp: 'readonly',
    Error: 'readonly'
};

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
        // Все JS/MJS файлы — базовые настройки ES Modules + Node.js глобалы
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
                mock: 'readonly',
                console: 'readonly',
                process: 'readonly',
                Buffer: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                URL: 'readonly',
                URLSearchParams: 'readonly',
                fetch: 'readonly',
                crypto: 'readonly'
            }
        }
    },
    {
        // CommonJS файлы assembly — require, module, __dirname разрешены
        files: ['assembly/*.js', 'assembly/**/*.js'],
        ignores: ['assembly/site/src/**/*.js'],
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
            sourceType: 'script',
            globals: {
                self: 'readonly',
                caches: 'readonly',
                clients: 'readonly',
                importScripts: 'readonly',
                fetch: 'readonly',
                Request: 'readonly',
                Response: 'readonly',
                Headers: 'readonly',
                Cache: 'readonly',
                CacheStorage: 'readonly',
                skipWaiting: 'readonly',
                console: 'readonly',
                Promise: 'readonly',
                URL: 'readonly',
                URLSearchParams: 'readonly',
                location: 'readonly',
                crypto: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                setInterval: 'readonly',
                clearInterval: 'readonly'
            }
        },
        rules: {
            'no-empty': 'warn',
            'no-undef': 'off'
        }
    },
    {
        // Браузерные JS файлы сайта (assembly/site/src) — отключаем no-undef т.к. файлы разделяют глобальный скоп через HTML
        files: ['assembly/site/src/**/*.js'],
        ignores: ['**/service-worker.js', '**/sw.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'script',
            globals: browserGlobals
        },
        rules: {
            'no-empty': 'warn',
            'no-undef': 'off',
            'no-dupe-keys': 'warn'
        }
    }
];
