(function (global) {
  const SW_URL = '/frontend/app/push-sw.js';

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
    return out;
  }

  function canUsePush() {
    return Boolean(
      global.Notification &&
      global.navigator &&
      'serviceWorker' in global.navigator &&
      'PushManager' in global &&
      global.isSecureContext
    );
  }

  function permission() {
    try {
      return global.Notification.permission;
    } catch {
      return 'denied';
    }
  }

  async function csrfHeader() {
    const res = await fetch('/csrf-token', { credentials: 'include' });
    if (!res.ok) throw new Error('csrf_failed');
    const data = await res.json();
    const token = String(data?.csrfToken || '');
    if (!token) throw new Error('csrf_empty');
    return { 'X-CSRF-Token': token };
  }

  async function registerWorker() {
    return global.navigator.serviceWorker.register(SW_URL, { scope: '/' });
  }

  async function loadVapidKey() {
    const res = await fetch('/api/push/vapid-public-key', { credentials: 'include' });
    if (!res.ok) throw new Error('vapid_unavailable');
    const data = await res.json();
    const key = String(data?.publicKey || '');
    if (!key) throw new Error('vapid_empty');
    return urlBase64ToUint8Array(key);
  }

  async function postSubscription(sub) {
    const json = sub.toJSON();
    const headers = await csrfHeader();
    headers['Content-Type'] = 'application/json';
    const res = await fetch('/api/push/subscribe', {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({
        endpoint: json.endpoint,
        keys: json.keys,
      }),
    });
    if (!res.ok) throw new Error('subscribe_failed');
  }

  async function syncIfGranted() {
    if (!canUsePush()) return { ok: false, reason: 'unsupported' };
    if (permission() !== 'granted') return { ok: false, reason: permission() };
    const reg = await registerWorker();
    await global.navigator.serviceWorker.ready;
    const key = await loadVapidKey();
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: key,
      });
    }
    await postSubscription(sub);
    return { ok: true };
  }

  async function enable() {
    if (!canUsePush()) return { ok: false, reason: 'unsupported' };
    const result = await global.Notification.requestPermission();
    if (result !== 'granted') return { ok: false, reason: result };
    return syncIfGranted();
  }

  async function disable() {
    try {
      const reg = await global.navigator.serviceWorker?.getRegistration(SW_URL);
      const sub = await reg?.pushManager?.getSubscription();
      if (sub) {
        const headers = await csrfHeader();
        headers['Content-Type'] = 'application/json';
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          credentials: 'include',
          headers,
          body: JSON.stringify({ endpoint: sub.endpoint }),
        }).catch(() => {});
        await sub.unsubscribe().catch(() => {});
      }
    } catch {
      /* ignore */
    }
    return { ok: true };
  }

  function isOn() {
    return canUsePush() && permission() === 'granted';
  }

  global.spnPush = {
    canUse: canUsePush,
    permission,
    isOn,
    enable,
    disable,
    syncIfGranted,
  };
})(window);
