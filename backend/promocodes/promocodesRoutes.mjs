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
  // dd.mm.yyyy -> yyyy-mm-dd
  const m = String(dateStr).match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (m) return `${m[3]}-${m[2]}-${m[1]}`;
  return dateStr;
}

function determineCategoryFromText(...texts) {
  const joined = texts.filter(Boolean).join(' ').toLowerCase();
  if (/(еда|ресторан|доставка)/.test(joined)) return 'еда';
  if (/(продукт|лавка|магазин)/.test(joined)) return 'продукты';
  if (/(билет|афиша|кино|кинотеатр|онлайн кино)/.test(joined)) return 'развлечения';
  if (/(товар|покупка|магазин|одежда|обув)/.test(joined)) return 'товары';
  if (/(услуга|сервис|подписка|банк|здоровье)/.test(joined)) return 'услуги';
  return 'другие';
}

// Преобразуем Perfluence: project -> groups[] -> promocodes[]
function flattenPerfluenceData(perfArray) {
  const result = [];
  for (const item of perfArray) {
    const project = item?.project || {};
    const groups = Array.isArray(item?.groups) ? item.groups : [];

    for (const group of groups) {
      const landing = group?.landing || {};
      const linksForSubs = Array.isArray(group?.links_for_subscribers) ? group.links_for_subscribers : [];
      const landingUrl = firstDefined(linksForSubs[0]?.link, landing.link, project.site);
      const advertiserText = firstDefined(landing.ord_custom_text, project.name);
      const logo = firstDefined(landing.logo, project.logo, project.img);
      const promos = Array.isArray(group?.promocodes) ? group.promocodes : [];

      for (const promo of promos) {
        const title = firstDefined(promo.name, project.name) || 'Промокод';
        const description = firstDefined(promo.comment, stripHtml(project.product_info)) || 'Описание недоступно';
        const code = firstDefined(promo.code);
        const when = normalizeDate(firstDefined(promo.date));
        const { percent, amount } = extractDiscountFromTexts(promo.name, promo.comment, landing.name, project.name);
        const category = determineCategoryFromText(project.category_name, title, description);
        const imageUrl = firstDefined(promo.image, logo) || '/images/skidki-i-akcii.png';
        const isTop = Boolean(promo.is_hit || landing.is_hiting || (percent && percent >= 50) || (amount && amount >= 1000));

        result.push({
          id: promo.id || Math.random().toString(36).substr(2, 9),
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
      }
    }
  }
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
      filtered = filtered.filter(p => !p.valid_until || new Date(p.valid_until) > now);
    } else if (filters.status === 'expired') {
      filtered = filtered.filter(p => p.valid_until && new Date(p.valid_until) <= now);
    }
  }

  if (filters.sortBy === 'expiry') {
    filtered.sort((a, b) => {
      const aDate = new Date(a.valid_until || '9999-12-31');
      const bDate = new Date(b.valid_until || '9999-12-31');
      return filters.sortOrder === 'desc' ? bDate - aDate : aDate - bDate;
    });
  } else if (filters.sortBy === 'discount') {
    filtered.sort((a, b) => {
      const aVal = a.discount_percent || a.discount_amount || 0;
      const bVal = b.discount_percent || b.discount_amount || 0;
      return filters.sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });
  }

  return filtered;
}

function getPromocodesStats() {
  const now = new Date();
  const total = promocodesCache.data.length;
  const active = promocodesCache.data.filter(p => !p.valid_until || new Date(p.valid_until) > now).length;
  return { total, active, expired: total - active, lastUpdate: promocodesCache.lastUpdate };
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