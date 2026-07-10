import express from 'express';
import rateLimit from 'express-rate-limit';
import { createHash } from 'crypto';
import {
  PERFLUENCE_API_CONFIG,
  flattenPerfluenceData,
  fetchPerfluenceRaw,
  computePromocodesStats,
  sortPromosForDisplay
} from './normalizePromocodes.mjs';

const router = express.Router();

let promocodesCache = {
  data: [],
  lastUpdate: null,
  isUpdating: false
};

const promocodesLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { status: 'error', message: 'Слишком много запросов, попробуйте позже' }
});

async function loadPromocodesFromAPI() {
  try {
    const perfArray = await fetchPerfluenceRaw();
    const data = flattenPerfluenceData(perfArray);

    if (Array.isArray(data)) {
      promocodesCache = {
        data,
        lastUpdate: new Date(),
        isUpdating: false
      };
      console.log(`[PROMOCODES] Промокодов получено: ${data.length}`);
      return true;
    }

    throw new Error('Неверный формат данных после преобразования');
  } catch (error) {
    console.error('[PROMOCODES] Ошибка при загрузке промокодов:', error);
    promocodesCache.isUpdating = false;
    return false;
  }
}

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

  if (filters.country && filters.country !== 'all') {
    filtered = filtered.filter(p => p.country === filters.country);
  }

  if (filters.sortBy === 'expiry') {
    filtered.sort((a, b) => {
      const aDate = new Date(a.valid_until || '9999-12-31T23:59:59');
      const bDate = new Date(b.valid_until || '9999-12-31T23:59:59');
      return filters.sortOrder === 'desc' ? bDate - aDate : aDate - bDate;
    });
    return filtered;
  }

  if (filters.sortBy === 'discount') {
    filtered.sort((a, b) => {
      const aVal = a.discount_percent || a.discount_amount || 0;
      const bVal = b.discount_percent || b.discount_amount || 0;
      return filters.sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });
    return filtered;
  }

  return sortPromosForDisplay(filtered);
}

function getPromocodesStats() {
  return computePromocodesStats(promocodesCache.data, promocodesCache.lastUpdate || new Date());
}

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
      country: req.query.country,
      sortBy: req.query.sortBy,
      sortOrder: req.query.sortOrder
    };

    const filtered = filterPromocodes(filters);
    const etag = createHash('md5').update(JSON.stringify(filtered)).digest('hex');
    res.set('ETag', etag);
    if (req.get('If-None-Match') === etag) {
      return res.status(304).end();
    }
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ status: 'success', data: filtered, stats: getPromocodesStats(), filters });
  } catch (error) {
    console.error('[PROMOCODES] Ошибка при получении промокодов:', error);
    res.set('Cache-Control', 'no-store');
    res.status(500).json({ status: 'error', message: 'Ошибка при получении промокодов' });
  }
});

router.get('/by-code', promocodesLimiter, (req, res) => {
  try {
    const code = (req.query.code || '').trim();
    if (!code) {
      return res.status(400).json({ status: 'error', message: 'Параметр code обязателен' });
    }
    const promo = promocodesCache.data.find(
      p => p.promocode && p.promocode.toLowerCase() === code.toLowerCase()
    );
    if (!promo) {
      return res.status(404).json({ status: 'error', message: 'Промокод не найден' });
    }
    res.set('Cache-Control', 'public, max-age=300');
    res.json({ status: 'success', data: promo });
  } catch (error) {
    console.error('[PROMOCODES] Ошибка /by-code:', error);
    res.set('Cache-Control', 'no-store');
    res.status(500).json({ status: 'error', message: 'Ошибка сервера' });
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
    res.set('Cache-Control', 'public, max-age=3600');
    res.json({ status: 'success', data: categories });
  } catch (error) {
    console.error('[PROMOCODES] Ошибка при получении категорий:', error);
    res.set('Cache-Control', 'no-store');
    res.status(500).json({ status: 'error', message: 'Ошибка при получении категорий' });
  }
});

router.get('/countries', promocodesLimiter, (req, res) => {
  try {
    const countries = [...new Set(promocodesCache.data.map(p => p.country))];
    res.set('Cache-Control', 'public, max-age=3600');
    res.json({ status: 'success', data: countries });
  } catch (error) {
    console.error('[PROMOCODES] Ошибка при получении стран:', error);
    res.set('Cache-Control', 'no-store');
    res.status(500).json({ status: 'error', message: 'Ошибка при получении стран' });
  }
});

router.post('/api/track-filter', promocodesLimiter, async (req, res) => {
  try {
    const { filter, value } = req.body;
    if (!filter || !value) {
      return res.status(400).json({ status: 'error', message: 'Отсутствуют обязательные параметры filter или value' });
    }
    console.log(`[PROMOCODES] Трекинг фильтра: ${filter} = ${value}`);
    res.set('Cache-Control', 'no-store');
    res.json({ status: 'success', message: 'Фильтр успешно зарегистрирован' });
  } catch (error) {
    console.error('[PROMOCODES] Ошибка при трекинге фильтра:', error);
    res.set('Cache-Control', 'no-store');
    res.status(500).json({ status: 'error', message: 'Ошибка при трекинге фильтра' });
  }
});

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

export { filterPromocodes, loadPromocodesFromAPI };
export default router;
