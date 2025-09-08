import PersonalityAnalyzer from './personality-analyzer.mjs';

/**
 * Система адаптивных игр, которая меняет механики под стиль игрока
 */
class AdaptiveGames {
  constructor() {
    this.personalityAnalyzer = new PersonalityAnalyzer();
  }

  /**
   * Адаптирует игру 2048 под игровой стиль пользователя
   * @param {number} userId - ID пользователя
   * @param {Object} currentGameState - Текущее состояние игры
   * @returns {Object} Адаптированная игра 2048
   */
  async adaptGame2048(userId, currentGameState) {
    try {
      const gamingProfile = await this.personalityAnalyzer.analyzeGamingStyle(userId);
      
      const adaptations = {
        // Базовые параметры игры
        boardSize: this.calculateBoardSize(gamingProfile),
        spawnRate: this.calculateSpawnRate(gamingProfile),
        difficulty: this.calculateDifficulty(gamingProfile),
        
        // Адаптивные механики
        mechanics: this.adaptMechanics2048(gamingProfile),
        
        // Интерфейс и подсказки
        ui: this.adaptUI2048(gamingProfile),
        
        // Мотивационные элементы
        motivation: this.adaptMotivation2048(gamingProfile),
        
        // Обратная связь
        feedback: this.adaptFeedback2048(gamingProfile)
      };

      return {
        ...currentGameState,
        adaptations,
        personalizedSettings: this.generatePersonalizedSettings(gamingProfile)
      };
    } catch (error) {
      console.error('Ошибка адаптации 2048:', error);
      return currentGameState;
    }
  }

  /**
   * Адаптирует игру RedSquare под игровой стиль пользователя
   * @param {number} userId - ID пользователя
   * @param {Object} currentGameState - Текущее состояние игры
   * @returns {Object} Адаптированная игра RedSquare
   */
  async adaptGameRedSquare(userId, currentGameState) {
    try {
      const gamingProfile = await this.personalityAnalyzer.analyzeGamingStyle(userId);
      
      const adaptations = {
        // Скорость и темп игры
        gameSpeed: this.calculateGameSpeed(gamingProfile),
        playerSpeed: this.calculatePlayerSpeed(gamingProfile),
        
        // Сложность препятствий
        obstacles: this.adaptObstacles(gamingProfile),
        
        // Система очков
        scoring: this.adaptScoring(gamingProfile),
        
        // Визуальные эффекты
        visualEffects: this.adaptVisualEffects(gamingProfile),
        
        // Звуковые эффекты
        audio: this.adaptAudio(gamingProfile)
      };

      return {
        ...currentGameState,
        adaptations,
        personalizedSettings: this.generatePersonalizedSettings(gamingProfile)
      };
    } catch (error) {
      console.error('Ошибка адаптации RedSquare:', error);
      return currentGameState;
    }
  }

  // Методы адаптации для 2048

  calculateBoardSize(gamingProfile) {
    const { difficulty_preferences, expertise_level } = gamingProfile;
    
    // Для новичков - меньшая доска (3x3)
    if (expertise_level < 3) return { width: 3, height: 3 };
    
    // Для любителей сложности - большая доска (5x5)
    if (difficulty_preferences.hard > 7) return { width: 5, height: 5 };
    
    // Стандартная доска (4x4)
    return { width: 4, height: 4 };
  }

  calculateSpawnRate(gamingProfile) {
    const { game_style, motivation } = gamingProfile;
    
    // Для быстрых игроков - чаще появляются новые плитки
    if (game_style.fast > 7) return 0.3; // 30% шанс на каждом ходу
    
    // Для осторожных игроков - реже появляются новые плитки
    if (game_style.cautious > 7) return 0.1; // 10% шанс
    
    // Стандартная частота
    return 0.2; // 20% шанс
  }

  calculateDifficulty(gamingProfile) {
    const { difficulty_preferences, expertise_level } = gamingProfile;
    
    let difficulty = 1;
    
    // Базовый уровень сложности
    difficulty += expertise_level * 0.5;
    
    // Предпочтения сложности
    if (difficulty_preferences.hard > 7) difficulty += 2;
    if (difficulty_preferences.easy > 7) difficulty -= 1;
    
    return Math.max(1, Math.min(10, difficulty));
  }

  adaptMechanics2048(gamingProfile) {
    const { game_style, motivation, behavioral_patterns } = gamingProfile;
    
    const mechanics = {
      // Для экспериментальных игроков - добавь новые механики
      specialTiles: game_style.experimental > 7 ? [
        { type: 'multiplier', effect: 'double_score', rarity: 0.05 },
        { type: 'bomb', effect: 'clear_row', rarity: 0.03 }
      ] : [],
      
      // Для соревновательных - добавь элементы соревнования
      competitiveElements: motivation.competition > 7 ? {
        timeLimit: true,
        leaderboard: true,
        achievements: true
      } : {},
      
      // Для обучающихся - добавь подсказки
      hints: behavioral_patterns.thinking_time > 7 ? {
        showPossibleMoves: true,
        highlightBestMove: true,
        explainMechanics: true
      } : {},
      
      // Для настойчивых - добавь систему жизней
      lives: behavioral_patterns.persistence > 7 ? {
        maxLives: 3,
        restoreOnAchievement: true
      } : null
    };

    return mechanics;
  }

  adaptUI2048(gamingProfile) {
    const { cognitive_style, interests } = gamingProfile;
    
    return {
      // Для аналитиков - покажи больше статистики
      showStatistics: cognitive_style.analytical > 7 ? {
        movesCount: true,
        efficiency: true,
        prediction: true,
        heatmap: true
      } : {},
      
      // Для визуалов - улучши графику
      visualStyle: interests.creative > 7 ? {
        theme: 'colorful',
        animations: 'extensive',
        particles: true
      } : {
        theme: 'minimal',
        animations: 'subtle',
        particles: false
      },
      
      // Для быстрых игроков - упрости интерфейс
      simplifiedUI: cognitive_style.fast > 7 ? {
        hideUnnecessaryElements: true,
        largeButtons: true,
        quickActions: true
      } : {}
    };
  }

  adaptMotivation2048(gamingProfile) {
    const { motivation, behavioral_patterns } = gamingProfile;
    
    return {
      // Для достиженческих - больше целей
      goals: motivation.achievements > 7 ? [
        { type: 'score', target: 1000, reward: 'badge' },
        { type: 'tile', target: 512, reward: 'unlock_theme' },
        { type: 'streak', target: 10, reward: 'bonus_points' }
      ] : [],
      
      // Для процессных - подчеркни удовольствие
      processRewards: motivation.process > 7 ? {
        celebrateSmallWins: true,
        showProgress: true,
        positiveFeedback: true
      } : {},
      
      // Для социальных - добавь возможности поделиться
      socialFeatures: motivation.social > 7 ? {
        shareScore: true,
        compareWithFriends: true,
        teamChallenges: true
      } : {}
    };
  }

  adaptFeedback2048(gamingProfile) {
    const { behavioral_patterns, emotional_patterns } = gamingProfile;
    
    return {
      // Для чувствительных к неудачам - мягкая обратная связь
      failureFeedback: behavioral_patterns.failure_reaction > 7 ? {
        encouraging: true,
        tips: true,
        secondChance: true
      } : {
        direct: true,
        challenging: true
      },
      
      // Для любопытных - объяснения
      explanations: emotional_patterns.curiosity > 7 ? {
        explainWhy: true,
        showAlternatives: true,
        teachStrategy: true
      } : {}
    };
  }

  // Методы адаптации для RedSquare

  calculateGameSpeed(gamingProfile) {
    const { game_style, difficulty_preferences } = gamingProfile;
    
    let speed = 1.0; // Базовая скорость
    
    // Для быстрых игроков
    if (game_style.fast > 7) speed += 0.5;
    
    // Для любителей сложности
    if (difficulty_preferences.hard > 7) speed += 0.3;
    
    // Для осторожных игроков
    if (game_style.cautious > 7) speed -= 0.3;
    
    return Math.max(0.5, Math.min(2.0, speed));
  }

  calculatePlayerSpeed(gamingProfile) {
    const { game_style, behavioral_patterns } = gamingProfile;
    
    let speed = 1.0;
    
    // Для быстрых игроков
    if (game_style.fast > 7) speed += 0.4;
    
    // Для тех, кто много думает
    if (behavioral_patterns.thinking_time > 7) speed -= 0.2;
    
    return Math.max(0.6, Math.min(1.8, speed));
  }

  adaptObstacles(gamingProfile) {
    const { difficulty_preferences, game_style } = gamingProfile;
    
    return {
      // Частота появления препятствий
      spawnRate: difficulty_preferences.hard > 7 ? 0.8 : 0.5,
      
      // Сложность препятствий
      complexity: difficulty_preferences.hard > 7 ? {
        movingObstacles: true,
        changingPatterns: true,
        multipleTypes: true
      } : {
        movingObstacles: false,
        changingPatterns: false,
        multipleTypes: false
      },
      
      // Для экспериментальных - новые типы препятствий
      specialObstacles: game_style.experimental > 7 ? [
        { type: 'teleport', effect: 'random_position' },
        { type: 'shield', effect: 'temporary_protection' }
      ] : []
    };
  }

  adaptScoring(gamingProfile) {
    const { motivation, game_style } = gamingProfile;
    
    return {
      // Для соревновательных - сложная система очков
      scoringSystem: motivation.competition > 7 ? {
        baseScore: 10,
        multiplier: true,
        combo: true,
        bonus: true
      } : {
        baseScore: 10,
        multiplier: false,
        combo: false,
        bonus: false
      },
      
      // Для рискованных - бонусы за риск
      riskRewards: game_style.risky > 7 ? {
        closeCallBonus: true,
        speedBonus: true,
        dangerMultiplier: true
      } : {}
    };
  }

  adaptVisualEffects(gamingProfile) {
    const { interests, cognitive_style } = gamingProfile;
    
    return {
      // Для творческих - больше эффектов
      effects: interests.creative > 7 ? {
        particles: true,
        trails: true,
        explosions: true,
        screenShake: true
      } : {
        particles: false,
        trails: false,
        explosions: false,
        screenShake: false
      },
      
      // Для аналитиков - информативные эффекты
      information: cognitive_style.analytical > 7 ? {
        showHitboxes: true,
        showTrajectories: true,
        showStatistics: true
      } : {}
    };
  }

  adaptAudio(gamingProfile) {
    const { interests, motivation } = gamingProfile;
    
    return {
      // Для развлекающихся - больше звуков
      soundEffects: motivation.entertainment > 7 ? {
        moveSound: true,
        collectSound: true,
        failSound: true,
        successSound: true
      } : {
        moveSound: false,
        collectSound: true,
        failSound: true,
        successSound: true
      },
      
      // Для творческих - музыка
      music: interests.creative > 7 ? {
        backgroundMusic: true,
        dynamicMusic: true,
        adaptiveVolume: true
      } : {
        backgroundMusic: false,
        dynamicMusic: false,
        adaptiveVolume: false
      }
    };
  }

  generatePersonalizedSettings(gamingProfile) {
    return {
      // Настройки интерфейса
      ui: {
        theme: gamingProfile.interests?.creative > 7 ? 'colorful' : 'minimal',
        fontSize: gamingProfile.cognitive_style?.detailed > 7 ? 'large' : 'normal',
        showHints: gamingProfile.behavioral_patterns?.thinking_time > 7
      },
      
      // Настройки геймплея
      gameplay: {
        autoSave: true,
        pauseOnFocus: gamingProfile.behavioral_patterns?.thinking_time > 7,
        quickRestart: gamingProfile.game_style?.fast > 7
      },
      
      // Настройки уведомлений
      notifications: {
        achievements: gamingProfile.motivation?.achievements > 7,
        dailyGoals: gamingProfile.motivation?.process > 7,
        socialUpdates: gamingProfile.motivation?.social > 7
      }
    };
  }
}

export default AdaptiveGames;