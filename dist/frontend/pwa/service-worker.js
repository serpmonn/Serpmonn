const CACHE_NAME = 'serpmonn-v4';
const urlsToCache = [
  '/',
  '/frontend/main.html',
  '/frontend/menu.html',
  '/frontend/en/index.html',
  '/frontend/en/menu.html',
  '/frontend/es/index.html',
  '/frontend/pt-br/index.html',
  '/frontend/hi/index.html',
  '/frontend/ar/index.html',
  '/frontend/id/index.html',
  '/frontend/zh-cn/index.html',
  '/frontend/ja/index.html',
  '/frontend/ko/index.html',
  '/frontend/vi/index.html',
  '/frontend/tr/index.html',
  '/frontend/de/index.html',
  '/frontend/fr/index.html',
  '/frontend/it/index.html',
  '/frontend/pl/index.html',
  '/frontend/nl/index.html',
  '/frontend/kk/index.html',
  '/frontend/he/index.html',
  '/frontend/fa/index.html',
  '/frontend/bn/index.html',
  '/frontend/ur/index.html',
  '/frontend/ms/index.html',
  '/frontend/fil/index.html',
  '/frontend/th/index.html',
  '/frontend/ro/index.html',
  '/frontend/cs/index.html',
  '/frontend/hu/index.html',
  '/frontend/bg/index.html',
  '/frontend/el/index.html',
  '/frontend/sr/index.html',
  '/frontend/ka/index.html',
  '/frontend/hy/index.html',
  '/frontend/be/index.html',
  '/frontend/uz/index.html',
  '/frontend/az/index.html',
  '/frontend/sv/index.html',
  '/frontend/da/index.html',
  '/frontend/nb/index.html',
  '/frontend/fi/index.html',
  '/frontend/pt-pt/index.html',
  '/frontend/es-419/index.html',
  '/frontend/styles/menu.css',
  '/frontend/styles/styles.css',
  '/frontend/styles/base.css',
  '/frontend/scripts/menu.js',
  '/frontend/scripts/menu-loader.js',
  '/frontend/scripts/accessibility.js',
  '/frontend/images/settings.png',
  '/frontend/images/availability.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(urlsToCache))
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

// Stale-while-revalidate for images and static assets
self.addEventListener('fetch', event => {
    const req = event.request;
    const url = new URL(req.url);

    // Only handle GET
    if (req.method !== 'GET') return;

    // Runtime cache for images and CSS/JS
    if (url.origin === location.origin && (/\.(?:png|jpg|jpeg|gif|webp|svg)$/i.test(url.pathname) || /\.(?:css|js)$/i.test(url.pathname))) {
        event.respondWith(
            caches.open(CACHE_NAME).then(cache =>
                cache.match(req).then(cached => {
                    const fetchPromise = fetch(req).then(networkResp => {
                        // Only cache successful responses
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

    // Default: cache-first for precached, fallback to network
    event.respondWith(
        caches.match(req).then(cached => cached || fetch(req))
    );
});