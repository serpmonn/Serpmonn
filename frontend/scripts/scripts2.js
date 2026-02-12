import { setCookie, getCookie } from './cookies.js';                                                                                            // Импортирует функции для работы с cookies из cookies.js
import { loadNews } from './news.js';                                                                                                           // Импортирует функцию загрузки новостей из внешнего API
import { generateCombinedBackground } from './backgroundGenerator.js';                                                                          // Импортирует функцию генерации фона страницы
import '/frontend/pwa/app.js';                                                                                                                  // Импортирует PWA для оффлайн работы

// ======================================================================================================================
// МАРКДАУН РЕНДЕРЕР ДЛЯ КРАСИВОГО ФОРМАТИРОВАНИЯ ОТВЕТОВ ИИ (НОВАЯ ФУНКЦИЯ)
// ======================================================================================================================
function renderMarkdown(text) {                                                                                                                  // Определение функции рендеринга Markdown
    let html = text;                                                                                                                             // Начинаем с оригинального текста ответа ИИ
    
    html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');                                                                                         // Заменяет заголовки третьего уровня ### на HTML h3
    html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');                                                                                          // Заменяет заголовки второго уровня ## на HTML h2
    html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');                                                                                           // Заменяет заголовки первого уровня # на HTML h1
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');                                                                                // Заменяет жирный текст **текст** на HTML strong
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');                                                                                            // Заменяет курсивный текст *текст* на HTML em
    html = html.replace(/`(.*?)`/g, '<code>$1</code>');                                                                                          // Заменяет встроенный код `код` на HTML code
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');                                                                      // Заменяет блоки кода ```код``` на HTML pre+code
    html = html.replace(/^- (.*$)/gim, '<li>$1</li>');                                                                                           // Заменяет маркированные списки - на HTML li
    html = html.replace(/^(\d+)\. (.*$)/gim, '<li>$2</li>');                                                                                     // Заменяет нумерованные списки 1. на HTML li
    html = html.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');                                                                                       // Обёртывает элементы списка в HTML ul
    html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');                                                                           // Заменяет цитаты > на HTML blockquote
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="md-link">$1</a>');                       // Заменяет ссылки [текст](url) на HTML a
    html = html.replace(/\n/g, '<br>');                                                                                                          // Заменяет переносы строк на HTML br
    
    return html;                                                                                                                                 // Возвращает отформатированный HTML
}

// ======================================================================================================================
// ИЗВЛЕЧЕНИЕ ССЫЛОК ИЗ HTML-ТЕКСТА (НОВАЯ ФУНКЦИЯ)
// ======================================================================================================================
function extractLinks(text) {                                                                                                                    // Определение функции извлечения ссылок
    const linkRegex = /<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g;                                                                                  // Регулярное выражение для поиска HTML-ссылок
    const links = [];                                                                                                                            // Массив для хранения найденных ссылок
    let match;                                                                                                                                   // Переменная для хранения результатов поиска
    
    while ((match = linkRegex.exec(text)) !== null) {                                                                                            // Поиск всех совпадений в тексте
        try {
            const url = new URL(match[1]);                                                                                                       // Пытается создать объект URL для проверки валидности
            links.push({                                                                                                                         // Добавляет валидную ссылку в массив
                url: match[1],                                                                                                                   // URL ссылки
                text: match[2] || match[1]                                                                                                       // Текст ссылки или URL если текста нет
            });
        } catch (e) {                                                                                                                            // Обработка невалидных URL
            console.warn('Невалидный URL:', match[1]);                                                                                           // Логирует предупреждение о невалидном URL
        }
    }
    
    return links.slice(0, 3);                                                                                                                    // Возвращает максимум 3 ссылки для отображения
}

// ======================================================================================================================
// ПОКАЗАТЬ АНИМАЦИЮ ЗАГРУЗКИ С КРАСИВЫМ ИНТЕРФЕЙСОМ (НОВАЯ ФУНКЦИЯ)
// ======================================================================================================================
function showLoading() {                                                                                                                         // Определение функции показа загрузки
    const contentDiv = document.getElementById('ai-result-content');                                                                             // Получает ссылку на контейнер для контента ответа
    
    if (!contentDiv) return;                                                                                                                     // Защита от ошибок если элемент не найден
    
    contentDiv.innerHTML = `
        <div class="ai-loading">
            <div class="loading-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
            <div class="loading-text">Serpmonn AI анализирует запрос...</div>
        </div>
    `;
    
    const timestampDiv = document.getElementById('ai-timestamp');
    if (timestampDiv) {
        timestampDiv.textContent = new Date().toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// ======================================================================================================================
// ПОКАЗАТЬ РЕЗУЛЬТАТ ОТВЕТА ИИ С КРАСИВЫМ ИНТЕРФЕЙСОМ (НОВАЯ ФУНКЦИЯ)
// ======================================================================================================================
function showResult(data) {                                                                                                                      // Определение функции показа результата
    const contentDiv = document.getElementById('ai-result-content');                                                                             // Получает ссылку на контейнер для контента
    const container = document.getElementById('ai-result-container');                                                                            // Получает ссылку на основной контейнер результата
    let html = '';                                                                                                                               // Переменная для накопления HTML-разметки
    
    if (data.error) {                                                                                                                            // Проверяет, содержит ли ответ ошибку
        html = `
            <div class="ai-error">
                <div class="error-icon">⚠️</div>
                <div class="error-message">${data.error}</div>
                <button class="retry-btn" onclick="window.location.reload()">
                    Попробовать снова
                </button>
            </div>
        `;
    } else {                                                                                                                                     // Если ошибки нет - обрабатывает успешный ответ
        const answer = data.answer || '';                                                                                                        // Получает текст ответа от ИИ или пустую строку
        
        if (data.source === 'search' || answer.includes('http') || answer.includes('https://')) {                                                // Проверяет, использовался ли поиск
            html += `
                <div class="ai-search-badge">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                    </svg>
                    Ответ найден с помощью поиска
                </div>
            `;
        }
        
        html += renderMarkdown(answer);
        
        const links = extractLinks(html);
        if (links.length > 0) {
            html += `
                <div class="ai-sources">
                    <div class="sources-title">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                        Источники
                    </div>
                    ${links.map(link => `
                        <a href="${link.url}" target="_blank" rel="noopener" class="source-item">
                            <img src="https://www.google.com/s2/favicons?domain=${new URL(link.url).hostname}&sz=16" 
                                 class="source-favicon" alt="">
                            <span class="source-title">${link.text || link.url}</span>
                            <span class="source-url">${new URL(link.url).hostname}</span>
                        </a>
                    `).join('')}
                </div>
            `;
        }
    }
    
    contentDiv.innerHTML = html;                                                                                                                 // Вставляет сгенерированный HTML в контейнер
    
    if (container) {                                                                                                                             // Проверяет существование контейнера
        container.style.display = 'block';                                                                                                       // Делает контейнер результата видимым
    }
    
    if (container) {                                                                                                                             // Проверяет существование контейнера
        container.scrollIntoView({                                                                                                               // Вызывает метод плавной прокрутки к результату
            behavior: 'smooth',                                                                                                                  // Указывает плавную анимацию прокрутки
            block: 'start'                                                                                                                       // Выравнивает элемент по верхнему краю
        });
    }
    
    setupActionButtons();                                                                                                                        // Настраивает интерактивные кнопки действий
}

// ======================================================================================================================
// НАСТРОЙКА ИНТЕРАКТИВНЫХ КНОПОК ДЕЙСТВИЙ (НОВАЯ ФУНКЦИЯ)
// ======================================================================================================================
function setupActionButtons() {                                                                                                                  // Определение функции настройки кнопок действий
    const copyBtn = document.querySelector('.ai-action-btn[title="Копировать"]');                                                                // Получает ссылку на кнопку копирования
    if (copyBtn) {                                                                                                                               // Проверяет существование кнопки
        copyBtn.addEventListener('click', async () => {                                                                                          // Добавляет обработчик клика на кнопку копирования
            const content = document.getElementById('ai-result-content').textContent;                                                            // Получает текстовое содержимое ответа
            try {
                await navigator.clipboard.writeText(content);                                                                                    // Копирует текст в буфер обмена
                copyBtn.innerHTML = `
                    <svg width="16" height="16" fill="#10b981">
                        <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                `;
                setTimeout(() => {                                                                                                               // Устанавливает таймер для возврата оригинальной иконки
                    copyBtn.innerHTML = `
                        <svg width="16" height="16" fill="currentColor">
                            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                        </svg>
                    `;
                }, 2000);                                                                                                                        // Задержка 2 секунды перед возвратом иконки
            } catch (err) {                                                                                                                      // Обработка ошибок копирования
                console.error('Ошибка копирования:', err);                                                                                       // Логирует ошибку в консоль
            }
        });
    }
    
    const shareBtn = document.querySelector('.ai-action-btn[title="Поделиться"]');                                                               // Получает ссылку на кнопку поделиться
    if (shareBtn && navigator.share) {                                                                                                           // Проверяет существование кнопки и поддержку Web Share API
        shareBtn.addEventListener('click', async () => {                                                                                         // Добавляет обработчик клика на кнопку поделиться
            try {
                await navigator.share({                                                                                                          // Использует Web Share API для шеринга
                    title: 'Ответ от Serpmonn AI',                                                                                               // Заголовок для шеринга
                    text: document.getElementById('ai-result-content').textContent.substring(0, 100) + '...',                                    // Текст для шеринга (первые 100 символов)
                    url: window.location.href                                                                                                    // URL текущей страницы
                });
            } catch (err) {                                                                                                                      // Обработка ошибок шеринга
                console.error('Ошибка sharing:', err);                                                                                           // Логирует ошибку в консоль
            }
        });
    } else if (shareBtn) {                                                                                                                       // Если Web Share API не поддерживается
        shareBtn.style.display = 'none';                                                                                                         // Скрывает кнопку поделиться
    }
    
    document.querySelectorAll('.feedback-btn').forEach(btn => {                                                                                  // Находит все кнопки обратной связи (лайк/дизлайк)
        btn.addEventListener('click', function() {                                                                                               // Добавляет обработчик клика на каждую кнопку
            const isLike = this.classList.contains('like');                                                                                      // Определяет тип кнопки (лайк или дизлайк)
            
            this.style.background = isLike ? '#ecfdf5' : '#fef2f2';                                                                          // Устанавливает фоновый цвет в зависимости от типа
            this.style.borderColor = isLike ? '#10b981' : '#ef4444';                                                                         // Устанавливает цвет границы в зависимости от типа
            this.style.color = isLike ? '#047857' : '#dc2626';                                                                               // Устанавливает цвет текста в зависимости от типа
            
            console.log(`Feedback: ${isLike ? 'like' : 'dislike'}`);                                                                             // Логирует действие в консоль
            
            setTimeout(() => {                                                                                                                   // Устанавливает таймер для сброса стилей
                this.style.background = '';                                                                                                      // Сбрасывает фоновый цвет
                this.style.borderColor = '';                                                                                                     // Сбрасывает цвет границы
                this.style.color = '';                                                                                                           // Сбрасывает цвет текста
            }, 3000);                                                                                                                            // Задержка 3 секунды перед сбросом
        });
    });
}

function initPage() {                                                                                                                           // Определение функции инициализации страницы

    const newsContainer = document.getElementById("news-container");                                                                            // Получает ссылку на контейнер для новостей

    if (!newsContainer) {                                                                                                                       // Проверяет, что контейнер новостей существует
        console.error('Не найден контейнер новостей');                                                                                          // Логирует ошибку если контейнер не найден
        return;                                                                                                                                 // Прерывает выполнение функции если контейнер отсутствует
    }

    function setupEventListeners() {                                                                                                            // Внутренняя функция для настройки обработчиков
        newsContainer.addEventListener("click", function() {                                                                                    // Добавляет обработчик клика на контейнер новостей
            this.classList.toggle("expanded");                                                                                                  // Переключает CSS класс для раскрытия/скрытия контента
        });
        
        const searchForm = document.getElementById('ai-search-form');                                                                           // Получает ссылку на форму ИИ-поиска
            searchForm.addEventListener('submit', async (e) => {                                                                                // Добавляет обработчик события submit
                e.preventDefault();                                                                                                             // Отключает стандартную отправку формы (перезагрузка страницы)
                
                const input = searchForm.querySelector('input[name="q"]');                                                                      // Получает ссылку на поле ввода запроса
                const query = input.value.trim();                                                                                               // Получает и очищает запрос пользователя
                
                if (!query) {                                                                                                                   // Проверяет, не пустой ли запрос
                    console.log('Пустой запрос');                                                                                               // Логирует пустой запрос
                    return;                                                                                                                     // Выходит из функции если запрос пустой
                }
                
                // ОБНОВЛЁННАЯ ЧАСТЬ: Используем новый интерфейс вместо старого
                showLoading();                                                                                                                  // Показывает анимированную загрузку с новым интерфейсом
                const container = document.getElementById('ai-result-container');                                                               // Получает ссылку на новый контейнер результата
                if (container) {                                                                                                                // Проверяет существование нового контейнера
                    container.style.display = 'block';                                                                                          // Делает новый контейнер результата видимым
                }
                
                try {                                                                                                                           // Начало блока обработки ошибок
                    const response = await fetch('/ai-search', {                                                                                // Отправляет асинхронный POST-запрос к /ai-search
                        method: 'POST',                                                                                                         // Указывает метод HTTP запроса
                        headers: {                                                                                                              // Устанавливает заголовки запроса
                            'Content-Type': 'application/json',                                                                                 // Указывает тип контента как JSON
                            'Accept': 'application/json'                                                                                        // Указывает, что ожидает JSON в ответе
                        },
                        body: JSON.stringify({ q: query })                                                                                      // Преобразует запрос в JSON строку
                    });
                    
                    console.log('Ответ сервера:', response.status, response.statusText);                                                        // Логирует статус ответа сервера
                    
                    if (!response.ok) {                                                                                                         // Проверяет, успешен ли HTTP ответ
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);                                                     // Генерирует ошибку если ответ неуспешный
                    }
                    
                    const data = await response.json();                                                                                         // Парсит ответ сервера из JSON
                    console.log('Данные от сервера:', data);                                                                                    // Логирует полученные данные
                    
                    // ОБНОВЛЁННАЯ ЧАСТЬ: Используем новую функцию для отображения результата
                    showResult(data);                                                                                                           // Показывает результат с красивым интерфейсом
                    
                } catch (error) {                                                                                                               // Обработка исключений в блоке try
                    console.error('Ошибка при запросе к ИИ:', error);                                                                           // Логирует ошибку в консоль
                    showResult({                                                                                                                // Использует новую функцию для показа ошибки
                        error: 'Ошибка связи с ИИ. Проверьте консоль.'                                                                          // Сообщение об ошибке
                    });
                }
            });
    }

    async function loadPageData() {                                                                                                              // Асинхронная функция загрузки данных
        try {                                                                                                                                    // Начало блока обработки ошибок
            await Promise.allSettled([                                                                                                           // Ожидает завершения всех асинхронных операций
                loadNews(),                                                                                                                      // Загружает новости
                generateCombinedBackground()                                                                                                     // Генерирует фон страницы
            ]);
        } catch (error) {                                                                                                                        // Обработка исключений
            console.error('Ошибка загрузки данных:', error);                                                                                     // Логирует ошибку загрузки данных
        }
    }

    setupEventListeners();                                                                                                                       // Настраивает обработчики событий
    loadPageData();                                                                                                                              // Загружает данные страницы
}

document.addEventListener('DOMContentLoaded', initPage);                                                                                         // Запуск initPage после полной загрузки DOM