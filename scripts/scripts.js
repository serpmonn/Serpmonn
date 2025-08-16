// Импорты модулей
import { setCookie, getCookie } from './cookies.js';
import { loadNews } from './news.js';
import { generateCombinedBackground } from './backgroundGenerator.js';
import enhancedNewsManager from './enhanced-news.js';
import { personalizationManager } from './personalization.js';
import layoutManager from './layout-manager.js';
import '/pwa/app.js';

// Главная функция инициализации
function initPage() {
    console.log('JavaScript файл подключен и работает.');

    // Инициализация переменных
    const newsContainer = document.getElementById("news-container");

    // Проверка элементов DOM
    if (!newsContainer) {
        console.error('Не найден контейнер новостей');
        return;
    }

    // Обработчики событий
    function setupEventListeners() {
        // Переключение новостей
        newsContainer.addEventListener("click", function() {
            this.classList.toggle("expanded");
        });
    }

    // Загрузка данных
    async function loadPageData() {
        try {
            await Promise.allSettled([
                enhancedNewsManager.loadPersonalizedNews(),
                generateCombinedBackground()
            ]);
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
        }
    }

    // Инициализация
    setupEventListeners();
    loadPageData();
    
    // Инициализация менеджера макета
    layoutManager.init();
    
    // Адаптация под размер экрана
    window.addEventListener('resize', () => {
        layoutManager.adaptToScreenSize();
    });
}

// Запуск после полной загрузки DOM
document.addEventListener('DOMContentLoaded', initPage);