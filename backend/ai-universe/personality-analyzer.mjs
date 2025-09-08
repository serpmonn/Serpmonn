import { GoogleGenerativeAI } from "@google/generative-ai";
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: '/var/www/serpmonn.ru/.env' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

/**
 * Анализатор личности для персонализации поиска и игр
 */
class PersonalityAnalyzer {
  constructor() {
    this.db = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
  }

  /**
   * Анализирует личность пользователя на основе поисковых запросов
   * @param {number} userId - ID пользователя
   * @returns {Object} Профиль личности
   */
  async analyzePersonalityFromSearch(userId) {
    try {
      // Получаем историю поисковых запросов
      const searchHistory = await this.getSearchHistory(userId);
      
      if (searchHistory.length === 0) {
        return this.getDefaultPersonality();
      }

      const prompt = `
        Проанализируй личность пользователя на основе его поисковых запросов:
        
        История поиска: ${searchHistory.map(s => s.query).join(', ')}
        
        Определи следующие характеристики личности:
        
        1. КОГНИТИВНЫЙ СТИЛЬ:
           - Аналитический vs Интуитивный
           - Детальный vs Общий
           - Логический vs Творческий
        
        2. ИНТЕРЕСЫ И ПРЕДПОЧТЕНИЯ:
           - Технические vs Гуманитарные
           - Теоретические vs Практические
           - Новые vs Проверенные темы
        
        3. СТИЛЬ ПОИСКА ИНФОРМАЦИИ:
           - Широкий vs Узкий поиск
           - Поверхностный vs Глубокий
           - Быстрый vs Тщательный
        
        4. ЭМОЦИОНАЛЬНЫЕ ПАТТЕРНЫ:
           - Любопытство vs Практичность
           - Осторожность vs Риск
           - Индивидуальность vs Социальность
        
        5. УРОВЕНЬ ЭКСПЕРТНОСТИ:
           - Новичок (0-3)
           - Средний (4-6)
           - Эксперт (7-10)
        
        Ответь в формате JSON с числовыми значениями от 0 до 10 для каждой характеристики.
      `;

      const result = await model.generateContent(prompt);
      const personalityProfile = JSON.parse(result.response.text());

      // Сохраняем профиль личности
      await this.savePersonalityProfile(userId, personalityProfile);

      return personalityProfile;
    } catch (error) {
      console.error('Ошибка анализа личности:', error);
      return this.getDefaultPersonality();
    }
  }

  /**
   * Анализирует игровой стиль пользователя
   * @param {number} userId - ID пользователя
   * @returns {Object} Игровой профиль
   */
  async analyzeGamingStyle(userId) {
    try {
      // Получаем игровую статистику
      const gameStats = await this.getGameStatistics(userId);
      
      if (gameStats.length === 0) {
        return this.getDefaultGamingStyle();
      }

      const prompt = `
        Проанализируй игровой стиль пользователя на основе статистики:
        
        Статистика игр: ${JSON.stringify(gameStats, null, 2)}
        
        Определи игровой стиль:
        
        1. СТИЛЬ ИГРЫ:
           - Агрессивный vs Осторожный
           - Быстрый vs Медленный
           - Рискованный vs Безопасный
           - Экспериментальный vs Консервативный
        
        2. МОТИВАЦИЯ:
           - Соревнование vs Развлечение
           - Достижения vs Процесс
           - Социальность vs Индивидуальность
           - Обучение vs Отдых
        
        3. ПРЕДПОЧТЕНИЯ СЛОЖНОСТИ:
           - Легкие vs Сложные игры
           - Линейные vs Открытые
           - Короткие vs Длинные сессии
        
        4. ПОВЕДЕНЧЕСКИЕ ПАТТЕРНЫ:
           - Настойчивость при проигрыше
           - Частота перезапусков
           - Время на размышления
           - Реакция на неудачи
        
        Ответь в формате JSON с числовыми значениями от 0 до 10.
      `;

      const result = await model.generateContent(prompt);
      const gamingProfile = JSON.parse(result.response.text());

      await this.saveGamingProfile(userId, gamingProfile);

      return gamingProfile;
    } catch (error) {
      console.error('Ошибка анализа игрового стиля:', error);
      return this.getDefaultGamingStyle();
    }
  }

  /**
   * Персонализирует поисковые результаты под личность
   * @param {Array} searchResults - Базовые результаты поиска
   * @param {Object} personalityProfile - Профиль личности
   * @param {string} query - Поисковый запрос
   * @returns {Array} Персонализированные результаты
   */
  async personalizeSearchResults(searchResults, personalityProfile, query) {
    try {
      const prompt = `
        Персонализируй результаты поиска под личность пользователя:
        
        Поисковый запрос: "${query}"
        Профиль личности: ${JSON.stringify(personalityProfile, null, 2)}
        Результаты поиска: ${JSON.stringify(searchResults, null, 2)}
        
        Адаптируй результаты под личность:
        
        1. РАНЖИРОВАНИЕ:
           - Для аналитиков: приоритет детальным, структурированным результатам
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
        
        4. ДОПОЛНИТЕЛЬНЫЕ РЕКОМЕНДАЦИИ:
           - Предложи связанные темы под интересы
           - Добавь ресурсы для углубления знаний
        
        Верни массив персонализированных результатов с полями:
        - original_result (оригинальный результат)
        - personalized_score (оценка релевантности 1-10)
        - personalized_description (адаптированное описание)
        - personality_match_reason (почему подходит личности)
        - additional_recommendations (дополнительные рекомендации)
      `;

      const result = await model.generateContent(prompt);
      const personalizedResults = JSON.parse(result.response.text());

      // Сортируем по персональной оценке
      return personalizedResults.sort((a, b) => b.personalized_score - a.personalized_score);
    } catch (error) {
      console.error('Ошибка персонализации поиска:', error);
      return searchResults;
    }
  }

  /**
   * Адаптирует игру под игровой стиль пользователя
   * @param {string} gameType - Тип игры (2048, redsquare)
   * @param {Object} gamingProfile - Игровой профиль
   * @param {Object} currentGameState - Текущее состояние игры
   * @returns {Object} Адаптированная игра
   */
  async adaptGameToPlayer(gameType, gamingProfile, currentGameState) {
    try {
      const prompt = `
        Адаптируй игру "${gameType}" под игровой стиль пользователя:
        
        Игровой профиль: ${JSON.stringify(gamingProfile, null, 2)}
        Текущее состояние игры: ${JSON.stringify(currentGameState, null, 2)}
        
        Адаптируй следующие аспекты:
        
        1. СЛОЖНОСТЬ:
           - Для новичков: упрости механики, добавь подсказки
           - Для экспертов: усложни, добавь дополнительные вызовы
           - Для осторожных: дай больше времени на размышления
           - Для агрессивных: увеличь темп, добавь элементы риска
        
        2. МЕХАНИКИ:
           - Для соревновательных: добавь элементы соревнования
           - Для творческих: добавь возможности для экспериментов
           - Для социальных: добавь возможности поделиться результатами
        
        3. ИНТЕРФЕЙС:
           - Для детальных: покажи больше статистики
           - Для быстрых: упрости интерфейс
           - Для обучающихся: добавь объяснения
        
        4. МОТИВАЦИЯ:
           - Для достиженческих: добавь больше целей и наград
           - Для процессных: подчеркни удовольствие от игры
           - Для социальных: добавь возможности взаимодействия
        
        Верни объект с адаптированными параметрами игры.
      `;

      const result = await model.generateContent(prompt);
      const adaptedGame = JSON.parse(result.response.text());

      return adaptedGame;
    } catch (error) {
      console.error('Ошибка адаптации игры:', error);
      return currentGameState;
    }
  }

  // Вспомогательные методы

  async getSearchHistory(userId, limit = 50) {
    const query = `
      SELECT query, timestamp, action_data
      FROM behavior_logs
      WHERE user_id = ? AND action_type = 'search_query'
      ORDER BY timestamp DESC
      LIMIT ?
    `;
    
    const [rows] = await this.db.execute(query, [userId, limit]);
    return rows.map(row => ({
      ...row,
      action_data: JSON.parse(row.action_data || '{}')
    }));
  }

  async getGameStatistics(userId) {
    const query = `
      SELECT game_type, game_data, behavior_analysis, performance_metrics
      FROM game_behavior_logs
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT 20
    `;
    
    const [rows] = await this.db.execute(query, [userId]);
    return rows.map(row => ({
      game_type: row.game_type,
      game_data: JSON.parse(row.game_data || '{}'),
      behavior_analysis: JSON.parse(row.behavior_analysis || '{}'),
      performance_metrics: JSON.parse(row.performance_metrics || '{}')
    }));
  }

  async savePersonalityProfile(userId, profile) {
    const query = `
      INSERT INTO ai_user_profiles (user_id, personality_traits, interests, behavior_patterns, knowledge_graph, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
      personality_traits = VALUES(personality_traits),
      behavior_patterns = VALUES(behavior_patterns),
      updated_at = NOW()
    `;
    
    await this.db.execute(query, [
      userId,
      JSON.stringify(profile),
      JSON.stringify([]),
      JSON.stringify({}),
      JSON.stringify({})
    ]);
  }

  async saveGamingProfile(userId, profile) {
    const query = `
      INSERT INTO game_behavior_logs (user_id, game_type, behavior_analysis, created_at)
      VALUES (?, 'personality_analysis', ?, NOW())
    `;
    
    await this.db.execute(query, [
      userId,
      JSON.stringify(profile)
    ]);
  }

  getDefaultPersonality() {
    return {
      cognitive_style: {
        analytical: 5,
        intuitive: 5,
        detailed: 5,
        general: 5,
        logical: 5,
        creative: 5
      },
      interests: {
        technical: 5,
        humanitarian: 5,
        theoretical: 5,
        practical: 5,
        new_topics: 5,
        proven_topics: 5
      },
      search_style: {
        broad: 5,
        narrow: 5,
        surface: 5,
        deep: 5,
        fast: 5,
        thorough: 5
      },
      emotional_patterns: {
        curiosity: 7,
        practicality: 5,
        caution: 5,
        risk: 5,
        individuality: 5,
        sociality: 5
      },
      expertise_level: 3
    };
  }

  getDefaultGamingStyle() {
    return {
      game_style: {
        aggressive: 5,
        cautious: 5,
        fast: 5,
        slow: 5,
        risky: 5,
        safe: 5,
        experimental: 5,
        conservative: 5
      },
      motivation: {
        competition: 5,
        entertainment: 7,
        achievements: 5,
        process: 5,
        social: 5,
        individual: 5,
        learning: 5,
        relaxation: 7
      },
      difficulty_preferences: {
        easy: 6,
        hard: 4,
        linear: 5,
        open: 5,
        short: 6,
        long: 4
      },
      behavioral_patterns: {
        persistence: 6,
        restart_frequency: 5,
        thinking_time: 5,
        failure_reaction: 5
      }
    };
  }
}

export default PersonalityAnalyzer;