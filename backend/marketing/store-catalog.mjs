/** Каталог приложений и URL кнопок на лендингах (клики через /out/store). */

export const STORE_APPS = [
  {
    id: 'serpmonn',
    label: 'Serpmonn',
    packageName: 'ru.serpmonn',
    rustore: 'https://www.rustore.ru/catalog/app/ru.serpmonn',
    play: 'https://play.google.com/store/apps/details?id=ru.serpmonn',
    apk: '/frontend/downloads/serpmonn/Serpmonn-latest.apk'
  },
  {
    id: 'messenger',
    label: 'Serpmonn Messenger',
    packageName: 'ru.serpmonn.messenger',
    rustore: 'https://www.rustore.ru/catalog/app/ru.serpmonn.messenger',
    play: null,
    apk: '/frontend/downloads/messenger/Serpmonn%20Messenger.apk'
  },
  {
    id: 'serphold',
    label: 'Serphold',
    packageName: 'com.serpmonn.serphold',
    rustore: 'https://www.rustore.ru/catalog/app/com.serpmonn.serphold',
    play: null,
    apk: '/frontend/downloads/serphold/Serphold-latest.apk'
  },
  {
    id: 'neon-runner',
    label: 'Neon Runner',
    packageName: 'com.mobilearcade.neon_runner',
    rustore: 'https://www.rustore.ru/catalog/app/com.mobilearcade.neon_runner',
    play: null,
    apk: '/frontend/downloads/neon-runner/Neon-Runner-latest.apk'
  }
];

export const STORE_IDS = ['rustore', 'play', 'apk'];

export function findStoreApp(appId) {
  return STORE_APPS.find((a) => a.id === String(appId || '').trim()) || null;
}

export function storeTargetUrl(appId, storeId) {
  const app = findStoreApp(appId);
  if (!app) return null;
  const store = String(storeId || '').trim().toLowerCase();
  if (store === 'rustore') return app.rustore || null;
  if (store === 'play') return app.play || null;
  if (store === 'apk') return app.apk || null;
  return null;
}
