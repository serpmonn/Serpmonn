# Serpmonn - Комплексная веб-платформа

## Обзор

Serpmonn - это масштабная веб-платформа, предоставляющая комплексные решения для пользователей, включая аутентификацию, игры, новости, Telegram-боты, AI-интеграции, email-сервисы и автоматизацию. Проект построен на Node.js с использованием Express.js и включает множество микросервисов.

## 🚀 Ключевые возможности

- **🔐 Безопасная аутентификация** - PASETO токены, bcrypt хеширование, восстановление пароля
- **🤖 Telegram-боты** - Игры, мемы, подтверждения, автоматизация
- **📰 RSS-новости** - Автоматическое получение и обработка новостей
- **🎮 Игровая платформа** - Интерактивные игры с таблицами лидеров (2048, RedSquare)
- **📱 PWA поддержка** - Прогрессивное веб-приложение
- **🤖 AI интеграция** - Google Generative AI, OpenAI, саморазвивающаяся система
- **📧 Email сервисы** - Автоматическая отправка писем, OnnMail система
- **🔧 Автоматизация** - X-Car сервис, счетчики, подписчики
- **👤 Профили пользователей** - Управление профилями и настройками
- **🔍 Поисковая система** - Интегрированный поиск по контенту
- **📊 Аналитика** - Счетчики и метрики

## 🏗️ Расширенная архитектура проекта

```
Serpmonn/
├── 📁 backend/                           # Серверная часть
│   ├── 🔐 auth/                          # Аутентификация и авторизация
│   │   ├── authController.mjs            # Контроллеры аутентификации
│   │   ├── authRoutes.mjs                # Маршруты аутентификации
│   │   ├── verifyToken.mjs               # Верификация токенов
│   │   ├── keygenerator.js               # Генератор ключей
│   │   ├── onnmail/                      # OnnMail система
│   │   │   └── onnmail-server.mjs        # Сервер OnnMail
│   │   └── password-reset/               # Восстановление пароля
│   │       └── password-reset-server.mjs # Сервер сброса пароля
│   ├── 🗄️ database/                      # Конфигурация БД
│   │   └── db.mjs                        # Подключение к MySQL
│   ├── 🎮 backend/games/                 # Игровая платформа (серверная часть)
│   │   ├── leaderboard-server.mjs        # API таблицы лидеров
│   │   ├── leaderboards.json             # Данные лидеров
│   │   └── bannedWords.json              # Запрещённые слова
│   ├── 📰 news/                          # RSS новостной сервер
│   │   └── news-server.mjs               # Сервер новостей
│   ├── 👤 profiles/                      # Профили пользователей
│   │   ├── profilesController.js         # Контроллеры профилей
│   │   └── profilesRoutes.js             # Маршруты профилей
│   ├── 🤖 telegram_bots/                 # Telegram боты
│   │   ├── Serpmonn_games/               # Игровой бот
│   │   │   └── Serpmonn_games.cjs        # Основной файл игрового бота
│   │   ├── SerpmonnConfirmBot/           # Бот подтверждений
│   │   │   └── SerpmonnConfirmBot.mjs    # Бот подтверждений
│   │   └── meme-bot/                     # Мем-бот
│   │       └── meme-bot.mjs              # Мем-бот
│   ├── 🚗 X-Car/                         # X-Car сервис
│   │   └── x-car-server.mjs              # Сервер X-Car
│   ├── 📊 Counter/                       # Счетчики и метрики
│   ├── 📧 subscriber/                    # Подписчики
│   ├── 🛠️ utils/                         # Утилиты
│   ├── 🤖 openai.mjs                     # OpenAI интеграция
│   └── 🖥️ server.mjs                     # Главный сервер
├── 🎨 frontend/                          # Клиентская часть
│   ├── 🔐 login/                         # Страница входа
│   │   ├── login.html                    # HTML страница входа
│   │   ├── login_scripts.js              # Скрипты входа
│   │   ├── login_styles.css              # Стили входа
│   │   └── forgot/                       # Восстановление пароля
│   │       ├── forgot.html               # Страница "Забыл пароль"
│   │       └── reset/                    # Сброс пароля
│   │           └── reset.html            # Страница сброса
│   ├── 📝 register/                      # Страница регистрации
│   │   ├── register.html                 # HTML страница регистрации
│   │   ├── register_scripts.js           # Скрипты регистрации
│   │   └── register_styles.css           # Стили регистрации
│   ├── 👤 profile/                       # Профиль пользователя
│   │   ├── profile.html                  # HTML профиля
│   │   ├── profile_scripts.js            # Скрипты профиля
│   │   ├── profile_styles.css            # Стили профиля
│   │   └── onnmail/                      # OnnMail в профиле
│   │       ├── onnmail.html              # OnnMail интерфейс
│   │       ├── onnmail-scripts/          # Скрипты OnnMail
│   │       └── onnmail-styles/           # Стили OnnMail
│   ├── ℹ️ about-project/                 # О проекте
│   │   └── about-project.html            # Страница о проекте
│   ├── 📢 ad-info/                       # Информация о рекламе
│   │   └── ad-info.html                  # Страница рекламы
│   ├── 🤝 Partners/                      # Партнеры
│   │   └── partners.html                 # Страница партнеров
│   ├── 🔒 privacy-policy/                # Политика конфиденциальности
│   │   └── privacy-policy.html           # Страница политики
│   ├── 🎫 promo-codes-and-discounts/     # Промокоды и скидки
│   │   └── promo-codes.html              # Страница промокодов
│   └── 🤖 openai_test.html               # Тест OpenAI
├── 🎮 frontend/games/                    # Игровая платформа (клиентская часть)
│   ├── 🔢 2048/                          # Игра 2048
│   │   ├── 2048.html                     # Страница игры 2048
│   │   ├── 2048_scripts/                 # Скрипты игры 2048
│   │   └── 2048_styles/                  # Стили игры 2048
│   ├── 🔴 redsquare/                     # Игра "Квадратное бегство"
│   │   ├── redsquare.html                # Страница игры
│   │   ├── redsquare_scripts/            # Скрипты игры
│   │   │   └── redsquare_scripts.js      # Основной скрипт
│   │   └── redsquare_styles/             # Стили игры
│   │       └── redsquare_styles.css      # CSS стили
│   └── 🔴 redsquare2/                    # Игра "Падающие фигуры"
│       ├── redsquare2.html               # Страница игры
│       ├── leaderboards.json             # Таблица лидеров
│       ├── bannedWords.json              # Запрещенные слова
│       ├── score_table.html              # Страница таблицы лидеров
│       ├── leaderboard-server.mjs        # Сервер таблицы лидеров
│       ├── redsquare2_scripts/           # Скрипты игры
│       └── redsquare2_styles/            # Стили игры
├── 🤖 serpmonn-ai/                       # AI компоненты
│   └── self-developing-system.mjs        # Саморазвивающаяся система
├── 📱 frontend/pwa/                      # PWA компоненты
│   ├── app.js                            # Главный скрипт PWA
│   ├── manifest.json                     # Манифест веб-приложения
│   └── service-worker.js                 # Сервисный воркер
├── 🎨 styles/                            # CSS стили
│   ├── ad.css                            # Стили для рекламы
│   ├── background.css                    # Стили для фона
│   ├── base.css                          # Основные стили
│   ├── cookie.css                        # Стили для cookies
│   ├── donation-button.css               # Стили кнопки пожертвований
│   ├── main.css                          # Стили главной страницы
│   ├── media.css                         # Медиа-запросы
│   ├── menu.css                          # Стили меню
│   ├── news.css                          # Стили новостей
│   ├── our_banners.css                   # Стили баннеров
│   ├── pwa.css                           # Стили PWA
│   ├── search.css                        # Стили поиска
│   └── styles.css                        # Общие стили
├── 📜 scripts/                           # Клиентские скрипты
│   ├── backgroundGenerator.js            # Генератор фона
│   ├── cookies.js                        # Обработка cookies
│   ├── install.js                        # Установка PWA
│   ├── menu.js                           # Функционал меню
│   ├── news.js                           # Обработка новостей
│   └── scripts.js                        # Общие утилиты
├── 🔍 search/                            # Поисковая система
│   └── searchresults.html                # Результаты поиска
├── 🗺️ sitemap/                           # Карта сайта
│   ├── sitemap.xml                       # XML карта сайта
│   └── UpdateSitemapDate.js              # Обновление дат
├── 🖼️ frontend/images/                            # Изображения
│   ├── Adventure36.ico                   # Иконки
│   ├── Banner_Serpmonn.png               # Баннеры
│   └── ...                               # Другие изображения
└── 📄 Основные файлы
    ├── 🏠 main.html                      # Главная страница
    ├── 📋 menu.html                      # Меню
    ├── 📦 package.json                   # Зависимости
    ├── 🔑 public.key                     # Публичный ключ
    ├── 🤖 robots.txt                     # Инструкции для краулеров
    └── 📄 LICENSE                        # Лицензия
```

## 🛠️ Технологический стек

### Backend (Node.js/Express)
- **Node.js 18+** - Основная платформа
- **Express.js** - Веб-фреймворк
- **MySQL2** - База данных
- **PASETO** - Безопасные токены
- **bcryptjs** - Хеширование паролей
- **Nodemailer** - Отправка email
- **node-telegram-bot-api** - Telegram боты
- **@google/generative-ai** - Google AI
- **OpenAI API** - OpenAI интеграция
- **RSS Parser** - Обработка RSS лент
- **PM2** - Управление процессами
- **Helmet.js** - Безопасность
- **CORS** - Cross-origin requests
- **Rate Limiting** - Защита от DDoS

### Frontend
- **HTML5/CSS3** - Разметка и стили
- **JavaScript (ES6+)** - Клиентская логика
- **PWA** - Прогрессивное веб-приложение
- **Service Workers** - Офлайн функциональность
- **Responsive Design** - Адаптивный дизайн

### Микросервисы
- **Auth Server** - Аутентификация
- **News Server** - RSS новости
- **Leaderboard Server** - Таблицы лидеров
- **OnnMail Server** - Email система
- **Password Reset Server** - Восстановление пароля
- **X-Car Server** - Автоматизация
- **Telegram Bots** - Множественные боты

## 🚀 Установка и запуск

### Предварительные требования
- Node.js 18+
- MySQL 8.0+
- PM2 (для продакшена)
- Telegram Bot Token
- Google AI API Key
- OpenAI API Key (опционально)

### Установка
```bash
# Клонирование репозитория
git clone https://github.com/serpmonn/Serpmonn.git
cd Serpmonn

# Установка зависимостей
npm install

# Настройка переменных окружения
cp .env.example .env
# Отредактируйте .env файл с вашими настройками

# Запуск всех сервисов
npm start
```

### Отдельные сервисы
```bash
# Только аутентификация
npm run start-auth

# Только новости
npm run start-news

# Только таблица лидеров
npm run start-leaderboard

# Только игровой бот
npm run start-serpmonngames

# Только бот подтверждений
npm run start-serpmonnconfirm

# Только мем-бот
npm run start-memebot

# Только X-Car сервис
npm run start-X-Car

# Только OnnMail
npm run start-onnmail

# Только восстановление пароля
npm run start-password-reset
```

## 🔧 Конфигурация

### Переменные окружения
Создайте файл `.env` в корне проекта:

```env
# База данных
DB_HOST=localhost
DB_PORT=3306
DB_USER=serpmonn_user
DB_PASSWORD=your_secure_password
DB_NAME=serpmonn_db

# Безопасность - PASETO/JWT
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_random
PASETO_SECRET_KEY=your_paseto_secret_key_here

# Telegram боты
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHAT_ID=your_telegram_chat_id_here

# Email настройки (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=Serpmonn <noreply@serpmonn.com>

# AI API
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Настройки сервера
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Логирование
LOG_LEVEL=info
LOG_FILE=logs/app.log

# PWA настройки
PWA_NAME=Serpmonn
PWA_SHORT_NAME=Serpmonn
PWA_DESCRIPTION=Комплексная веб-платформа Serpmonn

# Игровые настройки
GAME_LEADERBOARD_LIMIT=100
GAME_SESSION_TIMEOUT=3600000

# RSS новости
RSS_UPDATE_INTERVAL=300000
RSS_MAX_ITEMS=50

# Безопасность
BCRYPT_ROUNDS=12
SESSION_SECRET=your_session_secret_here
CSRF_SECRET=your_csrf_secret_here

# Мониторинг
ENABLE_MONITORING=true
MONITORING_PORT=3001
```

## 📊 Мониторинг и управление

### PM2 Управление процессами
```bash
# Просмотр статуса всех процессов
pm2 status

# Просмотр логов
pm2 logs

# Перезапуск всех процессов
pm2 restart all

# Остановка всех процессов
pm2 stop all

# Удаление всех процессов
pm2 delete all
```

### Отдельные сервисы
```bash
# Перезапуск конкретного сервиса
pm2 restart auth-server
pm2 restart news-server
pm2 restart serpmonngamesbot

# Просмотр логов конкретного сервиса
pm2 logs auth-server
pm2 logs memebot
```

## 🔒 Безопасность

- **PASETO токены** для безопасной аутентификации
- **bcrypt** для хеширования паролей
- **Helmet.js** для защиты заголовков
- **Rate limiting** для защиты от DDoS
- **CORS** настройки
- **CSRF** защита
- **Валидация входных данных**
- **Безопасные сессии**

## 🎮 Игровая платформа

### Доступные игры
1. **2048** - Классическая игра-головоломка
2. **RedSquare** - Игра "Квадратное бегство"
3. **RedSquare2** - Игра "Падающие фигуры" с таблицей лидеров

### Таблица лидеров
- Автоматическое обновление результатов
- Фильтрация запрещенных слов
- Рейтинговая система

## 🤖 AI и автоматизация

### AI компоненты
- **Google Generative AI** - Интеграция с Google AI
- **OpenAI** - Интеграция с OpenAI API
- **Саморазвивающаяся система** - Автоматическое обучение

### Telegram боты
- **Serpmonn Games** - Игровой бот
- **SerpmonnConfirmBot** - Бот подтверждений
- **Meme Bot** - Мем-бот

### Автоматизация
- **X-Car** - Автоматизация процессов
- **OnnMail** - Email автоматизация
- **RSS новости** - Автоматическое получение новостей

## 📧 Email система

### OnnMail
- Автоматическая отправка писем
- Шаблоны писем
- Управление подписчиками
- Аналитика отправок

### Восстановление пароля
- Безопасный процесс сброса
- Временные токены
- Email уведомления

## 🤝 Вклад в проект

1. Форкните репозиторий
2. Создайте ветку для новой функции (`git checkout -b feature/amazing-feature`)
3. Зафиксируйте изменения (`git commit -m 'Add amazing feature'`)
4. Отправьте в ветку (`git push origin feature/amazing-feature`)
5. Откройте Pull Request

## 📄 Лицензия

Этот проект распространяется под проприетарной лицензией. См. файл [LICENSE](./LICENSE) для подробностей.

## 👨‍💻 Автор

**Сергей Попов** - [GitHub](https://github.com/serpmonn)

## 📞 Поддержка

Если у вас есть вопросы или предложения, создайте Issue в репозитории или свяжитесь с автором.

---

*Последнее обновление: Август 2024*
