import { t } from '/frontend/scripts/i18n-loader.js';

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
const topBrands = [
    'яндекс афиша', 'yandex afisha', 'афиша', 'afisha',
    'авито путешествия', 'avito puteshestvia', 'avito', 'puteshestvia',
    'яндекс лавка', 'yandex lavka',
    'тануки', 'tanuki',
    'яндекс плюс', 'yandex plus',
    'сберпрайм', 'sberprime', 'сбер прайм', 'sber prime',
    'befree', 'be free',
    'нетпринт', 'netprint',
    'ёбидоёби', 'yobidoyobi',
    'premier', 'премьер',
    'яндекс музыка', 'yandex music', 'yandex muzyka',
    'кинопоиск', 'kinopoisk',
    'винлаб', 'winelab', 'wine lab',
    'ашан', 'ashan',
];

const specialCopyProjects = [
    'Мегамаркет', 'Яндекс Лавка', 'Ашан', 'COZY HOME', 'Netprint',
    'Яндекс Еда', 'SYNERGETIC', 'ТВОЕ', 'DDX Fitness', 'Плати по миру',
    'Сберздоровье', 'Anywayanyday', 'Librederm', 'PetShop', 'GamersHub'
];

const categoryLabels = {
    'еда': 'Еда и рестораны',
    'продукты': 'Продукты',
    'развлечения': 'Развлечения',
    'товары': 'Товары',
    'услуги': 'Услуги',
    'другие': 'Другие',
    'игры': 'Игры',
    'гаджеты': 'Гаджеты',
    'сервисы': 'Сервисы',
    'мода': 'Мода',
    'здоровье': 'Здоровье',
    'транспорт': 'Транспорт',
    'путешествия': 'Путешествия',
    'финансы': 'Финансы',
    'страхование': 'Страхование',
    'фитнес': 'Фитнес'
};

const countryLabels = {
    'Россия': 'Россия',
    'Казахстан': 'Казахстан',
    'Узбекистан': 'Узбекистан',
    'Грузия': 'Грузия'
};

const elements = {
    searchInput: document.getElementById('searchInput'),
    categorySelect: document.getElementById('categorySelect'),
    statusSelect: document.getElementById('statusSelect'),
    countrySelect: document.getElementById('countrySelect'),
    catalog: document.getElementById('catalog'),
    totalPromos: document.getElementById('totalPromos'),
    activePromos: document.getElementById('activePromos'),
    lastUpdate: document.getElementById('lastUpdate'),
    refreshBtn: document.getElementById('refreshBtn'),
    sortButton: document.querySelector('button[onclick="sortByExpiry()"]'),
    loadingSpinner: document.getElementById('loadingSpinner'),
    toggleFilters: document.getElementById('toggleFilters'),
    filtersContent: document.getElementById('filtersContent')
};

let currentPage = 1;
const perPage = 20;
let isLoadingMore = false;
let hasMore = true;
let observer;

(function preventPullToRefresh() {
    const style = document.createElement('style');
    style.textContent = `
        html, body {
            overscroll-behavior-y: contain;
            -webkit-overflow-scrolling: touch;
            overflow-y: auto;
            position: relative;
            height: 100%;
        }
        #catalog {
            overscroll-behavior-y: contain;
        }
    `;
    document.head.appendChild(style);

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (!isMobile) return;

    let touchStartY = 0;
    let touchStartX = 0;
    let isPullingDown = false;

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
        if (pullDistance > 5 && window.scrollY <= 0 && horizontalDistance < pullDistance) {
            e.preventDefault();
        }
    }, { passive: false });

    document.addEventListener('touchend', () => {
        isPullingDown = false;
    });

    if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'auto';
    }
})();

function validateEmailSubscription(email) {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return t('promo.invalidEmail');
    }
    return null;
}

function escapeHtml(unsafe) {
    return unsafe
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
    const maxAge = 60 * 60 * 24 * 365 * 2;
    document.cookie = `${name}=${encodeURIComponent(id)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
    return id;
}

function getPromoTitle(promo) {
    const strip = (s) => typeof s === 'string' ? s.replace(/<[^>]*>/g, '').trim() : '';
    if (promo && typeof promo.name === 'string' && promo.name.trim() !== '') return strip(promo.name);
    if (promo && typeof promo.title === 'string' && promo.title.trim() !== '') return strip(promo.title);
    try {
        const url = promo?.landing_url || promo?.link || promo?.url;
        if (url) {
            const u = new URL(url, location.origin);
            return u.hostname.replace(/^www\./, '');
        }
    } catch (_) {}
    return 'Предложение партнёра';
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
    if (!norm.advertiser_info && adv) norm.advertiser_info = adv;
    return norm;
}
