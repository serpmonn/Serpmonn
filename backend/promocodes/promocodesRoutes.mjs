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
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { status: 'error', message: 'Слишком много запросов к API промокодов' }
});

// Утилиты извлечения полей
function firstDefined(...values) {
  for (const v of values) {
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

function stripHtml(html) {
  if (!html) return '';
  return String(html).replace(/<[^>]*>/g, '').trim();
}

function normalizeAdvertiserText(text) {
  const raw = stripHtml(text || '');
  // Убираем ведущие префиксы «Реклама.» и пробелы
  const withoutAd = raw.replace(/^\s*Реклама\.?\s*/i, '');
  // Нормализуем двойные пробелы
  return withoutAd.replace(/\s{2,}/g, ' ').trim();
}

function parsePercentFromString(value) {
  if (typeof value !== 'string') return null;
  const match = value.replace(',', '.').match(/(\d{1,3})\s*%/);
  return match ? Number(match[1]) : null;
}

function parseAmountFromString(value) {
  if (typeof value !== 'string') return null;
  const match = value.replace(/\s/g, '').match(/(\d{2,})(?:₽|rub|руб)/i);
  return match ? Number(match[1]) : null;
}

function extractDiscountFromTexts(...texts) {
  let percent = null;
  let amount = null;
  for (const t of texts) {
    if (percent == null) percent = parsePercentFromString(t);
    if (amount == null) amount = parseAmountFromString(t);
  }
  return { percent: percent ?? null, amount: amount ?? null };
}

function normalizeDate(dateStr) {
  if (!dateStr) return null;
  const raw = String(dateStr).trim();

  // Вырезаем лишние слова типа "до 31.08.2025" или "действует до 31.08.2025"
  const cleaned = raw
    .replace(/^до\s+/i, '')
    .replace(/^действует\s+до\s+/i, '')
    .replace(/^valid\s+until\s+/i, '')
    .trim();

  // Формат dd.mm.yyyy или dd.mm.yy, с опциональным временем HH:MM[:SS]
  const m = cleaned.match(
    /^(\d{1,2})\.(\d{1,2})\.(\d{2}|\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
  );
  if (m) {
    let [_, dd, mm, yyyy, HH, MM, SS] = m;
    // Приводим год к yyyy
    if (yyyy.length === 2) {
      const yy = parseInt(yyyy, 10);
      yyyy = String(yy >= 70 ? 1900 + yy : 2000 + yy);
    }
    // Устанавливаем время по умолчанию 23:59:59, если не задано
    const hh = HH !== undefined ? String(HH).padStart(2, '0') : '23';
    const min = MM !== undefined ? String(MM).padStart(2, '0') : '59';
    const ss = SS !== undefined ? String(SS).padStart(2, '0') : '59';

    return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}T${hh}:${min}:${ss}`;
  }

  // Если пришёл уже ISO-подобный формат yyyy-mm-dd или yyyy-mm-ddTHH:MM:SS - оставляем
  const isoLike = cleaned.match(/^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2})?)?$/);
  if (isoLike) {
    // Если только дата без времени — добавим 23:59:59
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
      return `${cleaned}T23:59:59`;
    }
    return cleaned;
  }

  // Иначе вернуть null, чтобы трактовать как бессрочный (активный)
  return null;
}

function determineCategoryFromText(categoryName, title, description) {
  const cat = (categoryName || '').toLowerCase();
  const text = [title, description].filter(Boolean).join(' ').toLowerCase();

  // Приоритет по category_name от Perfluence
  if (/кино|афиша|онлайн\s*кино|видео/.test(cat)) return 'развлечения';
  if (/одежд|обув|мода|fashion/.test(cat)) return 'товары';
  if (/супермаркет|гипермаркет|продукт|лавка|магазин/.test(cat)) return 'продукты';
  if (/еда|рестора|пицц|суши|доставк/.test(cat)) return 'еда';
  if (/банк|страх|медицин|здоров|каршеринг|такси|сервис|услуг/.test(cat)) return 'услуги';

  // Резервные эвристики по текстам
  if (/пицц|суши|ресторан|еда|доставк/.test(text)) return 'еда';
  if (/лавка|вкусвилл|ашан|продукт|продовольств/.test(text)) return 'продукты';
  if (/кино|афиша|подписк.*видео|музык|онлайн\s*кино/.test(text)) return 'развлечения';
  if (/одежд|обув|товар|покупк|market|магазин/.test(text)) return 'товары';
  if (/банк|страх|здоров|медицин|каршеринг|такси|сервис|услуг/.test(text)) return 'услуги';

  return 'другие';
}

// Преобразуем Perfluence: project -> groups[] -> promocodes[]
function flattenPerfluenceData(perfArray) {
  const result = [];
  let totalPromos = 0;
  let processedPromos = 0;
  
  console.log(`[PROMOCODES] Начинаем обработку ${perfArray.length} проектов`);
  
  for (const item of perfArray) {
    const project = item?.project || {};
    const groups = Array.isArray(item?.groups) ? item.groups : [];
    
    console.log(`[PROMOCODES] Проект "${project.name}" имеет ${groups.length} групп`);

    for (const group of groups) {
      const landing = group?.landing || {};
      const linksForSubs = Array.isArray(group?.links_for_subscribers) ? group.links_for_subscribers : [];
      const landingUrl = firstDefined(linksForSubs[0]?.link, landing.link, project.site);
      const advertiserTextRaw = firstDefined(landing.ord_custom_text, project.name);
      const advertiserText = normalizeAdvertiserText(advertiserTextRaw);
      const logo = firstDefined(landing.logo, project.logo, project.img);
      const promos = Array.isArray(group?.promocodes) ? group.promocodes : [];
      
      totalPromos += promos.length;
      console.log(`[PROMOCODES] Группа "${group.name || 'Без названия'}" имеет ${promos.length} промокодов`);

      for (const promo of promos) {
        const title = firstDefined(project.name, promo.name) || 'Промокод';
        const description = firstDefined(promo.comment, stripHtml(project.product_info)) || 'Описание недоступно';
        const code = firstDefined(promo.code);
        const when = normalizeDate(firstDefined(promo.date));
        
        // Пропускаем промокоды без кода и без даты
        if (!code && !when) {
          console.log(`[PROMOCODES] Пропускаем промокод "${title}" - нет кода и даты`);
          continue;
        }
        const { percent, amount } = extractDiscountFromTexts(promo.name, promo.comment, landing.name, project.name);
        const category = determineCategoryFromText(project.category_name, title, description);
        const imageUrl = firstDefined(promo.image, logo) || '/images/skidki-i-akcii.png';
        const isTop = Boolean(promo.is_hit || landing.is_hiting || (percent && percent >= 50) || (amount && amount >= 1000));

        // Проверяем на дубликаты по ID
        const promoId = promo.id || Math.random().toString(36).substr(2, 9);
        if (result.some(existing => existing.id === promoId)) {
          console.log(`[PROMOCODES] Пропускаем дубликат промокода с ID: ${promoId}`);
          continue;
        }
        
        result.push({
          id: promoId,
          title,
          description,
          promocode: code || null,
          discount_percent: percent,
          discount_amount: amount,
          valid_until: when,
          landing_url: landingUrl || null,
          image_url: imageUrl,
          conditions: firstDefined(promo.promo_terms, item.conditions, null),
          advertiser_info: advertiserText || null,
          category,
          is_top: isTop,
          created_at: new Date().toISOString()
        });
        processedPromos++;
      }
    }
  }
  
  console.log(`[PROMOCODES] Итого: найдено ${totalPromos} промокодов, обработано ${processedPromos}`);
  return result;
}

// Загрузка промокодов из API Perfluence
async function loadPromocodesFromAPI() {
  try {
    console.log('[PROMOCODES] Загружаю промокоды из API Perfluence...');
    const response = await fetch(`${PERFLUENCE_API_CONFIG.url}?key=${PERFLUENCE_API_CONFIG.key}`);
    if (!response.ok) {
      throw new Error(`HTTP ошибка! Статус: ${response.status}`);
    }
    const raw = await response.json();
    const perfArray = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
    console.log(`[PROMOCODES] Получено ${perfArray.length} проектов из API Perfluence`);

    // Переводим структуру Perfluence к плоскому списку промокодов
    const data = flattenPerfluenceData(perfArray);
    console.log(`[PROMOCODES] Получено ${Array.isArray(data) ? data.length : 'unknown'} промокодов после преобразования`);

    if (Array.isArray(data)) {
      promocodesCache = {
        data,
        lastUpdate: new Date(),
        isUpdating: false
      };
      console.log(`[PROMOCODES] Кэш обновлен: ${data.length} промокодов`);
      return true;
    } else {
      throw new Error('Неверный формат данных после преобразования');
    }
  } catch (error) {
    console.error('[PROMOCODES] Ошибка при загрузке промокодов:', error);
    promocodesCache.isUpdating = false;
    return false;
  }
}

// Фильтрация промокодов по параметрам
function filterPromocodes(filters = {}) {
  const beforeCount = promocodesCache.data.length;
  let filtered = [...promocodesCache.data];

  if (filters.search) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter(p =>
      (p.title && p.title.toLowerCase().includes(q)) ||
      (p.description && p.description.toLowerCase().includes(q))
    );
  }

  if (filters.category && filters.category !== 'all') {
    filtered = filtered.filter(p => p.category === filters.category);
  }

  if (filters.status) {
    const now = new Date();
    if (filters.status === 'active') {
      filtered = filtered.filter(p => {
        if (!p.valid_until) return true;
        const dt = new Date(p.valid_until);
        if (isNaN(dt.getTime())) return true;
        return dt > now;
      });
    } else if (filters.status === 'expired') {
      filtered = filtered.filter(p => {
        if (!p.valid_until) return false;
        const dt = new Date(p.valid_until);
        if (isNaN(dt.getTime())) return false;
        return dt <= now;
      });
    }
  }

  if (filters.sortBy === 'expiry') {
    filtered.sort((a, b) => {
      const aDate = new Date(a.valid_until || '9999-12-31T23:59:59');
      const bDate = new Date(b.valid_until || '9999-12-31T23:59:59');
      return filters.sortOrder === 'desc' ? bDate - aDate : aDate - bDate;
    });
  } else if (filters.sortBy === 'discount') {
    filtered.sort((a, b) => {
      const aVal = a.discount_percent || a.discount_amount || 0;
      const bVal = b.discount_percent || b.discount_amount || 0;
      return filters.sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });
  }

  console.log(`[PROMOCODES] Фильтрация: было ${beforeCount}, после ${filtered.length}`, filters);
  return filtered;
}

function getPromocodesStats() {
  const now = new Date();
  const total = promocodesCache.data.length;
  const active = promocodesCache.data.filter(p => {
    // Бессрочный или некорректный срок — считаем активным
    if (!p.valid_until) return true;
    const dt = new Date(p.valid_until);
    if (isNaN(dt.getTime())) return true;
    return dt > now;
  }).length;

  return { total, active, lastUpdate: promocodesCache.lastUpdate };
}

// Маршруты API
router.get('/', promocodesLimiter, async (req, res) => {
  try {
    const shouldUpdate = !promocodesCache.lastUpdate || (Date.now() - promocodesCache.lastUpdate.getTime()) > PERFLUENCE_API_CONFIG.updateInterval;
    if (shouldUpdate && !promocodesCache.isUpdating) {
      promocodesCache.isUpdating = true;
      loadPromocodesFromAPI().catch(console.error);
    }

    const filters = {
      search: req.query.search,
      category: req.query.category,
      status: req.query.status,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder
    };

    const filtered = filterPromocodes(filters);
    res.set('Cache-Control', 'no-store');
    res.json({ status: 'success', data: filtered, stats: getPromocodesStats(), filters });
  } catch (error) {
    console.error('[PROMOCODES] Ошибка при получении промокодов:', error);
    res.set('Cache-Control', 'no-store');
    res.status(500).json({ status: 'error', message: 'Ошибка при получении промокодов' });
  }
});

router.get('/stats', promocodesLimiter, (req, res) => {
  try {
    res.set('Cache-Control', 'no-store');
    res.json({ status: 'success', data: getPromocodesStats() });
  } catch (error) {
    console.error('[PROMOCODES] Ошибка при получении статистики:', error);
    res.set('Cache-Control', 'no-store');
    res.status(500).json({ status: 'error', message: 'Ошибка при получении статистики' });
  }
});

router.get('/version', (req, res) => {
  const version = process.env.PROMOS_VERSION || (promocodesCache.lastUpdate ? promocodesCache.lastUpdate.toISOString() : null);
  res.set('Cache-Control', 'no-store');
  res.json({ status: 'success', version, lastUpdate: promocodesCache.lastUpdate });
});

router.post('/refresh', promocodesLimiter, async (req, res) => {
  try {
    if (promocodesCache.isUpdating) {
      res.set('Cache-Control', 'no-store');
      return res.json({ status: 'info', message: 'Обновление уже выполняется' });
    }
    const success = await loadPromocodesFromAPI();
    res.set('Cache-Control', 'no-store');
    if (success) {
      res.json({ status: 'success', message: 'Промокоды успешно обновлены', stats: getPromocodesStats() });
    } else {
      res.status(500).json({ status: 'error', message: 'Ошибка при обновлении промокодов' });
    }
  } catch (error) {
    console.error('[PROMOCODES] Ошибка при принудительном обновлении:', error);
    res.set('Cache-Control', 'no-store');
    res.status(500).json({ status: 'error', message: 'Ошибка при обновлении промокодов' });
  }
});

router.get('/categories', promocodesLimiter, (req, res) => {
  try {
    const categories = [...new Set(promocodesCache.data.map(p => p.category))];
    res.set('Cache-Control', 'no-store');
    res.json({ status: 'success', data: categories });
  } catch (error) {
    console.error('[PROMOCODES] Ошибка при получении категорий:', error);
    res.set('Cache-Control', 'no-store');
    res.status(500).json({ status: 'error', message: 'Ошибка при получении категорий' });
  }
});

// Вспомогательный отладочный маршрут: возвращает «сырое» количество и первые 5 элементов
router.get('/_debug', (req, res) => {
  const stats = getPromocodesStats();
  res.set('Cache-Control', 'no-store');
  res.json({
    status: 'success',
    message: 'Отладочная информация',
    stats,
    count: promocodesCache.data.length,
    sample: promocodesCache.data.slice(0, 5)
  });
});

// Инициализация при загрузке модуля
(async () => {
  console.log('[PROMOCODES] Инициализация модуля промокодов...');
  await loadPromocodesFromAPI();
  setInterval(async () => {
    if (!promocodesCache.isUpdating) {
      await loadPromocodesFromAPI();
    }
  }, PERFLUENCE_API_CONFIG.updateInterval);
  console.log('[PROMOCODES] Модуль промокодов инициализирован');
})();

export default router;