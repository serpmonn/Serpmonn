# 🚀 Руководство по развертыванию системы персонализации

## 📋 Обзор изменений

Для работы системы персонализации потребуется:

1. **Добавить новые маршруты в nginx**
2. **Обновить сервер новостей**
3. **Добавить новые файлы на сервер**

## 🔧 Шаг 1: Обновление nginx конфигурации

### Добавьте следующие маршруты в ваш nginx конфиг:

```nginx
# Добавьте эти маршруты в секцию server { ... } для serpmonn.ru
# РАЗМЕСТИТЕ ИХ ПОСЛЕ СУЩЕСТВУЮЩЕГО МАРШРУТА /news

# Прокси для персонализированных новостей
location /api/news/personalized {
    proxy_pass http://localhost:4000/api/news/personalized;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Cookie $http_cookie;
    proxy_pass_header Set-Cookie;
    proxy_cache_bypass $http_upgrade;
    proxy_connect_timeout 30s;
    proxy_read_timeout 30s;
    proxy_send_timeout 30s;
}

# Прокси для получения новостей из конкретного источника
location ~ ^/api/news/source/([^/]+)$ {
    proxy_pass http://localhost:4000/api/news/source/$1;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Cookie $http_cookie;
    proxy_pass_header Set-Cookie;
    proxy_cache_bypass $http_upgrade;
    proxy_connect_timeout 30s;
    proxy_read_timeout 30s;
    proxy_send_timeout 30s;
}

# Прокси для получения новостей по категории
location ~ ^/api/news/category/([^/]+)$ {
    proxy_pass http://localhost:4000/api/news/category/$1;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Cookie $http_cookie;
    proxy_pass_header Set-Cookie;
    proxy_cache_bypass $http_upgrade;
    proxy_connect_timeout 30s;
    proxy_read_timeout 30s;
    proxy_send_timeout 30s;
}

# Прокси для получения списка доступных источников
location /api/news/sources {
    proxy_pass http://localhost:4000/api/news/sources;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Cookie $http_cookie;
    proxy_pass_header Set-Cookie;
    proxy_cache_bypass $http_upgrade;
    proxy_connect_timeout 30s;
    proxy_read_timeout 30s;
    proxy_send_timeout 30s;
}

# Прокси для получения статистики источников
location /api/news/stats {
    proxy_pass http://localhost:4000/api/news/stats;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Cookie $http_cookie;
    proxy_pass_header Set-Cookie;
    proxy_cache_bypass $http_upgrade;
    proxy_connect_timeout 30s;
    proxy_read_timeout 30s;
    proxy_send_timeout 30s;
}

# Прокси для проверки доступности источника
location ~ ^/api/news/source/([^/]+)/check$ {
    proxy_pass http://localhost:4000/api/news/source/$1/check;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header Cookie $http_cookie;
    proxy_pass_header Set-Cookie;
    proxy_cache_bypass $http_upgrade;
    proxy_connect_timeout 30s;
    proxy_read_timeout 30s;
    proxy_send_timeout 30s;
}
```

### После добавления маршрутов:

```bash
# Проверьте конфигурацию nginx
sudo nginx -t

# Если все OK, перезагрузите nginx
sudo systemctl reload nginx
```

## 🔧 Шаг 2: Обновление сервера новостей

### Вариант A: Замена существующего сервера (рекомендуется)

1. **Остановите текущий сервер новостей:**
```bash
pm2 stop news-server
```

2. **Создайте резервную копию:**
```bash
cp /var/www/serpmonn.ru/backend/news/news-server.mjs /var/www/serpmonn.ru/backend/news/news-server.mjs.backup
```

3. **Замените файл сервера:**
```bash
cp enhanced-news-server.mjs /var/www/serpmonn.ru/backend/news/news-server.mjs
```

4. **Запустите обновленный сервер:**
```bash
pm2 start /var/www/serpmonn.ru/backend/news/news-server.mjs --name 'news-server'
```

### Вариант B: Запуск параллельного сервера

Если хотите протестировать без замены:

```bash
# Запустите новый сервер на другом порту
pm2 start enhanced-news-server.mjs --name 'enhanced-news-server' -- --port 4001

# Обновите nginx маршруты для использования порта 4001
```

## 🔧 Шаг 3: Добавление новых файлов

### Скопируйте новые файлы на сервер:

```bash
# Создайте директории если их нет
mkdir -p /var/www/serpmonn.ru/scripts
mkdir -p /var/www/serpmonn.ru/styles
mkdir -p /var/www/serpmonn.ru/backend/news

# Скопируйте файлы
cp scripts/personalization.js /var/www/serpmonn.ru/scripts/
cp scripts/enhanced-news.js /var/www/serpmonn.ru/scripts/
cp scripts/layout-manager.js /var/www/serpmonn.ru/scripts/
cp styles/personalization.css /var/www/serpmonn.ru/styles/
cp backend/news/enhanced-newsController.mjs /var/www/serpmonn.ru/backend/news/
cp backend/news/enhanced-newsRoutes.mjs /var/www/serpmonn.ru/backend/news/
cp personalization-demo.html /var/www/serpmonn.ru/
```

### Обновите права доступа:

```bash
chown -R www-data:www-data /var/www/serpmonn.ru/
chmod -R 755 /var/www/serpmonn.ru/
```

## 🔧 Шаг 4: Обновление package.json

### Добавьте новые зависимости:

```bash
cd /var/www/serpmonn.ru/
npm install rss-parser
```

### Обновите скрипты в package.json:

```json
{
  "scripts": {
    "start-news": "pm2 start backend/news/news-server.mjs --name 'news-server'",
    "restart-news": "pm2 restart news-server",
    "stop-news": "pm2 stop news-server"
  }
}
```

## 🔧 Шаг 5: Проверка работоспособности

### 1. Проверьте сервер новостей:

```bash
# Проверьте статус
pm2 status

# Проверьте логи
pm2 logs news-server

# Проверьте health check
curl http://localhost:4000/health
```

### 2. Проверьте API endpoints:

```bash
# Список источников
curl https://serpmonn.ru/api/news/sources

# Статистика
curl https://serpmonn.ru/api/news/stats

# Персонализированные новости
curl "https://serpmonn.ru/api/news/personalized?favoriteSources[]=ria&categories[]=general"
```

### 3. Проверьте веб-страницы:

- **Демо:** `https://serpmonn.ru/personalization-demo.html`
- **Главная:** `https://serpmonn.ru/main.html`

## 🔧 Шаг 6: Мониторинг и логирование

### Добавьте мониторинг в pm2:

```bash
# Настройте автоперезапуск
pm2 startup
pm2 save

# Настройте логирование
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

## 🚨 Возможные проблемы и решения

### 1. CORS ошибки
```bash
# Проверьте настройки CORS в сервере
# Убедитесь, что домены добавлены в origin
```

### 2. RSS источники недоступны
```bash
# Проверьте доступность RSS лент
curl -I https://ria.ru/export/rss2/archive/index.xml
curl -I https://lenta.ru/rss
```

### 3. Проблемы с правами доступа
```bash
# Исправьте права доступа
chown -R www-data:www-data /var/www/serpmonn.ru/
chmod -R 755 /var/www/serpmonn.ru/
```

### 4. Порт 4000 занят
```bash
# Проверьте что использует порт
netstat -tlnp | grep :4000

# Остановите конфликтующий процесс
pm2 stop conflicting-process
```

## 📊 Проверка после развертывания

### 1. Функциональные тесты:

- [ ] Демо-страница загружается
- [ ] Модальные окна открываются
- [ ] Настройки сохраняются
- [ ] Новости загружаются
- [ ] Статистика обновляется

### 2. Производительность:

- [ ] Время загрузки страницы < 3 секунд
- [ ] API ответы < 1 секунды
- [ ] Нет ошибок в консоли браузера

### 3. Безопасность:

- [ ] CORS настроен правильно
- [ ] Нет утечек данных
- [ ] SSL работает корректно

## 🔄 Откат изменений

Если что-то пошло не так:

```bash
# Восстановите старый сервер
pm2 stop news-server
cp /var/www/serpmonn.ru/backend/news/news-server.mjs.backup /var/www/serpmonn.ru/backend/news/news-server.mjs
pm2 start news-server

# Удалите новые маршруты из nginx
# Перезагрузите nginx
sudo systemctl reload nginx
```

## 📞 Поддержка

При возникновении проблем:

1. Проверьте логи: `pm2 logs news-server`
2. Проверьте статус сервисов: `pm2 status`
3. Проверьте конфигурацию nginx: `sudo nginx -t`
4. Проверьте доступность портов: `netstat -tlnp | grep :4000`

---

**Удачи с развертыванием! 🚀**