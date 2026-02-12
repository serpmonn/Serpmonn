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

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
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
                // КОММЕНТАРИЙ: Промокод Шерри был закомментирован по требованию
                /*
                allPromocodes.unshift({
                    id: 'manual-sherry-001',
                    title: 'Шерри - Промокоды и бонусы',
                    description: 'Экономия на покупках! Установи приложение Шерри, зарегистрируйся с промокодом U9H9 и получи 100 ₽ на счёт. Промокоды для популярных сервисов и магазинов ждут тебя!',
                    promocode: 'U9H9',
                    discount_percent: null,
                    discount_amount: 100,
                    bonus_description: 'Бонус 100 ₽ при регистрации',
                    valid_until: '2035-12-31T23:59:59',
                    landing_url: 'https://sharry.prfl.me/sites/etztqv?erid=2VtzqvZcE2u',
                    image_url: '/frontend/images/sherry-promo.png',
                    conditions: 'Зарегистрируйтесь в приложении Шерри и введите промокод при регистрации.',
                    advertiser_info: 'Реклама ООО «Перфлюенс» ИНН: 7725380313, 6+ erid: 2VtzqwuxWPn',
                    category: 'сервисы',
                    country: 'Россия',
                    is_top: true,
                    created_at: new Date().toISOString(),
                    groupDescription: 'Экономия, скидки, популярные бренды в одном приложении! Совершай покупки с промокодами и получай реальные деньги.'
                });
                */
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
        // КОММЕНТАРИЙ: Промокод Шерри был закомментирован по требованию
        /*
        allPromocodes.unshift({
            id: 'manual-sherry-001',
            title: 'Шерри - Промокоды и бонусы',
            description: 'Экономия на покупках! Установи приложение Шерри, зарегистрируйся с промокодом U9H9 и получи 100 ₽ на счёт. Промокоды для популярных сервисов и магазинов ждут тебя!',
            promocode: 'U9H9',
            discount_percent: null,
            discount_amount: 100,
            bonus_description: 'Бонус 100 ₽ при регистрации',
            valid_until: '2035-12-31T23:59:59',
            landing_url: 'https://sharry.prfl.me/sites/f4jzit?erid=2VtzqvJaEWT',
            image_url: '/frontend/images/sherry-promo.png',
            conditions: 'Зарегистрируйтесь в приложении Шерри и введите промокод при регистрации.',
            advertiser_info: 'Реклама ООО «Перфлюенс» ИНН: 7725380313, 6+ erid: 2VtzqwuxWPn',
            category: 'сервисы',
            country: 'Россия',
            is_top: false,
            created_at: new Date().toISOString(),
            groupDescription: 'Экономия, скидки, популярные бренды в одном приложении! Совершай покупки с промокодами и получай реальные деньги.'
        });
        */
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
                    <button class="submit-btn copy-btn" onclick="copyToClipboard('${escapeHtml(promo.promocode)}')" aria-label="Скопировать промокод ${escapeHtml(promo.promocode)}">Копировать</button>
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
                <a href="${escapeHtml(landingUrl)}" target="_blank" class="register-link use-btn">Использовать</a>
            ` : ''}
            ${promo.advertiser_info ? `
                <p class="ad">Реклама. ${escapeHtml(promo.advertiser_info)}</p>
            ` : ''}
        </div>
    `;

    // Сохраняем URL в data-атрибут для обработки клика по карточке
    if (landingUrl) {
        card.dataset.landingUrl = landingUrl;
    }

    // Обработчик для клика по карточке
    if (landingUrl) {
        card.addEventListener('click', (e) => {
            // Проверяем, что клик был не по интерактивным элементам
            const interactiveElements = ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'];
            const isInteractive = e.target.closest('button') || 
                                 e.target.closest('a') || 
                                 e.target.closest('.details-content') ||
                                 interactiveElements.includes(e.target.tagName);
            
            if (!isInteractive) {
                window.open(landingUrl, '_blank');
                
                // Трекинг клика
                try {
                    fetch('/api/track-click', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                            promocode: promo.promocode, 
                            url: landingUrl,
                            source: 'card_click'
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
            e.stopPropagation(); // Предотвращаем срабатывание клика по карточке
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
    if (copyBtn) {
        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Предотвращаем срабатывание клика по карточке
        });
    }

    const useBtn = card.querySelector('.use-btn');
    if (useBtn) {
        useBtn.addEventListener('click', async (e) => {
            e.stopPropagation(); // Предотвращаем срабатывание клика по карточке
            try {
                await fetch('/api/track-click', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        promocode: promo.promocode, 
                        url: landingUrl,
                        source: 'button_click'
                    })
                });
            } catch (error) {
                logError('Ошибка трекинга клика', error);
            }
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

    // ЕДИНАЯ СОРТИРОВКА
    if (!isSortedByExpiry) {
        // Сортировка по умолчанию: сначала топ-бренды по порядку в массиве, затем остальные по дате
        filteredPromocodes.sort((a, b) => {
            const aIsTop = topBrands.some(brand => 
                a.title.toLowerCase().includes(brand.toLowerCase())
            );
            const bIsTop = topBrands.some(brand => 
                b.title.toLowerCase().includes(brand.toLowerCase())
            );

            // Топ бренды сначала
            if (aIsTop && !bIsTop) return -1;
            if (!aIsTop && bIsTop) return 1;

            // Если оба топ - сортируем по порядку в массиве topBrands
            if (aIsTop && bIsTop) {
                const indexA = topBrands.findIndex(brand => 
                    a.title.toLowerCase().includes(brand.toLowerCase())
                );
                const indexB = topBrands.findIndex(brand => 
                    b.title.toLowerCase().includes(brand.toLowerCase())
                );
                return indexA - indexB;
            }

            // Если оба не топ - сортируем по дате (от ближайшей к дальнейшей)
            const dateA = new Date(a.valid_until || a.expiry_date || '9999-12-31');
            const dateB = new Date(b.valid_until || b.expiry_date || '9999-12-31');
            return dateA - dateB;
        });
    } else {
        // Сортировка по сроку действия
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
    resultCountContainer.innerHTML = '';
    const resultCount = document.createElement('p');
    resultCount.textContent = `Найдено промокодов: ${filteredPromocodes.length}`;
    resultCount.className = 'result-count';
    resultCountContainer.appendChild(resultCount);

    if (country) {
        fetch('/track-filter', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filter: 'country', value: country })
        }).then(response => {
            if (!response.ok) {
                throw new Error(`Ошибка трекинга фильтра: ${response.status} ${response.statusText}`);
            }
            return response.json();
        }).then(data => {
            console.log('[Client] Трекинг фильтра успешен:', data);
        }).catch(error => {
            console.error('[Client] Ошибка трекинга фильтра:', error);
            logError('Ошибка трекинга фильтра', error);
        });
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(async () => {
        showToast('Код скопирован!', 'success');
        try {
            await fetch('/api/track-copy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ promocode: text, timestamp: new Date().toISOString() })
            });
        } catch (error) {
            logError('Ошибка трекинга копирования', error);
        }
    }).catch(() => {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('Код скопирован!', 'success');
    });
}

function sortByExpiry() {
    isSortedByExpiry = true;
    sortAscending = !sortAscending;
    localStorage.setItem('promo_sort_by_expiry', 'true');
    localStorage.setItem('promo_sort_ascending', sortAscending ? 'true' : 'false');
    
    // Применить новую сортировку
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