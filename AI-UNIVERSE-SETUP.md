# 🧠 AI-Персонализированная Вселенная - Руководство по настройке

## 📋 Обзор

AI-Персонализированная Вселенная - это революционная система, которая создает уникальный цифровой опыт для каждого пользователя SerpMonn, используя искусственный интеллект для анализа поведения, персонализации контента и создания адаптивных функций.

## 🚀 Быстрый старт

### 1. Установка зависимостей

```bash
# Убедитесь, что у вас установлены все необходимые пакеты
npm install @google/generative-ai mysql2 express cors express-rate-limit
```

### 2. Настройка базы данных

```bash
# Выполните SQL скрипт для создания таблиц
mysql -u your_username -p your_database < ai-universe-database.sql
```

### 3. Настройка переменных окружения

Добавьте в ваш `.env` файл:

```env
# AI-Персонализированная Вселенная
AI_UNIVERSE_PORT=3600
GEMINI_API_KEY=your_gemini_api_key
MODEL_NAME=gemini-pro

# База данных (если еще не настроена)
DB_HOST=localhost
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_database_name
```

### 4. Запуск AI-Universe сервера

```bash
# Запуск в режиме разработки
node backend/ai-universe/ai-universe-server.mjs

# Или добавьте в package.json
npm run start-ai-universe
```

### 5. Интеграция с основным сервером

Добавьте в `package.json`:

```json
{
  "scripts": {
    "start-ai-universe": "pm2 start backend/ai-universe/ai-universe-server.mjs --name 'ai-universe'"
  }
}
```

## 🔧 Интеграция с существующими компонентами

### Интеграция с поисковой системой

```javascript
// В вашем основном поисковом сервере
import PersonalizedSearch from './ai-universe/personalized-search.mjs';

const personalizedSearch = new PersonalizedSearch();

// Модифицируйте ваш поисковый endpoint
app.post('/search', async (req, res) => {
  const { query, userId } = req.body;
  
  // Получаем базовые результаты поиска
  const basicResults = await performBasicSearch(query);
  
  // Персонализируем результаты
  const personalizedResults = await personalizedSearch.performPersonalizedSearch(
    query,
    userId,
    basicResults
  );
  
  res.json(personalizedResults);
});
```

### Интеграция с игровой системой

```javascript
// В вашем игровом сервере
import BehaviorAnalyzer from './ai-universe/behavior-analyzer.mjs';

const behaviorAnalyzer = new BehaviorAnalyzer();

// Анализируем игровое поведение
app.post('/games/submit-score', async (req, res) => {
  const { userId, gameData } = req.body;
  
  // Анализируем поведение игрока
  const analysis = await behaviorAnalyzer.analyzeGameBehavior(gameData, userId);
  
  // Адаптируем игру под игрока
  const adaptedGame = await adaptGameToPlayer(userId, analysis);
  
  res.json({ score: gameData.score, adaptedGame });
});
```

### Интеграция с новостной системой

```javascript
// В вашем новостном сервере
import BehaviorAnalyzer from './ai-universe/behavior-analyzer.mjs';

const behaviorAnalyzer = new BehaviorAnalyzer();

// Персонализируем новости
app.get('/news/personalized/:userId', async (req, res) => {
  const { userId } = req.params;
  
  // Получаем персональный профиль
  const profile = await behaviorAnalyzer.getPersonalProfile(userId);
  
  // Генерируем персональные рекомендации
  const recommendations = await behaviorAnalyzer.generatePersonalizedRecommendations(
    userId,
    'news'
  );
  
  res.json({ recommendations });
});
```

## 📊 API Endpoints

### Анализ поведения
```
POST /api/ai-universe/analyze-behavior
{
  "userId": 123,
  "actionType": "search_query",
  "data": { "query": "искусственный интеллект" }
}
```

### Персонализированный поиск
```
POST /api/ai-universe/personalized-search
{
  "userId": 123,
  "query": "машинное обучение",
  "searchResults": [...]
}
```

### Получение профиля пользователя
```
GET /api/ai-universe/user-profile/123
```

### Персональные рекомендации
```
GET /api/ai-universe/recommendations/123?context=general
```

### Персонализированная страница
```
GET /api/ai-universe/personalized-page/123
```

## 🎯 Тестирование

### Тестовые данные

```javascript
// Тестовый запрос для проверки работы
const testData = {
  userId: 1,
  query: "лучшие игры 2024",
  searchResults: [
    {
      title: "Топ-10 игр 2024",
      description: "Обзор лучших игр года",
      url: "https://example.com/games-2024"
    }
  ]
};

// Отправка тестового запроса
fetch('http://localhost:3600/api/ai-universe/personalized-search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(testData)
})
.then(response => response.json())
.then(data => console.log(data));
```

### Проверка работоспособности

```bash
# Проверка статуса сервера
curl http://localhost:3600/api/ai-universe/stats

# Тест анализа поведения
curl -X POST http://localhost:3600/api/ai-universe/test \
  -H "Content-Type: application/json" \
  -d '{"testType": "behavior_analysis", "data": {"query": "тест"}}'
```

## 🔒 Безопасность

### Ограничения запросов
- Максимум 100 запросов на IP за 15 минут
- Валидация всех входных данных
- Защита от SQL-инъекций через параметризованные запросы

### Приватность данных
- Анонимизация данных пользователей
- Возможность отключения персонализации
- Соблюдение GDPR требований

## 📈 Мониторинг и аналитика

### Метрики для отслеживания
- Количество активных пользователей AI-функций
- Средняя оценка персонализации
- Время отклика API
- Использование различных функций

### Логирование
```javascript
// Все действия логируются в таблицу behavior_logs
// Статистика собирается в ai_universe_stats
// Ошибки записываются в консоль сервера
```

## 🚀 Развертывание в продакшене

### PM2 конфигурация
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'ai-universe',
    script: 'backend/ai-universe/ai-universe-server.mjs',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      AI_UNIVERSE_PORT: 3600
    }
  }]
};
```

### Nginx конфигурация
```nginx
location /api/ai-universe/ {
    proxy_pass http://localhost:3600;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

## 🔧 Обслуживание

### Очистка старых данных
```sql
-- Очистка данных старше 90 дней
CALL CleanupOldAIData(90);
```

### Резервное копирование
```bash
# Создание резервной копии AI-данных
mysqldump -u username -p database_name ai_user_profiles behavior_logs personalized_search_results > ai_universe_backup.sql
```

## 📞 Поддержка

При возникновении проблем:

1. Проверьте логи сервера: `pm2 logs ai-universe`
2. Убедитесь в правильности API ключей
3. Проверьте подключение к базе данных
4. Обратитесь к документации API

## 🎉 Готово!

Теперь у вас есть полнофункциональная AI-персонализированная вселенная! 

Пользователи получат:
- ✅ Персонализированные результаты поиска
- ✅ Умные рекомендации контента
- ✅ Адаптивные игры
- ✅ Персональный AI-ассистент
- ✅ Уникальный цифровой опыт

**Следующие шаги:**
1. Запустите сервер и протестируйте API
2. Интегрируйте с существующими компонентами
3. Добавьте фронтенд интерфейс
4. Соберите обратную связь от пользователей
5. Итеративно улучшайте персонализацию