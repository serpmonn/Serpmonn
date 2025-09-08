import { GoogleGenerativeAI } from "@google/generative-ai";
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config({ path: '/var/www/serpmonn.ru/.env' });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

/**
 * Анализатор поведения пользователя для AI-персонализированной вселенной
 */
class BehaviorAnalyzer {
  constructor() {
    this.db = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
  }

  /**
   * Анализирует поисковый запрос пользователя
   * @param {string} query - Поисковый запрос
   * @param {number} userId - ID пользователя
   * @returns {Object} Анализ запроса
   */
  async analyzeSearchQuery(query, userId) {
    try {
      const prompt = `
        Проанализируй поисковый запрос: "${query}"
        
        Определи:
        1. Тема/категория (технологии, игры, новости, образование, развлечения)
        2. Уровень сложности (новичок, средний, эксперт)
        3. Эмоциональный тон (любопытство, срочность, развлечение, обучение)
        4. Предполагаемые интересы пользователя
        5. Рекомендуемые связанные темы
        
        Ответь в формате JSON.
      `;

      const result = await model.generateContent(prompt);
      const analysis = JSON.parse(result.response.text());

      // Сохраняем анализ в базу данных
      await this.saveBehaviorData(userId, 'search_query', {
        query,
        analysis,
        timestamp: new Date()
      });

      return analysis;
    } catch (error) {
      console.error('Ошибка анализа поискового запроса:', error);
      return null;
    }
  }

  /**
   * Анализирует игровое поведение пользователя
   * @param {Object} gameData - Данные об игре
   * @param {number} userId - ID пользователя
   * @returns {Object} Анализ игрового поведения
   */
  async analyzeGameBehavior(gameData, userId) {
    try {
      const prompt = `
        Проанализируй игровое поведение пользователя:
        - Игра: ${gameData.gameType}
        - Счет: ${gameData.score}
        - Время игры: ${gameData.duration} секунд
        - Количество попыток: ${gameData.attempts}
        - Стиль игры: ${gameData.playStyle || 'не определен'}
        
        Определи:
        1. Игровые предпочтения
        2. Уровень навыков
        3. Стиль игры (агрессивный, осторожный, экспериментальный)
        4. Мотивацию (соревнование, развлечение, обучение)
        5. Рекомендации по улучшению опыта
        
        Ответь в формате JSON.
      `;

      const result = await model.generateContent(prompt);
      const analysis = JSON.parse(result.response.text());

      await this.saveBehaviorData(userId, 'game_behavior', {
        gameData,
        analysis,
        timestamp: new Date()
      });

      return analysis;
    } catch (error) {
      console.error('Ошибка анализа игрового поведения:', error);
      return null;
    }
  }

  /**
   * Создает персональный профиль пользователя
   * @param {number} userId - ID пользователя
   * @returns {Object} Персональный профиль
   */
  async createPersonalProfile(userId) {
    try {
      // Получаем все данные о поведении пользователя
      const behaviorData = await this.getUserBehaviorData(userId);
      
      if (!behaviorData || behaviorData.length === 0) {
        return this.createDefaultProfile();
      }

      const prompt = `
        На основе следующих данных о поведении пользователя создай персональный профиль:
        
        ${JSON.stringify(behaviorData, null, 2)}
        
        Создай профиль включающий:
        1. Основные интересы и увлечения
        2. Личностные черты
        3. Предпочтения в контенте
        4. Стиль обучения и взаимодействия
        5. Эмоциональные паттерны
        6. Рекомендации по персонализации
        
        Ответь в формате JSON.
      `;

      const result = await model.generateContent(prompt);
      const profile = JSON.parse(result.response.text());

      // Сохраняем профиль
      await this.savePersonalProfile(userId, profile);

      return profile;
    } catch (error) {
      console.error('Ошибка создания персонального профиля:', error);
      return this.createDefaultProfile();
    }
  }

  /**
   * Генерирует персональные рекомендации
   * @param {number} userId - ID пользователя
   * @param {string} context - Контекст для рекомендаций
   * @returns {Array} Массив рекомендаций
   */
  async generatePersonalizedRecommendations(userId, context = 'general') {
    try {
      const profile = await this.getPersonalProfile(userId);
      
      const prompt = `
        На основе персонального профиля пользователя:
        ${JSON.stringify(profile, null, 2)}
        
        И контекста: "${context}"
        
        Создай 5 персональных рекомендаций включающих:
        1. Интересные статьи или новости
        2. Игры, которые могут понравиться
        3. Образовательный контент
        4. Развлекательные активности
        5. Полезные инструменты или сервисы
        
        Каждая рекомендация должна включать:
        - Заголовок
        - Описание
        - Причина рекомендации
        - Ожидаемая польза
        
        Ответь в формате JSON массива.
      `;

      const result = await model.generateContent(prompt);
      const recommendations = JSON.parse(result.response.text());

      return recommendations;
    } catch (error) {
      console.error('Ошибка генерации рекомендаций:', error);
      return [];
    }
  }

  // Вспомогательные методы

  async saveBehaviorData(userId, actionType, data) {
    const query = `
      INSERT INTO behavior_logs (user_id, action_type, action_data, timestamp)
      VALUES (?, ?, ?, ?)
    `;
    
    await this.db.execute(query, [
      userId,
      actionType,
      JSON.stringify(data),
      new Date()
    ]);
  }

  async getUserBehaviorData(userId) {
    const query = `
      SELECT action_type, action_data, timestamp
      FROM behavior_logs
      WHERE user_id = ?
      ORDER BY timestamp DESC
      LIMIT 100
    `;
    
    const [rows] = await this.db.execute(query, [userId]);
    return rows.map(row => ({
      ...row,
      action_data: JSON.parse(row.action_data)
    }));
  }

  async savePersonalProfile(userId, profile) {
    const query = `
      INSERT INTO ai_user_profiles (user_id, personality_traits, interests, behavior_patterns, knowledge_graph, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())
      ON DUPLICATE KEY UPDATE
      personality_traits = VALUES(personality_traits),
      interests = VALUES(interests),
      behavior_patterns = VALUES(behavior_patterns),
      knowledge_graph = VALUES(knowledge_graph),
      updated_at = NOW()
    `;
    
    await this.db.execute(query, [
      userId,
      JSON.stringify(profile.personality_traits || {}),
      JSON.stringify(profile.interests || []),
      JSON.stringify(profile.behavior_patterns || {}),
      JSON.stringify(profile.knowledge_graph || {})
    ]);
  }

  async getPersonalProfile(userId) {
    const query = `
      SELECT * FROM ai_user_profiles WHERE user_id = ?
    `;
    
    const [rows] = await this.db.execute(query, [userId]);
    
    if (rows.length === 0) {
      return await this.createPersonalProfile(userId);
    }
    
    const profile = rows[0];
    return {
      personality_traits: JSON.parse(profile.personality_traits),
      interests: JSON.parse(profile.interests),
      behavior_patterns: JSON.parse(profile.behavior_patterns),
      knowledge_graph: JSON.parse(profile.knowledge_graph)
    };
  }

  createDefaultProfile() {
    return {
      personality_traits: {
        curiosity: 'medium',
        competitiveness: 'low',
        creativity: 'medium'
      },
      interests: ['general'],
      behavior_patterns: {},
      knowledge_graph: {}
    };
  }
}

export default BehaviorAnalyzer;