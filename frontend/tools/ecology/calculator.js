/**
 * Калькулятор экологического следа продуктов
 * Основная логика и взаимодействие с пользователем
 */

class EcoFootprintCalculator {
    constructor() {
        this.products = [];
        this.results = null;
        this.init();
    }

    init() {
        // Инициализация при загрузке страницы
        this.setupEventListeners();
        this.loadSavedData();
        this.renderProducts();
    }

    setupEventListeners() {
        // Обработчики для динамически добавляемых элементов
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('product-select') || 
                e.target.classList.contains('quantity-input') || 
                e.target.classList.contains('unit-select')) {
                this.updateProductData();
            }
        });

        // Обработчик для кнопки расчета
        const calculateBtn = document.querySelector('.calculate-btn');
        if (calculateBtn) {
            calculateBtn.addEventListener('click', () => this.calculateFootprint());
        }
    }

    /**
     * Отобразить список доступных продуктов
     */
    renderProducts() {
        const container = document.getElementById('products-container');
        
        if (!container) {
            console.error('Элемент products-container не найден');
            return;
        }

        // Получаем все продукты из базы данных
        const allProducts = Object.values(ECO_DATABASE);
        
        // Группируем по категориям
        const categories = {};
        allProducts.forEach(product => {
            if (!categories[product.category]) {
                categories[product.category] = [];
            }
            categories[product.category].push(product);
        });

        // Создаем HTML для каждой категории
        let html = '<h3>Доступные продукты:</h3>';
        
        Object.keys(categories).forEach(category => {
            const categoryName = this.getCategoryName(category);
            html += `<div class="category-section">
                <h4>${categoryName}</h4>
                <div class="products-grid">`;
            
            categories[category].forEach(product => {
                const productId = Object.keys(ECO_DATABASE).find(key => ECO_DATABASE[key] === product);
                html += `<div class="product-card" data-product-id="${productId}">
                    <h5>${product.name}</h5>
                    <p>Углеродный след: ${product.carbonFootprint} кг CO₂/кг</p>
                    <p>Водный след: ${product.waterFootprint.toLocaleString()} л/кг</p>
                    <p>Эко-рейтинг: ${product.ecoRating}/10</p>
                    <button class="add-product-btn" onclick="addProductToCalculator('${productId}')">
                        Добавить в расчет
                    </button>
                </div>`;
            });
            
            html += '</div></div>';
        });

        container.innerHTML = html;
    }

    /**
     * Получить название категории на русском языке
     */
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

    /**
     * Добавить продукт в калькулятор по ID
     */
    addProductToCalculator(productId) {
        const product = ECO_DATABASE[productId];
        if (!product) {
            console.error('Продукт не найден:', productId);
            return;
        }

        // Добавляем продукт в список
        this.products.push({
            id: productId,
            name: product.name,
            quantity: 1,
            unit: 'kg'
        });

        this.renderProductList();
        this.calculateFootprint();
    }

    /**
     * Отобразить список выбранных продуктов
     */
    renderProductList() {
        const container = document.getElementById('selected-products');
        
        if (!container) {
            console.error('Элемент selected-products не найден');
            return;
        }

        if (this.products.length === 0) {
            container.innerHTML = '<p>Продукты не выбраны</p>';
            return;
        }

        let html = '<h3>Выбранные продукты:</h3>';
        
        this.products.forEach((product, index) => {
            const productData = ECO_DATABASE[product.id];
            html += `<div class="selected-product">
                <span>${product.name}</span>
                <input type="number" value="${product.quantity}" min="0" step="0.1" 
                       onchange="updateProductQuantity(${index}, this.value)">
                <select onchange="updateProductUnit(${index}, this.value)">
                    <option value="kg" ${product.unit === 'kg' ? 'selected' : ''}>кг</option>
                    <option value="g" ${product.unit === 'g' ? 'selected' : ''}>г</option>
                    <option value="l" ${product.unit === 'l' ? 'selected' : ''}>л</option>
                    <option value="ml" ${product.unit === 'ml' ? 'selected' : ''}>мл</option>
                </select>
                <button onclick="removeProductFromList(${index})">Удалить</button>
            </div>`;
        });

        container.innerHTML = html;
    }

    /**
     * Добавить новый продукт в корзину
     */
    addProduct() {
        const container = document.getElementById('products-container');
        const productRow = document.createElement('div');
        productRow.className = 'product-row';
        
        productRow.innerHTML = `
            <select class="product-select" data-product="">
                <option value="">Выберите продукт...</option>
                <option value="beef">Говядина</option>
                <option value="lamb">Баранина</option>
                <option value="pork">Свинина</option>
                <option value="chicken">Курица</option>
                <option value="fish">Рыба</option>
                <option value="eggs">Яйца</option>
                <option value="milk">Молоко</option>
                <option value="cheese">Сыр</option>
                <option value="rice">Рис</option>
                <option value="wheat">Пшеница</option>
                <option value="potatoes">Картофель</option>
                <option value="tomatoes">Помидоры</option>
                <option value="apples">Яблоки</option>
                <option value="bananas">Бананы</option>
                <option value="coffee">Кофе</option>
                <option value="chocolate">Шоколад</option>
                <option value="nuts">Орехи</option>
                <option value="vegetables">Овощи (смешанные)</option>
                <option value="fruits">Фрукты (смешанные)</option>
            </select>
            <input type="number" class="quantity-input" placeholder="Количество" min="0" step="0.1" value="1">
            <select class="unit-select">
                <option value="kg">кг</option>
                <option value="g">г</option>
                <option value="l">л</option>
                <option value="ml">мл</option>
                <option value="pieces">шт</option>
            </select>
            <button class="remove-btn" onclick="removeProduct(this)">🗑️</button>
        `;

        container.appendChild(productRow);
        this.updateRemoveButtons();
    }

    /**
     * Удалить продукт из корзины
     */
    removeProduct(button) {
        const productRow = button.closest('.product-row');
        productRow.remove();
        this.updateRemoveButtons();
        this.updateProductData();
    }

    /**
     * Обновить видимость кнопок удаления
     */
    updateRemoveButtons() {
        const productRows = document.querySelectorAll('.product-row');
        productRows.forEach((row, index) => {
            const removeBtn = row.querySelector('.remove-btn');
            if (productRows.length > 1) {
                removeBtn.style.display = 'block';
            } else {
                removeBtn.style.display = 'none';
            }
        });
    }

    /**
     * Обновить данные о продуктах
     */
    updateProductData() {
        this.products = [];
        const productRows = document.querySelectorAll('.product-row');
        
        productRows.forEach(row => {
            const productSelect = row.querySelector('.product-select');
            const quantityInput = row.querySelector('.quantity-input');
            const unitSelect = row.querySelector('.unit-select');
            
            if (productSelect.value && quantityInput.value) {
                const quantity = parseFloat(quantityInput.value);
                const unit = unitSelect.value;
                const productId = productSelect.value;
                
                if (quantity > 0) {
                    this.products.push({
                        id: productId,
                        quantity: quantity,
                        unit: unit
                    });
                }
            }
        });
    }

    /**
     * Рассчитать экологический след
     */
    async calculateFootprint() {
        this.updateProductData();
        
        if (this.products.length === 0) {
            this.showError('Пожалуйста, добавьте хотя бы один продукт');
            return;
        }

        this.showLoading();

        try {
            // Рассчитываем след для каждого продукта
            const productFootprints = [];
            let totalCarbon = 0;
            let totalWater = 0;
            let totalLand = 0;
            let totalEcoRating = 0;

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

            // Рассчитываем средний эко-рейтинг
            const averageEcoRating = totalEcoRating / productFootprints.length;

            // Получаем рекомендации и сравнения
            const recommendations = getRecommendations(productFootprints);
            const comparisons = getComparisons(productFootprints);

            this.results = {
                totalCarbon: Math.round(totalCarbon * 100) / 100,
                totalWater: Math.round(totalWater),
                totalLand: Math.round(totalLand * 100) / 100,
                ecoRating: Math.round(averageEcoRating * 10) / 10,
                products: productFootprints,
                recommendations: recommendations,
                comparisons: comparisons
            };

            this.displayResults();
            this.saveResults();

        } catch (error) {
            console.error('Ошибка расчета:', error);
            this.showError('Произошла ошибка при расчете. Попробуйте еще раз.');
        }
    }

    /**
     * Отобразить результаты
     */
    displayResults() {
        const resultsSection = document.getElementById('results-section');
        resultsSection.style.display = 'block';

        // Обновляем основные показатели
        const carbonEl = document.getElementById('carbon-footprint');
        const waterEl = document.getElementById('water-footprint');
        const landEl = document.getElementById('land-footprint');
        const ecoEl = document.getElementById('eco-score');
        
        if (carbonEl) carbonEl.textContent = this.results.totalCarbon;
        if (waterEl) waterEl.textContent = this.results.totalWater.toLocaleString();
        if (landEl) landEl.textContent = this.results.totalLand;
        if (ecoEl) ecoEl.textContent = this.results.ecoRating;

        // Отображаем сравнения
        this.displayComparisons();
        
        // Отображаем рекомендации
        this.displayRecommendations();

        // Прокручиваем к результатам
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * Отобразить сравнения с альтернативами
     */
    displayComparisons() {
        const comparisonContainer = document.getElementById('comparison-results');
        
        if (!comparisonContainer) {
            console.error('Элемент comparison-results не найден');
            return;
        }

        comparisonContainer.innerHTML = '';

        this.results.comparisons.forEach(comparison => {
            const comparisonItem = document.createElement('div');
            comparisonItem.className = 'comparison-item';
            comparisonItem.innerHTML = `
                <div>
                    <strong>${comparison.product}</strong><br>
                    <small>Текущий след: ${comparison.currentFootprint.toFixed(2)} кг CO₂</small>
                </div>
                <div>
                    <strong>Альтернативы:</strong><br>
                    <small>${comparison.alternatives.join(', ')}</small><br>
                    <small style="color: #2E8B57;">Экономия: ~${comparison.potentialSavings.toFixed(2)} кг CO₂</small>
                </div>
            `;
            comparisonContainer.appendChild(comparisonItem);
        });
    }

    /**
     * Отобразить рекомендации
     */
    displayRecommendations() {
        const recommendationsContainer = document.getElementById('recommendations-list');
        
        if (!recommendationsContainer) {
            console.error('Элемент recommendations-list не найден');
            return;
        }

        recommendationsContainer.innerHTML = '';

        this.results.recommendations.forEach(rec => {
            const recItem = document.createElement('div');
            recItem.className = 'recommendation-item';
            
            let icon = '💡';
            if (rec.type === 'warning') icon = '⚠️';
            if (rec.type === 'suggestion') icon = '🌱';
            
            recItem.innerHTML = `
                <strong>${icon} ${rec.title}</strong><br>
                <small>${rec.description}</small>
            `;
            recommendationsContainer.appendChild(recItem);
        });
    }

    /**
     * Показать загрузку
     */
    showLoading() {
        const resultsSection = document.getElementById('results-section');
        resultsSection.style.display = 'block';
        resultsSection.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Рассчитываем экологический след...</p>
            </div>
        `;
    }

    /**
     * Показать ошибку
     */
    showError(message) {
        const resultsSection = document.getElementById('results-section');
        resultsSection.style.display = 'block';
        resultsSection.innerHTML = `
            <div class="error">
                <strong>Ошибка:</strong> ${message}
            </div>
        `;
    }

    /**
     * Сохранить результаты в localStorage
     */
    saveResults() {
        if (this.results) {
            localStorage.setItem('ecoFootprintResults', JSON.stringify({
                results: this.results,
                timestamp: new Date().toISOString()
            }));
        }
    }

    /**
     * Загрузить сохраненные данные
     */
    loadSavedData() {
        const saved = localStorage.getItem('ecoFootprintResults');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                const savedDate = new Date(data.timestamp);
                const now = new Date();
                
                // Показываем сохраненные результаты, если они не старше 24 часов
                if (now - savedDate < 24 * 60 * 60 * 1000) {
                    this.results = data.results;
                    this.displayResults();
                }
            } catch (error) {
                console.error('Ошибка загрузки сохраненных данных:', error);
            }
        }
    }

    /**
     * Поделиться результатами
     */
    shareResults(platform) {
        if (!this.results) {
            alert('Сначала рассчитайте экологический след');
            return;
        }

        const text = `Мой экологический след продуктов: ${this.results.totalCarbon} кг CO₂, ${this.results.totalWater.toLocaleString()} л воды. Эко-рейтинг: ${this.results.ecoRating}/10. Рассчитайте свой на SerpMonn!`;
        const url = window.location.href;

        let shareUrl = '';
        
        switch (platform) {
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(text)}`;
                break;
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
                break;
            case 'telegram':
                shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
                break;
        }

        if (shareUrl) {
            window.open(shareUrl, '_blank', 'width=600,height=400');
        }
    }
}

// Глобальные функции для HTML
let calculator;

function addProduct() {
    calculator.addProduct();
}

function removeProduct(button) {
    calculator.removeProduct(button);
}

function calculateFootprint() {
    calculator.calculateFootprint();
}

function shareResults(platform) {
    calculator.shareResults(platform);
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    calculator = new EcoFootprintCalculator();
});

// Дополнительные утилиты

/**
 * Форматировать число с разделителями тысяч
 */
function formatNumber(num) {
    return num.toLocaleString('ru-RU');
}

/**
 * Получить цвет для эко-рейтинга
 */
function getEcoRatingColor(rating) {
    if (rating >= 8) return '#2E8B57'; // Зеленый
    if (rating >= 6) return '#FFA500'; // Оранжевый
    if (rating >= 4) return '#FF6347'; // Красноватый
    return '#DC143C'; // Красный
}

/**
 * Получить описание эко-рейтинга
 */
function getEcoRatingDescription(rating) {
    if (rating >= 8) return 'Отличный экологический выбор!';
    if (rating >= 6) return 'Хороший экологический выбор';
    if (rating >= 4) return 'Умеренное воздействие на экологию';
    return 'Высокое воздействие на экологию';
}

// Глобальные функции для HTML
window.calculateFootprint = function() {
    if (window.ecoCalculator) {
        window.ecoCalculator.calculateFootprint();
    } else {
        console.error('Калькулятор не инициализирован');
    }
};

window.addProduct = function() {
    if (window.ecoCalculator) {
        window.ecoCalculator.addProduct();
    } else {
        console.error('Калькулятор не инициализирован');
    }
};

window.removeProduct = function(button) {
    if (window.ecoCalculator) {
        window.ecoCalculator.removeProduct(button);
    } else {
        console.error('Калькулятор не инициализирован');
    }
};

window.shareResults = function(platform) {
    if (window.ecoCalculator) {
        window.ecoCalculator.shareResults(platform);
    } else {
        console.error('Калькулятор не инициализирован');
    }
};

window.addProductToCalculator = function(productId) {
    if (window.ecoCalculator) {
        window.ecoCalculator.addProductToCalculator(productId);
    } else {
        console.error('Калькулятор не инициализирован');
    }
};

window.updateProductQuantity = function(index, quantity) {
    if (window.ecoCalculator) {
        window.ecoCalculator.products[index].quantity = parseFloat(quantity);
        window.ecoCalculator.calculateFootprint();
    }
};

window.updateProductUnit = function(index, unit) {
    if (window.ecoCalculator) {
        window.ecoCalculator.products[index].unit = unit;
        window.ecoCalculator.calculateFootprint();
    }
};

window.removeProductFromList = function(index) {
    if (window.ecoCalculator) {
        window.ecoCalculator.products.splice(index, 1);
        window.ecoCalculator.renderProductList();
        window.ecoCalculator.calculateFootprint();
    }
};

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    // Проверяем, что все необходимые элементы существуют
    const requiredElements = [
        'products-container',
        'selected-products',
        'carbon-footprint',
        'water-footprint', 
        'land-footprint',
        'eco-score',
        'results-section',
        'comparison-results',
        'recommendations-list'
    ];
    
    const missingElements = requiredElements.filter(id => !document.getElementById(id));
    
    if (missingElements.length > 0) {
        console.error('Отсутствуют элементы:', missingElements);
        return;
    }
    
    // Инициализируем калькулятор только если все элементы найдены
    window.ecoCalculator = new EcoFootprintCalculator();
    console.log('Калькулятор инициализирован успешно');
});

// Экспорт для тестирования
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EcoFootprintCalculator;
}