/**
 * Ecological footprint calculator — uses window.i18n from product-footprint-calculator.njk
 */

function getEcoI18n() {
  return window.i18n || {};
}

function ecoT(path, vars = {}) {
  const parts = path.split('.');
  let value = getEcoI18n();
  for (const part of parts) {
    value = value?.[part];
  }
  if (typeof value !== 'string') return path;
  for (const [name, val] of Object.entries(vars)) {
    value = value.replaceAll(`{${name}}`, String(val));
  }
  return value;
}

function getLocale() {
  return document.documentElement.lang || 'ru';
}

class EcoFootprintCalculator {
  constructor() {
    this.products = [];
    this.results = null;
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.loadSavedData();
    this.renderProductRows();
  }

  setupEventListeners() {
    document.addEventListener('change', (e) => {
      if (e.target.classList.contains('product-select') || e.target.classList.contains('quantity-input')) {
        this.updateUnitDisplay(e.target.closest('.product-row'));
      }
    });

    const calculateBtn = document.querySelector('.calculate-btn');
    if (calculateBtn) {
      calculateBtn.addEventListener('click', () => this.calculateFootprint());
    }
  }

  buildProductOptions() {
    const products = Object.keys(ECO_DATABASE).filter(id => id !== 'pieces');
    const i18nProducts = getEcoI18n().products || {};
    let html = `<option value="">${ecoT('products.select_product')}</option>`;
    products.forEach(productId => {
      const label = i18nProducts[productId] || ECO_DATABASE[productId]?.name || productId;
      html += `<option value="${productId}">${label}</option>`;
    });
    return html;
  }

  createProductRow() {
    const row = document.createElement('div');
    row.className = 'product-row';
    row.innerHTML = `
      <select class="product-select">${this.buildProductOptions()}</select>
      <input type="number" class="quantity-input" placeholder="${ecoT('js.quantityPlaceholder')}" min="0" step="0.1">
      <span class="unit-display"></span>
      <button type="button" class="remove-btn" onclick="removeProductRow(this)">${ecoT('js.remove')}</button>
    `;
    return row;
  }

  renderProductRows() {
    const container = document.getElementById('products-container');
    if (!container) return;
    container.innerHTML = '';
    container.appendChild(this.createProductRow());
    this.updateRemoveButtons();
  }

  addProductRow() {
    const container = document.getElementById('products-container');
    if (!container) return;
    container.appendChild(this.createProductRow());
    this.updateRemoveButtons();
  }

  updateRemoveButtons() {
    const rows = document.querySelectorAll('.product-row');
    rows.forEach(row => {
      const btn = row.querySelector('.remove-btn');
      if (btn) btn.style.display = rows.length > 1 ? 'inline-block' : 'none';
    });
  }

  collectProductsFromRows() {
    const collected = [];
    document.querySelectorAll('.product-row').forEach(row => {
      const productId = row.querySelector('.product-select')?.value;
      const quantity = parseFloat(row.querySelector('.quantity-input')?.value || '');
      if (!productId || !quantity || quantity <= 0) return;

      const unit = this.resolveUnit(productId);
      const product = ECO_DATABASE[productId];
      if (!product) return;

      collected.push({
        id: productId,
        name: getProductLabel(productId),
        quantity,
        unit
      });
    });
    return collected;
  }

  resolveUnit(productId) {
    const product = ECO_DATABASE[productId];
    if (!product) return 'kg';
    if (product.category === 'beverages' || productId === 'milk') return 'l';
    if (productId === 'eggs' || productId === 'chocolate' || productId === 'sugar') return 'g';
    return 'kg';
  }

  addProduct() {
    const rows = document.querySelectorAll('.product-row');
    const lastRow = rows[rows.length - 1];
    if (!lastRow) return;

    const productId = lastRow.querySelector('.product-select')?.value;
    const quantity = parseFloat(lastRow.querySelector('.quantity-input')?.value || '');

    if (!productId || !quantity || quantity <= 0) {
      alert(ecoT('errors.select_product_and_qty'));
      return;
    }

    this.products.push({
      id: productId,
      name: getProductLabel(productId),
      quantity,
      unit: this.resolveUnit(productId)
    });

    lastRow.querySelector('.product-select').value = '';
    lastRow.querySelector('.quantity-input').value = '';
    this.updateUnitDisplay(lastRow);
    this.displaySelectedProducts();
  }

  displaySelectedProducts() {
    const container = document.getElementById('products-container');
    if (!container || this.products.length === 0) return;

    let html = `<div class="selected-products"><h3>${ecoT('js.selectedProductsTitle')}</h3>`;
    this.products.forEach((product, index) => {
      const unitLabel = this.getUnitLabel(product.unit);
      html += `<div class="selected-product">
        <span>${product.name} - ${product.quantity} ${unitLabel}</span>
        <button type="button" onclick="removeSelectedProduct(${index})">${ecoT('js.remove')}</button>
      </div>`;
    });
    html += '</div>';

    container.querySelector('.selected-products')?.remove();
    container.insertAdjacentHTML('beforeend', html);
  }

  getUnitLabel(unit) {
    const units = getEcoI18n().units || {};
    return units[unit] || unit;
  }

  updateUnitDisplay(row) {
    if (!row) return;
    const productId = row.querySelector('.product-select')?.value;
    const unitDisplay = row.querySelector('.unit-display');
    if (!unitDisplay) return;
    if (!productId) {
      unitDisplay.textContent = '';
      return;
    }
    const unit = this.resolveUnit(productId);
    unitDisplay.textContent = ecoT('js.unitLabel', { unit: this.getUnitLabel(unit) });
  }

  async calculateFootprint() {
    const fromRows = this.collectProductsFromRows();
    if (fromRows.length > 0) {
      this.products = fromRows;
    }

    if (this.products.length === 0) {
      this.showError(ecoT('errors.no_products'));
      return;
    }

    this.showLoading();

    try {
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

      const averageEcoRating = totalEcoRating / productFootprints.length;
      this.results = {
        totalCarbon: Math.round(totalCarbon * 100) / 100,
        totalWater: Math.round(totalWater),
        totalLand: Math.round(totalLand * 100) / 100,
        ecoRating: Math.round(averageEcoRating * 10) / 10,
        products: productFootprints,
        recommendations: getRecommendations(productFootprints),
        comparisons: getComparisons(productFootprints)
      };

      this.displayResults();
      this.saveResults();
    } catch (error) {
      console.error('Eco calculator error:', error);
      this.showError(ecoT('errors.calculation_error'));
    } finally {
      this.hideLoading();
    }
  }

  displayResults() {
    const resultsSection = document.getElementById('results-section');
    if (resultsSection) resultsSection.style.display = 'block';
    this.hideLoading();

    document.getElementById('carbon-footprint').textContent = this.results.totalCarbon.toFixed(2);
    document.getElementById('water-footprint').textContent = this.results.totalWater.toLocaleString(getLocale());
    document.getElementById('land-footprint').textContent = this.results.totalLand.toFixed(2);
    document.getElementById('eco-score').textContent = this.results.ecoRating.toFixed(1);

    this.displayComparisons();
    this.displayRecommendations();
    resultsSection?.scrollIntoView({ behavior: 'smooth' });
  }

  displayComparisons() {
    const comparisonContainer = document.getElementById('comparison-results');
    if (!comparisonContainer) return;
    comparisonContainer.innerHTML = '';

    this.results.comparisons.forEach(comparison => {
      const item = document.createElement('div');
      item.className = 'comparison-item';
      item.innerHTML = `
        <div>
          <strong>${comparison.product}</strong><br>
          <small>${ecoT('js.comparisonCurrentFootprint', { value: comparison.currentFootprint.toFixed(2) })}</small>
        </div>
        <div>
          <strong>${ecoT('js.comparisonAlternatives')}</strong><br>
          <small>${comparison.alternatives.join(', ')}</small><br>
          <small style="color: #2E8B57;">${ecoT('js.comparisonSavings', { value: comparison.potentialSavings.toFixed(2) })}</small>
        </div>
      `;
      comparisonContainer.appendChild(item);
    });
  }

  displayRecommendations() {
    const recommendationsContainer = document.getElementById('recommendations-list');
    if (!recommendationsContainer) return;
    recommendationsContainer.innerHTML = '';

    this.results.recommendations.forEach(rec => {
      const item = document.createElement('div');
      item.className = 'recommendation-item';
      let icon = '💡';
      if (rec.type === 'warning') icon = '⚠️';
      if (rec.type === 'suggestion') icon = '🌱';
      item.innerHTML = `<strong>${icon} ${rec.title}</strong><br><small>${rec.description}</small>`;
      recommendationsContainer.appendChild(item);
    });
  }

  showLoading() {
    const resultsSection = document.getElementById('results-section');
    if (!resultsSection) return;
    resultsSection.style.display = 'block';

    let loading = document.getElementById('results-loading');
    if (!loading) {
      loading = document.createElement('div');
      loading.id = 'results-loading';
      loading.className = 'loading';
      loading.innerHTML = `<div class="spinner"></div><p>${ecoT('js.loading')}</p>`;
      resultsSection.appendChild(loading);
    }
    loading.style.display = 'flex';
  }

  hideLoading() {
    const loading = document.getElementById('results-loading');
    if (loading) loading.style.display = 'none';
  }

  showError(message) {
    const resultsSection = document.getElementById('results-section');
    if (!resultsSection) return;
    resultsSection.style.display = 'block';
    const existing = resultsSection.querySelector('.error');
    if (existing) existing.remove();
    const error = document.createElement('div');
    error.className = 'error';
    error.innerHTML = `<strong>${ecoT('js.errorPrefix')}</strong> ${message}`;
    resultsSection.prepend(error);
  }

  saveResults() {
    if (!this.results) return;
    try {
      localStorage.setItem('ecoFootprintResults', JSON.stringify({
        results: this.results,
        timestamp: new Date().toISOString()
      }));
    } catch {}
  }

  loadSavedData() {
    try {
      const saved = localStorage.getItem('ecoFootprintResults');
      if (!saved) return;
      const data = JSON.parse(saved);
      if (Date.now() - new Date(data.timestamp).getTime() < 24 * 60 * 60 * 1000) {
        this.results = data.results;
        this.displayResults();
      }
    } catch {}
  }
}

function initProductCalculator() {
  const required = ['products-container', 'carbon-footprint', 'water-footprint', 'land-footprint', 'eco-score', 'results-section'];
  const missing = required.filter(id => !document.getElementById(id));
  if (missing.length > 0) {
    console.error('Eco calculator missing elements:', missing);
    return;
  }
  window.ecoCalculator = new EcoFootprintCalculator();
}

function addProductRow() {
  window.ecoCalculator?.addProductRow();
}

function removeProductRow(button) {
  const row = button.closest('.product-row');
  row?.remove();
  window.ecoCalculator?.updateRemoveButtons();
}

function calculateFootprint() {
  window.ecoCalculator?.calculateFootprint();
}

function removeSelectedProduct(index) {
  if (!window.ecoCalculator) return;
  window.ecoCalculator.products.splice(index, 1);
  window.ecoCalculator.displaySelectedProducts();
  if (window.ecoCalculator.products.length > 0) {
    window.ecoCalculator.calculateFootprint();
  }
}

window.initProductCalculator = initProductCalculator;
window.addProductRow = addProductRow;
window.removeProductRow = removeProductRow;
window.calculateFootprint = calculateFootprint;
window.removeSelectedProduct = removeSelectedProduct;
window.addProduct = addProductRow;
