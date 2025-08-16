// Модуль персонализации пользователя
import { setCookie, getCookie } from './cookies.js';

// Константы для источников новостей
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

// Категории новостей
const NEWS_CATEGORIES = {
    general: { name: 'Общие новости', icon: '📰' },
    business: { name: 'Бизнес', icon: '💼' },
    sport: { name: 'Спорт', icon: '⚽' },
    tech: { name: 'Технологии', icon: '💻' },
    entertainment: { name: 'Развлечения', icon: '🎬' }
};

// Настройки главной страницы
const LAYOUT_OPTIONS = {
    compact: { name: 'Компактный', description: 'Минимум элементов' },
    standard: { name: 'Стандартный', description: 'Сбалансированный вид' },
    detailed: { name: 'Подробный', description: 'Максимум информации' }
};

// Класс для управления персонализацией
class PersonalizationManager {
    constructor() {
        this.userPreferences = this.loadUserPreferences();
        this.userBehavior = this.loadUserBehavior();
    }

    // Загрузка пользовательских настроек
    loadUserPreferences() {
        const preferences = getCookie('user_preferences');
        return preferences ? JSON.parse(preferences) : {
            layout: 'standard',
            favoriteSources: ['ria', 'lenta'],
            newsCategories: ['general'],
            showWeather: true,
            showGames: true,
            showSearch: true,
            theme: 'auto',
            language: 'ru'
        };
    }

    // Загрузка данных о поведении пользователя
    loadUserBehavior() {
        const behavior = getCookie('user_behavior');
        return behavior ? JSON.parse(behavior) : {
            readArticles: [],
            clickedCategories: {},
            timeSpent: {},
            searchHistory: [],
            gameScores: {}
        };
    }

    // Сохранение настроек
    savePreferences() {
        setCookie('user_preferences', JSON.stringify(this.userPreferences), 365);
    }

    // Сохранение данных о поведении
    saveBehavior() {
        setCookie('user_behavior', JSON.stringify(this.userBehavior), 365);
    }

    // Обновление настроек
    updatePreferences(newPreferences) {
        this.userPreferences = { ...this.userPreferences, ...newPreferences };
        this.savePreferences();
    }

    // Добавление источника в избранное
    addFavoriteSource(sourceId) {
        if (!this.userPreferences.favoriteSources.includes(sourceId)) {
            this.userPreferences.favoriteSources.push(sourceId);
            this.savePreferences();
        }
    }

    // Удаление источника из избранного
    removeFavoriteSource(sourceId) {
        this.userPreferences.favoriteSources = this.userPreferences.favoriteSources
            .filter(id => id !== sourceId);
        this.savePreferences();
    }

    // Отметить прочитанную статью
    markArticleAsRead(articleId, sourceId, category) {
        this.userBehavior.readArticles.push({
            id: articleId,
            sourceId,
            category,
            timestamp: Date.now()
        });
        
        // Обновляем статистику по категориям
        if (!this.userBehavior.clickedCategories[category]) {
            this.userBehavior.clickedCategories[category] = 0;
        }
        this.userBehavior.clickedCategories[category]++;
        
        this.saveBehavior();
    }

    // Добавить поисковый запрос в историю
    addSearchQuery(query) {
        this.userBehavior.searchHistory.unshift(query);
        // Ограничиваем историю 50 запросами
        this.userBehavior.searchHistory = this.userBehavior.searchHistory.slice(0, 50);
        this.saveBehavior();
    }

    // Получить персональные рекомендации
    getPersonalizedRecommendations() {
        const recommendations = {
            sources: this.getRecommendedSources(),
            categories: this.getRecommendedCategories(),
            layout: this.getRecommendedLayout()
        };
        return recommendations;
    }

    // Получить рекомендуемые источники на основе поведения
    getRecommendedSources() {
        const sourceStats = {};
        
        // Анализируем прочитанные статьи
        this.userBehavior.readArticles.forEach(article => {
            if (!sourceStats[article.sourceId]) {
                sourceStats[article.sourceId] = 0;
            }
            sourceStats[article.sourceId]++;
        });

        // Сортируем источники по популярности
        const sortedSources = Object.entries(sourceStats)
            .sort(([,a], [,b]) => b - a)
            .map(([sourceId]) => sourceId);

        // Возвращаем топ-3 источника + избранные
        const recommended = [...new Set([...sortedSources.slice(0, 3), ...this.userPreferences.favoriteSources])];
        return recommended.slice(0, 5);
    }

    // Получить рекомендуемые категории
    getRecommendedCategories() {
        const categoryStats = this.userBehavior.clickedCategories;
        const sortedCategories = Object.entries(categoryStats)
            .sort(([,a], [,b]) => b - a)
            .map(([category]) => category);

        return sortedCategories.length > 0 ? sortedCategories : ['general'];
    }

    // Получить рекомендуемый макет
    getRecommendedLayout() {
        const totalRead = this.userBehavior.readArticles.length;
        if (totalRead > 100) return 'detailed';
        if (totalRead > 50) return 'standard';
        return 'compact';
    }

    // Получить статистику пользователя
    getUserStats() {
        const totalArticles = this.userBehavior.readArticles.length;
        const favoriteSourcesCount = this.userPreferences.favoriteSources.length;
        const mostReadCategory = Object.entries(this.userBehavior.clickedCategories)
            .sort(([,a], [,b]) => b - a)[0];

        return {
            totalArticles,
            favoriteSourcesCount,
            mostReadCategory: mostReadCategory ? mostReadCategory[0] : null,
            daysActive: this.calculateDaysActive()
        };
    }

    // Вычислить количество активных дней
    calculateDaysActive() {
        const timestamps = this.userBehavior.readArticles.map(article => article.timestamp);
        if (timestamps.length === 0) return 0;
        
        const uniqueDays = new Set(
            timestamps.map(timestamp => new Date(timestamp).toDateString())
        );
        return uniqueDays.size;
    }

    // Получить все доступные источники новостей
    getAllNewsSources() {
        return NEWS_SOURCES;
    }

    // Получить все категории новостей
    getAllNewsCategories() {
        return NEWS_CATEGORIES;
    }

    // Получить опции макета
    getLayoutOptions() {
        return LAYOUT_OPTIONS;
    }

    // Получить текущие настройки пользователя
    getCurrentPreferences() {
        return this.userPreferences;
    }

    // Получить историю поиска
    getSearchHistory() {
        return this.userBehavior.searchHistory;
    }

    // Очистить историю поиска
    clearSearchHistory() {
        this.userBehavior.searchHistory = [];
        this.saveBehavior();
    }
}

// Создаем глобальный экземпляр менеджера персонализации
const personalizationManager = new PersonalizationManager();

// Экспортируем функции для использования в других модулях
export {
    personalizationManager,
    NEWS_SOURCES,
    NEWS_CATEGORIES,
    LAYOUT_OPTIONS
};

// Экспортируем класс для создания новых экземпляров
export default PersonalizationManager;