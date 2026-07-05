import { t } from '/frontend/scripts/i18n-loader.js';

/**
 * Калькулятор экологического следа продуктов
 */

class EcoFootprintCalculator {
    constructor() {
        this.products = [];
        this.results = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadSavedData();
        this.renderProducts();
    }

    setupEventListeners() {
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('product-select') ||
                e.target.classList.contains('quantity-input')) {
                this.updateUnitDisplay();
            }
        });

        const calculateBtn = document.querySelector('.calculate-btn');
        if (calculateBtn) {
            calculateBtn.addEventListener('click', () => this.calculateFootprint());
        }
    }

    renderProducts() {
        const container = document.getElementById('products-container');
        if (!container) {
            console.error('Элемент products-container не найден');
            return;
        }

        const allProducts = Object.values(ECO_DATABASE);

        let html = `<div class="product-row">
            <select class="product-select" data-product="beef">
                <option value="">${t('calculator.selectProduct')}</option>`;

        allProducts.forEach(product => {
            const productId = Object.keys(ECO_DATABASE).find(key => ECO_DATABASE[key] === product);
            html += `<option value="${productId}">${product.name}</option>`;
        });

        html += `</select>
            <input type="number" class="quantity-input" placeholder="${t('calculator.quantityPlaceholder')}" min="0" step="0.1">
            <span class="unit-display"></span>
            <button class="add-btn" onclick="addProduct()">${t('calculator.addButton')}</button>
        </div>
        <button class="calculate-btn" onclick="calculateFootprint()">
            🌍 ${t('calculator.calculateButton')}
        </button>`;

        container.innerHTML = html;
    }

    getCategoryName(category) {
        const categoryNames = {
            'meat': 'Мясо',
            'dairy': 'Молочные продукты',
            'fish': 'Рыба',
            'seafood': 'Морепродукты',
            'vegetables': 'Овощи',
            'fruits': 'Фрукты',
            'grains': 'Зерновые',
            'legumes': 'Бобовые',
            'nuts': 'Орехи',
            'beverages': 'Напитки',
            'sweets': 'Сладости'
        };
        return categoryNames[category] || category;
    }

    addProduct() {
        const productSelect = document.querySelector('.product-select');
        const quantityInput = document.querySelector('.quantity-input');

        if (!productSelect || !quantityInput) {
            console.error('Элементы формы не найдены');
            return;
        }

        const productId = productSelect.value;
        const quantity = parseFloat(quantityInput.value);

        if (!productId || !quantity || quantity <= 0) {
            alert(t('calculator.selectProductAndQty'));
            return;
        }

        const product = ECO_DATABASE[productId];
        if (!product) {
            console.error('Продукт не найден:', productId);
            return;
        }

        let unit = 'kg';
        if (product.category === 'beverages' || productId === 'milk') {
            unit = 'l';
        } else if (productId === 'eggs' || productId === 'chocolate' || productId === 'sugar') {
            unit = 'g';
        }

        this.products.push({
            id: productId,
            name: product.name,
            quantity: quantity,
            unit: unit
        });

        productSelect.value = '';
        quantityInput.value = '';

        this.displaySelectedProducts();
        this.updateUnitDisplay();
    }

    displaySelectedProducts() {
        const container = document.getElementById('products-container');
        if (this.products.length === 0) return;

        let selectedHtml = '<div class="selected-products"><h3>Выбранные продукты:</h3>';
        this.products.forEach((product, index) => {
            selectedHtml += `<div class="selected-product">
                <span>${product.name} - ${product.quantity} ${product.unit}</span>
                <button onclick="removeSelectedProduct(${index})">Удалить</button>
            </div>`;
        });
        selectedHtml += '</div>';

        const existingSelected = container.querySelector('.selected-products');
        if (existingSelected) existingSelected.remove();
        container.insertAdjacentHTML('beforeend', selectedHtml);
    }

    removeProduct(button) {
        const productRow = button.closest('.product-row');
        productRow.remove();
        this.updateRemoveButtons();
    }

    updateRemoveButtons() {
        const productRows = document.querySelectorAll('.product-row');
        productRows.forEach((row) => {
            const removeBtn = row.querySelector('.remove-btn');
            if (productRows.length > 1) {
                removeBtn.style.display = 'block';
            } else {
                removeBtn.style.display = 'none';
            }
        });
    }

    updateUnitDisplay() {
        const productSelect = document.querySelector('.product-select');
        const unitDisplay = document.querySelector('.unit-display');
        if (!productSelect || !unitDisplay) return;
        const productId = productSelect.value;
        if (!productId) { unitDisplay.textContent = ''; return; }
        const product = ECO_DATABASE[productId];
        if (!product) return;
        let unit = 'кг';
        if (product.category === 'beverages' || productId === 'milk') unit = 'л';
        else if (productId === 'eggs' || productId === 'chocolate' || productId === 'sugar') unit = 'г';
        unitDisplay.textContent = `Единица: ${unit}`;
    }

    async calculateFootprint() {
        if (this.products.length === 0) {
            this.showError(t('calculator.addAtLeastOne'));
            return;
        }
        this.showLoading();
        try {
            const productFootprints = [];
            let totalCarbon = 0, totalWater = 0, totalLand = 0, totalEcoRating = 0;
            this.products.forEach(product => {
                const quantityInKg = convertToKilograms(product.quantity, product.unit, product.id);
                const footprint = calculateProductFootprint(product.id, quantityInKg);
                if (footprint) {
                    productFootprints.push(footprint);
                    totalCarbon += footprint.carbonFootprint;
                    totalWater += footprint.waterFootprint;
                    totalLand += footprint.landFootprint;
                    totalEcoRating += footprint.ecoRating;
                }
            });
            const averageEcoRating = totalEcoRating / productFootprints.length;
            const recommendations = getRecommendations(productFootprints);
            const comparisons = getComparisons(productFootprints);
            this.results = {
                totalCarbon: Math.round(totalCarbon * 100) / 100,
                totalWater: Math.round(totalWater),
                totalLand: Math.round(totalLand * 100) / 100,
                ecoRating: Math.round(averageEcoRating * 10) / 10,
                products: productFootprints,
                recommendations,
                comparisons
            };
            this.displayResults();
            this.saveResults();
        } catch (error) {
            console.error('Ошибка расчета:', error);
            this.showError(t('calculator.calcError'));
        } finally {
            this.hideLoading();
        }
    }

    displayResults() {
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) resultsSection.style.display = 'block';
        this.hideLoading();
        const carbonEl = document.getElementById('carbon-footprint');
        const waterEl = document.getElementById('water-footprint');
        const landEl = document.getElementById('land-footprint');
        const ecoEl = document.getElementById('eco-score');
        if (carbonEl) carbonEl.textContent = this.results.totalCarbon.toFixed(2);
        if (waterEl) waterEl.textContent = this.results.totalWater.toLocaleString();
        if (landEl) landEl.textContent = this.results.totalLand.toFixed(2);
        if (ecoEl) ecoEl.textContent = this.results.ecoRating.toFixed(1);
        this.displayComparisons();
        this.displayRecommendations();
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    displayComparisons() {
        let c = document.getElementById('comparison-results');
        if (!c) {
            const rs = document.getElementById('results-section');
            if (rs) { c = document.createElement('div'); c.id = 'comparison-results'; rs.appendChild(c); }
            else { console.error('Элемент comparison-results не найден'); return; }
        }
        c.innerHTML = '';
        this.results.comparisons.forEach(comparison => {
            const item = document.createElement('div');
            item.className = 'comparison-item';
            item.innerHTML = `
                <div><strong>${comparison.product}</strong><br>
                <small>Текущий след: ${comparison.currentFootprint.toFixed(2)} кг CO₂</small></div>
                <div><strong>Альтернативы:</strong><br>
                <small>${comparison.alternatives.join(', ')}</small><br>
                <small style="color: #2E8B57;">Экономия: ~${comparison.potentialSavings.toFixed(2)} кг CO₂</small></div>`;
            c.appendChild(item);
        });
    }

    displayRecommendations() {
        let r = document.getElementById('recommendations-list');
        if (!r) {
            const rs = document.getElementById('results-section');
            if (rs) { r = document.createElement('div'); r.id = 'recommendations-list'; rs.appendChild(r); }
            else { console.error('Элемент recommendations-list не найден'); return; }
        }
        r.innerHTML = '';
        this.results.recommendations.forEach(rec => {
            const item = document.createElement('div');
            item.className = 'recommendation-item';
            let icon = '💡';
            if (rec.type === 'warning') icon = '⚠️';
            if (rec.type === 'suggestion') icon = '🌱';
            item.innerHTML = `<strong>${icon} ${rec.title}</strong><br><small>${rec.description}</small>`;
            r.appendChild(item);
        });
    }

    showLoading() {
        const rs = document.getElementById('results-section');
        if (!rs) return;
        rs.style.display = 'block';
        let loading = document.getElementById('results-loading');
        if (!loading) {
            loading = document.createElement('div');
            loading.id = 'results-loading';
            loading.className = 'loading';
            loading.innerHTML = `<div class="spinner"></div><p>Рассчитываем экологический след...</p>`;
            rs.appendChild(loading);
        }
        loading.style.display = 'flex';
    }

    hideLoading() {
        const loading = document.getElementById('results-loading');
        if (loading) loading.style.display = 'none';
    }

    showError(message) {
        const rs = document.getElementById('results-section');
        rs.style.display = 'block';
        rs.innerHTML = `<div class="error"><strong>Ошибка:</strong> ${message}</div>`;
    }

    saveResults() {
        if (this.results) {
            localStorage.setItem('ecoFootprintResults', JSON.stringify({
                results: this.results,
                timestamp: new Date().toISOString()
            }));
        }
    }

    loadSavedData() {
        const saved = localStorage.getItem('ecoFootprintResults');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                const savedDate = new Date(data.timestamp);
                if (new Date() - savedDate < 24 * 60 * 60 * 1000) {
                    this.results = data.results;
                    this.displayResults();
                }
            } catch (error) {
                console.error('Ошибка загрузки сохраненных данных:', error);
            }
        }
    }

    shareResults(platform) {
        if (!this.results) {
            alert(t('calculator.calculateFirst'));
            return;
        }
        const text = `Мой экологический след продуктов: ${this.results.totalCarbon} кг CO₂, ${this.results.totalWater.toLocaleString()} л воды. Эко-рейтинг: ${this.results.ecoRating}/10. Рассчитайте свой на SerpMonn!`;
        const url = window.location.href;
        let shareUrl = '';
        switch (platform) {
            case 'vk': shareUrl = `https://vk.com/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent('Калькулятор экологического следа продуктов')}&description=${encodeURIComponent(text)}`; break;
            case 'telegram': shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`; break;
        }
        if (shareUrl) window.open(shareUrl, '_blank', 'width=600,height=400');
    }
}

window.addProduct = function () { if (window.ecoCalculator) window.ecoCalculator.addProduct(); };
window.removeProduct = function (button) { if (window.ecoCalculator) window.ecoCalculator.removeProduct(button); };
window.calculateFootprint = function () { if (window.ecoCalculator) window.ecoCalculator.calculateFootprint(); };
window.shareResults = function (platform) { if (window.ecoCalculator) window.ecoCalculator.shareResults(platform); };
window.removeSelectedProduct = function (index) {
    if (window.ecoCalculator) {
        window.ecoCalculator.products.splice(index, 1);
        window.ecoCalculator.displaySelectedProducts();
        window.ecoCalculator.calculateFootprint();
    }
};

function formatNumber(num) { return num.toLocaleString('ru-RU'); }
function getEcoRatingColor(rating) {
    if (rating >= 8) return '#2E8B57';
    if (rating >= 6) return '#FFA500';
    if (rating >= 4) return '#FF6347';
    return '#DC143C';
}
function getEcoRatingDescription(rating) {
    if (rating >= 8) return 'Отличный экологический выбор!';
    if (rating >= 6) return 'Хороший экологический выбор';
    if (rating >= 4) return 'Умеренное воздействие на экологию';
    return 'Высокое воздействие на экологию';
}

document.addEventListener('DOMContentLoaded', function () {
    const requiredElements = [
        'products-container', 'carbon-footprint', 'water-footprint',
        'land-footprint', 'eco-score', 'results-section',
        'comparison-results', 'recommendations-list'
    ];
    const missing = requiredElements.filter(id => !document.getElementById(id));
    if (missing.length > 0) { console.error('Отсутствуют элементы:', missing); return; }
    window.ecoCalculator = new EcoFootprintCalculator();
    console.log('Калькулятор инициализирован успешно');
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = EcoFootprintCalculator;
}
