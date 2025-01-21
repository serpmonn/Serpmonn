import express from 'express';
import axios from 'axios';
import fetch from 'node-fetch';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import RSSParser from 'rss-parser';

dotenv.config();

const app = express();
const parser = new RSSParser();
const port = process.env.PORT || 4000;
const apiKey = process.env.API_KEY;
const unsplashApiKey = process.env.UNSPLASH_API_KEY;

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

app.get('/news', async (req, res) => {

    try {
        const feed = await parser.parseURL('https://ria.ru/export/rss2/archive/index.xml');
        res.json(feed.items);
    } catch (error) {
        console.error('Ошибка загрузки новостей:', error);
        res.status(500).send('Ошибка загрузки новостей');
    }
});

app.listen(port, () => {
    console.log(`Сервер запущен на http://localhost:${port}`);
});

