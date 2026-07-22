function t(path, fallback = '', vars = {}) {
  const parts = path.split('.');
  let cur = window.jsonFormatterTranslations || {};
  for (const p of parts) {
    if (!cur || typeof cur !== 'object' || !(p in cur)) {
      cur = fallback;
      break;
    }
    cur = cur[p];
  }
  let out = typeof cur === 'string' ? cur : fallback;
  Object.entries(vars).forEach(([k, v]) => { out = out.replace(`{${k}}`, v); });
  return out;
}

function showError(msg) {
  const el = document.getElementById('error-message');
  if (!el) return;
  el.textContent = msg;
  el.classList.toggle('hidden', !msg);
}

function setStatus(msg, ok = true) {
  const el = document.getElementById('status');
  if (!el) return;
  el.textContent = msg;
  el.style.color = ok ? '#166534' : '#b91c1c';
}

function parseInput() {
  const raw = document.getElementById('input')?.value || '';
  if (!raw.trim()) throw new Error('empty');
  return JSON.parse(raw);
}

function formatJson() {
  try {
    const obj = parseInput();
    const out = JSON.stringify(obj, null, 2);
    document.getElementById('input').value = out;
    document.getElementById('output').textContent = out;
    showError('');
    setStatus(t('page.statusOk', 'JSON корректный'), true);
  } catch (e) {
    if (String(e.message) === 'empty') {
      setStatus(t('page.statusEmpty', 'Вставьте JSON'), false);
      showError('');
      return;
    }
    const msg = t('page.errors.parse', 'Ошибка JSON: {message}', { message: e.message });
    showError(msg);
    setStatus(msg, false);
  }
}

function minifyJson() {
  try {
    const obj = parseInput();
    const out = JSON.stringify(obj);
    document.getElementById('input').value = out;
    document.getElementById('output').textContent = out;
    showError('');
    setStatus(t('page.statusOk', 'JSON корректный'), true);
  } catch (e) {
    const msg = t('page.errors.parse', 'Ошибка JSON: {message}', { message: e.message === 'empty' ? t('page.statusEmpty', 'Вставьте JSON') : e.message });
    showError(msg);
    setStatus(msg, false);
  }
}

function validateJson() {
  try {
    parseInput();
    showError('');
    setStatus(t('page.statusOk', 'JSON корректный'), true);
    document.getElementById('output').textContent = document.getElementById('input').value;
  } catch (e) {
    const msg = t('page.errors.parse', 'Ошибка JSON: {message}', { message: e.message === 'empty' ? t('page.statusEmpty', 'Вставьте JSON') : e.message });
    showError(msg);
    setStatus(msg, false);
  }
}

async function copyOut(btn) {
  const str = document.getElementById('output')?.textContent || '';
  if (!str || str === '—') return;
  try {
    await navigator.clipboard.writeText(str);
    if (btn) {
      const prev = btn.textContent;
      btn.textContent = t('page.actions.copied', 'Скопировано');
      setTimeout(() => { btn.textContent = prev; }, 1400);
    }
  } catch {}
}

function resetForm() {
  document.getElementById('input').value = '';
  document.getElementById('output').textContent = '—';
  showError('');
  setStatus(t('page.statusEmpty', 'Вставьте JSON'), false);
  history.replaceState(null, '', location.pathname);
}

async function shareLink() {
  try {
    await navigator.clipboard.writeText(location.href);
  } catch {}
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-format')?.addEventListener('click', formatJson);
  document.getElementById('btn-minify')?.addEventListener('click', minifyJson);
  document.getElementById('btn-validate')?.addEventListener('click', validateJson);
  document.getElementById('btn-copy')?.addEventListener('click', (e) => copyOut(e.currentTarget));
  document.getElementById('btn-reset')?.addEventListener('click', resetForm);
  document.getElementById('btn-share')?.addEventListener('click', shareLink);
});
