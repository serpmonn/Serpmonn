// Улучшенный модуль новостей с персонализацией
import { personalizationManager, NEWS_SOURCES, NEWS_CATEGORIES } from './personalization.js';

class EnhancedNewsManager {
    constructor() {
        this.currentNews = [];
        this.isLoading = false;
        this.currentSource = null;
        this.currentCategory = null;
    }

    // Загрузка новостей с персонализацией
    async loadPersonalizedNews() {
        try {
            this.isLoading = true;
            this.showLoadingIndicator();

            const preferences = personalizationManager.getCurrentPreferences();
            const recommendations = personalizationManager.getPersonalizedRecommendations();
            
            // Получаем избранные источники
            const favoriteSources = preferences.favoriteSources;
            
            // Загружаем новости из избранных источников
            const allNews = [];
            
            for (const sourceId of favoriteSources) {
                try {
                    const sourceNews = await this.fetchNewsFromSource(sourceId);
                    if (sourceNews && sourceNews.length > 0) {
                        // Добавляем информацию об источнике к каждой новости
                        const newsWithSource = sourceNews.map(article => ({
                            ...article,
                            sourceId,
                            sourceName: NEWS_SOURCES[sourceId]?.name || sourceId,
                            sourceIcon: NEWS_SOURCES[sourceId]?.icon || '📰'
                        }));
                        allNews.push(...newsWithSource);
                    }
                } catch (error) {
                    console.error(`Ошибка загрузки новостей из ${sourceId}:`, error);
                }
            }

            // Сортируем по дате публикации
            allNews.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

            // Применяем фильтрацию по категориям
            const filteredNews = this.filterNewsByCategories(allNews, preferences.newsCategories);

            this.currentNews = filteredNews;
            this.renderNews();
            this.renderPersonalizationPanel();
            
        } catch (error) {
            console.error('Ошибка загрузки персонализированных новостей:', error);
            this.showError('Не удалось загрузить новости');
        } finally {
            this.isLoading = false;
            this.hideLoadingIndicator();
        }
    }

    // Загрузка новостей из конкретного источника
    async fetchNewsFromSource(sourceId) {
        const source = NEWS_SOURCES[sourceId];
        if (!source) {
            throw new Error(`Неизвестный источник: ${sourceId}`);
        }

        const response = await fetch(`/api/news/source/${sourceId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    }

    // Фильтрация новостей по категориям
    filterNewsByCategories(news, categories) {
        if (!categories || categories.length === 0) {
            return news;
        }

        return news.filter(article => {
            const source = NEWS_SOURCES[article.sourceId];
            return source && categories.includes(source.category);
        });
    }

    // Отображение новостей
    renderNews() {
        const newsContainer = document.getElementById('news-container');
        if (!newsContainer) return;

        // Очищаем контейнер
        newsContainer.innerHTML = '';

        // Добавляем заголовок с персонализацией
        const header = this.createNewsHeader();
        newsContainer.appendChild(header);

        // Создаем контейнер для новостей
        const newsList = document.createElement('div');
        newsList.className = 'news-list';

        if (this.currentNews.length === 0) {
            const noNewsMessage = document.createElement('div');
            noNewsMessage.className = 'no-news-message';
            noNewsMessage.innerHTML = `
                <p>Новости не найдены</p>
                <p>Попробуйте изменить настройки или добавить другие источники</p>
            `;
            newsList.appendChild(noNewsMessage);
        } else {
            this.currentNews.forEach(article => {
                const newsItem = this.createNewsItem(article);
                newsList.appendChild(newsItem);
            });
        }

        newsContainer.appendChild(newsList);
    }

    // Создание заголовка новостей с персонализацией
    createNewsHeader() {
        const header = document.createElement('div');
        header.className = 'news-header';

        const preferences = personalizationManager.getCurrentPreferences();
        const stats = personalizationManager.getUserStats();

        header.innerHTML = `
            <div class="news-header-content">
                <h1>Персональные новости</h1>
                <div class="news-stats">
                    <span class="stat-item">
                        <span class="stat-icon">📰</span>
                        <span class="stat-text">Прочитано: ${stats.totalArticles}</span>
                    </span>
                    <span class="stat-item">
                        <span class="stat-icon">⭐</span>
                        <span class="stat-text">Избранных источников: ${stats.favoriteSourcesCount}</span>
                    </span>
                    <span class="stat-item">
                        <span class="stat-icon">📅</span>
                        <span class="stat-text">Дней активности: ${stats.daysActive}</span>
                    </span>
                </div>
            </div>
            <div class="news-controls">
                <button class="btn btn-secondary" id="personalization-btn">
                    <span class="btn-icon">⚙️</span>
                    Настройки
                </button>
                <button class="btn btn-primary" id="refresh-news-btn">
                    <span class="btn-icon">🔄</span>
                    Обновить
                </button>
            </div>
        `;

        // Добавляем обработчики событий
        header.querySelector('#personalization-btn').addEventListener('click', () => {
            this.showPersonalizationModal();
        });

        header.querySelector('#refresh-news-btn').addEventListener('click', () => {
            this.loadPersonalizedNews();
        });

        return header;
    }

    // Создание элемента новости
    createNewsItem(article) {
        const newsItem = document.createElement('div');
        newsItem.className = 'news-item enhanced';

        const sourceInfo = NEWS_SOURCES[article.sourceId];
        const categoryInfo = NEWS_CATEGORIES[sourceInfo?.category || 'general'];

        newsItem.innerHTML = `
            <div class="news-item-header">
                <div class="news-source">
                    <span class="source-icon">${article.sourceIcon}</span>
                    <span class="source-name">${article.sourceName}</span>
                    <span class="news-category">
                        <span class="category-icon">${categoryInfo.icon}</span>
                        <span class="category-name">${categoryInfo.name}</span>
                    </span>
                </div>
                <div class="news-actions">
                    <button class="btn-icon favorite-btn" data-source="${article.sourceId}" title="Добавить в избранное">
                        ${this.isFavoriteSource(article.sourceId) ? '❤️' : '🤍'}
                    </button>
                    <button class="btn-icon share-btn" title="Поделиться">
                        📤
                    </button>
                </div>
            </div>
            <div class="news-content">
                <a href="${article.link}" target="_blank" class="news-link" data-article-id="${article.guid || article.link}">
                    <h3 class="news-title">${article.title}</h3>
                    ${article.description ? `<p class="news-description">${article.description}</p>` : ''}
                </a>
            </div>
            <div class="news-footer">
                <span class="news-date">${new Date(article.pubDate).toLocaleDateString('ru-RU')}</span>
                ${article.enclosure && article.enclosure.url ? 
                    `<img src="${article.enclosure.url}" alt="Изображение новости" class="news-image" loading="lazy">` : 
                    ''
                }
            </div>
        `;

        // Добавляем обработчики событий
        const favoriteBtn = newsItem.querySelector('.favorite-btn');
        favoriteBtn.addEventListener('click', (e) => {
            e.preventDefault();
            this.toggleFavoriteSource(article.sourceId, favoriteBtn);
        });

        const newsLink = newsItem.querySelector('.news-link');
        newsLink.addEventListener('click', () => {
            this.markArticleAsRead(article);
        });

        return newsItem;
    }

    // Проверка, является ли источник избранным
    isFavoriteSource(sourceId) {
        const preferences = personalizationManager.getCurrentPreferences();
        return preferences.favoriteSources.includes(sourceId);
    }

    // Переключение избранного источника
    toggleFavoriteSource(sourceId, button) {
        const preferences = personalizationManager.getCurrentPreferences();
        const isFavorite = preferences.favoriteSources.includes(sourceId);

        if (isFavorite) {
            personalizationManager.removeFavoriteSource(sourceId);
            button.textContent = '🤍';
            button.title = 'Добавить в избранное';
        } else {
            personalizationManager.addFavoriteSource(sourceId);
            button.textContent = '❤️';
            button.title = 'Удалить из избранного';
        }
    }

    // Отметить статью как прочитанную
    markArticleAsRead(article) {
        const sourceInfo = NEWS_SOURCES[article.sourceId];
        personalizationManager.markArticleAsRead(
            article.guid || article.link,
            article.sourceId,
            sourceInfo?.category || 'general'
        );
    }

    // Отображение панели персонализации
    renderPersonalizationPanel() {
        const recommendations = personalizationManager.getPersonalizedRecommendations();
        
        // Создаем или обновляем панель рекомендаций
        let recommendationsPanel = document.getElementById('recommendations-panel');
        if (!recommendationsPanel) {
            recommendationsPanel = document.createElement('div');
            recommendationsPanel.id = 'recommendations-panel';
            recommendationsPanel.className = 'recommendations-panel';
            document.body.appendChild(recommendationsPanel);
        }

        recommendationsPanel.innerHTML = `
            <div class="recommendations-content">
                <h3>Рекомендации для вас</h3>
                <div class="recommendations-grid">
                    <div class="recommendation-card">
                        <h4>Популярные источники</h4>
                        <div class="source-list">
                            ${recommendations.sources.map(sourceId => {
                                const source = NEWS_SOURCES[sourceId];
                                return source ? `
                                    <div class="source-item">
                                        <span class="source-icon">${source.icon}</span>
                                        <span class="source-name">${source.name}</span>
                                    </div>
                                ` : '';
                            }).join('')}
                        </div>
                    </div>
                    <div class="recommendation-card">
                        <h4>Любимые категории</h4>
                        <div class="category-list">
                            ${recommendations.categories.map(categoryId => {
                                const category = NEWS_CATEGORIES[categoryId];
                                return category ? `
                                    <div class="category-item">
                                        <span class="category-icon">${category.icon}</span>
                                        <span class="category-name">${category.name}</span>
                                    </div>
                                ` : '';
                            }).join('')}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Показать модальное окно персонализации
    showPersonalizationModal() {
        const modal = this.createPersonalizationModal();
        document.body.appendChild(modal);
        
        // Анимация появления
        setTimeout(() => modal.classList.add('show'), 10);
    }

    // Создание модального окна персонализации
    createPersonalizationModal() {
        const modal = document.createElement('div');
        modal.className = 'personalization-modal';
        
        const preferences = personalizationManager.getCurrentPreferences();
        const allSources = personalizationManager.getAllNewsSources();
        const allCategories = personalizationManager.getAllNewsCategories();
        const layoutOptions = personalizationManager.getLayoutOptions();

        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Персонализация</h2>
                    <button class="modal-close">×</button>
                </div>
                <div class="modal-body">
                    <div class="settings-section">
                        <h3>Избранные источники новостей</h3>
                        <div class="sources-grid">
                            ${Object.entries(allSources).map(([id, source]) => `
                                <label class="source-checkbox">
                                    <input type="checkbox" value="${id}" 
                                           ${preferences.favoriteSources.includes(id) ? 'checked' : ''}>
                                    <span class="checkbox-label">
                                        <span class="source-icon">${source.icon}</span>
                                        <span class="source-name">${source.name}</span>
                                    </span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="settings-section">
                        <h3>Категории новостей</h3>
                        <div class="categories-grid">
                            ${Object.entries(allCategories).map(([id, category]) => `
                                <label class="category-checkbox">
                                    <input type="checkbox" value="${id}" 
                                           ${preferences.newsCategories.includes(id) ? 'checked' : ''}>
                                    <span class="checkbox-label">
                                        <span class="category-icon">${category.icon}</span>
                                        <span class="category-name">${category.name}</span>
                                    </span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="settings-section">
                        <h3>Макет страницы</h3>
                        <div class="layout-options">
                            ${Object.entries(layoutOptions).map(([id, option]) => `
                                <label class="layout-radio">
                                    <input type="radio" name="layout" value="${id}" 
                                           ${preferences.layout === id ? 'checked' : ''}>
                                    <span class="radio-label">
                                        <span class="layout-name">${option.name}</span>
                                        <span class="layout-description">${option.description}</span>
                                    </span>
                                </label>
                            `).join('')}
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="cancel-settings">Отмена</button>
                    <button class="btn btn-primary" id="save-settings">Сохранить</button>
                </div>
            </div>
        `;

        // Добавляем обработчики событий
        modal.querySelector('.modal-close').addEventListener('click', () => {
            this.closeModal(modal);
        });

        modal.querySelector('.modal-overlay').addEventListener('click', () => {
            this.closeModal(modal);
        });

        modal.querySelector('#cancel-settings').addEventListener('click', () => {
            this.closeModal(modal);
        });

        modal.querySelector('#save-settings').addEventListener('click', () => {
            this.saveSettings(modal);
            this.closeModal(modal);
        });

        return modal;
    }

    // Сохранение настроек
    saveSettings(modal) {
        const favoriteSources = Array.from(modal.querySelectorAll('.source-checkbox input:checked'))
            .map(input => input.value);
        
        const newsCategories = Array.from(modal.querySelectorAll('.category-checkbox input:checked'))
            .map(input => input.value);
        
        const layout = modal.querySelector('input[name="layout"]:checked')?.value || 'standard';

        personalizationManager.updatePreferences({
            favoriteSources,
            newsCategories,
            layout
        });

        // Перезагружаем новости с новыми настройками
        this.loadPersonalizedNews();
    }

    // Закрытие модального окна
    closeModal(modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    }

    // Показать индикатор загрузки
    showLoadingIndicator() {
        let loader = document.getElementById('news-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'news-loader';
            loader.className = 'news-loader';
            loader.innerHTML = `
                <div class="loader-spinner"></div>
                <p>Загружаем персональные новости...</p>
            `;
            document.body.appendChild(loader);
        }
        loader.style.display = 'flex';
    }

    // Скрыть индикатор загрузки
    hideLoadingIndicator() {
        const loader = document.getElementById('news-loader');
        if (loader) {
            loader.style.display = 'none';
        }
    }

    // Показать ошибку
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'news-error';
        errorDiv.innerHTML = `
            <div class="error-content">
                <span class="error-icon">⚠️</span>
                <p>${message}</p>
                <button class="btn btn-primary" onclick="this.parentElement.parentElement.remove()">
                    Понятно
                </button>
            </div>
        `;
        document.body.appendChild(errorDiv);
    }
}

// Создаем глобальный экземпляр менеджера новостей
const enhancedNewsManager = new EnhancedNewsManager();

// Экспортируем для использования в других модулях
export default enhancedNewsManager;