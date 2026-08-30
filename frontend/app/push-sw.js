/* Serpmonn Web Push — incoming DMs */
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

function payloadFromEvent(event) {
  if (!event.data) return {};
  try {
    return event.data.json();
  } catch {
    try {
      return { body: event.data.text() };
    } catch {
      return {};
    }
  }
}

function appUrl(path) {
  const raw = String(path || '/frontend/app/index.html?app=1&tab=inbox');
  try {
    return new URL(raw, self.location.origin).href;
  } catch {
    return `${self.location.origin}/frontend/app/index.html?app=1&tab=inbox`;
  }
}

self.addEventListener('push', (event) => {
  const data = payloadFromEvent(event);
  const title = String(data.title || 'Serpmonn');
  const options = {
    body: String(data.body || 'Новое сообщение'),
    tag: String(data.tag || 'dm'),
    renotify: true,
    data: { url: appUrl(data.url) },
    icon: '/frontend/images/findings-inbox.svg',
    badge: '/frontend/images/findings-inbox.svg',
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = appUrl(event.notification?.data?.url);
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url && client.url.startsWith(self.location.origin) && 'focus' in client) {
          const focus = client.focus();
          try {
            client.navigate(target);
          } catch {
            /* older webviews */
          }
          return focus;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
      return undefined;
    })
  );
});
