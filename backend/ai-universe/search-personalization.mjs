import PersonalityAnalyzer from './personality-analyzer.mjs';
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config({ path: '/var/www/serpmonn.ru/.env' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

/**
 * Система персонализации поиска под личность пользователя
 */
class SearchPersonalization {
  constructor() {
    this.personalityAnalyzer = new PersonalityAnalyzer();
  }

  /**
   * Персонализирует поисковые результаты под личность пользователя
   * @param {string} query - Поисковый запрос
   * @param {number} userId - ID пользователя
   * @param {Array} searchResults - Базовые результаты поиска
   * @returns {Object} Персонализированные результаты
   */
  async personalizeSearchResults(query, userId, searchResults) {
    try {
      // Получаем профиль личности пользователя
      const personalityProfile = await this.personalityAnalyzer.analyzePersonalityFromSearch(userId);
      
      // Анализируем поисковый запрос
      const queryAnalysis = await this.analyzeQuery(query, personalityProfile);
      
      // Персонализируем результаты
      const personalizedResults = await this.adaptResultsToPersonality(
        searchResults,
        personalityProfile,
        queryAnalysis
      );
      
      // Генерируем персональные рекомендации
      const recommendations = await this.generatePersonalizedRecommendations(
        query,
        personalityProfile,
        queryAnalysis
      );
      
      // Создаем персональное описание результатов
      const personalizedDescription = await this.createPersonalizedDescription(
        query,
        personalizedResults,
        personalityProfile
      );

      return {
        query,
        personalizedResults,
        recommendations,
        personalizedDescription,
        personalityInsights: this.generatePersonalityInsights(personalityProfile, queryAnalysis),
        searchSuggestions: await this.generateSearchSuggestions(query, personalityProfile)
      };
    } catch (error) {
      console.error('Ошибка персонализации поиска:', error);
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
   * Анализирует поисковый запрос с учетом личности пользователя
   * @param {string} query - Поисковый запрос
   * @param {Object} personalityProfile - Профиль личности
   * @returns {Object} Анализ запроса
   */
  async analyzeQuery(query, personalityProfile) {
    try {
      const prompt = `
        Проанализируй поисковый запрос "${query}" с учетом личности пользователя:
        
        Профиль личности: ${JSON.stringify(personalityProfile, null, 2)}
        
        Определи:
        
        1. ИНТЕНТ ЗАПРОСА:
           - Информационный (ищет факты)
           - Навигационный (ищет конкретный сайт)
           - Транзакционный (хочет что-то купить/сделать)
           - Исследовательский (изучает тему)
        
        2. УРОВЕНЬ ГЛУБИНЫ:
           - Поверхностный (быстрый ответ)
           - Средний (подробная информация)
           - Глубокий (экспертное исследование)
        
        3. ТИП КОНТЕНТА:
           - Теоретический vs Практический
           - Научный vs Популярный
           - Текстовый vs Визуальный
           - Статичный vs Интерактивный
        
        4. ЭМОЦИОНАЛЬНЫЙ КОНТЕКСТ:
           - Любопытство
           - Срочность
           - Развлечение
           - Обучение
           - Решение проблемы
        
        5. ПЕРСОНАЛЬНЫЕ ПРЕДПОЧТЕНИЯ:
           - Подходящий уровень сложности
           - Предпочтительный стиль изложения
           - Важные аспекты для пользователя
        
        Ответь в формате JSON.
      `;

      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());
    } catch (error) {
      console.error('Ошибка анализа запроса:', error);
      return {
        intent: 'informational',
        depth: 'medium',
        content_type: 'general',
        emotional_context: 'curiosity',
        personal_preferences: {}
      };
    }
  }

  /**
   * Адаптирует результаты поиска под личность пользователя
   * @param {Array} searchResults - Базовые результаты поиска
   * @param {Object} personalityProfile - Профиль личности
   * @param {Object} queryAnalysis - Анализ запроса
   * @returns {Array} Адаптированные результаты
   */
  async adaptResultsToPersonality(searchResults, personalityProfile, queryAnalysis) {
    try {
      const prompt = `
        Адаптируй результаты поиска под личность пользователя:
        
        Результаты поиска: ${JSON.stringify(searchResults, null, 2)}
        Профиль личности: ${JSON.stringify(personalityProfile, null, 2)}
        Анализ запроса: ${JSON.stringify(queryAnalysis, null, 2)}
        
        Адаптируй каждый результат:
        
        1. РАНЖИРОВАНИЕ:
           - Для аналитиков: приоритет структурированным, детальным результатам
           - Для интуитивов: приоритет общим, концептуальным результатам
           - Для новичков: приоритет простым, объясняющим результатам
           - Для экспертов: приоритет продвинутым, техническим результатам
        
        2. ФИЛЬТРАЦИЯ:
           - Убери результаты, не подходящие под стиль личности
           - Добавь результаты, которые могут заинтересовать
        
        3. ПЕРСОНАЛИЗАЦИЯ ОПИСАНИЙ:
           - Адаптируй описания под уровень понимания
           - Подчеркни аспекты, важные для личности
           - Используй подходящий тон и стиль
        
        4. ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ:
           - Добавь контекст, важный для личности
           - Предложи связанные темы
           - Укажи уровень сложности
        
        Верни массив адаптированных результатов с полями:
        - original_result (оригинальный результат)
        - personalized_score (оценка релевантности 1-10)
        - personalized_description (адаптированное описание)
        - personality_match_reason (почему подходит личности)
        - difficulty_level (уровень сложности: beginner/intermediate/advanced)
        - content_style (стиль контента: analytical/intuitive/practical/theoretical)
        - additional_context (дополнительный контекст)
      `;

      const result = await model.generateContent(prompt);
      const adaptedResults = JSON.parse(result.response.text());

      // Сортируем по персональной оценке
      return adaptedResults.sort((a, b) => b.personalized_score - a.personalized_score);
    } catch (error) {
      console.error('Ошибка адаптации результатов:', error);
      return searchResults.map((result, index) => ({
        original_result: result,
        personalized_score: 5,
        personalized_description: result.description || result.title,
        personality_match_reason: 'Общий результат',
        difficulty_level: 'intermediate',
        content_style: 'general',
        additional_context: ''
      }));
    }
  }

  /**
   * Генерирует персональные рекомендации на основе запроса и личности
   * @param {string} query - Поисковый запрос
   * @param {Object} personalityProfile - Профиль личности
   * @param {Object} queryAnalysis - Анализ запроса
   * @returns {Array} Персональные рекомендации
   */
  async generatePersonalizedRecommendations(query, personalityProfile, queryAnalysis) {
    try {
      const prompt = `
        Создай персональные рекомендации на основе:
        
        Запрос: "${query}"
        Профиль личности: ${JSON.stringify(personalityProfile, null, 2)}
        Анализ запроса: ${JSON.stringify(queryAnalysis, null, 2)}
        
        Создай 3-5 рекомендаций:
        
        1. СВЯЗАННЫЕ ТЕМЫ:
           - Для аналитиков: детальные, структурированные темы
           - Для интуитивов: общие, концептуальные темы
           - Для новичков: базовые, объясняющие темы
           - Для экспертов: продвинутые, специализированные темы
        
        2. ДОПОЛНИТЕЛЬНЫЕ РЕСУРСЫ:
           - Подходящие под стиль обучения
           - Соответствующие уровню экспертизы
           - Учитывающие интересы
        
        3. ПРАКТИЧЕСКИЕ ПРИМЕНЕНИЯ:
           - Для практичных: конкретные примеры использования
           - Для теоретиков: углубленные исследования
           - Для творческих: возможности для экспериментов
        
        4. ОБРАЗОВАТЕЛЬНЫЕ МАТЕРИАЛЫ:
           - Курсы, книги, статьи
           - Подходящие под стиль обучения
           - Соответствующие уровню
        
        Каждая рекомендация должна включать:
        - title (заголовок)
        - description (описание)
        - type (тип: related_topic, resource, practical_application, educational)
        - relevance_score (релевантность 1-10)
        - personality_match (почему подходит личности)
        - difficulty_level (уровень сложности)
        
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
   * Создает персональное описание результатов поиска
   * @param {string} query - Поисковый запрос
   * @param {Array} personalizedResults - Персонализированные результаты
   * @param {Object} personalityProfile - Профиль личности
   * @returns {string} Персональное описание
   */
  async createPersonalizedDescription(query, personalizedResults, personalityProfile) {
    try {
      const prompt = `
        Создай персональное описание результатов поиска:
        
        Запрос: "${query}"
        Количество результатов: ${personalizedResults.length}
        Профиль личности: ${JSON.stringify(personalityProfile, null, 2)}
        
        Создай краткое (2-3 предложения) описание которое:
        
        1. ОБЪЯСНЯЕТ ЧТО НАЙДЕНО:
           - Подходящим для личности способом
           - С учетом уровня экспертизы
           - В понятном стиле
        
        2. ПОДЧЕРКИВАЕТ РЕЛЕВАНТНОСТЬ:
           - Почему результаты подходят пользователю
           - Какие аспекты особенно важны
           - Как это связано с интересами
        
        3. МОТИВИРУЕТ К ИЗУЧЕНИЮ:
           - Подходящим для личности способом
           - Учитывая мотивацию
           - Создавая интерес
        
        Используй тон, подходящий для личности:
        - Для аналитиков: структурированный, фактологический
        - Для интуитивов: концептуальный, вдохновляющий
        - Для новичков: объясняющий, поддерживающий
        - Для экспертов: профессиональный, глубокий
      `;

      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      console.error('Ошибка создания описания:', error);
      return `Найдено ${personalizedResults.length} результатов по запросу "${query}"`;
    }
  }

  /**
   * Генерирует инсайты о личности на основе поиска
   * @param {Object} personalityProfile - Профиль личности
   * @param {Object} queryAnalysis - Анализ запроса
   * @returns {Object} Инсайты о личности
   */
  generatePersonalityInsights(personalityProfile, queryAnalysis) {
    return {
      // Основные характеристики
      primaryTraits: this.identifyPrimaryTraits(personalityProfile),
      
      // Стиль обучения
      learningStyle: this.determineLearningStyle(personalityProfile),
      
      // Предпочтения в контенте
      contentPreferences: this.identifyContentPreferences(personalityProfile, queryAnalysis),
      
      // Рекомендации по улучшению опыта
      experienceRecommendations: this.generateExperienceRecommendations(personalityProfile)
    };
  }

  /**
   * Генерирует персональные предложения поиска
   * @param {string} query - Текущий запрос
   * @param {Object} personalityProfile - Профиль личности
   * @returns {Array} Предложения поиска
   */
  async generateSearchSuggestions(query, personalityProfile) {
    try {
      const prompt = `
        Создай персональные предложения поиска на основе:
        
        Текущий запрос: "${query}"
        Профиль личности: ${JSON.stringify(personalityProfile, null, 2)}
        
        Создай 5 предложений которые:
        
        1. РАСШИРЯЮТ ТЕМУ:
           - Для аналитиков: детальные, специфические запросы
           - Для интуитивов: общие, концептуальные запросы
           - Для новичков: базовые, объясняющие запросы
           - Для экспертов: продвинутые, специализированные запросы
        
        2. УГЛУБЛЯЮТ ПОНИМАНИЕ:
           - Связанные аспекты темы
           - Практические применения
           - Теоретические основы
        
        3. ОТКРЫВАЮТ НОВЫЕ ВОЗМОЖНОСТИ:
           - Смежные темы
           - Альтернативные подходы
           - Инновационные решения
        
        Каждое предложение должно включать:
        - query (текст запроса)
        - reason (почему подходит личности)
        - expected_results (что ожидается найти)
        
        Ответь в формате JSON массива.
      `;

      const result = await model.generateContent(prompt);
      return JSON.parse(result.response.text());
    } catch (error) {
      console.error('Ошибка генерации предложений:', error);
      return [];
    }
  }

  // Вспомогательные методы

  identifyPrimaryTraits(personalityProfile) {
    const traits = [];
    
    if (personalityProfile.cognitive_style?.analytical > 7) traits.push('Аналитический');
    if (personalityProfile.cognitive_style?.intuitive > 7) traits.push('Интуитивный');
    if (personalityProfile.cognitive_style?.creative > 7) traits.push('Творческий');
    if (personalityProfile.cognitive_style?.logical > 7) traits.push('Логический');
    
    return traits.length > 0 ? traits : ['Сбалансированный'];
  }

  determineLearningStyle(personalityProfile) {
    if (personalityProfile.cognitive_style?.analytical > 7) return 'Структурированный';
    if (personalityProfile.cognitive_style?.intuitive > 7) return 'Концептуальный';
    if (personalityProfile.cognitive_style?.visual > 7) return 'Визуальный';
    if (personalityProfile.cognitive_style?.practical > 7) return 'Практический';
    
    return 'Универсальный';
  }

  identifyContentPreferences(personalityProfile, queryAnalysis) {
    return {
      complexity: personalityProfile.expertise_level > 7 ? 'advanced' : 'intermediate',
      style: personalityProfile.cognitive_style?.analytical > 7 ? 'structured' : 'narrative',
      format: personalityProfile.cognitive_style?.visual > 7 ? 'visual' : 'text',
      depth: queryAnalysis.depth || 'medium'
    };
  }

  generateExperienceRecommendations(personalityProfile) {
    const recommendations = [];
    
    if (personalityProfile.cognitive_style?.analytical > 7) {
      recommendations.push('Показывать больше статистики и деталей');
    }
    
    if (personalityProfile.cognitive_style?.intuitive > 7) {
      recommendations.push('Предлагать концептуальные обзоры');
    }
    
    if (personalityProfile.expertise_level < 4) {
      recommendations.push('Добавлять объяснения и контекст');
    }
    
    if (personalityProfile.cognitive_style?.creative > 7) {
      recommendations.push('Предлагать творческие подходы');
    }
    
    return recommendations;
  }
}

export default SearchPersonalization;