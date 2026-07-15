export const PERFLUENCE_API_CONFIG = {
  url: 'https://dash.perfluence.net/blogger/promocode-api/json',
  key: process.env.PERFLUENCE_API_KEY || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpZCI6ODk4OTg3LCJhdXRoX2tleSI6Iml1Tl9fVk5WdTdOY0RqT1RKZW1EbUpUV1JjeUxqNFp4IiwiZGF0YSI6W119.k8vSFrvEtc75g7Gu-YdIcvhu6nB60V2CTOjti0IPfhQ',
  updateInterval: 24 * 60 * 60 * 1000,
  cacheKey: 'perfluence_promocodes_cache'
};

const TOP_BRANDS_PATTERNS = [
  /(?:Яндекс\s+)Афиша|(?:Yandex\s+)Afisha/i,
  /(?:Яндекс\s+)Путешествия|(?:Yandex\s+)Travel|travelyandex|yandex\.travel/i,
  /(?:Авито\s+)Путешествия|(?:Avito\s+)Travel|(?:Avito\s+)Puteshestviya/i,
  /Яндекс\s*Лавка|Yandex\s*Lavka/i,
  /Тануки|Tanuki/i,
  /Яндекс\s*Плюс|Yandex\s*Plus/i,
  /Сбер\s*Прайм|СберПрайм|Sber\s*Prime|SberPrime|Сберпрайм/i,
  /befree|be\s*free/i,
  /Netprint|Нетпринт/i,
  /Premier|Премьер/i,
  /Яндекс\s*Музык|Yandex\s*Music|Yandex\s*Muzyka/i,
  /Кинопоиск|Kinopoisk/i,
  /ВинЛаб|Винлаб|Wine\s*Lab|Winelab/i,
  /Ашан|Ashan/i
];

const YANDEX_TRAVEL_SORT_INDEX = 1;

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

function firstDefined(...values) {
  for (const v of values) {
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

function stripHtml(html) {
  let s = String(html || '');
  let prev;
  do {
    prev = s;
    s = s.replace(/<[^>]*>/g, '');
  } while (s !== prev);
  // На случай entity-обхода вида &lt;script&gt;
  s = s
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/gi, "'")
    .replace(/&amp;/gi, '&');
  do {
    prev = s;
    s = s.replace(/<[^>]*>/g, '');
  } while (s !== prev);
  return s.trim();
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
    let [, dd, mm, yyyy, HH, MM, SS] = m;
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

  if (/okko|elementaree|yandex\s*music\s*$|яндекс\s*музык\s*$|yandex\s*plus\s*$|яндекс\s*плюс\s*$|лэтуаль|letual|альфа-карта|alfa-karta|газпромбанк|gazprombank|мир\s*дебетовая/i.test(text) && !/kz|uz|казахстан|узбекистан|georgia|грузия/i.test(text)) return 'Россия';
  if (/₸|kz|казахстан|kazakhstan|яндекс.*казахстан|yandex.*kazakhstan|еда.*казахстан|go.*казахстан|плюс.*kz|музык.*kz|choco.*рядом/i.test(text) && !/okko|elementaree|лэтуаль|letual|альфа-карта|alfa-karta|газпромбанк|gazprombank|мир\s*дебетовая/i.test(text)) return 'Казахстан';
  if (/uz|узбекистан|uzbekistan|яндекс.*узбекистан|yandex.*uzbekistan|еда.*узбекистан|go.*узбекистан|плюс.*uz/i.test(text) && !/okko|elementaree|лэтуаль|letual|альфа-карта|alfa-karta|газпромбанк|gazprombank|мир\s*дебетовая/i.test(text)) return 'Узбекистан';
  if (/georgia|грузия|ge|georgia cpa/i.test(text) && !/okko|elementaree|лэтуаль|letual|альфа-карта|alfa-karta|газпромбанк|gazprombank|мир\s*дебетовая/i.test(text)) return 'Грузия';
  if (/russia|россия|ru|sber|avito|kinopoisk/i.test(text)) return 'Россия';

  const landingUrl = texts.find(t => t && t.startsWith('http'));
  if (landingUrl) {
    try {
      const url = new URL(landingUrl);
      const tld = url.hostname.split('.').pop().toLowerCase();
      const tldToCountry = {
        ru: 'Россия',
        kz: 'Казахстан',
        uz: 'Узбекистан',
        ge: 'Грузия'
      };
      return tldToCountry[tld] || 'Россия';
    } catch (_) {}
  }
  return 'Россия';
}

export function flattenPerfluenceData(perfArray) {
  const result = [];

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
      const { percent: offerPercent, amount: offerAmount } = extractDiscountFromTexts(landing.name, project.name, project.product_info, offerTitle);

      let bonusDescription = null;
      const offerBonusCandidate = firstDefined(landing.name, stripHtml(project.product_info), project.name);
      if (offerBonusCandidate && String(offerBonusCandidate).trim().length > 10) {
        bonusDescription = String(offerBonusCandidate).trim();
      }

      const offerCategory = determineCategoryFromText(project.category_name, offerTitle, groupDescription);
      const offerImageUrl = firstDefined(logo) || '/frontend/images/skidki-i-akcii.png';
      const offerIsTop = Boolean(isWhitelistedTopAny(offerTitle, project.name, landing.name, advertiserText));
      const offerCountry = determineCountryFromText(advertiserText, landingUrl, offerTitle, groupDescription, project.category_name, project.name, landing.name, project.product_info);

      for (const promo of promos) {
        const title = firstDefined(project.name, landing.name, promo.name) || 'Промокод';
        const description = firstDefined(stripHtml(promo.comment), stripHtml(project.product_info)) || 'Описание недоступно';
        const code = firstDefined(promo.code);
        const when = normalizeDate(firstDefined(promo.date));

        if (!code && !when) {
          continue;
        }

        const { percent, amount } = extractDiscountFromTexts(promo.name, promo.comment, landing.name, project.name, project.product_info, title);

        let promoBonusDescription = null;
        const promoBonusCandidate = firstDefined(stripHtml(promo.comment), stripHtml(promo.name), landing.name, stripHtml(project.product_info), project.name);
        if (promoBonusCandidate && String(promoBonusCandidate).trim().length > 10) {
          promoBonusDescription = String(promoBonusCandidate).trim();
        }

        const category = determineCategoryFromText(project.category_name, title, description);
        const imageUrl = firstDefined(promo.image, logo) || '/frontend/images/skidki-i-akcii.png';
        const country = determineCountryFromText(advertiserText, landingUrl, title, description, promo.name, promo.comment, project.category_name, project.name, landing.name, project.product_info);
        const isTop = Boolean(isWhitelistedTopAny(title, project.name, landing.name, advertiserText));
        const promoId = promo.id || Math.random().toString(36).substr(2, 9);

        if (result.some(existing => existing.id === promoId)) {
          continue;
        }

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
          groupDescription
        });
      }

      if (promos.length === 0 && landingUrl) {
        const offerIdBase = firstDefined(landing.id, project.id);
        const offerSuffix = (group && (group.name || 'group')) || 'group';
        const offerId = offerIdBase ? `offer-${offerIdBase}-${offerSuffix}` : `offer-${Math.random().toString(36).substr(2, 9)}`;
        if (!result.some(existing => existing.id === offerId)) {
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
            groupDescription
          });
        }
      }
    }
  }

  return result;
}

export async function fetchPerfluenceRaw() {
  const response = await fetch(`${PERFLUENCE_API_CONFIG.url}?key=${PERFLUENCE_API_CONFIG.key}`);
  if (!response.ok) {
    throw new Error(`HTTP ошибка! Статус: ${response.status}`);
  }
  const raw = await response.json();
  return Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
}

export function computePromocodesStats(data, lastUpdate = new Date()) {
  const now = new Date();
  const total = data.length;
  const active = data.filter(p => {
    if (!p.valid_until) return true;
    const dt = new Date(p.valid_until);
    if (isNaN(dt.getTime())) return true;
    return dt > now;
  }).length;

  const totalPromocodes = data.filter(p => Boolean(p.promocode)).length;
  const activePromocodes = data.filter(p => {
    if (!p.promocode) return false;
    if (!p.valid_until) return true;
    const dt = new Date(p.valid_until);
    if (isNaN(dt.getTime())) return true;
    return dt > now;
  }).length;

  const countries = [...new Set(data.map(p => p.country))];
  const lastUpdateDate = lastUpdate instanceof Date ? lastUpdate : new Date(lastUpdate);

  return {
    total,
    active,
    totalPromocodes,
    activePromocodes,
    lastUpdate: lastUpdateDate.toISOString(),
    lastUpdateFormatted: lastUpdateDate.toLocaleString('ru-RU'),
    countries
  };
}

export function isYandexTravelPromo(promo) {
  const combined = [
    promo?.title,
    promo?.description,
    promo?.advertiser_info,
    promo?.category,
    promo?.landing_url
  ].filter(Boolean).join(' ');
  return /(Яндекс\s*Путешеств|Yandex\s*Travel|travelyandex|yandex\.travel)/i.test(combined);
}

export function getPromoSortGroupIndex(promo) {
  for (let i = 0; i < TOP_BRANDS_PATTERNS.length; i++) {
    if (i === YANDEX_TRAVEL_SORT_INDEX) {
      if (isYandexTravelPromo(promo)) return i;
      continue;
    }
    if (TOP_BRANDS_PATTERNS[i].test(promo?.title || '')) return i;
  }
  return TOP_BRANDS_PATTERNS.length;
}

function comparePromosForDisplay(a, b) {
  const groupA = a.sort_group ?? getPromoSortGroupIndex(a);
  const groupB = b.sort_group ?? getPromoSortGroupIndex(b);
  if (groupA !== groupB) return groupA - groupB;

  const dateA = new Date(a.valid_until || '9999-12-31T23:59:59');
  const dateB = new Date(b.valid_until || '9999-12-31T23:59:59');
  return dateA - dateB;
}

export function sortPromosForDisplay(data) {
  return [...data]
    .map((promo) => ({
      ...promo,
      sort_group: getPromoSortGroupIndex(promo)
    }))
    .sort(comparePromosForDisplay);
}

export function getCategoriesFromData(data) {
  return [...new Set(data.map(p => p.category).filter(Boolean))].sort();
}

export function getPromoDisplayTitle(promo) {
  if (promo?.title?.trim()) return stripHtml(promo.title);
  if (promo?.name?.trim()) return stripHtml(promo.name);
  try {
    const url = promo?.landing_url;
    if (url) {
      const u = new URL(url);
      return u.hostname.replace(/^www\./, '');
    }
  } catch (_) {}
  return 'Предложение партнёра';
}

export function formatPromoDateRu(dateInput) {
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function getPromoExpiryDate(promo) {
  const dateStr = promo.valid_until || promo.expiry_date;
  if (!dateStr) return new Date('9999-12-31');
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(`${dateStr}T23:59:59`);
  }
  return new Date(dateStr);
}

export function buildOfferSchema(promo, siteBaseUrl = 'https://serpmonn.ru') {
  const expiry = promo.valid_until || promo.expiry_date;
  const isExpired = expiry && new Date(expiry) < new Date();
  return {
    '@type': 'Offer',
    name: getPromoDisplayTitle(promo),
    description: promo.description || promo.groupDescription || 'Описание будет доступно позже',
    url: promo.landing_url || '',
    category: promo.category || 'другие',
    priceCurrency: promo.discount_amount ? 'RUB' : undefined,
    discount: promo.discount_percent ? `${promo.discount_percent}%` : promo.discount_amount ? `${promo.discount_amount} RUB` : undefined,
    validThrough: expiry || undefined,
    offeredBy: {
      '@type': 'Organization',
      name: promo.advertiser_info || 'Партнёр'
    },
    image: promo.image_url || `${siteBaseUrl}/frontend/images/skidki-i-akcii.png`,
    availability: isExpired ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
    couponCode: promo.promocode || undefined,
    areaServed: promo.country || 'Россия'
  };
}

export async function preparePromocodesBuildData(options = {}) {
  const perfArray = await fetchPerfluenceRaw();
  const lastUpdate = new Date();
  const data = flattenPerfluenceData(perfArray);
  const sorted = sortPromosForDisplay(data);
  const stats = computePromocodesStats(sorted, lastUpdate);
  const categories = getCategoriesFromData(sorted);

  return {
    stats,
    categories,
    cards: sorted,
    schemaOffers: sorted.map(p => buildOfferSchema(p)),
    data: sorted,
    version: lastUpdate.toISOString(),
    lastUpdateIso: lastUpdate.toISOString()
  };
}
