# Что сделать вручную после коммита биллинга

## 1. Установить пакет YooKassa

```bash
npm install yookassa
```

---

## 2. Добавить переменные окружения

В файл `.env` (или в настройки сервера/хостинга):

```
YOOKASSA_SHOP_ID=ваш_shop_id
YOOKASSA_SECRET_KEY=ваш_secret_key
```

Получить их можно в личном кабинете ЮKassa → Интеграция → HTTP API.

---

## 3. Добавить колонку `earned_rub` в таблицу `agents`

```sql
ALTER TABLE agents ADD COLUMN earned_rub INT NOT NULL DEFAULT 0;
```

---

## 4. Создать новые таблицы

Запустить миграцию вручную или добавить вызов в app.mjs при старте:

```js
import { createSubscriptionsTable } from './agents/subscriptions.model.mjs';
await createSubscriptionsTable();
```

Это создаст таблицы `agent_subscriptions` и `agent_payouts` если их нет.

---

## 5. Подключить роуты в app.mjs

```js
import subscriptionRoutes from './agents/subscriptions.routes.mjs';
app.use('/api/agents', subscriptionRoutes);
```

---

## 6. Зарегистрировать webhook в ЮKassa

В личном кабинете ЮKassa → Интеграция → Webhook:
- URL: `https://serpmonn.ru/api/agents/subscription-webhook`
- Событие: `payment.succeeded`

---

## 7. Убедиться что `serpToken` передаётся на страницу дашборда

В `dashboard.html` JS ожидает глобальную переменную `serpToken` с JWT токеном пользователя.
Если её нет — нужно добавить в шаблон при рендере страницы:

```html
<script>const serpToken = "{{ user_jwt }}";</script>
```

---

_Последнее обновление: 11.06.2026_
