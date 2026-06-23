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
                URL: 'readonly',
                URLSearchParams: 'readonly',
                fetch: 'readonly'
            }
        },
        rules: {
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'no-undef': 'error',
            'no-empty': 'warn'
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
        // Браузерные JS файлы сайта — document, window, localStorage, getComputedStyle разрешены
        files: ['assembly/site/src/**/*.js'],
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
                getComputedStyle: 'readonly',
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
                CustomEvent: 'readonly',
                HTMLElement: 'readonly',
                Element: 'readonly',
                Node: 'readonly',
                NodeList: 'readonly',
                MutationObserver: 'readonly',
                IntersectionObserver: 'readonly',
                ResizeObserver: 'readonly',
                fetch: 'readonly',
                performance: 'readonly',
                screen: 'readonly',
                innerWidth: 'readonly',
                innerHeight: 'readonly'
            }
        },
        rules: {
            'no-empty': 'warn'
        }
    }
];
