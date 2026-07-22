import { getPageT } from '/frontend/scripts/i18n-loader.js';
import { escapeHtml } from '/frontend/scripts/finding-content-render.js';

let t = (key, vars = {}) => {
  let value = key;
  for (const [name, val] of Object.entries(vars)) {
    value = value.replaceAll(`{${name}}`, String(val));
  }
  return value;
};

let calcCache = new Map();
const CACHE_TTL = 60 * 60 * 1000;
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

function parseNumericInput(id) {
  const raw = document.getElementById(id)?.value || '';
  const cleaned = String(raw).replace(/[\s\u00A0]/g, '').replace(',', '.');
  if (!cleaned) return NaN;
  return parseFloat(cleaned);
}

function formatGroupedNumber(value) {
  const digits = String(value ?? '').replace(/[^\d]/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function bindMoneyInputs() {
  document.querySelectorAll('.money-input').forEach((el) => {
    const apply = () => {
      el.value = formatGroupedNumber(el.value);
    };
    el.addEventListener('input', apply);
    el.addEventListener('blur', apply);
    apply();
  });
}

function setCurrentYearMax() {
  const year = new Date().getFullYear();
  const yearInput = document.getElementById('carYear');
  if (!yearInput) return;
  yearInput.max = String(year);
  yearInput.title = t('depreciation.yearRangeTitle', { year });
  const current = parseInt(yearInput.value || '', 10);
  if (!Number.isNaN(current) && current > year) yearInput.value = String(year);
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

const pdfFontCache = {};

async function loadPdfFontBinary(path) {
  if (pdfFontCache[path]) return pdfFontCache[path];
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Font load failed: ${path}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  pdfFontCache[path] = binary;
  return binary;
}

function getFieldValue(id) {
  return (document.getElementById(id)?.value || '').trim();
}

function hasCalculatedResults() {
  const results = document.getElementById('results');
  return Boolean(results && !results.classList.contains('hidden') && getResultText('currentValue'));
}

function getExportData() {
  const brand = getFieldValue('carBrand');
  const model = getFieldValue('carModel');
  const vehicle = [brand, model].filter(Boolean).join(' ').trim() || '—';
  return {
    brand: brand || '—',
    model: model || '—',
    vehicle,
    year: getFieldValue('carYear') || '—',
    initialPrice: formatGroupedNumber(parseNumericInput('initialPrice')) || getFieldValue('initialPrice') || '—',
    mileage: getFieldValue('currentMileage') || '—',
    currentValue: getResultText('currentValue') || '—',
    totalDepreciation: getResultText('totalDepreciation') || '—',
    percent: getResultText('depreciationPercent') || '—',
    monthly: getResultText('monthlyDepreciation') || '—',
    costPerKm: getResultText('costPerKm') || '—'
  };
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[";\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function ensureExportReady() {
  if (hasCalculatedResults()) return true;
  alert(t('depreciation.exportNoResults'));
  return false;
}

async function exportToPDF() {
  if (!ensureExportReady()) return;
  try {
    await loadJsPDF();
    const data = getExportData();
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    const [regular, bold] = await Promise.all([
      loadPdfFontBinary('/frontend/fonts/DejaVuSans.ttf'),
      loadPdfFontBinary('/frontend/fonts/DejaVuSans-Bold.ttf')
    ]);
    doc.addFileToVFS('DejaVuSans.ttf', regular);
    doc.addFileToVFS('DejaVuSans-Bold.ttf', bold);
    doc.addFont('DejaVuSans.ttf', 'DejaVuSans', 'normal');
    doc.addFont('DejaVuSans-Bold.ttf', 'DejaVuSans', 'bold');

    const margin = 16;
    const pageHeight = 297;
    const maxWidth = 210 - margin * 2;
    let y = 20;

    const ensureSpace = (need = 10) => {
      if (y + need <= pageHeight - margin) return;
      doc.addPage();
      y = 20;
    };

    const writeLine = (textLine, { size = 11, style = 'normal', gap = 7 } = {}) => {
      doc.setFont('DejaVuSans', style);
      doc.setFontSize(size);
      const lines = doc.splitTextToSize(String(textLine), maxWidth);
      lines.forEach((line) => {
        ensureSpace(gap + 2);
        doc.text(line, margin, y);
        y += gap;
      });
    };

    writeLine(t('depreciation.pdfTitle'), { size: 16, style: 'bold', gap: 9 });
    y += 2;
    writeLine(t('depreciation.pdfVehicle', { value: data.vehicle }));
    writeLine(t('depreciation.pdfYear', { value: data.year }));
    writeLine(t('depreciation.pdfInitialPrice', { value: `${data.initialPrice} ${getCurrency()}` }));
    writeLine(t('depreciation.pdfMileage', { value: data.mileage }));
    y += 3;
    writeLine(t('depreciation.pdfCostPerKm', { value: data.costPerKm }), { size: 12, style: 'bold' });
    writeLine(t('depreciation.pdfCurrentValue', { value: data.currentValue }));
    writeLine(t('depreciation.pdfTotalDepreciation', { value: data.totalDepreciation }));
    writeLine(t('depreciation.pdfPercent', { value: data.percent }));
    writeLine(t('depreciation.pdfMonthly', { value: data.monthly }));

    const formulaBody = document.getElementById('formulaPlainBody')?.innerText?.trim();
    if (formulaBody) {
      y += 3;
      writeLine(t('depreciation.formulaTitle'), { size: 12, style: 'bold' });
      formulaBody.split(/\n+/).forEach((line) => writeLine(line, { size: 9, gap: 5 }));
    }

    const breakdownText = document.getElementById('breakdownList')?.innerText?.trim();
    if (breakdownText) {
      y += 3;
      writeLine(t('depreciation.pdfBreakdownTitle'), { size: 12, style: 'bold' });
      breakdownText.split(/\n+/).forEach((line) => {
        if (line.trim()) writeLine(line.trim(), { size: 9, gap: 5 });
      });
    }

    const chartCanvas = document.getElementById('depreciationChart');
    if (chartCanvas && chartInstance) {
      try {
        const img = chartCanvas.toDataURL('image/png', 1.0);
        const chartHeight = 62;
        ensureSpace(chartHeight + 12);
        y += 2;
        writeLine(t('depreciation.pdfChartTitle'), { size: 12, style: 'bold' });
        ensureSpace(chartHeight + 4);
        doc.addImage(img, 'PNG', margin, y, maxWidth, chartHeight);
        y += chartHeight + 4;
      } catch (chartErr) {
        console.warn('PDF chart export skipped', chartErr);
      }
    }

    y += 4;
    writeLine(t('depreciation.pdfNote'), { size: 9, gap: 5 });
    y += 4;
    writeLine(`${window.location.origin}${window.location.pathname}`, { size: 8, gap: 4 });
    writeLine(new Date().toLocaleString(getLocale()), { size: 8, gap: 4 });

    doc.save('depreciation_report.pdf');
  } catch (err) {
    console.error(err);
    alert(t('depreciation.linkCopyError'));
  }
}

function exportToCSV() {
  if (!ensureExportReady()) return;
  const data = getExportData();
  const headers = [
    t('depreciation.csvBrand'),
    t('depreciation.csvModel'),
    t('depreciation.csvYear'),
    t('depreciation.csvInitialPrice'),
    t('depreciation.csvMileage'),
    t('depreciation.csvCostPerKm'),
    t('depreciation.csvCurrentValue'),
    t('depreciation.csvTotalDepreciation'),
    t('depreciation.csvPercent'),
    t('depreciation.csvMonthly')
  ];
  const row = [
    data.brand,
    data.model,
    data.year,
    data.initialPrice,
    data.mileage,
    data.costPerKm,
    data.currentValue,
    data.totalDepreciation,
    data.percent,
    data.monthly
  ];
  const sep = ';';
  const csv = `\uFEFF${headers.map(csvEscape).join(sep)}\n${row.map(csvEscape).join(sep)}\n`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'depreciation_report.csv';
  link.click();
  URL.revokeObjectURL(link.href);
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

function calculateDepreciation(options) {
  const opts = (options && typeof options === 'object' && !(options instanceof Event)) ? options : {};
  const shouldScroll = Boolean(opts.scroll);
  const saveHistory = Boolean(opts.saveHistory);
  const errorMessage = document.getElementById('error-message');
  if (errorMessage) errorMessage.classList.add('hidden');
  const inputs = {
    carBrand: sanitizeInput(document.getElementById('carBrand')?.value || ''),
    carModel: sanitizeInput(document.getElementById('carModel')?.value || ''),
    carYear: parseInt(document.getElementById('carYear')?.value || '', 10),
    initialPrice: parseNumericInput('initialPrice'),
    currentMileage: parseNumericInput('currentMileage'),
    usageType: document.getElementById('usageType')?.value || 'personal',
    fuelType: document.getElementById('fuelType')?.value || 'petrol',
    maintenanceLevel: document.getElementById('maintenanceLevel')?.value || 'average',
    climateZone: document.getElementById('climateZone')?.value || 'mild',
    region: document.getElementById('region')?.value || 'south',
    currentNewPrice: parseNumericInput('currentNewPrice'),
    marketGrowth: parseFloat(document.getElementById('marketGrowth')?.value || ''),
    inflationRate: parseFloat(document.getElementById('inflationRate')?.value || ''),
    demandLevel: document.getElementById('demandLevel')?.value || 'medium',
    technicalCondition: document.getElementById('technicalCondition')?.value || 'good'
  };

  if (!inputs.initialPrice || !inputs.currentMileage || Number.isNaN(inputs.carYear)) {
    if (errorMessage) {
      errorMessage.textContent = t('depreciation.errorRequiredFields');
      errorMessage.classList.remove('hidden');
      if (shouldScroll) errorMessage.focus?.();
    }
    return;
  }
  if (inputs.initialPrice < 100000) {
    if (errorMessage) {
      errorMessage.textContent = t('depreciation.errorMinPrice');
      errorMessage.classList.remove('hidden');
      if (shouldScroll) errorMessage.focus?.();
    }
    return;
  }
  if (inputs.currentMileage < 0) {
    if (errorMessage) {
      errorMessage.textContent = t('depreciation.errorNegativeMileage');
      errorMessage.classList.remove('hidden');
      if (shouldScroll) errorMessage.focus?.();
    }
    return;
  }
  if (inputs.currentMileage > 500000) {
    if (errorMessage) {
      errorMessage.textContent = t('depreciation.warnHighMileage');
      errorMessage.classList.remove('hidden');
      if (shouldScroll) errorMessage.focus?.();
    }
  }
  if (inputs.currentNewPrice && inputs.currentNewPrice < 100000) {
    if (errorMessage) {
      errorMessage.textContent = t('depreciation.errorMinNewPrice');
      errorMessage.classList.remove('hidden');
      if (shouldScroll) errorMessage.focus?.();
    }
    return;
  }
  if (inputs.marketGrowth && (inputs.marketGrowth < 0 || inputs.marketGrowth > 200)) {
    if (errorMessage) {
      errorMessage.textContent = t('depreciation.errorMarketGrowthRange');
      errorMessage.classList.remove('hidden');
      if (shouldScroll) errorMessage.focus?.();
    }
    return;
  }
  if (inputs.inflationRate && (inputs.inflationRate < 0 || inputs.inflationRate > 50)) {
    if (errorMessage) {
      errorMessage.textContent = t('depreciation.errorInflationRange');
      errorMessage.classList.remove('hidden');
      if (shouldScroll) errorMessage.focus?.();
    }
    return;
  }

  const cacheKey = JSON.stringify(inputs);
  if (calcCache.has(cacheKey)) {
    const cached = calcCache.get(cacheKey);
    const { currentValue, totalDepreciation, depreciationPercent, monthlyDepreciation, totalDepreciationRate, breakdown, plainFormula } = cached;
    displayResults(currentValue, totalDepreciation, depreciationPercent, monthlyDepreciation, totalDepreciationRate, inputs, undefined, undefined, plainFormula);
    const bd = document.getElementById('breakdownList');
    if (bd) bd.innerHTML = breakdown;
    document.getElementById('results')?.classList.remove('hidden');
    document.getElementById('breakdown')?.classList.remove('hidden');
    if (saveHistory) persistHistory(inputs, { currentValue, totalDepreciation, depreciationPercent, monthlyDepreciation });
    if (shouldScroll) {
      document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
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

    const plainFormula = buildPlainFormula(inputs, {
      ageInYears,
      baseDepreciation,
      mileageDepreciation,
      totalDepreciationRate,
      totalDepreciation,
      currentValue
    });

    displayResults(currentValue, totalDepreciation, depreciationPercent, monthlyDepreciation, totalDepreciationRate, inputs, adjustedInitialPrice, batteryDepreciation, plainFormula);

    calcCache.set(cacheKey, { currentValue, totalDepreciation, depreciationPercent, monthlyDepreciation, totalDepreciationRate, breakdown, plainFormula, timestamp: Date.now() });
    for (const [key, value] of calcCache) if (Date.now() - value.timestamp > CACHE_TTL) calcCache.delete(key);
    if (saveHistory) {
      persistHistory(inputs, { currentValue, totalDepreciation, depreciationPercent, monthlyDepreciation });
    }

    document.getElementById('results')?.classList.remove('loading', 'hidden');
    document.getElementById('breakdown')?.classList.remove('loading', 'hidden');
    if (shouldScroll) {
      document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 300);
}

function displayResults(currentValue, totalDepreciation, depreciationPercent, monthlyDepreciation, totalDepreciationRate, inputs, adjustedInitialPrice, batteryDepreciation, plainFormula) {
  const cv = document.getElementById('currentValue');
  if (cv) cv.textContent = formatMoney(currentValue);
  const td = document.getElementById('totalDepreciation');
  if (td) td.textContent = formatMoney(totalDepreciation);
  const dp = document.getElementById('depreciationPercent');
  if (dp) dp.textContent = `${depreciationPercent}%`;
  const md = document.getElementById('monthlyDepreciation');
  if (md) md.textContent = formatMonthly(monthlyDepreciation);

  const perKmEl = document.getElementById('costPerKm');
  if (perKmEl) {
    const mileage = Number(inputs.currentMileage) || 0;
    if (mileage > 0) {
      const perKm = totalDepreciation / mileage;
      const currency = document.body.dataset.currency || '₽';
      perKmEl.textContent = `${perKm.toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })} ${currency}/км`;
    } else {
      perKmEl.textContent = '—';
    }
  }

  renderPlainFormula(plainFormula);

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
    const chartCanvas = document.getElementById('depreciationChart');
    if (!chartCanvas) return;
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
      <strong>${escapeHtml(t('depreciation.highDepreciationTitle'))}</strong><br>
      ${escapeHtml(t('depreciation.highDepreciationPercent', { percent: depreciationPercent }))}<br>
      ${escapeHtml(t('depreciation.highDepreciationCheck'))}<br>
      ${escapeHtml(t('depreciation.highDepreciationCondition'))}
    `;
    document.getElementById('results')?.appendChild(warning);
  }

  if (inputs.currentNewPrice || inputs.marketGrowth || inputs.inflationRate) {
    const explanation = document.createElement('div');
    explanation.style.cssText = 'background: #e8f5e8; border: 1px solid #c3e6c3; border-radius: 8px; padding: 15px; margin-top: 20px; color: #155724;';
    const ageFactor = Math.max(0.3, 1 - ((new Date().getFullYear() - inputs.carYear) * 0.05));
    let html = `<strong>${escapeHtml(t('depreciation.marketAdjustmentTitle'))}</strong><br>`;
    html += `${escapeHtml(t('depreciation.initialPriceLine', { amount: formatMoney(inputs.initialPrice) }))}<br>`;
    if (inputs.inflationRate) {
      html += `${escapeHtml(t('depreciation.adjustedPriceInflation', { rate: inputs.inflationRate, amount: formatMoney(adjustedInitialPrice) }))}<br>`;
    }
    if (inputs.currentNewPrice) {
      html += `${escapeHtml(t('depreciation.currentNewPriceLine', { amount: formatMoney(inputs.currentNewPrice) }))}<br>`;
      html += `${escapeHtml(t('depreciation.growthRatio', { ratio: (inputs.currentNewPrice / inputs.initialPrice).toFixed(2) }))}<br>`;
    } else if (inputs.marketGrowth) {
      html += `${escapeHtml(t('depreciation.priceGrowth', { percent: inputs.marketGrowth }))}<br>`;
    }
    html += `${escapeHtml(t('depreciation.ageFactor', { percent: (ageFactor * 100).toFixed(0) }))}<br>`;
    html += escapeHtml(t('depreciation.finalMarketValue', { amount: formatMoney(currentValue) }));
    explanation.innerHTML = html;
    document.getElementById('results')?.appendChild(explanation);
  }

  const disclaimer = document.createElement('div');
  disclaimer.className = 'disclaimer';
  disclaimer.innerHTML = `<p>${escapeHtml(t('depreciation.disclaimer'))}</p>`;
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

const HISTORY_FIELD_IDS = [
  'carBrand', 'carModel', 'carYear', 'initialPrice', 'currentMileage',
  'usageType', 'fuelType', 'maintenanceLevel', 'climateZone', 'region',
  'currentNewPrice', 'marketGrowth', 'inflationRate', 'demandLevel', 'technicalCondition'
];

function persistHistory(inputs, result) {
  try {
    const history = JSON.parse(localStorage.getItem('depreciationHistory') || '[]');
    history.unshift({ ...inputs, timestamp: new Date().toISOString(), result });
    if (history.length > 5) history.pop();
    if (JSON.stringify(history).length < 5 * 1024 * 1024) {
      localStorage.setItem('depreciationHistory', JSON.stringify(history));
    }
    renderHistory();
  } catch (err) {
    console.error(err);
  }
}

function deleteHistory(index) {
  try {
    const history = JSON.parse(localStorage.getItem('depreciationHistory') || '[]');
    if (index < 0 || index >= history.length) return;
    history.splice(index, 1);
    localStorage.setItem('depreciationHistory', JSON.stringify(history));
    renderHistory();
  } catch (err) {
    console.error(err);
  }
}

function buildPlainFormula(inputs, parts) {
  const {
    ageInYears,
    baseDepreciation,
    mileageDepreciation,
    totalDepreciationRate,
    totalDepreciation,
    currentValue
  } = parts;
  const mileage = Number(inputs.currentMileage) || 0;
  const perKm = mileage > 0
    ? `${(totalDepreciation / mileage).toLocaleString(getLocale(), { maximumFractionDigits: 2, minimumFractionDigits: 2 })} ${getCurrency()}/км`
    : '—';
  return [
    t('depreciation.formulaIntro'),
    t('depreciation.formulaAge', {
      years: Math.max(ageInYears, 0),
      percent: (baseDepreciation * 100).toFixed(1)
    }),
    t('depreciation.formulaMileage', {
      km: mileage.toLocaleString(getLocale()),
      percent: (mileageDepreciation * 100).toFixed(1)
    }),
    t('depreciation.formulaFactors', {
      usage: getSelectLabel('usageType', inputs.usageType),
      fuel: getSelectLabel('fuelType', inputs.fuelType),
      maintenance: getSelectLabel('maintenanceLevel', inputs.maintenanceLevel),
      climate: getSelectLabel('climateZone', inputs.climateZone),
      region: getSelectLabel('region', inputs.region),
      demand: getSelectLabel('demandLevel', inputs.demandLevel),
      condition: getSelectLabel('technicalCondition', inputs.technicalCondition)
    }),
    t('depreciation.formulaResult', {
      percent: (totalDepreciationRate * 100).toFixed(1),
      total: formatMoney(totalDepreciation),
      value: formatMoney(currentValue),
      perKm
    })
  ].join('\n');
}

function renderPlainFormula(plainFormula) {
  const box = document.getElementById('formulaPlain');
  const body = document.getElementById('formulaPlainBody');
  if (!box || !body) return;
  if (!plainFormula) {
    box.classList.add('hidden');
    body.replaceChildren();
    return;
  }
  body.replaceChildren();
  plainFormula.split('\n').forEach((line) => {
    const p = document.createElement('p');
    p.textContent = line;
    body.appendChild(p);
  });
  box.classList.remove('hidden');
}

function loadHistory(index) {
  try {
    const history = JSON.parse(localStorage.getItem('depreciationHistory') || '[]');
    const entry = history[index];
    if (!entry) return;

    let hasOptional = false;
    HISTORY_FIELD_IDS.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const value = entry[id];
      if (value == null || value === '' || Number.isNaN(value)) {
        if (el.tagName === 'SELECT') return;
        el.value = '';
        return;
      }
      if (id === 'initialPrice' || id === 'currentNewPrice') {
        el.value = formatGroupedNumber(value);
      } else {
        el.value = value;
      }
      if (!['carYear', 'initialPrice', 'currentMileage'].includes(id)) hasOptional = true;
    });

    const optional = document.querySelector('.optional-fields');
    if (optional && hasOptional) optional.open = true;

    calculateDepreciation({ scroll: true, saveHistory: false });
  } catch (err) {
    console.error(err);
  }
}

function renderHistory() {
  try {
    const history = JSON.parse(localStorage.getItem('depreciationHistory') || '[]');
    const section = document.getElementById('history');
    const list = document.getElementById('historyList');
    if (!section || !list) return;
    if (history.length === 0) {
      section.classList.add('hidden');
      list.replaceChildren();
      return;
    }
    section.classList.remove('hidden');
    list.replaceChildren();
    history.forEach((entry, index) => {
      const li = document.createElement('li');
      li.className = 'history-item';

      const meta = document.createElement('span');
      meta.className = 'history-item__meta';
      const title = [entry.carBrand, entry.carModel].filter(Boolean).join(' ') || t('depreciation.pdfTitle');
      meta.textContent = `${title} (${entry.carYear || '—'}) · ${new Date(entry.timestamp).toLocaleString(getLocale())} · ${formatMoney(entry.result?.currentValue)}`;

      const actions = document.createElement('div');
      actions.className = 'history-item__actions';

      const loadBtn = document.createElement('button');
      loadBtn.type = 'button';
      loadBtn.className = 'history-load-btn';
      loadBtn.textContent = t('depreciation.loadHistory');
      loadBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        loadHistory(index);
      });

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'history-delete-btn';
      deleteBtn.textContent = t('depreciation.deleteHistory');
      deleteBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        deleteHistory(index);
      });

      actions.append(loadBtn, deleteBtn);
      li.append(meta, actions);
      list.appendChild(li);
    });
  } catch (err) {
    console.error(err);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  t = await getPageT('depreciation');
  setCurrentYearMax();

  const urlParams = new URLSearchParams(window.location.search);
  ['carBrand', 'carModel', 'carYear', 'initialPrice', 'currentMileage', 'usageType', 'fuelType', 'maintenanceLevel', 'climateZone', 'region', 'currentNewPrice', 'marketGrowth', 'inflationRate', 'demandLevel', 'technicalCondition'].forEach(id => {
    const value = urlParams.get(id);
    if (value && document.getElementById(id)) {
      const el = document.getElementById(id);
      el.value = (id === 'initialPrice' || id === 'currentNewPrice') ? formatGroupedNumber(value) : value;
    }
  });
  try {
    const last = JSON.parse(localStorage.getItem('lastDepreciation'));
    if (last) {
      Object.entries(last).forEach(([k, v]) => {
        const el = document.getElementById(k);
        if (!el) return;
        el.value = (k === 'initialPrice' || k === 'currentNewPrice') ? formatGroupedNumber(v) : v;
      });
    }
  } catch {}

  bindMoneyInputs();
  renderHistory();

  if (urlParams.size > 0 || localStorage.getItem('lastDepreciation')) calculateDepreciation({ saveHistory: false });

  document.querySelectorAll('.input-section input, .input-section select').forEach(input => {
    input.addEventListener('input', debounce(() => calculateDepreciation(), 500));
  });
});

window.calculateDepreciation = calculateDepreciation;
window.resetForm = resetForm;
window.copyShareLink = copyShareLink;
window.exportToPDF = exportToPDF;
window.exportToCSV = exportToCSV;
window.loadHistory = loadHistory;
window.deleteHistory = deleteHistory;
