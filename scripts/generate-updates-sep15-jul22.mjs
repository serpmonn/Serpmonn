#!/usr/bin/env node
/**
 * Generates assembly/site/_data/updatesSep15Jul22.json
 * RU + EN full content; other locales copy EN (same pattern as many KB articles).
 */
import fs from 'fs';
import path from 'path';

const root = '/var/www/serpmonn.ru';
const locales = JSON.parse(
  fs.readFileSync(path.join(root, 'assembly/site/_data/locales.json'), 'utf8')
);

const ru = {
  meta: {
    title: 'Обновления Serpmonn — 15 сентября 2025 — 22 июля 2026',
    ogTitle: 'Обновления Serpmonn — 15 сентября 2025 — 22 июля 2026',
    ogDescription:
      'Мессенджер, Serpmonn AI, находки, вход через VK и мессенджер, Pro/баллы, новые инструменты и масштабная локализация.',
    twitterTitle: 'Обновления Serpmonn — сентябрь 2025 — июль 2026',
    twitterDescription:
      'Мессенджер, AI-поиск, находки, профиль, Pro, инструменты и локализация на 49 языков.'
  },
  jsonld: {
    headline: 'Обновления Serpmonn — 15 сентября 2025 — 22 июля 2026',
    description:
      'Большой обзор обновлений: P2P-мессенджер, Serpmonn AI, находки, авторизация, Pro и новые инструменты.'
  },
  breadcrumbs: {
    home: 'Главная',
    news: 'Новости',
    current: 'Обновления 15 сентября 2025 — 22 июля 2026'
  },
  article: {
    title: '🚀 Обновления Serpmonn',
    date: '15 сентября 2025 — 22 июля 2026 года'
  },
  summary: {
    title: '📋 Коротко',
    items: [
      '<strong>Serpmonn Messenger</strong> — пре-альфа Android APK, страница мессенджера, дорожная карта, вход на сайт через QR в приложении.',
      '<strong>Serpmonn AI</strong> — агентный и мультимодальный поиск, голосовой ввод, автологин, доработки интерфейса и лимитов.',
      '<strong>Находки</strong> — социальный слой поверх поиска: публикация находок и лента.',
      '<strong>Аккаунт</strong> — вход через VK, аватары, уведомления (колокольчик), профиль и реферальная система.',
      '<strong>Pro и баллы</strong> — тарифы с ЮKassa, система баллов и обмен на дни Pro.',
      '<strong>Инструменты</strong> — JSON-форматтер, Base64, цветовые палитры, конвертер форматов изображений и другие улучшения.',
      '<strong>Игры</strong> — 2048 на 49 языках, Fat Rat, тренажёр печати, Atomic Heart в каталоге, доработки раздела игр.',
      '<strong>Локализация</strong> — сайт и ключевые разделы на ~49 языках, RTL-правки, SEO/hreflang/sitemap.',
      '<strong>Сайт</strong> — страница 404, донат, «Что улучшить?», база знаний, партнёры и промокоды.'
    ]
  },
  stats: {
    cards: [
      { number: '49', label: 'Языков сайта' },
      { number: '1', label: 'P2P-мессенджер' },
      { number: '10+', label: 'Крупных направлений' }
    ]
  },
  sections: [
    {
      title: '💬 Serpmonn Messenger',
      items: [
        'Появилась тестовая (пре-альфа) версия децентрализованного P2P-мессенджера для Android с end-to-end шифрованием.',
        'Страница мессенджера: <code>/frontend/messenger.html</code> — описание, скачивание APK, установка из неизвестных источников.',
        'Дорожная карта: <code>/frontend/messenger-roadmap.html</code> — этапы развития простым языком.',
        'Универсальный APK для смартфонов и 64‑битных эмуляторов (отдельные сборки под архитектуры больше не нужны).',
        'Вход на сайт через мессенджер: привязка аккаунта и авторизация по QR без пароля и SMS.',
        'Обновлены README и материалы о проекте: мессенджер — часть экосистемы Serpmonn.'
      ]
    },
    {
      title: '🤖 Serpmonn AI и поиск',
      items: [
        'Агентный режим поиска — ИИ сам уточняет и собирает ответ.',
        'Мультимодальный поиск (beta): текст и другие типы запросов в одном сценарии.',
        'Голосовой ввод переведён на собственную реализацию.',
        'Доработан интерфейс Serpmonn AI, автологин в AI-раздел.',
        'Улучшено отображение ответов на смартфонах, уведомление «ответ скопирован», иконки «Поделиться».',
        'Лимиты запросов: исправления списания при повторной отправке, UX для новых пользователей.',
        'Раздел AI Agents: каталог агентов, «мои агенты», кабинет разработчика, подписки (ЮKassa), логи действий.'
      ]
    },
    {
      title: '🔎 Находки',
      items: [
        'Новый слой поверх AI-поиска: можно сохранять и делиться «находками».',
        'Лента находок для просмотра интересных результатов сообщества.',
        'API находок в экосистеме auth/backend (<code>/api/findings/*</code>).'
      ]
    },
    {
      title: '👤 Аккаунт, профиль и вход',
      items: [
        'Авторизация через VK и быстрый переход в профиль из меню.',
        'Загрузка и смена аватара (в том числе на других языках).',
        'Уведомления вынесены в отдельный UX с иконкой-колокольчиком.',
        'Упрощена авторизация, более понятные сообщения об ошибках.',
        'Доработки профиля на мобильных (PWA/TWA), локализация профиля на 49 языках.',
        'Удалён ConfirmBot Telegram из стека сайта — упор на собственные сценарии входа.'
      ]
    },
    {
      title: '⭐ Pro, баллы и рефералы',
      items: [
        'Страница тарифов и успешная оплата Pro с интеграцией ЮKassa.',
        'Система баллов: начисление и обмен баллов на дни подписки Pro (RU и все локали).',
        'Реферальная система и понятие «активный пользователь».',
        'Корректная обработка реферальных ссылок для всех языковых версий.'
      ]
    },
    {
      title: '🛠 Инструменты и база знаний',
      items: [
        'Новые инструменты: JSON-форматтер, Base64-конвертер, цветовые палитры, конвертер форматов изображений.',
        'Статья «JSON форматтер: зачем он нужен и как пользоваться».',
        'Доработаны калькулятор амортизации (интерфейс, экспорт, загрузка) и страница инструментов.',
        'Конвертер единиц и эко-калькуляторы локализованы на множество языков.',
        'База знаний расширена и доработана; инструменты и KB лучше связаны из меню.',
        'Инструмент «Создать AI-аватар» в разделе дизайн.'
      ]
    },
    {
      title: '🎮 Игры',
      items: [
        'Игра 2048 локализована на 49 языков.',
        'Добавлены Fat Rat (раскорми крысу) и тренажёр печати (для RU/EN и дальше).',
        'В каталог ПК-игр добавлена Atomic Heart.',
        'Доработаны страница «Все игры», меню и иконки (в т.ч. для старых iPhone).',
        'Обновлена таблица лидеров.'
      ]
    },
    {
      title: '🏷 Промокоды, партнёры и донат',
      items: [
        'Крупные доработки страницы «Промокоды и скидки»: UX, шаринг, счётчик подписчиков (RU).',
        'Рассылка с промокодами и отписка.',
        'Партнёры: REG.RU, Одиссея Дракона, Adventure36, VRNHoney, OneHouseBoat, snapstick.ru, CDEK и др.; часть устаревших убрана.',
        'Страница «Поддержать проект»: донаты, блок «Куда идут донаты?», кнопка в меню на 49 языках.'
      ]
    },
    {
      title: '🌍 Локализация и SEO',
      items: [
        'Масштабная локализация: главная, поиск, меню, новости, игры, инструменты, профиль, логин, политика, статьи — до ~49 языков.',
        'Добавлены новые языки (в т.ч. филиппинский и другие); RTL-правки для арабских и родственных локалей.',
        'hreflang на страницах, улучшение sitemap и скриптов генерации карт сайта.',
        'Массовые i18n-правки: убраны «зашитые» строки, ключи вынесены в словари.',
        'SEO для инструментов (JSON-LD SoftwareApplication и др.).'
      ]
    },
    {
      title: '📱 Приложение, PWA и сайт',
      items: [
        'Манифест PWA: иконки 192/512, скриншоты, мелкие иконки 16/32.',
        'APK Serpmonn beta в меню мобильных приложений (с пометками типов сборок).',
        'Страница 404, доработки «О проекте» (динамический счётчик страниц).',
        'Страница «Что улучшить?» для предложений пользователей.',
        'Мини-приложение и главная: доработки навигации и мобильного UX.',
        'Политика конфиденциальности обновлена.'
      ]
    },
    {
      title: '🔐 Надёжность и безопасность',
      items: [
        'Усилена защита сервера и аутентификации, CSRF-конфигурация, smoke-тесты.',
        'Исправления по безопасности фронта и бэкенда (XSS, injection и др.).',
        'Добавлен SECURITY.md.'
      ]
    }
  ],
  bugfixes: {
    title: '🛠 Исправления (выборочно)',
    items: [
      '404 при переходах с поиска на главную в не‑RU локалях.',
      'Битые ссылки на странице промокодов («Почему код не работает?»).',
      'Селектор языка больше не «всплывает» на чужие страницы.',
      'Лишние перезагрузки при свайпе вверх на промокодах; случайный pull-to-refresh на поиске.',
      'Отображение профиля и кнопки выхода; мобильная вёрстка профиля в PWA/TWA.',
      'Списание лимита AI при повторной отправке того же запроса.',
      'Ширина кнопок донатов на мобильных; фон логотипа Serpmonn; меню RTL.',
      'Множество мелких правок локализации, меню, игр и калькуляторов.'
    ]
  },
  share: {
    vk: 'Поделиться VK',
    telegram: 'Поделиться Telegram'
  },
  ads: {
    closeAria: 'Закрыть рекламу'
  }
};

const en = {
  meta: {
    title: 'Serpmonn Updates — September 15, 2025 — July 22, 2026',
    ogTitle: 'Serpmonn Updates — September 15, 2025 — July 22, 2026',
    ogDescription:
      'Messenger, Serpmonn AI, Findings, VK & messenger login, Pro/points, new tools, and large-scale localization.',
    twitterTitle: 'Serpmonn Updates — Sep 2025 — Jul 2026',
    twitterDescription:
      'Messenger, AI search, Findings, profile, Pro, tools, and localization across 49 languages.'
  },
  jsonld: {
    headline: 'Serpmonn Updates — September 15, 2025 — July 22, 2026',
    description:
      'Major update overview: P2P messenger, Serpmonn AI, Findings, auth, Pro, and new tools.'
  },
  breadcrumbs: {
    home: 'Home',
    news: 'News',
    current: 'Updates Sep 15, 2025 — Jul 22, 2026'
  },
  article: {
    title: '🚀 Serpmonn Updates',
    date: 'September 15, 2025 — July 22, 2026'
  },
  summary: {
    title: '📋 Summary',
    items: [
      '<strong>Serpmonn Messenger</strong> — Android pre-alpha APK, landing page, roadmap, and website login via QR in the app.',
      '<strong>Serpmonn AI</strong> — agentic & multimodal search, voice input, auto-login, UI and quota improvements.',
      '<strong>Findings</strong> — a social layer on top of search: publish finds and browse a feed.',
      '<strong>Account</strong> — VK login, avatars, bell notifications, profile, and referrals.',
      '<strong>Pro & points</strong> — YooKassa plans, points economy, redeem points for Pro days.',
      '<strong>Tools</strong> — JSON formatter, Base64, color palettes, image format converter, and more.',
      '<strong>Games</strong> — 2048 in 49 languages, Fat Rat, typing trainer, Atomic Heart in the catalog.',
      '<strong>Localization</strong> — ~49 languages, RTL fixes, SEO/hreflang/sitemaps.',
      '<strong>Site</strong> — 404 page, donate, “What to improve?”, knowledge base, partners & promo codes.'
    ]
  },
  stats: {
    cards: [
      { number: '49', label: 'Site languages' },
      { number: '1', label: 'P2P messenger' },
      { number: '10+', label: 'Major focus areas' }
    ]
  },
  sections: [
    {
      title: '💬 Serpmonn Messenger',
      items: [
        'Pre-alpha decentralized P2P messenger for Android with end-to-end encryption.',
        'Messenger page: <code>/frontend/messenger.html</code> — overview and APK download.',
        'Roadmap: <code>/frontend/messenger-roadmap.html</code>.',
        'Universal APK for phones and 64-bit emulators.',
        'Website login via messenger: account linking and QR auth without password/SMS.',
        'Project docs updated: messenger is part of the Serpmonn ecosystem.'
      ]
    },
    {
      title: '🤖 Serpmonn AI & search',
      items: [
        'Agentic search mode — the AI refines and assembles the answer.',
        'Multimodal search (beta).',
        'Voice input moved to our own implementation.',
        'Serpmonn AI UI improvements and auto-login.',
        'Better mobile answers, “copied” toast, share icons.',
        'Quota fixes (duplicate submit) and UX for new users.',
        'AI Agents: catalog, my agents, developer dashboard, YooKassa subscriptions, action logs.'
      ]
    },
    {
      title: '🔎 Findings',
      items: [
        'Save and share “findings” from AI search.',
        'Findings feed for the community.',
        'Findings API in the backend (<code>/api/findings/*</code>).'
      ]
    },
    {
      title: '👤 Account, profile & login',
      items: [
        'VK login and quick Profile menu entry.',
        'Avatar upload/change (including other languages).',
        'Notifications with a bell icon.',
        'Clearer auth errors; profile localization for 49 languages.',
        'Mobile profile fixes for PWA/TWA.',
        'Telegram ConfirmBot removed from the site stack.'
      ]
    },
    {
      title: '⭐ Pro, points & referrals',
      items: [
        'Plans page and Pro checkout via YooKassa.',
        'Points system with redeem-for-Pro-days (all locales).',
        'Referral system and “active user” concept.',
        'Correct referral links across language versions.'
      ]
    },
    {
      title: '🛠 Tools & knowledge base',
      items: [
        'New tools: JSON formatter, Base64 converter, color palettes, image format converter.',
        'Guide article for the JSON formatter.',
        'Depreciation calculator UX/export fixes; tools hub improvements.',
        'Unit converter & eco calculators localized widely.',
        'Knowledge base expanded; “Create AI avatar” tool in Design.'
      ]
    },
    {
      title: '🎮 Games',
      items: [
        '2048 localized to 49 languages.',
        'Fat Rat and typing trainer added.',
        'Atomic Heart listed in PC games.',
        'All Games page, menu, and icon polish; leaderboard updates.'
      ]
    },
    {
      title: '🏷 Promo codes, partners & donate',
      items: [
        'Promo codes page UX, sharing, subscriber counter (RU).',
        'Promo mailing + unsubscribe.',
        'Partners updated (REG.RU, Dragon Odyssey, Adventure36, VRNHoney, OneHouseBoat, snapstick.ru, CDEK, …).',
        'Donate page with “Where donations go” and menu entry in 49 languages.'
      ]
    },
    {
      title: '🌍 Localization & SEO',
      items: [
        'Site-wide localization up to ~49 languages.',
        'New languages added; RTL fixes.',
        'hreflang, sitemap generation improvements.',
        'i18n cleanup: fewer hard-coded strings.',
        'SEO for tools (JSON-LD and more).'
      ]
    },
    {
      title: '📱 App, PWA & site',
      items: [
        'PWA manifest icons/screenshots.',
        'Serpmonn beta APK in mobile apps menu.',
        '404 page; About page with dynamic page counter.',
        '“What to improve?” suggestions page.',
        'Mini-app and home navigation polish; privacy policy update.'
      ]
    },
    {
      title: '🔐 Reliability & security',
      items: [
        'Stronger auth/server protection, CSRF, smoke tests.',
        'Security fixes on frontend/backend.',
        'SECURITY.md added.'
      ]
    }
  ],
  bugfixes: {
    title: '🛠 Fixes (selected)',
    items: [
      '404 when going from search to home on non-RU locales.',
      'Broken promo-code help links.',
      'Language selector leaking across pages.',
      'Accidental reload / pull-to-refresh on promo and search.',
      'Profile logout button and PWA/TWA layout.',
      'AI quota charged twice on resubmit.',
      'Donate button width on mobile; logo background; RTL menu.',
      'Many small localization, menu, games, and calculator fixes.'
    ]
  },
  share: {
    vk: 'Share on VK',
    telegram: 'Share on Telegram'
  },
  ads: {
    closeAria: 'Close ad'
  }
};

const out = { ru, en };
for (const loc of locales) {
  if (loc === 'ru' || loc === 'en') continue;
  out[loc] = structuredClone(en);
}

const outPath = path.join(root, 'assembly/site/_data/updatesSep15Jul22.json');
fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
console.log('Wrote', outPath, 'locales:', Object.keys(out).length);

// Prepend news card into localesNews.json
const newsPath = path.join(root, 'assembly/site/_data/localesNews.json');
const news = JSON.parse(fs.readFileSync(newsPath, 'utf8'));

const cardRu = {
  category: 'updates',
  categoryLabel: 'Обновления',
  title: 'Обновления Serpmonn: сентябрь 2025 — июль 2026',
  excerpt:
    'Мессенджер, Serpmonn AI, находки, вход через VK и мессенджер, Pro и баллы, новые инструменты, игры и локализация на 49 языков.',
  date: '22 июля 2026',
  readTime: '12–18 мин',
  link: '/frontend/knowledge-base/articles/updates-sep15-2025-jul22-2026.html',
  ariaLabel: 'Читать об обновлениях Serpmonn за сентябрь 2025 — июль 2026',
  tags: 'обновления,новости,мессенджер,ai,находки,pro,инструменты,serpmonn'
};

const cardEn = {
  category: 'updates',
  categoryLabel: 'Updates',
  title: 'Serpmonn Updates: September 2025 — July 2026',
  excerpt:
    'Messenger, Serpmonn AI, Findings, VK & messenger login, Pro & points, new tools, games, and localization across 49 languages.',
  date: 'July 22, 2026',
  readTime: '12–18 min',
  link: '/frontend/en/knowledge-base/articles/updates-sep15-2025-jul22-2026.html',
  ariaLabel: 'Read Serpmonn updates for September 2025 — July 2026',
  tags: 'updates,news,messenger,ai,findings,pro,tools,serpmonn'
};

for (const loc of Object.keys(news)) {
  if (!news[loc]?.news?.articles) continue;
  const articles = news[loc].news.articles;
  const linkRu = '/frontend/knowledge-base/articles/updates-sep15-2025-jul22-2026.html';
  const linkEn = `/frontend/${loc}/knowledge-base/articles/updates-sep15-2025-jul22-2026.html`;
  const already = articles.some(
    (a) =>
      a.link === linkRu ||
      a.link === linkEn ||
      a.link?.includes('updates-sep15-2025-jul22-2026')
  );
  if (already) continue;
  const card =
    loc === 'ru'
      ? cardRu
      : {
          ...cardEn,
          link:
            loc === 'en'
              ? '/frontend/en/knowledge-base/articles/updates-sep15-2025-jul22-2026.html'
              : `/frontend/${loc}/knowledge-base/articles/updates-sep15-2025-jul22-2026.html`
        };
  articles.unshift(card);
}

fs.writeFileSync(newsPath, JSON.stringify(news, null, 2) + '\n');
console.log('Updated localesNews.json');
