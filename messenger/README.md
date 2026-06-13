# Serpmonn Messenger

<p align="center">
  <img src="https://serpmonn.ru/apple-touch-icon.png" width="96" alt="Serpmonn">
</p>

<p align="center">
  <strong>Децентрализованный P2P-мессенджер с end-to-end шифрованием</strong><br>
  Сообщения передаются напрямую между устройствами.<br>
  Никто — ни серверы, ни разработчики — не имеет доступа к вашей переписке.
</p>

<p align="center">
  <a href="https://serpmonn.ru/frontend/downloads/app-debug.apk"><strong>⬇ Скачать APK (пре-альфа)</strong></a>
  &nbsp;·&nbsp;
  <a href="https://serpmonn.ru/frontend/messenger.html">Страница мессенджера</a>
  &nbsp;·&nbsp;
  <a href="mailto:support@serpmonn.ru">Поддержка</a>
</p>

> **⚠️ Пре-альфа.** Приложение в активной разработке. Возможны баги и изменения.  
> Требуется **Android 8.0+** и интернет-соединение.  
> Групповые беседы пока не поддерживаются.

---

## Как это работает

- **End-to-end шифрование** — сообщения шифруются на устройстве до отправки и расшифровываются только у собеседника. Никто — ни серверы, ни разработчики — не имеет доступа к содержимому. Даже количество пользователей мессенджера нам неизвестно.
- **P2P-соединение** — устройства общаются напрямую, без промежуточных серверов. Сообщения не проходят через инфраструктуру Serpmonn.
- **Relay-fallback** — при жёстком NAT трафик идёт через relay-узлы, оставаясь E2E-зашифрованным.

---

## Технологический стек

| Компонент | Технологии |
|---|---|
| **Android-приложение** | Kotlin, Jetpack Compose, gomobile |
| **Core-библиотека** | Go, libp2p |
| **Сеть** | QUIC, DCUtR, Relay v2 |
| **Групповой pub/sub** | GossipSub |
| **Шифрование** | Ed25519, Curve25519, AES-GCM |
| **Хранилище** | SQLite |

---

## Дорожная карта

| # | Этап | Статус |
|---|---|---|
| 1 | JS-прототип (Node.js + libp2p) | ✅ Готово |
| 2 | Go-core: identity, crypto, chat, storage | ✅ Готово |
| 3 | Go-core net: QUIC + Relay v2 + DCUtR + GossipSub | ✅ Готово |
| **4** | **Android: onboarding, чат, QR** | **→ Сейчас (пре-альфа)** |
| 5 | Backup, restore, linked desktop | Далее |
| 6 | BLE / Wi-Fi Direct mesh | Далее |
| 7 | iOS | Далее |

---

## Установка APK

1. На Android-устройстве откройте **Настройки → Безопасность** и разрешите установку из неизвестных источников.
2. Скачайте [`app-debug.apk`](https://serpmonn.ru/frontend/downloads/app-debug.apk).
3. Откройте загруженный файл и установите.

> Сборка подписана debug-ключом — Android предупредит, это ожидаемо для пре-альфы.

---

## Обратная связь

- **Баги:** [support@serpmonn.ru](mailto:support@serpmonn.ru)
- **Идеи и предложения:** [improve@serpmonn.ru](mailto:improve@serpmonn.ru)
