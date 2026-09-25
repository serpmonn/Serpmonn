/** Каталог приложений и URL кнопок магазинов на лендингах (только клики с сайта). */

export const STORE_APPS = [
  {
    id: 'serpmonn',
    label: 'Serpmonn',
    packageName: 'ru.serpmonn',
    rustore: 'https://www.rustore.ru/catalog/app/ru.serpmonn',
    play: 'https://play.google.com/store/apps/details?id=ru.serpmonn'
  },
  {
    id: 'messenger',
    label: 'Serpmonn Messenger',
    packageName: 'ru.serpmonn.messenger',
    rustore: 'https://www.rustore.ru/catalog/app/ru.serpmonn.messenger',
    play: null
  },
  {
    id: 'serphold',
    label: 'Serphold',
    packageName: 'com.serpmonn.serphold',
    rustore: 'https://www.rustore.ru/catalog/app/com.serpmonn.serphold',
    play: null
  },
  {
    id: 'neon-runner',
    label: 'Neon Runner',
    packageName: 'com.mobilearcade.neon_runner',
    rustore: 'https://www.rustore.ru/catalog/app/com.mobilearcade.neon_runner',
    play: null
  },
  {
    id: 'animals',
    label: 'Animals',
    packageName: null,
    rustore: null,
    play: null
  }
];

export const STORE_IDS = ['rustore', 'play'];

export function findStoreApp(appId) {
  return STORE_APPS.find((a) => a.id === String(appId || '').trim()) || null;
}

export function storeTargetUrl(appId, storeId) {
  const app = findStoreApp(appId);
  if (!app) return null;
  const store = String(storeId || '').trim().toLowerCase();
  if (store === 'rustore') return app.rustore || null;
  if (store === 'play') return app.play || null;
  return null;
}
