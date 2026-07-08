export function t(key) {
  return (typeof window !== 'undefined' && window.i18n?.[key]) || '';
}

export function formatScore(n) {
  const prefix = (typeof window !== 'undefined' && window.i18n?.scorePrefix) || 'Score: ';
  return prefix + n;
}

export function formatMissed(n) {
  const prefix = (typeof window !== 'undefined' && window.i18n?.missedPrefix) || 'Misses: ';
  return prefix + n;
}
