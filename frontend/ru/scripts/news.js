export async function loadNews() {
    try {
        const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const base  = isDev ? 'http://localhost:4000' : 'https://www.serpmonn.ru';

        const pathLocale = window.location.pathname.split('/').filter(Boolean)[0] || '';
        const knownLocales = [
            'ar','az','be','bg','bn','cs','da','de','dv','el','en','es','es-419',
            'fa','fi','fil','fr','he','hi','hu','hy','id','it','ja','ka','kk','ko',
            'ks','ku-arab','ms','nb','nl','pl','ps','pt-br','pt-pt','ro','ru',
            'sd','sr','sv','th','tr','ug','ur','uz','vi','yi','zh-cn',
        ];
        const locale = knownLocales.includes(pathLocale.toLowerCase())
            ? pathLocale.toLowerCase()
            : (navigator.language || 'ru').split('-')[0].toLowerCase();

        const url = `${base}/news?locale=${encodeURIComponent(locale)}&limit=20`;
        const response = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        const newsContainer = document.getElementById('news-container');
        if (!newsContainer) return;

        const articles = data.news || [];

        if (articles.length > 0) {
            newsContainer.innerHTML = '';
            articles.forEach(article => {
                const newsItem = document.createElement('div');
                newsItem.className = 'news-item';

                const newsLink = document.createElement('a');
                newsLink.className = 'news-link';
                newsLink.href   = article.url;
                newsLink.target = '_blank';
                newsLink.rel    = 'noopener noreferrer';

                if (article.img) {
                    const newsImage = document.createElement('img');
                    newsImage.className = 'news-image';
                    newsImage.src     = article.img;
                    newsImage.alt     = article.title;
                    newsImage.loading = 'lazy';
                    newsItem.appendChild(newsImage);
                }

                const newsTitle = document.createElement('div');
                newsTitle.className   = 'news-title';
                newsTitle.textContent = article.title;

                const newsMeta = document.createElement('div');
                newsMeta.className = 'news-meta';
                const topicBadge = document.createElement('span');
                topicBadge.className   = 'news-topic';
                topicBadge.textContent = article.topicLabel || '';
                const sourceSpan = document.createElement('span');
                sourceSpan.className   = 'news-source';
                sourceSpan.textContent = article.source || '';
                newsMeta.appendChild(topicBadge);
                newsMeta.appendChild(sourceSpan);

                const newsContent = document.createElement('div');
                newsContent.className = 'news-content';
                if (article.snippet) {
                    newsContent.textContent = article.snippet;
                } else {
                    newsContent.style.display = 'none';
                }

                if (article.publishedAt) {
                    const newsDate = document.createElement('div');
                    newsDate.className   = 'news-date';
                    newsDate.textContent = new Date(article.publishedAt).toLocaleDateString();
                    newsLink.appendChild(newsDate);
                }

                newsLink.appendChild(newsTitle);
                newsLink.appendChild(newsMeta);
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
