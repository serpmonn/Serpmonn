// Dev-only client: injects like buttons into Google CSE results and talks to
// the local dev server at /dev/likes.

const DEV_LIKES_ENDPOINT = (location.origin.includes('127.0.0.1') || location.origin.includes('localhost'))
  ? `${location.protocol}//${location.host.replace(/:\d+$/, '')}:5100/dev/likes`
  : `/dev/likes`;

function stableUrlFromResultNode(node) {
  try {
    const link = node.querySelector('.gs-title a, a.gs-title');
    if (!link || !link.href) return null;
    const u = new URL(link.href);
    // strip known tracking params for stable key
    ['gclid','fbclid','yclid','msclkid'].forEach(p => u.searchParams.delete(p));
    return u.toString();
  } catch {
    return null;
  }
}

async function fetchCount(url) {
  const qs = new URLSearchParams({ url: encodeURIComponent(url) }).toString();
  const r = await fetch(`${DEV_LIKES_ENDPOINT}?${qs}`, { credentials: 'omit' });
  if (!r.ok) return 0;
  const j = await r.json().catch(() => ({}));
  return Number(j.count || 0);
}

async function sendLike(url) {
  const body = new URLSearchParams({ url: url }).toString();
  const r = await fetch(DEV_LIKES_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    credentials: 'omit'
  });
  if (!r.ok) throw new Error('like failed');
  const j = await r.json().catch(() => ({}));
  return Number(j.count || 0);
}

function createLikeBadge(initialCount, liked) {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `like-badge${liked ? ' liked' : ''}`;
  btn.innerHTML = `❤ <span class="count">${initialCount}</span>`;
  return btn;
}

function markLiked(url) {
  try {
    const key = 'spn_liked_urls';
    const set = new Set(JSON.parse(localStorage.getItem(key) || '[]'));
    set.add(url);
    localStorage.setItem(key, JSON.stringify(Array.from(set)));
  } catch {}
}

function isLiked(url) {
  try {
    const key = 'spn_liked_urls';
    const arr = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(arr) && arr.includes(url);
  } catch {
    return false;
  }
}

async function enhanceResult(node) {
  const url = stableUrlFromResultNode(node);
  if (!url) return;

  const container = document.createElement('div');
  container.className = 'like-container';
  node.appendChild(container);

  const liked = isLiked(url);
  const current = await fetchCount(url).catch(() => 0);
  const btn = createLikeBadge(current, liked);
  container.appendChild(btn);

  let busy = false;
  btn.addEventListener('click', async () => {
    if (busy) return;
    if (isLiked(url)) return; // one-like per browser in dev
    busy = true;
    try {
      const next = await sendLike(url);
      btn.querySelector('.count').textContent = String(next);
      btn.classList.add('liked');
      markLiked(url);
    } catch (e) {
      // no-op
    } finally {
      busy = false;
    }
  });
}

function scanAndEnhance() {
  const results = document.querySelectorAll('.gsc-webResult.gsc-result');
  results.forEach(node => {
    if (node.__spnLiked) return;
    node.__spnLiked = true;
    enhanceResult(node);
  });
}

function bootWhenCseReady() {
  // Run multiple times as CSE renders async and on pagination.
  scanAndEnhance();
  const obs = new MutationObserver(() => scanAndEnhance());
  obs.observe(document.body, { childList: true, subtree: true });
}

// Run after DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootWhenCseReady);
} else {
  bootWhenCseReady();
}

