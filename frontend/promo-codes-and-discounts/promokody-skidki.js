// Конфигурация API (теперь используем наш бэкенд)
const API_CONFIG = {
    baseUrl: '/api/promocodes',
    updateInterval: 30 * 60 * 1000, // 30 минут
    lastUpdateKey: 'serpmonn_promocodes_last_update'
};

// Глобальные переменные
let debounceTimeout;
let allPromocodes = []; // Все промокоды из API
let filteredPromocodes = []; // Отфильтрованные промокоды
let updateTimer = null;

// Упрощённый выбор названия: используем только name из API (Perfluence)
function getPromoTitle(promo) {
    if (promo && typeof promo.name === 'string' && promo.name.trim() !== '') {
        return promo.name.trim();
    }
    // Фолбэк: домен из landing_url, если есть
    try {
        const url = promo?.landing_url || promo?.link || promo?.url;
        if (url) {
            const u = new URL(url, location.origin);
            return u.hostname.replace(/^www\./, '');
        }
    } catch (_) {}
    return 'Предложение партнёра';
}

// Нормализация полей промокода из разных источников API в единый формат
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

    // Название (через универсальный резолвер поверх нормализации)
    norm.title = getPromoTitle(raw);

    // Описание
    norm.description = pickFromContainers(['description', 'subtitle', 'details', 'text']);

    // Промокод
    norm.promocode = pickFromContainers(['promocode', 'promo_code', 'code', 'coupon', 'coupon_code']);

    // Ссылка посадочная
    norm.landing_url = pickFromContainers(['landing_url', 'link', 'url', 'landing', 'target_url']);

    // Изображение
    norm.image_url = pickFromContainers(['image_url', 'image', 'picture', 'logo', 'logo_url', 'icon']);

    // Категория
    norm.category = pickFromContainers(['category', 'group', 'project', 'type', 'segment']) || 'другие';

    // Скидки
    const percentRaw = pickFromContainers(['discount_percent', 'percent', 'percentage', 'discountPercentage']);
    const amountRaw = pickFromContainers(['discount_amount', 'amount', 'value', 'discountValue']);
    norm.discount_percent = percentRaw ? Number(String(percentRaw).replace(/[^0-9.,]/g, '').replace(',', '.')) : undefined;
    norm.discount_amount = amountRaw ? Number(String(amountRaw).replace(/[^0-9.,]/g, '').replace(',', '.')) : undefined;

    // Срок действия
    const expiry = pickFromContainers(['valid_until', 'expiry_date', 'date_end', 'valid_to', 'end_date', 'expires_at']);
    norm.expiry_date = expiry || norm.expiry_date;

    // Рекламодатель / юридическая информация
    const adv = pickFromContainers(['advertiser_info', 'advertiser', 'merchant', 'brand']);
    if (!norm.advertiser_info && adv) {
        norm.advertiser_info = adv;
    }

    return norm;
}

// Функция для загрузки промокодов из нашего API
async function loadPromocodesFromAPI() {
    try {
        console.log('Загружаю промокоды из API Serpmonn...');
        
        const response = await fetch(API_CONFIG.baseUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP ошибка! Статус: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Получены данные от API:', result);
        
        if (result.status === 'success' && Array.isArray(result.data)) {
            // Используем данные как есть, без нормализации
            allPromocodes = result.data;
            filteredPromocodes = [...allPromocodes];
            
            // Сохраняем время последнего обновления
            localStorage.setItem(API_CONFIG.lastUpdateKey, new Date().toISOString());
            
            // Обновляем статистику
            updateStats(result.stats);
            
            // Обновляем отображение
            renderPromocodes();
            
            // Показываем уведомление об успешном обновлении
            showToast('Промокоды успешно обновлены!', 'success');
            
            return true;
        } else {
            throw new Error('Неверный формат данных от API');
        }
    } catch (error) {
        console.error('Ошибка при загрузке промокодов:', error);
        showToast(`Ошибка загрузки: ${error.message}`, 'error');
        return false;
    }
}

// Функция для принудительного обновления промокодов
async function refreshPromocodes() {
    try {
        const response = await fetch(`${API_CONFIG.baseUrl}/refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ошибка! Статус: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.status === 'success') {
            // Перезагружаем промокоды
            await loadPromocodesFromAPI();
            showToast(result.message, 'success');
        } else {
            showToast(result.message || 'Ошибка при обновлении', 'error');
        }
        
    } catch (error) {
        console.error('Ошибка при принудительном обновлении:', error);
        showToast(`Ошибка обновления: ${error.message}`, 'error');
    }
}

// Функция для отображения промокодов
function renderPromocodes() {
    const catalog = document.getElementById('catalog');
    if (!catalog) return;
    
    // Очищаем каталог
    catalog.innerHTML = '';
    
    if (filteredPromocodes.length === 0) {
        catalog.innerHTML = `
            <div class="no-results">
                <h3>Промокоды не найдены</h3>
                <p>Попробуйте изменить параметры поиска или обновить данные</p>
            </div>
        `;
        return;
    }
    
    // Сортируем промокоды по дате истечения
    const sortedPromocodes = [...filteredPromocodes].sort((a, b) => {
        const dateA = new Date(a.valid_until || a.expiry_date || '9999-12-31');
        const dateB = new Date(b.valid_until || b.expiry_date || '9999-12-31');
        return dateA - dateB;
    });
    
    // Показываем ВСЕ промокоды один-в-один (без группировки и фильтров)
    sortedPromocodes.forEach(promo => {
        const isTop = Boolean(promo.is_top);
        catalog.appendChild(createPromoCard(promo, isTop));
    });

}

// Функция для группировки промокодов по категориям
function groupPromocodesByCategory(promocodes) {
    const groups = {
        top: [],
        еда: [],
        продукты: [],
        развлечения: [],
        товары: [],
        услуги: [],
        другие: []
    };
    
    promocodes.forEach(promo => {
        // Используем категорию, определенную на бэкенде
        const category = promo.category || 'другие';
        
        // Определяем топ-офферы
        if (promo.is_top) {
            groups.top.push(promo);
        } else {
            if (groups[category]) {
                groups[category].push(promo);
            } else {
                groups.другие.push(promo);
            }
        }
    });
    
    return groups;
}

// Функция для создания карточки промокода
function createPromoCard(promo, isTopOffer = false) {
    const card = document.createElement('div');
    card.className = `promo-card ${isTopOffer ? 'top-offer' : ''}`;
    card.dataset.category = promo.category || 'другие';
    card.dataset.expiry = promo.valid_until || promo.expiry_date || '9999-12-31';

    const titleText = getPromoTitle(promo);

    const discountText = promo.discount_percent ? 
        `Скидка ${promo.discount_percent}%` : 
        promo.discount_amount ? `Скидка ${promo.discount_amount} ₽` : 'Скидка';

    const expiryDate = new Date(promo.valid_until || promo.expiry_date || '9999-12-31');

    const isExpired = expiryDate < new Date();

    card.innerHTML = `
        <div class="promo-card-content">
            <img src="${promo.image_url || '/images/skidki-i-akcii.png'}" alt="${titleText}" width="50" height="50">

            <div class="tag">${discountText}</div>
            <h3>${titleText}</h3>

            ${promo.promocode ? `
                <p class="code">${promo.promocode} 
                    <button class="submit-btn" onclick="copyToClipboard('${promo.promocode}')">Копировать</button>
                </p>
            ` : ''}
            
            <p>${promo.description || promo.subtitle || 'Описание будет доступно позже'}</p>

            ${promo.conditions ? `<p><strong>Условия:</strong> ${promo.conditions}</p>` : ''}

            <p class="expiry ${isExpired ? 'expired' : ''}">
                Действует до: ${formatDate(expiryDate)}
                ${isExpired ? ' (Истёк)' : ''}
            </p>
        </div>
        
        <div class="promo-card-footer">
            ${promo.landing_url || promo.link || promo.url ? `
                <a href="${promo.landing_url || promo.link || promo.url}" target="_blank" class="register-link">Перейти к партнёру</a>
            ` : ''}
            
            ${promo.advertiser_info ? `
                <p class="ad">Реклама. ${promo.advertiser_info}</p>
            ` : ''}
        </div>
    `;
    
    return card;
}

// Функция для форматирования даты
function formatDate(date) {
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Функция для обновления статистики
function updateStats(stats) {
    if (!stats) return;
    
    const totalElement = document.getElementById('totalPromos');
    const activeElement = document.getElementById('activePromos');
    const expiredElement = document.getElementById('expiredPromos');
    
    if (totalElement) totalElement.textContent = stats.total ?? 0;
    if (activeElement) activeElement.textContent = stats.active ?? stats.total ?? 0;
    if (expiredElement) expiredElement.closest('.stat-item')?.remove();
}

// Функция для показа уведомлений
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    // Показываем уведомление
    setTimeout(() => toast.classList.add('show'), 100);
    
    // Скрываем через 3 секунды
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Функция для обновления времени последнего обновления
function updateLastUpdateTime() {
    const lastUpdate = localStorage.getItem(API_CONFIG.lastUpdateKey);
    const lastUpdateElement = document.getElementById('lastUpdate');
    
    if (lastUpdateElement && lastUpdate) {
        const date = new Date(lastUpdate);
        lastUpdateElement.textContent = date.toLocaleString('ru-RU');
    }
}

// Функция для запуска автоматического обновления
function startAutoUpdate() {
    if (updateTimer) {
        clearInterval(updateTimer);
    }
    
    updateTimer = setInterval(async () => {
        console.log('Автоматическое обновление промокодов...');
        await loadPromocodesFromAPI();
    }, API_CONFIG.updateInterval);
}

// Функция для остановки автоматического обновления
function stopAutoUpdate() {
    if (updateTimer) {
        clearInterval(updateTimer);
        updateTimer = null;
    }
}

// Модифицированная функция фильтрации для работы с API данными
function filterPromos() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const category = document.getElementById('categorySelect')?.value || '';
    
    filteredPromocodes = allPromocodes.filter(promo => {
        const title = (promo && typeof promo.name === 'string' ? promo.name : '').toLowerCase();
        const description = (promo.description || promo.subtitle || '').toLowerCase();
        const promoCategory = promo.category || 'другие';
        
        const matchesSearch = title.includes(search) || description.includes(search) || search === '';
        const matchesCategory = category === '' || promoCategory === category;
        
        return matchesSearch && matchesCategory;
    });
    
    renderPromocodes();
    
    // Показываем сообщение, если ничего не найдено
    const noResultsMessage = document.querySelector('.no-results');
    if (filteredPromocodes.length === 0 && search !== '') {
        if (!noResultsMessage) {
            const message = document.createElement('p');
            message.className = 'no-results';
            message.textContent = 'Ничего не найдено';
            document.getElementById('catalog').prepend(message);
        }
    } else if (noResultsMessage) {
        noResultsMessage.remove();
    }
}

// Функция для копирования в буфер обмена
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('Код скопирован!', 'success');
    }).catch(() => {
        // Fallback для старых браузеров
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showToast('Код скопирован!', 'success');
    });
}

// Функция для сортировки по дате истечения
let sortAscending = true;
function sortByExpiry() {
    const grid = document.getElementById('catalog');
    const cards = Array.from(grid.children);
    
    cards.sort((a, b) => {
        const dateA = new Date(a.dataset.expiry);
        const dateB = new Date(b.dataset.expiry);
        return sortAscending ? dateA - dateB : dateB - dateA;
    });
    
    cards.forEach(card => grid.appendChild(card));
    sortAscending = !sortAscending;
}

// Обработчик формы подписки
document.querySelector('.bonus form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = e.target.querySelector('input[name="email"]').value;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const messageEl = document.createElement('p');
    messageEl.className = 'message';
    
    if (!emailRegex.test(email)) {
        messageEl.textContent = 'Пожалуйста, введите корректный email';
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
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const result = await response.json();
        messageEl.textContent = result.message || 'Спасибо за подписку!';
        messageEl.style.color = '#28a745';
        e.target.appendChild(messageEl);
        e.target.reset();
        setTimeout(() => messageEl.remove(), 3000);
    } catch (error) {
        messageEl.textContent = error.message.includes('HTTP error') 
            ? `Ошибка сервера: ${error.message}` 
            : 'Ошибка при подписке. Попробуйте позже.';
        messageEl.style.color = '#ff5252';
        e.target.appendChild(messageEl);
        setTimeout(() => messageEl.remove(), 3000);
    }
});

// Обработчик поиска
document.getElementById('searchInput')?.addEventListener('input', () => {
    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(filterPromos, 300);
});

// Обработчик изменения категории
document.getElementById('categorySelect')?.addEventListener('change', filterPromos);

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Инициализация страницы промокодов...');
    
    // Загружаем промокоды из API
    await loadPromocodesFromAPI();
    
    // Обновляем время последнего обновления
    updateLastUpdateTime();
    
    // Запускаем автоматическое обновление
    startAutoUpdate();
    
    // Добавляем обработчик для кнопки обновления
    const refreshBtn = document.getElementById('refreshBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.disabled = true;
            refreshBtn.innerHTML = '<i class="icon-refresh"></i> Обновление...';
            
            await refreshPromocodes();
            
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = '<i class="icon-refresh"></i> Обновить';
        });
    }
    
    console.log('Страница промокодов инициализирована');
});

// Очистка при выгрузке страницы
window.addEventListener('beforeunload', () => {
    stopAutoUpdate();
});