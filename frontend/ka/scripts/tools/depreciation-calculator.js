import { getPageT } from '/frontend/scripts/i18n-loader.js';

let t = (key, vars = {}) => {
  let value = key;
  for (const [name, val] of Object.entries(vars)) {
    value = value.replaceAll(`{${name}}`, String(val));
  }
  return value;
};

let calcCache = new Map();
const CACHE_TTL = 60 * 60 * 1000;
let adScriptLoaded = false;
let chartInstance = null;

function getCurrency() {
  return document.body?.dataset.currency || '₽';
}

function getMonthLabel() {
  return document.body?.dataset.month || 'mo';
}

function getLocale() {
  return document.documentElement.lang || 'ru';
}

function formatMoney(value) {
  return `${Math.round(value).toLocaleString(getLocale())} ${getCurrency()}`;
}

function formatMonthly(value) {
  return `${Math.round(value).toLocaleString(getLocale())} ${getCurrency()}/${getMonthLabel()}`;
}

function getSelectLabel(selectId, value) {
  const option = document.getElementById(selectId)?.querySelector(`option[value="${value}"]`);
  return option?.textContent?.trim() || value;
}

function getResultText(id) {
  return (document.getElementById(id)?.textContent || '').trim();
}

async function loadChartJs() {
  if (!window.Chart) {
    await import('https://cdn.jsdelivr.net/npm/chart.js');
  }
}

async function loadJsPDF() {
  if (!window.jspdf) {
    await import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  }
}

function loadAdScript() {
  if (!adScriptLoaded) {
    const script = document.createElement('script');
    script.src = 'https://ad.mail.ru/static/ads-async.js';
    script.async = true;
    script.onload = () => { adScriptLoaded = true; };
    document.head.appendChild(script);
  }
}

function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function sanitizeInput(input) {
  return String(input).replace(/[<>&"']/g, '');
}

function resetForm() {
  document.querySelector('.input-section')?.closest('form')?.reset();
  document.getElementById('results')?.classList.add('hidden');
  document.getElementById('breakdown')?.classList.add('hidden');
  document.getElementById('history')?.classList.add('hidden');
  const md = document.querySelector('meta[name="description"]');
  if (md) md.content = t('depreciation.defaultMetaDescription');
  document.title = t('depreciation.defaultTitle');
  window.history.replaceState({}, '', window.location.pathname);
  document.querySelectorAll('#results > div:not(.result-grid), #results > canvas').forEach(el => el.remove());
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
  document.getElementById('carBrand')?.focus();
}

function copyShareLink() {
  navigator.clipboard.writeText(window.location.href).then(() => {
    alert(t('depreciation.linkCopied'));
  }).catch(() => {
    alert(t('depreciation.linkCopyError'));
  });
}

function exportToPDF() {
  loadJsPDF().then(() => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(t('depreciation.pdfTitle'), 10, 10);
    doc.setFontSize(12);
    doc.text(t('depreciation.pdfCurrentValue', { value: getResultText('currentValue') }), 10, 20);
    doc.text(t('depreciation.pdfTotalDepreciation', { value: getResultText('totalDepreciation') }), 10, 30);
    doc.text(t('depreciation.pdfPercent', { value: getResultText('depreciationPercent') }), 10, 40);
    doc.text(t('depreciation.pdfMonthly', { value: getResultText('monthlyDepreciation') }), 10, 50);
    doc.text(t('depreciation.pdfNote'), 10, 60);
    doc.save('depreciation_report.pdf');
  });
}

function exportToCSV() {
  const headers = [
    t('depreciation.csvBrand'),
    t('depreciation.csvModel'),
    t('depreciation.csvYear'),
    t('depreciation.csvCurrentValue'),
    t('depreciation.csvTotalDepreciation'),
    t('depreciation.csvPercent'),
    t('depreciation.csvMonthly')
  ];
  const getVal = id => document.getElementById(id)?.value || '';
  const data = [[
    getVal('carBrand'),
    getVal('carModel'),
    getVal('carYear'),
    getResultText('currentValue'),
    getResultText('totalDepreciation'),
    getResultText('depreciationPercent'),
    getResultText('monthlyDepreciation')
  ]];
  const csv = [headers.join(','), ...data.map(row => row.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'depreciation_report.csv';
  link.click();
}

function calculateDepreciation() {
  const errorMessage = document.getElementById('error-message');
  if (errorMessage) errorMessage.classList.add('hidden');
  const inputs = {
    carBrand: sanitizeInput(document.getElementById('carBrand')?.value || ''),
    carModel: sanitizeInput(document.getElementById('carModel')?.value || ''),
    carYear: parseInt(document.getElementById('carYear')?.value || '', 10),
    initialPrice: parseFloat(document.getElementById('initialPrice')?.value || ''),
    currentMileage: parseFloat(document.getElementById('currentMileage')?.value || ''),
    usageType: document.getElementById('usageType')?.value || 'personal',
    fuelType: document.getElementById('fuelType')?.value || 'petrol',
    maintenanceLevel: document.getElementById('maintenanceLevel')?.value || 'average',
    climateZone: document.getElementById('climateZone')?.value || 'mild',
    region: document.getElementById('region')?.value || 'south',
    currentNewPrice: parseFloat(document.getElementById('currentNewPrice')?.value || ''),
    marketGrowth: parseFloat(document.getElementById('marketGrowth')?.value || ''),
    inflationRate: parseFloat(document.getElementById('inflationRate')?.value || ''),
    demandLevel: document.getElementById('demandLevel')?.value || 'medium',
    technicalCondition: document.getElementById('technicalCondition')?.value || 'good'
  };

  if (!inputs.initialPrice || !inputs.currentMileage || Number.isNaN(inputs.carYear)) {
    if (errorMessage) {
      errorMessage.textContent = t('depreciation.errorRequiredFields');
      errorMessage.classList.remove('hidden');
      errorMessage.focus?.();
    }
    return;
  }
  if (inputs.initialPrice < 100000) {
    if (errorMessage) {
      errorMessage.textContent = t('depreciation.errorMinPrice');
      errorMessage.classList.remove('hidden');
      errorMessage.focus?.();
    }
    return;
  }
  if (inputs.currentMileage < 0) {
    if (errorMessage) {
      errorMessage.textContent = t('depreciation.errorNegativeMileage');
      errorMessage.classList.remove('hidden');
      errorMessage.focus?.();
    }
    return;
  }
  if (inputs.currentMileage > 500000) {
    if (errorMessage) {
      errorMessage.textContent = t('depreciation.warnHighMileage');
      errorMessage.classList.remove('hidden');
      errorMessage.focus?.();
    }
  }
  if (inputs.currentNewPrice && inputs.currentNewPrice < 100000) {
    if (errorMessage) {
      errorMessage.textContent = t('depreciation.errorMinNewPrice');
      errorMessage.classList.remove('hidden');
      errorMessage.focus?.();
    }
    return;
  }
  if (inputs.marketGrowth && (inputs.marketGrowth < 0 || inputs.marketGrowth > 200)) {
    if (errorMessage) {
      errorMessage.textContent = t('depreciation.errorMarketGrowthRange');
      errorMessage.classList.remove('hidden');
      errorMessage.focus?.();
    }
    return;
  }
  if (inputs.inflationRate && (inputs.inflationRate < 0 || inputs.inflationRate > 50)) {
    if (errorMessage) {
      errorMessage.textContent = t('depreciation.errorInflationRange');
      errorMessage.classList.remove('hidden');
      errorMessage.focus?.();
    }
    return;
  }

  const cacheKey = JSON.stringify(inputs);
  if (calcCache.has(cacheKey)) {
    const { currentValue, totalDepreciation, depreciationPercent, monthlyDepreciation, totalDepreciationRate, breakdown } = calcCache.get(cacheKey);
    displayResults(currentValue, totalDepreciation, depreciationPercent, monthlyDepreciation, totalDepreciationRate, inputs);
    const bd = document.getElementById('breakdownList');
    if (bd) bd.innerHTML = breakdown;
    document.getElementById('results')?.classList.remove('hidden');
    document.getElementById('breakdown')?.classList.remove('hidden');
    return;
  }
  if (calcCache.size > 10) calcCache.delete(calcCache.keys().next().value);

  document.getElementById('results')?.classList.add('loading');
  document.getElementById('breakdown')?.classList.add('loading');
  document.querySelectorAll('#results > div:not(.result-grid), #results > canvas').forEach(el => el.remove());

  setTimeout(() => {
    const { carYear, initialPrice, currentMileage, usageType, fuelType, maintenanceLevel, climateZone, region, currentNewPrice, marketGrowth, inflationRate, demandLevel, technicalCondition } = inputs;
    let baseDepreciation = 0;
    const currentYear = new Date().getFullYear();
    const ageInYears = currentYear - carYear;
    const depreciationRate = 0.2;
    for (let i = 1; i <= ageInYears; i++) baseDepreciation += (1 - baseDepreciation) * depreciationRate;
    baseDepreciation = Math.min(baseDepreciation, 0.6);

    let mileageDepreciation = 0;
    if (currentMileage <= 50000) mileageDepreciation = currentMileage / 50000 * 0.1;
    else if (currentMileage <= 150000) mileageDepreciation = 0.1 + (currentMileage - 50000) / 100000 * 0.15;
    else if (currentMileage <= 300000) mileageDepreciation = 0.25 + (currentMileage - 150000) / 150000 * 0.2;
    else mileageDepreciation = 0.45 + (currentMileage - 300000) / 100000 * 0.1;

    let batteryDepreciation = 0;
    if (fuelType === 'electric') {
      batteryDepreciation = Math.min(currentMileage / 200000 * 0.2, 0.2);
      baseDepreciation += batteryDepreciation;
    }

    const usageMultipliers = { personal: 1.0, taxi: 1.4, commercial: 1.3, delivery: 1.2 };
    const fuelMultipliers = { petrol: 1.0, diesel: 0.9, hybrid: 0.7, electric: 0.6 };
    const maintenanceMultipliers = { excellent: 0.7, good: 0.85, average: 1.0, poor: 1.2 };
    const climateMultipliers = { mild: 1.0, cold: 1.15, hot: 1.1, humid: 1.2 };
    const regionMultipliers = { central: 1.1, north: 1.05, siberia: 1.15, south: 1.0 };
    const demandMultipliers = { high: 1.2, medium: 1.0, low: 0.8 };
    const technicalConditionMultipliers = { excellent: 1.0, good: 0.9, average: 0.75, poor: 0.5 };

    let adjustedInitialPrice = initialPrice;
    if (inflationRate) {
      for (let i = 1; i <= ageInYears; i++) adjustedInitialPrice *= (1 + inflationRate / 100);
    }
    const baseDepreciationRate = Math.min(baseDepreciation + mileageDepreciation, 0.6);
    const totalDepreciationRate = Math.min(
      baseDepreciationRate *
      usageMultipliers[usageType] *
      fuelMultipliers[fuelType] *
      maintenanceMultipliers[maintenanceLevel] *
      climateMultipliers[climateZone] *
      regionMultipliers[region] *
      demandMultipliers[demandLevel] *
      technicalConditionMultipliers[technicalCondition], 0.8
    );
    const totalDepreciation = adjustedInitialPrice * totalDepreciationRate;
    let currentValue = adjustedInitialPrice - totalDepreciation;
    if (currentNewPrice) {
      const marketRatio = currentNewPrice / initialPrice;
      const ageFactor = Math.max(0.3, 1 - (ageInYears * 0.05));
      currentValue = currentValue * (1 + (marketRatio - 1) * ageFactor);
    } else if (marketGrowth) {
      const ageFactor = Math.max(0.3, 1 - (ageInYears * 0.05));
      currentValue = currentValue * (1 + (marketGrowth / 100) * ageFactor);
    }
    const depreciationPercent = (totalDepreciationRate * 100).toFixed(1);
    const monthlyDepreciation = totalDepreciation / (ageInYears * 12 || 1);

    const breakdown = showBreakdown(
      adjustedInitialPrice, baseDepreciation, mileageDepreciation, batteryDepreciation,
      usageType, fuelType, maintenanceLevel, climateZone, region, currentNewPrice, marketGrowth, inflationRate, demandLevel, technicalCondition,
      baseDepreciationRate, totalDepreciationRate, totalDepreciation, currentValue,
      { usageMultipliers, fuelMultipliers, maintenanceMultipliers, climateMultipliers, regionMultipliers, demandMultipliers, technicalConditionMultipliers }
    );

    displayResults(currentValue, totalDepreciation, depreciationPercent, monthlyDepreciation, totalDepreciationRate, inputs, adjustedInitialPrice, batteryDepreciation);

    calcCache.set(cacheKey, { currentValue, totalDepreciation, depreciationPercent, monthlyDepreciation, totalDepreciationRate, breakdown, timestamp: Date.now() });
    for (const [key, value] of calcCache) if (Date.now() - value.timestamp > CACHE_TTL) calcCache.delete(key);
    try {
      const history = JSON.parse(localStorage.getItem('depreciationHistory') || '[]');
      history.unshift({ ...inputs, timestamp: new Date().toISOString(), result: { currentValue, totalDepreciation, depreciationPercent, monthlyDepreciation } });
      if (history.length > 5) history.pop();
      if (JSON.stringify(history).length < 5 * 1024 * 1024) localStorage.setItem('depreciationHistory', JSON.stringify(history));
    } catch {}

    document.getElementById('results')?.classList.remove('loading', 'hidden');
    document.getElementById('breakdown')?.classList.remove('loading', 'hidden');
  }, 300);
}

function displayResults(currentValue, totalDepreciation, depreciationPercent, monthlyDepreciation, totalDepreciationRate, inputs, adjustedInitialPrice, batteryDepreciation) {
  const cv = document.getElementById('currentValue');
  if (cv) cv.textContent = formatMoney(currentValue);
  const td = document.getElementById('totalDepreciation');
  if (td) td.textContent = formatMoney(totalDepreciation);
  const dp = document.getElementById('depreciationPercent');
  if (dp) dp.textContent = `${depreciationPercent}%`;
  const md = document.getElementById('monthlyDepreciation');
  if (md) md.textContent = formatMonthly(monthlyDepreciation);

  if (inputs.carBrand && inputs.carModel) {
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.content = t('depreciation.dynamicMetaDescription', {
        brand: inputs.carBrand,
        model: inputs.carModel,
        year: inputs.carYear
      });
    }
    document.title = t('depreciation.dynamicTitle', {
      brand: inputs.carBrand,
      model: inputs.carModel,
      year: inputs.carYear
    });
  }
  const urlParams = new URLSearchParams();
  Object.entries(inputs).forEach(([key, value]) => { if (value) urlParams.set(key, value); });
  window.history.replaceState({}, '', `${window.location.pathname}?${urlParams}`);
  try { localStorage.setItem('lastDepreciation', JSON.stringify(inputs)); } catch {}

  const currentYear = new Date().getFullYear();
  const ageInYears = currentYear - inputs.carYear;
  const chartData = [];
  const depreciationRate = 0.2;
  let accumulatedDepreciation = 0;
  for (let year = 0; year <= ageInYears; year++) {
    accumulatedDepreciation += (1 - accumulatedDepreciation) * depreciationRate;
    const yearValue = inputs.initialPrice * (1 - Math.min(accumulatedDepreciation, 0.6));
    chartData.push({ x: inputs.carYear + year, y: Math.round(yearValue) });
  }
  const averageMileagePerYear = 15000;
  let forecastMileage = inputs.currentMileage;
  for (let year = 1; year <= 5; year++) {
    accumulatedDepreciation += (1 - accumulatedDepreciation) * depreciationRate;
    forecastMileage += averageMileagePerYear;
    let mileageDep = 0;
    if (forecastMileage <= 50000) mileageDep = forecastMileage / 50000 * 0.1;
    else if (forecastMileage <= 150000) mileageDep = 0.1 + (forecastMileage - 50000) / 100000 * 0.15;
    else if (forecastMileage <= 300000) mileageDep = 0.25 + (forecastMileage - 150000) / 150000 * 0.2;
    else mileageDep = 0.45 + (forecastMileage - 300000) / 100000 * 0.1;
    if (inputs.fuelType === 'electric') mileageDep += Math.min(forecastMileage / 200000 * 0.2, 0.2);
    const forecastDepreciation = Math.min(accumulatedDepreciation + mileageDep, 0.6);
    const yearValue = inputs.initialPrice * (1 - forecastDepreciation);
    chartData.push({ x: currentYear + year, y: Math.round(yearValue), forecast: true });
  }

  loadChartJs().then(() => {
    if (chartInstance) chartInstance.destroy();
    const prevCanvas = document.getElementById('depreciationChart');
    if (prevCanvas?.parentNode) prevCanvas.parentNode.removeChild(prevCanvas);
    const chartCanvas = document.createElement('canvas');
    chartCanvas.id = 'depreciationChart';
    chartCanvas.style.maxHeight = '300px';
    chartCanvas.style.marginTop = '20px';
    document.getElementById('results')?.prepend(chartCanvas);
    chartInstance = new Chart(chartCanvas, {
      type: 'line',
      data: {
        datasets: [
          { label: t('depreciation.chartHistorical'), data: chartData.filter(d => !d.forecast), borderColor: '#007bff', backgroundColor: 'rgba(0, 123, 255, 0.1)', fill: true, tension: 0.4 },
          { label: t('depreciation.chartForecast'), data: chartData.filter(d => d.forecast), borderColor: '#28a745', backgroundColor: 'rgba(40, 167, 69, 0.1)', fill: true, tension: 0.4, borderDash: [5, 5] }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { title: { display: true, text: t('depreciation.chartYear') } },
          y: {
            title: { display: true, text: t('depreciation.chartValue') },
            ticks: { callback: value => `${Number(value).toLocaleString(getLocale())} ${getCurrency()}` }
          }
        },
        plugins: { legend: { display: true } }
      }
    });
  });

  if (totalDepreciationRate > 0.7) {
    const warning = document.createElement('div');
    warning.style.cssText = 'background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin-top: 20px; color: #856404;';
    warning.innerHTML = `
      <strong>${t('depreciation.highDepreciationTitle')}</strong><br>
      ${t('depreciation.highDepreciationPercent', { percent: depreciationPercent })}<br>
      ${t('depreciation.highDepreciationCheck')}<br>
      ${t('depreciation.highDepreciationCondition')}
    `;
    document.getElementById('results')?.appendChild(warning);
  }

  if (inputs.currentNewPrice || inputs.marketGrowth || inputs.inflationRate) {
    const explanation = document.createElement('div');
    explanation.style.cssText = 'background: #e8f5e8; border: 1px solid #c3e6c3; border-radius: 8px; padding: 15px; margin-top: 20px; color: #155724;';
    const ageFactor = Math.max(0.3, 1 - ((new Date().getFullYear() - inputs.carYear) * 0.05));
    let html = `<strong>${t('depreciation.marketAdjustmentTitle')}</strong><br>`;
    html += `${t('depreciation.initialPriceLine', { amount: formatMoney(inputs.initialPrice) })}<br>`;
    if (inputs.inflationRate) {
      html += `${t('depreciation.adjustedPriceInflation', { rate: inputs.inflationRate, amount: formatMoney(adjustedInitialPrice) })}<br>`;
    }
    if (inputs.currentNewPrice) {
      html += `${t('depreciation.currentNewPriceLine', { amount: formatMoney(inputs.currentNewPrice) })}<br>`;
      html += `${t('depreciation.growthRatio', { ratio: (inputs.currentNewPrice / inputs.initialPrice).toFixed(2) })}<br>`;
    } else if (inputs.marketGrowth) {
      html += `${t('depreciation.priceGrowth', { percent: inputs.marketGrowth })}<br>`;
    }
    html += `${t('depreciation.ageFactor', { percent: (ageFactor * 100).toFixed(0) })}<br>`;
    html += t('depreciation.finalMarketValue', { amount: formatMoney(currentValue) });
    explanation.innerHTML = html;
    document.getElementById('results')?.appendChild(explanation);
  }

  const disclaimer = document.createElement('div');
  disclaimer.className = 'disclaimer';
  disclaimer.innerHTML = `<p>${t('depreciation.disclaimer')}</p>`;
  document.getElementById('results')?.appendChild(disclaimer);
}

function showBreakdown(initialPrice, baseDepreciation, mileageDepreciation, batteryDepreciation, usageType, fuelType, maintenanceLevel, climateZone, region, currentNewPrice, marketGrowth, inflationRate, demandLevel, technicalCondition, baseDepreciationRate, totalDepreciationRate, totalDepreciation, currentValue, multipliers) {
  const { usageMultipliers, fuelMultipliers, maintenanceMultipliers, climateMultipliers, regionMultipliers, demandMultipliers, technicalConditionMultipliers } = multipliers;
  const breakdownList = document.getElementById('breakdownList');
  const depreciationPercent = (totalDepreciationRate * 100).toFixed(1);
  let displayMarketPrice = initialPrice;
  if (currentNewPrice) displayMarketPrice = currentNewPrice;
  else if (marketGrowth) displayMarketPrice = initialPrice * (1 + marketGrowth / 100);

  let html = `
    <div class="breakdown-item">
      <span>${t('depreciation.breakdownInitialPrice')}</span>
      <span>${formatMoney(initialPrice)}</span>
    </div>
  `;
  if (inflationRate) {
    html += `
      <div class="breakdown-item">
        <span>${t('depreciation.breakdownAdjustedInflation', { rate: inflationRate })}</span>
        <span>${formatMoney(initialPrice)}</span>
      </div>
    `;
  }
  html += `
    <div class="breakdown-item">
      <span>${t('depreciation.breakdownMarketAdjustment')}</span>
      <span>${formatMoney(displayMarketPrice)}</span>
    </div>
    <div class="breakdown-item">
      <span>${t('depreciation.breakdownTimeDepreciation')}</span>
      <span>${(baseDepreciation * 100).toFixed(1)}%</span>
    </div>
    <div class="breakdown-item">
      <span>${t('depreciation.breakdownMileageDepreciation')}</span>
      <span>${(mileageDepreciation * 100).toFixed(1)}%</span>
    </div>
  `;
  if (batteryDepreciation > 0) {
    html += `
      <div class="breakdown-item">
        <span>${t('depreciation.breakdownBattery')}</span>
        <span>${(batteryDepreciation * 100).toFixed(1)}%</span>
      </div>
    `;
  }
  html += `
    <div class="breakdown-item">
      <span>${t('depreciation.breakdownLimitedBase')}</span>
      <span>${(baseDepreciationRate * 100).toFixed(1)}% (${t('depreciation.max60')})</span>
    </div>
    <div class="breakdown-item">
      <span>${t('depreciation.breakdownUsageCoef', { name: getSelectLabel('usageType', usageType) })}</span>
      <span>${usageMultipliers[usageType]}x</span>
    </div>
    <div class="breakdown-item">
      <span>${t('depreciation.breakdownFuelCoef', { name: getSelectLabel('fuelType', fuelType) })}</span>
      <span>${fuelMultipliers[fuelType]}x</span>
    </div>
    <div class="breakdown-item">
      <span>${t('depreciation.breakdownMaintenanceCoef', { name: getSelectLabel('maintenanceLevel', maintenanceLevel) })}</span>
      <span>${maintenanceMultipliers[maintenanceLevel]}x</span>
    </div>
    <div class="breakdown-item">
      <span>${t('depreciation.breakdownClimateCoef', { name: getSelectLabel('climateZone', climateZone) })}</span>
      <span>${climateMultipliers[climateZone]}x</span>
    </div>
    <div class="breakdown-item">
      <span>${t('depreciation.breakdownRegionCoef', { name: getSelectLabel('region', region) })}</span>
      <span>${regionMultipliers[region]}x</span>
    </div>
    <div class="breakdown-item">
      <span>${t('depreciation.breakdownDemandCoef', { name: getSelectLabel('demandLevel', demandLevel) })}</span>
      <span>${demandMultipliers[demandLevel]}x</span>
    </div>
    <div class="breakdown-item">
      <span>${t('depreciation.breakdownTechnicalCoef', { name: getSelectLabel('technicalCondition', technicalCondition) })}</span>
      <span>${technicalConditionMultipliers[technicalCondition]}x</span>
    </div>
    <div class="breakdown-item">
      <span>${t('depreciation.breakdownTotal')}</span>
      <span>${depreciationPercent}% (${t('depreciation.max80')})</span>
    </div>
    <div class="breakdown-item">
      <span>${t('depreciation.breakdownAmount')}</span>
      <span>${formatMoney(totalDepreciation)}</span>
    </div>
    <div class="breakdown-item">
      <span>${t('depreciation.breakdownCurrentValue')}</span>
      <span>${formatMoney(currentValue)}</span>
    </div>
  `;
  if (breakdownList) breakdownList.innerHTML = html;
  return html;
}

function loadHistory(index) {
  try {
    const history = JSON.parse(localStorage.getItem('depreciationHistory') || '[]');
    const entry = history[index];
    Object.entries(entry || {}).forEach(([key, value]) => {
      const el = document.getElementById(key);
      if (el) el.value = value;
    });
    calculateDepreciation();
  } catch {}
}

function renderHistory() {
  try {
    const history = JSON.parse(localStorage.getItem('depreciationHistory') || '[]');
    if (history.length === 0) return;
    document.getElementById('history')?.classList.remove('hidden');
    const list = document.getElementById('historyList');
    if (!list) return;
    list.innerHTML = history.map((entry, index) => `
      <li class="history-item">
        ${entry.carBrand} ${entry.carModel} (${entry.carYear}) - ${new Date(entry.timestamp).toLocaleString(getLocale())}:
        ${formatMoney(entry.result.currentValue)}
        <button type="button" onclick="loadHistory(${index})">${t('depreciation.loadHistory')}</button>
      </li>
    `).join('');
  } catch {}
}

document.addEventListener('DOMContentLoaded', async () => {
  t = await getPageT('depreciation');

  const adObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        loadAdScript();
        (window.MRGtag = window.MRGtag || []).push({});
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });
  document.querySelectorAll('.ad-top-banner, #mobile-anchor-ad').forEach(banner => {
    const ad = banner.querySelector('.mrg-tag');
    if (ad) adObserver.observe(ad);
  });

  const urlParams = new URLSearchParams(window.location.search);
  ['carBrand', 'carModel', 'carYear', 'initialPrice', 'currentMileage', 'usageType', 'fuelType', 'maintenanceLevel', 'climateZone', 'region', 'currentNewPrice', 'marketGrowth', 'inflationRate', 'demandLevel', 'technicalCondition'].forEach(id => {
    const value = urlParams.get(id);
    if (value && document.getElementById(id)) document.getElementById(id).value = value;
  });
  try {
    const last = JSON.parse(localStorage.getItem('lastDepreciation'));
    if (last) Object.entries(last).forEach(([k, v]) => { const el = document.getElementById(k); if (el) el.value = v; });
  } catch {}

  renderHistory();

  if (urlParams.size > 0 || localStorage.getItem('lastDepreciation')) calculateDepreciation();

  if (localStorage.getItem('anchor_closed') !== '1' && window.innerWidth <= 768) {
    const anchor = document.getElementById('mobile-anchor-ad');
    if (anchor) anchor.style.display = 'flex';
  }

  document.querySelectorAll('.input-section input, .input-section select').forEach(input => {
    input.addEventListener('input', debounce(calculateDepreciation, 500));
  });
});

window.calculateDepreciation = calculateDepreciation;
window.resetForm = resetForm;
window.copyShareLink = copyShareLink;
window.exportToPDF = exportToPDF;
window.exportToCSV = exportToCSV;
window.loadHistory = loadHistory;
