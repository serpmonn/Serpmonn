import { getPageT } from '/frontend/scripts/i18n-loader.js';
import { applyMailAdAttrs, pushMailAdTag } from '/frontend/scripts/mail-ads-config.js';
import { ensureMailAdsScript } from '/frontend/scripts/mail-ads-loader.js';
import { runVkFallbackForIns } from '/frontend/scripts/ad-pool.js';

const API_CONFIG = {
    baseUrl: '/api/promocodes',
    updateInterval: 24 * 60 * 60 * 1000,
    lastUpdateKey: 'serpmonn_promocodes_last_update'
};

let debounceTimeout;
let allPromocodes = [];
let filteredPromocodes = [];
let updateTimer = null;
let isSortedByExpiry = false;
let sortAscending = true;
const PROMO_SORT_TITLE_PATTERNS = [
    /(?:Яндекс\s+)Афиша|(?:Yandex\s+)Afisha/i,
    null,
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

function isYandexTravelPromo(promo) {
    const combined = [
        promo?.title,
        promo?.description,
        promo?.advertiser_info,
        promo?.category,
        promo?.landing_url,
        promo?.link,
        promo?.url
    ].filter(Boolean).join(' ');
    return /(Яндекс\s*Путешеств|Yandex\s*Travel|travelyandex|yandex\.travel)/i.test(combined);
}

function getPromoSortGroup(promo) {
    if (typeof promo?.sort_group === 'number') {
        return promo.sort_group;
    }

    for (let i = 0; i < PROMO_SORT_TITLE_PATTERNS.length; i++) {
        if (i === YANDEX_TRAVEL_SORT_INDEX) {
            if (isYandexTravelPromo(promo)) return i;
            continue;
        }
        if (PROMO_SORT_TITLE_PATTERNS[i]?.test(promo?.title || '')) return i;
    }
    return PROMO_SORT_TITLE_PATTERNS.length;
}

const specialCopyProjects = [
    'Мегамаркет', 'Яндекс Лавка', 'Ашан', 'COZY HOME', 'Netprint',
    'Яндекс Еда', 'SYNERGETIC', 'ТВОЕ', 'DDX Fitness', 'Плати по миру',
    'Сберздоровье', 'Anywayanyday', 'Librederm', 'PetShop', 'GamersHub'
];

const COUNTRY_KEYS = ['Россия', 'Казахстан', 'Узбекистан', 'Грузия'];

let t;
let preferSSRUntilInteraction = false;
let ssrCardCount = 0;

function readPromoBootstrap() {
    const el = document.getElementById('promo-bootstrap');
    if (!el?.textContent) {
        return null;
    }
    try {
        return JSON.parse(el.textContent);
    } catch (_) {
        return null;
    }
}

function findPromoById(id) {
    return allPromocodes.find(promo => String(promo.id) === String(id));
}

async function loadCategoriesFromAPI() {
    try {
        const catResponse = await fetch(`${API_CONFIG.baseUrl}/categories`, { cache: 'no-store' });
        if (!catResponse.ok) {
            return;
        }
        const catResult = await catResponse.json();
        if (catResult.status === 'success' && Array.isArray(catResult.data)) {
            updateCategorySelect(catResult.data);
        }
    } catch (_) {}
}

function getPromoPagePath() {
    const locale = (document.documentElement.lang || 'ru').trim();
    if (locale === 'ru') {
        return '/frontend/promo-codes-and-discounts/promokody-skidki.html';
    }
    return `/frontend/${locale}/promo-codes-and-discounts/promokody-skidki.html`;
}

function buildPromoShareUrl(code) {
    return `${window.location.origin}${getPromoPagePath()}?code=${encodeURIComponent(code)}`;
}

function getDateLocale() {
    const lang = (document.documentElement.lang || 'en').trim();
    if (lang === 'zh-cn') return 'zh-CN';
    if (lang === 'pt-br') return 'pt-BR';
    if (lang === 'pt-pt') return 'pt-PT';
    if (lang === 'ku-arab') return 'ku-Arab';
    return lang;
}

function getCategoryLabel(category) {
    const key = `promo.cat.${category}`;
    const label = t(key);
    return label === key ? category.charAt(0).toUpperCase() + category.slice(1) : label;
}

function getCountryLabel(country) {
    const key = `promo.country.${country}`;
    const label = t(key);
    return label === key ? country : label;
}

function updateSortButtonUI() {
    const buttons = [elements.sortButton, elements.sortButtonMobile].filter(Boolean);
    if (!buttons.length) return;

    const label = isSortedByExpiry
        ? t('promo.sortActive', { arrow: sortAscending ? '↑' : '↓' })
        : t('promo.sortByExpiry');
    const ariaLabel = isSortedByExpiry
        ? t('promo.sortAriaWithOrder', { order: sortAscending ? t('promo.sortAsc') : t('promo.sortDesc') })
        : t('promo.sortAria');

    buttons.forEach((button) => {
        button.textContent = label;
        button.setAttribute('aria-label', ariaLabel);
    });
}

const elements = {
    searchInput: document.getElementById('searchInput'),
    categorySelect: document.getElementById('categorySelect'),
    statusSelect: document.getElementById('statusSelect'),
    countrySelect: document.getElementById('countrySelect'),
    catalog: document.getElementById('catalog'),
    totalPromos: document.getElementById('totalPromos'),
    activePromos: document.getElementById('activePromos'),
    lastUpdate: document.getElementById('lastUpdate'),
    sortButton: document.getElementById('sortByExpiryBtn'),
    sortButtonMobile: document.getElementById('sortByExpiryBtnMobile'),
    resetFiltersBtn: document.getElementById('resetFiltersBtn'),
    resetFiltersBtnMobile: document.getElementById('resetFiltersBtnMobile'),
    loadingSpinner: document.getElementById('loadingSpinner'),
    toggleFilters: document.getElementById('toggleFilters'),
    filtersContent: document.getElementById('filtersContent')
};

let currentPage = 1;
const perPage = 20;
let isLoadingMore = false;
let hasMore = true;
let observer;

// ========== НОВЫЙ КОД: Защита от pull-to-refresh на мобильных устройствах ==========
(function preventPullToRefresh() {
    // Добавляем CSS защиту
    const style = document.createElement('style');
    style.textContent = `
        html, body {
            overscroll-behavior-y: contain;
            -webkit-overflow-scrolling: touch;
            overflow-y: auto;
            position: relative;
            height: 100%;
        }
        
        /* Для контейнера с промокодами */
        #catalog {
            overscroll-behavior-y: contain;
        }
    `;
    document.head.appendChild(style);
    
    // Проверяем, что это мобильное устройство
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (!isMobile) return;
    
    let touchStartY = 0;
    let touchStartX = 0;
    let isPullingDown = false;
    
    // Перехватываем touch-события
    document.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
        touchStartX = e.touches[0].clientX;
        isPullingDown = (window.scrollY === 0);
    }, { passive: true });
    
    document.addEventListener('touchmove', (e) => {
        if (!isPullingDown) return;
        
        const currentY = e.touches[0].clientY;
        const currentX = e.touches[0].clientX;
        const pullDistance = currentY - touchStartY;
        const horizontalDistance = Math.abs(currentX - touchStartX);
        
        // Если тянем вниз (pullDistance > 0) и страница вверху, и движение больше вертикальное чем горизонтальное
        if (pullDistance > 5 && window.scrollY <= 0 && horizontalDistance < pullDistance) {
            e.preventDefault(); // Блокируем нативное обновление
        }
    }, { passive: false });
    
    document.addEventListener('touchend', () => {
        isPullingDown = false;
    });
    
    // Дополнительная защита для iOS Safari
    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'auto';
    }
    
    console.log('✅ Защита от pull-to-refresh активирована');
})();
// ========== КОНЕЦ НОВОГО КОДА ==========

function safeHttpUrl(u, fallback = '') {
    if (!u || typeof u !== 'string') return fallback;
    try {
        const x = new URL(u, window.location.origin);
        if (x.protocol !== 'http:' && x.protocol !== 'https:') return fallback;
        return x.href;
    } catch {
        return fallback;
    }
}

function escapeHtml(unsafe) {
    return String(unsafe || '')
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getOrCreateVisitorId() {
  const name = 'sm_vid';
  const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  if (m) return decodeURIComponent(m[1]);

  const id = (crypto.randomUUID && crypto.randomUUID())
    || ('v_' + Math.random().toString(36).slice(2) + Date.now().toString(36));

  // 2 года
  const maxAge = 60 * 60 * 24 * 365 * 2;
  document.cookie = `${name}=${encodeURIComponent(id)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
  return id;
}

function getPromoTitle(promo) {
    const strip = (s) => {
      if (typeof s !== 'string') return '';
      let out = s;
      let prev;
      do {
        prev = out;
        out = out.replace(/<[^>]*>/g, '');
      } while (out !== prev);
      return out.trim();
    };
    if (promo && typeof promo.name === 'string' && promo.name.trim() !== '') {
        return strip(promo.name);
    }
    if (promo && typeof promo.title === 'string' && promo.title.trim() !== '') {
        return strip(promo.title);
    }
    try {
        const url = promo?.landing_url || promo?.link || promo?.url;
        if (url) {
            const u = new URL(url, location.origin);
            return u.hostname.replace(/^www\./, '');
        }
    } catch (_) {}
    return t('promo.partnerOffer');
}

function normalizePromo(raw) {
    const pickString = (val) => {
        if (typeof val === 'string') return val.trim();
        if (val && typeof val === 'object') {
            const nested = val.title || val.name || val.text || val.label || val.value;
            if (typeof nested === 'string') return nested.trim();
        }
        return undefined;
    };

    const pickFromContainers = (keys) => {
        const containers = [raw, raw?.fields, raw?.data, raw?.attributes, raw?.meta];
        for (const c of containers) {
            for (const k of keys) {
                const s = pickString(c?.[k]);
                if (s) return s;
            }
        }
        return undefined;
    };

    const norm = { ...raw };
    norm.title = getPromoTitle(raw);
    norm.description = pickFromContainers(['description', 'subtitle', 'details', 'text']);
    norm.promocode = pickFromContainers(['promocode', 'promo_code', 'code', 'coupon', 'coupon_code']);
    norm.landing_url = pickFromContainers(['landing_url', 'link', 'url', 'landing', 'target_url']);
    norm.image_url = pickFromContainers(['image_url', 'image', 'picture', 'logo', 'logo_url', 'icon']);
    norm.category = pickFromContainers(['category', 'group', 'project', 'type', 'segment']) || 'другие';
    norm.country = raw.country || pickFromContainers(['country', 'region', 'location']) || 'Россия';
    const percentRaw = pickFromContainers(['discount_percent', 'percent', 'percentage', 'discountPercentage']);
    const amountRaw = pickFromContainers(['discount_amount', 'amount', 'value', 'discountValue']);
    norm.discount_percent = percentRaw ? Number(String(percentRaw).replace(/[^0-9.,]/g, '').replace(',', '.')) : undefined;
    norm.discount_amount = amountRaw ? Number(String(amountRaw).replace(/[^0-9.,]/g, '').replace(',', '.')) : undefined;
    norm.bonus_description = pickFromContainers(['bonus_description', 'name', 'comment', 'description']) || undefined;
    const expiry = pickFromContainers(['valid_until', 'expiry_date', 'date_end', 'valid_to', 'end_date', 'expires_at']);
    if (expiry) {
        const parsedDate = new Date(expiry);
        norm.expiry_date = isNaN(parsedDate.getTime()) ? undefined : parsedDate.toISOString();
    }
    const adv = pickFromContainers(['advertiser_info', 'advertiser', 'merchant', 'brand']);
    if (!norm.advertiser_info && adv) {
        norm.advertiser_info = adv;
    }
    return norm;
}

async function logError(message, error) {
    try {
        await fetch('/api/log-error', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message, error: error.message, stack: error.stack, userAgent: navigator.userAgent })
        });
    } catch (_) {}
}

async function loadPromocodesFromAPI() {
    const hasSSR = document.querySelector('#catalog .promo-card[data-ssr]');
    if (!hasSSR) {
        elements.loadingSpinner.style.display = 'block';
    }
    try {
        const cachedData = localStorage.getItem('promo_cache');
        if (cachedData) {
            const { data, stats, timestamp } = JSON.parse(cachedData);
            if (Date.now() - timestamp < API_CONFIG.updateInterval) {
                allPromocodes = data.map(normalizePromo);
                filteredPromocodes = [...allPromocodes];
                updateStats(stats || { total: 0, active: 0 });
                await loadCategoriesFromAPI();
                if (!hasSSR) {
                    renderPromocodes();
                } else {
                    initSSRCatalogState();
                }
                updateLastUpdateTime();
                updateCountrySelect(COUNTRY_KEYS);
                return true;
            }
        }
        const response = await fetch(API_CONFIG.baseUrl, { cache: 'no-store' });
        if (!response.ok) throw new Error(`HTTP ошибка! Статус: ${response.status}`);
        const result = await response.json();
        if (result.status !== 'success' || !Array.isArray(result.data)) {
            throw new Error(`Неверный формат данных: ${result.message || 'нет данных'}`);
        }
        allPromocodes = result.data.map(normalizePromo);
        filteredPromocodes = [...allPromocodes];
        const newDate = new Date().toISOString();
        localStorage.setItem('promo_cache', JSON.stringify({
            data: result.data,
            stats: result.stats,
            timestamp: Date.now()
        }));
        localStorage.setItem(API_CONFIG.lastUpdateKey, newDate);
        updateStats(result.stats || { total: 0, active: 0 });
        await loadCategoriesFromAPI();
        if (!hasSSR) {
            renderPromocodes();
        } else {
            initSSRCatalogState();
        }
        updateCountrySelect(COUNTRY_KEYS);
        updateLastUpdateTime();
        if (!hasSSR) {
            showToast(t('promo.refreshed'), 'success');
        }
        return true;
    } catch (error) {
        logError('Ошибка загрузки промокодов', error);
        if (!hasSSR) {
            showToast(t('promo.loadError', { message: error.message }), 'error');
        }
        return false;
    } finally {
        elements.loadingSpinner.style.display = 'none';
    }
}

async function refreshPromocodes() {
    try {
        const response = await fetch(`${API_CONFIG.baseUrl}/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) throw new Error(`HTTP ошибка! Статус: ${response.status}`);

        const result = await response.json();
        if (result.status === 'success') {
            localStorage.removeItem('promo_cache');
            await loadPromocodesFromAPI();

            isSortedByExpiry = localStorage.getItem('promo_sort_by_expiry') === 'true';
            sortAscending = localStorage.getItem('promo_sort_ascending') !== 'false';
            updateSortButtonUI();
            filterPromos();
            updateLastUpdateTime();
            showToast(t('promo.refreshed'), 'success');
        } else {
            showToast(t('promo.updateError'), 'error');
        }
    } catch (error) {
        logError('Ошибка принудительного обновления', error);
        showToast(t('promo.refreshError', { message: error.message }), 'error');
        updateLastUpdateTime();
    }
}

function addOfferSchema(promos) {
    if (document.getElementById('promo-offers-schema') && preferSSRUntilInteraction) {
        return;
    }

    const schemas = promos.map(promo => ({
        "@context": "https://schema.org",
        "@type": "Offer",
        "name": getPromoTitle(promo),
        "description": promo.description || promo.subtitle || t('promo.descriptionPending'),
        "url": promo.landing_url || promo.link || promo.url || "",
        "category": promo.category || "другие",
        "priceCurrency": promo.discount_amount ? "RUB" : undefined,
        "discount": promo.discount_percent ? `${promo.discount_percent}%` : promo.discount_amount ? `${promo.discount_amount} RUB` : undefined,
        "validThrough": promo.valid_until || promo.expiry_date || undefined,
        "offeredBy": {
            "@type": "Organization",
            "name": promo.advertiser_info || t('promo.partnerName')
        },
        "image": promo.image_url || "https://serpmonn.ru/frontend/images/skidki-i-akcii.png",
        "availability": (promo.valid_until || promo.expiry_date) && new Date(promo.valid_until || promo.expiry_date) < new Date() ? "http://schema.org/OutOfStock" : "http://schema.org/InStock",
        "couponCode": promo.promocode || undefined,
        "areaServed": promo.country || "Россия"
    }));
    const existingScripts = document.querySelectorAll('script[type="application/ld+json"]');
    existingScripts.forEach(script => {
        if (script.textContent.includes('"Offer"')) script.remove();
    });
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(schemas, (key, value) => value === undefined ? null : value);
    document.head.appendChild(script);
}

function updateCategorySelect(categories) {
    const select = elements.categorySelect;
    if (!select) return;
    select.innerHTML = `<option value="">${t('promo.allCategories')}</option>`;
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = getCategoryLabel(category);
        select.appendChild(option);
    });
}

function updateCountrySelect(countries) {
    const select = elements.countrySelect;
    if (!select) return;
    select.innerHTML = `<option value="">${t('promo.allCountries')}</option>`;
    countries.forEach(country => {
        const key = `promo.country.${country}`;
        if (t(key) !== key || COUNTRY_KEYS.includes(country)) {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = getCountryLabel(country);
            select.appendChild(option);
        }
    });
}

function resetFilters() {
    elements.searchInput.value = '';
    elements.categorySelect.value = '';
    elements.statusSelect.value = '';
    elements.countrySelect.value = '';
    isSortedByExpiry = false;
    sortAscending = true;
    localStorage.setItem('promo_search', '');
    localStorage.setItem('promo_category', '');
    localStorage.setItem('promo_status', '');
    localStorage.setItem('promo_country', '');
    localStorage.setItem('promo_sort_by_expiry', 'false');
    localStorage.setItem('promo_sort_ascending', 'true');
    
    if (elements.sortButton) {
        updateSortButtonUI();
    }
    
    filterPromos();
}

function renderPromocodes() {
    preferSSRUntilInteraction = false;
    const catalog = elements.catalog;
    if (!catalog) return;

    catalog.innerHTML = '';

    currentPage = 1;
    isLoadingMore = false;
    hasMore = true;

    if (filteredPromocodes.length === 0) {
        catalog.innerHTML = `
            <div class="no-results">
                <h3>${t('promo.noResultsTitle')}</h3>
                <p>${t('promo.noResultsHint')}</p>
            </div>
        `;
        return;
    }

    initInfiniteScroll();
    renderPage(1);
    addOfferSchema(filteredPromocodes);
}

function renderPage(page) {
    const start = (page - 1) * perPage;
    const end = start + perPage;
    let paginatedPromos = filteredPromocodes.slice(start, end);

    if (paginatedPromos.length === 0) {
        hasMore = false;
        return;
    }

    const catalog = elements.catalog;
    paginatedPromos.forEach(promo => {
        const card = createPromoCard(promo, Boolean(promo.is_top) && !isYandexTravelPromo(promo));
        catalog.appendChild(card);
    });

    insertInfeedAdsIntoCatalog(catalog, window.innerWidth < 768 ? 10 : 5);
    lazyLoadImages();

    const lastCard = catalog.lastElementChild;
    if (lastCard && observer) {
        observer.observe(lastCard);
    }
}

function initInfiniteScroll() {
    if (observer) observer.disconnect();

    observer = new IntersectionObserver(entries => {
        const lastEntry = entries[0];
        if (lastEntry.isIntersecting && !isLoadingMore && hasMore) {
            isLoadingMore = true;
            currentPage++;
            renderPage(currentPage);
            isLoadingMore = false;
        }
    }, {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    });
}

function reorderSSRCatalogToMatchFilter() {
    const catalog = elements.catalog;
    if (!catalog) {
        return;
    }

    const cardsById = new Map();
    catalog.querySelectorAll('.promo-card[data-promo-id]').forEach((card) => {
        cardsById.set(card.dataset.promoId, card);
    });

    catalog.querySelectorAll('.promo-ad-inline').forEach((ad) => ad.remove());

    filteredPromocodes.forEach((promo) => {
        const card = cardsById.get(String(promo.id));
        if (card) {
            catalog.appendChild(card);
        }
    });

    insertInfeedAdsIntoCatalog(catalog, window.innerWidth < 768 ? 10 : 5);
}

function initSSRCatalogState() {
    const ssrCards = document.querySelectorAll('#catalog .promo-card[data-ssr]');
    if (!ssrCards.length) {
        return false;
    }

    preferSSRUntilInteraction = true;
    ssrCardCount = ssrCards.length;
    ssrCards.forEach(card => {
        const promo = findPromoById(card.dataset.promoId);
        if (promo) {
            wirePromoCard(card, promo);
        }
    });

    currentPage = 1;
    isLoadingMore = false;
    hasMore = filteredPromocodes.length > ssrCardCount;
    initInfiniteScroll();
    const lastCard = document.querySelector('#catalog .promo-card:last-of-type');
    if (lastCard && observer) {
        observer.observe(lastCard);
    }
    lazyLoadImages();
    insertInfeedAdsIntoCatalog(elements.catalog, window.innerWidth < 768 ? 10 : 5);
    lazyLoadAds();
    return true;
}

function wirePromoCard(card, promo) {
    if (!card || !promo || card.dataset.wired === '1') {
        return;
    }

    card.dataset.wired = '1';
    const landingUrl = safeHttpUrl(promo.landing_url || promo.link || promo.url);

    if (landingUrl) {
        card.dataset.landingUrl = landingUrl;
        card.addEventListener('click', (e) => {
            const interactiveElements = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'];
            const isInteractive = e.target.closest('button') ||
                                 e.target.closest('a') ||
                                 e.target.closest('.details-content') ||
                                 interactiveElements.includes(e.target.tagName);

            if (!isInteractive) {
                window.open(landingUrl, '_blank', 'noopener,noreferrer');
                try {
                    fetch('/api/track-click', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            promocode: promo.promocode,
                            url: landingUrl,
                            source: 'card_click',
                            visitor_id: getOrCreateVisitorId()
                        })
                    });
                } catch (error) {
                    logError('Ошибка трекинга клика по карточке', error);
                }
            }
        });
    }

    const detailsBtn = card.querySelector('.details-btn');
    if (detailsBtn) {
        detailsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDetails(detailsBtn);
        });
        detailsBtn.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                toggleDetails(detailsBtn);
            }
        });
    }

    const copyBtn = card.querySelector('.copy-btn');
    if (copyBtn && promo.promocode) {
        copyBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            await copyToClipboard(promo, copyBtn);

            const combinedForSpecial = [
                promo?.title,
                promo?.name,
                promo?.description,
                promo?.advertiser_info,
                promo?.category,
                promo?.landing_url,
                promo?.link,
                promo?.url
            ].filter(Boolean).join(' ').toLowerCase();

            const isSpecialProject = specialCopyProjects.some(project =>
                combinedForSpecial.includes(project.toLowerCase())
            );

            if (isSpecialProject && landingUrl) {
                try {
                    await fetch('/api/track-click', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            promocode: promo.promocode,
                            url: landingUrl,
                            source: 'copy-button-special',
                            visitor_id: getOrCreateVisitorId()
                        })
                    });
                } catch (error) {
                    logError('Ошибка трекинга клика по copy для спец‑проекта', error);
                }

                window.open(landingUrl, '_blank');
            }
        });
    }

    const useBtn = card.querySelector('.use-btn');
    if (useBtn) {
        useBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            try {
                await fetch('/api/track-click', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        promocode: promo.promocode,
                        url: landingUrl,
                        source: 'button_click',
                        visitor_id: getOrCreateVisitorId()
                    })
                });
            } catch (error) {
                logError('Ошибка трекинга клика', error);
            }
        });
    }

    const codeParam = promo.promocode || '';
    const shareBtn = card.querySelector('.promo-share-button');
    if (shareBtn) {
        shareBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!codeParam) return;
            sharePromo(promo, buildPromoShareUrl(codeParam));
        });
    }
}

function createPromoCard(promo, isTopOffer = false) {
    const card = document.createElement('div');
    const combined = [
        promo?.title,
        promo?.name,
        promo?.description,
        promo?.advertiser_info,
        promo?.category,
        promo?.landing_url,
        promo?.link,
        promo?.url
    ].filter(Boolean).join(' ');
    const isYandexTravel = /(Яндекс\s*Путешеств|Yandex\s*Travel|travelyandex|yandex\.travel)/i.test(combined);
    
    card.className = `promo-card ${isTopOffer ? 'top-offer' : ''} ${isYandexTravel ? 'travel-highlight' : ''} clickable-card`;
    if (isTopOffer) {
        card.setAttribute('data-top-badge', t('promo.topBadge'));
    }
    if (isYandexTravel) {
        card.setAttribute('data-travel-badge', t('promo.travelBadge'));
    }
    card.dataset.category = promo.category || 'другие';
    card.dataset.expiry = promo.valid_until || promo.expiry_date || '9999-12-31';
    card.dataset.country = promo.country || 'Россия';

    const titleText = escapeHtml(getPromoTitle(promo).slice(0, 60) + (getPromoTitle(promo).length > 60 ? '...' : ''));

    let expiryDate;
    if (promo.valid_until || promo.expiry_date) {
        const dateStr = promo.valid_until || promo.expiry_date;
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
            expiryDate = new Date(dateStr + 'T23:59:59');
        } else {
            expiryDate = new Date(dateStr);
        }
    } else {
        expiryDate = new Date('9999-12-31');
    }

    const now = new Date();
    const isExpired = expiryDate < now;
    const detailsId = `details-${promo.id || Math.random().toString(36).substr(2, 9)}`;

    let bonusText = '';
    const isSberCard = /Детская\s*Сбер\s*Карта|СберКарта\s*Детская/i.test(titleText);
    if (promo.bonus_description) {
        bonusText = promo.bonus_description;
    } else if (promo.discount_percent) {
        bonusText = t('promo.discountPercent', { percent: promo.discount_percent });
    } else if (promo.discount_amount) {
        bonusText = isSberCard
            ? t('promo.certificateAmount', { amount: promo.discount_amount })
            : t('promo.discountAmount', { amount: promo.discount_amount });
    } else {
        bonusText = t('promo.noPromocode');
    }

    const landingUrl = safeHttpUrl(promo.landing_url || promo.link || promo.url);
    const fallbackImg = '/frontend/images/skidki-i-akcii.png';
    const imageUrlRaw = safeHttpUrl(promo.image_url, fallbackImg) || fallbackImg;

    // DOM API вместо innerHTML — иначе CodeQL js/xss на шаблонной строке
    card.replaceChildren();
    const content = document.createElement('div');
    content.className = 'promo-card-content';

    const header = document.createElement('div');
    header.className = 'promo-header';
    const img = document.createElement('img');
    img.src = imageUrlRaw;
    img.dataset.src = imageUrlRaw;
    img.alt = titleText;
    img.width = 80;
    img.height = 80;
    img.loading = 'lazy';
    img.className = 'lazy-load';
    const h3 = document.createElement('h3');
    h3.title = getPromoTitle(promo);
    h3.textContent = getPromoTitle(promo);
    header.append(img, h3);
    content.appendChild(header);

    if (promo.promocode) {
      const codeP = document.createElement('p');
      codeP.className = 'code';
      codeP.append(document.createTextNode(String(promo.promocode) + ' '));
      const copyBtn = document.createElement('button');
      copyBtn.className = 'submit-btn copy-btn';
      copyBtn.type = 'button';
      copyBtn.setAttribute('aria-label', t('promo.copyCodeAria', { code: promo.promocode }));
      copyBtn.textContent = t('promo.copy');
      codeP.appendChild(copyBtn);
      content.appendChild(codeP);
    }

    const bonusP = document.createElement('p');
    bonusP.className = 'bonus-info';
    bonusP.textContent = bonusText;
    content.appendChild(bonusP);

    const detailsBtn = document.createElement('button');
    detailsBtn.type = 'button';
    detailsBtn.className = 'details-btn';
    detailsBtn.setAttribute('aria-expanded', 'false');
    detailsBtn.setAttribute('aria-controls', detailsId);
    detailsBtn.tabIndex = 0;
    const detailsIcon = document.createElement('span');
    detailsIcon.className = 'details-icon';
    detailsIcon.textContent = '▼';
    const detailsText = document.createElement('span');
    detailsText.className = 'details-text';
    detailsText.textContent = t('promo.details');
    detailsBtn.append(detailsIcon, detailsText);
    content.appendChild(detailsBtn);

    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'details-content';
    detailsDiv.id = detailsId;
    detailsDiv.style.display = 'none';
    const descP = document.createElement('p');
    descP.className = 'details-description';
    descP.textContent = promo.description || promo.groupDescription || t('promo.descriptionPending');
    detailsDiv.appendChild(descP);
    if (promo.conditions) {
      const condP = document.createElement('p');
      condP.className = 'details-conditions';
      const strong = document.createElement('strong');
      strong.textContent = t('promo.conditions');
      condP.append(strong, document.createTextNode(' ' + String(promo.conditions)));
      detailsDiv.appendChild(condP);
    }
    content.appendChild(detailsDiv);

    const countryP = document.createElement('p');
    countryP.className = 'country';
    countryP.textContent = `${t('promo.countryPrefix')} ${getCountryLabel(promo.country || 'Россия')}`;
    content.appendChild(countryP);

    const expiryP = document.createElement('p');
    expiryP.className = `expiry${isExpired ? ' expired' : ''}`;
    expiryP.textContent = `${t('promo.validUntil')} ${formatDate(expiryDate)}${isExpired ? ` ${t('promo.expired')}` : ''}`;
    content.appendChild(expiryP);

    const footer = document.createElement('div');
    footer.className = 'promo-card-footer';
    if (landingUrl) {
      const actions = document.createElement('div');
      actions.className = 'promo-footer-actions';
      const useLink = document.createElement('a');
      useLink.href = landingUrl;
      useLink.target = '_blank';
      useLink.rel = 'noopener noreferrer';
      useLink.className = 'register-link use-btn';
      useLink.textContent = t('promo.use');
      const shareBtn = document.createElement('button');
      shareBtn.type = 'button';
      shareBtn.className = 'promo-share-button';
      shareBtn.setAttribute('aria-label', t('promo.shareAria'));
      const shareIcon = document.createElement('span');
      shareIcon.className = 'promo-share-icon';
      shareIcon.textContent = '⤴';
      shareBtn.appendChild(shareIcon);
      actions.append(useLink, shareBtn);
      footer.appendChild(actions);
    }
    if (promo.advertiser_info) {
      const adP = document.createElement('p');
      adP.className = 'ad';
      adP.textContent = `${t('promo.ad')} ${promo.advertiser_info}`;
      footer.appendChild(adP);
    }

    card.append(content, footer);
    wirePromoCard(card, promo);
    return card;
}

function formatDate(date) {
    return date.toLocaleDateString(getDateLocale(), {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function updateStats(stats) {
    if (!stats) return;
    const total = stats.total ?? 0;
    const active = stats.active ?? stats.total ?? 0;
    if (elements.totalPromos) elements.totalPromos.textContent = total;
    if (elements.activePromos) elements.activePromos.textContent = active;
    const totalChip = document.getElementById('totalStatChip');
    if (totalChip) {
        totalChip.hidden = total === active;
    }
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.setAttribute('aria-live', 'polite');
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 100);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function updateLastUpdateTime() {
    const lastUpdate = localStorage.getItem(API_CONFIG.lastUpdateKey);
    if (!elements.lastUpdate) {
        return;
    }
    if (!lastUpdate) {
        const newDate = new Date().toISOString();
        localStorage.setItem(API_CONFIG.lastUpdateKey, newDate);
        elements.lastUpdate.textContent = new Date(newDate).toLocaleString(getDateLocale(), { 
            dateStyle: 'short', 
            timeStyle: 'medium'
        });
        return;
    }
    const date = new Date(lastUpdate);
    if (isNaN(date.getTime())) {
        const newDate = new Date().toISOString();
        localStorage.setItem(API_CONFIG.lastUpdateKey, newDate);
        elements.lastUpdate.textContent = new Date(newDate).toLocaleString(getDateLocale(), { 
            dateStyle: 'short', 
            timeStyle: 'medium'
        });
        return;
    }
    elements.lastUpdate.classList.add('updating');
    elements.lastUpdate.textContent = '';
    elements.lastUpdate.textContent = date.toLocaleString(getDateLocale(), { 
        dateStyle: 'short', 
        timeStyle: 'medium'
    });
    setTimeout(() => elements.lastUpdate.classList.remove('updating'), 300);
}

function startAutoUpdate() {
    if (updateTimer) clearInterval(updateTimer);
    updateTimer = setInterval(async () => {
        await loadPromocodesFromAPI();
    }, API_CONFIG.updateInterval);
}

function stopAutoUpdate() {
    if (updateTimer) {
        clearInterval(updateTimer);
        updateTimer = null;
    }
}

function filterPromos() {
    const search = elements.searchInput.value.toLowerCase();
    const category = elements.categorySelect?.value || '';
    const status = elements.statusSelect?.value || '';
    const country = elements.countrySelect?.value || '';
    localStorage.setItem('promo_search', search);
    localStorage.setItem('promo_category', category);
    localStorage.setItem('promo_status', status);
    localStorage.setItem('promo_country', country);
    
    filteredPromocodes = allPromocodes.filter(promo => {
        const title = (promo && typeof promo.title === 'string' ? promo.title : '').toLowerCase();
        const description = (promo.description || promo.subtitle || '').toLowerCase();
        const promocode = (promo.promocode || '').toLowerCase();
        const promoCategory = promo.category || 'другие';
        const promoCountry = promo.country || 'Россия';
        const matchesSearch = search === '' ||
            title.includes(search) ||
            description.includes(search) ||
            promocode.includes(search);
        const matchesCategory = category === '' || promoCategory === category;
        const matchesCountry = country === '' || promoCountry === country;
        const now = new Date();
        const expiry = new Date(promo.valid_until || promo.expiry_date || '9999-12-31');
        const matchesStatus = status === '' ||
            (status === 'active' && expiry >= now) ||
            (status === 'expired' && expiry < now && promo.valid_until);
        return matchesSearch && matchesCategory && matchesCountry && matchesStatus;
    });

    if (!isSortedByExpiry) {
        filteredPromocodes.sort((a, b) => {
            const groupA = getPromoSortGroup(a);
            const groupB = getPromoSortGroup(b);
            if (groupA !== groupB) return groupA - groupB;

            const dateA = new Date(a.valid_until || a.expiry_date || '9999-12-31');
            const dateB = new Date(b.valid_until || b.expiry_date || '9999-12-31');
            return dateA - dateB;
        });
    } else {
        filteredPromocodes.sort((a, b) => {
            const dateA = new Date(a.valid_until || a.expiry_date || '9999-12-31');
            const dateB = new Date(b.valid_until || b.expiry_date || '9999-12-31');
            return sortAscending ? dateA - dateB : dateB - dateA;
        });
    }

    const hasActiveFilters = search !== '' || category !== '' || status !== '' || country !== '' || isSortedByExpiry;

    if (preferSSRUntilInteraction && !hasActiveFilters) {
        reorderSSRCatalogToMatchFilter();
        return;
    }

    renderPromocodes();
    
    const noResultsMessage = document.querySelector('.no-results');
    if (filteredPromocodes.length === 0 && (search !== '' || category !== '' || status !== '' || country !== '')) {
        if (!noResultsMessage) {
            const message = document.createElement('div');
            message.className = 'no-results';
            message.innerHTML = `<h3>${t('promo.noResultsTitle')}</h3><p>${t('promo.noResultsHintShort')}</p>`;
            elements.catalog.prepend(message);
        }
    } else if (noResultsMessage) {
        noResultsMessage.remove();
    }
}

function copyToClipboard(promo, btn) {
    const text = promo.promocode || promo.code || String(promo);

    const onSuccess = async () => {
        showToast(t('promo.codeCopied'), 'success');

        if (btn) {
            const originalText = btn.textContent;
            btn.textContent = t('promo.copied');
            btn.disabled = true;
            setTimeout(() => {
                btn.textContent = originalText;
                btn.disabled = false;
            }, 2000);
        }

        try {
            await fetch('/api/track-copy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    promocode: text,
                    promocodeId: promo.id,
                    title: promo.title,
                    advertiser_info: promo.advertiser_info,
                    landing_url: promo.landing_url || promo.link || promo.url,
                    visitor_id: getOrCreateVisitorId(),
                    timestamp: new Date().toISOString()
                })
            });
        } catch (error) {
            logError('Ошибка трекинга копирования', error);
        }
    };

    return navigator.clipboard.writeText(text).then(onSuccess).catch(() => {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        return onSuccess();
    });
}

function sortByExpiry() {
    isSortedByExpiry = true;
    sortAscending = !sortAscending;
    localStorage.setItem('promo_sort_by_expiry', 'true');
    localStorage.setItem('promo_sort_ascending', sortAscending ? 'true' : 'false');
    
    filterPromos();
    
    if (elements.sortButton) {
        updateSortButtonUI();
    }
}

function toggleFilters(button) {
    const content = elements.filtersContent;
    if (!content || !button) {
        return;
    }

    const isExpanded = content.style.display === 'flex';
    content.style.display = isExpanded ? 'none' : 'flex';
    button.setAttribute('aria-expanded', String(!isExpanded));
    button.textContent = isExpanded ? t('promo.filters') : t('promo.hideFilters');
}

function lazyLoadImages() {
    const images = document.querySelectorAll('img.lazy-load');
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                }
                img.classList.remove('lazy-load');
                obs.unobserve(img);
            }
        });
    }, { rootMargin: '100px' });
    images.forEach(img => observer.observe(img));
}

document.querySelector('.bonus form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = e.target.querySelector('input[name="email"]').value;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const messageEl = document.createElement('p');
    messageEl.className = 'message';
    if (!emailRegex.test(email)) {
        messageEl.textContent = t('promo.invalidEmail');
        messageEl.style.color = '#ff5252';
        e.target.appendChild(messageEl);
        setTimeout(() => messageEl.remove(), 3000);
        return;
    }
    try {
        const response = await fetch('/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: `email=${encodeURIComponent(email)}`
        });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const result = await response.json();
        messageEl.textContent = t('promo.subscribeThanks');
        messageEl.style.color = '#28a745';
        e.target.appendChild(messageEl);
        e.target.reset();
        setTimeout(() => messageEl.remove(), 3000);
    } catch (error) {
        logError('Ошибка подписки', error);
        messageEl.textContent = error.message.includes('HTTP error')
            ? t('promo.serverError', { message: error.message })
            : t('promo.subscribeError');
        messageEl.style.color = '#ff5252';
        e.target.appendChild(messageEl);
        setTimeout(() => messageEl.remove(), 3000);
    }
});

elements.searchInput?.addEventListener('input', () => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(filterPromos, 300);
});

elements.categorySelect?.addEventListener('change', filterPromos);
elements.statusSelect?.addEventListener('change', filterPromos);
elements.countrySelect?.addEventListener('change', filterPromos);

document.addEventListener('DOMContentLoaded', async () => {
  t = await getPageT('promo');

  const bootstrap = readPromoBootstrap();
  if (bootstrap?.data?.length) {
    allPromocodes = bootstrap.data.map(normalizePromo);
    filteredPromocodes = [...allPromocodes];
    updateStats(bootstrap.stats || { total: 0, active: 0 });
    if (Array.isArray(bootstrap.categories) && bootstrap.categories.length) {
      updateCategorySelect(bootstrap.categories);
    }
    initSSRCatalogState();
  }

  isSortedByExpiry = localStorage.getItem('promo_sort_by_expiry') === 'true';
  sortAscending = localStorage.getItem('promo_sort_ascending') !== 'false';
  const savedSearch = localStorage.getItem('promo_search') || '';
  const savedCategory = localStorage.getItem('promo_category') || '';
  const savedStatus = localStorage.getItem('promo_status') || '';
  const savedCountry = localStorage.getItem('promo_country') || '';

  elements.searchInput.value = savedSearch;
  elements.categorySelect.value = savedCategory;
  elements.statusSelect.value = savedStatus;
  elements.countrySelect.value = savedCountry;

  await loadPromocodesFromAPI();
  updateLastUpdateTime();
  updateSortButtonUI();
  startAutoUpdate();

  const urlParams = new URLSearchParams(window.location.search);
  const urlCode = urlParams.get('code');
  const urlSearch = urlParams.get('search');
  if (urlCode) {
    elements.searchInput.value = urlCode;
  } else if (urlSearch) {
    elements.searchInput.value = urlSearch;
  }

  filterPromos();

  const bindClick = (el, handler) => {
    if (el) el.addEventListener('click', handler);
  };

  bindClick(elements.sortButton, sortByExpiry);
  bindClick(elements.sortButtonMobile, sortByExpiry);
  bindClick(elements.resetFiltersBtn, resetFilters);
  bindClick(elements.resetFiltersBtnMobile, resetFilters);

  if (elements.toggleFilters) {
    elements.toggleFilters.addEventListener('click', () => toggleFilters(elements.toggleFilters));
    elements.toggleFilters.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleFilters(elements.toggleFilters);
      }
    });
  }

  const el = document.getElementById('subscribersCount');
  if (el) {
    try {
      const res = await fetch('/api/subscribers/count', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const raw = Number(data.count) || 0;
      const lang = document.documentElement.lang || 'en';
      const formatted = raw.toLocaleString(lang);

      const template = el.dataset.countTemplate;
      if (template && template.includes('{count}')) {
        el.textContent = template.replace('{count}', formatted);
      }
    } catch (err) {
      console.error('Failed to fetch subscribers count', err);
    }
  }
});

function toggleDetails(button) {
    const contentId = button.getAttribute('aria-controls');
    const content = contentId
        ? document.getElementById(contentId)
        : button.nextElementSibling;

    if (!content || !content.classList.contains('details-content')) {
        return;
    }

    const isExpanded = button.getAttribute('aria-expanded') === 'true';
    const willExpand = !isExpanded;

    content.style.display = willExpand ? 'block' : 'none';
    content.classList.toggle('is-open', willExpand);
    button.setAttribute('aria-expanded', String(willExpand));

    const textSpan = button.querySelector('.details-text');
    if (textSpan) {
        textSpan.textContent = willExpand ? t('promo.hide') : t('promo.details');
    }

    const icon = button.querySelector('.details-icon');
    if (icon) {
        icon.textContent = willExpand ? '▲' : '▼';
    }
}

window.addEventListener('beforeunload', () => {
    stopAutoUpdate();
});

let promoAdObserver = null;

function createInlineAd() {
    const wrap = document.createElement('div');
    wrap.className = 'promo-ad-inline';

    const slot = document.createElement('div');
    slot.className = 'promo-ad-inline__slot';

    const ins = document.createElement('ins');
    applyMailAdAttrs(ins, 'promoInfeed');
    ins.setAttribute('data-adaptive', 'true');
    slot.appendChild(ins);
    wrap.appendChild(slot);
    return wrap;
}

function initPromoAdContainer(container) {
    if (!container || container.dataset.adInit === '1') {
        return;
    }
    container.dataset.adInit = '1';
    container.classList.remove('is-collapsed', 'ad-loaded');
    container.classList.add('ad-loading');
    container.style.display = '';

    ensureMailAdsScript();
    pushMailAdTag();
    setTimeout(pushMailAdTag, 1500);
    setTimeout(pushMailAdTag, 3000);
    setTimeout(pushMailAdTag, 5000);

    const ins = container.querySelector('ins.mrg-tag');
    if (ins) {
        runVkFallbackForIns(ins, { slotKey: 'promoInfeed', timeoutMs: 5500 });
    } else {
        setTimeout(() => collapseAdIfNoFill(container, 0), 6000);
    }
}

function lazyLoadAds() {
    if (!promoAdObserver) {
        promoAdObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) {
                    return;
                }
                initPromoAdContainer(entry.target);
                observer.unobserve(entry.target);
            });
        }, { rootMargin: '200px' });
    }

    document.querySelectorAll('.promo-ad-inline').forEach(ad => {
        if (ad.dataset.adObserved === '1') {
            return;
        }
        ad.dataset.adObserved = '1';
        promoAdObserver.observe(ad);
    });
}

function insertInfeedAdsIntoCatalog(catalog, interval) {
    if (!catalog) return;
    const cards = Array.from(catalog.querySelectorAll('.promo-card'));
    if (!cards.length) return;
    const step = interval || 5;
    for (let i = step; i < cards.length; i += step) {
        const afterCard = cards[i - 1];
        if (!afterCard || !afterCard.parentNode) {
            continue;
        }
        const next = afterCard.nextElementSibling;
        if (next?.classList?.contains('promo-ad-inline')) {
            continue;
        }
        const ad = createInlineAd();
        afterCard.parentNode.insertBefore(ad, afterCard.nextSibling);
    }
    lazyLoadAds();
}

function collapseAdIfNoFill(container, timeoutMs) {
    try {
        const t = timeoutMs || 1500;
        setTimeout(() => {
            if (!container) return;
            const ins = container.querySelector('ins.mrg-tag');
            const hasContent = ins && (
                ins.querySelector('iframe') ||
                ins.innerHTML.trim().length > 0 ||
                ins.offsetHeight > 10
            );
            if (hasContent) {
                container.classList.add('ad-loaded');
                container.classList.remove('ad-loading', 'is-collapsed');
            } else {
                container.remove();
            }
        }, t);
    } catch (error) {
        logError('Ошибка проверки рекламы', error);
        container.remove();
    }
}

// =====================================================
// SHARE POPUP — поп-ап для десктопа + нативный шаринг на мобиле
// =====================================================

function getOrCreateShareOverlay() {
    let overlay = document.getElementById('share-popup-overlay');
    if (overlay) return overlay;

    overlay = document.createElement('div');
    overlay.id = 'share-popup-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', t('promo.shareDialogAria'));

    overlay.innerHTML = `
        <div class="share-popup">
            <button class="share-popup__close" aria-label="${t('promo.close')}">&times;</button>
            <p class="share-popup__title">${t('promo.shareHeading')}</p>
            <p class="share-popup__promo-name"></p>
            <div class="share-networks">
                <a class="share-network-btn" id="sn-vk" href="#" target="_blank" rel="noopener noreferrer" aria-label="VK">
                    <span class="sn-icon sn-icon--vk">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M13.162 18.994c.609 0 .85-.407.84-1.024-.032-1.82.614-2.737 2.066-1.26 1.64 1.67 1.986 2.284 3.408 2.284h2.742c.814 0 1.143-.27.95-.8-.48-1.327-4.297-5.17-4.056-5.512.222-.317 3.347-4.596 3.604-5.664.13-.54-.1-.8-.72-.8H18.22c-.69 0-.91.38-1.14.96-1.048 2.7-2.86 5.073-3.57 4.633-.69-.424-.52-2.686-.484-4.252.02-.75.013-1.557-.746-1.738-.518-.124-1.26-.108-1.76-.108-1.47 0-2.67.5-2.018 1.36.49.643.637 1.934.44 4.26-.26 3.117-3.148-.95-4.29-4.17-.285-.81-.567-1.25-1.3-1.25H1.616c-.777 0-.932.366-.72.972 1.37 3.956 5.87 12.638 12.266 12.11z"/></svg>
                    </span>
                    VK
                </a>
                <a class="share-network-btn" id="sn-tg" href="#" target="_blank" rel="noopener noreferrer" aria-label="Telegram">
                    <span class="sn-icon sn-icon--tg">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8l-1.68 7.92c-.12.56-.46.7-.93.44l-2.58-1.9-1.24 1.2c-.14.14-.26.26-.52.26l.18-2.6 4.74-4.28c.2-.18-.04-.28-.32-.1L7.92 13.8l-2.52-.79c-.54-.17-.56-.54.12-.8l9.84-3.8c.46-.16.86.11.28.39z"/></svg>
                    </span>
                    Telegram
                </a>
                <a class="share-network-btn" id="sn-max" href="#" target="_blank" rel="noopener noreferrer" aria-label="MAX">
                    <span class="sn-icon sn-icon--max">
                        <svg width="24" height="24" viewBox="0 0 42 42" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M21.47 41.88c-4.11 0-6.02-.6-9.34-3-2.1 2.7-8.75 4.81-9.04 1.2 0-2.71-.6-5-1.28-7.5C1 29.5.08 26.07.08 21.1.08 9.23 9.82.3 21.36.3c11.55 0 20.6 9.37 20.6 20.91a20.6 20.6 0 0 1-20.49 20.67m.17-31.32c-5.62-.29-10 3.6-10.97 9.7-.8 5.05.62 11.2 1.83 11.52.58.14 2.04-1.04 2.95-1.95a10.4 10.4 0 0 0 5.08 1.81 10.7 10.7 0 0 0 11.19-9.97 10.7 10.7 0 0 0-10.08-11.1Z" clip-rule="evenodd"/></svg>
                    </span>
                    MAX
                </a>
                <a class="share-network-btn" id="sn-ok" href="#" target="_blank" rel="noopener noreferrer" aria-label="OK">
                    <span class="sn-icon sn-icon--ok">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1zm0 4.5a3.5 3.5 0 110 7 3.5 3.5 0 010-7zm3.75 9.25c.47.47.47 1.23 0 1.7l-1.9 1.9c.52.14 1.05.23 1.6.27.66.05 1.16.62 1.11 1.28-.05.66-.62 1.16-1.28 1.11-1.45-.11-2.82-.62-3.98-1.44-1.16.82-2.53 1.33-3.98 1.44-.66.05-1.23-.45-1.28-1.11-.05-.66.45-1.23 1.11-1.28.55-.04 1.08-.13 1.6-.27l-1.9-1.9c-.47-.47-.47-1.23 0-1.7.47-.47 1.23-.47 1.7 0L12 16.54l2.05-2.04c.47-.47 1.23-.47 1.7.25z"/></svg>
                    </span>
                    OK
                </a>
                <a class="share-network-btn" id="sn-email" href="#" aria-label="Email">
                    <span class="sn-icon sn-icon--email">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                    </span>
                    Email
                </a>
            </div>
            <div class="share-popup__url-row">
                <input type="text" class="share-popup__url-input" readonly aria-label="${t('promo.shareUrlAria')}">
                <button class="share-popup__copy-btn" type="button">${t('promo.copy')}</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('.share-popup__close').addEventListener('click', closeSharePopup);

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeSharePopup();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && overlay.classList.contains('visible')) closeSharePopup();
    });

    overlay.querySelector('.share-popup__copy-btn').addEventListener('click', () => {
        const input = overlay.querySelector('.share-popup__url-input');
        const btn = overlay.querySelector('.share-popup__copy-btn');
        navigator.clipboard.writeText(input.value).catch(() => {
            input.select();
            document.execCommand('copy');
        });
        btn.textContent = t('promo.copied');
        btn.classList.add('copied');
        showToast(t('promo.linkCopied'), 'success');
        setTimeout(() => {
            btn.textContent = t('promo.copy');
            btn.classList.remove('copied');
        }, 2000);
    });

    return overlay;
}

function openSharePopup(promo, url) {
    const overlay = getOrCreateShareOverlay();
    const promoName = promo?.title || promo?.name || t('promo.defaultName');
    const shareText = t('promo.shareText', { name: promoName });

    overlay.querySelector('.share-popup__promo-name').textContent = promoName;
    overlay.querySelector('.share-popup__url-input').value = url;

    const enc = encodeURIComponent;
    overlay.querySelector('#sn-vk').href =
        `https://vk.com/share.php?url=${enc(url)}&title=${enc(shareText)}`;
    overlay.querySelector('#sn-tg').href =
        `https://t.me/share/url?url=${enc(url)}&text=${enc(shareText)}`;
    overlay.querySelector('#sn-max').href =
        `https://max.ru/:share?text=${enc(shareText + '\n\n' + url)}`;
    overlay.querySelector('#sn-ok').href =
        `https://connect.ok.ru/offer?url=${enc(url)}&title=${enc(shareText)}`;
    overlay.querySelector('#sn-email').href =
        `mailto:?subject=${enc(t('promo.emailSubject'))}&body=${enc(shareText + '\n\n' + url)}`;

    overlay.classList.add('visible');
    overlay.querySelector('.share-popup__close').focus();
}

function closeSharePopup() {
    const overlay = document.getElementById('share-popup-overlay');
    if (overlay) overlay.classList.remove('visible');
}

async function sharePromo(promo, url) {
    const title = t('promo.shareTitle');
    const text = t('promo.shareText', { name: promo?.title || promo?.name || 'Serpmonn' });

    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (navigator.share && isMobile) {
        try {
            await navigator.share({ title, text, url });
            return;
        } catch (err) {
            if (err?.name === 'AbortError') return;
            console.warn('navigator.share failed, fallback to popup:', err);
        }
    }

    openSharePopup(promo, url);
}

window.sortByExpiry = sortByExpiry;
window.resetFilters = resetFilters;
