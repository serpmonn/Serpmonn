/**
 * Safe history URL helpers for tool pages.
 * RuStore/Android app opens tools via iframe srcdoc → location is about:srcdoc.
 * history.replaceState / new URL(location.href) there can throw and abort boot.
 */

export function canUseHistoryUrl() {
  try {
    const href = String(location.href || '');
    if (!href || href.startsWith('about:')) return false;
    const protocol = location.protocol || '';
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

export function safeReplaceState(url) {
  if (!canUseHistoryUrl()) return false;
  try {
    history.replaceState(null, '', url);
    return true;
  } catch {
    return false;
  }
}

export function buildToolUrl(mutator) {
  if (!canUseHistoryUrl()) return null;
  try {
    const url = new URL(location.href);
    if (typeof mutator === 'function') mutator(url);
    return url;
  } catch {
    return null;
  }
}
