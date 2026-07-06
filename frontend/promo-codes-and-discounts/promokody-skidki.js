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

    // Добавьте этот массив в начало файла promokody-skidki.js (после const topBrands)
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

  // 2 года
  const maxAge = 60 * 60 * 24 * 365 * 2;
  document.cookie = `${name}=${encodeURIComponent(id)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
  return id;
}

function getPromoTitle(promo) {
    const strip = (s) => typeof s === 'string' ? s.replace(/<[^>]*>/g, '').trim() : '';
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
    elements.loadingSpinner.style.display = 'block';
    try {
        const cachedData = localStorage.getItem('promo_cache');
        if (cachedData) {
            const { data, stats, timestamp } = JSON.parse(cachedData);
            if (Date.now() - timestamp < API_CONFIG.updateInterval) {
                allPromocodes = data.map(normalizePromo);
                filteredPromocodes = [...allPromocodes];
                updateStats(stats || { total: 0, active: 0 });
                renderPromocodes();
                updateLastUpdateTime();
                updateCountrySelect(Object.keys(countryLabels));
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
        const catResponse = await fetch(`${API_CONFIG.baseUrl}/categories`, { cache: 'no-store' });
        if (catResponse.ok) {
            const catResult = await catResponse.json();
            if (catResult.status === 'success' && Array.isArray(catResult.data)) {
                updateCategorySelect(catResult.data);
            }
        }
        updateCountrySelect(Object.keys(countryLabels));
        renderPromocodes();
        updateLastUpdateTime();
        showToast('Промокоды обновлены!', 'success');
        return true;
    } catch (error) {
        logError('Ошибка загрузки промокодов', error);
        showToast(`Ошибка загрузки: ${error.message}`, 'error');
        return false;
    } finally {
        elements.loadingSpinner.style.display = 'none';
    }
}

async function refreshPromocodes() {
    try {
        elements.refreshBtn.disabled = true;
        elements.refreshBtn.innerHTML = '<i class="icon-refresh"></i> Обновление...';
        
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
            
            if (elements.sortButton) {
                if (isSortedByExpiry) {
                    elements.sortButton.innerHTML = `Сортировка ${sortAscending ? '↑' : '↓'}`;
                } else {
                    elements.sortButton.innerHTML = 'Сортировка по сроку';
                }
            }
            
            filterPromos();
            updateLastUpdateTime();
            showToast(result.message, 'success');
        } else {
            showToast(result.message || 'Ошибка при обновлении', 'error');
        }
    } catch (error) {
        logError('Ошибка принудительного обновления', error);
        showToast(`Ошибка обновления: ${error.message}`, 'error');
        updateLastUpdateTime();
    } finally {
        elements.refreshBtn.disabled = false;
        elements.refreshBtn.innerHTML = '<i class="icon-refresh"></i> Обновить';
    }
}

function addOfferSchema(promos) {
    const schemas = promos.map(promo => ({
        "@context": "https://schema.org",
        "@type": "Offer",
        "name": getPromoTitle(promo),
        "description": promo.description || promo.subtitle || "Описание будет доступно позже",
        "url": promo.landing_url || promo.link || promo.url || "",
        "category": promo.category || "другие",
        "priceCurrency": promo.discount_amount ? "RUB" : undefined,
        "discount": promo.discount_percent ? `${promo.discount_percent}%` : promo.discount_amount ? `${promo.discount_amount} RUB` : undefined,
        "validThrough": promo.valid_until || promo.expiry_date || undefined,
        "offeredBy": {
            "@type": "Organization",
            "name": promo.advertiser_info || "Партнёр Serpmonn"
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
    select.innerHTML = '<option value="">Все категории</option>';
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = categoryLabels[category] || category.charAt(0).toUpperCase() + category.slice(1);
        select.appendChild(option);
    });
}

function updateCountrySelect(countries) {
    const select = elements.countrySelect;
    if (!select) return;
    select.innerHTML = '<option value="">Все страны</option>';
    countries.forEach(country => {
        if (countryLabels[country]) {
            const option = document.createElement('option');
            option.value = country;
            option.textContent = countryLabels[country];
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
        elements.sortButton.innerHTML = 'Сортировка по сроку';
        elements.sortButton.setAttribute('aria-label', 'Сортировать по сроку действия');
    }
    
    filterPromos();
}

function renderPromocodes() {
    const catalog = elements.catalog;
    if (!catalog) return;

    catalog.innerHTML = '';

    currentPage = 1;
    isLoadingMore = false;
    hasMore = true;

    if (filteredPromocodes.length === 0) {
        catalog.innerHTML = `
            <div class="no-results">
                <h3>Промокоды не найдены</h3>
                <p>Попробуйте изменить параметры поиска или обновить данные</p>
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
        const card = createPromoCard(promo, Boolean(promo.is_top));
        catalog.appendChild(card);
    });

    insertInfeedAdsIntoCatalog(catalog, window.innerWidth < 768 ? 10 : 5);
    lazyLoadImages();
    lazyLoadAds();

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
        bonusText = `Скидка ${promo.discount_percent}%`;
    } else if (promo.discount_amount) {
        bonusText = isSberCard ? `Сертификат на ${promo.discount_amount}₽` : `Скидка ${promo.discount_amount}₽`;
    } else {
        bonusText = 'Без промокода';
    }

    const detailsContent = escapeHtml(promo.description || promo.groupDescription || 'Описание будет доступно позже');
    
    const landingUrl = promo.landing_url || promo.link || promo.url;

    card.innerHTML = `
        <div class="promo-card-content">
            <div class="promo-header">
                <img src="${promo.image_url || '/frontend/images/skidki-i-akcii.png'}" 
                     data-src="${promo.image_url || '/frontend/images/skidki-i-akcii.png'}" 
                     alt="${titleText}" width="80" height="80" loading="lazy" class="lazy-load">
                <h3 title="${escapeHtml(getPromoTitle(promo))}">${titleText}</h3>
            </div>
            ${promo.promocode ? `
                <p class="code">${escapeHtml(promo.promocode)} 
                    <button class="submit-btn copy-btn" type="button" aria-label="Скопировать промокод ${escapeHtml(promo.promocode)}">Копировать</button>
                </p>
            ` : ''}
            <p class="bonus-info">${escapeHtml(bonusText)}</p>
            <button type="button" class="details-btn" aria-expanded="false" aria-controls="${detailsId}" tabindex="0">
                <span class="details-icon">▼</span>
                <span class="details-text">Подробнее</span>
            </button>
            <div class="details-content" id="${detailsId}" style="display: none; margin-top: 8px; padding: 8px; background: #f9f9f9; border-radius: 4px;">
                ${detailsContent}
            </div>
            ${promo.conditions ? `<p><strong>Условия:</strong> ${escapeHtml(promo.conditions)}</p>` : ''}
            <p class="country">Страна: ${escapeHtml(promo.country || 'Россия')}</p>
            <p class="expiry ${isExpired ? 'expired' : ''}">
                Действует до: ${formatDate(expiryDate)}
                ${isExpired ? ' (Истёк)' : ''}
            </p>
        </div>
        <div class="promo-card-footer">
            ${landingUrl ? `
                <div class="promo-footer-actions">
                    <a href="${escapeHtml(landingUrl)}" target="_blank" class="register-link use-btn">Использовать</a>
                    <button 
                        type="button" 
                        class="promo-share-button" 
                        aria-label="Поделиться этим промокодом">
                        <span class="promo-share-icon">⤴</span>
                    </button>
                </div>
            ` : ''}
            ${promo.advertiser_info ? `
                <p class="ad">Реклама. ${escapeHtml(promo.advertiser_info)}</p>
            ` : ''}
        </div>
    `;

    if (landingUrl) {
        card.dataset.landingUrl = landingUrl;
    }

    if (landingUrl) {
        card.addEventListener('click', (e) => {
            const interactiveElements = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'];
            const isInteractive = e.target.closest('button') || 
                                 e.target.closest('a') || 
                                 e.target.closest('.details-content') ||
                                 interactiveElements.includes(e.target.tagName);
            
            if (!isInteractive) {
                window.open(landingUrl, '_blank');
                
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

            const shareUrl = `${window.location.origin}/promo?code=${encodeURIComponent(codeParam)}`;
            sharePromo(promo, shareUrl);
        });
    }

    return card;
}

function formatDate(date) {
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function updateStats(stats) {
    if (!stats) return;
    if (elements.totalPromos) elements.totalPromos.textContent = stats.total ?? 0;
    if (elements.activePromos) elements.activePromos.textContent = stats.active ?? stats.total ?? 0;
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
        elements.lastUpdate.textContent = new Date(newDate).toLocaleString('ru-RU', { 
            dateStyle: 'short', 
            timeStyle: 'medium'
        });
        return;
    }
    const date = new Date(lastUpdate);
    if (isNaN(date.getTime())) {
        const newDate = new Date().toISOString();
        localStorage.setItem(API_CONFIG.lastUpdateKey, newDate);
        elements.lastUpdate.textContent = new Date(newDate).toLocaleString('ru-RU', { 
            dateStyle: 'short', 
            timeStyle: 'medium'
        });
        return;
    }
    elements.lastUpdate.classList.add('updating');
    elements.lastUpdate.textContent = '';
    elements.lastUpdate.textContent = date.toLocaleString('ru-RU', { 
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
        const promoCategory = promo.category || 'другие';
        const promoCountry = promo.country || 'Россия';
        const matchesSearch = title.includes(search) || description.includes(search) || search === '';
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
            const aIsTop = topBrands.some(brand => 
                a.title.toLowerCase().includes(brand.toLowerCase())
            );
            const bIsTop = topBrands.some(brand => 
                b.title.toLowerCase().includes(brand.toLowerCase())
            );

            if (aIsTop && !bIsTop) return -1;
            if (!aIsTop && bIsTop) return 1;

            if (aIsTop && bIsTop) {
                const indexA = topBrands.findIndex(brand => 
                    a.title.toLowerCase().includes(brand.toLowerCase())
                );
                const indexB = topBrands.findIndex(brand => 
                    b.title.toLowerCase().includes(brand.toLowerCase())
                );
                return indexA - indexB;
            }

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

    renderPromocodes();
    
    const noResultsMessage = document.querySelector('.no-results');
    if (filteredPromocodes.length === 0 && (search !== '' || category !== '' || status !== '' || country !== '')) {
        if (!noResultsMessage) {
            const message = document.createElement('div');
            message.className = 'no-results';
            message.innerHTML = '<h3>Промокоды не найдены</h3><p>Попробуйте изменить параметры поиска</p>';
            elements.catalog.prepend(message);
        }
    } else if (noResultsMessage) {
        noResultsMessage.remove();
    }
    const resultCountContainer = document.getElementById('promocodes-result-count');
    if (resultCountContainer) {
        resultCountContainer.innerHTML = '';
        const resultCount = document.createElement('p');
        resultCount.textContent = `Найдено промокодов: ${filteredPromocodes.length}`;
        resultCount.className = 'result-count';
        resultCountContainer.appendChild(resultCount);
    }
}

function copyToClipboard(promo, btn) {
    const text = promo.promocode || promo.code || String(promo);

    const onSuccess = async () => {
        showToast('Код скопирован!', 'success');

        if (btn) {
            const originalText = btn.textContent;
            btn.textContent = 'Скопировано ✓';
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
        elements.sortButton.innerHTML = `Сортировка ${sortAscending ? '↑' : '↓'}`;
        elements.sortButton.setAttribute('aria-label', `Сортировать по сроку действия, текущий порядок: ${sortAscending ? 'восходящий' : 'нисходящий'}`);
    }
}

function toggleFilters(button) {
    const content = elements.filtersContent;
    if (content) {
        const isExpanded = content.style.display === 'block';
        content.style.display = isExpanded ? 'none' : 'block';
        button.setAttribute('aria-expanded', !isExpanded);
        button.textContent = isExpanded ? 'Фильтры' : 'Скрыть фильтры';
    }
}

function lazyLoadImages() {
    const images = document.querySelectorAll('img.lazy-load');
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.classList.remove('lazy-load');
                observer.unobserve(img);
            }
        });
    }, { rootMargin: '100px' });
    images.forEach(img => observer.observe(img));
}

function lazyLoadAds() {
    const ads = document.querySelectorAll('.promo-ad-inline');
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const ad = entry.target;
                const ins = ad.querySelector('ins.mrg-tag');
                if (ins && !ins.dataset.loaded) {
                    ins.dataset.loaded = 'true';
                    (window.MRGtag = window.MRGtag || []).push({});
                    collapseAdIfNoFill(ad, 1500);
                }
                observer.unobserve(ad);
            }
        });
    }, { rootMargin: '200px' });
    ads.forEach(ad => observer.observe(ad));
}

document.querySelector('.bonus form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = e.target.querySelector('input[name="email"]').value;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const messageEl = document.createElement('p');
    messageEl.className = 'message';
    if (!emailRegex.test(email)) {
        messageEl.textContent = 'Введите корректный email';
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
        messageEl.textContent = result.message || 'Спасибо за подписку!';
        messageEl.style.color = '#28a745';
        e.target.appendChild(messageEl);
        e.target.reset();
        setTimeout(() => messageEl.remove(), 3000);
    } catch (error) {
        logError('Ошибка подписки', error);
        messageEl.textContent = error.message.includes('HTTP error')
            ? `Ошибка сервера: ${error.message}`
            : 'Ошибка при подписке. Попробуйте позже.';
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
  startAutoUpdate();

  const urlParams = new URLSearchParams(window.location.search);
  const urlSearch = urlParams.get('search');
  if (urlSearch) {
    elements.searchInput.value = urlSearch;
  }

  filterPromos();

  if (elements.refreshBtn) {
    elements.refreshBtn.addEventListener('click', async () => {
      await refreshPromocodes();
    });
  }

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
            const lang = document.documentElement.lang || 'ru-RU';
            const formatted = raw.toLocaleString(lang);

            const numEl = el.querySelector('#subCount');
            if (numEl) {
                // Идеальный вариант — если в HTML есть <span id="subCount">
                numEl.textContent = formatted;
            } else {
                // Fallback — заменяем первое число в тексте span
                el.textContent = el.textContent.replace(/[\d][\d\u00A0\s,.]*/, formatted);
            }
        } catch (err) {
            console.error('Failed to fetch subscribers count', err);
            // span остаётся нетронутым — хардкод из HTML виден пользователю
        }
    }
});

function toggleDetails(button) {
    const content = button.nextElementSibling;
    if (content && content.classList.contains('details-content')) {
        const isExpanded = content.style.display === 'block';
        content.style.display = isExpanded ? 'none' : 'block';
        button.setAttribute('aria-expanded', !isExpanded);
        const textSpan = button.querySelector('.details-text');
        if (textSpan) textSpan.textContent = isExpanded ? 'Подробнее' : 'Скрыть';
        button.querySelector('.details-icon').textContent = isExpanded ? '▼' : '▲';
    }
}

window.addEventListener('beforeunload', () => {
    stopAutoUpdate();
});

const adCache = new Map();
function createInlineAd() {
    const adId = `ad-${Math.random().toString(36).substr(2, 9)}`;
    if (adCache.has(adId)) return adCache.get(adId).cloneNode(true);
    const wrap = document.createElement('div');
    wrap.className = "promo-ad-inline";
    wrap.style.textAlign = "center";
    wrap.style.margin = "12px 0";
    wrap.innerHTML = `
        <ins class="mrg-tag"
             style="display:inline-block;width:100%;max-width:300px;height:250px"
             data-ad-client="ad-1898023"
             data-ad-slot="1898023"
             data-adaptive="true">
        </ins>`;
    adCache.set(adId, wrap);
    return wrap.cloneNode(true);
}

function insertInfeedAdsIntoCatalog(catalog, interval) {
    if (!catalog) return;
    catalog.querySelectorAll('.promo-ad-inline').forEach(el => el.remove());
    const cards = Array.from(catalog.querySelectorAll('.promo-card'));
    if (!cards.length) return;
    const step = interval || 5;
    for (let i = step; i < cards.length; i += step) {
        const afterCard = cards[i - 1];
        if (afterCard && afterCard.parentNode) {
            const ad = createInlineAd();
            afterCard.parentNode.insertBefore(ad, afterCard.nextSibling);
        }
    }
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
            } else {
                container.style.display = 'none';
                logError('Реклама не загрузилась', new Error(`Ad failed to load: client=${ins.dataset.adClient}, slot=${ins.dataset.adSlot}`));
            }
        }, t);
    } catch (error) {
        logError('Ошибка проверки рекламы', error);
        container.style.display = 'none';
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
    overlay.setAttribute('aria-label', 'Поделиться промокодом');

    overlay.innerHTML = `
        <div class="share-popup">
            <button class="share-popup__close" aria-label="Закрыть">&times;</button>
            <p class="share-popup__title">Поделиться промокодом</p>
            <p class="share-popup__promo-name"></p>
            <div class="share-networks">
                <a class="share-network-btn" id="sn-vk" href="#" target="_blank" rel="noopener noreferrer" aria-label="ВКонтакте">
                    <span class="sn-icon sn-icon--vk">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M13.162 18.994c.609 0 .85-.407.84-1.024-.032-1.82.614-2.737 2.066-1.26 1.64 1.67 1.986 2.284 3.408 2.284h2.742c.814 0 1.143-.27.95-.8-.48-1.327-4.297-5.17-4.056-5.512.222-.317 3.347-4.596 3.604-5.664.13-.54-.1-.8-.72-.8H18.22c-.69 0-.91.38-1.14.96-1.048 2.7-2.86 5.073-3.57 4.633-.69-.424-.52-2.686-.484-4.252.02-.75.013-1.557-.746-1.738-.518-.124-1.26-.108-1.76-.108-1.47 0-2.67.5-2.018 1.36.49.643.637 1.934.44 4.26-.26 3.117-3.148-.95-4.29-4.17-.285-.81-.567-1.25-1.3-1.25H1.616c-.777 0-.932.366-.72.972 1.37 3.956 5.87 12.638 12.266 12.11z"/></svg>
                    </span>
                    ВКонтакте
                </a>
                <a class="share-network-btn" id="sn-tg" href="#" target="_blank" rel="noopener noreferrer" aria-label="Telegram">
                    <span class="sn-icon sn-icon--tg">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8l-1.68 7.92c-.12.56-.46.7-.93.44l-2.58-1.9-1.24 1.2c-.14.14-.26.26-.52.26l.18-2.6 4.74-4.28c.2-.18-.04-.28-.32-.1L7.92 13.8l-2.52-.79c-.54-.17-.56-.54.12-.8l9.84-3.8c.46-.16.86.11.28.39z"/></svg>
                    </span>
                    Telegram
                </a>
                <a class="share-network-btn" id="sn-ok" href="#" target="_blank" rel="noopener noreferrer" aria-label="Одноклассники">
                    <span class="sn-icon sn-icon--ok">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 1C5.925 1 1 5.925 1 12s4.925 11 11 11 11-4.925 11-11S18.075 1 12 1zm0 4.5a3.5 3.5 0 110 7 3.5 3.5 0 010-7zm3.75 9.25c.47.47.47 1.23 0 1.7l-1.9 1.9c.52.14 1.05.23 1.6.27.66.05 1.16.62 1.11 1.28-.05.66-.62 1.16-1.28 1.11-1.45-.11-2.82-.62-3.98-1.44-1.16.82-2.53 1.33-3.98 1.44-.66.05-1.23-.45-1.28-1.11-.05-.66.45-1.23 1.11-1.28.55-.04 1.08-.13 1.6-.27l-1.9-1.9c-.47-.47-.47-1.23 0-1.7.47-.47 1.23-.47 1.7 0L12 16.54l2.05-2.04c.47-.47 1.23-.47 1.7.25z"/></svg>
                    </span>
                    ОК
                </a>
                <a class="share-network-btn" id="sn-email" href="#" aria-label="Email">
                    <span class="sn-icon sn-icon--email">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                    </span>
                    Email
                </a>
            </div>
            <div class="share-popup__url-row">
                <input type="text" class="share-popup__url-input" readonly aria-label="Ссылка на промокод">
                <button class="share-popup__copy-btn" type="button">Копировать</button>
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
        btn.textContent = 'Скопировано ✓';
        btn.classList.add('copied');
        showToast('Ссылка скопирована!', 'success');
        setTimeout(() => {
            btn.textContent = 'Копировать';
            btn.classList.remove('copied');
        }, 2000);
    });

    return overlay;
}

function openSharePopup(promo, url) {
    const overlay = getOrCreateShareOverlay();
    const promoName = promo?.title || promo?.name || 'промокод';
    const shareText = `Нашёл рабочий промокод на ${promoName}`;

    overlay.querySelector('.share-popup__promo-name').textContent = promoName;
    overlay.querySelector('.share-popup__url-input').value = url;

    const enc = encodeURIComponent;
    overlay.querySelector('#sn-vk').href =
        `https://vk.com/share.php?url=${enc(url)}&title=${enc(shareText)}`;
    overlay.querySelector('#sn-tg').href =
        `https://t.me/share/url?url=${enc(url)}&text=${enc(shareText)}`;
    overlay.querySelector('#sn-ok').href =
        `https://connect.ok.ru/offer?url=${enc(url)}&title=${enc(shareText)}`;
    overlay.querySelector('#sn-email').href =
        `mailto:?subject=${enc('Промокод от Serpmonn')}&body=${enc(shareText + '\n\n' + url)}`;

    overlay.classList.add('visible');
    overlay.querySelector('.share-popup__close').focus();
}

function closeSharePopup() {
    const overlay = document.getElementById('share-popup-overlay');
    if (overlay) overlay.classList.remove('visible');
}

async function sharePromo(promo, url) {
    const title = 'Промокод от Serpmonn';
    const text = `Нашёл рабочий промокод на ${promo?.title || promo?.name || 'Serpmonn'}`;

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
