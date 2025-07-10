import RSSParser from 'rss-parser';                                                                                                  // Импортируем RSSParser для парсинга RSS-лент

const parser = new RSSParser();                                                                                                      // Создаем экземпляр RSSParser для парсинга

// Функция для получения RSS-ленты
export const fetchRSSFeed = async (url) => {                                                                                         // Определяем функцию для загрузки RSS-ленты
    try {                                                                                                                            // Начинаем блок обработки ошибок
        const feed = await parser.parseURL(url);                                                                                     // Парсим RSS-ленту по указанному URL
        return feed.items;                                                                                                           // Возвращаем элементы ленты
    } catch (error) {                                                                                                                // Обрабатываем возможные ошибки
        console.error(`Ошибка загрузки новостей с ${url}:`, error);                                                                  // Логируем ошибку в консоль
        return null;                                                                                                                 // Возвращаем null при ошибке
    }                                                                                                                               
};

// Контроллер для получения новостей
export const getNews = async (req, res) => {                                                                                         // Определяем функцию для получения новостей
    let news = null;                                                                                                                 // Инициализируем переменную для новостей

    console.log('Пытаемся загрузить новости с RIA...');                                                                              // Логируем попытку загрузки с RIA
    news = await fetchRSSFeed('https://ria.ru/export/rss2/archive/index.xml');                                                       // Пытаемся загрузить новости с RIA

    if (!news) {                                                                                                                     // Проверяем, получены ли новости
        console.log('RIA недоступен, переключаемся на Lenta...');                                                                    // Логируем переключение на Lenta
        news = await fetchRSSFeed('https://lenta.ru/rss');                                                                           // Пытаемся загрузить новости с Lenta
    }                                                                                                                               

    if (news) {                                                                                                                      // Проверяем, удалось ли получить новости
        res.json(news);                                                                                                              // Возвращаем новости клиенту
    } else {                                                                                                                         // Обрабатываем случай, если новости не получены
        res.status(500).send('Ошибка загрузки новостей');                                                                            // Возвращаем ошибку клиенту
    }                                                                                                                               
};