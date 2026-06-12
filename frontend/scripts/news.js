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
            : (navigator.language || 'en').split('-')[0].toLowerCase();

        const url = `${base}/news?locale=${encodeURIComponent(locale)}&limit=20`;
        const response = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const data = await response.json();
        const articles = data.news || [];
        if (articles.length === 0) return;

        const block    = document.getElementById('news-block');
        const heroEl   = document.getElementById('news-hero');
        const heroTag  = document.getElementById('news-hero-tag');
        const heroHL   = document.getElementById('news-hero-headline');
        const heroDesc = document.getElementById('news-hero-desc');
        const heroSrc  = document.getElementById('news-hero-source');
        const heroTime = document.getElementById('news-hero-time');
        const feed     = document.getElementById('news-feed');

        if (!block || !heroEl || !feed) return;

        const tagMap = { ai: 'ai', tech: 'tech', world: 'world', science: 'sci', sport: 'sport' };
        const tagClass = (cat) => tagMap[cat] || 'ai';

        function timeAgo(dateStr) {
            if (!dateStr) return '';
            const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
            if (diff < 1)  return '<1 мин';
            if (diff < 60) return diff + ' мин';
            const h = Math.floor(diff / 60);
            if (h < 24)    return h + ' ч';
            return Math.floor(h / 24) + ' д';
        }

        // Hero — первая новость
        const hero = articles[0];
        heroEl.href          = hero.url || '#';
        heroTag.textContent  = hero.topicLabel || hero.category || '';
        heroTag.className    = `news-tag ${tagClass(hero.category)}`;
        heroHL.textContent   = hero.title || '';
        heroDesc.textContent = hero.snippet || hero.description || '';
        heroSrc.textContent  = hero.source || '';
        heroTime.textContent = timeAgo(hero.publishedAt);

        // Feed — остальные карточки
        feed.innerHTML = articles.slice(1).map(item => `
            <a class="card" href="${item.url || '#'}" target="_blank" rel="noopener noreferrer">
                <span class="news-tag ${tagClass(item.category)}">${item.topicLabel || item.category || ''}</span>
                <p class="card-headline">${item.title || ''}</p>
                <div class="card-meta">
                    <span class="card-source">${item.source || ''}</span>
                    <span class="card-time">${timeAgo(item.publishedAt)}</span>
                </div>
            </a>`
        ).join('');

        block.style.display = 'block';

    } catch (error) {
        console.error('Ошибка загрузки новостей:', error);
    }
}
