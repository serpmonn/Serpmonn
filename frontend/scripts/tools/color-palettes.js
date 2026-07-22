function t(path, fallback = '') {
  const parts = path.split('.');
  let cur = window.colorPalettesTranslations || {};
  for (const p of parts) {
    if (!cur || typeof cur !== 'object' || !(p in cur)) return fallback;
    cur = cur[p];
  }
  return typeof cur === 'string' ? cur : fallback;
}

function clamp(n, a, b) { return Math.min(b, Math.max(a, n)); }

function hexToHsl(hex) {
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6) throw new Error('bad hex');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let hue = 0, sat = 0;
  const light = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    sat = light > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hue = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: hue = (b - r) / d + 2; break;
      default: hue = (r - g) / d + 4;
    }
    hue /= 6;
  }
  return { h: hue * 360, s: sat * 100, l: light * 100 };
}

function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = clamp(s, 0, 100) / 100;
  l = clamp(l, 0, 100) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

function buildPalette(hex, scheme) {
  const { h, s, l } = hexToHsl(hex);
  const mk = (dh, ds = 0, dl = 0) => hslToHex(h + dh, s + ds, l + dl);
  switch (scheme) {
    case 'complementary':
      return [mk(0), mk(180), mk(0, -10, 18), mk(180, -10, 18), mk(0, 0, -18)];
    case 'analogous':
      return [mk(-30), mk(-15), mk(0), mk(15), mk(30)];
    case 'triadic':
      return [mk(0), mk(120), mk(240), mk(0, -8, 14), mk(120, -8, 14)];
    case 'tetradic':
      return [mk(0), mk(90), mk(180), mk(270), mk(0, 0, 16)];
    case 'mono':
    default:
      return [mk(0, 0, 28), mk(0, 0, 14), mk(0), mk(0, 0, -14), mk(0, 0, -28)];
  }
}

function normalizeHex(value) {
  let v = value.trim();
  if (!v.startsWith('#')) v = `#${v}`;
  if (/^#[0-9a-fA-F]{3}$/.test(v) || /^#[0-9a-fA-F]{6}$/.test(v)) return v.toUpperCase();
  throw new Error('bad');
}

function renderPalette(colors) {
  const box = document.getElementById('palette');
  if (!box) return;
  box.innerHTML = colors.map((c) => `
    <button type="button" class="swatch" data-hex="${c}" style="--swatch:${c}" title="${c}">
      <span class="swatch-color"></span>
      <span class="swatch-hex">${c}</span>
    </button>
  `).join('');
  window.__palette = colors;
}

function generate() {
  try {
    const hex = normalizeHex(document.getElementById('hex').value || '#DC3545');
    document.getElementById('hex').value = hex;
    document.getElementById('color').value = hex.length === 4
      ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
      : hex;
    const scheme = document.getElementById('scheme').value || 'complementary';
    renderPalette(buildPalette(hex, scheme));
    syncUrl();
  } catch {
    renderPalette(['#DC3545', '#EF4444', '#FCA5A5', '#991B1B', '#7F1D1D']);
  }
}

function syncUrl() {
  const url = new URL(location.href);
  url.searchParams.set('hex', document.getElementById('hex').value.replace('#', ''));
  url.searchParams.set('scheme', document.getElementById('scheme').value);
  history.replaceState(null, '', url);
}

function restoreFromUrl() {
  const p = new URLSearchParams(location.search);
  if (p.get('hex')) {
    try {
      document.getElementById('hex').value = normalizeHex(p.get('hex'));
      document.getElementById('color').value = document.getElementById('hex').value.length === 4
        ? document.getElementById('hex').value
        : document.getElementById('hex').value;
    } catch {}
  }
  if (p.get('scheme') && document.getElementById('scheme').querySelector(`option[value="${p.get('scheme')}"]`)) {
    document.getElementById('scheme').value = p.get('scheme');
  }
}

async function copyAll(btn) {
  const list = (window.__palette || []).join(', ');
  if (!list) return;
  try {
    await navigator.clipboard.writeText(list);
    if (btn) {
      const prev = btn.textContent;
      btn.textContent = t('page.actions.copied', 'Скопировано');
      setTimeout(() => { btn.textContent = prev; }, 1400);
    }
  } catch {}
}

function resetForm() {
  document.getElementById('hex').value = '#DC3545';
  document.getElementById('color').value = '#DC3545';
  document.getElementById('scheme').value = 'complementary';
  history.replaceState(null, '', location.pathname);
  generate();
}

document.addEventListener('DOMContentLoaded', () => {
  restoreFromUrl();
  generate();
  document.getElementById('btn-generate')?.addEventListener('click', generate);
  document.getElementById('btn-reset')?.addEventListener('click', resetForm);
  document.getElementById('btn-copy')?.addEventListener('click', (e) => copyAll(e.currentTarget));
  document.getElementById('btn-share')?.addEventListener('click', async () => {
    syncUrl();
    try { await navigator.clipboard.writeText(location.href); } catch {}
  });
  document.getElementById('color')?.addEventListener('input', (e) => {
    document.getElementById('hex').value = e.target.value.toUpperCase();
  });
  document.getElementById('hex')?.addEventListener('change', generate);
  document.getElementById('scheme')?.addEventListener('change', generate);
  document.getElementById('palette')?.addEventListener('click', async (e) => {
    const btn = e.target.closest('.swatch');
    if (!btn) return;
    try {
      await navigator.clipboard.writeText(btn.dataset.hex);
      const label = btn.querySelector('.swatch-hex');
      if (label) {
        const prev = label.textContent;
        label.textContent = t('page.actions.copied', 'Скопировано');
        setTimeout(() => { label.textContent = prev; }, 1000);
      }
    } catch {}
  });
});
