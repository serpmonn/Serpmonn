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

// ===== SHARE TOAST =====
let _shareToastEl = null;
let _shareToastTimer = null;

function showShareToast(msg) {
    if (!_shareToastEl) {
        _shareToastEl = document.createElement('div');
        _shareToastEl.className = 'share-toast';
        document.body.appendChild(_shareToastEl);
    }
    _shareToastEl.textContent = msg;
    _shareToastEl.classList.add('visible');
    clearTimeout(_shareToastTimer);
    _shareToastTimer = setTimeout(() => {
        _shareToastEl.classList.remove('visible');
    }, 2500);
}
// ===== /SHARE TOAST =====

// ===== SHARE BUTTON VISUAL FEEDBACK =====
function applyShareSuccess(btn) {
    const originalHTML = btn.innerHTML;
    btn.setAttribute('data-shared', '1');
    btn.innerHTML = '<span class="promo-share-icon">✓</span>';
    setTimeout(() => {
        btn.removeAttribute('data-shared');
        btn.innerHTML = originalHTML;
    }, 2000);
}

function addShareRipple(btn, e) {
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement('span');
    ripple.className = 'share-ripple';
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size/2}px;top:${e.clientY - rect.top - size/2}px`;
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
}
// ===== /SHARE BUTTON VISUAL FEEDBACK =====

async function sharePromo(promo, url, btn) {
    const title = getPromoTitle(promo);
    const text = promo.bonus_description
        || (promo.discount_percent ? `Скидка ${promo.discount_percent}%` : '')
        || (promo.discount_amount  ? `Скидка ${promo.discount_amount}₽` : '')
        || 'Промокод';

    const shareData = { title, text, url };

    try {
        if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
            await navigator.share(shareData);
        } else {
            await navigator.clipboard.writeText(url);
            showShareToast('🔗 Ссылка скопирована!');
        }
        if (btn) applyShareSuccess(btn);
    } catch (err) {
        if (err.name !== 'AbortError') {
            // фоллбэк: просто копируем
            try {
                await navigator.clipboard.writeText(url);
                showShareToast('🔗 Ссылка скопирована!');
                if (btn) applyShareSuccess(btn);
            } catch (_) {
                showShareToast('⚠️ Не удалось скопировать ссылку');
            }
        }
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
        </div>
    `;

    // ===== НАВЕШИВАЕМ ОБРАБОТЧИКИ =====
    const shareBtn = card.querySelector('.promo-share-button');
    if (shareBtn && landingUrl) {
        shareBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            addShareRipple(shareBtn, e);
            const shareUrl = landingUrl.startsWith('http') ? landingUrl : `https://serpmonn.ru${landingUrl}`;
            sharePromo(promo, shareUrl, shareBtn);
        });
    }

    const copyBtn = card.querySelector('.copy-btn');
    if (copyBtn && promo.promocode) {
        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            copyPromoCode(promo.promocode, copyBtn, promo);
        });
    }

    const detailsBtn = card.querySelector('.details-btn');
    const detailsContent = card.querySelector(`#${detailsId}`);
    if (detailsBtn && detailsContent) {
        detailsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const expanded = detailsBtn.getAttribute('aria-expanded') === 'true';
            detailsBtn.setAttribute('aria-expanded', String(!expanded));
            detailsContent.style.display = expanded ? 'none' : 'block';
        });
    }

    if (landingUrl) {
        card.addEventListener('click', (e) => {
            if (!e.target.closest('button') && !e.target.closest('a')) {
                window.open(landingUrl, '_blank', 'noopener,noreferrer');
            }
        });
    }

    return card;
}
