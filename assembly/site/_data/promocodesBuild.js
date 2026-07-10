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

module.exports = async function promocodesBuild() {
  try {
    const mod = await import(path.join(__dirname, '../../../backend/promocodes/normalizePromocodes.mjs'));
    const built = await mod.preparePromocodesBuildData();
    const enriched = {
      ...built,
      cards: built.cards.map(card => enrichCard(card, mod))
    };
    fs.writeFileSync(CACHE_PATH, JSON.stringify(enriched));
    console.log(`[PROMO SSR] ${enriched.stats.total} promos, ${enriched.cards.length} SSR cards`);
    return enriched;
  } catch (error) {
    console.warn('[PROMO SSR] Build fetch failed:', error.message);
    if (fs.existsSync(CACHE_PATH)) {
      console.warn('[PROMO SSR] Using cached promocodesBuild.cache.json');
      return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
    }
    return EMPTY_BUILD;
  }
};
