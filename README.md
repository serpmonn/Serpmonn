# Tip Calculator (Чаевые — калькулятор)

Простое и полезное Android‑приложение на Jetpack Compose без лишних разрешений. Считает чаевые, делит счёт на людей, поддерживает варианты округления. Готово к публикации в магазинах приложений (например, RuStore).

## Сборка

1. Откройте проект в Android Studio (Giraffe или новее).
2. Убедитесь, что установлены SDK 34 и JDK 17.
3. Выполните синхронизацию Gradle (Android Studio сделает это автоматически). Если нужно, сгенерируйте Gradle Wrapper: Tools → Gradle → Wrapper.
4. Запустите на устройстве или эмуляторе (Run ▶).

## Релиз (AAB)

1. Build → Generate Signed App Bundle / APK…
2. Выберите Android App Bundle (AAB).
3. Создайте или подключите keystore, заполните поля (applicationId: `ru.simpleapps.tipcalc`, versionName/Code в `app/build.gradle.kts`).
4. Соберите `release` AAB.
5. Загрузите AAB в магазин (RuStore), добавьте скриншоты и описание.

## Политика конфиденциальности

Приложение работает полностью локально, не требует доступа к сети и не собирает пользовательские данные.
См. `PRIVACY.md`.

## Локализация

- Английский: `app/src/main/res/values/strings.xml`
- Русский: `app/src/main/res/values-ru/strings.xml`

## Идентификатор приложения

По умолчанию: `com.example.tipcalc`. Перед публикацией при желании замените на свой пакет (например, `ru.mycompany.tipcalc`) в:
- `app/build.gradle.kts` (`applicationId`)
- `AndroidManifest.xml` (не требуется менять, если `namespace` совпадает)
- пакетах Kotlin‑кода (`com.example.tipcalc`)
