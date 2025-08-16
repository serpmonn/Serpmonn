// Модуль управления макетом главной страницы
import { personalizationManager } from './personalization.js';

class LayoutManager {
    constructor() {
        this.currentLayout = 'standard';
        this.layoutConfigs = {
            compact: {
                newsHeight: '25%',
                searchHeight: '15%',
                adHeight: '10%',
                showStats: false,
                showRecommendations: false
            },
            standard: {
                newsHeight: '40%',
                searchHeight: '20%',
                adHeight: '15%',
                showStats: true,
                showRecommendations: true
            },
            detailed: {
                newsHeight: '60%',
                searchHeight: '25%',
                adHeight: '20%',
                showStats: true,
                showRecommendations: true
            }
        };
    }

    // Инициализация макета
    init() {
        const preferences = personalizationManager.getCurrentPreferences();
        this.currentLayout = preferences.layout || 'standard';
        this.applyLayout(this.currentLayout);
        this.setupLayoutControls();
    }

    // Применение макета
    applyLayout(layoutType) {
        const config = this.layoutConfigs[layoutType];
        if (!config) return;

        this.currentLayout = layoutType;
        
        // Применяем стили к контейнерам
        this.updateContainerStyles(config);
        
        // Показываем/скрываем элементы
        this.toggleElements(config);
        
        // Сохраняем настройку
        personalizationManager.updatePreferences({ layout: layoutType });
        
        console.log(`Применен макет: ${layoutType}`);
    }

    // Обновление стилей контейнеров
    updateContainerStyles(config) {
        const newsContainer = document.getElementById('news-container');
        const searchContainer = document.querySelector('.main-search-container');
        const adContainer = document.querySelector('.ad-container');

        if (newsContainer) {
            newsContainer.style.minHeight = config.newsHeight;
            newsContainer.style.maxHeight = config.newsHeight;
        }

        if (searchContainer) {
            searchContainer.style.minHeight = config.searchHeight;
        }

        if (adContainer) {
            adContainer.style.minHeight = config.adHeight;
        }
    }

    // Переключение элементов интерфейса
    toggleElements(config) {
        // Статистика
        const statsElements = document.querySelectorAll('.news-stats');
        statsElements.forEach(element => {
            element.style.display = config.showStats ? 'flex' : 'none';
        });

        // Панель рекомендаций
        const recommendationsPanel = document.getElementById('recommendations-panel');
        if (recommendationsPanel) {
            recommendationsPanel.style.display = config.showRecommendations ? 'block' : 'none';
        }
    }

    // Настройка элементов управления макетом
    setupLayoutControls() {
        // Добавляем кнопку быстрого переключения макета
        this.addLayoutToggleButton();
        
        // Добавляем индикатор текущего макета
        this.addLayoutIndicator();
    }

    // Добавление кнопки переключения макета
    addLayoutToggleButton() {
        const header = document.querySelector('.news-header');
        if (!header) return;

        const controls = header.querySelector('.news-controls');
        if (!controls) return;

        const layoutBtn = document.createElement('button');
        layoutBtn.className = 'btn btn-secondary';
        layoutBtn.id = 'layout-toggle-btn';
        layoutBtn.innerHTML = `
            <span class="btn-icon">📐</span>
            Макет
        `;

        layoutBtn.addEventListener('click', () => {
            this.showLayoutSelector();
        });

        controls.appendChild(layoutBtn);
    }

    // Добавление индикатора макета
    addLayoutIndicator() {
        const header = document.querySelector('.news-header');
        if (!header) return;

        const headerContent = header.querySelector('.news-header-content');
        if (!headerContent) return;

        const indicator = document.createElement('div');
        indicator.className = 'layout-indicator';
        indicator.innerHTML = `
            <span class="indicator-icon">📐</span>
            <span class="indicator-text">${this.getLayoutDisplayName(this.currentLayout)}</span>
        `;

        headerContent.appendChild(indicator);
    }

    // Получение отображаемого имени макета
    getLayoutDisplayName(layoutType) {
        const names = {
            compact: 'Компактный',
            standard: 'Стандартный',
            detailed: 'Подробный'
        };
        return names[layoutType] || layoutType;
    }

    // Показать селектор макета
    showLayoutSelector() {
        const modal = this.createLayoutSelectorModal();
        document.body.appendChild(modal);
        
        setTimeout(() => modal.classList.add('show'), 10);
    }

    // Создание модального окна выбора макета
    createLayoutSelectorModal() {
        const modal = document.createElement('div');
        modal.className = 'layout-selector-modal';
        
        const layoutOptions = personalizationManager.getLayoutOptions();
        
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Выбор макета</h2>
                    <button class="modal-close">×</button>
                </div>
                <div class="modal-body">
                    <div class="layout-options-grid">
                        ${Object.entries(layoutOptions).map(([id, option]) => `
                            <div class="layout-option ${id === this.currentLayout ? 'active' : ''}" data-layout="${id}">
                                <div class="layout-preview">
                                    <div class="preview-header">${option.name}</div>
                                    <div class="preview-content">
                                        <div class="preview-news" style="height: ${this.layoutConfigs[id].newsHeight}"></div>
                                        <div class="preview-search" style="height: ${this.layoutConfigs[id].searchHeight}"></div>
                                        <div class="preview-ad" style="height: ${this.layoutConfigs[id].adHeight}"></div>
                                    </div>
                                </div>
                                <div class="layout-info">
                                    <h3>${option.name}</h3>
                                    <p>${option.description}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" id="cancel-layout">Отмена</button>
                    <button class="btn btn-primary" id="apply-layout">Применить</button>
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

        modal.querySelector('#cancel-layout').addEventListener('click', () => {
            this.closeModal(modal);
        });

        modal.querySelector('#apply-layout').addEventListener('click', () => {
            const selectedLayout = modal.querySelector('.layout-option.active')?.dataset.layout;
            if (selectedLayout) {
                this.applyLayout(selectedLayout);
                this.updateLayoutIndicator();
            }
            this.closeModal(modal);
        });

        // Обработчики выбора макета
        modal.querySelectorAll('.layout-option').forEach(option => {
            option.addEventListener('click', () => {
                modal.querySelectorAll('.layout-option').forEach(opt => opt.classList.remove('active'));
                option.classList.add('active');
            });
        });

        return modal;
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

    // Обновление индикатора макета
    updateLayoutIndicator() {
        const indicator = document.querySelector('.layout-indicator .indicator-text');
        if (indicator) {
            indicator.textContent = this.getLayoutDisplayName(this.currentLayout);
        }
    }

    // Получение текущего макета
    getCurrentLayout() {
        return this.currentLayout;
    }

    // Получение конфигурации макета
    getLayoutConfig() {
        return this.layoutConfigs[this.currentLayout];
    }

    // Адаптация макета под размер экрана
    adaptToScreenSize() {
        const width = window.innerWidth;
        
        if (width < 768) {
            // На мобильных устройствах используем компактный макет
            if (this.currentLayout !== 'compact') {
                this.applyLayout('compact');
            }
        } else if (width < 1024) {
            // На планшетах используем стандартный макет
            if (this.currentLayout !== 'standard') {
                this.applyLayout('standard');
            }
        }
    }
}

// Создаем глобальный экземпляр менеджера макета
const layoutManager = new LayoutManager();

// Экспортируем для использования в других модулях
export default layoutManager;