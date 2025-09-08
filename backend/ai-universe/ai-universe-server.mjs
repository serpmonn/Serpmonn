import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import BehaviorAnalyzer from './behavior-analyzer.mjs';
import PersonalizedSearch from './personalized-search.mjs';
import dotenv from 'dotenv';

dotenv.config({ path: '/var/www/serpmonn.ru/.env' });

const app = express();
const port = process.env.AI_UNIVERSE_PORT || 3600;

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 100, // максимум 100 запросов на IP за 15 минут
  standardHeaders: true,
  legacyHeaders: false
});
app.use(apiLimiter);

// Инициализация компонентов
const behaviorAnalyzer = new BehaviorAnalyzer();
const personalizedSearch = new PersonalizedSearch();

/**
 * API для анализа поведения пользователя
 */
app.post('/api/ai-universe/analyze-behavior', async (req, res) => {
  try {
    const { userId, actionType, data } = req.body;
    
    if (!userId || !actionType || !data) {
      return res.status(400).json({ 
        error: 'Требуются поля: userId, actionType, data' 
      });
    }

    let analysis;
    
    switch (actionType) {
      case 'search_query':
        analysis = await behaviorAnalyzer.analyzeSearchQuery(data.query, userId);
        break;
      case 'game_behavior':
        analysis = await behaviorAnalyzer.analyzeGameBehavior(data, userId);
        break;
      default:
        return res.status(400).json({ 
          error: 'Неподдерживаемый тип действия' 
        });
    }

    res.json({
      success: true,
      analysis,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Ошибка анализа поведения:', error);
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера' 
    });
  }
});

/**
 * API для персонализированного поиска
 */
app.post('/api/ai-universe/personalized-search', async (req, res) => {
  try {
    const { userId, query, searchResults } = req.body;
    
    if (!userId || !query) {
      return res.status(400).json({ 
        error: 'Требуются поля: userId, query' 
      });
    }

    const personalizedResults = await personalizedSearch.performPersonalizedSearch(
      query,
      userId,
      searchResults || []
    );

    res.json({
      success: true,
      ...personalizedResults
    });
  } catch (error) {
    console.error('Ошибка персонализированного поиска:', error);
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера' 
    });
  }
});

/**
 * API для получения персонального профиля
 */
app.get('/api/ai-universe/user-profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const profile = await behaviorAnalyzer.createPersonalProfile(parseInt(userId));
    
    res.json({
      success: true,
      profile,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Ошибка получения профиля:', error);
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера' 
    });
  }
});

/**
 * API для генерации персональных рекомендаций
 */
app.get('/api/ai-universe/recommendations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { context = 'general' } = req.query;
    
    const recommendations = await behaviorAnalyzer.generatePersonalizedRecommendations(
      parseInt(userId),
      context
    );
    
    res.json({
      success: true,
      recommendations,
      context,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Ошибка генерации рекомендаций:', error);
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера' 
    });
  }
});

/**
 * API для создания персональной поисковой страницы
 */
app.get('/api/ai-universe/personalized-page/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const personalizedPage = await personalizedSearch.createPersonalizedSearchPage(
      parseInt(userId)
    );
    
    res.json({
      success: true,
      ...personalizedPage,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Ошибка создания персональной страницы:', error);
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера' 
    });
  }
});

/**
 * API для предсказания следующих запросов
 */
app.get('/api/ai-universe/predict-queries/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const predictedQueries = await personalizedSearch.predictNextQueries(
      parseInt(userId)
    );
    
    res.json({
      success: true,
      predictedQueries,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Ошибка предсказания запросов:', error);
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера' 
    });
  }
});

/**
 * API для получения статистики AI-вселенной
 */
app.get('/api/ai-universe/stats', async (req, res) => {
  try {
    // Здесь можно добавить статистику использования AI-функций
    const stats = {
      totalUsers: 0, // Получить из базы данных
      totalSearches: 0,
      totalRecommendations: 0,
      averagePersonalizationScore: 0,
      mostPopularFeatures: []
    };
    
    res.json({
      success: true,
      stats,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Ошибка получения статистики:', error);
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера' 
    });
  }
});

/**
 * API для тестирования AI-функций
 */
app.post('/api/ai-universe/test', async (req, res) => {
  try {
    const { testType, data } = req.body;
    
    let result;
    
    switch (testType) {
      case 'behavior_analysis':
        result = await behaviorAnalyzer.analyzeSearchQuery(data.query, 1);
        break;
      case 'personalized_search':
        result = await personalizedSearch.performPersonalizedSearch(
          data.query,
          1,
          data.results || []
        );
        break;
      default:
        return res.status(400).json({ 
          error: 'Неподдерживаемый тип теста' 
        });
    }
    
    res.json({
      success: true,
      testType,
      result,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Ошибка тестирования:', error);
    res.status(500).json({ 
      error: 'Внутренняя ошибка сервера' 
    });
  }
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error('Необработанная ошибка:', err);
  res.status(500).json({ 
    error: 'Внутренняя ошибка сервера' 
  });
});

// 404 обработчик
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'API endpoint не найден' 
  });
});

// Запуск сервера
app.listen(port, () => {
  console.log(`🚀 AI-Universe сервер запущен на порту ${port}`);
  console.log(`📊 Доступные API endpoints:`);
  console.log(`   POST /api/ai-universe/analyze-behavior`);
  console.log(`   POST /api/ai-universe/personalized-search`);
  console.log(`   GET  /api/ai-universe/user-profile/:userId`);
  console.log(`   GET  /api/ai-universe/recommendations/:userId`);
  console.log(`   GET  /api/ai-universe/personalized-page/:userId`);
  console.log(`   GET  /api/ai-universe/predict-queries/:userId`);
  console.log(`   GET  /api/ai-universe/stats`);
  console.log(`   POST /api/ai-universe/test`);
});

export default app;