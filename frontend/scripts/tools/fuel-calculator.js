/**
 * Fuel calculator — parity UX with depreciation (share/PDF/CSV/history/URL state).
 * Translations: window.fuelCalculatorTranslations from fuel-calculator.njk
 */

function tr() {
  return window.fuelCalculatorTranslations || {};
}

function tPage(path, fallback = '') {
  const parts = String(path).split('.');
  let cur = tr();
  for (const p of parts) {
    if (cur == null) return fallback;
    cur = cur[p];
  }
  return typeof cur === 'string' ? cur : fallback || path;
}

function getLocale() {
  return document.documentElement.lang || 'ru';
}

function getCurrency() {
  return document.body?.dataset.currency || '₽';
}

function getLiter() {
  return document.body?.dataset.liter || 'л';
}

function formatMoney(value) {
  return `${Math.round(value).toLocaleString(getLocale())} ${getCurrency()}`;
}

function showError(msg) {
  const el = document.getElementById('error-message');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
}

function clearError() {
  const el = document.getElementById('error-message');
  if (!el) return;
  el.textContent = '';
  el.classList.add('hidden');
}

const FIELD_IDS = [
  'distance',
  'fuelConsumption',
  'fuelPrice',
  'fuelType',
  'drivingStyle',
  'roadConditions',
  'load',
  'climate',
];

const DRIVING = { economical: 0.8, normal: 1.0, sport: 1.3, aggressive: 1.6 };
const ROAD = { highway: 0.9, city: 1.2, mixed: 1.0, offroad: 1.5 };
const LOAD = { empty: 1.0, light: 1.05, medium: 1.15, heavy: 1.3 };
const CLIMATE = { normal: 1.0, hot: 1.1, cold: 1.15, rainy: 1.08 };
const FUEL_TYPE = {
  petrol: 1.0,
  petrol95: 1.02,
  petrol98: 1.05,
  diesel: 0.9,
  lpg: 1.2,
  cng: 1.1,
};

let chartInstance = null;
let lastResult = null;

function readInputs() {
  return {
    distance: parseFloat(document.getElementById('distance')?.value || ''),
    fuelConsumption: parseFloat(document.getElementById('fuelConsumption')?.value || ''),
    fuelPrice: parseFloat(document.getElementById('fuelPrice')?.value || ''),
    fuelType: document.getElementById('fuelType')?.value || 'petrol',
    drivingStyle: document.getElementById('drivingStyle')?.value || 'normal',
    roadConditions: document.getElementById('roadConditions')?.value || 'mixed',
    load: document.getElementById('load')?.value || 'empty',
    climate: document.getElementById('climate')?.value || 'normal',
  };
}

function writeInputs(data) {
  if (!data) return;
  FIELD_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (!el || data[id] == null || data[id] === '') return;
    el.value = data[id];
  });
}

function compute(inputs) {
  const adjustedConsumption =
    inputs.fuelConsumption *
    (DRIVING[inputs.drivingStyle] || 1) *
    (ROAD[inputs.roadConditions] || 1) *
    (LOAD[inputs.load] || 1) *
    (CLIMATE[inputs.climate] || 1) *
    (FUEL_TYPE[inputs.fuelType] || 1);

  const totalFuel = (adjustedConsumption * inputs.distance) / 100;
  const totalCost = totalFuel * inputs.fuelPrice;
  const costPerKm = totalCost / inputs.distance;
  return { adjustedConsumption, totalFuel, totalCost, costPerKm };
}

function syncUrl(inputs) {
  const params = new URLSearchParams();
  FIELD_IDS.forEach((id) => {
    const v = inputs[id];
    if (v !== undefined && v !== null && v !== '' && !Number.isNaN(v)) params.set(id, String(v));
  });
  const qs = params.toString();
  const next = qs ? `${location.pathname}?${qs}` : location.pathname;
  history.replaceState(null, '', next);
}

function restoreFromUrl() {
  const params = new URLSearchParams(location.search);
  if (![...params.keys()].length) return false;
  const data = {};
  FIELD_IDS.forEach((id) => {
    if (params.has(id)) data[id] = params.get(id);
  });
  writeInputs(data);
  return true;
}

function persistHistory(inputs, result) {
  try {
    const key = 'fuelHistory';
    const prev = JSON.parse(localStorage.getItem(key) || '[]');
    prev.unshift({
      ts: Date.now(),
      inputs,
      result: {
        totalFuel: result.totalFuel,
        totalCost: result.totalCost,
        costPerKm: result.costPerKm,
        adjustedConsumption: result.adjustedConsumption,
      },
    });
    localStorage.setItem(key, JSON.stringify(prev.slice(0, 5)));
    renderHistory();
  } catch (_) {}
}

function renderHistory() {
  const box = document.getElementById('historyList');
  if (!box) return;
  let prev = [];
  try {
    prev = JSON.parse(localStorage.getItem('fuelHistory') || '[]');
  } catch (_) {}
  if (!prev.length) {
    box.innerHTML = `<p class="history-empty">${tPage('page.history.empty', 'Пока пусто')}</p>`;
    return;
  }
  box.innerHTML = prev
    .map((item, idx) => {
      const d = item.inputs?.distance ?? '—';
      const cost = item.result?.totalCost != null ? formatMoney(item.result.totalCost) : '—';
      return `<div class="history-item">
        <button type="button" class="history-load" data-idx="${idx}">${d} км · ${cost}</button>
        <button type="button" class="history-del" data-idx="${idx}" aria-label="delete">×</button>
      </div>`;
    })
    .join('');
}

function showComparison(inputs, baseResult) {
  const body = document.getElementById('comparisonBody');
  const wrap = document.getElementById('comparison');
  if (!body || !wrap) return;

  const styles = [
    { key: 'economical', multiplier: 0.8, color: '#28a745' },
    { key: 'normal', multiplier: 1.0, color: '#007bff' },
    { key: 'sport', multiplier: 1.3, color: '#ffc107' },
    { key: 'aggressive', multiplier: 1.6, color: '#dc3545' },
  ];

  const baseCost =
    ((inputs.fuelConsumption *
      (ROAD[inputs.roadConditions] || 1) *
      (LOAD[inputs.load] || 1) *
      (CLIMATE[inputs.climate] || 1) *
      (FUEL_TYPE[inputs.fuelType] || 1) *
      inputs.distance) /
      100) *
    inputs.fuelPrice;

  let html = '';
  const chartLabels = [];
  const chartCosts = [];

  styles.forEach((style) => {
    const name = tPage(`page.drivingStyles.${style.key}`, style.key);
    const adjusted =
      inputs.fuelConsumption *
      style.multiplier *
      (ROAD[inputs.roadConditions] || 1) *
      (LOAD[inputs.load] || 1) *
      (CLIMATE[inputs.climate] || 1) *
      (FUEL_TYPE[inputs.fuelType] || 1);
    const totalFuel = (adjusted * inputs.distance) / 100;
    const totalCost = totalFuel * inputs.fuelPrice;
    const savings = baseCost - totalCost;
    const savingsText =
      savings > 0
        ? `+${Math.round(savings).toLocaleString(getLocale())} ${getCurrency()}`
        : `${Math.round(savings).toLocaleString(getLocale())} ${getCurrency()}`;

    html += `<tr>
      <td style="color:${style.color};font-weight:600;">${name}</td>
      <td>${adjusted.toFixed(1)} ${getLiter()}/100км</td>
      <td>${formatMoney(totalCost)}</td>
      <td style="color:${savings > 0 ? '#28a745' : '#dc3545'};font-weight:600;">${savingsText}</td>
    </tr>`;

    chartLabels.push(name);
    chartCosts.push(Math.round(totalCost));
  });

  body.innerHTML = html;
  wrap.classList.remove('hidden');
  wrap.style.display = '';
  renderChart(chartLabels, chartCosts, baseResult);
}

async function renderChart(labels, costs, result) {
  const canvas = document.getElementById('fuelChart');
  if (!canvas || !window.Chart) {
    try {
      if (!window.Chart) await import('https://cdn.jsdelivr.net/npm/chart.js');
    } catch (_) {
      return;
    }
  }
  if (!window.Chart || !canvas) return;
  if (chartInstance) chartInstance.destroy();
  chartInstance = new Chart(canvas.getContext('2d'), {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: tPage('page.comparison.cost', 'Стоимость'),
          data: costs,
          backgroundColor: ['#28a745', '#007bff', '#ffc107', '#dc3545'],
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { y: { beginAtZero: true } },
    },
  });
  void result;
}

function displayResults(inputs, result) {
  const lit = getLiter();
  const set = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };
  set('totalFuel', `${result.totalFuel.toFixed(2)} ${lit}`);
  set('totalCost', formatMoney(result.totalCost));
  set('costPerKm', `${result.costPerKm.toFixed(2)} ${getCurrency()}/км`);
  set('adjustedConsumption', `${result.adjustedConsumption.toFixed(1)} ${lit}/100км`);
  set('heroCostPerKm', `${result.costPerKm.toFixed(2)} ${getCurrency()}/км`);

  const results = document.getElementById('results');
  if (results) {
    results.classList.remove('hidden');
    results.style.display = '';
  }

  const plain = document.getElementById('formulaPlain');
  if (plain) {
    const template = tPage(
      'page.formulaPlain',
      `Расход ≈ паспортный × стиль × дорога × загрузка × климат × тип топлива. Итого: {fuel} л за {distance} км ≈ {cost}.`
    );
    plain.textContent = template
      .replaceAll('{fuel}', result.totalFuel.toFixed(2))
      .replaceAll('{distance}', String(inputs.distance))
      .replaceAll('{cost}', formatMoney(result.totalCost));
  }
}

export function calculateFuel(options = {}) {
  const { scroll = false, saveHistory = false } = options;
  clearError();
  const inputs = readInputs();
  if (!inputs.distance || !inputs.fuelConsumption || !inputs.fuelPrice) {
    showError(tPage('page.errors.fillRequired', 'Заполните расстояние, расход и цену топлива'));
    return;
  }
  if (inputs.distance <= 0 || inputs.fuelConsumption <= 0 || inputs.fuelPrice <= 0) {
    showError(tPage('page.errors.positive', 'Значения должны быть больше нуля'));
    return;
  }

  const result = compute(inputs);
  lastResult = { inputs, result };
  displayResults(inputs, result);
  showComparison(inputs, result);
  syncUrl(inputs);
  try {
    localStorage.setItem('lastFuelCalc', JSON.stringify(inputs));
  } catch (_) {}
  if (saveHistory) persistHistory(inputs, result);
  if (scroll) document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function resetForm() {
  FIELD_IDS.forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.tagName === 'SELECT') el.selectedIndex = 0;
    else el.value = '';
  });
  const driving = document.getElementById('drivingStyle');
  if (driving) driving.value = 'normal';
  const road = document.getElementById('roadConditions');
  if (road) road.value = 'mixed';
  clearError();
  document.getElementById('results')?.classList.add('hidden');
  document.getElementById('comparison')?.classList.add('hidden');
  lastResult = null;
  history.replaceState(null, '', location.pathname);
}

export async function copyShareLink() {
  const inputs = readInputs();
  syncUrl(inputs);
  try {
    await navigator.clipboard.writeText(location.href);
    alert(tPage('page.shareCopied', 'Ссылка скопирована'));
  } catch (_) {
    prompt(tPage('page.shareCopied', 'Ссылка:'), location.href);
  }
}

function ensureExportReady() {
  if (lastResult?.result) return true;
  alert(tPage('page.exportNoResults', 'Сначала выполните расчёт'));
  return false;
}

export async function exportToCSV() {
  if (!ensureExportReady()) return;
  const { inputs, result } = lastResult;
  const rows = [
    ['distance_km', inputs.distance],
    ['consumption_l_100km', inputs.fuelConsumption],
    ['price_per_l', inputs.fuelPrice],
    ['fuel_type', inputs.fuelType],
    ['driving_style', inputs.drivingStyle],
    ['road', inputs.roadConditions],
    ['load', inputs.load],
    ['climate', inputs.climate],
    ['adjusted_consumption', result.adjustedConsumption.toFixed(2)],
    ['total_fuel_l', result.totalFuel.toFixed(2)],
    ['total_cost', Math.round(result.totalCost)],
    ['cost_per_km', result.costPerKm.toFixed(2)],
  ];
  const csv = '\uFEFF' + rows.map(([k, v]) => `${k};${v}`).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'fuel-calculation.csv';
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function exportToPDF() {
  if (!ensureExportReady()) return;
  try {
    if (!window.jspdf) {
      await import('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const { inputs, result } = lastResult;
    let y = 14;
    const line = (text) => {
      doc.text(String(text), 14, y);
      y += 8;
    };
    line(tPage('page.title', 'Fuel calculator').replace(/[^\x00-\x7F]/g, '') || 'Fuel calculator');
    line(`Distance: ${inputs.distance} km`);
    line(`Base consumption: ${inputs.fuelConsumption} L/100km`);
    line(`Price: ${inputs.fuelPrice}`);
    line(`Adjusted: ${result.adjustedConsumption.toFixed(2)} L/100km`);
    line(`Total fuel: ${result.totalFuel.toFixed(2)} L`);
    line(`Total cost: ${Math.round(result.totalCost)}`);
    line(`Per km: ${result.costPerKm.toFixed(2)}`);
    doc.save('fuel-calculation.pdf');
  } catch (e) {
    console.error(e);
    alert(tPage('page.exportFailed', 'Не удалось экспортировать PDF'));
  }
}

function bindUi() {
  document.getElementById('btn-calculate')?.addEventListener('click', () =>
    calculateFuel({ scroll: true, saveHistory: true })
  );
  document.getElementById('btn-reset')?.addEventListener('click', resetForm);
  document.getElementById('btn-share')?.addEventListener('click', copyShareLink);
  document.getElementById('btn-pdf')?.addEventListener('click', exportToPDF);
  document.getElementById('btn-csv')?.addEventListener('click', exportToCSV);

  let timer;
  FIELD_IDS.forEach((id) => {
    document.getElementById(id)?.addEventListener('change', () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const inputs = readInputs();
        if (inputs.distance && inputs.fuelConsumption && inputs.fuelPrice) {
          calculateFuel({ scroll: false, saveHistory: false });
        }
      }, 500);
    });
  });

  document.getElementById('historyList')?.addEventListener('click', (e) => {
    const loadBtn = e.target.closest('.history-load');
    const delBtn = e.target.closest('.history-del');
    let prev = [];
    try {
      prev = JSON.parse(localStorage.getItem('fuelHistory') || '[]');
    } catch (_) {}
    if (delBtn) {
      prev.splice(Number(delBtn.dataset.idx), 1);
      localStorage.setItem('fuelHistory', JSON.stringify(prev));
      renderHistory();
      return;
    }
    if (loadBtn) {
      const item = prev[Number(loadBtn.dataset.idx)];
      if (!item?.inputs) return;
      writeInputs(item.inputs);
      calculateFuel({ scroll: true, saveHistory: false });
    }
  });
}

function boot() {
  bindUi();
  renderHistory();
  const fromUrl = restoreFromUrl();
  if (!fromUrl) {
    try {
      const saved = JSON.parse(localStorage.getItem('lastFuelCalc') || 'null');
      if (saved) writeInputs(saved);
    } catch (_) {}
  }
  const inputs = readInputs();
  if (inputs.distance && inputs.fuelConsumption && inputs.fuelPrice) {
    calculateFuel({ scroll: false, saveHistory: false });
  }

  // legacy global hooks for inline onclick if any remain
  window.calculateFuel = () => calculateFuel({ scroll: true, saveHistory: true });
  window.resetFuelForm = resetForm;
  window.copyFuelShareLink = copyShareLink;
  window.exportFuelPDF = exportToPDF;
  window.exportFuelCSV = exportToCSV;
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
