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
                e.target.classList.contains('quantity-input')) {
                // Автоматически показываем единицы измерения при выборе продукта
                this.updateUnitDisplay();
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
        
        // Создаем HTML для выпадающего списка со всеми продуктами
        let html = `<div class="product-row">
            <select class="product-select" data-product="beef">
                <option value="">Выберите продукт...</option>`;
        
        allProducts.forEach(product => {
            const productId = Object.keys(ECO_DATABASE).find(key => ECO_DATABASE[key] === product);
            html += `<option value="${productId}">${product.name}</option>`;
        });
        
        html += `</select>
            <input type="number" class="quantity-input" placeholder="Количество" min="0" step="0.1">
            <span class="unit-display"></span>
            <button class="add-btn" onclick="addProduct()">Добавить</button>
        </div>
        <button class="calculate-btn" onclick="calculateFootprint()">
            🌍 Рассчитать экологический след
        </button>`;

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
     * Добавить продукт в расчет
     */
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
            alert('Пожалуйста, выберите продукт и введите количество');
            return;
        }
        
        const product = ECO_DATABASE[productId];
        if (!product) {
            console.error('Продукт не найден:', productId);
            return;
        }
        
        // Автоматически определяем единицы измерения
        let unit = 'kg'; // по умолчанию килограммы
        
        // Для жидкостей используем литры
        if (product.category === 'beverages' || productId === 'milk') {
            unit = 'l';
        }
        // Для мелких продуктов используем граммы
        else if (productId === 'eggs' || productId === 'chocolate' || productId === 'sugar') {
            unit = 'g';
        }
        
        // Добавляем продукт в список
        this.products.push({
            id: productId,
            name: product.name,
            quantity: quantity,
            unit: unit
        });
        
        // Очищаем форму
        productSelect.value = '';
        quantityInput.value = '';
        
        // Пересчитываем
        this.calculateFootprint();
        this.displaySelectedProducts();
        
        console.log('Добавлен продукт:', product.name, quantity, unit);
    }

    /**
     * Отобразить выбранные продукты
     */
    displaySelectedProducts() {
        const container = document.getElementById('products-container');
        
        if (this.products.length === 0) {
            return;
        }
        
        // Создаем HTML для отображения выбранных продуктов
        let selectedHtml = '<div class="selected-products"><h3>Выбранные продукты:</h3>';
        
        this.products.forEach((product, index) => {
            selectedHtml += `<div class="selected-product">
                <span>${product.name} - ${product.quantity} ${product.unit}</span>
                <button onclick="removeSelectedProduct(${index})">Удалить</button>
            </div>`;
        });
        
        selectedHtml += '</div>';
        
        // Добавляем после основной формы
        const existingSelected = container.querySelector('.selected-products');
        if (existingSelected) {
            existingSelected.remove();
        }
        container.insertAdjacentHTML('beforeend', selectedHtml);
    }

    /**
     * Удалить продукт из корзины
     */
    removeProduct(button) {
        const productRow = button.closest('.product-row');
        productRow.remove();
        this.updateRemoveButtons();
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
     * Обновить отображение единиц измерения
     */
    updateUnitDisplay() {
        const productSelect = document.querySelector('.product-select');
        const unitDisplay = document.querySelector('.unit-display');
        
        if (!productSelect || !unitDisplay) return;
        
        const productId = productSelect.value;
        if (!productId) {
            unitDisplay.textContent = '';
            return;
        }
        
        const product = ECO_DATABASE[productId];
        if (!product) return;
        
        // Определяем единицы измерения
        let unit = 'кг';
        if (product.category === 'beverages' || productId === 'milk') {
            unit = 'л';
        } else if (productId === 'eggs' || productId === 'chocolate' || productId === 'sugar') {
            unit = 'г';
        }
        
        unitDisplay.textContent = `Единица: ${unit}`;
    }

    /**
     * Рассчитать экологический след
     */
    async calculateFootprint() {
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
        let comparisonContainer = document.getElementById('comparison-results');
        
        if (!comparisonContainer) {
            // Создаем элемент если его нет
            const resultsSection = document.getElementById('results-section');
            if (resultsSection) {
                const newElement = document.createElement('div');
                newElement.id = 'comparison-results';
                resultsSection.appendChild(newElement);
                comparisonContainer = newElement;
            } else {
                console.error('Элемент comparison-results не найден и не может быть создан');
                return;
            }
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
        let recommendationsContainer = document.getElementById('recommendations-list');
        
        if (!recommendationsContainer) {
            // Создаем элемент если его нет
            const resultsSection = document.getElementById('results-section');
            if (resultsSection) {
                const newElement = document.createElement('div');
                newElement.id = 'recommendations-list';
                resultsSection.appendChild(newElement);
                recommendationsContainer = newElement;
            } else {
                console.error('Элемент recommendations-list не найден и не может быть создан');
                return;
            }
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

window.removeSelectedProduct = function(index) {
    if (window.ecoCalculator) {
        window.ecoCalculator.products.splice(index, 1);
        window.ecoCalculator.displaySelectedProducts();
        window.ecoCalculator.calculateFootprint();
    }
};



// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    // Проверяем, что все необходимые элементы существуют
    const requiredElements = [
        'products-container',
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