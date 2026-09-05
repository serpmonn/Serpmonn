# FCM push — Dev / Prod (два Firebase-проекта)

Пуши DM на Android работают через Firebase Cloud Messaging + `@capacitor/push-notifications`.

**Prod** и **Dev** — отдельные Firebase-проекты. Один `auth-server` (prod `:5000`) шлёт в оба через два service account.

| | Prod | Dev |
|--|------|-----|
| Package | `ru.serpmonn` | `ru.serpmonn.dev` |
| Firebase | новый проект (например `serpmonn-prod`) | `serpmonn-3b411` |
| `google-services.json` | `android-app/android/app/` | `android-app-dev/android/app/` |
| Service account | `backend/secrets/firebase-service-account.json` | `backend/secrets/firebase-dev-service-account.json` |
| App tag в API | `app=prod` | `app=dev` |

Чеклист Console: [`backend/secrets/FIREBASE-CONSOLE-CHECKLIST.md`](../backend/secrets/FIREBASE-CONSOLE-CHECKLIST.md) (на сервере).

## 1. Firebase Console

### Prod

1. Создайте проект (например `serpmonn-prod`) на https://console.firebase.google.com
2. **Add app → Android**, package: `ru.serpmonn` + SHA-1
3. Скачайте `google-services.json` → (не коммитить):
   ```
   android-app/android/app/google-services.json
   ```
   Шаблон: `android-app/android/app/google-services.json.example`
4. **Service accounts → Generate new private key** →
   ```
   /var/www/serpmonn.ru/backend/secrets/firebase-service-account.json
   ```
   `chmod 600`, не коммитить
5. Cloud Credentials → Android key → только `ru.serpmonn` + SHA-1

### Dev (`serpmonn-3b411`)

1. Оставьте только Android app `ru.serpmonn.dev` (уберите `ru.serpmonn` если был)
2. Скачайте `google-services.json` → (не коммитить):
   ```
   android-app-dev/android/app/google-services.json
   ```
   Шаблон: `android-app-dev/android/app/google-services.json.example`
3. Service account →
   ```
   /var/www/serpmonn.ru/backend/secrets/firebase-dev-service-account.json
   /var/www/serpmonn-dev/backend/secrets/firebase-dev-service-account.json
   ```
4. Android key → только `ru.serpmonn.dev` + SHA-1 (после новой сборки — revoke утёкшего ключа)

## 2. Backend (.env на prod auth-server)

```env
FIREBASE_SERVICE_ACCOUNT_PATH=/var/www/serpmonn.ru/backend/secrets/firebase-service-account.json
FIREBASE_DEV_SERVICE_ACCOUNT_PATH=/var/www/serpmonn.ru/backend/secrets/firebase-dev-service-account.json
PUSH_APP_ORIGIN=https://serpmonn.ru
PUSH_DEV_APP_ORIGIN=https://dev.serpmonn.ru
```

После изменения:
```bash
pm2 restart auth-server
curl -s https://serpmonn.ru/api/push/status
# {"webPush":true,"fcm":true,"fcmProd":true,"fcmDev":true}
```

Клиент (`frontend/app/push-native.js`) при регистрации шлёт `app: 'prod'|'dev'` (по Capacitor `appId` или hostname `dev.serpmonn.ru`).

## 3. Сборка APK

```bash
# Prod
cd /var/www/serpmonn.ru/android-app && npm run build:debug   # или ваш release-скрипт

# Dev
cd /var/www/serpmonn.ru/android-app-dev
npm run build:debug
cp android/app/build/outputs/apk/debug/app-debug.apk ../frontend/downloads/Serpmonn-Dev.apk
```

Без `google-services.json` APK собирается, но FCM-токен не выдаётся. После смены Firebase-проекта нужна **пересборка** обоих приложений.

## 4. На телефоне

1. Установите новый APK
2. Войдите в аккаунт
3. Разрешите уведомления — токен уйдёт с правильным `app`
