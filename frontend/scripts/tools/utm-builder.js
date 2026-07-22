/**
 * UTM builder — Serpmonn tools shell parity.
 */
function t(path, fallback = '') {
  const parts = path.split('.');
  let cur = window.utmBuilderTranslations || {};
  for (const p of parts) {
    if (!cur || typeof cur !== 'object' || !(p in cur)) return fallback;
    cur = cur[p];
  }
  return typeof cur === 'string' ? cur : fallback;
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

function val(id) {
  return document.getElementById(id)?.value?.trim() || '';
}

function buildUrl() {
  clearError();
  const base = val('base');
  if (!base) {
    showError(t('page.errors.baseRequired', 'Укажите базовый URL'));
    document.getElementById('result').textContent = '—';
    return '';
  }
  const params = new URLSearchParams();
  const add = (k, v) => { if (v) params.set(k, v); };
  add('utm_source', val('source'));
  add('utm_medium', val('medium'));
  add('utm_campaign', val('campaign'));
  add('utm_content', val('content'));
  add('utm_term', val('term'));
  const out = base + (base.includes('?') ? '&' : '?') + params.toString();
  document.getElementById('result').textContent = out;
  syncUrl();
  return out;
}

function syncUrl() {
  const url = new URL(location.href);
  ['base', 'source', 'medium', 'campaign', 'content', 'term'].forEach((id) => {
    const v = val(id);
    if (v) url.searchParams.set(id, v);
    else url.searchParams.delete(id);
  });
  history.replaceState(null, '', url);
}

function restoreFromUrl() {
  const p = new URLSearchParams(location.search);
  ['base', 'source', 'medium', 'campaign', 'content', 'term'].forEach((id) => {
    if (p.has(id) && document.getElementById(id)) document.getElementById(id).value = p.get(id);
  });
  if (p.get('base')) buildUrl();
}

async function copyResult(btn) {
  const str = document.getElementById('result')?.textContent || '';
  if (!str || str === '—') {
    showError(t('page.errors.noResult', 'Сначала сгенерируйте ссылку'));
    return;
  }
  clearError();
  try {
    await navigator.clipboard.writeText(str);
    if (btn) {
      const prev = btn.textContent;
      btn.textContent = t('page.buttons.copied', 'Скопировано!');
      setTimeout(() => { btn.textContent = prev; }, 1400);
    }
  } catch {}
}

function resetForm() {
  ['base', 'source', 'medium', 'campaign', 'content', 'term'].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('result').textContent = '—';
  clearError();
  history.replaceState(null, '', location.pathname);
}

async function shareLink() {
  syncUrl();
  try {
    await navigator.clipboard.writeText(location.href);
    const btn = document.getElementById('btn-share');
    if (btn) {
      const prev = btn.textContent;
      btn.textContent = t('page.actions.copied', 'Скопировано');
      setTimeout(() => { btn.textContent = prev; }, 1400);
    }
  } catch {}
}

document.addEventListener('DOMContentLoaded', () => {
  restoreFromUrl();
  document.getElementById('btn-build')?.addEventListener('click', buildUrl);
  document.getElementById('btn-copy')?.addEventListener('click', (e) => copyResult(e.currentTarget));
  document.getElementById('btn-reset')?.addEventListener('click', resetForm);
  document.getElementById('btn-share')?.addEventListener('click', shareLink);
});
