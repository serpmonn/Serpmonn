/**
 * Shared login check for menu / findings / DM.
 * Caches /auth/protected so public pages don't spam 401 for every guest.
 */

const STORAGE_KEY = 'spn_auth_session_v1';
const POS_TTL_MS = 5 * 60 * 1000;
const NEG_TTL_MS = 60 * 1000;

let memory = { ok: null, ts: 0 };
let inflight = null;

function ttlFor(ok) {
  return ok ? POS_TTL_MS : NEG_TTL_MS;
}

function readStorage() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed?.ok !== 'boolean' || typeof parsed?.ts !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStorage(ok, ts) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ok: Boolean(ok), ts }));
  } catch {
    /* private mode / quota */
  }
}

function emit(ok) {
  try {
    window.dispatchEvent(new CustomEvent('spn-auth-changed', { detail: { ok } }));
  } catch {
    /* ignore */
  }
}

/** Sync peek — no network. null = unknown. */
export function peekAuthSession() {
  if (memory.ok !== null && Date.now() - memory.ts < ttlFor(memory.ok)) {
    return memory.ok;
  }
  const stored = readStorage();
  if (stored && Date.now() - stored.ts < ttlFor(stored.ok)) {
    memory = { ok: stored.ok, ts: stored.ts };
    return stored.ok;
  }
  return null;
}

export function setAuthSession(ok) {
  const next = Boolean(ok);
  memory = { ok: next, ts: Date.now() };
  writeStorage(next, memory.ts);
  emit(next);
}

export function invalidateAuthSession() {
  memory = { ok: null, ts: 0 };
  inflight = null;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  emit(null);
}

/**
 * @param {{ force?: boolean }} [opts]
 * @returns {Promise<boolean>}
 */
export async function checkLoggedIn(opts = {}) {
  const force = Boolean(opts.force);

  if (!force) {
    const cached = peekAuthSession();
    if (cached !== null) return cached;
  }

  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const resp = await fetch('/auth/protected', {
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store',
          Pragma: 'no-cache',
        },
      });
      const ok = resp.ok;
      setAuthSession(ok);
      return ok;
    } catch {
      // Treat network blips as guest for UI, short negative cache
      setAuthSession(false);
      return false;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}
