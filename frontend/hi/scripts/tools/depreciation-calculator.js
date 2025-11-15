// Общий модуль калькулятора амортизации. Экспортирует функции в window для совместимости с onclick

let calcCache = new Map();
const CACHE_TTL = 60 * 60 * 1000; // 1 час
let adScriptLoaded = false;
let chartInstance = null;

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
  document.querySelector('.input-section').closest('form')?.reset();
  document.getElementById('results')?.classList.add('hidden');
  document.getElementById('breakdown')?.classList.add('hidden');
  document.getElementById('history')?.classList.add('hidden');
  const md = document.querySelector('meta[name="description"]');
  if (md) md.content = 'Расчёт износа автомобиля по пробегу, времени и условиям эксплуатации';
  document.title = 'Калькулятор амортизации автомобиля — Логистика Serpmonn';
  window.history.replaceState({}, '', window.location.pathname);
  document.querySelectorAll('#results > div:not(.result-grid), #results > canvas').forEach(el => el.remove());
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }
  const focusEl = document.getElementById('carBrand');
  if (focusEl) focusEl.focus();
}

function copyShareLink() {
  const url = window.location.href;
  navigator.clipboard.writeText(url).then(() => {
    alert('Ссылка скопирована в буфер обмена!');
  }).catch(() => { alert('Ошибка при копировании ссылки'); });
}

function exportToPDF() {
  loadJsPDF().then(() => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Расчёт амортизации автомобиля', 10, 10);
    doc.setFontSize(12);
    const getText = id => (document.getElementById(id)?.textContent || '').trim();
    doc.text(`Текущая стоимость: ${getText('currentValue')}`, 10, 20);
    doc.text(`Общая амортизация: ${getText('totalDepreciation')}`, 10, 30);
    doc.text(`Процент износа: ${getText('depreciationPercent')}`, 10, 40);
    doc.text(`Месячная амортизация: ${getText('monthlyDepreciation')}`, 10, 50);
    doc.text('Примечание: Этот расчёт является ориентировочным. Для точной оценки обратитесь к профессиональному оценщику.', 10, 60);
    doc.save('depreciation_report.pdf');
  });
}

function exportToCSV() {
  const headers = ['Марка', 'Модель', 'Год', 'Текущая стоимость (₽)', 'Общая амортизация (₽)', 'Процент износа (%)', 'Месячная амортизация (₽)'];
  const getVal = id => document.getElementById(id)?.value || '';
  const getText = id => document.getElementById(id)?.textContent || '';
  const data = [[
    getVal('carBrand'),
    getVal('carModel'),
    getVal('carYear'),
    getText('currentValue'),
    getText('totalDepreciation'),
    getText('depreciationPercent'),
    getText('monthlyDepreciation')
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
    carYear: parseInt(document.getElementById('carYear')?.value || ''),
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

  if (!inputs.initialPrice || !inputs.currentMileage || isNaN(inputs.carYear)) {
    if (errorMessage) {
      errorMessage.textContent = 'Пожалуйста, заполните обязательные поля: год выпуска, начальная стоимость и пробег';
      errorMessage.classList.remove('hidden');
      errorMessage.focus?.();
    }
    return;
  }
  if (inputs.initialPrice < 100000) {
    if (errorMessage) {
      errorMessage.textContent = 'Начальная стоимость должна быть не менее 100,000 ₽';
      errorMessage.classList.remove('hidden');
      errorMessage.focus?.();
    }
    return;
  }
  if (inputs.currentMileage < 0) {
    if (errorMessage) {
      errorMessage.textContent = 'Пробег не может быть отрицательным';
      errorMessage.classList.remove('hidden');
      errorMessage.focus?.();
    }
    return;
  }
  if (inputs.currentMileage > 500000) {
    if (errorMessage) {
      errorMessage.textContent = 'Пробег > 500,000 км - проверьте данные, амортизация может быть неточной';
      errorMessage.classList.remove('hidden');
      errorMessage.focus?.();
    }
  }
  if (inputs.currentNewPrice && inputs.currentNewPrice < 100000) {
    if (errorMessage) {
      errorMessage.textContent = 'Текущая цена новых аналогов должна быть не менее 100,000 ₽';
      errorMessage.classList.remove('hidden');
      errorMessage.focus?.();
    }
    return;
  }
  if (inputs.marketGrowth && (inputs.marketGrowth < 0 || inputs.marketGrowth > 200)) {
    if (errorMessage) {
      errorMessage.textContent = 'Рыночный рост цен должен быть от 0 до 200%';
      errorMessage.classList.remove('hidden');
      errorMessage.focus?.();
    }
    return;
  }
  if (inputs.inflationRate && (inputs.inflationRate < 0 || inputs.inflationRate > 50)) {
    if (errorMessage) {
      errorMessage.textContent = 'Годовая инфляция должна быть от 0 до 50%';
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
      const historySize = JSON.stringify(history).length;
      if (historySize < 5 * 1024 * 1024) localStorage.setItem('depreciationHistory', JSON.stringify(history));
    } catch {}

    document.getElementById('results')?.classList.remove('loading', 'hidden');
    document.getElementById('breakdown')?.classList.remove('loading', 'hidden');
  }, 300);
}

function displayResults(currentValue, totalDepreciation, depreciationPercent, monthlyDepreciation, totalDepreciationRate, inputs, adjustedInitialPrice, batteryDepreciation) {
  const cv = document.getElementById('currentValue'); if (cv) cv.textContent = Math.round(currentValue).toLocaleString() + ' ₽';
  const td = document.getElementById('totalDepreciation'); if (td) td.textContent = Math.round(totalDepreciation).toLocaleString() + ' ₽';
  const dp = document.getElementById('depreciationPercent'); if (dp) dp.textContent = depreciationPercent + '%';
  const md = document.getElementById('monthlyDepreciation'); if (md) md.textContent = Math.round(monthlyDepreciation).toLocaleString() + ' ₽/мес';

  if (inputs.carBrand && inputs.carModel) {
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.content = `Рассчитайте амортизацию ${inputs.carBrand} ${inputs.carModel} (${inputs.carYear}) с учётом пробега и условий эксплуатации`;
    document.title = `Амортизация ${inputs.carBrand} ${inputs.carModel} (${inputs.carYear}) — Serpmonn`;
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
    let mileageDepreciation = 0;
    if (forecastMileage <= 50000) mileageDepreciation = forecastMileage / 50000 * 0.1;
    else if (forecastMileage <= 150000) mileageDepreciation = 0.1 + (forecastMileage - 50000) / 100000 * 0.15;
    else if (forecastMileage <= 300000) mileageDepreciation = 0.25 + (forecastMileage - 150000) / 150000 * 0.2;
    else mileageDepreciation = 0.45 + (forecastMileage - 300000) / 100000 * 0.1;
    if (inputs.fuelType === 'electric') mileageDepreciation += Math.min(forecastMileage / 200000 * 0.2, 0.2);
    const forecastDepreciation = Math.min(accumulatedDepreciation + mileageDepreciation, 0.6);
    const yearValue = inputs.initialPrice * (1 - forecastDepreciation);
    chartData.push({ x: currentYear + year, y: Math.round(yearValue), forecast: true });
  }
  loadChartJs().then(() => {
    if (chartInstance) chartInstance.destroy();
    const prevCanvas = document.getElementById('depreciationChart');
    if (prevCanvas && prevCanvas.parentNode) prevCanvas.parentNode.removeChild(prevCanvas);
    const chartCanvas = document.createElement('canvas');
    chartCanvas.id = 'depreciationChart';
    chartCanvas.style.maxHeight = '300px';
    chartCanvas.style.marginTop = '20px';
    document.getElementById('results')?.prepend(chartCanvas);
    chartInstance = new Chart(chartCanvas, {
      type: 'line',
      data: {
        datasets: [
          { label: 'Историческая стоимость (₽)', data: chartData.filter(d => !d.forecast), borderColor: '#007bff', backgroundColor: 'rgba(0, 123, 255, 0.1)', fill: true, tension: 0.4 },
          { label: 'Прогноз стоимости (₽)', data: chartData.filter(d => d.forecast), borderColor: '#28a745', backgroundColor: 'rgba(40, 167, 69, 0.1)', fill: true, tension: 0.4, borderDash: [5, 5] }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, scales: { x: { title: { display: true, text: 'Год' } }, y: { title: { display: true, text: 'Стоимость (₽)' }, ticks: { callback: function(value){ return value.toLocaleString('ru-RU') + ' ₽'; } } } }, plugins: { legend: { display: true } } }
    });
  });

  if (totalDepreciationRate > 0.7) {
    const warning = document.createElement('div');
    warning.style.cssText = 'background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin-top: 20px; color: #856404;';
    warning.innerHTML = `\n            <strong>⚠️ Высокая амортизация:</strong><br>\n            • Процент износа: ${depreciationPercent}%<br>\n            • Рекомендуется проверить введённые данные<br>\n            • При таких значениях автомобиль может быть в плохом состоянии\n          `;
    document.getElementById('results')?.appendChild(warning);
  }
  if (inputs.currentNewPrice || inputs.marketGrowth || inputs.inflationRate) {
    const explanation = document.createElement('div');
    explanation.style.cssText = 'background: #e8f5e8; border: 1px solid #c3e6c3; border-radius: 8px; padding: 15px; margin-top: 20px; color: #155724;';
    const ageFactor = Math.max(0.3, 1 - ((new Date().getFullYear() - inputs.carYear) * 0.05));
    let html = '<strong>💡 Рыночная корректировка применена:</strong><br>';
    html += `• Начальная цена: ${Math.round(inputs.initialPrice).toLocaleString()} ₽<br>`;
    if (inputs.inflationRate) html += `• Скорректированная начальная цена (с учётом инфляции ${inputs.inflationRate}%): ${Math.round(adjustedInitialPrice).toLocaleString()} ₽<br>`;
    if (inputs.currentNewPrice) {
      html += `• Текущая цена новых аналогов: ${Math.round(inputs.currentNewPrice).toLocaleString()} ₽<br>`;
      html += `• Коэффициент роста: ${(inputs.currentNewPrice / inputs.initialPrice).toFixed(2)}x<br>`;
    } else if (inputs.marketGrowth) {
      html += `• Рост цен: +${inputs.marketGrowth}%<br>`;
    }
    html += `• Возрастной фактор: ${(ageFactor * 100).toFixed(0)}%<br>`;
    html += `• Итоговая стоимость с учётом рынка: ${Math.round(currentValue).toLocaleString()} ₽`;
    explanation.innerHTML = html;
    document.getElementById('results')?.appendChild(explanation);
  }
  const disclaimer = document.createElement('div');
  disclaimer.className = 'disclaimer';
  disclaimer.innerHTML = '<p>Этот расчёт является ориентировочным и основан на усреднённых данных. Для точной оценки обратитесь к профессиональному оценщику.</p>';
  document.getElementById('results')?.appendChild(disclaimer);
}

function showBreakdown(initialPrice, baseDepreciation, mileageDepreciation, batteryDepreciation, usageType, fuelType, maintenanceLevel, climateZone, region, currentNewPrice, marketGrowth, inflationRate, demandLevel, technicalCondition, baseDepreciationRate, totalDepreciationRate, totalDepreciation, currentValue, multipliers) {
  const { usageMultipliers, fuelMultipliers, maintenanceMultipliers, climateMultipliers, regionMultipliers, demandMultipliers, technicalConditionMultipliers } = multipliers;
  const breakdownList = document.getElementById('breakdownList');
  const depreciationPercent = (totalDepreciationRate * 100).toFixed(1);
  const usageNames = { personal: 'Личное использование', taxi: 'Такси', commercial: 'Коммерческие перевозки', delivery: 'Доставка' };
  const fuelNames = { petrol: 'Бензин', diesel: 'Дизель', hybrid: 'Гибрид', electric: 'Электро' };
  const maintenanceNames = { excellent: 'Отличный', good: 'Хороший', average: 'Средний', poor: 'Плохой' };
  const climateNames = { mild: 'Умеренная', cold: 'Холодная', hot: 'Жаркая', humid: 'Влажная' };
  const regionNames = { central: 'Центральный (Москва)', north: 'Север (СПб)', siberia: 'Сибирь', south: 'Юг' };
  const demandNames = { high: 'Высокий спрос', medium: 'Средний спрос', low: 'Низкий спрос' };
  const technicalConditionNames = { excellent: 'Отличное', good: 'Хорошее', average: 'Среднее', poor: 'Плохое' };
  let displayMarketPrice = initialPrice;
  if (currentNewPrice) displayMarketPrice = currentNewPrice; else if (marketGrowth) displayMarketPrice = initialPrice * (1 + marketGrowth / 100);
  let html = `
          <div class="breakdown-item">
            <span>Начальная стоимость</span>
            <span>${Math.round(initialPrice).toLocaleString()} ₽</span>
          </div>
        `;
  if (inflationRate) {
    html += `
            <div class="breakdown-item">
              <span>Скорректированная начальная стоимость (инфляция ${inflationRate}%)</span>
              <span>${Math.round(initialPrice).toLocaleString()} ₽</span>
            </div>
          `;
  }
  html += `
          <div class="breakdown-item">
            <span>Рыночная корректировка</span>
            <span>${Math.round(displayMarketPrice).toLocaleString()} ₽</span>
          </div>
          <div class="breakdown-item">
            <span>Амортизация по времени</span>
            <span>${(baseDepreciation * 100).toFixed(1)}%</span>
          </div>
          <div class="breakdown-item">
            <span>Амортизация по пробегу</span>
            <span>${(mileageDepreciation * 100).toFixed(1)}%</span>
          </div>
        `;
  if (batteryDepreciation > 0) {
    html += `
            <div class="breakdown-item">
              <span>Износ батареи (электромобиль)</span>
              <span>${(batteryDepreciation * 100).toFixed(1)}%</span>
            </div>
          `;
  }
  html += `
          <div class="breakdown-item">
            <span>Ограниченная базовая амортизация</span>
            <span>${(baseDepreciationRate * 100).toFixed(1)}% (макс. 60%)</span>
          </div>
          <div class="breakdown-item">
            <span>Коэффициент использования (${usageNames[usageType]})</span>
            <span>${usageMultipliers[usageType]}x</span>
          </div>
          <div class="breakdown-item">
            <span>Коэффициент топлива (${fuelNames[fuelType]})</span>
            <span>${fuelMultipliers[fuelType]}x</span>
          </div>
          <div class="breakdown-item">
            <span>Коэффициент обслуживания (${maintenanceNames[maintenanceLevel]})</span>
            <span>${maintenanceMultipliers[maintenanceLevel]}x</span>
          </div>
          <div class="breakdown-item">
            <span>Коэффициент климата (${climateNames[climateZone]})</span>
            <span>${climateMultipliers[climateZone]}x</span>
          </div>
          <div class="breakdown-item">
            <span>Коэффициент региона (${regionNames[region]})</span>
            <span>${regionMultipliers[region]}x</span>
          </div>
          <div class="breakdown-item">
            <span>Коэффициент спроса (${demandNames[demandLevel]})</span>
            <span>${demandMultipliers[demandLevel]}x</span>
          </div>
          <div class="breakdown-item">
            <span>Коэффициент технического состояния (${technicalConditionNames[technicalCondition]})</span>
            <span>${technicalConditionMultipliers[technicalCondition]}x</span>
          </div>
          <div class="breakdown-item">
            <span>Итоговая амортизация</span>
            <span>${depreciationPercent}% (макс. 80%)</span>
          </div>
          <div class="breakdown-item">
            <span>Сумма амортизации</span>
            <span>${Math.round(totalDepreciation).toLocaleString()} ₽</span>
          </div>
          <div class="breakdown-item">
            <span>Текущая стоимость</span>
            <span>${Math.round(currentValue).toLocaleString()} ₽</span>
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

document.addEventListener('DOMContentLoaded', () => {
  // Ленивое подключение рекламы при видимости
  const adObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          loadAdScript();
          (window.MRGtag = window.MRGtag || []).push({});
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.1 }
  );
  document.querySelectorAll('.ad-top-banner, #mobile-anchor-ad').forEach(banner => {
    const ad = banner.querySelector('.mrg-tag');
    if (ad) adObserver.observe(ad);
  });

  // Восстановление параметров из URL/LocalStorage
  const urlParams = new URLSearchParams(window.location.search);
  ['carBrand','carModel','carYear','initialPrice','currentMileage','usageType','fuelType','maintenanceLevel','climateZone','region','currentNewPrice','marketGrowth','inflationRate','demandLevel','technicalCondition'].forEach(id => {
    const value = urlParams.get(id);
    if (value && document.getElementById(id)) document.getElementById(id).value = value;
  });
  try {
    const last = JSON.parse(localStorage.getItem('lastDepreciation'));
    if (last) Object.entries(last).forEach(([k,v]) => { const el = document.getElementById(k); if (el) el.value = v; });
  } catch {}

  // История
  try {
    const history = JSON.parse(localStorage.getItem('depreciationHistory') || '[]');
    if (history.length > 0) {
      document.getElementById('history')?.classList.remove('hidden');
      const list = document.getElementById('historyList');
      if (list) list.innerHTML = history.map((entry, index) => `
              <li class="history-item">
                ${entry.carBrand} ${entry.carModel} (${entry.carYear}) - ${new Date(entry.timestamp).toLocaleString()}:
                ${Math.round(entry.result.currentValue).toLocaleString()} ₽
                <button onclick="loadHistory(${index})">Загрузить</button>
              </li>
            `).join('');
    }
  } catch {}

  if (urlParams.size > 0 || localStorage.getItem('lastDepreciation')) calculateDepreciation();

  // Восстановление/показ якорной рекламы на мобилке
  if (localStorage.getItem('anchor_closed') !== '1' && window.innerWidth <= 768) {
    const anchor = document.getElementById('mobile-anchor-ad');
    if (anchor) anchor.style.display = 'flex';
  }

  // Автопересчёт
  document.querySelectorAll('.input-section input, .input-section select').forEach(input => {
    input.addEventListener('input', debounce(calculateDepreciation, 500));
  });
});

// Экспорт в глобальную область для поддержки onclick в разметке
window.calculateDepreciation = calculateDepreciation;
window.resetForm = resetForm;
window.copyShareLink = copyShareLink;
window.exportToPDF = exportToPDF;
window.exportToCSV = exportToCSV;
window.loadHistory = loadHistory;

