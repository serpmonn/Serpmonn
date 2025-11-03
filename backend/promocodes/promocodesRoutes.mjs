import express from 'express';
import rateLimit from 'express-rate-limit';
import { createHash } from 'crypto';

const router = express.Router();

// Конфигурация API Perfluence
const PERFLUENCE_API_CONFIG = {
  url: 'https://dash.perfluence.net/blogger/promocode-api/json',
  key: process.env.PERFLUENCE_API_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6ODk4OTg3LCJhdXRoX2tleSI6Iml1Tl9fVk5WdTdOY0RqT1RKZW1EbUpUV1JjeUxqNFp4IiwiZGF0YSI6W119.k8vSFrvEtc75g7Gu-YdIcvhu6nB60V2CTOjti0IPfhQ',
  updateInterval: 24 * 60 * 60 * 1000,
  cacheKey: 'perfluence_promocodes_cache'
};

// Кэш для промокодов
let promocodesCache = {
  data: [],
  lastUpdate: null,
  isUpdating: false
};

// Белый список брендов
const TOP_BRANDS_PATTERNS = [
  /Яндекс\s*Лавка|Yandex\s*Lavka/i,
  /(?:Яндекс\s*)?Афиша|(?:Yandex\s*)?Afisha/i,
  /Сбер\s*Прайм|СберПрайм|Sber\s*Prime|SberPrime/i,
  /Тануки|Tanuki/i,  // ← убрал \b
  /Яндекс\s*Плюс|Yandex\s*Plus/i,
  /befree|be\s*free/i,  // ← убрал \b
  /Монетка|Monetka/i,  // ← убрал МОНЕТКА
  /Premier|Премьер/i,  // ← убрал \b
  /Авито\s*Доставка|Avito\s*Delivery|Avito\s*Dostavka/i,
  /Яндекс\s*Музык|Yandex\s*Music|Yandex\s*Muzyka/i,
  /Кинопоиск|Kinopoisk/i,
  /ВинЛаб|Винлаб|Wine\s*Lab|Winelab/i,
  /Яндекс\s*Еда|Yandex\s*Eda|Yandex\s*Food/i,  // ← упростил
];

function isWhitelistedTopByText(text) {
  if (!text) return false;
  return TOP_BRANDS_PATTERNS.some((re) => re.test(String(text)));
}

function isWhitelistedTopAny(...texts) {
  for (const t of texts) {
    if (isWhitelistedTopByText(t)) return true;
  }
  return false;
}

// Лимитер для API запросов
const promocodesLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { status: 'error', message: 'Слишком много запросов, попробуйте позже' }
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
  const withoutAd = raw.replace(/^\s*Реклама\.?\s*/i, '');
  return withoutAd.replace(/\s{2,}/g, ' ').trim();
}

function parsePercentFromString(value) {
  if (typeof value !== 'string') return null;
  const match = value.replace(',', '.').match(/(\d{1,3})\s*%|\bскидка\s*(\d{1,3})\s*%/i);
  return match ? Number(match[1] || match[2]) : null;
}

function parseAmountFromString(value) {
  if (typeof value !== 'string') return null;
  const match = value.replace(/\s/g, '').match(/(\d{2,})(?:₽|rub|руб|рублей|р\.)/i) ||
                value.match(/бонус\s*(\d{2,})\s*(?:₽|руб|рублей|р\.)?/i) ||
                value.match(/сертификат\s*(?:на\s*)?(\d{2,})\s*(?:₽|руб|рублей|р\.)?/i) ||
                value.match(/(\d{2,})\s*(?:сертификат|ваучер|подарок)\s*(?:₽|руб|рублей|р\.)?/i) ||
                value.match(/(\d{2,})\s*р\s*(?:сертификат|ваучер|подарок)?/i);
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

  const cleaned = raw
    .replace(/^до\s+/i, '')
    .replace(/^действует\s+до\s+/i, '')
    .replace(/^valid\s+until\s+/i, '')
    .trim();

  const m = cleaned.match(/^([0-9]{1,2})\.([0-9]{1,2})\.([0-9]{2}|[0-9]{4})(?:\s+([0-9]{1,2}):([0-9]{2})(?::([0-9]{2}))?)?$/);
  if (m) {
    let [_, dd, mm, yyyy, HH, MM, SS] = m;
    if (yyyy.length === 2) {
      const yy = parseInt(yyyy, 10);
      yyyy = String(yy >= 70 ? 1900 + yy : 2000 + yy);
    }
    const hh = HH !== undefined ? String(HH).padStart(2, '0') : '23';
    const min = MM !== undefined ? String(MM).padStart(2, '0') : '59';
    const ss = SS !== undefined ? String(SS).padStart(2, '0') : '59';
    return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}T${hh}:${min}:${ss}`;
  }

  const isoLike = cleaned.match(/^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2})?)?$/);
  if (isoLike) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) {
      return `${cleaned}T23:59:59`;
    }
    return cleaned;
  }

  return null;
}

function determineCategoryFromText(categoryName, title, description) {
  const cat = (categoryName || '').toLowerCase();
  const text = [title, description].filter(Boolean).join(' ').toLowerCase();

  if (/кино|афиша|онлайн\s*кино|видео/.test(cat)) return 'развлечения';
  if (/одежд|обув|мода|fashion/.test(cat)) return 'товары';
  if (/супермаркет|гипермаркет|продукт|лавка|магазин/.test(cat)) return 'продукты';
  if (/еда|рестора|пицц|суши|доставк/.test(cat)) return 'еда';
  if (/банк|страх|медицин|здоров|каршеринг|такси|сервис|услуг/.test(cat)) return 'услуги';
  if (/сбер\s*карта|детская\s*сбер\s*карта/i.test(cat)) return 'услуги';

  if (/пицц|суши|ресторан|еда|доставк/.test(text)) return 'еда';
  if (/лавка|вкусвилл|ашан|продукт|продовольств/.test(text)) return 'продукты';
  if (/кино|афиша|подписк.*видео|музык|онлайн\s*кино/.test(text)) return 'развлечения';
  if (/одежд|обув|товар|покупк|market|магазин/.test(text)) return 'товары';
  if (/банк|страх|здоров|медицин|каршеринг|такси|сервис|услуг|сбер\s*карта|детская\s*сбер\s*карта/.test(text)) return 'услуги';

  return 'другие';
}

function determineCountryFromText(...texts) {
  const text = texts.filter(Boolean).join(' ').toLowerCase();
  
  // Явное определение России для российских брендов без KZ/UZ/казахстан/узбекистан
  if (/okko|elementaree|yandex\s*music\s*$|яндекс\s*музык\s*$|yandex\s*plus\s*$|яндекс\s*плюс\s*$|лэтуаль|letual|альфа-карта|alfa-karta|газпромбанк|gazprombank|мир\s*дебетовая/i.test(text) && !/kz|uz|казахстан|узбекистан|georgia|грузия/i.test(text)) return 'Россия';
  // Явное определение Казахстана по валюте ₸, KZ или упоминаниям в названиях, исключая российские бренды
  if (/\₸|kz|казахстан|kazakhstan|яндекс.*казахстан|yandex.*kazakhstan|еда.*казахстан|go.*казахстан|плюс.*kz|музык.*kz|choco.*рядом/i.test(text) && !/okko|elementaree|лэтуаль|letual|альфа-карта|alfa-karta|газпромбанк|gazprombank|мир\s*дебетовая/i.test(text)) return 'Казахстан';
  // Явное определение Узбекистана по UZ или упоминаниям в названиях, исключая российские бренды
  if (/uz|узбекистан|uzbekistan|яндекс.*узбекистан|yandex.*uzbekistan|еда.*узбекистан|go.*узбекистан|плюс.*uz/i.test(text) && !/okko|elementaree|лэтуаль|letual|альфа-карта|alfa-karta|газпромбанк|gazprombank|мир\s*дебетовая/i.test(text)) return 'Узбекистан';
  // Явное определение Грузии, исключая российские бренды
  if (/georgia|грузия|ge|georgia cpa/i.test(text) && !/okko|elementaree|лэтуаль|letual|альфа-карта|alfa-karta|газпромбанк|gazprombank|мир\s*дебетовая/i.test(text)) return 'Грузия';
  // Остальные случаи по ключевым словам для России
  if (/russia|россия|ru|sber|avito|kinopoisk/i.test(text)) return 'Россия';

  // Проверка по TLD из URL
  const landingUrl = texts.find(t => t && t.startsWith('http'));
  if (landingUrl) {
    try {
      const url = new URL(landingUrl);
      const tld = url.hostname.split('.').pop().toLowerCase();
      const tldToCountry = {
        'ru': 'Россия',
        'kz': 'Казахстан',
        'uz': 'Узбекистан',
        'ge': 'Грузия'
      };
      return tldToCountry[tld] || 'Россия';
    } catch (_) {}
  }
  return 'Россия';
}

function flattenPerfluenceData(perfArray) {
  const result = [];
  let totalPromos = 0;
  let processedPromos = 0;

  for (const item of perfArray) {
    const project = item?.project || {};
    const groups = Array.isArray(item?.groups) ? item.groups : [];

    for (const group of groups) {
      const landing = group?.landing || {};
      const linksForSubs = Array.isArray(group?.links_for_subscribers) ? group.links_for_subscribers : [];
      const landingUrl = firstDefined(linksForSubs[0]?.link, landing.link, project.site);

      const advertiserTextRaw = firstDefined(landing.ord_custom_text, project.name);
      const advertiserText = normalizeAdvertiserText(advertiserTextRaw);
      const logo = firstDefined(landing.logo, project.logo, project.img);
      const promos = Array.isArray(group?.promocodes) ? group.promocodes : [];

      const offerTitle = firstDefined(project.name, landing.name) || 'Предложение партнёра';
      const groupDescription = stripHtml(project.product_info) || 'Описание недоступно';
      let { percent: offerPercent, amount: offerAmount } = extractDiscountFromTexts(landing.name, project.name, project.product_info, offerTitle);
      
      let bonusDescription = null;
      const keywords = /скидка|подарок|бонус|сертификат/i;
      const candidate = firstDefined(landing.name, project.name, stripHtml(project.product_info));
      if (candidate && keywords.test(candidate)) {
        bonusDescription = candidate;
      }

      const offerCategory = determineCategoryFromText(project.category_name, offerTitle, groupDescription);
      const offerImageUrl = firstDefined(logo) || '/frontend/images/skidki-i-akcii.png';
      const offerIsTop = Boolean(isWhitelistedTopAny(offerTitle, project.name, landing.name, advertiserText));
      const offerCountry = determineCountryFromText(advertiserText, landingUrl, offerTitle, groupDescription, project.category_name, project.name, landing.name, project.product_info);

      totalPromos += promos.length;

      for (const promo of promos) {
        const title = firstDefined(project.name, promo.name) || 'Промокод';
        const description = firstDefined(promo.comment, stripHtml(project.product_info)) || 'Описание недоступно';

        const code = firstDefined(promo.code);
        const when = normalizeDate(firstDefined(promo.date));

        if (!code && !when) {
          continue;
        }
        const { percent, amount } = extractDiscountFromTexts(promo.name, promo.comment, landing.name, project.name, project.product_info, title);
        
        let promoBonusDescription = null;
        const promoCandidate = firstDefined(promo.name, promo.comment, landing.name, project.name);
        if (promoCandidate && keywords.test(promoCandidate)) {
          promoBonusDescription = promoCandidate;
        }

        const category = determineCategoryFromText(project.category_name, title, description);
        const imageUrl = firstDefined(promo.image, logo) || '/frontend/images/skidki-i-akcii.png';
        const country = determineCountryFromText(advertiserText, landingUrl, title, description, promo.name, promo.comment, project.category_name, project.name, landing.name, project.product_info);

        const isTop = Boolean(isWhitelistedTopAny(title, project.name, landing.name, advertiserText));

        const promoId = promo.id || Math.random().toString(36).substr(2, 9);
        if (result.some(existing => existing.id === promoId)) {
          continue;
        }

        // Очистка HTML из поля conditions
        const conditions = firstDefined(promo.promo_terms, item.conditions, null);
        const cleanedConditions = conditions ? stripHtml(conditions) : null;

        result.push({
          id: promoId,
          title,
          description,
          promocode: code || null,
          discount_percent: percent,
          discount_amount: amount,
          bonus_description: promoBonusDescription,
          valid_until: when,
          landing_url: landingUrl || null,
          image_url: imageUrl,
          conditions: cleanedConditions,
          advertiser_info: advertiserText || null,
          category,
          country,
          is_top: isTop,
          created_at: new Date().toISOString(),
          groupDescription: groupDescription
        });
        processedPromos++;
      }

      if (promos.length === 0 && landingUrl) {
        const offerIdBase = firstDefined(landing.id, project.id);
        const offerSuffix = (group && (group.name || 'group')) || 'group';
        const offerId = offerIdBase ? `offer-${offerIdBase}-${offerSuffix}` : `offer-${Math.random().toString(36).substr(2, 9)}`;
        if (!result.some(existing => existing.id === offerId)) {
          // Очистка HTML из поля conditions для офферов без промокодов
          const conditions = firstDefined(item.conditions, null);
          const cleanedConditions = conditions ? stripHtml(conditions) : null;

          result.push({
            id: offerId,
            title: offerTitle,
            description: groupDescription,
            promocode: null,
            discount_percent: offerPercent,
            discount_amount: offerAmount,
            bonus_description: bonusDescription,
            valid_until: null,
            landing_url: landingUrl,
            image_url: offerImageUrl,
            conditions: cleanedConditions,
            advertiser_info: advertiserText || null,
            category: offerCategory,
            country: offerCountry,
            is_top: offerIsTop,
            created_at: new Date().toISOString(),
            groupDescription: groupDescription
          });
        }
      }
    }
  }

  return result;
}

async function loadPromocodesFromAPI() {
  try {
    const response = await fetch(`${PERFLUENCE_API_CONFIG.url}?key=${PERFLUENCE_API_CONFIG.key}`, { timeout: 10000 });
    if (!response.ok) {
      throw new Error(`HTTP ошибка! Статус: ${response.status}`);
    }
    const raw = await response.json();
    const perfArray = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);

    const data = flattenPerfluenceData(perfArray);

    if (Array.isArray(data)) {
      promocodesCache = {
        data,
        lastUpdate: new Date(),
        isUpdating: false
      };
      console.log(`[PROMOCODES] Промокодов получено: ${data.length}`);
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
  const active = promocodesCache.data.filter(p => {
    if (!p.valid_until) return true;
    const dt = new Date(p.valid_until);
    if (isNaN(dt.getTime())) return true;
    return dt > now;
  }).length;

  const totalPromocodes = promocodesCache.data.filter(p => Boolean(p.promocode)).length;
  const activePromocodes = promocodesCache.data.filter(p => {
    if (!p.promocode) return false;
    if (!p.valid_until) return true;
    const dt = new Date(p.valid_until);
    if (isNaN(dt.getTime())) return true;
    return dt > now;
  }).length;

  const countries = [...new Set(promocodesCache.data.map(p => p.country))];

  return { total, active, totalPromocodes, activePromocodes, lastUpdate: promocodesCache.lastUpdate, countries };
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

export default router;
