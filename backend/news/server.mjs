import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import RSSParser from 'rss-parser';

dotenv.config();

const app = express();
const parser = new RSSParser();
const port = process.env.PORT || 4000;

// Используем только встроенную настройку CORS
app.use(cors({
    origin: ['https://serpmonn.ru', 'https://www.serpmonn.ru'], // Указываем конкретные домены
    credentials: true // Это позволит отправлять куки с запросами
}));

app.use(express.json()); 
app.use(express.urlencoded({ extended: true }));

app.options('*', (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', 'https://serpmonn.ru');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.status(200).end();
});

async function fetchRSSFeed(url) {
    try {
        const feed = await parser.parseURL(url);
        return feed.items;
    } catch (error) {
        console.error(`Ошибка загрузки новостей с ${url}:`, error);
        return null;
    }
}

app.get('/news', async (req, res) => {
    let news = null;

    // Попробуем сначала загрузить новости с RIA
    console.log('Пытаемся загрузить новости с RIA...');
    news = await fetchRSSFeed('https://ria.ru/export/rss2/archive/index.xml');

    // Если RIA не доступен, переключаемся на Lenta
    if (!news) {
        console.log('RIA недоступен, переключаемся на Lenta...');
        news = await fetchRSSFeed('https://lenta.ru/rss');
    }

    if (news) {
        res.json(news);
    } else {
        res.status(500).send('Ошибка загрузки новостей');
    }
});

app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});
