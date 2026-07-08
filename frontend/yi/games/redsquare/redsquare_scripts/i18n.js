export function t(key) {
  return (typeof window !== 'undefined' && window.i18n?.[key]) || '';
}

export function formatScore(n) {
  const prefix = (typeof window !== 'undefined' && window.i18n?.scorePrefix) || 'Score: ';
  return prefix + n;
}

export function parseScore(text) {
  const prefix = (typeof window !== 'undefined' && window.i18n?.scorePrefix) || 'Score: ';
  if (typeof text === 'string' && text.startsWith(prefix)) {
    return parseInt(text.slice(prefix.length), 10) || 0;
  }
  return parseInt(String(text).replace(/^[^:]+:\s*/, ''), 10) || 0;
}
