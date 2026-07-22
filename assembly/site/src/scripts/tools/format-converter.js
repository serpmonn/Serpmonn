function t(path, fallback = '', vars = {}) {
  const parts = path.split('.');
  let cur = window.formatConverterTranslations || {};
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
  el.textContent = msg || '';
  el.classList.toggle('hidden', !msg);
}

function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function mimeFor(fmt) {
  const map = {
    png: 'image/png',
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    webp: 'image/webp',
    avif: 'image/avif'
  };
  return map[fmt] || 'image/png';
}

function extFor(fmt) {
  if (fmt === 'jpeg') return 'jpg';
  return fmt;
}

function usesQuality(fmt) {
  return fmt === 'jpeg' || fmt === 'jpg' || fmt === 'webp' || fmt === 'avif';
}

function syncQualityVisibility() {
  const fmt = document.getElementById('format')?.value || 'png';
  const group = document.getElementById('quality-group');
  if (group) group.classList.toggle('hidden', !usesQuality(fmt));
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('load'));
    };
    img.src = url;
  });
}

function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('convert'))), 'image/png');
  });
}

function encodeBmp(canvas) {
  const w = canvas.width;
  const h = canvas.height;
  const ctx = canvas.getContext('2d');
  const { data } = ctx.getImageData(0, 0, w, h);
  const rowSize = Math.floor((24 * w + 31) / 32) * 4;
  const pixelSize = rowSize * h;
  const fileSize = 54 + pixelSize;
  const buf = new ArrayBuffer(fileSize);
  const view = new DataView(buf);
  const u8 = new Uint8Array(buf);

  u8[0] = 0x42; u8[1] = 0x4D;
  view.setUint32(2, fileSize, true);
  view.setUint32(10, 54, true);
  view.setUint32(14, 40, true);
  view.setInt32(18, w, true);
  view.setInt32(22, -h, true); // top-down
  view.setUint16(26, 1, true);
  view.setUint16(28, 24, true);
  view.setUint32(34, pixelSize, true);

  let offset = 54;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      u8[offset++] = data[i + 2];
      u8[offset++] = data[i + 1];
      u8[offset++] = data[i];
    }
    while ((offset - 54) % rowSize !== 0) u8[offset++] = 0;
  }
  return new Blob([buf], { type: 'image/bmp' });
}

async function encodeIco(canvas) {
  const pngBlob = await canvasToPngBlob(canvas);
  const png = new Uint8Array(await pngBlob.arrayBuffer());
  const size = 6 + 16 + png.length;
  const buf = new ArrayBuffer(size);
  const view = new DataView(buf);
  const u8 = new Uint8Array(buf);
  view.setUint16(0, 0, true);
  view.setUint16(2, 1, true);
  view.setUint16(4, 1, true);
  const w = canvas.width >= 256 ? 0 : canvas.width;
  const h = canvas.height >= 256 ? 0 : canvas.height;
  u8[6] = w;
  u8[7] = h;
  u8[8] = 0;
  u8[9] = 0;
  view.setUint16(10, 1, true);
  view.setUint16(12, 32, true);
  view.setUint32(14, png.length, true);
  view.setUint32(18, 22, true);
  u8.set(png, 22);
  return new Blob([buf], { type: 'image/x-icon' });
}

function canvasToBlob(canvas, mime, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), mime, quality);
  });
}

async function detectSupportedFormats() {
  const select = document.getElementById('format');
  if (!select) return;
  const probe = document.createElement('canvas');
  probe.width = 2;
  probe.height = 2;
  const checks = [
    { value: 'webp', mime: 'image/webp' },
    { value: 'avif', mime: 'image/avif' }
  ];
  for (const { value, mime } of checks) {
    const blob = await canvasToBlob(probe, mime, 0.8);
    const opt = select.querySelector(`option[value="${value}"]`);
    if (!opt) continue;
    if (!blob || blob.type !== mime) {
      opt.disabled = true;
      opt.textContent = `${opt.textContent} (${t('page.unsupported', 'недоступно')})`;
    }
  }
}

function setDownloadEnabled(on) {
  const btn = document.getElementById('btn-download');
  if (!btn) return;
  btn.disabled = !on;
  btn.classList.toggle('is-ready', !!on);
}

async function convert() {
  showError('');
  const file = document.getElementById('file')?.files?.[0];
  if (!file) {
    showError(t('page.errors.noFile', 'Выберите изображение'));
    return;
  }
  const fmt = document.getElementById('format')?.value || 'png';
  const quality = Math.min(1, Math.max(0.1, (parseInt(document.getElementById('quality')?.value || '90', 10) || 90) / 100));
  try {
    const img = await loadImage(file);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    const ctx = canvas.getContext('2d');
    if (fmt === 'jpeg' || fmt === 'jpg' || fmt === 'bmp') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0);

    let blob;
    if (fmt === 'bmp') blob = encodeBmp(canvas);
    else if (fmt === 'ico') blob = await encodeIco(canvas);
    else {
      blob = await canvasToBlob(canvas, mimeFor(fmt), quality);
      if (!blob) throw new Error('convert');
    }

    window.__convertedBlob = blob;
    window.__convertedName = `${(file.name.replace(/\.[^.]+$/, '') || 'image')}.${extFor(fmt)}`;
    const preview = document.getElementById('preview');
    if (preview) {
      if (preview.src?.startsWith('blob:')) URL.revokeObjectURL(preview.src);
      // ICO/BMP preview via object URL still works in most browsers
      preview.src = URL.createObjectURL(blob);
      preview.classList.remove('hidden');
    }
    document.getElementById('info').textContent = t('page.infoSize', 'Размер: {size}', { size: formatBytes(blob.size) });
    document.getElementById('heroResult').textContent = window.__convertedName;
    setDownloadEnabled(true);
    const hint = document.getElementById('download-hint');
    if (hint) hint.classList.remove('hidden');
  } catch (e) {
    setDownloadEnabled(false);
    showError(t(e.message === 'load' ? 'page.errors.load' : 'page.errors.convert', 'Ошибка конвертации'));
  }
}

function download() {
  if (!window.__convertedBlob) {
    showError(t('page.errors.needConvert', 'Сначала конвертируйте изображение'));
    return;
  }
  showError('');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(window.__convertedBlob);
  a.download = window.__convertedName || 'converted.png';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

function resetForm() {
  document.getElementById('file').value = '';
  document.getElementById('format').value = 'png';
  document.getElementById('quality').value = '90';
  document.getElementById('heroResult').textContent = '—';
  document.getElementById('info').textContent = '';
  const preview = document.getElementById('preview');
  if (preview) {
    if (preview.src?.startsWith('blob:')) URL.revokeObjectURL(preview.src);
    preview.removeAttribute('src');
    preview.classList.add('hidden');
  }
  document.getElementById('download-hint')?.classList.add('hidden');
  window.__convertedBlob = null;
  setDownloadEnabled(false);
  syncQualityVisibility();
  showError('');
}

document.addEventListener('DOMContentLoaded', () => {
  setDownloadEnabled(false);
  syncQualityVisibility();
  detectSupportedFormats();
  document.getElementById('format')?.addEventListener('change', syncQualityVisibility);
  document.getElementById('btn-convert')?.addEventListener('click', convert);
  document.getElementById('btn-download')?.addEventListener('click', download);
  document.getElementById('btn-reset')?.addEventListener('click', resetForm);
  document.getElementById('btn-share')?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(location.href); } catch {}
  });
});
