// frontend/scripts/i18n-loader.js

let _messages = null;

export async function loadMessages() {
  if (_messages) return _messages;

  const locale = (document.documentElement.lang || 'en')
    .toLowerCase()
    .slice(0, 2);

  try {
    const res = await fetch(`/i18n/${locale}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    _messages = await res.json();
  } catch (e) {
    console.warn('[i18n] Не удалось загрузить переводы, использую фолбэк');
    _messages = {};
  }

  return _messages;
}

export function getMessages() {
  return _messages || {};
}