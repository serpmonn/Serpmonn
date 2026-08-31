import { App } from '@capacitor/app';
import { Network } from '@capacitor/network';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';

/** Entry inside the app WebView (not Chrome Custom Tabs). app=1 — без cookie-баннера сайта. */
const APP_ENTRY = 'https://serpmonn.ru/frontend/app/index.html?app=1';

const shell = document.getElementById('shell');
const offlineEl = document.getElementById('offline');
const loadingEl = document.getElementById('loading');
const errorEl = document.getElementById('error');
const errorText = document.getElementById('errorText');
const offlineHint = document.getElementById('offlineHint');

let opening = false;

function show(state) {
  shell.dataset.state = state;
  offlineEl.hidden = state !== 'offline';
  loadingEl.hidden = state !== 'loading';
  errorEl.hidden = state !== 'error';
  if (state === 'offline' && offlineHint) {
    offlineHint.textContent = 'Ожидаем сеть…';
  }
}

async function isOnline() {
  try {
    const status = await Network.getStatus();
    return !!status.connected;
  } catch {
    return navigator.onLine;
  }
}

async function openApp() {
  if (opening) return;
  opening = true;
  show('loading');
  try {
    if (!(await isOnline())) {
      show('offline');
      return;
    }

    // Same WebView navigation — no address bar / "Running in Chrome".
    window.location.replace(APP_ENTRY);
  } catch (err) {
    errorText.textContent = err?.message || 'Попробуйте ещё раз.';
    show('error');
  } finally {
    opening = false;
  }
}

async function setupNative() {
  try {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#ffffff' });
  } catch {
    /* browser preview */
  }

  try {
    await SplashScreen.hide();
  } catch {
    /* no-op */
  }

  try {
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });
  } catch {
    /* browser preview */
  }

  try {
    Network.addListener('networkStatusChange', (status) => {
      if (!status.connected) {
        if (shell.dataset.state !== 'offline') show('offline');
        return;
      }
      if (shell.dataset.state === 'offline' || shell.dataset.state === 'error') {
        if (offlineHint) offlineHint.textContent = 'Сеть появилась — подключаемся…';
        openApp();
      }
    });
  } catch {
    /* browser preview */
  }
}

document.getElementById('retryBtn')?.addEventListener('click', openApp);
document.getElementById('errorRetryBtn')?.addEventListener('click', openApp);

(async () => {
  await setupNative();
  await openApp();
})();
