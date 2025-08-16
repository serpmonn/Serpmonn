# Serpmonn - Комплексная веб-платформа

## Обзор

Serpmonn - это современная веб-платформа, предоставляющая комплексные решения для пользователей, включая аутентификацию, игры, новости, Telegram-боты и AI-интеграции. Проект построен на Node.js с использованием Express.js и включает как веб-интерфейс, так и серверные компоненты.

## 🚀 Ключевые возможности

- **🔐 Безопасная аутентификация** - PASETO токены, bcrypt хеширование
- **🤖 Telegram-боты** - Игры, мемы, подтверждения
- **📰 RSS-новости** - Автоматическое получение и обработка новостей
- **🎮 Игровая платформа** - Интерактивные игры с таблицами лидеров
- **📱 PWA поддержка** - Прогрессивное веб-приложение
- **🤖 AI интеграция** - Google Generative AI, OpenAI
- **📧 Email сервисы** - Автоматическая отправка писем
- **🔧 Автоматизация** - X-Car сервис, счетчики, подписчики

## 🏗️ Архитектура проекта

```
Serpmonn/
├── 📁 backend/                    # Серверная часть
│   ├── 🔐 auth/                   # Аутентификация и авторизация
│   ├── 🗄️ database/               # Конфигурация БД
│   ├── 📰 news/                   # RSS новостной сервер
│   ├── 👤 profiles/               # Профили пользователей
│   ├── 🤖 telegram_bots/          # Telegram боты
│   │   ├── Serpmonn_games/        # Игровой бот
│   │   ├── SerpmonnConfirmBot/    # Бот подтверждений
│   │   └── meme-bot/              # Мем-бот
│   ├── 🚗 X-Car/                  # X-Car сервис
│   ├── 📊 Counter/                # Счетчики
│   ├── 📧 subscriber/             # Подписчики
│   ├── 🛠️ utils/                  # Утилиты
│   └── 🖥️ server.mjs              # Главный сервер
├── 🎨 frontend/                   # Клиентская часть
│   ├── 🔐 login/                  # Страница входа
│   ├── 📝 register/               # Страница регистрации
│   ├── 👤 profile/                # Профиль пользователя
│   ├── ℹ️ about-project/          # О проекте
│   ├── 📢 ad-info/                # Информация о рекламе
│   ├── 🤝 Partners/               # Партнеры
│   ├── 🔒 privacy-policy/         # Политика конфиденциальности
│   ├── 🎫 promo-codes-and-discounts/ # Промокоды
│   └── 🤖 openai_test.html        # Тест OpenAI
├── 🎮 games/                      # Игровая платформа
│   ├── 🔴 redsquare/              # Игра "Квадратное бегство"
│   └── 🔴 redsquare2/             # Игра "Падающие фигуры"
├── 📱 pwa/                        # PWA компоненты
├── 🎨 styles/                     # CSS стили
├── 📜 scripts/                    # Клиентские скрипты
├── 🔍 search/                     # Поиск
├── 🗺️ sitemap/                    # Карта сайта
├── 🖼️ images/                     # Изображения
└── 📄 Основные файлы
    ├── 🏠 main.html               # Главная страница
    ├── 📋 menu.html               # Меню
    └── 📦 package.json            # Зависимости
```

## 🛠️ Технологический стек

### Backend
- **Node.js** - Основная платформа
- **Express.js** - Веб-фреймворк
- **MySQL2** - База данных
- **PASETO** - Безопасные токены
- **bcryptjs** - Хеширование паролей
- **Nodemailer** - Отправка email
- **node-telegram-bot-api** - Telegram боты
- **@google/generative-ai** - Google AI
- **PM2** - Управление процессами

### Frontend
- **HTML5/CSS3** - Разметка и стили
- **JavaScript (ES6+)** - Клиентская логика
- **PWA** - Прогрессивное веб-приложение
- **Service Workers** - Офлайн функциональность

## 🚀 Установка и запуск

### Предварительные требования
- Node.js 18+
- MySQL
- PM2 (для продакшена)

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

# Только игровой бот
npm run start-serpmonngames

# Только мем-бот
npm run start-memebot
```

## 🔧 Конфигурация

### Переменные окружения
Создайте файл `.env` в корне проекта:

```env
# База данных
DB_HOST=localhost
DB_USER=your_username
DB_PASSWORD=your_password
DB_NAME=serpmonn

# JWT/PASETO
JWT_SECRET=your_secret_key

# Telegram боты
TELEGRAM_BOT_TOKEN=your_bot_token

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_password

# Google AI
GOOGLE_AI_API_KEY=your_api_key
```

## 📊 Мониторинг

Проект использует PM2 для управления процессами:

```bash
# Просмотр статуса всех процессов
pm2 status

# Просмотр логов
pm2 logs

# Перезапуск всех процессов
pm2 restart all
```

## 🔒 Безопасность

- **PASETO токены** для безопасной аутентификации
- **bcrypt** для хеширования паролей
- **Helmet.js** для защиты заголовков
- **Rate limiting** для защиты от DDoS
- **CORS** настройки
- **CSRF** защита

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
