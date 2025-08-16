import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import newsRoutes from './newsRoutes.mjs';
import enhancedNewsRoutes from './enhanced-newsRoutes.mjs';

dotenv.config({ path: '/var/www/serpmonn.ru/.env' });

const app = express();
const port = process.env.PORT || 4000;

// Middleware
app.use(cors({
    origin: ['https://serpmonn.ru', 'https://www.serpmonn.ru'],
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Подключаем старые маршруты (для обратной совместимости)
app.use('/', newsRoutes);

// Подключаем новые маршруты для персонализации
app.use('/api/news', enhancedNewsRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        features: ['personalization', 'enhanced-news', 'multiple-sources']
    });
});

// Запуск сервера
app.listen(port, () => {
    console.log(`🚀 Улучшенный сервер новостей запущен на http://localhost:${port}`);
    console.log(`📰 Старые маршруты: /news`);
    console.log(`🎯 Новые маршруты: /api/news/*`);
    console.log(`💚 Health check: http://localhost:${port}/health`);
});

export default app;