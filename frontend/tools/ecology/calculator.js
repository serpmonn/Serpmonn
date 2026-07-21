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
    this.chartInstance = null;
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.restoreFromUrl() || this.loadSavedData();
    this.renderProductRows();
    if (this.products.length) {
      this.hydrateRowsFromProducts();
      this.calculateFootprint({ scroll: false });
    }
  }

  setupEventListeners() {
    document.addEventListener('change', (e) => {
      if (e.target.classList.contains('product-select') || e.target.classList.contains('quantity-input')) {
        this.updateUnitDisplay(e.target.closest('.product-row'));
      }
    });

    document.getElementById('btn-eco-calculate')?.addEventListener('click', () => this.calculateFootprint({ scroll: true }));
    document.querySelector('.calculate-btn:not(#btn-eco-calculate)')?.addEventListener('click', () => this.calculateFootprint({ scroll: true }));
    document.getElementById('btn-eco-reset')?.addEventListener('click', () => this.resetForm());
    document.getElementById('btn-eco-share')?.addEventListener('click', () => this.copyShareLink());
    document.getElementById('btn-eco-pdf')?.addEventListener('click', () => this.exportPdf());
    document.getElementById('btn-eco-csv')?.addEventListener('click', () => this.exportCsv());
  }

  getRegion() {
    return document.getElementById('eco-region')?.value || 'national';
  }

  getSeason() {
    return document.getElementById('eco-season')?.value || 'in_season';
  }

  clearBannerError() {
    const el = document.getElementById('error-message');
    if (!el) return;
    el.textContent = '';
    el.classList.add('hidden');
  }

  showBannerError(message) {
    const el = document.getElementById('error-message');
    if (el) {
      el.textContent = message;
      el.classList.remove('hidden');
      return;
    }
    this.showError(message);
  }

  syncUrl() {
    const products = this.collectProductsFromRows();
    const params = new URLSearchParams();
    if (products.length) {
      params.set('items', products.map(p => `${p.id}:${p.quantity}:${p.unit}`).join(','));
    }
    params.set('region', this.getRegion());
    params.set('season', this.getSeason());
    const qs = params.toString();
    history.replaceState(null, '', qs ? `${location.pathname}?${qs}` : location.pathname);
  }

  restoreFromUrl() {
    const params = new URLSearchParams(location.search);
    const items = params.get('items');
    if (!items) return false;
    if (params.get('region') && document.getElementById('eco-region')) {
      document.getElementById('eco-region').value = params.get('region');
    }
    if (params.get('season') && document.getElementById('eco-season')) {
      document.getElementById('eco-season').value = params.get('season');
    }
    this.products = items.split(',').map(chunk => {
      const [id, qty, unit] = chunk.split(':');
      if (!id || !ECO_DATABASE[id]) return null;
      return {
        id,
        name: getProductLabel(id),
        quantity: parseFloat(qty),
        unit: unit || 'kg',
      };
    }).filter(Boolean);
    return this.products.length > 0;
  }

  hydrateRowsFromProducts() {
    const container = document.getElementById('products-container');
    if (!container) return;
    container.innerHTML = '';
    this.products.forEach(p => {
      const row = this.createProductRow();
      row.querySelector('.product-select').value = p.id;
      row.querySelector('.quantity-input').value = p.quantity;
      container.appendChild(row);
      this.updateUnitDisplay(row);
    });
    if (!this.products.length) container.appendChild(this.createProductRow());
    this.updateRemoveButtons();
  }

  resetForm() {
    this.products = [];
    this.results = null;
    this.clearBannerError();
    this.renderProductRows();
    const section = document.getElementById('results-section');
    if (section) section.style.display = 'none';
    history.replaceState(null, '', location.pathname);
    try { localStorage.removeItem('ecoFootprintResults'); } catch {}
  }

  async copyShareLink() {
    this.products = this.collectProductsFromRows();
    this.syncUrl();
    try {
      await navigator.clipboard.writeText(location.href);
      alert(ecoT('js.shareCopied') !== 'js.shareCopied' ? ecoT('js.shareCopied') : 'Ссылка скопирована');
    } catch {
      prompt('URL', location.href);
    }
  }

  exportCsv() {
    if (!this.results?.products?.length) {
      alert(ecoT('errors.no_products'));
      return;
    }
    const lines = [['product', 'carbon', 'water', 'land', 'ecoRating'].join(';')];
    this.results.products.forEach(p => {
      lines.push([p.name || p.id, p.carbonFootprint, p.waterFootprint, p.landFootprint, p.ecoRating].join(';'));
    });
    lines.push(['TOTAL', this.results.totalCarbon, this.results.totalWater, this.results.totalLand, this.results.ecoRating].join(';'));
    const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'eco-footprint.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async exportPdf() {
    if (!this.results) {
      alert(ecoT('errors.no_products'));
      return;
    }
    try {
      if (!window.jspdf) {
        await import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
      }
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      let y = 14;
      doc.text('Eco footprint', 14, y); y += 8;
      doc.text(`Carbon: ${this.results.totalCarbon}`, 14, y); y += 8;
      doc.text(`Water: ${this.results.totalWater}`, 14, y); y += 8;
      doc.text(`Land: ${this.results.totalLand}`, 14, y); y += 8;
      doc.text(`Score: ${this.results.ecoRating}`, 14, y);
      doc.save('eco-footprint.pdf');
    } catch (e) {
      console.error(e);
      alert('PDF export failed');
    }
  }

  async renderChart() {
    const canvas = document.getElementById('ecoChart');
    if (!canvas || !this.results?.products?.length) return;
    try {
      if (!window.Chart) await import('https://cdn.jsdelivr.net/npm/chart.js');
    } catch { return; }
    if (!window.Chart) return;
    if (this.chartInstance) this.chartInstance.destroy();
    const labels = this.results.products.map(p => p.name || p.id);
    const data = this.results.products.map(p => p.carbonFootprint);
    this.chartInstance = new Chart(canvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label: 'CO2', data, backgroundColor: '#2E8B57' }],
      },
      options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } },
    });
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
      <div class="quantity-wrap">
        <input type="number" class="quantity-input" placeholder="${ecoT('js.quantityPlaceholder')}" min="0" step="0.1">
        <span class="unit-display" aria-hidden="true"></span>
      </div>
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
      this.showBannerError(ecoT('errors.select_product_and_qty'));
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
    unitDisplay.textContent = this.getUnitLabel(this.resolveUnit(productId));
  }

  async calculateFootprint(options = {}) {
    const { scroll = true } = options;
    this.clearBannerError();
    const fromRows = this.collectProductsFromRows();
    if (fromRows.length > 0) {
      this.products = fromRows;
    }

    if (this.products.length === 0) {
      this.showBannerError(ecoT('errors.no_products'));
      return;
    }

    this.showLoading();

    try {
      const region = this.getRegion();
      const season = this.getSeason();
      const productFootprints = [];
      let totalCarbon = 0;
      let totalWater = 0;
      let totalLand = 0;
      let totalEcoRating = 0;

      this.products.forEach(product => {
        const quantityInKg = convertToKilograms(product.quantity, product.unit, product.id);
        const footprint = calculateProductFootprint(product.id, quantityInKg, region, season);
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
        comparisons: getComparisons(productFootprints),
        region,
        season,
      };

      this.displayResults(scroll);
      this.saveResults();
      this.syncUrl();
      await this.renderChart();
    } catch (error) {
      console.error('Eco calculator error:', error);
      this.showBannerError(ecoT('errors.calculation_error'));
    } finally {
      this.hideLoading();
    }
  }

  displayResults(scroll = true) {
    const resultsSection = document.getElementById('results-section');
    if (resultsSection) resultsSection.style.display = 'block';
    this.hideLoading();

    document.getElementById('carbon-footprint').textContent = this.results.totalCarbon.toFixed(2);
    const hero = document.getElementById('carbon-footprint-hero');
    if (hero) hero.textContent = this.results.totalCarbon.toFixed(2);
    document.getElementById('water-footprint').textContent = this.results.totalWater.toLocaleString(getLocale());
    document.getElementById('land-footprint').textContent = this.results.totalLand.toFixed(2);
    document.getElementById('eco-score').textContent = this.results.ecoRating.toFixed(1);

    this.displayComparisons();
    this.displayRecommendations();
    if (scroll) resultsSection?.scrollIntoView({ behavior: 'smooth' });
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
        products: this.products,
        region: this.getRegion(),
        season: this.getSeason(),
        timestamp: new Date().toISOString()
      }));
    } catch {}
  }

  loadSavedData() {
    try {
      const saved = localStorage.getItem('ecoFootprintResults');
      if (!saved) return false;
      const data = JSON.parse(saved);
      if (Date.now() - new Date(data.timestamp).getTime() < 24 * 60 * 60 * 1000) {
        this.results = data.results;
        if (Array.isArray(data.products)) this.products = data.products;
        if (data.region && document.getElementById('eco-region')) document.getElementById('eco-region').value = data.region;
        if (data.season && document.getElementById('eco-season')) document.getElementById('eco-season').value = data.season;
        if (this.products.length) return true;
        if (this.results) this.displayResults(false);
      }
    } catch {}
    return false;
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
