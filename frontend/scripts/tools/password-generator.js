/**
 * Password generator — Serpmonn tools shell parity.
 */
function t(path, fallback = '') {
  const parts = path.split('.');
  let cur = window.passwordGeneratorTranslations || {};
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

function rnd(max) {
  if (max <= 0) return 0;
  const limit = Math.floor(0x100000000 / max) * max;
  let x;
  const buf = new Uint32Array(1);
  do {
    crypto.getRandomValues(buf);
    x = buf[0];
  } while (x >= limit);
  return x % max;
}

function generate() {
  clearError();
  const pools = [];
  if (document.getElementById('lower')?.checked) pools.push('abcdefghijklmnopqrstuvwxyz');
  if (document.getElementById('upper')?.checked) pools.push('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  if (document.getElementById('digits')?.checked) pools.push('0123456789');
  if (document.getElementById('symbols')?.checked) pools.push('!@#&*_-.');
  const length = Math.max(6, Math.min(128, parseInt(document.getElementById('len')?.value || '16', 10)));
  if (!pools.length) {
    showError(t('page.alerts.selectChars', 'Выберите хотя бы один набор символов'));
    return '';
  }
  let out = '';
  for (let i = 0; i < length; i++) {
    const pool = pools[rnd(pools.length)];
    out += pool[rnd(pool.length)];
  }
  document.getElementById('out').textContent = out;
  syncUrl();
  return out;
}

async function copyPassword(btn) {
  const str = document.getElementById('out')?.textContent || '';
  if (!str) {
    showError(t('page.alerts.noPassword', 'Сначала сгенерируйте пароль'));
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
  } catch {
    showError(t('page.alerts.copyFailed', 'Не удалось скопировать пароль'));
  }
}

function resetForm() {
  document.getElementById('len').value = '16';
  document.getElementById('lower').checked = true;
  document.getElementById('upper').checked = true;
  document.getElementById('digits').checked = true;
  document.getElementById('symbols').checked = false;
  document.getElementById('out').textContent = '';
  clearError();
  history.replaceState(null, '', location.pathname);
  generate();
}

function syncUrl() {
  const url = new URL(location.href);
  url.searchParams.set('len', document.getElementById('len').value || '16');
  url.searchParams.set('lower', document.getElementById('lower').checked ? '1' : '0');
  url.searchParams.set('upper', document.getElementById('upper').checked ? '1' : '0');
  url.searchParams.set('digits', document.getElementById('digits').checked ? '1' : '0');
  url.searchParams.set('symbols', document.getElementById('symbols').checked ? '1' : '0');
  history.replaceState(null, '', url);
}

function restoreFromUrl() {
  const p = new URLSearchParams(location.search);
  if (p.has('len')) document.getElementById('len').value = p.get('len');
  if (p.has('lower')) document.getElementById('lower').checked = p.get('lower') === '1';
  if (p.has('upper')) document.getElementById('upper').checked = p.get('upper') === '1';
  if (p.has('digits')) document.getElementById('digits').checked = p.get('digits') === '1';
  if (p.has('symbols')) document.getElementById('symbols').checked = p.get('symbols') === '1';
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
  generate();
  document.getElementById('btn-generate')?.addEventListener('click', generate);
  document.getElementById('btn-copy')?.addEventListener('click', (e) => copyPassword(e.currentTarget));
  document.getElementById('btn-reset')?.addEventListener('click', resetForm);
  document.getElementById('btn-share')?.addEventListener('click', shareLink);
});
