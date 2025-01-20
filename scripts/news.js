export async function loadNews() {
    try {
        const response = await fetch('https://www.serpmonn.ru/news', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        const newsContainer = document.getElementById('news-container');

        if (data && data.length > 0) {
            data.forEach(article => {
                const newsItem = document.createElement('div');
                newsItem.className = 'news-item';

                const newsLink = document.createElement('a');
                newsLink.className = 'news-link';
                newsLink.href = article.link;
                newsLink.target = '_blank';

                const newsTitle = document.createElement('div');
                newsTitle.className = 'news-title';
                newsTitle.textContent = article.title;

                const newsDate = document.createElement('div');
                newsDate.className = 'news-date';
                newsDate.textContent = new Date(article.pubDate).toLocaleDateString();

                const newsContent = document.createElement('div');
                newsContent.className = 'news-content';

		// Если описание есть, отображаем его, если нет - скрываем элемент
                if (article.description) {
                    newsContent.textContent = article.description;
                } else {
                    newsContent.style.display = 'none';
                }

                // Добавляем изображение, если оно есть
                if (article.enclosure && article.enclosure.url) {
                    const newsImage = document.createElement('img');
                    newsImage.className = 'news-image';
                    newsImage.src = article.enclosure.url;
                    newsItem.appendChild(newsImage);
                }

                newsLink.appendChild(newsTitle);
                newsLink.appendChild(newsDate);
                newsLink.appendChild(newsContent);

                newsItem.appendChild(newsLink);
                newsContainer.appendChild(newsItem);
            });
        } else {
            newsContainer.textContent = 'Нет доступных новостей.';
        }
    } catch (error) {
        console.error('Ошибка загрузки новостей:', error);
    }
}

