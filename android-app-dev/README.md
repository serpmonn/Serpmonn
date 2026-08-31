# Serpmonn Dev (Android)

Отдельная оболочка **`ru.serpmonn.dev`** для тестов на `dev.serpmonn.ru`.  
Prod-пакет **`ru.serpmonn`** не трогаем.

## Отличия от prod

| | Dev | Prod (`../android-app/`) |
|---|---|---|
| Пакет | `ru.serpmonn.dev` | `ru.serpmonn` |
| Entry | `dev.serpmonn.ru/frontend/app/...` | `serpmonn.ru/frontend/app/...` |
| Basic Auth | автоматически (dev/dev из `.dev-auth`) | нет |
| WebView debug | включён | выключен |

UI (вкладки, профиль, чат) грузится **с сервера** — правки в `/var/www/serpmonn-dev/frontend/app/` видны без пересборки APK.  
Пересборка нужна только при смене оболочки (иконка, MainActivity, стартовый URL).

## Сборка Dev APK

```bash
cd /var/www/serpmonn-dev/android-app-dev
npm install
npm run publish:dev
```

APK: `/var/www/serpmonn-dev/frontend/downloads/Serpmonn-Dev.apk`

## Установка на телефон

```bash
adb install -r frontend/downloads/Serpmonn-Dev.apk
# или скачать: https://dev.serpmonn.ru/frontend/downloads/Serpmonn-Dev.apk
```

Prod (`ru.serpmonn`) и Dev (`ru.serpmonn.dev`) ставятся **рядом**.

## Workflow

1. Правите веб на dev → открываете Dev APK (обновить экран).
2. Готовите выкат → merge в prod, тест prod APK / Play.
3. Меняете оболочку → `npm run publish:dev`, переустановка Dev APK.
