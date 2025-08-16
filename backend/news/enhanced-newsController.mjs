import RSSParser from 'rss-parser';

const parser = new RSSParser();

// Конфигурация источников новостей
const NEWS_SOURCES = {
    ria: {
        name: 'РИА Новости',
        url: 'https://ria.ru/export/rss2/archive/index.xml',
        category: 'general',
        icon: '📰'
    },
    lenta: {
        name: 'Lenta.ru',
        url: 'https://lenta.ru/rss',
        category: 'general',
        icon: '📰'
    },
    tass: {
        name: 'ТАСС',
        url: 'https://tass.ru/rss/v2.xml',
        category: 'general',
        icon: '📰'
    },
    interfax: {
        name: 'Интерфакс',
        url: 'https://www.interfax.ru/rss.asp',
        category: 'general',
        icon: '📰'
    },
    kommersant: {
        name: 'Коммерсантъ',
        url: 'https://www.kommersant.ru/RSS/news.xml',
        category: 'business',
        icon: '💼'
    },
    vedomosti: {
        name: 'Ведомости',
        url: 'https://www.vedomosti.ru/rss/news',
        category: 'business',
        icon: '💼'
    },
    rb: {
        name: 'РБК',
        url: 'https://www.rbc.ru/rss/',
        category: 'business',
        icon: '💼'
    },
    sport24: {
        name: 'Спорт-24',
        url: 'https://sport24.ru/rss.xml',
        category: 'sport',
        icon: '⚽'
    },
    championat: {
        name: 'Чемпионат',
        url: 'https://www.championat.com/rss/news.xml',
        category: 'sport',
        icon: '⚽'
    }
};

// Функция для получения RSS-ленты с обработкой ошибок
export const fetchRSSFeed = async (url, sourceId) => {
    try {
        console.log(`Загружаем новости из ${sourceId}...`);
        const feed = await parser.parseURL(url);
        
        // Добавляем информацию об источнике к каждой новости
        const itemsWithSource = feed.items.map(item => ({
            ...item,
            sourceId,
            sourceName: NEWS_SOURCES[sourceId]?.name || sourceId,
            sourceIcon: NEWS_SOURCES[sourceId]?.icon || '📰',
            category: NEWS_SOURCES[sourceId]?.category || 'general'
        }));
        
        console.log(`Успешно загружено ${itemsWithSource.length} новостей из ${sourceId}`);
        return itemsWithSource;
    } catch (error) {
        console.error(`Ошибка загрузки новостей с ${sourceId}:`, error.message);
        return null;
    }
};

// Получение новостей из конкретного источника
export const getNewsFromSource = async (req, res) => {
    const { sourceId } = req.params;
    
    if (!NEWS_SOURCES[sourceId]) {
        return res.status(404).json({ 
            error: 'Источник не найден',
            availableSources: Object.keys(NEWS_SOURCES)
        });
    }
    
    try {
        const source = NEWS_SOURCES[sourceId];
        const news = await fetchRSSFeed(source.url, sourceId);
        
        if (news) {
            res.json(news);
        } else {
            res.status(500).json({ 
                error: `Не удалось загрузить новости из ${source.name}` 
            });
        }
    } catch (error) {
        console.error(`Ошибка получения новостей из ${sourceId}:`, error);
        res.status(500).json({ 
            error: 'Внутренняя ошибка сервера' 
        });
    }
};

// Получение персонализированных новостей
export const getPersonalizedNews = async (req, res) => {
    try {
        const { favoriteSources = [], categories = [] } = req.query;
        
        // Если не указаны избранные источники, используем все доступные
        const sourcesToFetch = favoriteSources.length > 0 
            ? favoriteSources.filter(sourceId => NEWS_SOURCES[sourceId])
            : Object.keys(NEWS_SOURCES);
        
        console.log(`Загружаем персонализированные новости для источников: ${sourcesToFetch.join(', ')}`);
        
        // Загружаем новости из всех указанных источников параллельно
        const newsPromises = sourcesToFetch.map(sourceId => 
            fetchRSSFeed(NEWS_SOURCES[sourceId].url, sourceId)
        );
        
        const newsResults = await Promise.allSettled(newsPromises);
        
        // Объединяем все успешно загруженные новости
        let allNews = [];
        newsResults.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value) {
                allNews.push(...result.value);
            } else {
                console.error(`Не удалось загрузить новости из ${sourcesToFetch[index]}`);
            }
        });
        
        // Сортируем по дате публикации (новые сначала)
        allNews.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
        
        // Фильтруем по категориям, если указаны
        if (categories.length > 0) {
            allNews = allNews.filter(article => 
                categories.includes(article.category)
            );
        }
        
        // Ограничиваем количество новостей
        const maxNews = 50;
        allNews = allNews.slice(0, maxNews);
        
        console.log(`Возвращаем ${allNews.length} персонализированных новостей`);
        
        res.json({
            news: allNews,
            total: allNews.length,
            sources: sourcesToFetch,
            categories: categories,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Ошибка получения персонализированных новостей:', error);
        res.status(500).json({ 
            error: 'Внутренняя ошибка сервера' 
        });
    }
};

// Получение всех доступных источников
export const getAvailableSources = async (req, res) => {
    try {
        const sources = Object.entries(NEWS_SOURCES).map(([id, source]) => ({
            id,
            name: source.name,
            category: source.category,
            icon: source.icon,
            url: source.url
        }));
        
        // Группируем по категориям
        const sourcesByCategory = sources.reduce((acc, source) => {
            if (!acc[source.category]) {
                acc[source.category] = [];
            }
            acc[source.category].push(source);
            return acc;
        }, {});
        
        res.json({
            sources,
            sourcesByCategory,
            total: sources.length
        });
    } catch (error) {
        console.error('Ошибка получения списка источников:', error);
        res.status(500).json({ 
            error: 'Внутренняя ошибка сервера' 
        });
    }
};

// Получение статистики источников
export const getSourcesStats = async (req, res) => {
    try {
        const stats = {
            totalSources: Object.keys(NEWS_SOURCES).length,
            categories: {},
            lastUpdated: new Date().toISOString()
        };
        
        // Подсчитываем источники по категориям
        Object.values(NEWS_SOURCES).forEach(source => {
            if (!stats.categories[source.category]) {
                stats.categories[source.category] = 0;
            }
            stats.categories[source.category]++;
        });
        
        res.json(stats);
    } catch (error) {
        console.error('Ошибка получения статистики источников:', error);
        res.status(500).json({ 
            error: 'Внутренняя ошибка сервера' 
        });
    }
};

// Проверка доступности источника
export const checkSourceAvailability = async (req, res) => {
    const { sourceId } = req.params;
    
    if (!NEWS_SOURCES[sourceId]) {
        return res.status(404).json({ 
            error: 'Источник не найден' 
        });
    }
    
    try {
        const source = NEWS_SOURCES[sourceId];
        const startTime = Date.now();
        
        const news = await fetchRSSFeed(source.url, sourceId);
        const responseTime = Date.now() - startTime;
        
        res.json({
            sourceId,
            available: !!news,
            responseTime: `${responseTime}ms`,
            newsCount: news ? news.length : 0,
            lastChecked: new Date().toISOString()
        });
    } catch (error) {
        console.error(`Ошибка проверки доступности ${sourceId}:`, error);
        res.status(500).json({ 
            error: 'Ошибка проверки доступности' 
        });
    }
};

// Получение новостей по категории
export const getNewsByCategory = async (req, res) => {
    const { category } = req.params;
    
    try {
        // Находим все источники для данной категории
        const categorySources = Object.entries(NEWS_SOURCES)
            .filter(([id, source]) => source.category === category)
            .map(([id, source]) => id);
        
        if (categorySources.length === 0) {
            return res.status(404).json({ 
                error: `Категория '${category}' не найдена` 
            });
        }
        
        console.log(`Загружаем новости категории '${category}' из источников: ${categorySources.join(', ')}`);
        
        // Загружаем новости из всех источников категории
        const newsPromises = categorySources.map(sourceId => 
            fetchRSSFeed(NEWS_SOURCES[sourceId].url, sourceId)
        );
        
        const newsResults = await Promise.allSettled(newsPromises);
        
        // Объединяем новости
        let allNews = [];
        newsResults.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value) {
                allNews.push(...result.value);
            }
        });
        
        // Сортируем по дате
        allNews.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
        
        // Ограничиваем количество
        const maxNews = 30;
        allNews = allNews.slice(0, maxNews);
        
        res.json({
            category,
            news: allNews,
            total: allNews.length,
            sources: categorySources,
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error(`Ошибка получения новостей категории '${category}':`, error);
        res.status(500).json({ 
            error: 'Внутренняя ошибка сервера' 
        });
    }
};

// Экспортируем конфигурацию источников для использования в других модулях
export { NEWS_SOURCES };