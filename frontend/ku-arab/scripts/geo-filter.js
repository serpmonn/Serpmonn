// Simple client-side GEO filtering for menu/offers
// Usage:
// - Add data-geo-allow="US,CA" or data-geo-deny="RU" to anchor elements
// - Or add data-offer-id and define rules in /frontend/geo-offers.json

function saveGeo(countryCode) {
  try {
    localStorage.setItem('spn_geo_country', countryCode);
    localStorage.setItem('spn_geo_country_ts', String(Date.now()));
  } catch {}
}

async function detectCountryIso2() {
  try {
    const cached = localStorage.getItem('spn_geo_country');
    const ts = Number(localStorage.getItem('spn_geo_country_ts') || '0');
    const dayMs = 24 * 60 * 60 * 1000;
    if (cached && Date.now() - ts < dayMs) return cached;
  } catch {}

  // Try ipapi.co (text response with ISO2)
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 1500);
    const res = await fetch('https://ipapi.co/country/', { signal: controller.signal });
    clearTimeout(t);
    if (res.ok) {
      const txt = (await res.text()).trim().toUpperCase();
      if (/^[A-Z]{2}$/.test(txt)) { saveGeo(txt); return txt; }
    }
  } catch {}

  // Fallback: geojs
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 1500);
    const res = await fetch('https://get.geojs.io/v1/ip/country.json', { signal: controller.signal });
    clearTimeout(t);
    if (res.ok) {
      const json = await res.json();
      const code = String(json && (json.country || json.country_code || '')).trim().toUpperCase();
      if (/^[A-Z]{2}$/.test(code)) { saveGeo(code); return code; }
    }
  } catch {}

  return null;
}

function applyAttributesRules(countryIso2) {
  const elements = Array.from(document.querySelectorAll('[data-geo-allow], [data-geo-deny]'));
  elements.forEach(el => {
    const allow = (el.getAttribute('data-geo-allow') || '').toUpperCase().split(',').map(s => s.trim()).filter(Boolean);
    const deny = (el.getAttribute('data-geo-deny') || '').toUpperCase().split(',').map(s => s.trim()).filter(Boolean);
    let hide = false;
    if (allow.length > 0 && countryIso2 && !allow.includes(countryIso2)) hide = true;
    if (deny.length > 0 && countryIso2 && deny.includes(countryIso2)) hide = true;
    if (hide) {
      el.style.display = 'none';
      const parentMenuItem = el.closest('.submenu-container a, .menu-container a');
      if (parentMenuItem && parentMenuItem !== el) parentMenuItem.style.display = 'none';
    }
  });
}

async function applyJsonRules(countryIso2) {
  try {
    const res = await fetch('/frontend/geo-offers.json');
    if (!res.ok) return;
    const json = await res.json();
    const selectors = Array.isArray(json && json.selectors) ? json.selectors : [];
    selectors.forEach(rule => {
      try {
        const els = document.querySelectorAll(rule.selector);
        const allow = (rule.allow || []).map(String).map(s => s.toUpperCase());
        const deny = (rule.deny || []).map(String).map(s => s.toUpperCase());
        els.forEach(el => {
          let hide = false;
          if (allow.length > 0 && countryIso2 && !allow.includes(countryIso2)) hide = true;
          if (deny.length > 0 && countryIso2 && deny.includes(countryIso2)) hide = true;
          if (hide) el.style.display = 'none';
        });
      } catch {}
    });
  } catch {}
}

export async function applyGeoFilter() {
  try {
    const country = await detectCountryIso2();
    applyAttributesRules(country);
    await applyJsonRules(country);
  } catch {}
}

