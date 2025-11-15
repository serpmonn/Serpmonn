export async function loadNews() {
    try {
        // Умное определение окружения для выбора API URL
        const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'; // Проверяем работает ли приложение локально
        const newsApiUrl = isDevelopment 
            ? 'http://localhost:4000/news'                        // URL для разработки - локальный news сервер
            : 'https://www.serpmonn.ru/news';                     // URL для продакшена - продакшен домен

        console.log(`Загрузка новостей из: ${newsApiUrl}`);       // Логируем источник для отладки

        const response = await fetch(newsApiUrl, {                // Выполняем запрос к выбранному URL
            method: 'GET',                                        // Используем GET метод для получения данных
            headers: {
                'Content-Type': 'application/json'                // Указываем что ожидаем JSON ответ
            }
        });
        
        if (!response.ok) {                                       // Проверяем успешность HTTP запроса
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();                       // Парсим JSON ответ от сервера
        const newsContainer = document.getElementById('news-container'); // Находим контейнер для новостей в DOM

        if (data && data.length > 0) {                            // Проверяем что данные получены и не пустые
            data.forEach(article => {                             // Перебираем массив новостей
                const newsItem = document.createElement('div');   // Создаем элемент для каждой новости
                newsItem.className = 'news-item';                 // Добавляем CSS класс для стилизации

                const newsLink = document.createElement('a');     // Создаем ссылку для новости
                newsLink.className = 'news-link';                 // Добавляем CSS класс для ссылки
                newsLink.href = article.link;                     // Устанавливаем URL ссылки из данных статьи
                newsLink.target = '_blank';                       // Открываем ссылку в новой вкладке

                const newsTitle = document.createElement('div');  // Создаем элемент для заголовка новости
                newsTitle.className = 'news-title';               // Добавляем CSS класс для заголовка
                newsTitle.textContent = article.title;            // Устанавливаем текст заголовка из данных

                const newsDate = document.createElement('div');   // Создаем элемент для даты новости
                newsDate.className = 'news-date';                 // Добавляем CSS класс для даты
                newsDate.textContent = new Date(article.pubDate).toLocaleDateString(); // Форматируем дату в локальный формат

                const newsContent = document.createElement('div'); // Создаем элемент для содержания новости
                newsContent.className = 'news-content';           // Добавляем CSS класс для содержания

                if (article.description) {                        // Если описание есть, отображаем его
                    newsContent.textContent = article.description; // Устанавливаем текст описания
                } else {
                    newsContent.style.display = 'none';           // Если описания нет - скрываем элемент
                }

                if (article.enclosure && article.enclosure.url) { // Проверяем наличие изображения в данных
                    const newsImage = document.createElement('img'); // Создаем элемент изображения
                    newsImage.className = 'news-image';           // Добавляем CSS класс для изображения
                    newsImage.src = article.enclosure.url;        // Устанавливаем URL источника изображения
                    newsItem.appendChild(newsImage);              // Добавляем изображение в элемент новости
                }

                newsLink.appendChild(newsTitle);                  // Добавляем заголовок в ссылку
                newsLink.appendChild(newsDate);                   // Добавляем дату в ссылку
                newsLink.appendChild(newsContent);                // Добавляем содержание в ссылку
                newsItem.appendChild(newsLink);                   // Добавляем ссылку в элемент новости
                newsContainer.appendChild(newsItem);              // Добавляем элемент новости в контейнер
            });
        } else {
            newsContainer.textContent = 'Нет доступных новостей.'; // Если новостей нет - показываем сообщение
        }
    } catch (error) {
        console.error('Ошибка загрузки новостей:', error);        // Логируем ошибку в консоль для отладки
    }
}