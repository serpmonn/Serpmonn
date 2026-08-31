# Serpmonn Android (Capacitor)

Оболочка RuStore / Google Play. При старте открывает:

`https://serpmonn.ru/frontend/app/index.html?app=1`

**Не путать** с TWA на ПК (`Serpmonnapp` → `miniapp.html?env=twa` — это VK Mini App).

## Восстановление

Проект восстановлен 2026-08-27 из:
- `Serpmonn-1.2.1.apk` (shell + `capacitor.config.json`)
- `node_modules/.package-lock.json` (зависимости Capacitor 7.6.8)
- `/tmp/serpmonn-android-build.log` (скрипты сборки)

## Сборка

```bash
cd /var/www/serpmonn-dev/android-app
npm install
npm run build:debug      # debug APK
# npm run build:release  # нужен keystore.properties
# npm run build:bundle   # AAB для Google Play
```

## Подпись

Keystore **не** в git. Для release положите `keystore.properties` и файл ключа
(на ПК: `F:\KeyStorePath\serpmonn.keystore`). SHA256 должен совпадать с
`.well-known/assetlinks.json` на проде.

## Версия

- `versionName` / npm: `1.2.1`
- package: `ru.serpmonn`
