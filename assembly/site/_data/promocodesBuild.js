const fs = require('fs');
const path = require('path');

const CACHE_PATH = path.join(__dirname, 'promocodesBuild.cache.json');
const EMPTY_BUILD = {
  stats: { total: 0, active: 0, lastUpdateFormatted: '-' },
  categories: [],
  cards: [],
  schemaOffers: [],
  data: [],
  version: null
};

function enrichCard(promo, mod) {
  const title = mod.getPromoDisplayTitle(promo);
  const expiryDate = mod.getPromoExpiryDate(promo);
  const now = new Date();
  const isSberCard = /Детская\s*Сбер\s*Карта|СберКарта\s*Детская/i.test(title);

  return {
    ...promo,
    displayTitle: title,
    displayTitleShort: title.length > 60 ? `${title.slice(0, 60)}...` : title,
    isSberCard,
    isTravel: mod.isYandexTravelPromo(promo),
    isExpired: expiryDate < now,
    detailsId: `details-${promo.id}`
  };
}

function hasPromoCode(promo) {
  return Boolean(String(promo?.promocode || '').trim());
}

function filterToPromoCodesOnly(built) {
  const originalCards = built.cards || [];
  const cards = originalCards.filter(hasPromoCode);
  const data = (built.data || []).filter(hasPromoCode);
  const schemaOffers = (built.schemaOffers || []).filter((_, i) => hasPromoCode(originalCards[i] || {}));
  const categories = [...new Set(cards.map(c => c.category).filter(Boolean))];
  const stats = {
    ...(built.stats || {}),
    total: cards.length,
    active: cards.length,
    totalPromocodes: cards.length,
    activePromocodes: cards.length
  };

  return {
    ...built,
    cards,
    data,
    schemaOffers,
    categories,
    stats
  };
}

module.exports = async function promocodesBuild() {
  try {
    const mod = await import(path.join(__dirname, '../../../backend/promocodes/normalizePromocodes.mjs'));
    const built = await mod.preparePromocodesBuildData();
    // Keep FULL cache (incl. no-code) for «Полезное»; page gets codes-only.
    const enrichedFull = {
      ...built,
      cards: built.cards.map(card => enrichCard(card, mod))
    };
    fs.writeFileSync(CACHE_PATH, JSON.stringify(enrichedFull));
    const forPage = filterToPromoCodesOnly(enrichedFull);
    console.log(`[PROMO SSR] cache=${enrichedFull.cards.length} all, page=${forPage.cards.length} with codes`);
    return forPage;
  } catch (error) {
    console.warn('[PROMO SSR] Build fetch failed:', error.message);
    if (fs.existsSync(CACHE_PATH)) {
      console.warn('[PROMO SSR] Using cached promocodesBuild.cache.json');
      const cached = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
      return filterToPromoCodesOnly(cached);
    }
    return EMPTY_BUILD;
  }
};
