// Импорты модулей
import { setCookie, getCookie } from './cookies.js';
import { loadNews } from './news.js';
import { generateCombinedBackground } from './backgroundGenerator.js';
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
                loadNews(),
                generateCombinedBackground()
            ]);
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
        }
    }

    // Инициализация
    setupEventListeners();
    loadPageData();
}

// Запуск после полной загрузки DOM
document.addEventListener('DOMContentLoaded', initPage);