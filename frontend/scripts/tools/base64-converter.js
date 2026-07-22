function t(path, fallback = '') {
  const parts = path.split('.');
  let cur = window.base64ConverterTranslations || {};
  for (const p of parts) {
    if (!cur || typeof cur !== 'object' || !(p in cur)) return fallback;
    cur = cur[p];
  }
  return typeof cur === 'string' ? cur : fallback;
}

function showError(msg) {
  const el = document.getElementById('error-message');
  if (!el) return;
  el.textContent = msg || '';
  el.classList.toggle('hidden', !msg);
}

function bytesToBase64(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function base64ToBytes(b64) {
  const cleaned = b64.replace(/\s+/g, '');
  const bin = atob(cleaned);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function readFileBytes(file) {
  const buf = await file.arrayBuffer();
  return new Uint8Array(buf);
}

async function encode() {
  showError('');
  const file = document.getElementById('file')?.files?.[0];
  const text = document.getElementById('input')?.value || '';
  try {
    let out;
    if (file) {
      out = bytesToBase64(await readFileBytes(file));
    } else if (text.trim()) {
      out = btoa(unescape(encodeURIComponent(text)));
    } else {
      showError(t('page.errors.empty', 'Введите текст или выберите файл'));
      return;
    }
    document.getElementById('output').textContent = out;
    window.__b64LastBytes = null;
  } catch {
    showError(t('page.errors.decode', 'Не удалось декодировать Base64'));
  }
}

async function decode() {
  showError('');
  const text = (document.getElementById('input')?.value || '').trim();
  if (!text) {
    showError(t('page.errors.empty', 'Введите текст или выберите файл'));
    return;
  }
  try {
    const bytes = base64ToBytes(text);
    window.__b64LastBytes = bytes;
    // try utf-8 text
    const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
    document.getElementById('output').textContent = decoded;
  } catch {
    showError(t('page.errors.decode', 'Не удалось декодировать Base64'));
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

function downloadOut() {
  const bytes = window.__b64LastBytes;
  const text = document.getElementById('output')?.textContent || '';
  let blob;
  let name = 'serpmonn-base64.txt';
  if (bytes) {
    blob = new Blob([bytes]);
    name = 'serpmonn-decoded.bin';
  } else if (text && text !== '—') {
    blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  } else return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function resetForm() {
  document.getElementById('input').value = '';
  document.getElementById('file').value = '';
  document.getElementById('output').textContent = '—';
  window.__b64LastBytes = null;
  showError('');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('btn-encode')?.addEventListener('click', encode);
  document.getElementById('btn-decode')?.addEventListener('click', decode);
  document.getElementById('btn-copy')?.addEventListener('click', (e) => copyOut(e.currentTarget));
  document.getElementById('btn-download')?.addEventListener('click', downloadOut);
  document.getElementById('btn-reset')?.addEventListener('click', resetForm);
  document.getElementById('btn-share')?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(location.href); } catch {}
  });
});
