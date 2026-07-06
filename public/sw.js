const CACHE_NAME = 'endurix-v1';

const STATIC_ASSETS = [
  '/dashboard',
  '/web-app-manifest-192x192.png',
  '/web-app-manifest-512x512.png',
];

// On localhost the service worker only causes harm: it caches /_next/static/
// cache-first, but Turbopack rebuilds chunks under new hashes on every edit, so
// cached chunks go stale and reloads fail with ChunkLoadError. Detect dev and make
// the worker self-destruct — the browser re-fetches /sw.js on navigation, so any
// dev machine with a stale worker installed heals itself on the next load.
const IS_DEV =
  self.location.hostname === 'localhost' ||
  self.location.hostname === '127.0.0.1' ||
  self.location.hostname === '[::1]';

// On install: cache static assets and activate immediately
self.addEventListener('install', (event) => {
  if (IS_DEV) {
    self.skipWaiting();
    return;
  }
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// On activate: delete old caches (and self-unregister entirely in dev)
self.addEventListener('activate', (event) => {
  if (IS_DEV) {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
        await self.registration.unregister();
        const clients = await self.clients.matchAll({ type: 'window' });
        clients.forEach((client) => client.navigate(client.url));
      })()
    );
    return;
  }
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // In dev the worker is on its way out; never intercept, always hit the network.
  if (IS_DEV) return;

  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  // API routes: network-first, no cache
  if (url.pathname.startsWith('/api/')) return;

  // Never intercept dev/HMR traffic. Turbopack/webpack rebuild chunks under new
  // hashes on every edit, so caching these would serve stale/missing chunks
  // (ChunkLoadError). Let the network handle anything HMR-related.
  if (
    url.pathname.includes('hot-update') ||
    url.pathname.includes('hmr') ||
    url.pathname.startsWith('/_next/webpack-hmr') ||
    url.searchParams.has('hmr')
  ) {
    return;
  }

  // Navigation requests (HTML pages): network-first, fall back to cache
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/dashboard')))
    );
    return;
  }

  // Static assets (_next/static, images, fonts): cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/web-app-manifest') ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf)$/)
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          })
      )
    );
    return;
  }
});

// Push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Endurix', body: event.data.text() };
  }

  const title = payload.title || 'Endurix';
  const options = {
    body: payload.body || '',
    icon: '/web-app-manifest-192x192.png',
    badge: '/web-app-manifest-192x192.png',
    data: { link: payload.link || '/dashboard' },
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if (client.url.includes(link) && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(link);
      }
      return undefined;
    })
  );
});
