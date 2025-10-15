// games.js - JavaScript функциональность для страницы игр Serpmonn

/**
 * Функция для обработки рекламных блоков
 * Скрывает рекламные блоки, если реклама не загрузилась
 */
(function handleAdBlocks() {
    'use strict';
    
    // Селекторы рекламных блоков которые нужно обрабатывать
    const adSelectors = [
        '.ad-leaderboard',
        '.ad-top-banner', 
        '.promo-ad-inline',
        '#mobile-anchor-ad'
    ];
    
    /**
     * Обрабатывает конкретный рекламный блок
     * @param {Element} adContainer - DOM элемент рекламного контейнера
     */
    function processAdBlock(adContainer) {
        // Находим тег рекламы внутри контейнера
        const adTag = adContainer.querySelector('ins.mrg-tag');
        
        // Если рекламный тег не найден, выходим
        if (!adTag) return;
        
        // Помечаем как обработанный чтобы не дублировать
        if (adTag.__processed) return;
        adTag.__processed = true;
        
        // Проверяем загрузку рекламы через 2 секунды
        setTimeout(() => {
            const hasAd = !!adTag.querySelector('iframe');
            
            // Если реклама не загрузилась, пробуем загрузить снова
            if (!hasAd) {
                (window.MRGtag = window.MRGtag || []).push({});
                
                // Проверяем еще раз через 2 секунды
                setTimeout(() => {
                    const stillNoAd = !adTag.querySelector('iframe');
                    
                    // Если реклама так и не загрузилась, скрываем блок
                    if (stillNoAd) {
                        adContainer.style.display = 'none';
                        console.log('Рекламный блок скрыт:', adContainer.className);
                    }
                }, 2000);
            }
        }, 2000);
    }
    
    /**
     * Инициализирует обработку всех рекламных блоков
     */
    function initAdHandling() {
        // Обрабатываем существующие рекламные блоки
        adSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(processAdBlock);
        });
        
        // Наблюдатель за изменениями DOM для обработки динамически добавленных блоков
        const domObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                // Проверяем добавленные узлы
                if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach((node) => {
                        // Если узел - элемент, ищем в нем рекламные блоки
                        if (node.querySelectorAll) {
                            adSelectors.forEach(selector => {
                                node.querySelectorAll(selector).forEach(processAdBlock);
                            });
                        }
                    });
                }
            });
        });
        
        // Начинаем наблюдение за изменениями во всем документе
        domObserver.observe(document.documentElement, {
            childList: true,    // Наблюдать за добавлением/удалением дочерних элементов
            subtree: true       // Наблюдать за всеми потомками
        });
    }
    
    // Инициализируем когда DOM полностью загружен
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAdHandling);
    } else {
        initAdHandling();
    }
})();

/**
 * Функция для улучшения пользовательского опыта
 * Добавляет дополнительные взаимодействия с карточками игр
 */
(function enhanceUserExperience() {
    'use strict';
    
    // Инициализируем когда DOM готов
    document.addEventListener('DOMContentLoaded', function() {
        
        // Находим все карточки игр
        const gameCards = document.querySelectorAll('.card');
        
        // Добавляем обработчики для каждой карточки
        gameCards.forEach((card, index) => {
            
            // Добавляем задержку появления для анимации
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            
            // Анимируем появление карточки
            setTimeout(() => {
                card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 100 + (index * 50)); // Увеличиваем задержку для каждой следующей карточки
            
            // Добавляем обработчик клика на всю карточку (кроме кнопки)
            card.addEventListener('click', (event) => {
                // Если кликнули не по ссылке или кнопке
                if (event.target.tagName !== 'A' && !event.target.closest('a')) {
                    const link = card.querySelector('a.btn');
                    if (link) {
                        // Открываем ссылку в новой вкладке
                        window.open(link.href, '_blank');
                    }
                }
            });
            
            // Добавляем класс при фокусе для доступности
            card.addEventListener('focus', () => {
                card.classList.add('card-focused');
            });
            
            card.addEventListener('blur', () => {
                card.classList.remove('card-focused');
            });
        });
        
        // Добавляем стили для фокуса (для доступности)
        const style = document.createElement('style');
        style.textContent = `
            .card-focused {
                outline: 2px solid #dc3545;
                outline-offset: 2px;
            }
            
            /* Улучшаем видимость фокуса для кнопок */
            .card a.btn:focus {
                outline: 2px solid #fff;
                outline-offset: 2px;
            }
        `;
        document.head.appendChild(style);
    });
})();

/**
 * Функция для отслеживания кликов по играм (аналитика)
 */
(function setupGameAnalytics() {
    'use strict';
    
    document.addEventListener('DOMContentLoaded', function() {
        // Находим все кнопки игр
        const gameButtons = document.querySelectorAll('.card a.btn');
        
        // Добавляем обработчики кликов
        gameButtons.forEach(button => {
            button.addEventListener('click', function(event) {
                const gameName = this.closest('.card').querySelector('h2').textContent.trim();
                const gameCategory = this.closest('section').querySelector('.category-title').textContent.trim();
                
                // Логируем информацию о клике (можно отправить в аналитику)
                console.log('Игра запущена:', {
                    name: gameName,
                    category: gameCategory,
                    url: this.href,
                    timestamp: new Date().toISOString()
                });
                
                // Можно добавить отправку в Google Analytics или Yandex.Metrika
                if (window.ym) {
                    window.ym(104302221, 'reachGoal', 'game_click', {
                        game_name: gameName,
                        game_category: gameCategory
                    });
                }
            });
        });
    });
})();

// Экспортируем функции для использования в других модулях (если нужно)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        handleAdBlocks,
        enhanceUserExperience,
        setupGameAnalytics
    };
}