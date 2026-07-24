# Android app (RuStore / Capacitor)

Package: `ru.serpmonn`  
versionName `1.2` / versionCode `3`

См. также: [RUSTORE.md](./RUSTORE.md) — чеклист модерации, тексты карточки, push.

## Layout

- `www/` — локальная оболочка (splash/offline/entry)
- `android/` — нативный проект (Capacitor + RuStore Push SDK)
- `keystore/serpmonn.keystore` — подпись (не в git)
- `keystore.properties` — пароли (не в git; см. example)
- `rustore.properties` — `pushProjectId` из консоли (см. example)

## Dev build

```bash
cd /var/www/serpmonn-dev/android-app
export ANDROID_HOME=/opt/android-sdk
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
cp -n rustore.properties.example rustore.properties   # затем впиши pushProjectId
npm install
npm run build:debug
```

APK: `dist/Serpmonn-1.2-debug.apk`  
(также: `/frontend/downloads/Serpmonn-1.2-debug.apk` на dev)

## Release

1. `keystore.properties` + `rustore.properties` с `pushProjectId`.
2. `npm run build:release`
3. APK: `android/app/build/outputs/apk/release/app-release.apk`
