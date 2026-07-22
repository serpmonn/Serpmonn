/**
 * Word counter — Serpmonn tools shell parity.
 */
function t(path, fallback = '') {
  const parts = path.split('.');
  let cur = window.wordCounterTranslations || {};
  for (const p of parts) {
    if (!cur || typeof cur !== 'object' || !(p in cur)) return fallback;
    cur = cur[p];
  }
  return typeof cur === 'string' ? cur : fallback;
}

function recalc() {
  const el = document.getElementById('text');
  if (!el) return;
  const value = el.value;
  document.getElementById('chars').textContent = String(value.length);
  document.getElementById('words').textContent = String(value.trim() ? value.trim().split(/\s+/).length : 0);
  document.getElementById('lines').textContent = String(value ? value.split(/\n/).length : 0);
  document.getElementById('spaces').textContent = String((value.match(/\s/g) || []).length);
}

function statsText() {
  return [
    `${t('page.stats.chars', 'Символы')}: ${document.getElementById('chars').textContent}`,
    `${t('page.stats.words', 'Слова')}: ${document.getElementById('words').textContent}`,
    `${t('page.stats.lines', 'Строки')}: ${document.getElementById('lines').textContent}`,
    `${t('page.stats.spaces', 'Пробелы')}: ${document.getElementById('spaces').textContent}`
  ].join('\n');
}

async function copyText(str, btn) {
  if (!str) return;
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
  const el = document.getElementById('text');
  if (el) el.value = '';
  recalc();
  history.replaceState(null, '', location.pathname);
}

async function shareLink() {
  const text = document.getElementById('text')?.value || '';
  const url = new URL(location.href);
  if (text.length && text.length < 1500) url.searchParams.set('t', text);
  else url.searchParams.delete('t');
  history.replaceState(null, '', url);
  await copyText(url.toString(), document.getElementById('btn-share'));
}

function restoreFromUrl() {
  const params = new URLSearchParams(location.search);
  const text = params.get('t');
  if (text != null) {
    const el = document.getElementById('text');
    if (el) el.value = text;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  restoreFromUrl();
  recalc();
  document.getElementById('text')?.addEventListener('input', recalc);
  document.getElementById('btn-copy-stats')?.addEventListener('click', (e) => copyText(statsText(), e.currentTarget));
  document.getElementById('btn-copy-text')?.addEventListener('click', (e) => {
    copyText(document.getElementById('text')?.value || '', e.currentTarget);
  });
  document.getElementById('btn-reset')?.addEventListener('click', resetForm);
  document.getElementById('btn-share')?.addEventListener('click', shareLink);
});
