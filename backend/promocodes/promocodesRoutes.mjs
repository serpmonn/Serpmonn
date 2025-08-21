import express from 'express';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Конфигурация API Perfluence (хранится на сервере)
const PERFLUENCE_API_CONFIG = {
    url: 'https://dash.perfluence.net/blogger/promocode-api/json',
    key: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6ODk4OTg3LCJhdXRoX2tleSI6Iml1Tl9fVk5WdTdOY0RqT1RKZW1EbUpUV1JjeUxqNFp4IiwiZGF0YSI6W119.k8vSFrvEtc75g7Gu-YdIcvhu6nB60V2CTOjti0IPfhQ',
    updateInterval: 30 * 60 * 1000, // 30 минут
    cacheKey: 'perfluence_promocodes_cache'
};

// Кэш для промокодов
let promocodesCache = {
    data: [],
    lastUpdate: null,
    isUpdating: false
};

// Лимитер для API запросов
const promocodesLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 100, // максимум 100 запросов
    message: {
        status: 'error',
        message: 'Слишком много запросов к API промокодов'
    }
});

// Функция для загрузки промокодов из API Perfluence
async function loadPromocodesFromAPI() {
    try {
        console.log('[PROMOCODES] Загружаю промокоды из API Perfluence...');
        
        const response = await fetch(`${PERFLUENCE_API_CONFIG.url}?key=${PERFLUENCE_API_CONFIG.key}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ошибка! Статус: ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`[PROMOCODES] Получено ${data.length} промокодов от API`);
        
        if (data && Array.isArray(data)) {
            // Обрабатываем и валидируем данные
            const processedData = processPromocodesData(data);
            
            // Обновляем кэш
            promocodesCache = {
                data: processedData,
                lastUpdate: new Date(),
                isUpdating: false
            };
            
            console.log(`[PROMOCODES] Кэш обновлен: ${processedData.length} промокодов`);
            return true;
        } else {
            throw new Error('Неверный формат данных от API');
        }
    } catch (error) {
        console.error('[PROMOCODES] Ошибка при загрузке промокодов:', error);
        promocodesCache.isUpdating = false;
        return false;
    }
}

// Функция для обработки данных промокодов
function processPromocodesData(rawData) {
    return rawData.map(item => ({
        id: item.id || Math.random().toString(36).substr(2, 9),
        title: item.title || item.name || 'Промокод',
        description: item.description || 'Описание недоступно',
        promocode: item.promocode || null,
        discount_percent: item.discount_percent || null,
        discount_amount: item.discount_amount || null,
        valid_until: item.valid_until || item.expiry_date || null,
        landing_url: item.landing_url || null,
        image_url: item.image_url || '/images/default-promo.png',
        conditions: item.conditions || null,
        advertiser_info: item.advertiser_info || null,
        category: determineCategory(item),
        is_top: determineIfTop(item),
        created_at: new Date().toISOString()
    }));
}

// Функция для определения категории промокода
function determineCategory(item) {
    const title = (item.title || item.name || '').toLowerCase();
    const description = (item.description || '').toLowerCase();
    
    if (title.includes('еда') || title.includes('ресторан') || title.includes('доставка') || 
        description.includes('еда') || description.includes('ресторан') || description.includes('доставка')) {
        return 'еда';
    } else if (title.includes('продукт') || title.includes('лавка') || title.includes('магазин') ||
               description.includes('продукт') || description.includes('лавка') || description.includes('магазин')) {
        return 'продукты';
    } else if (title.includes('билет') || title.includes('афиша') || title.includes('кино') ||
               description.includes('билет') || description.includes('афиша') || description.includes('кино')) {
        return 'развлечения';
    } else if (title.includes('товар') || title.includes('покупка') || title.includes('магазин') ||
               description.includes('товар') || description.includes('покупка') || description.includes('магазин')) {
        return 'товары';
    } else if (title.includes('услуга') || title.includes('сервис') || title.includes('подписка') ||
               description.includes('услуга') || description.includes('сервис') || description.includes('подписка')) {
        return 'услуги';
    }
    
    return 'другие';
}

// Функция для определения топ-оффера
function determineIfTop(item) {
    return item.is_top || 
           (item.discount_percent && item.discount_percent >= 50) ||
           (item.discount_amount && item.discount_amount >= 1000);
}

// Функция для получения статистики
function getPromocodesStats() {
    const now = new Date();
    const total = promocodesCache.data.length;
    
    const active = promocodesCache.data.filter(promo => {
        if (!promo.valid_until) return true;
        return new Date(promo.valid_until) > now;
    }).length;
    
    const expired = total - active;
    
    return {
        total,
        active,
        expired,
        lastUpdate: promocodesCache.lastUpdate
    };
}

// Функция для фильтрации промокодов
function filterPromocodes(filters = {}) {
    let filtered = [...promocodesCache.data];
    
    // Фильтр по поиску
    if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(promo => 
            (promo.title && promo.title.toLowerCase().includes(searchLower)) ||
            (promo.description && promo.description.toLowerCase().includes(searchLower))
        );
    }
    
    // Фильтр по категории
    if (filters.category && filters.category !== 'all') {
        filtered = filtered.filter(promo => promo.category === filters.category);
    }
    
    // Фильтр по статусу (активные/истекшие)
    if (filters.status) {
        const now = new Date();
        if (filters.status === 'active') {
            filtered = filtered.filter(promo => {
                if (!promo.valid_until) return true;
                return new Date(promo.valid_until) > now;
            });
        } else if (filters.status === 'expired') {
            filtered = filtered.filter(promo => {
                if (!promo.valid_until) return false;
                return new Date(promo.valid_until) <= now;
            });
        }
    }
    
    // Сортировка
    if (filters.sortBy === 'expiry') {
        filtered.sort((a, b) => {
            const dateA = new Date(a.valid_until || '9999-12-31');
            const dateB = new Date(b.valid_until || '9999-12-31');
            return filters.sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });
    } else if (filters.sortBy === 'discount') {
        filtered.sort((a, b) => {
            const discountA = a.discount_percent || a.discount_amount || 0;
            const discountB = b.discount_percent || b.discount_amount || 0;
            return filters.sortOrder === 'desc' ? discountB - discountA : discountA - discountB;
        });
    }
    
    return filtered;
}

// Маршрут для получения всех промокодов
router.get('/', promocodesLimiter, async (req, res) => {
    try {
        // Проверяем, нужно ли обновить кэш
        const shouldUpdate = !promocodesCache.lastUpdate || 
            (Date.now() - promocodesCache.lastUpdate.getTime()) > PERFLUENCE_API_CONFIG.updateInterval;
        
        if (shouldUpdate && !promocodesCache.isUpdating) {
            promocodesCache.isUpdating = true;
            // Запускаем обновление в фоне
            loadPromocodesFromAPI().catch(console.error);
        }
        
        // Применяем фильтры
        const filters = {
            search: req.query.search,
            category: req.query.category,
            status: req.query.status,
            sortBy: req.query.sortBy,
            sortOrder: req.query.sortOrder
        };
        
        const filteredPromocodes = filterPromocodes(filters);
        
        res.json({
            status: 'success',
            data: filteredPromocodes,
            stats: getPromocodesStats(),
            filters: filters
        });
        
    } catch (error) {
        console.error('[PROMOCODES] Ошибка при получении промокодов:', error);
        res.status(500).json({
            status: 'error',
            message: 'Ошибка при получении промокодов'
        });
    }
});

// Маршрут для получения статистики
router.get('/stats', promocodesLimiter, (req, res) => {
    try {
        res.json({
            status: 'success',
            data: getPromocodesStats()
        });
    } catch (error) {
        console.error('[PROMOCODES] Ошибка при получении статистики:', error);
        res.status(500).json({
            status: 'error',
            message: 'Ошибка при получении статистики'
        });
    }
});

// Маршрут для принудительного обновления
router.post('/refresh', promocodesLimiter, async (req, res) => {
    try {
        if (promocodesCache.isUpdating) {
            return res.json({
                status: 'info',
                message: 'Обновление уже выполняется'
            });
        }
        
        const success = await loadPromocodesFromAPI();
        
        if (success) {
            res.json({
                status: 'success',
                message: 'Промокоды успешно обновлены',
                stats: getPromocodesStats()
            });
        } else {
            res.status(500).json({
                status: 'error',
                message: 'Ошибка при обновлении промокодов'
            });
        }
        
    } catch (error) {
        console.error('[PROMOCODES] Ошибка при принудительном обновлении:', error);
        res.status(500).json({
            status: 'error',
            message: 'Ошибка при обновлении промокодов'
        });
    }
});

// Маршрут для получения категорий
router.get('/categories', promocodesLimiter, (req, res) => {
    try {
        const categories = [...new Set(promocodesCache.data.map(promo => promo.category))];
        res.json({
            status: 'success',
            data: categories
        });
    } catch (error) {
        console.error('[PROMOCODES] Ошибка при получении категорий:', error);
        res.status(500).json({
            status: 'error',
            message: 'Ошибка при получении категорий'
        });
    }
});

// Инициализация при загрузке модуля
(async () => {
    console.log('[PROMOCODES] Инициализация модуля промокодов...');
    await loadPromocodesFromAPI();
    
    // Запускаем автоматическое обновление
    setInterval(async () => {
        if (!promocodesCache.isUpdating) {
            await loadPromocodesFromAPI();
        }
    }, PERFLUENCE_API_CONFIG.updateInterval);
    
    console.log('[PROMOCODES] Модуль промокодов инициализирован');
})();

export default router;