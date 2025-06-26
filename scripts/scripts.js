// Импорты модулей
import { setCookie, getCookie } from './cookies.js';
import { 
    handleInstallApp, 
    setupInstallEvent, 
    setupInstallAppButton 
} from './install.js';
import { loadNews } from './news.js';
import { generateCombinedBackground } from './backgroundGenerator.js';
import '../pwa/app.js';

// Главная функция инициализации
function initPage() {
    console.log('JavaScript файл подключен и работает.');

    // Инициализация переменных
    let deferredPrompt;
    const newsContainer = document.getElementById("news-container");
    const installInstructions = document.getElementById("installInstructions");
    const installAppButton = document.getElementById("installAppButton");

    // Проверка элементов DOM
    if (!newsContainer || !installInstructions || !installAppButton) {
        console.error('Не найдены необходимые DOM элементы');
        return;
    }

    // Обработчики событий
    function setupEventListeners() {
        // Переключение новостей
        newsContainer.addEventListener("click", function() {
            this.classList.toggle("expanded");
        });

        // Закрытие инструкций установки
        document.addEventListener('click', (event) => {
            if (!installInstructions.contains(event.target) && 
                event.target !== installAppButton) {
                installInstructions.style.display = 'none';
            }
        });

        // PWA установка
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            
            // Опционально: показать кнопку установки
            setupInstallEvent(e);
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