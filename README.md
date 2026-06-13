# Serpmonn

<p align="center">
  <img src="https://serpmonn.ru/apple-touch-icon.png" width="96" alt="Serpmonn">
</p>

<p align="center">
  <strong>Исходный код сайта <a href="https://serpmonn.ru">serpmonn.ru</a></strong><br>
  Игровая площадка, партнёрская программа и внутренние инструменты.
</p>

<p align="center">
  <a href="https://serpmonn.ru">Сайт</a>
  &nbsp;·&nbsp;
  <a href="mailto:support@serpmonn.ru">Поддержка</a>
  &nbsp;·&nbsp;
  <a href="./messenger/README.md">Serpmonn Messenger →</a>
</p>

---

## Структура репозитория

```
/
├── frontend/          # HTML-страницы сайта (Eleventy)
├── backend/           # Node.js-бэкенд (API, авторизация, промокоды)
├── messenger/         # Проект Serpmonn Messenger
│   └── README.md      # Документация мессенджера
└── ...
```

---

## Проекты

### serpmonn.ru

Основной сайт: игровая площадка, партнёрская программа (Perfluence), промокоды, статистика страниц.

- **Frontend:** Eleventy (SSG), HTML/CSS/JS
- **Backend:** Node.js, `.env`-конфигурация, Perfluence API

### Serpmonn Messenger

Децентрализованный P2P-мессенджер с end-to-end шифрованием для Android. Подробнее — в [`messenger/README.md`](./messenger/README.md).

---

## Обратная связь

- **Баги и вопросы:** [support@serpmonn.ru](mailto:support@serpmonn.ru)
- **Идеи:** [improve@serpmonn.ru](mailto:improve@serpmonn.ru)

---

## Лицензия

[LICENSE](LICENSE)
