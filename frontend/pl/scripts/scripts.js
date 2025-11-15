// Импорты модулей
import { setCookie, getCookie } from './cookies.js';                                                                            // Импортируем функции для работы с cookies (установка и получение)
import { loadNews } from './news.js';                                                                                           // Импортируем функцию загрузки новостей из внешнего API
import { generateCombinedBackground } from './backgroundGenerator.js';                                                          // Импортируем функцию генерации комбинированного фона страницы
import '/frontend/pwa/app.js';                                                                                                  // Импортируем PWA (Progressive Web App) функционал для оффлайн работы

// Главная функция инициализации страницы
function initPage() {
    console.log('JavaScript файл подключен и работает.');                                                                      // Логируем успешную загрузку JavaScript для отладки

    // Инициализация переменных DOM элементов
    const newsContainer = document.getElementById("news-container");                                                            // Получаем ссылку на контейнер для отображения новостей

    // Проверка существования необходимых элементов DOM
    if (!newsContainer) {                                                                                                       // Проверяем что контейнер новостей существует на странице
        console.error('Не найден контейнер новостей');                                                                         // Логируем ошибку если контейнер не найден
        return;                                                                                                                 // Прерываем выполнение функции если контейнер отсутствует
    }

    // Функция настройки обработчиков событий
    function setupEventListeners() {
        // Обработчик переключения состояния новостей
        newsContainer.addEventListener("click", function() {                                                                   // Добавляем обработчик клика на контейнер новостей
            this.classList.toggle("expanded");                                                                                 // Переключаем CSS класс для раскрытия/скрытия контента
        });
    }

    // Асинхронная функция загрузки данных страницы
    async function loadPageData() {
        try {
            await Promise.allSettled([                                                                                         // Ожидаем завершения всех асинхронных операций
                loadNews(),                                                                                                    // Загружаем новости из API
                generateCombinedBackground()                                                                                   // Генерируем и устанавливаем фон страницы
            ]);
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);                                                                   // Логируем ошибку если что-то пошло не так
        }
    }

    // Инициализация всех компонентов страницы
    setupEventListeners();                                                                                                     // Настраиваем обработчики событий для интерактивности
    loadPageData();                                                                                                            // Загружаем динамические данные для страницы
}

// Запуск инициализации после полной загрузки DOM дерева
document.addEventListener('DOMContentLoaded', initPage);                                                                       // Ожидаем полной загрузки DOM перед выполнением инициализации