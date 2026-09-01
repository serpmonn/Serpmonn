(function (global) {
  const TOKEN_KEY = 'spn_fcm_token';
  const PREF_KEY = 'spn_push_pref';
  let listenersBound = false;
  let pendingToken = '';
  let cachedPermission = 'default';

  function isNativeShell() {
    try {
      if (global.Capacitor?.isNativePlatform?.()) return true;
    } catch (_) {}
    return Boolean(global.__SPN_ANDROID_APP__) && /\bwv\b/i.test(navigator.userAgent || '');
  }

  function hasSpnAndroidPush() {
    return (
      typeof global.SpnAndroid?.requestPushPermission === 'function'
      && typeof global.SpnAndroid?.registerPushToken === 'function'
    );
  }

  function pushPlugin() {
    try {
      if (global.Capacitor?.Plugins?.PushNotifications) {
        return global.Capacitor.Plugins.PushNotifications;
      }
      if (global.Capacitor?.registerPlugin) {
        return global.Capacitor.registerPlugin('PushNotifications');
      }
    } catch (_) {}
    return null;
  }

  function pushPrefOn() {
    try {
      return global.localStorage.getItem(PREF_KEY) === 'on';
    } catch {
      return false;
    }
  }

  function storedToken() {
    try {
      return String(global.localStorage.getItem(TOKEN_KEY) || '').trim();
    } catch {
      return '';
    }
  }

  function setStoredToken(token) {
    try {
      if (token) global.localStorage.setItem(TOKEN_KEY, token);
      else global.localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
  }

  function permissionFromResult(result) {
    const receive = String(result?.receive || result || '').toLowerCase();
    if (receive === 'granted') return 'granted';
    if (receive === 'denied') return 'denied';
    return 'default';
  }

  async function refreshPermission() {
    if (hasSpnAndroidPush() && typeof global.SpnAndroid.getPushPermission === 'function') {
      cachedPermission = permissionFromResult(global.SpnAndroid.getPushPermission());
      return cachedPermission;
    }
    const PushNotifications = pushPlugin();
    if (!PushNotifications?.checkPermissions) return cachedPermission;
    try {
      cachedPermission = permissionFromResult(await PushNotifications.checkPermissions());
    } catch (_) {}
    return cachedPermission;
  }

  async function csrfHeader() {
    const res = await fetch('/csrf-token', { credentials: 'include' });
    if (!res.ok) throw new Error('csrf_failed');
    const data = await res.json();
    const token = String(data?.csrfToken || '');
    if (!token) throw new Error('csrf_empty');
    return { 'X-CSRF-Token': token };
  }

  async function postToken(token) {
    const headers = await csrfHeader();
    headers['Content-Type'] = 'application/json';
    const res = await fetch('/api/push/fcm/register', {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({
        token,
        platform: global.Capacitor?.getPlatform?.() || 'android',
      }),
    });
    if (!res.ok) throw new Error('fcm_register_failed');
  }

  async function deleteToken(token) {
    if (!token) return;
    const headers = await csrfHeader();
    headers['Content-Type'] = 'application/json';
    await fetch('/api/push/fcm/register', {
      method: 'DELETE',
      credentials: 'include',
      headers,
      body: JSON.stringify({ token }),
    }).catch(() => {});
  }

  function appUrl(raw) {
    const path = String(raw || '/frontend/app/index.html?app=1&tab=inbox');
    try {
      return new URL(path, global.location.origin).href;
    } catch {
      return `${global.location.origin}/frontend/app/index.html?app=1&tab=inbox`;
    }
  }

  function openPushTarget(rawUrl) {
    const target = appUrl(rawUrl);
    try {
      const next = new URL(target);
      if (next.origin === global.location.origin) {
        const params = next.searchParams;
        const tab = params.get('tab');
        const dm = params.get('dm');
        if (tab) {
          const qs = new URLSearchParams(global.location.search);
          qs.set('app', '1');
          qs.set('tab', tab);
          if (dm) qs.set('dm', dm);
          else qs.delete('dm');
          const hash = global.location.hash || '';
          global.history.replaceState(null, '', `${global.location.pathname}?${qs}${hash}`);
          if (typeof global.showScreen === 'function') {
            global.showScreen(tab);
            if (tab === 'inbox' && typeof global.openInboxInShell === 'function') {
              global.openInboxInShell().catch(() => {});
            }
            return;
          }
        }
      }
    } catch {
      /* fall through */
    }
    global.location.href = target;
  }

  async function flushPendingToken() {
    const token = pendingToken || storedToken();
    if (!token) return;
    try {
      await postToken(token);
      setStoredToken(token);
      pendingToken = '';
    } catch {
      pendingToken = token;
    }
  }

  async function bindCapacitorListeners(PushNotifications) {
    if (listenersBound) return;
    listenersBound = true;

    await PushNotifications.addListener('registration', async (event) => {
      const token = String(event?.value || '').trim();
      if (!token) return;
      pendingToken = token;
      setStoredToken(token);
      try {
        await postToken(token);
        pendingToken = '';
        try { global.syncPushSettingsUi?.(); } catch (_) {}
      } catch (err) {
        console.warn('[push-native] token register failed', err?.message || err);
      }
    });

    await PushNotifications.addListener('registrationError', (event) => {
      console.warn('[push-native] registration error', event?.error || event);
      try { global.syncPushSettingsUi?.(); } catch (_) {}
    });

    await PushNotifications.addListener('pushNotificationActionPerformed', (event) => {
      const data = event?.notification?.data || {};
      openPushTarget(data.url);
    });

    await PushNotifications.addListener('pushNotificationReceived', () => {});
  }

  async function requestCapacitorPermission(PushNotifications) {
    const perm = await PushNotifications.checkPermissions();
    cachedPermission = permissionFromResult(perm);
    if (cachedPermission === 'granted') return 'granted';
    const next = await PushNotifications.requestPermissions();
    cachedPermission = permissionFromResult(next);
    return cachedPermission;
  }

  async function enableViaSpnAndroid() {
    const PushNotifications = pushPlugin();
    if (PushNotifications) {
      await bindCapacitorListeners(PushNotifications);
    }

    const perm = String(global.SpnAndroid.requestPushPermission() || '').trim();
    cachedPermission = permissionFromResult(perm);
    if (perm !== 'granted') return { ok: false, reason: cachedPermission };

    const raw = String(global.SpnAndroid.registerPushToken() || '').trim();
    if (!raw || raw.startsWith('ERR:')) {
      console.warn('[push-native] SpnAndroid token', raw);
      return { ok: false, reason: 'error' };
    }
    setStoredToken(raw);
    try {
      await postToken(raw);
    } catch (err) {
      console.warn('[push-native] server register failed', err?.message || err);
      return { ok: false, reason: 'error' };
    }
    return { ok: true };
  }

  async function enableViaCapacitor() {
    const PushNotifications = pushPlugin();
    if (!PushNotifications) return { ok: false, reason: 'unsupported' };

    await bindCapacitorListeners(PushNotifications);
    const perm = await requestCapacitorPermission(PushNotifications);
    if (perm !== 'granted') return { ok: false, reason: perm };
    await PushNotifications.register();
    await flushPendingToken();
    return { ok: true };
  }

  async function enableNative() {
    try {
      if (hasSpnAndroidPush()) return await enableViaSpnAndroid();
      return await enableViaCapacitor();
    } catch (err) {
      console.warn('[push-native] enable failed', err?.message || err);
      return { ok: false, reason: 'error' };
    }
  }

  async function disableNative() {
    const token = storedToken();
    await deleteToken(token);
    setStoredToken('');
    pendingToken = '';
    if (!hasSpnAndroidPush()) {
      try {
        const PushNotifications = pushPlugin();
        if (PushNotifications?.removeAllListeners) await PushNotifications.removeAllListeners();
      } catch {
        /* ignore */
      }
      listenersBound = false;
    }
    cachedPermission = 'default';
    return { ok: true };
  }

  async function syncNativeIfGranted() {
    await refreshPermission();
    if (cachedPermission !== 'granted') {
      return { ok: false, reason: cachedPermission };
    }
    return enableNative();
  }

  function canUseNativePush() {
    return isNativeShell() && (hasSpnAndroidPush() || Boolean(pushPlugin()));
  }

  function patchSpnPush() {
    if (!canUseNativePush()) return false;

    global.spnPush = {
      canUse: () => canUseNativePush(),
      permission: () => cachedPermission,
      isOn: () => Boolean(storedToken()) || (pushPrefOn() && cachedPermission === 'granted'),
      enable: enableNative,
      disable: disableNative,
      syncIfGranted: syncNativeIfGranted,
    };

    refreshPermission().then(() => {
      try { global.syncPushSettingsUi?.(); } catch (_) {}
    }).catch(() => {});

    return true;
  }

  function bootPushNative() {
    if (!patchSpnPush()) return;
    const PushNotifications = pushPlugin();
    if (PushNotifications) {
      bindCapacitorListeners(PushNotifications).catch(() => {});
    }
    try { global.syncPushSettingsUi?.(); } catch (_) {}
  }

  let retries = 0;
  const retryTimer = global.setInterval(() => {
    bootPushNative();
    retries += 1;
    if (retries >= 40 || canUseNativePush()) global.clearInterval(retryTimer);
  }, 250);

  global.addEventListener('capacitorDidBecomeActive', bootPushNative);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootPushNative);
  } else {
    bootPushNative();
  }
})(window);
