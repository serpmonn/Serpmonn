# FCM push для Serpmonn Dev (ru.serpmonn.dev)

Пуши DM на Android работают через Firebase Cloud Messaging + `@capacitor/push-notifications`.

## 1. Firebase Console

1. Создайте проект (или используйте существующий) на https://console.firebase.google.com
2. **Add app → Android**
   - Package name: `ru.serpmonn.dev`
   - Скачайте `google-services.json`
3. Положите файл сюда (уже настроено):
   ```
   android-app-dev/android/app/google-services.json
   ```
4. **Project settings → Service accounts → Generate new private key**
   - Сохраните JSON на сервер (уже настроено):
     ```
     backend/secrets/firebase-dev-service-account.json
     ```
   - Права: `chmod 600`, не коммитить в git

## 2. Backend (.env)

В `backend/.env` (prod auth-server, порт 5000 — dev API проксируется туда):

```env
FIREBASE_SERVICE_ACCOUNT_PATH=/var/www/serpmonn-dev/backend/secrets/firebase-dev-service-account.json
PUSH_APP_ORIGIN=https://dev.serpmonn.ru
```

Альтернатива — одной строкой JSON:
```env
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

После добавления:
```bash
pm2 restart auth-server
```

Проверка:
```bash
curl -s https://dev.serpmonn.ru/api/push/status
# {"webPush":true,"fcm":true}
```

## 3. Сборка APK

```bash
cd android-app-dev
npm run build:debug
cp android/app/build/outputs/apk/debug/app-debug.apk ../frontend/downloads/Serpmonn-Dev.apk
```

Без `google-services.json` APK собирается, но FCM-токен не выдаётся.

## 4. На телефоне

1. Установите новый APK
2. Войдите в аккаунт
3. Профиль → **Уведомления** → включить → разрешить в системе
4. С другого аккаунта отправьте DM, пока приложение в фоне или на другой вкладке

Тап по уведомлению открывает вкладку «Сообщения» и нужный диалог (`?tab=inbox&dm=username`).
