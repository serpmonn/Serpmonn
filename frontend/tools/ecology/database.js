/**
 * База данных экологических показателей продуктов
 * Данные основаны на научных исследованиях и международных стандартах
 */

const ECO_DATABASE = {
    // Мясные продукты (кг CO₂ эквивалента на кг продукта)
    beef: {
        name: "Говядина",
        carbonFootprint: 27.0, // кг CO₂/кг
        waterFootprint: 15400, // л/кг
        landFootprint: 164, // м²/кг
        category: "meat",
        ecoRating: 2, // 1-10 (1 = очень плохо для экологии)
        alternatives: ["растительные белки", "бобовые", "орехи"],
        description: "Один из самых экологически затратных продуктов"
    },
    lamb: {
        name: "Баранина",
        carbonFootprint: 24.0,
        waterFootprint: 10400,
        landFootprint: 185,
        category: "meat",
        ecoRating: 2,
        alternatives: ["растительные белки", "бобовые"],
        description: "Высокий экологический след из-за метана"
    },
    pork: {
        name: "Свинина",
        carbonFootprint: 12.1,
        waterFootprint: 6000,
        landFootprint: 11,
        category: "meat",
        ecoRating: 4,
        alternatives: ["растительные белки", "птица"],
        description: "Средний экологический след среди мяса"
    },
    chicken: {
        name: "Курица",
        carbonFootprint: 6.9,
        waterFootprint: 4325,
        landFootprint: 7,
        category: "meat",
        ecoRating: 6,
        alternatives: ["растительные белки", "рыба"],
        description: "Наиболее экологичное мясо"
    },
    fish: {
        name: "Рыба",
        carbonFootprint: 3.0,
        waterFootprint: 0, // Морская рыба не использует пресную воду
        landFootprint: 0,
        category: "seafood",
        ecoRating: 7,
        alternatives: ["растительные белки", "водоросли"],
        description: "Хороший источник белка с низким следом"
    },

    // Молочные продукты
    milk: {
        name: "Молоко",
        carbonFootprint: 3.2,
        waterFootprint: 1050,
        landFootprint: 8.9,
        category: "dairy",
        ecoRating: 6,
        alternatives: ["растительное молоко", "овсяное молоко"],
        description: "Умеренный экологический след"
    },
    cheese: {
        name: "Сыр",
        carbonFootprint: 13.5,
        waterFootprint: 5000,
        landFootprint: 41,
        category: "dairy",
        ecoRating: 4,
        alternatives: ["растительные сыры", "орехи"],
        description: "Высокий след из-за концентрации молока"
    },
    eggs: {
        name: "Яйца",
        carbonFootprint: 4.2,
        waterFootprint: 3265,
        landFootprint: 5.7,
        category: "dairy",
        ecoRating: 6,
        alternatives: ["растительные белки", "тофу"],
        description: "Хороший источник белка"
    },

    // Зерновые и крупы
    rice: {
        name: "Рис",
        carbonFootprint: 4.0,
        waterFootprint: 2497,
        landFootprint: 2.8,
        category: "grains",
        ecoRating: 7,
        alternatives: ["киноа", "булгур", "гречка"],
        description: "Высокое потребление воды при выращивании"
    },
    wheat: {
        name: "Пшеница",
        carbonFootprint: 1.4,
        waterFootprint: 1300,
        landFootprint: 1.4,
        category: "grains",
        ecoRating: 8,
        alternatives: ["овес", "ячмень", "рожь"],
        description: "Экологически эффективная культура"
    },

    // Овощи
    potatoes: {
        name: "Картофель",
        carbonFootprint: 0.2,
        waterFootprint: 287,
        landFootprint: 0.3,
        category: "vegetables",
        ecoRating: 9,
        alternatives: ["батат", "репа"],
        description: "Один из самых экологичных продуктов"
    },
    tomatoes: {
        name: "Помидоры",
        carbonFootprint: 2.0,
        waterFootprint: 214,
        landFootprint: 0.3,
        category: "vegetables",
        ecoRating: 8,
        alternatives: ["сезонные овощи"],
        description: "Низкий след, особенно сезонные"
    },
    vegetables: {
        name: "Овощи (смешанные)",
        carbonFootprint: 0.5,
        waterFootprint: 300,
        landFootprint: 0.5,
        category: "vegetables",
        ecoRating: 9,
        alternatives: ["местные сезонные овощи"],
        description: "Очень экологичный выбор"
    },

    // Фрукты
    apples: {
        name: "Яблоки",
        carbonFootprint: 0.4,
        waterFootprint: 822,
        landFootprint: 0.3,
        category: "fruits",
        ecoRating: 8,
        alternatives: ["местные сезонные фрукты"],
        description: "Экологично, особенно местные сорта"
    },
    bananas: {
        name: "Бананы",
        carbonFootprint: 0.7,
        waterFootprint: 790,
        landFootprint: 0.3,
        category: "fruits",
        ecoRating: 7,
        alternatives: ["местные фрукты"],
        description: "Транспорт увеличивает след"
    },
    fruits: {
        name: "Фрукты (смешанные)",
        carbonFootprint: 0.6,
        waterFootprint: 600,
        landFootprint: 0.4,
        category: "fruits",
        ecoRating: 8,
        alternatives: ["местные сезонные фрукты"],
        description: "Хороший экологический выбор"
    },

    // Напитки и лакомства
    coffee: {
        name: "Кофе",
        carbonFootprint: 16.5,
        waterFootprint: 18900,
        landFootprint: 0.3,
        category: "beverages",
        ecoRating: 4,
        alternatives: ["чай", "цикорий"],
        description: "Высокий водный след"
    },
    chocolate: {
        name: "Шоколад",
        carbonFootprint: 19.0,
        waterFootprint: 17196,
        landFootprint: 0.3,
        category: "sweets",
        ecoRating: 3,
        alternatives: ["фрукты", "орехи"],
        description: "Очень высокий экологический след"
    },
    nuts: {
        name: "Орехи",
        carbonFootprint: 2.3,
        waterFootprint: 9063,
        landFootprint: 7.9,
        category: "nuts",
        ecoRating: 6,
        alternatives: ["семена", "бобовые"],
        description: "Хороший источник белка, но высокий водный след"
    },
    
    // Дополнительные мясные продукты
    turkey: {
        name: "Индейка",
        carbonFootprint: 10.9,
        waterFootprint: 4325,
        landFootprint: 45.2,
        category: "meat",
        ecoRating: 4,
        alternatives: ["курица", "растительные белки"],
        description: "Более экологичная альтернатива говядине"
    },
    duck: {
        name: "Утка",
        carbonFootprint: 12.1,
        waterFootprint: 3847,
        landFootprint: 38.9,
        category: "meat",
        ecoRating: 4,
        alternatives: ["курица", "индейка"],
        description: "Средний экологический след среди мяса птицы"
    },
    
    // Молочные продукты
    cheese: {
        name: "Сыр",
        carbonFootprint: 13.5,
        waterFootprint: 3178,
        landFootprint: 41.5,
        category: "dairy",
        ecoRating: 4,
        alternatives: ["растительные сыры", "орехи"],
        description: "Высокий углеродный след из-за производства"
    },
    butter: {
        name: "Масло сливочное",
        carbonFootprint: 12.1,
        waterFootprint: 5553,
        landFootprint: 35.2,
        category: "dairy",
        ecoRating: 4,
        alternatives: ["растительные масла", "авокадо"],
        description: "Концентрированный молочный продукт"
    },
    yogurt: {
        name: "Йогурт",
        carbonFootprint: 3.2,
        waterFootprint: 1335,
        landFootprint: 8.9,
        category: "dairy",
        ecoRating: 6,
        alternatives: ["растительные йогурты", "кефир"],
        description: "Относительно низкий экологический след"
    },
    
    // Рыба и морепродукты
    salmon: {
        name: "Лосось",
        carbonFootprint: 11.9,
        waterFootprint: 0,
        landFootprint: 0,
        category: "fish",
        ecoRating: 5,
        alternatives: ["растительные омега-3", "льняное семя"],
        description: "Хороший источник белка, но проблемы с переловом"
    },
    tuna: {
        name: "Тунец",
        carbonFootprint: 6.1,
        waterFootprint: 0,
        landFootprint: 0,
        category: "fish",
        ecoRating: 6,
        alternatives: ["другие виды рыбы", "растительные белки"],
        description: "Популярная рыба, но проблемы с устойчивостью"
    },
    shrimp: {
        name: "Креветки",
        carbonFootprint: 18.2,
        waterFootprint: 0,
        landFootprint: 0,
        category: "seafood",
        ecoRating: 3,
        alternatives: ["растительные белки", "другие морепродукты"],
        description: "Очень высокий углеродный след из-за аквакультуры"
    },
    
    // Овощи
    tomatoes: {
        name: "Помидоры",
        carbonFootprint: 2.2,
        waterFootprint: 214,
        landFootprint: 1.4,
        category: "vegetables",
        ecoRating: 8,
        alternatives: ["сезонные овощи", "консервированные помидоры"],
        description: "Низкий экологический след, особенно сезонные"
    },
    cucumbers: {
        name: "Огурцы",
        carbonFootprint: 0.3,
        waterFootprint: 353,
        landFootprint: 0.3,
        category: "vegetables",
        ecoRating: 9,
        alternatives: ["сезонные овощи", "кабачки"],
        description: "Очень низкий экологический след"
    },
    carrots: {
        name: "Морковь",
        carbonFootprint: 0.4,
        waterFootprint: 131,
        landFootprint: 0.3,
        category: "vegetables",
        ecoRating: 9,
        alternatives: ["сезонные корнеплоды", "свекла"],
        description: "Отличный выбор для экологии"
    },
    potatoes: {
        name: "Картофель",
        carbonFootprint: 0.2,
        waterFootprint: 287,
        landFootprint: 0.3,
        category: "vegetables",
        ecoRating: 9,
        alternatives: ["сладкий картофель", "другие корнеплоды"],
        description: "Один из самых экологичных продуктов"
    },
    
    // Фрукты
    oranges: {
        name: "Апельсины",
        carbonFootprint: 0.9,
        waterFootprint: 560,
        landFootprint: 0.3,
        category: "fruits",
        ecoRating: 8,
        alternatives: ["местные фрукты", "сезонные цитрусовые"],
        description: "Хороший выбор, особенно местные сорта"
    },
    grapes: {
        name: "Виноград",
        carbonFootprint: 0.3,
        waterFootprint: 590,
        landFootprint: 0.2,
        category: "fruits",
        ecoRating: 8,
        alternatives: ["сезонные ягоды", "местные фрукты"],
        description: "Низкий экологический след"
    },
    strawberries: {
        name: "Клубника",
        carbonFootprint: 0.4,
        waterFootprint: 280,
        landFootprint: 0.2,
        category: "fruits",
        ecoRating: 8,
        alternatives: ["сезонные ягоды", "местные фрукты"],
        description: "Хороший выбор в сезон"
    },
    
    // Зерновые и бобовые
    rice: {
        name: "Рис",
        carbonFootprint: 4.0,
        waterFootprint: 2497,
        landFootprint: 2.8,
        category: "grains",
        ecoRating: 6,
        alternatives: ["киноа", "булгур", "другие зерновые"],
        description: "Высокий водный след, но важный продукт"
    },
    quinoa: {
        name: "Киноа",
        carbonFootprint: 1.8,
        waterFootprint: 562,
        landFootprint: 1.1,
        category: "grains",
        ecoRating: 8,
        alternatives: ["булгур", "гречка", "другие псевдозерновые"],
        description: "Отличный экологический профиль"
    },
    lentils: {
        name: "Чечевица",
        carbonFootprint: 0.9,
        waterFootprint: 5874,
        landFootprint: 3.4,
        category: "legumes",
        ecoRating: 8,
        alternatives: ["фасоль", "горох", "нут"],
        description: "Отличный источник белка с низким углеродным следом"
    },
    chickpeas: {
        name: "Нут",
        carbonFootprint: 2.0,
        waterFootprint: 4335,
        landFootprint: 2.9,
        category: "legumes",
        ecoRating: 8,
        alternatives: ["фасоль", "чечевица", "горох"],
        description: "Питательный и экологичный продукт"
    },
    
    // Напитки
    coffee: {
        name: "Кофе",
        carbonFootprint: 16.5,
        waterFootprint: 18900,
        landFootprint: 12.5,
        category: "beverages",
        ecoRating: 4,
        alternatives: ["чай", "цикорий", "растительные напитки"],
        description: "Высокий экологический след, особенно при транспортировке"
    },
    tea: {
        name: "Чай",
        carbonFootprint: 5.0,
        waterFootprint: 8860,
        landFootprint: 3.3,
        category: "beverages",
        ecoRating: 6,
        alternatives: ["местные травы", "цикорий"],
        description: "Лучше кофе по экологическим показателям"
    },
    wine: {
        name: "Вино",
        carbonFootprint: 1.8,
        waterFootprint: 1090,
        landFootprint: 0.3,
        category: "beverages",
        ecoRating: 7,
        alternatives: ["местные напитки", "безалкогольные варианты"],
        description: "Относительно низкий экологический след"
    },
    
    // Сладости и закуски
    chocolate: {
        name: "Шоколад",
        carbonFootprint: 19.0,
        waterFootprint: 17196,
        landFootprint: 15.0,
        category: "sweets",
        ecoRating: 3,
        alternatives: ["фрукты", "орехи", "растительные десерты"],
        description: "Очень высокий экологический след"
    },
    sugar: {
        name: "Сахар",
        carbonFootprint: 3.0,
        waterFootprint: 1789,
        landFootprint: 0.3,
        category: "sweets",
        ecoRating: 6,
        alternatives: ["мед", "стевия", "фрукты"],
        description: "Умеренный экологический след"
    }
};

// Коэффициенты для разных единиц измерения
const UNIT_CONVERSIONS = {
    kg: 1,
    g: 0.001,
    l: 1,
    ml: 0.001,
    pieces: {
        // Примерные веса для штучных продуктов
        eggs: 0.06, // кг за яйцо
        apples: 0.2, // кг за яблоко
        bananas: 0.12, // кг за банан
        tomatoes: 0.15, // кг за помидор
        potatoes: 0.2, // кг за картофелину
        default: 0.1 // кг по умолчанию
    }
};

// Региональные коэффициенты (влияние транспорта и производства)
const REGIONAL_FACTORS = {
    local: 1.0, // Местные продукты
    regional: 1.2, // Региональные продукты
    national: 1.5, // Национальные продукты
    international: 2.0 // Импортные продукты
};

// Сезонные коэффициенты
const SEASONAL_FACTORS = {
    in_season: 1.0, // Сезонные продукты
    out_of_season: 1.5, // Внесезонные продукты (теплицы)
    greenhouse: 2.0 // Тепличные продукты
};

// Функции для работы с базой данных

/**
 * Получить данные о продукте
 * @param {string} productId - ID продукта
 * @returns {Object} Данные о продукте
 */
function getProductData(productId) {
    return ECO_DATABASE[productId] || null;
}

/**
 * Получить все продукты по категории
 * @param {string} category - Категория продукта
 * @returns {Array} Массив продуктов
 */
function getProductsByCategory(category) {
    return Object.entries(ECO_DATABASE)
        .filter(([id, data]) => data.category === category)
        .map(([id, data]) => ({ id, ...data }));
}

/**
 * Получить все категории продуктов
 * @returns {Array} Массив категорий
 */
function getAllCategories() {
    const categories = new Set();
    Object.values(ECO_DATABASE).forEach(product => {
        categories.add(product.category);
    });
    return Array.from(categories);
}

/**
 * Конвертировать единицы измерения
 * @param {number} quantity - Количество
 * @param {string} unit - Единица измерения
 * @param {string} productId - ID продукта (для штучных товаров)
 * @returns {number} Количество в килограммах
 */
function convertToKilograms(quantity, unit, productId) {
    if (unit === 'pieces') {
        const pieceWeight = UNIT_CONVERSIONS.pieces[productId] || UNIT_CONVERSIONS.pieces.default;
        return quantity * pieceWeight;
    }
    return quantity * UNIT_CONVERSIONS[unit];
}

/**
 * Рассчитать экологический след продукта
 * @param {string} productId - ID продукта
 * @param {number} quantity - Количество в кг
 * @param {string} region - Регион (local, regional, national, international)
 * @param {string} season - Сезонность (in_season, out_of_season, greenhouse)
 * @returns {Object} Экологический след
 */
function calculateProductFootprint(productId, quantity, region = 'national', season = 'in_season') {
    const product = getProductData(productId);
    if (!product) return null;

    const regionalFactor = REGIONAL_FACTORS[region] || 1.0;
    const seasonalFactor = SEASONAL_FACTORS[season] || 1.0;
    const totalFactor = regionalFactor * seasonalFactor;

    return {
        productId,
        productName: product.name,
        quantity: quantity,
        carbonFootprint: product.carbonFootprint * quantity * totalFactor,
        waterFootprint: product.waterFootprint * quantity * totalFactor,
        landFootprint: product.landFootprint * quantity * totalFactor,
        ecoRating: product.ecoRating,
        category: product.category,
        alternatives: product.alternatives,
        description: product.description,
        factors: {
            regional: regionalFactor,
            seasonal: seasonalFactor,
            total: totalFactor
        }
    };
}

/**
 * Получить рекомендации по снижению экологического следа
 * @param {Array} products - Массив продуктов с их следами
 * @returns {Array} Массив рекомендаций
 */
function getRecommendations(products) {
    const recommendations = [];
    
    // Анализ продуктов с высоким следом
    const highImpactProducts = products.filter(p => p.ecoRating <= 4);
    
    if (highImpactProducts.length > 0) {
        recommendations.push({
            type: 'warning',
            title: 'Продукты с высоким экологическим следом',
            description: `Рассмотрите альтернативы для: ${highImpactProducts.map(p => p.productName).join(', ')}`,
            impact: 'high'
        });
    }

    // Рекомендации по категориям
    const meatProducts = products.filter(p => p.category === 'meat');
    if (meatProducts.length > 0) {
        recommendations.push({
            type: 'suggestion',
            title: 'Снижение потребления мяса',
            description: 'Попробуйте заменить мясо растительными белками 1-2 раза в неделю',
            impact: 'medium'
        });
    }

    const dairyProducts = products.filter(p => p.category === 'dairy');
    if (dairyProducts.length > 0) {
        recommendations.push({
            type: 'suggestion',
            title: 'Альтернативы молочным продуктам',
            description: 'Попробуйте растительное молоко и сыры',
            impact: 'medium'
        });
    }

    // Общие рекомендации
    recommendations.push({
        type: 'tip',
        title: 'Покупайте местные сезонные продукты',
        description: 'Это снижает транспортный след и поддерживает местных производителей',
        impact: 'low'
    });

    recommendations.push({
        type: 'tip',
        title: 'Планируйте покупки',
        description: 'Избегайте пищевых отходов - покупайте только необходимое',
        impact: 'medium'
    });

    return recommendations;
}

/**
 * Получить сравнения с альтернативами
 * @param {Array} products - Массив продуктов
 * @returns {Array} Массив сравнений
 */
function getComparisons(products) {
    const comparisons = [];
    
    products.forEach(product => {
        if (product.alternatives && product.alternatives.length > 0) {
            comparisons.push({
                product: product.productName,
                currentFootprint: product.carbonFootprint,
                alternatives: product.alternatives,
                potentialSavings: product.carbonFootprint * 0.5 // Предполагаемая экономия 50%
            });
        }
    });

    return comparisons;
}

// Экспорт для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ECO_DATABASE,
        getProductData,
        getProductsByCategory,
        getAllCategories,
        convertToKilograms,
        calculateProductFootprint,
        getRecommendations,
        getComparisons
    };
}