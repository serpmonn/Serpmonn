import { GoogleGenerativeAI } from "@google/generative-ai";
import BehaviorAnalyzer from './behavior-analyzer.mjs';
import dotenv from 'dotenv';

dotenv.config({ path: '/var/www/serpmonn.ru/.env' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

/**
 * Персонализированная поисковая система
 */
class PersonalizedSearch {
  constructor() {
    this.behaviorAnalyzer = new BehaviorAnalyzer();
  }

  /**
   * Выполняет персонализированный поиск
   * @param {string} query - Поисковый запрос
   * @param {number} userId - ID пользователя
   * @param {Array} searchResults - Базовые результаты поиска
   * @returns {Object} Персонализированные результаты
   */
  async performPersonalizedSearch(query, userId, searchResults) {
    try {
      // Анализируем запрос пользователя
      const queryAnalysis = await this.behaviorAnalyzer.analyzeSearchQuery(query, userId);
      
      // Получаем персональный профиль
      const userProfile = await this.behaviorAnalyzer.getPersonalProfile(userId);
      
      // Персонализируем результаты
      const personalizedResults = await this.personalizeResults(
        searchResults,
        queryAnalysis,
        userProfile
      );
      
      // Генерируем персональные рекомендации
      const recommendations = await this.generateSearchRecommendations(
        query,
        queryAnalysis,
        userProfile
      );
      
      // Создаем персональное описание результатов
      const personalizedDescription = await this.generatePersonalizedDescription(
        query,
        personalizedResults,
        userProfile
      );

      return {
        query,
        personalizedResults,
        recommendations,
        personalizedDescription,
        queryAnalysis,
        timestamp: new Date()
      };
    } catch (error) {
      console.error('Ошибка персонализированного поиска:', error);
      return {
        query,
        personalizedResults: searchResults,
        recommendations: [],
        personalizedDescription: 'Результаты поиска',
        error: 'Ошибка персонализации'
      };
    }
  }

  /**
   * Персонализирует результаты поиска
   * @param {Array} results - Базовые результаты
   * @param {Object} queryAnalysis - Анализ запроса
   * @param {Object} userProfile - Профиль пользователя
   * @returns {Array} Персонализированные результаты
   */
  async personalizeResults(results, queryAnalysis, userProfile) {
    try {
      const prompt = `
        Персонализируй результаты поиска на основе:
        
        Анализ запроса: ${JSON.stringify(queryAnalysis, null, 2)}
        Профиль пользователя: ${JSON.stringify(userProfile, null, 2)}
        
        Результаты поиска:
        ${JSON.stringify(results, null, 2)}
        
        Персонализируй каждый результат:
        1. Измени порядок на основе релевантности для пользователя
        2. Добавь персональные теги и категории
        3. Создай краткое описание почему этот результат подходит пользователю
        4. Оцени релевантность от 1 до 10
        
        Ответь в формате JSON массива с полями:
        - original_result (оригинальный результат)
        - personalized_score (персональная оценка 1-10)
        - personal_reason (почему подходит пользователю)
        - personal_tags (персональные теги)
        - personalized_description (персональное описание)
      `;

      const result = await model.generateContent(prompt);
      const personalizedResults = JSON.parse(result.response.text());

      // Сортируем по персональной оценке
      return personalizedResults.sort((a, b) => b.personalized_score - a.personalized_score);
    } catch (error) {
      console.error('Ошибка персонализации результатов:', error);
      return results.map((result, index) => ({
        original_result: result,
        personalized_score: 5,
        personal_reason: 'Общий результат',
        personal_tags: ['general'],
        personalized_description: result.description || result.title
      }));
    }
  }

  /**
   * Генерирует персональные рекомендации для поиска
   * @param {string} query - Поисковый запрос
   * @param {Object} queryAnalysis - Анализ запроса
   * @param {Object} userProfile - Профиль пользователя
   * @returns {Array} Рекомендации
   */
  async generateSearchRecommendations(query, queryAnalysis, userProfile) {
    try {
      const prompt = `
        На основе поискового запроса "${query}" и профиля пользователя создай персональные рекомендации:
        
        Анализ запроса: ${JSON.stringify(queryAnalysis, null, 2)}
        Профиль пользователя: ${JSON.stringify(userProfile, null, 2)}
        
        Создай 3-5 рекомендаций включающих:
        1. Связанные темы для поиска
        2. Дополнительные вопросы
        3. Полезные ресурсы
        4. Интересные факты по теме
        
        Каждая рекомендация должна включать:
        - title (заголовок)
        - description (описание)
        - type (тип: search_suggestion, question, resource, fact)
        - personal_relevance (почему подходит пользователю)
        
        Ответь в формате JSON массива.
      `;

      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());
    } catch (error) {
      console.error('Ошибка генерации рекомендаций:', error);
      return [];
    }
  }

  /**
   * Генерирует персональное описание результатов поиска
   * @param {string} query - Поисковый запрос
   * @param {Array} results - Персонализированные результаты
   * @param {Object} userProfile - Профиль пользователя
   * @returns {string} Персональное описание
   */
  async generatePersonalizedDescription(query, results, userProfile) {
    try {
      const prompt = `
        Создай персональное описание результатов поиска для пользователя:
        
        Запрос: "${query}"
        Количество результатов: ${results.length}
        Профиль пользователя: ${JSON.stringify(userProfile, null, 2)}
        
        Создай краткое (2-3 предложения) персональное описание которое:
        1. Объясняет что найдено
        2. Подчеркивает релевантность для пользователя
        3. Мотивирует к изучению результатов
        4. Учитывает интересы и предпочтения пользователя
        
        Используй дружелюбный и персональный тон.
      `;

      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('Ошибка генерации описания:', error);
      return `Найдено ${results.length} результатов по запросу "${query}"`;
    }
  }

  /**
   * Предсказывает следующие поисковые запросы пользователя
   * @param {number} userId - ID пользователя
   * @returns {Array} Предсказанные запросы
   */
  async predictNextQueries(userId) {
    try {
      const userProfile = await this.behaviorAnalyzer.getPersonalProfile(userId);
      const behaviorData = await this.behaviorAnalyzer.getUserBehaviorData(userId);
      
      const recentQueries = behaviorData
        .filter(data => data.action_type === 'search_query')
        .slice(0, 10)
        .map(data => data.action_data.query);

      const prompt = `
        На основе истории поиска пользователя предскажи следующие 5 запросов:
        
        Последние запросы: ${recentQueries.join(', ')}
        Профиль пользователя: ${JSON.stringify(userProfile, null, 2)}
        
        Предскажи логичные следующие шаги в исследовании темы или новые связанные интересы.
        
        Ответь в формате JSON массива строк.
      `;

      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());
    } catch (error) {
      console.error('Ошибка предсказания запросов:', error);
      return [];
    }
  }

  /**
   * Создает персональную поисковую страницу
   * @param {number} userId - ID пользователя
   * @returns {Object} Персональная страница
   */
  async createPersonalizedSearchPage(userId) {
    try {
      const userProfile = await this.behaviorAnalyzer.getPersonalProfile(userId);
      const predictedQueries = await this.predictNextQueries(userId);
      const recommendations = await this.behaviorAnalyzer.generatePersonalizedRecommendations(userId, 'search');

      return {
        personalizedGreeting: await this.generatePersonalizedGreeting(userProfile),
        suggestedQueries: predictedQueries,
        personalizedRecommendations: recommendations,
        searchHistory: await this.getPersonalizedSearchHistory(userId),
        trendingTopics: await this.getPersonalizedTrendingTopics(userProfile)
      };
    } catch (error) {
      console.error('Ошибка создания персональной страницы:', error);
      return {
        personalizedGreeting: 'Добро пожаловать в поиск!',
        suggestedQueries: [],
        personalizedRecommendations: [],
        searchHistory: [],
        trendingTopics: []
      };
    }
  }

  async generatePersonalizedGreeting(userProfile) {
    const prompt = `
      Создай персональное приветствие для пользователя на основе его профиля:
      ${JSON.stringify(userProfile, null, 2)}
      
      Приветствие должно быть:
      - Дружелюбным и персональным
      - Учитывать интересы пользователя
      - Мотивировать к поиску
      - Длиной 1-2 предложения
    `;

    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  async getPersonalizedSearchHistory(userId) {
    // Реализация получения персональной истории поиска
    return [];
  }

  async getPersonalizedTrendingTopics(userProfile) {
    // Реализация получения персональных трендовых тем
    return [];
  }
}

export default PersonalizedSearch;