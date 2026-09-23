const CACHE_NAME = 'serpmonn-v6';
// Только оболочка RU/EN + общие ассеты. Не precache всех локалей — иначе
// каждый install SW бьёт десятки index.html (~28% access-лога).
const urlsToCache = [
  '/frontend/main.html',
  '/frontend/menu.html',
  '/frontend/en/index.html',
  '/frontend/en/menu.html',
  '/frontend/styles/menu.css',
  '/frontend/styles/styles.css',
  '/frontend/styles/base.css',
  '/frontend/scripts/menu.js',
  '/frontend/scripts/menu-loader.js',
  '/frontend/scripts/auth-session.js',
  '/frontend/scripts/accessibility.js',
  '/frontend/images/settings.png',
  '/frontend/images/availability.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      for (const url of urlsToCache) {
        try {
          await cache.add(url);
        } catch (e) {
          console.error('Ошибка с файлом:', url, e);
        }
      }
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);

  if (req.method !== 'GET') return;

  if (
    url.origin === location.origin &&
    (/\.(?:png|jpg|jpeg|gif|webp|svg)$/i.test(url.pathname) ||
      /\.(?:css|js)$/i.test(url.pathname))
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(cache =>
        cache.match(req).then(cached => {
          const fetchPromise = fetch(req).then(networkResp => {
            if (networkResp && networkResp.status === 200) {
              cache.put(req, networkResp.clone());
            }
            return networkResp;
          }).catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req))
  );
});
